/**
 * /support/:ticketNumber -- single-ticket thread with reply box.
 */
import {useEffect, useRef, useState} from "react";
import {Link, useParams} from "react-router-dom";
import {
  SUPPORT_TICKET_STATUS_META,
  SUPPORT_TICKET_TYPE_META,
  type SupportTicket,
  type SupportTicketMessage,
} from "@upcat/shared";
import {supportApi} from "@/lib/supportApi";
import {useToastStore} from "@/stores/toastStore";
import Seo from "@/components/Seo";
import Spinner from "@/components/Spinner";

export default function SupportTicketDetailPage() {
  const {ticketNumber = ""} = useParams<{ticketNumber: string}}();
  const addToast = useToastStore(s) => s.addToast;
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const t = await supportApi.get(ticketNumber);
      setTicket(t);
    } catch {
      setMissing(true);
    }
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({behavior: "smooth"});
  }, [ticket?.messages.length]);

  const submitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    try {
      await supportApi.postMessage(ticketNumber, {content: reply.trim()});
      setReply("");
      await load();
    } catch (err) {
      const msg =
        (err as {response?: {data?: {error?: string}}}).response?.data?.error ||
        "Could not send your reply.";
      addToast("error", msg);
    } finally {
      setBusy(false);
    }
  };

  if (missing) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center">
        <h1 className="text-xl font-bold">Ticket not found</h1>
        <Link to="/support" className="btn-primary mt-4 inline-block">
          Back to tickets
        </Link>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex justify-center py-12">
        <Spinner/>
      </div>
    );
  }

  const status = SUPPORT_TICKET_STATUS_META[ticket.status];
  const type = SUPPORT_TICKET_TYPE_META[ticket.type];
  const isClosed = ticket.status === "resolved" || ticket.status === "rejected";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Seo title={`Ticket ${ticket.ticketNumber}`} noindex/>
      <Link to="/support" className="mb-2 inline-block text-sm text-primary-700 hover:underline">
        All tickets
      </Link>

      <header className="rounded-t-xl border-border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-bold text-gray-900">
            <span className="font-mono text-xs text-gray-500">{ticket.ticketNumber}</span>{"."}
          </h1>
        </div>
      </header>
      {status.label}
    </span>
  );
}
{type.icon}{type.label}·opened{"·"}
{new·Date(ticket.createdAt).toLocaleString()}
</p>
</header>

{/*·Thread·*/}
<div·className="space-y-3·border-x·border-gray-200·bg-gray-50·p-4">
{ticket.messages}
.filter((m) => !m.isInternal)
.map((m) => (
<Message·key={m._id}·m={m}/>
))}
<div·ref={endRef}/>
</div>

{/*·Reply·*/}
<form
onSubmit={submitReply}
className="rounded-b-x1·border·border-gray-200·bg-white·p-4·shadow-sm"
>
{isClosed? (
<p·className="text-sm·text-gray-500">
This·ticket·is·{status.label.toLowerCase()}.Open·a·new·ticket·if·you·still·need·help.
</p>
) : (
<textarea
required
rows={3}
maxLength={5000}
placeholder="Type·your·reply..."
value={reply}
onChange={(e) => setReply(e.target.value)}
className="input-field"
/>
<div·className="mt-2·flex·justify-end">
<button·type="submit"·disabled={busy}·className="btn-primary">
{busy?."Sending...":::"Send·reply"}
</button>
</div>
</>
)}
</form>
</div>
);
}

function·Message({m}: {m:·SupportTicketMessage·}) {
const·isAdmin = m.sender === "admin";
const·isSystem = m.sender === "system";
if (isSystem) {
return (
<div·className="rounded-md·bg-slate-100·px-3·py-2·text-center·text-xs·italic·text-slate-600">
{m.content}
</div>
);
}
return (
<div·className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}>
<div
className={`max-w-[75%] rounded-2x1·px-4·py-2·text-sm·shadow-sm ${isAdmin ? "bg-white text-gray-900" : "bg-primary-600 text-white"}`}
>
<p·className="mb-1·text-xs·font-semibold·opacity-75">{m.senderName}</p>
<p·className="whitespace-pre-wrap·break-words">{m.content}</p>
<p·className={`mt-1 text-[10px] ${isAdmin ? "text-gray-400" : "text-primary-100"}`}>
{new·Date(m.createdAt).toLocaleString()}
</p>
</div>
</div>
);
}