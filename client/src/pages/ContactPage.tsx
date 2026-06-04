import { type FormEvent, useState } from "react";
import axios from "axios";
import apiClient from "@/lib/api";
import { useToastStore } from "@/stores/toastStore";
import Spinner from "@/components/Spinner";
import Seo from "@/components/Seo";
import { API_ROUTES, CONTACT_LIMITS, CONTACT_SUBJECTS, type ContactSubject, validateEmail } from "@upcat/shared";

interface FormState {
    name: string;
    email: string;
    subject: ContactSubject | "";
    message: string;
}

interface FieldErrors {
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
}

const INITIAL_FORM: FormState = {
    name: "",
    email: "",
    subject: "",
    message: "",
};

export default function ContactPage() {
    return (
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
            <Seo
                title="Contact Us | UPCAT Simulator"
                description="Get in touch with the UPCAT Simulator team. Questions, bug reports, and partnerships welcome."
            />
            <header className="mx-auto max-w-3xl text-center">
                <p className="text-sm font-semibold uppercase tracking-widest text-primary-600">
                    Get in touch
                </p>
                <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900">
                    Contact &amp; Connect
                </h1>
                <p className="mt-3 text-base text-gray-600">
                    Questions, bug reports, feature ideas, or content corrections — we read every message.
                </p>
            </header>
            <div className="mt-12 grid gap-10 lg:grid-cols-12">
                <div className="lg:col-span-5">
                    <DeveloperCard />
                </div>
                <div className="lg:col-span-7">
                    <ContactForm />
                </div>
            </div>
        </div>
    );
}

