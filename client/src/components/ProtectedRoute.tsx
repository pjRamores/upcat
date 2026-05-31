import {useEffect} from "react";
import {Navigate, Outlet, useLocation} from "react-router-dom";
import {useAuthStore} from "@/stores/authStore";
import {useToastStore} from "@/stores/toastStore";
import type {UserRole} from "@upcat/shared";

// Dedupe guard for StrictMode double-effect behavior in development.
let lastPermissionToast: {key: string; at: number} | null = null;

interface Props {
  /** When set, the user must have this role; otherwise toasts + redirects by current role. */
  requiredRole?: UserRole;
}

export default function ProtectedRoute({requiredRole}: Props) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role());
  const addToast = useToastStore((s) => s.addToast);
  const location = useLocation();

  const resolvedRole: UserRole = role;
  const isAdminPreview =
    requiredRole === "reviewee" &&
    resolvedRole === "admin" &&
    new URLSearchParams(location.search).get("adminPreview") === "1";
  const hasRequiredRole = !requiredRole || resolvedRole === requiredRole || isAdminPreview;

  useEffect(() => {
    if (isAuthenticated && requiredRole && !hasRequiredRole) {
      const key = `${requiredRole}|${resolvedRole}|${location.pathname}`;
      const now = Date.now();
      if (
        lastPermissionToast &&
        lastPermissionToast.key === key &&
        now - lastPermissionToast.at < 1500
      ) {
        return;
      }
      lastPermissionToast = {key, at: now};
      addToast("error", "You do not have permission to access that page.");
    }
  }, [isAuthenticated, requiredRole, hasRequiredRole, resolvedRole, location.pathname, addToast]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{from: location}} replace/>;
  }
  if (requiredRole && !hasRequiredRole) {
    return <Navigate to={resolvedRole === "admin" ? "/admin" : "/dashboard"} replace/>;
  }
  return <Outlet/>;
}