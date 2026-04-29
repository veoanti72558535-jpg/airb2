/**
 * useIsAdmin — vérification serveur du rôle admin via has_role() RPC.
 *
 * Pourquoi pas un check client (localStorage / champ profile / claim JWT) ?
 *   - cf. guardrails projet : les rôles sont stockés UNIQUEMENT dans
 *     `public.user_roles` et lus via la fonction SECURITY DEFINER
 *     `public.has_role(_user_id, _role)`. Tout autre check est trivialement
 *     contournable côté client → escalade de privilège.
 *   - L'app n'a PAS de table `profiles.role` ni de claim custom dans le JWT.
 *
 * Statuts :
 *   - 'loading' : session en cours de bootstrap ou RPC en vol
 *   - 'anon'    : pas de session Supabase active
 *   - 'admin'   : has_role(uid, 'admin') === true
 *   - 'denied'  : session présente mais rôle absent
 *   - 'error'   : RPC indisponible / configuration invalide
 *
 * Le hook est volontairement passif : il ne fait JAMAIS de signOut() ni de
 * navigation. C'est à la page hôte de décider quoi afficher.
 */
import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';

export type AdminStatus = 'loading' | 'anon' | 'admin' | 'denied' | 'error';

export interface UseIsAdminResult {
  status: AdminStatus;
  isAdmin: boolean;
  userId: string | null;
  email: string | null;
  error?: string;
  /** Re-run the role probe (useful after login). */
  recheck: () => Promise<void>;
}

export function useIsAdmin(): UseIsAdminResult {
  const [status, setStatus] = useState<AdminStatus>(
    isSupabaseConfigured() ? 'loading' : 'error',
  );
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();

  const probe = async () => {
    if (!isSupabaseConfigured() || !supabase) {
      setStatus('error');
      setError('supabase-not-configured');
      return;
    }
    setStatus((s) => (s === 'admin' || s === 'denied' ? s : 'loading'));
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session?.user) {
        setUserId(null);
        setEmail(null);
        setStatus('anon');
        return;
      }
      setUserId(session.user.id);
      setEmail(session.user.email ?? null);
      const { data, error: rpcErr } = await supabase.rpc('has_role', {
        _user_id: session.user.id,
        _role: 'admin',
      });
      if (rpcErr) {
        setError(rpcErr.message);
        setStatus('error');
        return;
      }
      setStatus(data === true ? 'admin' : 'denied');
    } catch (e) {
      setError(String(e));
      setStatus('error');
    }
  };

  useEffect(() => {
    let alive = true;
    void (async () => {
      await probe();
      if (!alive) return;
    })();
    if (!isSupabaseConfigured() || !supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      if (alive) void probe();
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    isAdmin: status === 'admin',
    userId,
    email,
    error,
    recheck: probe,
  };
}
