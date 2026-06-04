/**
 * /admin/support/tickets/:ticketNumber -- full ticket inspector + actions.
 *
 * Left side: message thread (incl. internal notes) + reply box (with "internal" toggle).
 * Right side: metadata (requester, type, status, priority, assignee, verification, resolution), quick actions (status change, verify identity, unlock account).
 */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  SUPPORT_TICKET_PRIORITIES,
  SUPPORT_TICKET_PRIORITY_META,
  SUPPORT_TICKET_STATUS_META,
  SUPPORT_TICKET_STATUSES,
  SUPPORT_TICKET_TYPE_META,
  type SupportTicket,
  type SupportTicketMessage,
  type SupportTicketPriority,
  type SupportTicketStatus,
} from "@support/shared";
import { adminSupportApi } from "@lib/supportApi";
import { useToastStore } from "@stores/toastStore";
import Spinner from "@components/Spinner";
import Modal from "@components/Modal";
import Seo from "@components/Seo";

export default function AdminSupportTicketDetailPage() {
  const { ticketNumber = "" } = useParams<{ ticketNumber: string }>();
  const addToast = useToastStore((s) => s.addToast);
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [missing, setMissing] = useState(false);
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);

  const load = async () => {
    try {
      setTicket(await adminSupportApi.get(ticketNumber));
    } catch {
      setMissing(true);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketNumber]);

  if (missing) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold">Ticket not found</h1>
        <Link to="/admin/support/tickets" className="btn-primary mt-4 inline-block">
          Back to tickets
        </Link>
      </div>
    );
  }
  if (!ticket) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  const submitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    try {
      await adminSupportApi.postMessage(ticketNumber, {
        content: reply.trim(),
        isInternal: internal,
      });
      setReply("");
      setInternal(false);
      await load();
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || "Could not send reply.";
      addToast("error", msg);
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (status: SupportTicketStatus) => {
    try {
      const r = await adminSupportApi.updateStatus(ticketNumber, { status });
      addToast("success", `Status set to ${status}`);
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || "Could not update status.";
      addToast("error", msg);
    }
  };

  const updatePriority = async (priority: SupportTicketPriority) => {
    try {
      const r = await adminSupportApi.updatePriority(ticketNumber, { priority });
      addToast("success", `Priority set to ${priority}`);
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || "Could not update priority.";
      addToast("error", msg);
    }
  };
}
const r = await adminSupportApi.updateStatus(ticketNumber, {priority});
setTicket(r);
addToast("success", "Priority updated.");
} catch {
  addToast("error", "Could not update priority.");
}
};

const unlockAccount = async () => {
  if (!ticket.userId) return;
  try {
    await adminSupportApi.unlockAccount(ticket.userId);
    addToast("success", "Account unlocked.");
  } catch (err) {
    const msg = (err as { response?: { data?: { error?: string; } }; }).response?.data?.error || "Could not unlock account.";
    addToast("error", msg);
  }
};

const status = SUPPORT_TICKET_STATUS_META[ticket.status] ?? {label: ticket.status, color: "slate"};
const type = SUPPORT_TICKET_TYPE_META[ticket.type] ?? {icon: "?", label: ticket.type};

