import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useToastStore } from "@/stores/toastStore";
import { validateEmail, validatePassword } from "@/upcat/shared";
import PasswordStrengthBar from "@/components/PasswordStrengthBar";
import Spinner from "@/components/Spinner";
import Seo from "@/components/Seo";
import SocialLoginButtons from "@/components/SocialLoginButtons";

interface FieldErrors {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
}

export default function RegisterPage() {
    const navigate = useNavigate();
    const [checkingStatus, setCheckingStatus] = useState(true);
    const [registrationOpen, setRegistrationOpen] = useState(true);
    const [emailSignupEnabled, setEmailSignupEnabled] = useState(true);

    useEffect(() => {
        let cancelled = false;
        apiClient.get("/status")
            .then((res) => {
                const ok = Boolean(res?.data?.success ?? res?.data?.ok);
                const maintenanceEnabled = Boolean(
                    res?.data?.maintenance?.isEnabled ?? res?.data?.maintenance?.isEnabled,
                );
                if (!ok || maintenanceEnabled) {
                    if (!cancelled) navigate("/maintenance", { replace: true });
                } else {
                    const isOpen = Boolean(
                        res?.data?.registration?.isOpen
                            ?? res?.data?.data?.registration?.isOpen
                            ?? true,
                    );
                    const allowEmailSignup = Boolean(
                        res?.data?.registration?.allowEmailSignup
                            ?? res?.data?.data?.registration?.allowEmailSignup
                            ?? true,
                    );
                    if (!cancelled) {
                        setRegistrationOpen(isOpen);
                        setEmailSignupEnabled(allowEmailSignup);
                        setCheckingStatus(false);
                    }
                }
            })
            .catch(() => {
                if (!cancelled) navigate("/maintenance", { replace: true });
            });

        return () => {
            cancelled = true;
        };
    }, [navigate]);
    const { register, isLoading } = useAuthStore();
    const addToast = useToastStore((s) => s.addToast);

    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const update = (field: string, value: string) => {
        setForm((f) => ({ ...f, [field]: value }));
        // Clear error on change
        if (errors[field as keyof FieldErrors]) {
            setErrors((e) => ({ ...e, [field]: undefined }));
        }
    };

    const markTouched = (field: string) => {
        setTouched((t) => ({ ...t, [field]: true }));
        validateField(field);
    };

    const validateField = (field: string) => {
        const newErrors: FieldErrors = {};
        if (field === "firstName" && !form.firstName.trim()) {
            newErrors.firstName = "First name is required.";
        }
        if (field === "lastName" && !form.lastName.trim()) {
            newErrors.lastName = "Last name is required.";
        }
        if (field === "email") {
            if (!form.email.trim()) newErrors.email = "Email is required.";
            else if (!validateEmail(form.email)) newErrors.email = "Invalid email format.";
        }
        if (field === "password") {
            const pw = validatePassword(form.password);
            if (!pw.isValid) newErrors.password = pw.errors[0] ?? "Invalid password.";
        }
    };
if (field === "confirmPassword") {
    if (form.confirmPassword && form.confirmPassword !== form.password) {
        newErrors.confirmPassword = "Passwords do not match.";
    }
}

setErrors((e) => ({...e, ...newErrors}));
};

const validateAll = (): boolean => {
    const e: FieldErrors = {};

    if (!form.firstName.trim()) e.firstName = "First name is required.";
    if (!form.lastName.trim()) e.lastName = "Last name is required.";
    if (!form.email.trim()) e.email = "Email is required.";
    else if (!validateEmail(form.email)) e.email = "Invalid email format.";

    const pw = validatePassword(form.password);
    if (!pw.isValid) e.password = pw.errors[0] ?? "Invalid password.";

    if (!form.confirmPassword) e.confirmPassword = "Please confirm your password.";
    else if (form.confirmPassword !== form.password) e.confirmPassword = "Passwords do not match.";

    setErrors(e);
    setTouched({firstName: true, lastName: true, email: true, password: true, confirmPassword: true});
    return Object.keys(e).length === 0;
};

const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;

    await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
    });

    const storeError = useAuthStore.getState().error;
    if (storeError) {
        addToast("error", storeError);
    } else {
        addToast("success", "Registration successful! Check your email.");
        navigate("/verify-email", {state: {email: form.email}});
    }
};

const fieldClass = <T extends keyof FieldErrors> => ({
    inputField mt-1 $[touched[T] && errors[T]] ? "input-error" : ""
});

if (checkingStatus) {
    return (
        <div className="flex min-h-[calc(100vh-120px)] items-center justify-center px-4 py-12">
            <Seo
                title="Create Account | UPCAT Simulator - Start Practicing"
                description="Create an account and get instant access to UPCAT practice exams, mock tests, and detailed performance analytics."
            />
            <div className="flex flex-col items-center">
                <Spinner className="mb-4 h-8 w-8" />
                <span className="text-gray-500">Checking platform status...</span>
            </div>
        </div>
    );
}

