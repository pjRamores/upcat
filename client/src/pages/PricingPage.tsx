import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Seo from "@/components/Seo";
import Spinner from "@/components/Spinner";
import { paymentApi, type PaymentConfigResponse } from "@/lib/paymentApi";

export default function PricingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<PaymentConfigResponse | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoMessage, setPromoMessage] = useState<string | null>(null);

  useEffect(() => {
    paymentApi
      .config()
      .then((data) => setConfig(data))
      .finally(() => setLoading(false));
  }, []);

  const plans = useMemo(
    () => [...(config?.plans ?? [])].sort((a, b) => a.order - b.order),
    [config?.plans],
  );

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!config) {
    return <div className="p-6 text-sm text-slate-600">Could not load pricing details.</div>;
  }

  const isFreeMode = config.activePaymentType === "free";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Seo title="Premium Plans" description="Upgrade to Premium for unlimited UPCAT simulator access." />
      <header
        className="mb-8 rounded-2xl bg-gradient-to-r from-rose-900 via-rose-800 to-orange-700 p-8 text-white"
      >
        <h1 className="text-3xl font-bold">Upgrade to Premium</h1>
        <p className="mt-2 max-w-2xl text-sm text-rose-100">
          Unlock full exam access, advanced analytics, ad-free study sessions, and priority support.
        </p>
      </header>

      {isFreeMode ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <h2 className="text-lg font-semibold text-emerald-900">Full platform access is currently enabled</h2>
          <p className="mt-1 text-sm text-emerald-800">
            Premium purchases are temporarily disabled. You can continue using the full platform.
          </p>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={`relative rounded-xl border bg-white p-5 shadow-sm ${
                plan.isPopular ? "border-primary-500 ring-2 ring-primary-200" : "border-slate-200"
              }`}
            >
              {plan.isPopular && (
                <span
                  className="absolute -top-3 right-4 rounded-full bg-primary-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white"
                >
                  Most Popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
              <p className="mt-1 text-sm text-slate-600">{plan.description}</p>
              <div className="mt-4">
                <div className="text-2xl font-bold text-slate-900">₱{plan.price}</div>
                {plan.originalPrice && (
                  <div className="text-xs text-slate-500 line-through">₱{plan.originalPrice}</div>
                )}
              </div>
              <ul className="mt-4 space-y-1 text-xs text-slate-600">
                {plan.features.slice(0, 4).map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => navigate(`/payment/${plan.id}${promoCode ? `?promo=${encodeURIComponent(promoCode)}` : ""}`)}
                className="mt-5 w-full rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700"
              >
                Choose Plan
              </button>
            </article>
          ))}
        </section>
      )}

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-slate-900">Have a promo code?</summary>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
if (!promoCode.trim()) return;
const result = await paymentApi.validatePromoCode(promoCode.trim());
setPromoMessage(result.valid ? "Promo code applied." : result.reason || "Invalid promo code");
}
>
</button>
{promoMessage && <p className="mt-2 text-xs text-slate-600">{promoMessage}</p>}
</details>
</section>
<section className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
<h2 className="text-lg font-semibold text-slate-900">FAQ</h2>
<ul className="mt-3 space-y-3 text-sm text-slate-700">
<li><strong>How does payment work?</strong> Choose a plan, complete payment, and your account upgrades automatically or after manual verification.</li>
<li><strong>How long until upgraded?</strong> Manual payments are reviewed based on the current processing notice. PangMeryenda upgrades are usually instant after webhook confirmation.</li>
<li><strong>Can I cancel?</strong> You can disable auto-renew at any time. Access remains until your end date.</li>
<li><strong>What happens on expiry?</strong> Your account returns to standard access, and premium-only features are locked.</li>
</ul>
</section>
<div className="mt-6 text-center text-sm text-slate-600">
Already paid manually? <Link to="/settings" className="font-semibold text-primary-700 underline">Track your submissions in Settings</Link>
</div>
</div>
});