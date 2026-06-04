import { Link } from "react-router-dom";
import Seo from "@/components/Seo";

/**
 * Privacy Policy
 * Informational only; not legal advice.
 */

const LAST_UPDATED = "May 11, 2026";

const SECTIONS = [
    { id: "collect", title: "1. Information We Collect" },
    { id: "use", title: "2. How We Use Your Information" },
    { id: "storage", title: "3. Data Storage and Security" },
    { id: "sharing", title: "4. Data Sharing" },
    { id: "rights", title: "5. Your Rights" },
    { id: "cookies", title: "6. Cookies and Local Storage" },
    { id: "children", title: "7. Children's Privacy" },
    { id: "changes", title: "8. Changes to This Policy" },
    { id: "contact", title: "9. Contact" },
];

export default function PrivacyPage() {
    return (
        <div className="mx-auto max-w-3xl px-4 py-12">
            <Seo
                title="Privacy Policy | UPCAT Simulator"
                description="Learn how UPCAT Simulator protects your data and your privacy while you prepare for the UPCAT."
            />
            <header className="border-b border-gray-200 pb-6">
                <p className="text-sm font-semibold uppercase tracking-widest text-primary-600">Legal</p>
                <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900">Privacy Policy</h1>
                <p className="mt-3 text-sm text-gray-500">Last updated: <time>{LAST_UPDATED}</time></p>
                <p className="mt-3 text-[15px] leading-7 text-gray-700">
                    This Privacy Policy explains how UPCAT Simulator (the &ldquo;Service&rdquo;) collects, uses, stores, and discloses information about you when you use our website. Your privacy is important to us — we collect only what we need to operate the Service.
                </p>
            </header>

            {/* ─── Table of Contents ├─── */}
            <nav aria-label="Table of contents" className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Contents</h2>
                <ol className="mt-3 grid gap-2 sm:grid-cols-2">
                    {SECTIONS.map((s) => (
                        <li key={s.id}>
                            <a href={`#${s.id}`} className="block rounded-md px-2 py-1 text-sm text-primary-600 hover:bg-primary-50 hover:text-primary-700 transition-colors">{s.title}</a>
                    ))}
                </ol>
            </nav>

            {/* ─── Body ├─── */}
            <article className="legal-prose mt-10 space-y-12 text-gray-800">
                <Section id="collect" title="1. Information We Collect">
                    <p>We collect the following categories of information:</p>
                    <h3 className="mt-4 text-base font-semibold text-gray-900">a. Account information</h3>
                    <ul>
                        <li>Your first and last name;</li>
                        <li>Your email address;</li>
                        <li>A securely hashed representation of your password (we never store your password in plain text).</li>
                    </ul>
                    <h3 className="mt-4 text-base font-semibold text-gray-900">b. Usage data</h3>
                    <ul>
                        <li>Exam sessions, including timestamps and configuration;</li>
                        <li>Your answers, scores, and per-question accuracy and time spent;</li>
                        <li>Aggregated statistics derived from your activity.</li>
                    </ul>
                    <h3 className="mt-4 text-base font-semibold text-gray-900">c. Device and connection data</h3>
                </Section>
            </article>
        </div>
    );
}
</h3>
<ul>
    <li>Browser type, user agent, and operating system;</li>
    <li>IP address (used for security, rate-limiting, and abuse prevention);</li>
    <li>Standard server logs (request paths, timestamps, response codes).</li>
</ul>
</Section>

<Section id="use" title="2. How We Use Your Information">
<p>We use the information we collect for the following purposes:</p>
<ul>
    <li><strong>Provide and operate the Service: </strong>{" "}
        authenticating your account, generating exams, scoring answers, and persisting your progress.
    </li>
    <li><strong>Improve the Service: </strong> diagnosing technical issues, analyzing aggregate patterns, and refining content.</li>
    <li><strong>Personalized statistics:</strong> generating your private analytics dashboard, including subject and difficulty breakdowns, progress over time, and weak-area identification.</li>
    <li><strong>Leaderboard:</strong> if you complete one or more exams, your{" "}
        first name and last initial only
    </li>
