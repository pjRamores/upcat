import { type FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import apiClient from "@/lib/api";
import { API_ROUTES, validatePassword } from "@upcat/shared";
import { useToastStore } from "@/stores/toastStore";
import PasswordStrengthBar from "@/components/PasswordStrengthBar";
import Spinner from "@/components/Spinner";
import Seo from "@/components/Seo";

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
            <svg className="h-8 w-8 text-amber-600" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6L18 18" />
            </svg>
          </div>
          <h1 className="mt-5 text-2xl font-bold text-gray-900">Invalid Link</h1>
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
        confirmPassword,
      });
      addToast("success", "Password reset successfully!");
      navigate("/login", { replace: true });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } }).response?.data?.error || "Reset failed. The link may have expired.";
      addToast("error", message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center px-4 py-12">
      <Seo title="Reset Password" description="Choose a new password for your UPCAT Simulator account." noindex />
      <div className="auth-card w-full max-w-md animate-fade-in">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Reset your password</h1>
          <p className="mt-1 text-sm text-gray-500">Enter your new password below.</p>
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
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2"
                onClick={() => setShowPassword(!showPassword)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8h1.657l5.657 5.657 1.414-1.414z" />
                </svg>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/auth';
import { usePasswordStrength } from '../../hooks/password';
import { useLoading } from '../../hooks/loading';
import { Spinner } from '../../components/Spinner';
import { PasswordStrengthBar } from '../../components/PasswordStrengthBar';
import { InputField } from '../../components/InputField';
import { Button } from '../../components/Button';
import { Link } from 'react-router-dom';

const ResetPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setErrors } = useAuth();
  const { setShowPassword } = usePasswordStrength();
  const { isLoading } = useLoading();

  const initialValues = {
    password: '',
    confirmPassword: '',
  };

  const validationSchema = Yup.object().shape({
    password: Yup.string()
      .min(8, t('password.min'))
      .max(20, t('password.max'))
      .required(t('password.required')),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password'), null], t('password.match'))
      .required(t('password.required')),
  });

  const handleSubmit = async (values: typeof initialValues) => {
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error('Failed to reset password');
      }

      navigate('/login');
    } catch (error) {
      setErrors((prev) => ({ ...prev, password: undefined }));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="max-w-md w-full px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-medium text-gray-900">{t('resetPassword.title')}</h2>
            <p className="mt-2 text-sm text-gray-500">{t('resetPassword.description')}</p>
            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {({ errors, touched }) => (
                <Form>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      {t('resetPassword.password')}
                    </label>
                    <Field
                      type="password"
                      name="password"
                      required
                      className={`input-field mt-1 ${errors.password ? "input-error" : ""}`}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrors((prev) => ({ ...prev, password: undefined }));
                      }}
                      placeholder="••••••••"
                    />
                    {errors.password && <p className="mt-1 text-xs text-amber-500">{errors.password}</p>}
                    <PasswordStrengthBar password={newPassword} />
                  </div>
                  {/* Confirm new password */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                      {t('resetPassword.confirmPassword')}
                    </label>
                    <Field
                      type="password"
                      name="confirmPassword"
                      required
                      className={`input-field mt-1 ${errors.confirm ? "input-error" : ""}`}
                      value={confirmNewPassword}
                      onChange={(e) => {
                        setConfirmNewPassword(e.target.value);
                        setErrors((prev) => ({ ...prev, confirm: undefined }));
                      }}
                      placeholder="••••••••"
                    />
                    {errors.confirm && <p className="mt-1 text-xs text-amber-500">{errors.confirm}</p>}
                  </div>
                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary w-full"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Spinner className="h-4 w-4 text-white" /> Resetting...
                      </span>
                    ) : (
                      "Reset Password"
                    )}
                  </button>
                </Form>
              )}
            </Formik>
            <p className="mt-6 text-center text-sm text-gray-500">
              <Link to="/login" className="font-medium text-primary-600 hover:underline">
                {t('resetPassword.backToLogin')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;