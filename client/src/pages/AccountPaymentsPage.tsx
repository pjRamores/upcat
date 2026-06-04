import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Seo from "@/components/Seo";
import Spinner from "@/components/Spinner";
import { paymentApi } from "@/lib/paymentApi";

interface SubmissionItem {
  submissionNumber: string;
  planName: string;
  amount: number;
  channel: string;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
}

export default function AccountPaymentsPage() {
  const [search] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<{
    tier: "free" | "premium";
    endDate: string | null;
    daysRemaining: number | null;
    isLifetime: boolean;
    planName: string | null;
    source: string | null;
  } | null(null);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const highlightSubmission = search.get("submission");

  useEffect(() => {
    Promise.all([paymentApi.subscriptionStatus(), paymentApi.mySubmissions(1, 50)])
      .then(([status, submissionList]) => {
        setSubscription({
          tier: status.tier,
          endDate: status.endDate,
          daysRemaining: status.daysRemaining,
          isLifetime: status.isLifetime,
          planName: status.planName,
          source: status.source,
        });
        setSubmissions(submissionList.items as SubmissionItem[]);
      })
      .catch(() => setMessage("Could not load payment information."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <Seo title="Subscription & Payments" description="Manage your premium subscription and payment history." noindex />
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Subscription & payments</h1>
        <p className="mt-1 text-sm text-gray-500">Track your subscription status and manual payment submissions.</p>
      </header>
      {subscription && (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-gray-900">Current subscription</h2>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Tier</dt>
              <dd className="mt-1 font-semibold text-gray-900">{subscription.tier.toUpperCase()}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Plan</dt>
              <dd className="mt-1 text-gray-900">{subscription.planName || "Free"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Source</dt>
              <dd className="mt-1 text-gray-900">{subscription.source || "N/A"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Valid until</dt>
              <dd className="mt-1 text-gray-900">
                {subscription.isLifetime
                  ? "Lifetime"
                  : subscription.endDate
                  ? new Date(subscription.endDate).toLocaleString()
                  : "N/A"}
              </dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/pricing" className="rounded-md bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700">
              View plans
            </Link>
            {subscription.tier === "premium" && (
              <button
                type="button"
                className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                Cancel subscription
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
onClick={(async () => {
    await paymentApi.cancelSubscription();
    setMessage("Auto-renew disabled. Premium remains active until expiry.");
})}
>
    Cancel auto-renew
</button>
</div>
</section>
})

<section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
    <h2 className="mb-3 text-base font-semibold text-gray-900">Manual payment submissions</h2>
    {submissions.length === 0 ? (
        <p className="text-sm text-gray-500">No submissions yet.</p>
    ) : (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                    <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                        <th className="px-2 py-2">Submission</th>
                        <th className="px-2 py-2">Plan</th>
                        <th className="px-2 py-2">Amount</th>
                        <th className="px-2 py-2">Channel</th>
                        <th className="px-2 py-2">Status</th>
                        <th className="px-2 py-2">Created</th>
                    </tr>
                </thead>
                <tbody>
                    {submissions.map((s) => (
                        <tr key={s.submissionNumber} className={`border-b border-gray-100 ${highlightSubmission === s.submissionNumber ? "bg-emerald-50" : ""}`}>
                            <td className="px-2 py-2 font-medium text-gray-900">{s.submissionNumber}</td>
                            <td className="px-2 py-2 text-gray-700">{s.planName}</td>
                            <td className="px-2 py-2 text-gray-700">{s.amount}</td>
                            <td className="px-2 py-2 text-gray-700">{s.channel}</td>
                            <td className="px-2 py-2">
                                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">{s.status}</span>
                            </td>
                            <td className="px-2 py-2 text-gray-700">{new Date(s.createdAt).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )}
</section>

{message && <p className="text-sm text-gray-600">{message}</p>}
</div>
