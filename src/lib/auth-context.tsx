/**
 * P-2 — Optional Supabase Auth context.
 *
 * If Supabase is not configured (`supabase === null`), the provider
 * exposes a permanent `{ user: null, session: null, loading: false }`
 * so the entire app works identically without any backend.
 */
import { useEffect, useState, useCallback, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { syncPreferencesOnLogin } from './preferences-sync';
import { syncSessionsOnLogin } from './session-supabase-repo';
import { syncLibraryOnLogin } from './library-supabase-repo';
import { syncCrossValidationOnLogin } from './cross-validation-supabase-repo';
import { AuthContext, useAuth as useAuthInternal, type AuthContextType } from './auth-context-internals';

// Re-export the hook + type so existing `import { useAuth } from '@/lib/auth-context'`
// call sites keep working unchanged. The actual definitions live in the
// non-component file to keep this module Fast-Refresh friendly.
export const useAuth = useAuthInternal;
export type { AuthContextType };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!supabase);

  useEffect(() => {
    if (!supabase) return;

    // Subscribe first, then fetch current session (Supabase best practice)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
      if (s?.user) {
        syncPreferencesOnLogin(s.user.id).catch(() => {});
        syncSessionsOnLogin(s.user.id).catch(e =>
          console.error('[auth] session sync failed', e)
        );
        syncLibraryOnLogin(s.user.id).catch(e =>
          console.error('[auth] library sync failed', e)
        );
        syncCrossValidationOnLogin(s.user.id).catch(e =>
          console.error('[auth] cross-validation sync failed', e)
        );
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user) {
      syncPreferencesOnLogin(data.user.id).catch(() => {});
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  }, []);

  const signOutFn = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut: signOutFn }}>
      {children}
    </AuthContext.Provider>
  );
}