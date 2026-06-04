import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { paymentApi } from "@/lib/paymentApi";

export default function PaymentSuccessPage() {
  const [summary, setSummary] = useState<{ tier: string; endDate: string | null } | null>(null);

  useEffect(() => {
    paymentApi.subscriptionStatus().then((s) => setSummary({ tier: s.tier, endDate: s.endDate }));
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold text-emerald-700">Payment Successful!</h1>
      <p className="mt-3 text-slate-700">Your Premium subscription is now active.</p>
      {summary && (
        <div className="mx-auto mt-6 max-w-md rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left text-sm text-emerald-900">
          <p><strong>Tier:</strong> {summary.tier}</p>
          <p><strong>Valid Until:</strong> {summary.endDate ? new Date(summary.endDate).toLocaleString() : "Lifetime"}</p>
        </div>
      )}
      <div className="mt-8 flex items-center justify-center gap-3">
        <Link to="/dashboard"
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">Go
          to Dashboard</Link>
        <Link to="/settings"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Subscription Details</Link>
      </div>
    </div>
  );
}