/**
 * Phase 15b — CAPTCHA component.
 *
 * Self-contained widget that requests a challenge from the backend and
 * renders the right UI based on type:
 * - math — plain input
 * - image — 3x3 selectable SVG grid
 * - puzzle — drag a piece across a slider track to a target X
 * - pow — invisible; runs a tight SHA-256 loop in the main thread
 *          until a valid nonce is found, then auto-submits
 *
 * On success: calls `onSolved(token)` so the caller can pass that token
 * with the gated follow-up request. The token is also armed in
 * sessionStorage by `armCaptchaToken()` for the auto-header path.
 */
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {
    type CaptchaChallengePayload,
    type CaptchaImageChallenge,
    type CaptchaMathChallenge,
    type CaptchaPowChallenge,
    type CaptchaPuzzleChallenge,
    type CaptchaType,
} from "@upcat/shared";
import {armCaptchaToken, captchaApi} from "@/lib/captchaApi";

export interface CaptchaProps {
    /** Preferred challenge type. Defaults to "math" for visible flows. */
    type?: CaptchaType;
    /** If true, generation uses elevated difficulty (PoW only). */
    elevated?: boolean;
    /** Fired with the signed JWT once the challenge is solved. */
    onSolved: (token: string) => void;
    /** Optional: notify caller about state changes for UX (button disabled, etc.). */
    onStateChange?: (state: "idle" | "loading" | "ready" | "verifying" | "solved" | "failed") => void;
    className?: string;
}

export default function Captcha({
                                    type = "math",
                                    elevated = false,
                                    onSolved,
                                    onStateChange,
                                    className,
                                }: CaptchaProps) {
    const [challenge, setChallenge] = useState<CaptchaChallengePayload | null>(null);
    const [state, setState] = useState<
        "idle" | "loading" | "ready" | "verifying" | "solved" | "failed"
    >("idle");
    const [error, setError] = useState<string | null>(null);
    const startedAt = useRef<number>(0);

    const updateState = useCallback(
        (s: typeof state) => {
            setState(s);
            onStateChange?.(s);
        },
        [onStateChange],
    );

    const load = useCallback(async () => {
        updateState("loading");
        setError(null);
        try {
            const c = await captchaApi.generate(type, elevated);
            setChallenge(c);
            startedAt.current = Date.now();
            updateState("ready");
        } catch {
            setError("Could not load CAPTCHA. Try again.");
            updateState("failed");
        }
    }, [type, elevated, updateState]);

    useEffect(() => {
        void load();
    }, [load]);

    const verify = useCallback(
        async (answer: unknown) => {
            if (!challenge) return;
            updateState("verifying");
            setError(null);
            const elapsed = Date.now() - startedAt.current;
            try {
                const result = await captchaApi.verify(challenge.captchaId, answer, elapsed);
                if (result.valid && result.token) {
                    armCaptchaToken(result.token);
                    onSolved(result.token);
                    updateState("solved");
                } else {
                    setError("Incorrect answer. Try a new challenge.");
                    updateState("failed");
                    await load();
                }
            } catch {
                setError("Verification failed. Try a new challenge.");
                updateState("failed");
                await load();
            }
        },
        [challenge, load, onSolved, updateState],
    );

    if (state === "loading" && !challenge) {
        return <div className={panelClass(className)}>Loading verification...</div>;
    }
    if (state === "solved") {
        return (
            <div className={panelClass(className)}>
                <p className="text-sm text-emerald-700">✔ Verification complete.</p>
            </div>
        );
    }
    if (!challenge) {
        return (
            <div className={panelClass(className)}>
                <p className="text-sm text-red-600">{error ?? "Could not load CAPTCHA."}</p>
                <button type="button" onClick={load} className="mt-2 text-sm font-semibold text-primary-600">
                    Try again
                </button>
            </div>
        );
    }

    return (
        <div className={panelClass(className)}>
            {challenge.type === "math" && (
                <MathPrompt
                    challenge={challenge.challenge as CaptchaMathChallenge}
                    onSubmit={verify}
                    disabled={state === "verifying"}
                />
            )}
            {challenge.type === "image" && (
                <ImagePrompt
                    challenge={challenge.challenge as CaptchaImageChallenge}
                    onSubmit={verify}
                    disabled={state === "verifying"}
                />
            )}
            {challenge.type === "puzzle" && (
                <PuzzlePrompt
                    challenge={challenge.challenge as CaptchaPuzzleChallenge}
                    onSubmit={verify}
                    disabled={state === "verifying"}
                />
            )}
            {challenge.type === "pow" && (
                <PowPrompt
                    challenge={challenge.challenge as CaptchaPowChallenge}
                    onSubmit={verify}
                    disabled={state === "verifying"}
                />
            )}
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
            <button
                type="button"
                onClick={load}
                className="mt-3 text-xs font-medium text-slate-500 hover:text-slate-700"
            >
                🔁Get a new challenge
            </button>
        </div>
    );
}

