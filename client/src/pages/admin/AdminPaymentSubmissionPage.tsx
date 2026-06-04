import { useEffect, useState } from "react";
import { API_ROUTES } from "@upcat/shared";
import apiClient from "@lib/api";

interface Submission {
  submissionNumber: string;
  userEmail: string;
  amount: number;
  status: "pending" | "approved" | "rejected" | "cancelled";
  createdAt: string;
}

export default function AdminPaymentSubmissionsPage() {
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    const { data } = await apiClient.get<{ data: { items: Submission[] } }>(API_ROUTES.ADMIN.PAYMENT_SUBMISSIONS);
    setRows(data.data.items || []);
  };

  useEffect(() => {
    load()
      .catch(() => setMessage("Could not load payment submissions."))
      .finally(() => setLoading(false));
  }, []);

  const review = async (submissionNumber: string, action: "approve" | "reject") => {
    await apiClient.post(API_ROUTES.ADMIN.PAYMENT_SUBMISSION_REVIEW(submissionNumber), {
      action,
      reason: action === "reject" ? "Rejected by admin" : undefined,
    });
    setMessage(`Submission ${submissionNumber} ${action}d.`);
    await load();
  };

  if (loading) return <p className="text-sm text-slate-500">Loading submissions...</p>;

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Manual payment submissions</h2>
        <p className="mt-1 text-sm text-slate-600">Approve or reject pending payment proofs.</p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[740px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-2 py-2">Submission</th>
                <th className="px-2 py-2">Email</th>
                <th className="px-2 py-2">Amount</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Created</th>
                <th className="px-2 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.submissionNumber} className="border-b border-slate-100">
                  <td className="px-2 py-2 font-medium text-slate-900">{r.submissionNumber}</td>
                  <td className="px-2 py-2 text-slate-700">{r.userEmail}</td>
                  <td className="px-2 py-2 text-slate-700">{r.amount}</td>
                  <td className="px-2 py-2 text-slate-700">{r.status}</td>
                  <td className="px-2 py-2 text-slate-700">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="px-2 py-2">
                    {r.status === "pending" ? (
                      <div className="flex gap-2">
                        <button type="button" className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white" onClick={() => review(r.submissionNumber, "approve")}>Approve</button>
                        <button type="button" className="rounded bg-rose-600 px-2 py-1 text-xs font-semibold text-white" onClick={() => review(r.submissionNumber, "reject")}>Reject</button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">No action</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <section className="text-xs text-slate-500">{message && <p className="text-sm text-slate-600">{message}</p>}</section>
      </section>
    </div>
  );
}