return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center px-4 py-12">
        <Seo
            title="Create Account | UPCAT Simulator - Start Practicing"
            description="Create an account and get instant access to UPCAT practice exams, mock tests, and detailed performance analytics."
        />
        <div className="auth-card w-full max-w-md animate-fade-in">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900">Create an account</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Sign up to start practicing for the UPCAT.
                </p>
            </div>

            {!registrationOpen ? (
                <div className="mt-8 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    New sign-ups are temporarily disabled. Please check back later.
                </div>
            ) : emailSignupEnabled ? (
                <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                    {/* Names */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">First name</label>
                            <input
                                required
                                className={fieldClass("firstName")}
                                value={form.firstName}
                                onChange={(e) => update("firstName", e.target.value)}
                                onBlur={() => markTouched("firstName")}
                                placeholder="Juan"
                            />
                            {touched.firstName && errors.firstName && (
                                <p className="mt-1 text-xs text-amber-500">{errors.firstName}</p>
                            )}
                        </div>
</div>
<div>
    <label className="block text-sm font-medium text-gray-700">Last name</label>
    <input
        required
        className={fieldClass("lastName")}
        value={form.lastName}
        onChange={(e) => update("lastName", e.target.value)}
        onBlur={() => markTouched("lastName")}
        placeholder="Dela Cruz"
    />
    {touched.lastName && errors.lastName &&
      <p className="mt-1 text-xs text-amber-500">{errors.lastName}</p>
    }
</div>

{/* Email */}
<div>
    <label className="block text-sm font-medium text-gray-700">Email</label>
    <input
        type="email"
        required
        className={fieldClass("email")}
        value={form.email}
        onChange={(e) => update("email", e.target.value)}
        onBlur={() => markTouched("email")}
        placeholder="juan@example.com"
    />
    {touched.email && errors.email &&
      <p className="mt-1 text-xs text-amber-500">{errors.email}</p>
    }
</div>

{/* Password */}
<div>
    <label className="block text-sm font-medium text-gray-700">Password</label>
    <div className="relative mt-1">
        <input
            type={showPassword ? "text" : "password"}
            required
            className={`${fieldClass("password")} pr-10`}
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            onBlur={() => markTouched("password")}
            placeholder="********"
        />
        <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
        >
          {showPassword ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112.19c-5 0-9.27-3.11-11-7.5a11.72 11.72 0 013.168-4.477M6.343 6.343A9.97 9.97 0 0112+5c5 0-9.27-3.11-11-7.5a11.72 11.72 0 013.168-4.477M6.343 6.343L3.3m3.343 3.343l2.829 2.829M17.657 17.657L21+21m-3.343-3.343l-2.829-2.829M9.878 9.878a3 3 0 00.004.243 .4.243"/>
          </svg>
        ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.12a3 3 0 116.037 1c-1.89 1.89-3.7 3.7-5.4 5.4s-3.7-3.7-5.4-5.4A3 3 0 012.4 16.5V13a2 2 0 012-2h8c0 .99-.31 1.9-.88 2.8m-1.72 0a1 1 0 01-1.72 1v4.65M11.38 2.03a.79.79 0 00-1.5.03m-.76 3.36h-.02A.79.79 0 009.38 14H4a.79.79 0 000 1.58v4.65M2.5 12.5l.02-1.5h1.58"/>
            </svg>
        )}
        <button
          type="button"
          onClick={() => setShowConfirm(!showConfirm)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          tabIndex={-1}
        >
          {showConfirm ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112.19c-5 0-9.27-3.11-11-7.5a11.72 11.72 0 013.168-4.477M6.343 6.343A9.97 9.97 0 0112+5c5 0-9.27-3.11-11-7.5a11.72 11.72 0 013.168-4.477M6.343 6.343L3.3m3.343 3.343l2.829 2.829M9.878 9.878a3 3 0 00.004.243 .4.243"/>
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.12a3 3 0 116.037 1c-1.89 1.89-3.7 3.7-5.4 5.4s-3.7-3.7-5.4-5.4A3 3 0 012.4 16.5V13a2 2 0 012-2h8c0 .99-.31 1.9-.88 2.8m-1.72 0a1 1 0 01-1.72 1v4.65M11.38 2.03a.79.79 0 00-1.5.03m-.76 3.36h-.02A.79.79 0 009.38 14H4a.79.79 0 000 1.58v4.65M2.5 12.5l.02-1.5h1.58"/>
            </svg>
          )}
        </button>
      <PasswordStrengthBar password={form.password} />
    </div>
</div>

{/* Confirm password */}
<div>
    <label className="block text-sm font-medium text-gray-700">Confirm password</label>
    <div className="relative mt-1">
        <input
            type={showConfirm ? "text" : "password"}
            required
            className={`${fieldClass("confirmPassword")} pr-10`}
            value={form.confirmPassword}
            onChange={(e) => update("confirmPassword", e.target.value)}
            onBlur={() => markTouched("confirmPassword")}
            placeholder="********"
        />
        <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
        >
          {showConfirm ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112.19c-5 0-9.27-3.11-11-7.5a11.72 11.72 0 013.168-4.477M6.343 6.343A9.97 9.97 0 0112+5c5 0-9.27-3.11-11-7.5a11.72 11.72 0 013.168-4.477M6.343 6.343L3.3m3.343 3.343l2.829 2.829M9.878 9.878a3 3 0 00.004.243 .4.243"/>
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.12a3 3 0 116.037 1c-1.89 1.89-3.7 3.7-5.4 5.4s-3.7-3.7-5.4-5.4A3 3 0 012.4 16.5V13a2 2 0 012-2h8c0 .99-.31 1.9-.88 2.8m-1.72 0a1 1 0 01-1.72 1v4.65M11.38 2.03a.79.79 0 00-1.5.03m-.76 3.36h-.02A.79.79 0 009.38 14H4a.79.79 0 000 1.58v4.65M2.5 12.5l.02-1.5h1.58"/>
            </svg>
          )}
        </button>
      <PasswordStrengthBar password={form.password} />
    </div>
</div>
);
}