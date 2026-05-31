import {type, FormEvent, useState} from "react";
import {Link, useNavigate, useSearchParams} from "react-router-dom";
import apiClient from "@/lib/api";
import {API_ROUTES, validatePassword} from "@upcat/shared";
import {useToastStore} from "@stores/toastStore";
import PasswordStrengthBar from "@components/PasswordStrengthBar";
import Spinner from "@components/Spinner";
import Seo from "@components/Seo";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});

  if (!token) {
    return (
      <div className="flex min-h-[calc(100vh-120px)] items-center justify-center px-4 py-12">
        <div className="auth-card w-full max-w-md text-center animate-fade-in">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
            <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              strokeWidth={2}>
            </svg>
          </div>
          <h1 className="mt-5 text-2x1 font-bold text-gray-900">Invalid Link</h1>
          <p className="mt-2 text-sm text-gray-600">
            This password reset link is invalid or has expired.
          </p>
          <Link to="/forgot-password" className="btn-primary mt-6 inline-block">
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};

    const pw = validatePassword(newPassword);
    if (!pw.isValid) {
      newErrors.password = pw.errors[0] ?? "Invalid password.";
    }
    if (newPassword !== confirmNewPassword) {
      newErrors.confirm = "Passwords do not match.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      await apiClient.post(API_ROUTES.AUTH.RESET_PASSWORD, {
        token,
        newPassword,
        confirmNewPassword,
      });
      addToast("success", "Password reset successfully!");
      navigate("/login", {replace: true});
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ||
        "Reset failed. The link may have expired.";
      addToast("error", message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center px-4 py-12">
      <Seo title="Reset Password" description="Choose a new password for your UPCAT Simulator account." noindex/>
      <div className="auth-card w-full max-w-md text-center animate-fade-in">
        <div className="text-center">
          <h1 className="text-2x1 font-bold text-gray-900">Reset your password</h1>
          <p className="mt-1 text-sm text-gray-500">
            Enter your new password below.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {/* New password */}
        <div>
          <label className="block text-sm font-medium text-gray-700">New password</label>
          <div className="relative mt-1">
            <input
              type={showPassword ? "text" : "password"}
              required
              className={`input-field pr-10 ${errors.password ? "input-error" : ""}`}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
              }}
            />
          </div>
        </div>
      </form>
    </div>
  );
}
setErrors((prev) => ({...prev, password: undefined}));
}
placeholder="********"
/>
<button
type="button"
onClick={() => setShowPassword(!showPassword)}
className="absolute·right-3·top-1/2·translate-y-1/2·text-gray-400·hover:text-gray-600"
tabIndex={-1}
>
{showPassword?(
  <svg className="h-4·w-4" fill="none" viewBox="0·0·24·24" stroke="currentColor"
  strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M13.875·18.825A10.05·10.05·0·0112·19c-5·0-9.27-3.11-11-7.5a11.72·11.72·0·013.168-4.477M6.343·6.343A9.97·9.97·0·0112·"+
      "5c5·0·9.27·3.11·11·7.5a11.72·11.72·0·01-4.168·4.477M6.343·6.343L3·3m3.343·3.34312.829·2.829M17.657·17.657L21·"+
      "21m-3.343-3.3431-2.829-2.829M9.878·9.878a3·3·0·004.243·4.243"/>
  </svg>
) : (
  <svg className="h-4·w-4" fill="none" viewBox="0·0·24·24" stroke="currentColor"
  strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M15·12a3·3·0·11-6·0·3·3·0·016·0z"/>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M2.458·12C3.732·7.943·7.523·5·12·5c4.478·0·8.268·2.943·9.542·7-1.274·4.057-5.064·7-9.542·7-4.477·0-8.268-2.943-9.542-7z"/>
  </svg>
) }
</button>
</div>
{errors.password && <p className="mt-1·text-xs·text-amber-500">{errors.password}</p>}
<PasswordStrengthBar password={newPassword}/>
</div>

{/* Confirm new password */}
<div>
  <label className="block·text-sm·font-medium·text-gray-700">Confirm new password</label>
  <input
    type="password"
    required
    className={`input-field mt-1 ${errors.confirm ? "input-error" : ""}`}
    value={confirmNewPassword}
    onChange={(e) => {
      setConfirmNewPassword(e.target.value);
      setErrors((prev) => ({...prev, confirm: undefined}));
    }}
    placeholder="********"
  />
  {errors.confirm && <p className="mt-1·text-xs·text-amber-500">{errors.confirm}</p>}
</div>

{/* Submit */}
<button type="submit" disabled={isLoading} className="btn-primary·w-full">
  {isLoading ? (
    <span className="flex·items-center·gap-2">
      <Spinner className="h-4·w-4·text-white">Resetting...
    </span>
    ) : (
      "Reset Password"
    )}
  </button>
</form>

<p className="mt-6·text-center·text-sm·text-gray-500">
  <Link to="/login" className="font-medium·text-primary-600·hover:underline">
    Back to Login
  </Link>
</p>
</div>
</div>
);