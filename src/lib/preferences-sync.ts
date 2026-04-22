/**
 * P-6 — Preferences sync between localStorage and Supabase `profiles`.
 *
 * localStorage is always the read-time source of truth.
 * Supabase is the persistence layer for cross-device sync.
 *
 * - `pullPreferences(userId)`: reads Supabase profile → merges into localStorage
 * - `pushPreferences(userId)`: writes current localStorage prefs → Supabase profile
 *
 * Both are fire-and-forget safe: if Supabase is unavailable, they silently fail.
 */
import { supabase } from '@/integrations/supabase/client';
import { getSettings, saveSettings } from './storage';
import type { AppSettings } from './types';

/** Shape of the columns we read/write on `profiles`. */
interface ProfilePrefsRow {
  unit_system: string | null;
  energy_threshold_j: number | null;
  feature_flags: Record<string, boolean> | null;
}

/**
 * Pull preferences from Supabase and merge into localStorage.
 * Called once after login. Does NOT overwrite fields Supabase doesn't store
 * (e.g. advancedMode, weatherAutoSuggest stay local-only).
 */
export async function pullPreferences(userId: string): Promise<void> {
  if (!supabase) return;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('unit_system, energy_threshold_j, feature_flags')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) return;

    const local = getSettings();
    const merged: AppSettings = { ...local };

    if (data.unit_system === 'metric' || data.unit_system === 'imperial') {
      merged.unitSystem = data.unit_system;
    }
    if (data.energy_threshold_j !== undefined) {
      merged.energyThresholdJ = data.energy_threshold_j;
    }
    if (data.feature_flags && typeof data.feature_flags === 'object') {
      merged.featureFlags = {
        ai: !!(data.feature_flags as Record<string, boolean>).ai,
        weather: (data.feature_flags as Record<string, boolean>).weather !== false,
      };
    }

    saveSettings(merged);
  } catch {
    // Supabase unavailable — localStorage stays as-is
  }
}

/**
 * Push current localStorage preferences to Supabase profile.
 * Called on every saveSettings when user is authenticated.
 * Fire-and-forget — errors are silently swallowed.
 */
export async function pushPreferences(userId: string): Promise<void> {
  if (!supabase) return;
  try {
    const s = getSettings();
    await supabase
      .from('profiles')
      .update({
        unit_system: s.unitSystem,
        energy_threshold_j: s.energyThresholdJ ?? null,
        feature_flags: s.featureFlags,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
  } catch {
    // Supabase unavailable — no-op
  }
}