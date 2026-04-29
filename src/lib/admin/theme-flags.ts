/**
 * Theme feature flags — admin-controlled runtime configuration.
 *
 * Flags live in `public.app_settings` (JSONB key/value, RLS: read = any
 * authenticated user, write = admin-only via the existing
 * `app_settings_write_admin` policy). We never trust localStorage to drive
 * gates that are meant to be enforced for ALL users — those decisions must
 * come from the server-managed table.
 *
 * Falls back to `DEFAULT_THEME_FLAGS` when:
 *   - Supabase isn't configured (local dev / preview without backend),
 *   - the row doesn't exist yet (first install),
 *   - the row is unparseable (defensive: never break the UI on bad config).
 *
 * Writes are gated client-side by RLS — calling `writeThemeFlags()` as a
 * non-admin will return an error, surfaced by the admin UI.
 */
import type { ThemeId, ThemeFamily } from '@/lib/theme-constants';
import { THEMES, isValidTheme, DEFAULT_THEME } from '@/lib/theme-constants';
import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';

export const THEME_FLAGS_KEY = 'theme.flags';

export interface ThemeFlags {
  /** Default theme served to brand-new visitors (before they pick one). */
  defaultTheme: ThemeId;
  /** Subset of theme ids users are allowed to pick. Empty array = all allowed. */
  allowedVariants: ThemeId[];
  /** Whether the Theme Studio "Simple" mode is offered. */
  simpleModeEnabled: boolean;
  /** Whether the Theme Studio "Advanced" mode is offered. */
  advancedModeEnabled: boolean;
  /** When false, the `/theme` route is hidden — only the quick picker remains. */
  studioRouteEnabled: boolean;
  /** When false, the per-user dark/light toggle is hidden. */
  darkLightToggleEnabled: boolean;
}

export const DEFAULT_THEME_FLAGS: ThemeFlags = {
  defaultTheme: DEFAULT_THEME,
  allowedVariants: [],
  simpleModeEnabled: true,
  advancedModeEnabled: true,
  studioRouteEnabled: true,
  darkLightToggleEnabled: true,
};

const ALL_FAMILIES: ThemeFamily[] = Array.from(
  new Set(THEMES.map((t) => t.family)),
) as ThemeFamily[];

/**
 * Coerce an arbitrary JSON blob into a well-formed ThemeFlags object.
 * Unknown / invalid fields are dropped silently — better an under-restricted
 * UI than a broken admin screen.
 */
export function parseThemeFlags(raw: unknown): ThemeFlags {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_THEME_FLAGS };
  const r = raw as Record<string, unknown>;
  const allowed = Array.isArray(r.allowedVariants)
    ? (r.allowedVariants.filter(
        (v) => typeof v === 'string' && isValidTheme(v as string),
      ) as ThemeId[])
    : [];
  return {
    defaultTheme:
      typeof r.defaultTheme === 'string' && isValidTheme(r.defaultTheme)
        ? (r.defaultTheme as ThemeId)
        : DEFAULT_THEME_FLAGS.defaultTheme,
    allowedVariants: allowed,
    simpleModeEnabled: r.simpleModeEnabled !== false,
    advancedModeEnabled: r.advancedModeEnabled !== false,
    studioRouteEnabled: r.studioRouteEnabled !== false,
    darkLightToggleEnabled: r.darkLightToggleEnabled !== false,
  };
}

/**
 * Apply flags to a list of theme metas: returns only themes the user is
 * allowed to pick. The `defaultTheme` is always included so the admin can
 * lock to a single theme by allowing only that one.
 */
export function filterThemesByFlags<T extends { id: ThemeId }>(
  themes: T[],
  flags: ThemeFlags,
): T[] {
  if (!flags.allowedVariants.length) return themes;
  const allowed = new Set<ThemeId>(flags.allowedVariants);
  allowed.add(flags.defaultTheme);
  return themes.filter((t) => allowed.has(t.id));
}

export function listFamilies(): ThemeFamily[] {
  return [...ALL_FAMILIES];
}

/**
 * Read flags from `app_settings`. Resolves to defaults when Supabase isn't
 * configured or the row is missing/invalid.
 */
export async function readThemeFlags(): Promise<ThemeFlags> {
  if (!isSupabaseConfigured() || !supabase) return { ...DEFAULT_THEME_FLAGS };
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', THEME_FLAGS_KEY)
    .maybeSingle();
  if (error || !data) return { ...DEFAULT_THEME_FLAGS };
  return parseThemeFlags((data as { value: unknown }).value);
}

/**
 * Write flags. RLS rejects non-admin callers; we surface that as an Error.
 */
export async function writeThemeFlags(flags: ThemeFlags): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('supabase-not-configured');
  }
  const safe = parseThemeFlags(flags);
  const { error } = await supabase
    .from('app_settings')
    .upsert(
      { key: THEME_FLAGS_KEY, value: safe as unknown as Record<string, unknown> },
      { onConflict: 'key' },
    );
  if (error) throw new Error(error.message);
}
