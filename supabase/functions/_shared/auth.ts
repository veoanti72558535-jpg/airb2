/**
 * Auth IA-1 — vérifie un JWT Supabase + le rôle 'admin'.
 *
 * Pourquoi en code et pas via `verify_jwt = true` côté config ?
 *  - Permet de retourner un message d'erreur métier propre (au lieu d'un
 *    401 opaque du proxy Supabase).
 *  - Permet de chaîner immédiatement la vérification de rôle via
 *    `has_role()` sans aller-retour supplémentaire.
 *
 * Le client Supabase service-role est utilisé pour l'appel `has_role`
 * (security definer) afin que la lecture ne soit pas bloquée par les RLS
 * propres de `user_roles`. L'identité vérifiée reste celle du JWT du
 * client (jamais service-role en aval).
 */
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

export interface AdminUser {
  id: string;
  email: string | null;
}

export type AuthOutcome =
  | { ok: true; user: AdminUser; service: SupabaseClient; userClient: SupabaseClient }
  | { ok: false; status: number; code: string; message: string };

export async function requireAdmin(req: Request): Promise<AuthOutcome> {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return { ok: false, status: 401, code: 'no-auth', message: 'Missing Authorization header' };
  }
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
    return {
      ok: false,
      status: 500,
      code: 'server-misconfigured',
      message: 'SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY missing in Edge Function env',
    };
  }

  // Client AVEC le JWT du caller — pour récupérer l'identité.
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) {
    return { ok: false, status: 401, code: 'invalid-jwt', message: 'Invalid or expired JWT' };
  }

  // Client service-role pour appeler has_role (contournement RLS sûr).
  const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: roleData, error: roleErr } = await service.rpc('has_role', {
    _user_id: userRes.user.id,
    _role: 'admin',
  });
  if (roleErr) {
    return { ok: false, status: 500, code: 'role-check-failed', message: roleErr.message };
  }
  if (roleData !== true) {
    return { ok: false, status: 403, code: 'not-admin', message: 'Admin role required for IA-1' };
  }

  return {
    ok: true,
    user: { id: userRes.user.id, email: userRes.user.email ?? null },
    service,
    userClient,
  };
}