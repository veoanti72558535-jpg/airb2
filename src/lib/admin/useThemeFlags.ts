/**
 * useThemeFlags — read theme feature flags (server-managed) + live refresh
 * across windows via a custom window event.
 *
 * Stale-while-revalidate:
 *   1. Returns DEFAULT_THEME_FLAGS immediately so first paint never blocks.
 *   2. Fires a Supabase read in the background and updates state.
 *   3. Listens to `'theme-flags-updated'` so the admin screen can broadcast
 *      a fresh fetch right after a successful write.
 *
 * We deliberately avoid Realtime subscriptions: flags change a handful of
 * times per project lifetime, and a window event covers the same-tab case.
 * Other tabs pick up changes on next mount / navigation.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_THEME_FLAGS,
  readThemeFlags,
  type ThemeFlags,
} from './theme-flags';

export const THEME_FLAGS_EVENT = 'theme-flags-updated';

export function broadcastThemeFlagsUpdated() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(THEME_FLAGS_EVENT));
}

export interface UseThemeFlagsResult {
  flags: ThemeFlags;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useThemeFlags(): UseThemeFlagsResult {
  const [flags, setFlags] = useState<ThemeFlags>(DEFAULT_THEME_FLAGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await readThemeFlags();
      setFlags(next);
      setError(null);
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const next = await readThemeFlags().catch(() => DEFAULT_THEME_FLAGS);
      if (alive) {
        setFlags(next);
        setLoading(false);
      }
    })();
    const onPing = () => {
      void refresh();
    };
    window.addEventListener(THEME_FLAGS_EVENT, onPing);
    return () => {
      alive = false;
      window.removeEventListener(THEME_FLAGS_EVENT, onPing);
    };
  }, [refresh]);

  return { flags, loading, error, refresh };
}
