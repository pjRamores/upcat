/**
 * /recover-account — public account recovery flow.
 *
 * Three pathways (tabbed):
 * 1. Recovery code — user pastes one of the 10 one-time codes.
 * 2. Security questions — three pre-set Q&A challenges.
 * 3. Contact support — opens a guest support ticket.
 *
 * On success (1 or 2) we receive a short-lived `recoveryToken` and
 * navigate to `/recover-account/reset?token=...` to set a new password.
 */
import {useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {SECURITY_QUESTIONS_REQUIRED, type} from "@upcat/shared";
import {recoveryApi} from "@/lib/accountApi";
import {useToastStore} from "@/stores/toastStore";
import Seo from "@/components/Seo";

type Tab = "code" | "questions" | "support";

export default function RecoverAccountPage() {
  const [tab, setTab] = useState<Tab>("code");

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <Seo title="Recover your account" noindex/>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Recover your account</h1>
        <p className="mt-1 text-sm text-gray-500">
          Pick a recovery method below to regain access to your account.
        </p>
      </header>

      <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1 text-sm">
        <TabBtn active={tab === "code"} onClick={() => setTab("code")}>
          Recovery code
        </TabBtn>
        <TabBtn active={tab === "questions"} onClick={() => setTab("questions")}>
          Security questions
        </TabBtn>
        <TabBtn active={tab === "support"} onClick={() => setTab("support")}>
          Contact support
        </TabBtn>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {tab === "code" && <RecoveryCodeForm/>}
        {tab === "questions" && <SecurityQuestionsForm/>}
        {tab === "support" && <SupportRedirect/>}
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        Remember it after all?{"."}
        <Link to="/login">className="font-semibold text-primary-700 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}): {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button">
      onClick={onClick}
      className={`flex-1 rounded-md px-3 py-1.5 font-medium ${
        active ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
      }`}
    >
      {children}
    </button>
  );
}

/* --- Recovery code -------------------------------------------------- */

function RecoveryCodeForm() {
  const addToast = useToastStore((s) => s.addToast);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const {recoveryToken} = await recoveryApi.verifyCode({
        email: email.trim().toLowerCase(),
        recoveryCode: code.trim().toUpperCase(),
      });
      addToast("success", "Code accepted. Set a new password.");
      navigate(`/recover-account/reset?token=${encodeURIComponent(recoveryToken)}`);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ||
"Could not verify that recovery code.";
addToast("error", msg);
finally {
setBusy(false);
}
};

return (
<form onSubmit={submit} className="space-y-3">
<p className="text-sm text-gray-600">
Enter your email and one of your unused recovery codes.
</p>
<label className="block text-sm">
<span className="font-medium text-gray-700">Email</span>
<input
type="email"
required
value={email}
onChange={(e) => setEmail(e.target.value)}
className="input-field mt-1"
/>
</label>
<label className="block text-sm">
<span className="font-medium text-gray-700">Recovery code</span>
<input
required
autoComplete="off"
spellCheck={false}
value={code}
onChange={(e) => setCode(e.target.value)}
placeholder="XXXX-XXXX-XXXX"
className="input-field mt-1 font-mono uppercase tracking-wider"
/>
</label>
<button type="submit" disabled={busy} className="btn-primary w-full">
{busy ? "Verifying..." : "Continue"}
</button>
</form>
);
}

/* --- Security questions --------------------------------------------------------- */
function SecurityQuestionsForm() {
const addToast = useToastStore((s) => s.addToast);
const navigate = useNavigate();
const [email, setEmail] = useState("");
const [questions, setQuestions] = useState<string[]>([]);
const [answers, setAnswers] = useState<string[]>([]);
const [busy, setBusy] = useState(false);

const lookup = async (e: React.FormEvent) => {
e.preventDefault();
setBusy(true);
try {
const r = await recoveryApi.lookupSecurityQuestions(email.trim().toLowerCase());
if (r.questions.length !== SECURITY_QUESTIONS_REQUIRED) {
addToast(
"error",
"No security questions found for this email. Try another recovery method.",
);
return;
}
setQuestions(r.questions);
setAnswers(new Array(r.questions.length).fill(""));
catch (err) {
const msg =
(err as { response?: { data?: { error?: string } } }).response?.data?.error ||
"Could not look up your questions.";
addToast("error", msg);
} finally {
setBusy(false);
}
};

const verify = async (e: React.FormEvent) => {
e.preventDefault();
setBusy(true);
try {
const { recoveryToken } = await recoveryApi.verifySecurityQuestions({
email: email.trim().toLowerCase(),
answers: answers.map((a, i) => ({ questionIndex: i, answer: a })),
});
addToast("success", "Answers accepted. Set a new password.");
navigate(`/recover-account/reset?token=${encodeURIComponent(recoveryToken)}`);
catch (err) {
const msg =
(err as { response?: { data?: { error?: string } } }).response?.data?.error ||
"Answers did not match.";
addToast("error", msg);
} finally {
setBusy(false);
}
};

if (!questions) {
return (
<form onSubmit={lookup} className="space-y-3">
<p className="text-sm text-gray-600">
Enter your email to load your security questions.
</p>
<label className="block text-sm">
<span className="font-medium text-gray-700">Email</span>
<input
type="email"
required
value={email}
onChange={(e) => setEmail(e.target.value)}
className="input-field·mt-1"
/>
</label>
<button·type="submit"·disabled={busy}·className="btn-primary·w-full">
{busy ? "Looking·up..." : "Continue"}
</button>
</form>
);
}

return (
<form·onSubmit={verify}·className="space-y-4">
<p·className="text-sm·text-gray-600">Answer all three of your security questions.</p>
{questions.map((q, i) => (
<label·key={i}·className="block·text-sm">
<span·className="font-medium·text-gray-700">{q}</span>
<input
required
value={answers[i]·??·"}
onChange={(e) =>
setAnswers((prev) => {
const·next = [...prev];
next[i] = e.target.value;
return·next;
})
}
className="input-field·mt-1"
/>
</label>
))}
<button·type="submit"·disabled={busy}·className="btn-primary·w-full">
{busy ? "Verifying..." : "Verify·answers"}
</button>
</form>
);
}

/*——Contact·support——*/
function SupportRedirect() {
return (
<div·className="space-y-3·text-sm·text-gray-600">
<p>
Can't·use·a·recovery·code·or·remember·your·security·answers?·Open·a·support·ticket
and·our·team·will·verify·your·identity·manually·(usually·within·1-2·business·days).
</p>
<Link·to="/support/guest"·className="btn-primary·inline-block">
Open·a·support·ticket
</Link>
</div>
);
}

//Silence·unused-import·warning·when·a·future·hook·is·added.
export type·_ProviderRef=·SocialProvider;