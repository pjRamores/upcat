/**
 * /admin/support/identity-disputes -- list of identity-disputes + inline-decide.
 */
import {useEffect, useState} from "react";
import {type IdentityDispute, type IdentityDisputeAction,} from "@upcat/shared";
import {adminDisputesApi} from "@/lib/supportApi";
import {useToastStore} from "@/stores/toastStore";
import Modal from "@/components/Modal";
import Seo from "@/components/Seo";
import Spinner from "@/components/Spinner";

export default function AdminIdentityDisputesPage() {
  const [status, setStatus] = useState<string>("");
  const [data, setData] = useState<
    {
      disputes: IdentityDispute[];
      total: number;
    } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<IdentityDispute | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminDisputesApi.list({status, page: 1, limit: 50});
      setData({disputes: r.items, total: r.total});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div className="space-y-4 p-6">
      <Seo title="Identity Disputes" noindex/>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2x1 font-bold text-gray-900">Identity Disputes</h1>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="input-field text-sm"
        >
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="investigating">Investigating</option>
          <option value="resolved_for_claimant">Resolved (claimant)</option>
          <option value="resolved_for_owner">Resolved (owner)</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner/>
        </div>
      ) : !data || data.disputes.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-gray-500">
          No disputes match these filters.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2">Claimant</th>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Current owner</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Opened</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              <tr key={d._id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2">{d.claimantEmail}</td>
                <td className="px-3 py-2 capitalize">
                  {d.disputedProvider}(".")
                </td>
                <span className="font-mono text-xs text-gray-500">
                  ({d.disputedProviderUserId})
                </span>
              </tr>
            </tbody>
          </table>
        </td>
        <td className="px-3 py-2 font-mono text-xs">
          {d.currentOwnerUserId}
        </td>
        <td className="px-3 py-2 text-xs">{d.status}</td>
        <td className="px-3 py-2 text-xs text-gray-500">
          {new Date(d.createAt).toLocaleDateString()}
        </td>
        <td className="px-3 py-2 text-right">
          <button
            onClick={() => setSelected(d)}
            className="btn-secondary text-xs"
          >
            Review
          </button>
        </td>
      </tr>
    ))}
  </tbody>
</table>
</div>
)

<DisputeDecideModal
dispute={selected}
onClose={() => setSelected(null)}
onSaved={async () => {
  setSelected(null);
  await load();
}}
}</div>
);

function DisputeDecideModal({
  dispute,
  onClose,
  onSaved,
}): {
  dispute: IdentityDispute | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const addToast = useToastStore((s) => s.addToast);
  const [action, setAction] = useState<IdentityDisputeAction>("reject_claim");
  const [reasoning, setReasoning] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (dispute) {
      setAction("reject_claim");
      setReasoning("");
    }
  }, [dispute?._id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispute) return;
    if (reasoning.trim().length < 10)
      return addToast("error", "Please document reasoning (≥10 chars).");
    setBusy(true);
    try {
      await adminDisputesApi.decide(dispute._id, {
        action,
        reasoning: reasoning.trim(),
      });
      addToast("success", "Dispute resolved.");
      await onSaved();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ||
        "Could not resolve dispute."
      addToast("error", msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={!!dispute}
      onClose={onClose}
      title={dispute ? `Review dispute • ${dispute.claimantEmail}` : ""}
      size="lg"
    >
      {dispute && (
        <form onSubmit={submit} className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-primary-200 bg-primary-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
                Claimant
              </p>
              <p className="font-mono text-xs">{dispute.claimantEmail}</p>
              <p className="text-xs text-gray-600">id={dispute.claimantUserId ?? "-"}</p>
              <p className="mt-2 text-xs">Evidence:</p>
              <ul className="list-inside list-disc text-xs">
                {dispute.evidence.claimant.length === 0 && <li className="italic">None</li>}
                {dispute.evidence.claimant.map((e, i) => (
                  <li key={i}>
                    {e.type}: {e.description}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-md border border-primary-200 bg-primary-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
                Current owner
              </p>
              <p className="font-mono text-xs">id={dispute.currentOwnerUserId}</p>
              <p className="mt-2 text-xs">Evidence:</p>
              <ul className="list-inside list-disc text-xs">
                {dispute.evidence.owner.length === 0 && <li className="italic">None</li>}
                {dispute.evidence.owner.map((e, i) => (
                  <li key={i}>
                    {e.type}: {e.description}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
<select
  value={action}
  onChange={(e) => setAction(e.target.value as IdentityDisputeAction)}
  className="input-field·mt-1"
>
  <option value="reject_claim">Reject·claim·(owner·keeps·identity)</option>
  <option value="transfer_identity">
    Transfer·identity·to·claimant
  </option>
  <option value="remove_identity">Remove·identity·(no·one)</option>
</select>
</label>

<label·className="block">
  <span·className="font-medium·text-gray-700">Reasoning·(required)</span>
  <textarea
    rows={4}
    minLength={10}
    value={reasoning}
    onChange={(e) => setReasoning(e.target.value)}
    className="input-field·mt-1"
  />
</label>

<div·className="flex·justify-end·gap-2·pt-2">
  <button·type="button"·onClick={onClose}·className="btn-secondary·text-xs">
    Cancel
  </button>
  <button·type="submit"·disabled={busy}·className="btn-primary·text-xs">
    {busy? "Saving...": "Submit·decision"}
  </button>
</div>
</form>
)
</Modal>
);