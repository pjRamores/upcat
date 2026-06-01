/**
 * /auth/callback/:provider
 *
 * Lands here after the IdP redirects the browser back. Reads `code` and
 * state` from the URL, posts to the backend callback, then either:
 * - login: stores the returned JWT and redirects to /dashboard (or to the
 * redirectPath captured at start);
 * - link: shows a success toast and redirects back to /settings.
 */
import {useEffect, useRef, useState} from "react";
import {useNavigate, useParams, useSearchParams} from "react-router-dom";
import type {AuthResponse, SocialProvider} from "@upcat/shared";
import {persistAuthSession} from "@/lib/authPersistence";
import {oidcApi} from "@/lib/oidcApi";
import {prewarmOnboardingCheck} from "@/lib/helpApi";
import {useAuthStore} from "@/stores/authStore";
import {useToastStore} from "@/stores/toastStore";
import Spinner from "@/components/Spinner";
import Seo from "@/components/Seo";

function isLoginResp(
  v: unknown,
) : v is AuthResponse && { linkedProvider: SocialProvider; redirectPath: string | null; newAccount: boolean } {
  return !!(v && typeof v === "object" && "token" in v);
}

const PROVIDERS = new Set<SocialProvider>([ "google", "linkedin", "facebook"]);

export default function AuthCallbackPage() {
  const {provider} = useParams<{ provider: string }>();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);
  const ranRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const p = (provider ?? "").toLowerCase() as SocialProvider;
    if (!PROVIDERS.has(p)) {
      setError("Unknown social provider.");
      return;
    }
    const errParam = search.get("error_description") || search.get("error");
    if (errParam) {
      setError(errParam);
      return;
    }
    const code = search.get("code");
    const state = search.get("state");
    if (!code || !state) {
      setError("Missing authorization code or state.");
      return;
    }

    (async () => {
      try {
        const data = await oidcApi.callback(p, {code, state});
        if (isLoginResp(data)) {
          // Login path - store token + user, then go to dashboard / saved redirect.
          const auth = useAuthStore.getState();
          auth.setRememberMe(true);
          persistAuthSession(data.token, data.user, true);
          useAuthStore.setState({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          addToast("success", data.newAccount ? "Welcome aboard!" : "Welcome back!");
          const redirectPath =
            data.redirectPath && data.redirectPath.startsWith("/")
            ? data.redirectPath
            : null;
          const target = data.user.role === "admin"
            ? (redirectPath && redirectPath.startsWith("/admin") ? redirectPath : "/admin")
            : (redirectPath && !redirectPath.startsWith("/admin") ? redirectPath : "/dashboard");
          // For social login, prewarm onboarding checks separately
          void prewarmOnboardingCheck(target).catch(() => undefined);
          navigate(target, {replace: true});
        } else {
          // Link path.
          addToast("success", `${p} account linked.`);
          navigate("/settings", {replace: true});
        }
        catch (err) {
          const msg =
            (err as { response?: { data?: { error?: string } } }).response?.data?.error ||
            "Sign-in failed."
          setError(msg);
        }
      })();
    }, [provider, search, navigate, addToast]);

    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Seo title="Signing you in..." noindex/>
        <div className="w-full max-w-sm rounded-xl border-border-gray-200 bg-white p-8 text-center shadow-sm">
          {error ? (
            <>
              <h1 className="text-lg font-semibold text-red-600">Sign-in failed</h1>
<p className="mt-2·text-sm·text-gray-600">{error}</p>
<button
type="button"
onClick={() => navigate("/login", {replace: true})}
className="btn-primary·mt-6·w-full">
>
Back to sign in
</button>
</>
): (
<Spinner className="mx-auto·h-8·w-8"/>
<h1 className="mt-4·text-lg·font-semibold·text-gray-900">Finishing·sign-in...</h1>
<p className="mt-1·text-sm·text-gray-500">
Verifying·your·{provider}·account.
</p>
)
</div>
</div>
);