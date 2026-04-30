/**
 * P-6 — Preferences sync between localStorage and Supabase `profiles`.
 *
 * Rules:
 *  - localStorage is the read-time source of truth.
 *  - Supabase is the cross-device persistence layer.
 *  - Language & theme are NEVER synced (intentionally per-device).
 *  - All Supabase errors are silent (console.error only).
 *
 * Synced columns: unit_system, energy_threshold_j, display_name,
 *                 unit_preferences (jsonb), number_format (jsonb)
 *
 * `unit_preferences` and `number_format` are per-user fine-tuning of the
 * Préférences panel (per-category unit overrides, decimals, scientific
 * notation…). They are display-only — never feed the ballistic engine —
 * and follow the same last-write-wins rule as the other prefs.
 */
import { supabase } from '@/integrations/supabase/client';
import { getSettings, saveSettings } from './storage';
import type { NumberFormatPrefs } from './number-format';
import type { UnitPreferences } from './units';

/** Timestamp key in localStorage to track last local modification. */
const LS_UPDATED_KEY = 'pcp-settings-updated-at';

function getLocalUpdatedAt(): string {
  return localStorage.getItem(LS_UPDATED_KEY) ?? '1970-01-01T00:00:00Z';
}

export function markLocalUpdated(): void {
  localStorage.setItem(LS_UPDATED_KEY, new Date().toISOString());
}

/**
 * Load preferences from Supabase profile into localStorage.
 * If Supabase fails → localStorage unchanged, no exception.
 */
export async function loadPreferencesFromSupabase(userId: string): Promise<void> {
  if (!supabase) return;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('unit_system, energy_threshold_j, display_name, unit_preferences, number_format, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) return;

    const local = getSettings();
    let changed = false;

    if (data.unit_system === 'metric' || data.unit_system === 'imperial') {
      if (local.unitSystem !== data.unit_system) {
        local.unitSystem = data.unit_system;
        changed = true;
      }
    }
    if (data.energy_threshold_j !== undefined && data.energy_threshold_j !== null) {
      if (local.energyThresholdJ !== data.energy_threshold_j) {
        local.energyThresholdJ = data.energy_threshold_j;
        changed = true;
      }
    }
    const remoteUnitPrefs = sanitizeUnitPrefs((data as any).unit_preferences);
    if (remoteUnitPrefs && !shallowEqual(local.unitPreferences, remoteUnitPrefs)) {
      local.unitPreferences = remoteUnitPrefs;
      changed = true;
    }
    const remoteNumberFormat = sanitizeNumberFormat((data as any).number_format);
    if (remoteNumberFormat && !shallowEqual(local.numberFormat, remoteNumberFormat)) {
      local.numberFormat = remoteNumberFormat;
      changed = true;
    }

    if (changed) saveSettings(local);
  } catch (e) {
    console.error('[preferences-sync] loadPreferencesFromSupabase failed:', e);
  }
}

/**
 * Save a single preference to Supabase (fire-and-forget).
 * Errors are logged to console only.
 */
export async function savePreferenceToSupabase(
  userId: string,
  key: 'unit_system' | 'energy_threshold_j' | 'display_name' | 'unit_preferences' | 'number_format',
  value: string | number | null | Record<string, unknown>,
): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ [key]: value, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (error) console.error('[preferences-sync] savePreferenceToSupabase error:', error.message);
  } catch (e) {
    console.error('[preferences-sync] savePreferenceToSupabase failed:', e);
  }
}

/**
 * Full sync on login: last-write-wins between localStorage and Supabase.
 * Compares `updated_at` from Supabase vs local timestamp.
 * Fire-and-forget — never throws.
 */
export async function syncPreferencesOnLogin(userId: string): Promise<void> {
  if (!supabase) return;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('unit_system, energy_threshold_j, display_name, unit_preferences, number_format, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      // No profile row or error — push local prefs to create baseline
      await pushAllPreferences(userId);
      return;
    }

    const remoteTs = data.updated_at ?? '1970-01-01T00:00:00Z';
    const localTs = getLocalUpdatedAt();

    if (remoteTs > localTs) {
      // Supabase is newer — pull into localStorage
      const local = getSettings();
      let changed = false;
      if ((data.unit_system === 'metric' || data.unit_system === 'imperial') && local.unitSystem !== data.unit_system) {
        local.unitSystem = data.unit_system;
        changed = true;
      }
      if (data.energy_threshold_j != null && local.energyThresholdJ !== data.energy_threshold_j) {
        local.energyThresholdJ = data.energy_threshold_j;
        changed = true;
      }
      const remoteUnitPrefs = sanitizeUnitPrefs((data as any).unit_preferences);
      if (remoteUnitPrefs && !shallowEqual(local.unitPreferences, remoteUnitPrefs)) {
        local.unitPreferences = remoteUnitPrefs;
        changed = true;
      }
      const remoteNumberFormat = sanitizeNumberFormat((data as any).number_format);
      if (remoteNumberFormat && !shallowEqual(local.numberFormat, remoteNumberFormat)) {
        local.numberFormat = remoteNumberFormat;
        changed = true;
      }
      if (changed) {
        saveSettings(local);
        markLocalUpdated();
      }
    } else {
      // localStorage is newer or same — push to Supabase
      await pushAllPreferences(userId);
    }
  } catch (e) {
    console.error('[preferences-sync] syncPreferencesOnLogin failed:', e);
  }
}

/** Internal: push all synced prefs to Supabase. */
async function pushAllPreferences(userId: string): Promise<void> {
  if (!supabase) return;
  const s = getSettings();
  try {
    await supabase
      .from('profiles')
      .update({
        unit_system: s.unitSystem,
        energy_threshold_j: s.energyThresholdJ ?? null,
        unit_preferences: s.unitPreferences ?? null,
        number_format: s.numberFormat ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
  } catch (e) {
    console.error('[preferences-sync] pushAllPreferences failed:', e);
  }
}

// ─── Validation helpers ──────────────────────────────────────────────────
// Defensive parsing: the jsonb column can in theory contain anything, so we
// only accept plain `Record<string, string>` for unit prefs and a small
// known shape for number-format. Anything else → returns null and we keep
// the local value untouched.

function sanitizeUnitPrefs(value: unknown): UnitPreferences | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === 'string' && v.length > 0 && v.length < 32) {
      out[k] = v;
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

function sanitizeNumberFormat(value: unknown): NumberFormatPrefs | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const out: NumberFormatPrefs = {};
  if (typeof v.decimals === 'number' && v.decimals >= 0 && v.decimals <= 6) out.decimals = v.decimals;
  if (typeof v.scientific === 'boolean') out.scientific = v.scientific;
  if (typeof v.groupThousands === 'boolean') out.groupThousands = v.groupThousands;
  return Object.keys(out).length > 0 ? out : null;
}

function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const ka = Object.keys(a as Record<string, unknown>);
  const kb = Object.keys(b as Record<string, unknown>);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if ((a as Record<string, unknown>)[k] !== (b as Record<string, unknown>)[k]) return false;
  }
  return true;
}