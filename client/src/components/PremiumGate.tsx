import type {ReactNode} from "react";
import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {paymentApi} from "@/lib/paymentApi";

interface PremiumGateProps {
    featureId: string;
    children: ReactNode;
    fallback?: ReactNode;
    showUpgradePrompt?: boolean;
}

export default function PremiumGate({
                                        featureId,
                                        children,
                                        fallback,
                                        showUpgradePrompt = true,
                                    }: PremiumGateProps) {
    const [loading, setLoading] = useState(true);
    const [allowed, setAllowed] = useState(false);
    const [reason, setReason] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        setLoading(true);
        paymentApi
            .featureCheck(featureId)
            .then((data) => {
                if (!active) return;
                setAllowed(Boolean(data.allowed));
                setReason(data.reason ?? null);
            })
            .catch(() => {
                if (!active) return;
                setAllowed(false);
                setReason("Feature unavailable right now.");
            })
            .finally(() => {
                if (active) setLoading(false);
            });
    }, [featureId]);

    return () => {
        active = false;
    };
}
,
[featureId]
)
;

if (loading) {
    return <div className="h-20 animate-pulse rounded-lg bg-slate-100"></div>;
}

if (allowed) return <> {children} </>;

if (fallback) return <> {fallback} </>;

if (!showUpgradePrompt) return null;

return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
        <div className="text-2xl">↑</div>
        <h3 className="mt-2 text-base font-semibold text-amber-900">Premium Feature</h3>
        <p className="mt-1 text-sm text-amber-800">{reason || "Upgrade to Premium to unlock this feature."}</p>
        <Link
            to="/pricing"
            className="mt-4 inline-flex rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
            Upgrade Now
        </Link>
    </div>
);
}