return (
  <div className="p-6">
    <Seo title={`Ticket ${ticket.ticketNumber}`} noindex/>
    <Link to="/admin/support/tickets" className="mb-3 inline-block text-sm text-primary-700 hover:underline">
      All tickets
    </Link>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Thread */}
      <div className="lg:col-span-2">
        <div className="rounded-t-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-lg font-bold">
              <span className="font-mono text-xs text-gray-500">
                {ticket.ticketNumber}
              </span>
            </h1>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold bg-${status.color}-50 text-${status.color}-700`}>
              {status.label}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {type?.icon} {type?.label} · from{"."}
            <strong>({ticket.requesterEmail})</strong> · opened{"."}
            {new Date(ticket.createdAt).toLocaleString()}
          </p>
          <div className="space-y-3 border-x border-gray-200 bg-gray-50 p-4">
            {ticket.messages.map((m) => (
              <AdminMessage key={m._id} m={m} />
            ))}
          </div>
          <form onSubmit={submitReply} className="rounded-b-xl border border-gray-200 bg-white p-4 shadow-sm">
            <textarea
              required
              rows={3}
              maxLength={5000}
              placeholder={internal ? "Internal note (only visible to admins)..." : "Reply to user..."}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              className={`input-field ${internal ? "bg-amber-50" : ""}`}
            />
            <div className="mt-2 flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={internal}
                  onChange={(e) => setInternal(e.target.checked)}
                />
                internal note
              </label>
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? "Sending..." : internal ? "Add note" : "Send reply"}
              </button>
            </div>
          </form>
        </div>
      </div>
      {/* Sidebar */}
      <aside className="space-y-4">
        <SidePanel title="Status">
          <select
            value={ticket.status}
            onChange={(e) => updateStatus(e.target.value as SupportTicketStatus)}
            className="input-field w-full text-sm"
          >
            {SUPPORT_TICKET_STATUSES.map((s) => (

);
}
const isAdmin = m.sender === "admin";
return (
    <div className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
        <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${m.isInternal ? "bg-amber-100 text-amber-900" : isAdmin ? "bg-primary-600 text-white" : "bg-white text-gray-900"}`}>
            <p className="mb-1 text-xs font-semibold opacity-75">{m.senderName}{m.isInternal && " · internal"}</p>
            <p className="whitespace-pre-wrap break-words">{m.content}</p>
            <p className={`mt-1 text-[10px] ${isAdmin && !m.isInternal ? "text-primary-100" : "text-gray-400"}`}>
                {new Date(m.createdAt).toLocaleString()}
            </p>
        </div>
    </div>
);
}

function VerifyIdentityModal({
    open,
    onClose,
    onSave,
    ticketNumber,
}: {
    open: boolean;
    onClose: () => void;
    onSave: () => Promise<void>;
    ticketNumber: string;
}) {
    const addToast = useToastStore((s) => s.addToast);
    const [method, setMethod] = useState("email_otp");
    const [statusVal, setStatusVal] = useState<"verified" | "failed">("verified");
    const [notes, setNotes] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            await adminSupportApi.verifyIdentity(ticketNumber, {
                method,
                status: statusVal,
                notes: notes.trim() || undefined,
            });
            addToast("success", "Verification updated.");
            await onSave();
        } catch (err) {
            const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || "Could not update verification.";
            addToast("error", msg);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal isOpen={open} onClose={onClose} title="Update verification" size="md">
            <form onSubmit={submit} className="space-y-3 text-sm">
                <label className="block">
                    <span className="font-medium text-gray-700">Method</span>
                    <select
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                        className="input-field mt-1"
                    >
                        <option value="email_otp">Email OTP</option>
                        <option value="security_questions">Security questions</option>
                        <option value="document_upload">Document upload</option>
                        <option value="admin_override">Admin override</option>
                    </select>
                </label>
                <label className="block">
                    <span className="font-medium text-gray-700">Outcome</span>
                    <select
                        value={statusVal}
                        onChange={(e) => setStatusVal(e.target.value as "verified" | "failed")}
                        className="input-field mt-1"
                    >
                        <option value="verified">Verified</option>
                        <option value="failed">Failed</option>
                    </select>
                </label>
                <label className="block">
                    <span className="font-medium text-gray-700">Notes (optional)</span>
                    <textarea
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="input-field mt-1"
                    />
                </label>
            </form>
        </Modal>
    );
}
<div className="flex justify-end gap-2 pt-2">
    <button type="button" onClick={onClose} className="btn-secondary text-xs">
        Cancel
    </button>
    <button type="submit" disabled={busy} className="btn-primary text-xs">
        {busy ? "Saving..." : "Save verification"}
    </button>
</div>
</form>
</Modal>
```