function panelClass(extra?: string): string {
    return `rounded-lg border border-slate-200 bg-slate-50 p-4 ${extra ?? ""}`;
}

// --- Math --------------------------------------------

function MathPrompt({
                        challenge,
                        onSubmit,
                        disabled
                    }: {
    challenge: CaptchaMathChallenge;
    onSubmit: (answer: unknown) => void;
    disabled: boolean;
}) {
    const [value, setValue] = useState("");
    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                const n = Number(value);
                if (Number.isFinite(n)) onSubmit(n);
            }}
        >
            <p className="text-sm font-medium text-slate-800">{challenge.question}</p>
            <div className="mt-2 flex items-center gap-2">
                <input
                    type="number"
                    inputMode="numeric"
                    autoComplete="off"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                    disabled={disabled}
                    required
                />
                <button
                    type="submit"
                    disabled={disabled || value === ""}
                    className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
                >
                    Verify
                </button>
            </div>
        </form>
    );
}

// --- Image grid --------------------------------------------

function ImagePrompt({
                         challenge,
                         onSubmit,
                         disabled,
                     }: {
    challenge: CaptchaImageChallenge;
    onSubmit: (answer: unknown) => void;
    disabled: boolean;
}) {
    const [selected, setSelected] = useState<Set<string>>(() => new Set());
    const toggle = (id: string) =>
        setSelected((curr) => {
            const next = new Set(curr);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    return (
        <div>
            <p className="text-sm font-medium text-slate-800">{challenge.prompt}</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
                {challenge.options.map((opt) => {
                    const isOn = selected.has(opt.id);
                    return (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => toggle(opt.id)}
                            disabled={disabled}
                            className={`relative aspect-square overflow-hidden rounded-lg border-2 bg-white transition ${
                                isOn 
                                    ? "border-primary-500 ring-2 ring-primary-200" 
                                    : "border-slate-200 hover:border-slate-300"
                            }`}
                            aria-pressed={isOn}
                            dangerouslySetInnerHTML={{__html: opt.svg}}
                        />
                    );
                })}
            </div>
            <button
                type="button"
                onClick={() => onSubmit(Array.from(selected))}
                disabled={disabled || selected.size === 0}
                className="mt-3 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
            >
                Verify ({selected.size})
            </button>
        </div>
    );
}

// --- Puzzle slider --------------------------------------------

function PuzzlePrompt({
                          challenge,
                          onSubmit,
                          disabled,
                      }: {
    challenge: CaptchaPuzzleChallenge;
    onSubmit: (answer: unknown) => void;
    disabled: boolean;
}) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [x, setX] = useState(0);
    const dragging = useRef(false);
    const offset = useRef(0);

    const maxX = challenge.trackWidth - challenge.pieceSize;

    const setSafeX = (next: number) => {
        setX(Math.max(0, Math.min(maxX, next)));
    };

    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (disabled) return;
        dragging.current = true;
        offset.current = e.clientX - x;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragging.current) return;
        const rect = trackRef.current?.getBoundingClientRect();
        if (!rect) return;
        setSafeX(e.clientX - rect.left - challenge.pieceSize / 2);
    };
    const onPointerUp = () => {
        if (!dragging.current) return;
        dragging.current = false;
        onSubmit({x});
    };

    return (
        <div>
            <p className="text-sm font-medium text-slate-800">
                Slide the piece into the highlighted slot.
            </p>
            <div
                ref={trackRef}
                className="relative mt-3 overflow-hidden rounded-lg border border-slate-300"
                style={{width: challenge.trackWidth, height: 160}}
                dangerouslySetInnerHTML={{__html: challenge.backgroundSvg}}
            />
            <div
                className="relative mt-3 h-8 rounded-full bg-slate-200"
                style={{width: challenge.trackWidth}}
            >
                <div
                    role="slider"
                    aria-valuemin={0}
                    aria-valuemax={maxX}
                    aria-valuenow={x}
                    tabIndex={0}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    className="absolute top-1/2 h-10 w-10 -translate-y-1/2 cursor-grab rounded-full bg-primary-600 shadow-md active:cursor-grabbing"
                    style={{left: x}}
                />
            </div>
            <p className="mt-2 text-xs text-slate-500">
                Slot Y: {challenge.pieceY}px · current X: {Math.round(x)}px
            </p>
        </div>
    );
}
