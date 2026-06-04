import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { paymentApi } from "@lib/paymentApi";

export default function PaymentProcessingPage() {
    const [search] = useSearchParams();
    const navigate = useNavigate();
    const transactionId = search.get("transactionId") || "";
    const [timedOut, setTimedOut] = useState(false);

    useEffect(() => {
        if (!transactionId) return;
        let active = true;
        const started = Date.now();

        const poll = async () => {
            if (!active) return;
            try {
                const status = await paymentApi.pangMeryendaStatus(transactionId);
                if (!active) return;
                if (status.status === "completed") {
                    navigate("/payment/success", { replace: true });
                    return;
                }
            } catch {
                // ignore; retry while window is active
            }
            if (Date.now() - started > 60_000) {
                setTimedOut(true);
                return;
            }
            window.setTimeout(poll, 2500);
        };

        void poll();

        return () => {
            active = false;
        };
    }, [navigate, transactionId]);

    return (
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
            <h1 className="text-3xl font-bold text-slate-900">Payment Processing...</h1>
            <p className="mt-3 text-slate-600">We're confirming your payment. This usually takes a few moments.</p>
            <div className="mx-auto mt-8 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary-600"></div>
            {timedOut && (
                <p className="mt-5 text-sm text-amber-700">
                    Taking longer than expected. Check your subscription status in Settings.
                </p>
            )}
            <div className="mt-6">
                <Link to="/settings" className="text-sm font-semibold text-primary-700 underline">Go to Settings</Link>
            </div>
        </div>
    );
}