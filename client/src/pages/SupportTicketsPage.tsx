/**
 * /support -- list of the current user's support tickets,
 * plus a button to open a new one.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SUPPORT_TICKET_STATUS_META, SUPPORT_TICKET_TYPE_META, type SupportTicket } from "@upcat/shared";
import { supportApi } from "@/lib/supportApi";
import { useToastStore } from "@/stores/toastStore";
import Seo from "@/components/Seo";
import Spinner from "@/components/Spinner";
import Modal from "@/components/Modal";
import NewTicketForm from "@/components/support/NewTicketForm";

export default function SupportTicketsPage() {
    const addToast = useToastStore((s) => s.addToast);
    const [tickets, setTickets] = useState<SupportTicket[] | null>(null);
    const [showNew, setShowNew] = useState(false);

    const load = async () => {
        try {
            const r = await supportApi.list();
            setTickets(r.items);
        } catch {
            addToast("error", "Could not load your tickets.");
            setTickets([]);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="mx-auto max-w-4xl px-4 py-10">
            <Seo title="Support tickets" noindex />
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My support tickets</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Track and reply to your open conversations with our team.
                    </p>
                </div>
                <button onClick={() => setShowNew(true)} className="btn-primary">
                    New ticket
                </button>
            </div>

            {tickets === null ? (
                <div className="flex justify-center py-12">
                    <Spinner />
                </div>
            ) : tickets.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                    No tickets yet. Open one when you need help.
                </p>
            ) : (
                <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    {tickets.map((t) => {
                        const status = SUPPORT_TICKET_STATUS_META[t.status] ?? { label: t.status, color: "slate" };
                        const type = SUPPORT_TICKET_TYPE_META[t.type] ?? { icon: "exclamation", label: t.type };
                        return (
                            <li key={t._id}>
                                <Link to={`/support/${t.ticketNumber}`} className="flex items-start justify-between gap-4 px-4 py-3 hover:bg-gray-50">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-900">
                                            {t.ticketNumber}
                                        </p>
                                        <p className="mt-0.5 truncate text-xs text-gray-500">
                                            {t.subject}
                                        </p>
                                        <p className="mt-0.5 truncate text-xs text-gray-500">
                                            {type.icon} {type.label} - updated{" "}
                                            {new Date(t.updatedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold bg-${status.color}-50 text-${status.color}-700`}>
                                        {status.label}
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}

            <Modal isOpen={showNew} onClose={() => setShowNew(false)} title="Open a new ticket">
                <NewTicketForm
                    onCreated={(t) => {
                        setShowNew(false);
                        setTickets((prev) => [prev ? [...prev, t] : [t]]);
                        addToast("success", `Ticket ${t.ticketNumber} created.`);
                    }}
                />
            </Modal>
        </div>
    );
}