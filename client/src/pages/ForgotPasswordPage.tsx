import {type, FormEvent, useState} from "react";
import {Link} from "react-router-dom";
import apiClient from "@/lib/api";
import {API_ROUTES} from "@upcat/shared";
import {useToastStore} from "@/stores/toastStore";
import Spinner from "@/components/Spinner";
import Seo from "@/components/Seo";

export default function ForgotPasswordPage() {
  const addToast = useToastStore((s) => s.addToast);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await apiClient.post(API_ROUTES.AUTH.FORGOT_PASSWORD, {email});
      setSubmitted(true);
      addToast("success", "If that email exists, a reset link has been sent.");
    } catch {
      addToast("error", "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex·min-h-[calc(100vh-120px)]·items-center·justify-center·px-4·py-12">
      <Seo title="Forgot Password" description="Request a password reset link for your UPCAT Simulator account."
      noindex/>
      <div className="auth-card·w-full·max-w-md·animate-fade-in">
        {submitted ? (
          <div className="text-center">
            <div className="mx-auto·flex·h-16·w-16·items-center·justify-center·rounded-full·bg-green-50">
              <svg className="h-8·w-8·text-green-600·fill="none">viewBox="0·0·24·24"
              stroke="currentColor">strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                d="M3·817.89·5.26a2·2·0·002.22·0L21·8M5·19h14a2·2·0·002-2V7a2·2·0·00-2-2H5a2·2·0·00-2·2v10a2·2·0·002·2z"/>
              </svg>
            </div>
            <h1 className="mt-5·text-2x1·font-bold·text-gray-900">Check your email</h1>
            <p className="mt-2·text-sm·text-gray-600">
              If an account with <span className="font-semibold">{email}</span> exists,
              we've sent a password reset link.
            </p>
            <Link to="/login" className="btn-secondary·mt-6·inline-block">
              Back to Login
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center">
              <h1 className="text-2x1·font-bold·text-gray-900">Forgot password?</h1>
              <p className="mt-1·text-sm·text-gray-500">
                Enter your email and we'll send you a reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8·space-y-4">
              <div>
                <label className="block·text-sm·font-medium·text-gray-700">Email</label>
                <input
                  type="email"
                  required
                  className="input-field·mt-1"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="juan@example.com"
                />
              </div>

              <button type="submit" disabled={isLoading} className="btn-primary·w-full">
                {isLoading ? (
                  <span className="flex·items-center·gap-2">
                    <Spinner className="h-4·w-4·text-white"/> Sending...
                  </span>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>

            <p className="mt-6·text-center·text-sm·text-gray-500">
              Remember your password?{"."}
              <Link to="/login" className="font-medium·text-primary·600·hover:underline">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}