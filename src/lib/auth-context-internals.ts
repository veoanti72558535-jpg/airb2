/**
 * Non-component bits of the auth module, isolated so `auth-context.tsx`
 * can stay components-only and play nice with Vite Fast Refresh.
 *
 * Mixing the `AuthProvider` component with the `useAuth` hook + the
 * `AuthContext` instance + the type defs in a single .tsx file used to
 * trip Fast Refresh: when only this file changed, Vite would swap the
 * module but React's hook dispatcher could end up null on the next
 * render, producing the classic
 *   "Cannot read properties of null (reading 'useState')"
 * crash inside `AuthProvider`. Splitting non-component exports out fixes
 * that for good.
 */
import { createContext, useContext } from 'react';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}