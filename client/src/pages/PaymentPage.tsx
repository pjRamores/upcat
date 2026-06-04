import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Seo from "@/components/Seo";
import Spinner from "@/components/Spinner";
import { paymentApi, type PaymentConfigResponse } from "@/lib/paymentApi";
import { useAuthStore } from "@/stores/authStore";

export default function PaymentPage() {
  const { planId = "" } = useParams<{ planId: string }>();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const user = useAuthStore(s) => s.user);

  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<PaymentConfigResponse | null>(null);
  const [channelId, setChannelId] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const promo = search.get("promo") || "";

  useEffect(() => {
    paymentApi
      .config()
      .then((data) => {
        setConfig(data);
        if (data.manual?.channels[0]) setChannelId(data.manual.channels[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  const plan = useMemo(
    () => config?.plans.find((p) => p.id === planId) ?? null,
    [config?.plans, planId],
  );
  const channel = useMemo(
    () => config?.manual?.channels.find((c) => c.id === channelId) ?? null,
    [config?.manual?.channels, channelId],
  );

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center">{Spinner}</div>;
  }

  if (!config || !plan) {
    return <div className="p-6 text-sm text-slate-600">Invalid plan selection.</div>;
  }

  const selectedPlan = plan;

  async function submitManual() {
    if (!screenshot || !referenceNumber.trim() || !channelId) {
      setStatusMessage("Please provide required fields and screenshot proof.");
      return;
    }

    const fd = new FormData();
    fd.append("planId", selectedPlan.id);
    fd.append("channelId", channelId);
    fd.append("referenceNumber", referenceNumber.trim());
    fd.append("screenshot", screenshot);
    if (senderName) fd.append("senderName", senderName);
    if (senderNumber) fd.append("senderNumber", senderNumber);
    if (notes) fd.append("notes", notes);
    if (promo) fd.append("promoCode", promo);

    setSubmitting(true);
    try {
      const result = await paymentApi.submitManual(fd);
      navigate(`/settings?tab=payments&submission=${encodeURIComponent(result.submissionNumber)}`);
    } catch (err) {
      const message = (err as { response?: { data?: { error?: string } } }).response?.data?.error || "Failed to submit payment proof.";
      setStatusMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function startPangMeryenda() {
    setSubmitting(true);
    try {
      const started = await paymentApi.initiatePangMeryenda(selectedPlan.id, promo || undefined);
      window.location.assign(started.redirectTo);
    } catch (err) {
      const message = (err as { response?: { data?: { error?: string } } }).response?.data?.error || "Could not initiate PangMeryenda payment.";
      setStatusMessage(message);
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Seo title="Payment" description="Complete your premium plan payment." noindex />
      <h1 className="text-2xl font-bold text-slate-900">Complete Payment</h1>
 
<p className="mt-1 text-sm text-slate-600">Plan: {selectedPlan.name} • P{selectedPlan.price}</p>

{promo && (
    <p className="mt-2 inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
      Promo code applied: {promo}
    </p>
)}

{config.activePaymentType === "manual" && config.manual && (
    <div className="mt-6 space-y-5">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div data-help="pay_methods">
                <h2 className="text-sm font-semibold text-slate-900">Step 1: Select payment channel</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {config.manual.channels.map((c) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => setChannelId(c.id)}
                            className={`rounded-lg border px-4 py-3 text-left ${c.id === channelId ? "border-primary-500 bg-primary-50" : "border-slate-200"}`}
                        >
                            <div className="text-sm font-semibold text-slate-900">{c.icon} {c.name}</div>
                            <div className="text-xs text-slate-500">{c.type === "bank" ? c.bankName || "Bank transfer" : "E-wallet"}</div>
                        </button>
                    ))}
                </div>
            </div>
        </section>

        {channel && (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="text-sm font-semibold text-slate-900">Step 2: Payment details</h2>
                <p className="mt-1 text-sm text-slate-700">Send exactly <strong>P{selectedPlan.price.toFixed(2)}</strong> to:</p>
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                    <p><strong>Account Name:</strong> {channel.accountName}</p>
                    <p><strong>Account Number:</strong> {channel.accountNumber}</p>
                    {channel.bankName && <p><strong>Bank:</strong> {channel.bankName}</p>}
                    {channel.qrCodeImage && (
                        <img src={channel.qrCodeImage} alt={channel.qrCodeLabel || "QR code"} className="mt-3 h-52 w-52 rounded border border-slate-200 object-contain" />
                    )}
                </div>
                <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Processing time: {config.manual.processingTimeMessage}
                </div>
            </section>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div data-help="pay_reference">
                <h2 className="text-sm font-semibold text-slate-900">Step 3: Submit payment proof</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="Reference/Transaction Number" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
                    <input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Sender name (optional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
                    <input value={senderNumber} onChange={(e) => setSenderNumber(e.target.value)} placeholder="Sender number/account (optional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes (optional)" rows={3} className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setScreenshot(e.target.files ? [0] : null)} className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
                </div>
                <button type="button" onClick={submitManual} disabled={submitting} className="mt-4 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
                    {submitting ? "Submitting..." : "Submit Payment Proof"}
                </button>
            </div>
        </section>
    </div>
)}

{config.activePaymentType === "pangmeryenda" && (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Pay with PangMeryenda</h2>
        <p className="mt-1 text-sm text-slate-600">You will be redirected to PangMeryenda to complete this payment securely.</p>
        <button type="button" onClick={startPangMeryenda} disabled={submitting} className="mt-4 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
            {submitting ? "Preparing checkout..." : "Pay with PangMeryenda"}
        </button>
    </section>
)}

{statusMessage && <p className="mt-4 text-sm text-rose-700">{statusMessage}</p>}
<div data-help="pay_processing"/>
<p className="mt-6 text-xs text-slate-500">
    Logged in as {user?.email}
</p>
</div>
