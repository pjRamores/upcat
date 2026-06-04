import { Link } from "react-router-dom";

export default function PaymentCancelledPage() {
    return (
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
            <h1 className="text-3xl font-bold text-slate-900">Payment Cancelled</h1>
            <p className="mt-3 text-slate-700">You cancelled the payment. No charges were made.</p>
            <div className="mt-8 flex items-center justify-center gap-3">
                <Link to="/pricing"
                    className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">Back
                    to Plans</Link>
                <Link to="/dashboard"
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Maybe
                    Later</Link>
            </div>
        </div>
    );
}