</ul>
</Section>

<Section id="storage" title="3. Data Storage and Security">
<p>Your data is stored in a <strong>managed cloud database service</strong> that provides{" "}
    encryption at rest (AES-256) and{" "}
    encryption in transit (TLS 1.2+) by default.</p>
<ul>
    <li>Passwords are hashed using <strong>bcrypt </strong>with a strong work factor before storage. Plain-text passwords are never written to disk.</li>
    <li>Authentication uses signed <strong>JSON Web Tokens</strong>{" "}
        (JWT) with a 7-day expiry. The signing key is stored as a server-side secret and is never exposed to the browser.
    </li>
    <li>Access to production data is restricted to the Service operator and is logged.</li>
</ul>
<p>While we apply industry-standard security measures, no system transmitting data over the Internet can be guaranteed to be 100% secure. You use the Service at your own risk.</p>
</Section>

<Section id="sharing" title="4. Data Sharing">
<p><strong>We do not sell your personal data </strong>to any third party. We share information only in the limited circumstances below:</p>
<ul>
    <li><strong>Email delivery: </strong>we use a transactional email provider (e.g., &nbsp;Resend) to send verification and password-reset emails. Only the recipient address and message contents necessary to send the email are shared.</li>
</ul>
</Section>
<Section id="rights" title="5. Your Rights">
    <p>You have the following rights regarding your personal data:</p>
    <ul>
        <li><strong>Access:</strong> request a copy of the personal data we hold about you.</li>
        <li><strong>Correction:</strong> ask us to correct inaccurate or outdated information.</li>
        <li><strong>Deletion:</strong> request the deletion of your account and associated data. Some records may be retained as required by law or to prevent abuse.</li>
        <li><strong>Data export:</strong> request a machine-readable export of your data.</li>
        <li><strong>Opt out of optional emails:</strong> at any time, via an unsubscribe link in the email, through{"."}
            <Link
                to="/settings"
                className="font-medium text-primary-600 underline-offset-2 hover:underline"
            >
                your account settings
            </Link>
            , or by contacting us.
        </li>
    </ul>
    <p>To exercise any of these rights, please use the{"."}
        <Link
            to="/contact"
            className="font-medium text-primary-600 underline-offset-2 hover:underline"
        >
            Contact page
        </Link>
    </p>
</Section>

<Section id="cookies" title="6. Cookies and Local Storage">
    <p>The Service uses your browser's{"."}
        <strong>localStorage</strong> (or sessionStorage when you log in without "Remember me") to persist your authentication token between visits. This token is required to keep you logged in and is sent only to the Service's API.</p>
    <p>When ads are enabled, we display advertising served by{"."}
        <strong>Google AdSense</strong>. Google and its partners may set their own cookies to measure and personalize ads. We do{"."}
        <strong>not</strong> sell your personal information. You can decline ad cookies via the consent banner at the bottom of the page; declining suppresses the AdSense script entirely. You can also opt out of personalized advertising directly at{"."}
        <a
            href="https://adssettings.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary-600 underline-offset-2 hover:underline"
        >
            Google Ads Settings
        </a>
    </p>
</Section>

<Section id="children" title="7. Children's Privacy">
    <p>The Service is intended for senior high school students and others preparing for the UPCAT, typically aged{"."}
        <strong>sixteen (16) years and older</strong>. We do not knowingly collect personal information from children under the age of 13. If you are a parent or guardian and believe that a child under 13 has provided us with personal information, please contact us so that we can promptly delete the data.</p>
</Section>

<Section id="changes" title="8. Changes to This Policy">
    <p>We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. When we do, we will update the "Last updated" date above and, when changes are material, provide additional notice through the Service or by email.</p>
</Section>

<p>We encourage you to review this Policy periodically.
function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24">
      <h2 id={`${id}-h`}>
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[15px] leading-7 text-gray-700">
        {children}
      </div>
    </section>
  );
}