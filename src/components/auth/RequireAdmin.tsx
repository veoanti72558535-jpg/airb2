/**
 * RequireAdmin — strict access guard for admin-only pages.
 *
 * Responsibilities:
 *   - never render children unless `useIsAdmin().status === 'admin'`
 *   - never leak the existence of admin features to non-authorized users
 *     (no "access denied" message, no source paths, no role hints)
 *   - silent redirect to a neutral destination for anyone who is not admin
 *
 * Routing rules:
 *   - 'loading'  → minimal spinner (matches PageLoader visual weight)
 *   - 'anon'     → render a sign-in surface via `signInFallback`. If none
 *                  is provided, redirect to `/admin/ai` which exposes the
 *                  generic Supabase sign-in card (same form as elsewhere).
 *   - 'denied'   → silent <Navigate to="/" replace />
 *   - 'error'    → silent <Navigate to="/" replace /> (treated like denied
 *                  to avoid telling unauthenticated probes whether the
 *                  RPC exists)
 *
 * The hook `useIsAdmin` already calls `has_role()` server-side via a
 * SECURITY DEFINER RPC, so this guard cannot be bypassed by tampering
 * with localStorage / JWT claims / window globals.
 *
 * SECURITY NOTE: this is defense-in-depth. The actual data protection
 * lives in PostgreSQL RLS policies (admin-only `app_settings` write,
 * etc.). A user who bypasses this guard still cannot read or modify
 * sensitive rows.
 */
import React, { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useIsAdmin } from '@/lib/hooks/useIsAdmin';
import { useI18n } from '@/lib/i18n';

interface RequireAdminProps {
  children: React.ReactNode;
  /** Optional surface for the 'anon' state. Defaults to redirecting to /admin/ai. */
  signInFallback?: React.ReactNode;
  /** Where to redirect non-admins. Defaults to "/". */
  redirectTo?: string;
}

export function RequireAdmin({
  children,
  signInFallback,
  redirectTo = '/',
}: RequireAdminProps) {
  const admin = useIsAdmin();
  const location = useLocation();
  const { t } = useI18n();
  const toastShown = useRef(false);

  // Show a single neutral toast on denied/error — no role/admin wording.
  useEffect(() => {
    if ((admin.status === 'denied' || admin.status === 'error') && !toastShown.current) {
      toastShown.current = true;
      toast.error(t('admin.guard.notFound'));
    }
  }, [admin.status, t]);

  if (admin.status === 'loading') {
    return (
      <div
        className="flex items-center justify-center py-24"
        role="status"
        aria-live="polite"
        aria-label={t('admin.guard.loading')}
      >
        <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent" />
      </div>
    );
  }

  if (admin.status === 'anon') {
    if (signInFallback) return <>{signInFallback}</>;
    return <Navigate to="/admin/ai" replace state={{ from: location.pathname }} />;
  }

  if (admin.status !== 'admin') {
    // 'denied' or 'error' → silent redirect, no admin-specific message.
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

export default RequireAdmin;