/* ─── Developer / About section ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const [submitting, setSubmitting] = useState(false);
const [submitted, setSubmitted] = useState(false);

const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
  setForm(({ ...f, [key]: value }));
  if (errors[key]) {
    setErrors((e) => ({ ...e, [key]: undefined }));
  }
};

const validate = (): FieldErrors => {
  const next: FieldErrors = {};
  if (!form.name.trim()) next.name = "Please tell us your name.";
  else if (form.name.length > CONTACT_LIMITS.nameMax)
    next.name = `Name must be at most ${CONTACT_LIMITS.nameMax} characters.`;

  if (!form.email.trim()) next.email = "Email is required.";
  else if (!validateEmail(form.email.trim()))
    next.email = "Please enter a valid email address.";

  if (!form.subject) next.subject = "Please choose a subject.";

  const msgLen = form.message.trim().length;
  if (msgLen === 0) next.message = "Don't forget to write your message.";
  else if (msgLen < CONTACT_LIMITS.messageMin)
    next.message = `Message must be at least ${CONTACT_LIMITS.messageMin} characters.`;
  else if (msgLen > CONTACT_LIMITS.messageMax)
    next.message = `Message must be at most ${CONTACT_LIMITS.messageMax} characters.`;

  return next;
};

const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  const v = validate();
  setErrors(v);
  if (Object.keys(v).length > 0) {
    addToast("error", "Please fix the highlighted fields.");
    return;
  }

  setSubmitting(true);
  try {
    await apiClient.post(API_ROUTES.CONTACT, {
      name: form.name.trim(),
      email: form.email.trim(),
      subject: form.subject,
      message: form.message.trim(),
    });
    addToast(
      "success",
      "Your message has been sent! We'll get back to you soon.",
    );
    setForm(INITIAL_FORM);
    setSubmitted(true);
  } catch (err) {
    const msg =
      (axios.isAxiosError(err) && (err.response?.data as { error?: string } | undefined)?.error) ||
      "Something went wrong sending your message. Please try again.";
    addToast("error", msg);
  } finally {
    setSubmitting(false);
  }
};

if (submitted) {
  return (
    <div className="rounded-2xl border border-green-200 bg-green-50 p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl">
        ✅
      </div>
      <div className="mt-4 text-2xl font-bold text-gray-900">Message sent!</div>
      <p className="mt-2 text-sm text-gray-600">
        Thanks for reaching out. We'll review your message and get back to you at the email you provided.
      </p>
      <button
        type="button"
        onClick={() => setSubmitted(false)}
        className="btn-secondary mt-6 text-sm"
      >
        Send another message
      </button>
    </div>
  );
}

const remaining = CONTACT_LIMITS.messageMax - form.message.length;

return (
  <form onSubmit={handleSubmit} noValidate>
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-lg font-bold text-gray-900">Send a message</h2>
      <p className="mt-1 text-sm text-gray-500">
        We typically reply within a few days.
      </p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label="Name" error={errors.name} required>
          <Input
            type="text"
            name="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Your name"
            maxLength={CONTACT_LIMITS.nameMax}
            minLength={3}
            required
          />
        </Field>
        <Field label="Email" error={errors.email} required>
          <Input
            type="email"
            name="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Your email"
            required
          />
        </Field>
        <Field label="Subject" error={errors.subject} required>
          <Input
            type="text"
            name="subject"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="Subject"
            required
          />
        </Field>
        <Field label="Message" error={errors.message} required>
          <Input
            type="textarea"
            name="message"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder="Message"
            maxLength={CONTACT_LIMITS.messageMax}
            minLength={3}
            required
          />
        </Field>
      </div>
      <div className="mt-6 flex justify-end">
        <Button
          type="submit"
          disabled={submitting}
          className="btn-primary"
        >
          Submit
        </Button>
      </div>
    </div>
  </form>
);
type="text"
 autoComplete="name"
 maxLength=(CONTACT LIMITS.nameMax)
 className={`input-field ${errors.name ? "input-error" : ""}`}
 value={form.name}
 onChange={(e) => update("name", e.target.value)}
 aria-invalid={!errors.name}
 />
</Field>
<Field label="Email" error={errors.email} required>
 <input
 type="email"
 autoComplete="email"
 maxLength=(CONTACT LIMITS.emailMax)
 className={`input-field ${errors.email ? "input-error" : ""}`}
 value={form.email}
 onChange={(e) => update("email", e.target.value)}
 aria-invalid={!errors.email}
 />
</Field>
</div>
<div className="mt-5">
 <Field label="Subject" error={errors.subject} required>
 <select
 className={`input-field ${errors.subject ? "input-error" : ""}`}
 value={form.subject}
 onChange={(e) =>
 update("subject", e.target.value as ContactSubject)
 }
 aria-invalid={!errors.subject}
>
 <option value="" disabled>
 Choose a subject...
 </option>
 {CONTACT_SUBJECTS.map((s) => (
 <option key={s} value={s}>
 {s}
 </option>
 ))}
 </select>
</Field>
</div>
<div className="mt-5">
 <Field label="Message" error={errors.message} required>
 <textarea
 rows={7}
 maxLength=(CONTACT LIMITS.messageMax)
 className={`input-field resize-y ${errors.message ? "input-error" : ""}`}
 value={form.message}
 onChange={(e) => update("message", e.target.value)}
 placeholder="Tell us what's on your mind..."
 aria-invalid={!errors.message}
 />
 <div className="mt-1 flex justify-end text-xs text-gray-400">
 {remaining} characters remaining
 </div>
</Field>
</div>
<button
 type="submit"
 disabled={submitting}
 className="btn-primary mt-6 w-full text-base !py-3 sm:w-auto sm:px-8"
>
 {submitting ? (
 <>
 <Spinner className="h-4 w-4 text-white" />
 <span className="ml-2">Sending...</span>
 </>
 ) : (
 "Send Message"
 )}
</button>
<p className="mt-4 text-xs text-gray-400">
 By submitting this form, you agree to be contacted at the email you
 provided regarding your message. We don't share your contact info
 with third parties.
</p>
</form>;
}

function Field({
 label,
 error,
 required,
 children,
}: {
 label: string;
 error?: string;
 required?: boolean;
 children: React.ReactNode;
}) {
 return (
 <label className="block">
 <span className="block text-sm font-medium text-gray-700">
 {label}
 {required && <span className="ml-0.5 text-amber-500">*</span>}
 </span>
 {children}
 </label>
);
}
</span>
            <div className="mt-1">{children}</div>
            {(error && (
                <p className="mt-1 text-xs text-amber-600" role="alert">
                    {error}
                </p>
            ))}
        </label>
    );
}