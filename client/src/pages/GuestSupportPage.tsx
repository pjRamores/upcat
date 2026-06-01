/**
 * /support/guest - public support form for users who cannot sign in.
 *
 * Workflow:
 * 1. On mount, fetch a CAPTCHA challenge (math problem + signed token).
 * 2. User fills name/email, picks a ticket type, writes a message,
 * 3. Solves the CAPTCHA. (Hidden honeypot field is `website`.)
 * 4. POST → /support/tickets/guest. On success, show ticket number.
 */
import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {
  type CaptchaChallenge,
  SUPPORT_TICKET_TYPE_META,
  SUPPORT_TICKET_TYPES,
  type SupportTicketType,
} from "@upcat/shared";
import {supportApi} from "@/lib/supportApi";
import {useToastStore} from "@/stores/toastStore";
import Seo from "@/components/Seo";

export default function GuestSupportPage() {
  const addToast = useToastStore((s) => s.addToast);
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState<SupportTicketType>("account_recovery");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [website, setWebsite] = useState(""); // honeypot -- leave empty

  const loadCaptcha = async () => {
    try {
      const c = await supportApi.getCaptcha();
      setChallenge(c);
      setCaptchaAnswer("");
    } catch {
      addToast("error", "Could not load CAPTCHA. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    e.preventDefault();
    if (!challenge) return;
    setBusy(true);
    try {
      const {ticketNumber: n} = await supportApi.createGuest({
        type,
        subject: subject.trim(),
        description: description.trim(),
        email: email.trim().toLowerCase(),
        fullName: fullName.trim(),
        captchaToken: challenge.token,
        captchaAnswer: captchaAnswer.trim(),
        website,
      });
      setTicketNumber(n);
      addToast("success", "Support ticket submitted.");
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ||
        "Could not submit your request."
      addToast("error", msg);
      await loadCaptcha();
    } finally {
      setBusy(false);
    }
  });

  if (ticketNumber) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <Seo title="Support request received" noindex/>
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
          <h1 className="text-2x1 font-bold text-green-900">We've got your request</h1>
          <p className="mt-2 text-sm text-green-800">
            Your ticket number is{" "}
            <span className="font-mono font-bold">{ticketNumber}</span>. We'll reply to{" "}
            <strong>{email}</strong> within 1-2 business days.
          </p>
          <p className="mt-3 text-xs text-green-700">
            Keep an eye on your spam folder.
          </p>
          <Link to="/" className="btn-primary mt-4 inline-block">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
<div className="mx-auto·max-w-xl·px-4·py-12">
  <Seo.title="Contact·support·noindex/>
  <header className="mb-6">
    <h1 className="text-2x1·font-bold·text-gray-900">Contact·support</h1>
    <p className="mt-1·text-sm·text-gray-500">
      Use this form if you can't sign in. We'll verify your identity manually.
    </p>
  </header>

  <form
    onSubmit={submit}
    className="space-y-3·rounded-x1·border·border-gray-200·bg-white·p-6·shadow-sm"
  >
    {/* Honeypot - hidden from real users, bots will fill it */}
    <input
      type="text"
      name="website"
      tabIndex={-1}
      autoComplete="off"
      value={website}
      onChange={(e) => setWebsite(e.target.value)}
      className="hidden"
      aria-hidden="true"
    />

    <div className="grid·grid-cols-1·gap-3·sm:grid-cols-2">
      <label className="block·text-sm">
        <span className="font-medium·text-gray-700">Your·name</span>
        <input
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="input-field·mt-1"
        />
      </label>
      <label className="block·text-sm">
        <span className="font-medium·text-gray-700">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field·mt-1"
        />
      </label>
    </div>

    <label className="block·text-sm">
      <span className="font-medium·text-gray-700">What·do·you·need·help·with?</span>
      <select
        value={type}
        onChange={(e) => setType(e.target.value·as·SupportTicketType)}
        className="input-field·mt-1"
      >
        {SUPPORT_TICKET_TYPES.map((t) => (
          <option key={t} value={t}>
            {SUPPORT_TICKET_TYPE_META[t].icon} {SUPPORT_TICKET_TYPE_META[t].label}
          </option>
        ))}
      </select>
      <span className="mt-1·block·text-xs·text-gray-500">
        {SUPPORT_TICKET_TYPE_META[type].description}
      </span>
    </label>

    <label className="block·text-sm">
      <span className="font-medium·text-gray-700">Subject</span>
      <input
        required
        maxLength={120}
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        className="input-field·mt-1"
      />
    </label>

    <label className="block·text-sm">
      <span className="font-medium·text-gray-700">Describe·the·issue</span>
      <textarea
        required
        minLength={20}
        maxLength={5000}
        rows={6}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="input-field·mt-1"
      />
    </label>

    <span className="mt-1·block·text-xs·text-gray-500">
      {description.length}/5000·characters··Min·20.
    </span>
  </label>

  {/* CAPTCHA */}
  <div className="rounded-md·border·border-gray-200·bg-gray-50·p-3·text-sm">
    {loading||!challenge?(
      <p className="text-gray-500">Loading·challenge...</p>
    )) : (
      <label className="block">
        <span className="font-medium·text-gray-700">
          Solve: {challenge.question}
        </span>
      </label>
    )
  </div>
value={captchaAnswer}
onChange={(e) => setCaptchaAnswer(e.target.value)}
className="input-field·mt-1·max-w-[12rem]"
/>
<button
type="button"
onClick={loadCaptcha}
className="mt-1·text-xs·text-primary-700·hover:underline"
>
Refresh·challenge
</button>
</label>
)}
</div>

<button·type="submit"·disabled={busy||!challenge}·className="btn-primary·w-full">
{busy?:"Submitting...":::"Submit·request"}
</button>
</form>

<p·className="mt-6·text-center·text-sm·text-gray-500">
Have an account?{"."}
<Link·to="/login"·className="font-semibold·text-primary-700·hover:underline">
Sign·in
</Link>
</p>
</div>
);