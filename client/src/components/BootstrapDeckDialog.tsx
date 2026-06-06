/**
 * Bootstrap Deck Dialog
 *
 * Allows new users to generate random practice cards when their deck is empty.
 * Provides input for customizing the number of cards (1-50, default 5).
 */
import {useState} from "react";
import {practiceApi} from "@/lib/practiceApi";
import {useToastStore} from "@/stores/toastStore";
import Spinner from "@/components/Spinner";

interface BootstrapDeckDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (cardsAdded: number) => void;
}

export default function BootstrapDeckDialog({
                                                isOpen,
                                                onClose,
                                                onSuccess,
                                            }: BootstrapDeckDialogProps) {
    const addToast = useToastStore((s) => s.addToast);
    const [count, setCount] = useState(5);
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        const finalCount = Math.max(1, Math.min(50, Math.floor(count)));
        setLoading(true);
        try {
            const result = await practiceApi.bootstrap(finalCount);
            addToast(
                "success",
                `✨ Generated ${result.cardsAdded} random cards! Your deck is ready to practice.`
            );
            onSuccess?.(result.cardsAdded);
            onClose();
        } catch (err) {
            const msg =
                err && typeof err === "object" && "message" in err
                    ? String((err as { message: unknown }).message)
                    : "Failed to generate cards";
            addToast("error", msg);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
                <h2 className="text-xl font-semibold text-slate-900">Build Your Practice Deck</h2>
                <p className="mt-2 text-sm text-slate-600">
                    Your deck is empty. Generate random cards to get started with spaced repetition practice.
                </p>

                <div className="mt-6 space-y-4">
                    <div>
                        <label htmlFor="card-count" className="block text-sm font-medium text-slate-700">
                            Number of cards to generate
                        </label>
                        <div className="mt-2 flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setCount(Math.max(1, count - 1))}
                                disabled={loading || count <= 1}
                                className="rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                            >
                                -
                            </button>
                            <input
                                id="card-count"
                                type="number"
                                min="1"
                                max="50"
                                value={count}
                                onChange={(e) => setCount(Math.max(1, Math.min(50, Number(e.target.value))))}
                                disabled={loading}
                                className="w-20 rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-900 focus:border-maroon-500 focus:outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => setCount(Math.min(50, count + 1))}
                                disabled={loading || count >= 50}
                                className="rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                            >
                                +
                            </button>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">Range: 1‑50 cards (default: 5)</p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleGenerate}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 rounded-md bg-maroon-600 px-4 py-2 text-sm font-medium text-white hover:bg-maroon-700 disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Spinner className="text-white"/>
                                    <span>Generating...</span>
                                </>
                            ) : (
                                <>
                                    <span>✨</span>
                                    <span>Generate Cards</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}