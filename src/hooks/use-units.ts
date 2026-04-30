import { useContext, useMemo } from 'react';
import { getSettings, saveSettings } from '@/lib/storage';
import { useI18n } from '@/lib/i18n';
import { AuthContext } from '@/lib/auth-context-internals';
import { markLocalUpdated, savePreferenceToSupabase } from '@/lib/preferences-sync';
import {
  unitCategories,
  getDefaultUnitPrefs,
  getUnitSymbol,
  toDisplay,
  fromDisplay,
  UnitPreferences,
} from '@/lib/units';

/**
 * Hook that provides unit preferences and helpers.
 * Returns the current unit symbol for a category,
 * and conversion helpers to/from display units.
 */
export function useUnits() {
  const { locale } = useI18n();
  // Read auth context defensively: `useUnits` is called from low-level UI
  // (BallisticTable, UnitField, etc.) that may render in tests without an
  // <AuthProvider>. Falling back to `null` keeps the hook crash-free —
  // sync is simply skipped when nobody is logged in.
  const authCtx = useContext(AuthContext);
  const user = authCtx?.user ?? null;
  const settings = getSettings();

  const prefs: UnitPreferences = useMemo(() => {
    return settings.unitPreferences ?? getDefaultUnitPrefs(settings.unitSystem);
  }, [settings.unitPreferences, settings.unitSystem]);

  /** Get the display symbol for a unit category */
  const symbol = (categoryKey: string): string => {
    const unit = prefs[categoryKey];
    return unit ? getUnitSymbol(categoryKey, unit) : '';
  };

  /** Get the label for a unit category (localized) */
  const categoryLabel = (categoryKey: string): string => {
    const cat = unitCategories.find(c => c.key === categoryKey);
    if (!cat) return categoryKey;
    return locale === 'fr' ? cat.labelKeyFr : cat.labelKeyEn;
  };

  /** Convert from internal reference to display */
  const display = (categoryKey: string, value: number): number => {
    return toDisplay(categoryKey, value, prefs);
  };

  /** Convert from display back to internal reference */
  const toRef = (categoryKey: string, value: number): number => {
    return fromDisplay(categoryKey, value, prefs);
  };

  /** Update a single unit preference */
  const setUnitPref = (categoryKey: string, unitValue: string) => {
    const newPrefs = { ...prefs, [categoryKey]: unitValue };
    saveSettings({ ...settings, unitPreferences: newPrefs });
    markLocalUpdated();
    // Cross-device sync: when the user is logged in, push the whole
    // preferences map (jsonb column) so the override sticks on every
    // device. Fire-and-forget — display never blocks on the network.
    if (user) {
      savePreferenceToSupabase(user.id, 'unit_preferences', newPrefs).catch(() => {});
    }
  };

  return { prefs, symbol, categoryLabel, display, toRef, setUnitPref };
}
