/**
 * Re-usable form to open a new authenticated support ticket.
 */
import { useState } from "react";
import {
  SUPPORT_TICKET_TYPE_META,
  SUPPORT_TICKET_TYPES,
  type SupportTicket,
  type SupportTicketType,
} from "@upcat/shared";
import { supportApi } from "@/lib/supportApi";
import { useToastStore } from "@/stores/toastStore";

interface Props {
  /** Optional preset for the ticket type. */
  defaultType?: SupportTicketType;
  onCreate: (ticket: SupportTicket) => void;
}

export default function NewTicketForm({ defaultType, onCreate }: Props) {
  const addToast = useToastStore((s) => s.addToast);
  const [type, setType] = useState<SupportTicketType>(defaultType ?? "general_support");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const ticket = await supportApi.create({
        type,
        subject: subject.trim(),
        description: description.trim(),
      });
      onCreate(ticket);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ||
        "Could not create ticket.";
      addToast("error", msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-sm">
        <span className="font-medium text-gray-700">Type</span>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as SupportTicketType)}
          className="input-field mt-1"
        >
          {SUPPORT_TICKET_TYPES.map((t) => (
            <option key={t} value={t}>
              {SUPPORT_TICKET_TYPE_META[t].icon} {SUPPORT_TICKET_TYPE_META[t].label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="font-medium text-gray-700">Subject</span>
        <input
          required
          maxLength={120}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="input-field mt-1"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-gray-700">Describe the issue</span>
        <textarea
          required
          minLength={20}
          maxLength={5000}
          rows={6}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input-field mt-1"
        />
        <span className="mt-1 block text-xs text-gray-500">
          {description.length}/5000 characters. Min 20.
        </span>
      </label>
      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? "Submitting..." : "Open ticket"}
      </button>
    </form>
  );
}