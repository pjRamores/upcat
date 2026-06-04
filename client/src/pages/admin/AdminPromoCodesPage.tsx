import { FormEvent, useEffect, useState } from "react";
import { API_ROUTES } from "@upcat/shared";
import apiclient from "@/lib/api";

interface PromoCodeRow {
    _id: string;
    code: string;
    isActive: boolean;
    maxUses: number;
    uses: number;
    expiresAt: string | null;
}

export default function AdminPromoCodesPage() {
    const [rows, setRows] = useState<PromoCodeRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [code, setCode] = useState("");
    const [maxUses, setMaxUses] = useState(1);
    const [message, setMessage] = useState<string | null>(null);

    const load = async () => {
        const { data } = await apiclient.get<{ data: PromoCodeRow[] }>(API_ROUTES.ADMIN.PROMO_CODES);
        setRows(data.data.items || []);
    };

    useEffect(() => {
        load()
            .catch(() => setMessage("Could not load promo codes."))
            .finally(() => setLoading(false));
    }, []);

    const createPromo = async (e: FormEvent) => {
        e.preventDefault();
        await apiclient.post(API_ROUTES.ADMIN.PROMO_CODES, {
            code,
            grantType: "discount_percentage",
            discountPercentage: 100,
            maxUses,
        });
        setMessage(`Promo code ${code} created.`);
        setCode("");
        setMaxUses(1);
        await load();
    };

    if (loading) return <p className="text-sm text-slate-500">Loading promo codes...</p>;

    return (
        <div className="space-y-5">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Create promo code</h2>
                <form onSubmit={createPromo} className="mt-4 grid gap-3 sm:grid-cols-3">
                    <input
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        placeholder="Code"
                        required
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                    <input
                        type="number"
                        min={1}
                        value={maxUses}
                        onChange={(e) => setMaxUses(Number(e.target.value))}
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                    <button type="submit" className="rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700">
                        Create
                    </button>
                </form>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Promo codes</h2>
                <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                                <th className="px-2 py-2">Code</th>
                                <th className="px-2 py-2">Status</th>
                                <th className="px-2 py-2">Uses</th>
                                <th className="px-2 py-2">Max</th>
                                <th className="px-2 py-2">Expires</th>
                                <th className="px-2 py-2">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r._id} className="border-b border-slate-100">
                                    <td className="px-2 py-2 font-mono text-sm text-slate-900">{r.code}</td>
                                    <td className="px-2 py-2 text-slate-700">{r.isActive ? "active" : "inactive"}</td>
                                    <td className="px-2 py-2 text-slate-700">{r.uses}</td>
                                    <td className="px-2 py-2 text-slate-700">{r.maxUses}</td>
                                    <td className="px-2 py-2 text-slate-700">{r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : "none"}</td>
                                    <td className="px-2 py-2">
                                        <button
                                            type="button"
                                            className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                                            onClick={async () => {
                                                await apiclient.put(API_ROUTES.ADMIN.PROMO_CODE(r._id), { isActive: !r.isActive });
                                                await load();
                                            }}
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                stroke-width="2"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                class="w-4 h-4"
                                            >
                                                <path d="M16 8v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8z"></path>
                                                <circle cx="14" cy="10" r="3"></circle>
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
(r.isActive ? "Disable" : "Enable")
</button>
</td>
</tr>
</tbody>
</table>
</div>
</section>
{message && <p className="text-sm text-slate-600">{message}</p>}
</div>
);