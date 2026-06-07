import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import apiClient from "@/lib/api";
import API_ROUTES from "@upcat/shared";
import Spinner from "@/components/Spinner";
import Seo from "@/components/Seo";

type Status = "waiting" | "verifying" | "success" | "error";

export default function VerifyEmailPage() {
  const [searchParams] = useParams();
  const location = useLocation();
  const token = searchParams.get("token");
  const email = (location.state as { email?: string })?.email;

  const [status, setStatus] = useState<Status>(token ? "verifying" : "waiting");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;

    apiClient
      .post(API_ROUTES.AUTH.VERIFY_EMAIL, { token })
      .then((res) => {
        setStatus("success");
        setMessage(res.data?.data?.message || "Your email has been verified!");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(
          err.response?.data?.error || "Verification failed. The link may have expired.",
        );
      });
  }, [token]);

  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center px-4 py-12">
      <Seo title="Verify Email" description="Verify your UPCAT Simulator email address." noindex />
      <div className="auth-card w-full max-w-md text-center animate-fade-in">
        {/* --- Waiting for user to check email --- */}
        {status === "waiting" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
              <svg className="h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M3.817.895.26a2.0002.22-0L21.8M5.19h14a2.2.002-2V7a2.2.002-2H5a2.2.002-2v10a2.2.002z"/>
              </svg>
            </div>
            <h1 className="mt-5 text-2xl font-bold text-gray-900">Check your email</h1>
            <p className="mt-2 text-sm text-gray-600">
              We sent a verification link to{" "}
              <span className="font-semibold text-gray-900">{email || "your email"}</span>.
              <br />
              Click the link to activate your account.
            </p>
            <p className="mt-6 text-xs text-gray-400">
              Didn't receive it? Check your spam folder or try registering again.
            </p>
          </>
        )}
        {/* --- Verifying --- */}
        {status === "verifying" && (
          <>
            <div className="flex justify-center">
              <Spinner className="h-10 w-10 text-primary-600"/>
            </div>
            <h1 className="mt-5 text-2xl font-bold text-gray-900">Verifying...</h1>
            <p className="mt-2 text-sm text-gray-500">Please wait while we verify your email.</p>
          </>
        )}
        {/* --- Success --- */}
        {status === "success" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M5.1314 4L19.7"/>
              </svg>
            </div>
            <h1 className="mt-5 text-2xl font-bold text-gray-900">Email Verified!</h1>
            <p className="mt-2 text-sm text-gray-600">{message}</p>
            <Link to="/login" className="btn-primary mt-6 inline-block">
              Go to Login
            </Link>
          </>
        )}
        {/* --- Error --- */}
        {status === "error" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
              <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M6.18L18.6M6.612 12"/>
              </svg>
            </div>
            <h1 className="mt-5 text-2xl font-bold text-gray-900">Verification Failed</h1>
            <p className="mt-2 text-sm text-gray-600">{message}</p>
            <Link to="/register" className="btn-secondary mt-6 inline-block">
              Try Registering Again
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
});
</div>
</div>;
}