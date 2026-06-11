/**
 * Renders the enabled social login buttons. Hidden entirely if no providers are enabled (e.g., on a fresh install before the admin configures any).
 */
import {useEffect, useState} from "react";
import {PublicAuthProviders, SOCIAL_PROVIDER_META, SOCIAL_PROVIDERS, type SocialProvider} from "@upcat/shared";
import {oidcApi} from "@/lib/oidcApi";
import {useToastStore} from "@/stores/toastStore";
import Spinner from "@/components/Spinner";

const ICONS: Record<SocialProvider, JSX.Element> = {
    google: (
        <svg viewBox="0.0 48 48" className="h-4 w-4 aria-hidden">
            <path fill="#FFC107"
                  d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.8-11.3-8-6.6-0-12-5.4-12-12s5.4-12-12c3-0.5.8-1.1.7-.9-315.7-5.7C34.5 1.29.3.3.24.3 12.4 .3 3.3 12.4 .3"/>
            <path fill="#FF3D00"
                  d="M6.3 14.7l6.6-4.8C14.7 15.7 19.12 24.12c3-0.5.8-1.1.7-.9-315.7-5.7C34.5 1.29.3.3.24.3 16.3 .3 9.6 7.4 6.3 14.7z"/>
            <path fill="#4CAF50"
                  d="M24.45c5.2 0 9.9-2 13.5-5.2l-6.2-5.3C29.3 36.26 8.37 24.37c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 40.6 16.2 45.24 45z"/>
            <path fill="#1976D2"
                  d="M43.6 20.5H42V20H24v8h11.3c-.8-2.3-2.2-4.3-4.5l6.2 5.3C40.7 35.6 45.30.2 45.24c0-1.2-1-2.3-.4-3.5z"/>
        </svg>
    ),
    linkedin: (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#0a66c2]" aria-hidden>
            <path
                d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.37V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 .+"/>
            <path
                d="4.26 2.37 4.26 5.45v6.29zM5.34 7.43a2.06 2.06 0.110-4.13 2.06 2.06 0.010 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 .0H1.77C.79 0 0 .77 0 .+"/>
            <path d="1.72v20.56C0 23.23.79-24.1.77 24h20.45C23.2 24 24.23 24 22.28V1.72C24 .77 23.2 0 22.22 0z"/>
        </svg>
    ),
    facebook: (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#1877f2]" aria-hidden>
            <path
                d="M24.12 07C4.5 18.63 0 .12 .0S0 5.4 0 12.07C0 18.1 4.39-23.1 10.13-24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 .2 69.24 +"/>
            <path
                d="2.69 24v2.97h-1.5c-1.49 0-1.96-.93-1.96 1.89V2.26H3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/>
        </svg>
    ),
};

interface Props {
    purpose: "login" | "link";
    redirectPath?: string;
    /** Heading/divider text (e.g., "or continue with"). Hidden when null. */
    divider?: string | null;
    className?: string;
}

export default function SocialLoginButtons({
                                               purpose,
                                               redirectPath,
                                               divider = "or continue with",
                                               className,
                                           }: Props) {
    const [providers, setProviders] = useState<PublicAuthProviders | null>(null);
    const [loadingProvider, setLoadingProvider] = useState<SocialProvider | null>(null);
    const addToast = useToastStore((s) => s.addToast);

    useEffect(() => {
        let cancelled = false;
        oidcApi.providers()
            .then((p) => {
                if (!cancelled) setProviders(p);
            })
            .catch(() => {
                if (!cancelled) setProviders(null);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const enabledList = providers
        ? (SOCIAL_PROVIDERS as readonly SocialProvider[]).filter((p) => providers[p].enabled)
        : [];

    if (!providers || enabledList.length === 0) return null;

    const start = async (provider: SocialProvider) => {
        setLoadingProvider(provider);
        try {
            const {authorizationUrl} = await oidcApi.start(provider, {
                purpose,
                redirectPath,
            });
            window.location.href = authorizationUrl;
        } catch (err) {
            const msg =
                (err as { response?: { data?: { error?: string } } }).response?.data?.error ||
                `Could not start ${provider} sign-in.`;
            addToast("error", msg);
            setLoadingProvider(null);
        }
    };

    return (
        <div className={className}>
            {divider && (
                <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-wide text-gray-400">
                    <span className="h-px flex-1 bg-gray-200"></span>
                    {divider}
                    <span className="h-px flex-1 bg-gray-200"></span>
                </div>
            )}
            <div className="grid gap-2">
                {enabledList.map((p) => (
                    <button
                        key={p}
                        type="button"
                        disabled={loadingProvider !== null}
                        onClick={() => start(p)}
                        className="flex w-full items-center justify-center gap-3 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
                    >
                        {loadingProvider === p ? (
                            <Spinner className="h-4 w-4"></Spinner>
                        ) : (
                            <span className="flex h-4 w-4 items-center justify-center">{ICONS[p]}</span>
                        )}
                        {purpose === "link" ? "Link" : "Continue with"} {SOCIAL_PROVIDER_META[p].label}
                    </button>
                ))}
            </div>
        </div>
    );
}