import { type FormEvent, useEffect, useState } from "react";
import apiClient from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useToastStore } from "@/stores/toastStore";
import { setCachedOnboardingCheck } from "@/lib/helpApi";
import Spinner from "@/components/Spinner";
import Seo from "@/components/Seo";
import SocialLoginButtons from "@/components/SocialLoginButtons";

export default function LoginPage() {
  const [checkingStatus, setCheckingStatus] = useState(true);
  const from = "/dashboard";

  const navigateTo = (to: string) => {
    if (typeof window !== "undefined") {
      window.location.replace(to);
    }
  };

  useEffect(() => {
    let cancelled = false;
    apiClient.get("/status")
      .then((res) => {
        const ok = Boolean(res?.data?.success ?? res?.data?.ok);
        const maintenanceEnabled = Boolean(
          res?.data?.maintenance?.isEnabled ?? res?.data?.data?.maintenance?.isEnabled,
        );
        if (!ok || maintenanceEnabled) {
          if (!cancelled) navigateTo("/maintenance");
        } else {
          if (!cancelled) setCheckingStatus(false);
        }
      })
      .catch(() => {
        if (!cancelled) navigateTo("/maintenance");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { login, isLoading } = useAuthStore();
  const addToast = useToastStore((s) => s.addToast);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Tell auth store which storage to use
    useAuthStore.getState().setRememberMe(rememberMe);

    await login({ email, password });

    const state = useAuthStore.getState();
    if (state.isAuthenticated) {
      const role = state.user?.role ?? "reviewee";
      const target = role === "admin"
        ? (from.startsWith("/admin")) ? from : "/admin"
        : (from.startsWith("/admin")) ? "/dashboard" : from;
      // Cache onboarding data from login response if available
      const userId = state.user?._id;
      const loginResponse = state.lastLoginResponse;
      if (userId && loginResponse?.onboarding) {
        setCachedOnboardingCheck(userId, target, loginResponse.onboarding);
      }
      setRedirecting(true);
      navigateTo(target);
      return;
    }

    if (state.error) {
      addToast("error", state.error);
    }
  };

  if (checkingStatus) {
    return (
      <div className="flex min-h-[calc(100vh-120px)] items-center justify-center px-4 py-12">
        <Seo
          title="Login | UPCAT Simulator"
          description="Log in to your UPCAT Simulator account to continue practicing for the UP College Admission Test."
          bare
        />
        <div className="flex flex-col items-center">
          <Spinner className="h-8 w-8 mb-4" />
          <span className="text-gray-500">Checking platform status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center px-4 py-12">
      <Seo
        title="Login | UPCAT Simulator"
        description="Log in to your UPCAT Simulator account to continue practicing for the UP College Admission Test."
        bare
      />
      <div className="auth-card w-full max-w-md animate-fade-in">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sign in to continue your UPCAT practice.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
    {/* Email */}
    <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input
            type="email"
            required
            className="input-field mt-1"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="juan@example.com"
        />
    </div>

    {/* Password */}
    <div>
        <label className="block text-sm font-medium text-gray-700">Password</label>
        <div className="relative mt-1">
            <input
                type={showPassword ? "text" : "password"}
                required
                className="input-field pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
            />
            <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
            >
                {showPassword ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.836 17.374a7.93 7.93 0 01-1.477-.316A8.052 8.052 0 011.48 9h1.18c.037.043.12.175.433.405a9.863 9.863 0 01-3.278 3.644m11.52 0a9.763 9.763 0 00-3.278 3.644m11.52 0A8.052 8.052 0 0022.58 9h-.001c-.037-.043-.12-.175-.433-.405a7.93 7.93 0 01-1.477-.316m11.52 0A7.93 7.93 0 0131 18.17M12 6v15h-1V6zm0 0h1v15H0z" />
                    </svg>
                ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.836 17.374a7.93 7.93 0 01-1.477-.316A8.052 8.052 0 011.48 9h1.18c.037.043.12.175.433.405a9.863 9.863 0 01-3.278 3.644m11.52 0a9.763 9.763 0 00-3.278 3.644m11.52 0A8.052 8.052 0 0022.58 9h-.001c-.037-.043-.12-.175-.433-.405a7.93 7.93 0 01-1.477-.316m11.52 0A7.93 7.93 0 0131 18.17M12 6v15h-1V6zm0 0h1v15H0z" />
                    </svg>
                )}
            </button>
        </div>
    </div>

        {/* Remember me + Forgot password */}
    <div className="space-y-3">
        {/* Remember me checkbox */}
        <label
            className="flex items-center gap-3 text-sm text-gray-600 hover:text-gray-900 cursor-pointer group"
        >
            <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600 cursor-pointer"
            />
            <span className="font-medium">Keep me signed in</span>
        </label>
        <p className="ml-7 text-xs leading-relaxed text-gray-500">
            Stays logged in on this device. Turn off on shared or public computers.
        </p>

        {/* Forgot password link */}
        <a href="/forgot-password" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors pt-1">
            <span>Forgot password?</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.517 7.773a2.856 2.856 0 013.276-1.847A2.856 2.856 0 0115.763 7c0 2.09-.865 3.847-2.343 5.093a2.856 2.856 0 01-3.276 1.847M9.517 7v10h10V7m-10 0V4h10v7z" />
            </svg>
        </a>
    </div>

        {/* Submit */}
        <button type="submit" disabled={isLoading || redirecting} className="btn-primary w-full mt-6">
          {isLoading || redirecting ? (
            <span className="flex items-center gap-2">
              <Spinner className="h-4 w-4 text-white" /> {redirecting ? "Redirecting..." : "Signing in..."}
            </span>
          ) : (
            "Sign in"
          )}
        </button>
        </form>

        <SocialLoginButtons purpose="login" redirectPath={from} />

        <p className="mt-6 text-center text-sm text-gray-500">
          Don't have an account?{" "}
          <a href="/register" className="font-medium text-primary-600 hover:underline">Register</a>
        </p>
      </div>
    </div>
  );
} 