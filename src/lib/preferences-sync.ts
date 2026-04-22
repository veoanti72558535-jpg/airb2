/**
 * P-6 — Preferences sync between localStorage and Supabase `profiles`.
 *
 * Rules:
 *  - localStorage is the read-time source of truth.
 *  - Supabase is the cross-device persistence layer.
 *  - Language & theme are NEVER synced (intentionally per-device).
 *  - All Supabase errors are silent (console.error only).
 *
 * Synced columns: unit_system, energy_threshold_j, display_name
 */
import { supabase } from '@/integrations/supabase/client';
import { getSettings, saveSettings } from './storage';

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
      .select('unit_system, energy_threshold_j, display_name, updated_at')
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
  key: 'unit_system' | 'energy_threshold_j' | 'display_name',
  value: string | number | null,
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
      .select('unit_system, energy_threshold_j, display_name, updated_at')
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
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
  } catch (e) {
    console.error('[preferences-sync] pushAllPreferences failed:', e);
  }
}