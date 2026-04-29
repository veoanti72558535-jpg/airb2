import React from 'react';
import { Globe, Cloud, ToggleLeft, Zap } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getSettings, saveSettings } from '@/lib/storage';
import { useAuth } from '@/lib/auth-context';
import { savePreferenceToSupabase, markLocalUpdated } from '@/lib/preferences-sync';
import { cn } from '@/lib/utils';

const ENERGY_PRESETS: { key: string; value: number | null; labelKey: string }[] = [
  { key: 'off', value: null, labelKey: 'settings.energyThresholdOff' },
  { key: 'fr', value: 7.5, labelKey: 'settings.energyThresholdFr' },
  { key: 'uk', value: 16.27, labelKey: 'settings.energyThresholdUk' },
  { key: 'custom', value: -1, labelKey: 'settings.energyThresholdCustom' },
];

/**
 * Hub Réglages — onglet "Général" :
 * langue, mode par défaut, météo auto, seuil d'énergie réglementaire.
 */
export function GeneralPanel() {
  const { t, locale, setLocale } = useI18n();
  const settings = getSettings();
  const { user } = useAuth();
  const [, force] = React.useReducer((x: number) => x + 1, 0);

  const currentThreshold = settings.energyThresholdJ === undefined ? 16.27 : settings.energyThresholdJ;
  const matched = ENERGY_PRESETS.find((p) => p.value === currentThreshold);
  const initialPresetKey = matched ? matched.key : 'custom';
  const [presetKey, setPresetKey] = React.useState<string>(initialPresetKey);
  const [customJ, setCustomJ] = React.useState<string>(
    initialPresetKey === 'custom' && currentThreshold !== null ? String(currentThreshold) : '12',
  );

  const applyPreset = (key: string) => {
    setPresetKey(key);
    if (key === 'custom') {
      const parsed = parseFloat(customJ);
      const val = Number.isFinite(parsed) && parsed > 0 ? parsed : 12;
      saveSettings({ ...settings, energyThresholdJ: val });
      markLocalUpdated();
      if (user) savePreferenceToSupabase(user.id, 'energy_threshold_j', val).catch(() => {});
    } else {
      const preset = ENERGY_PRESETS.find((p) => p.key === key);
      if (preset) {
        saveSettings({ ...settings, energyThresholdJ: preset.value });
        markLocalUpdated();
        if (user) savePreferenceToSupabase(user.id, 'energy_threshold_j', preset.value ?? null).catch(() => {});
      }
    }
    force();
  };

  const applyCustom = (raw: string) => {
    setCustomJ(raw);
    const parsed = parseFloat(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      saveSettings({ ...settings, energyThresholdJ: parsed });
      markLocalUpdated();
      if (user) savePreferenceToSupabase(user.id, 'energy_threshold_j', parsed).catch(() => {});
    }
  };

  const toggleAdvanced = () => {
    saveSettings({ ...settings, advancedMode: !settings.advancedMode });
    force();
  };

  const toggleWeather = () => {
    saveSettings({ ...settings, weatherAutoSuggest: !(settings.weatherAutoSuggest !== false) });
    force();
  };

  return (
    <div className="space-y-3">
      {/* Language */}
      <div className="surface-elevated p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="h-4 w-4 text-primary" />
            <div className="text-sm font-medium">{t('settings.language')}</div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setLocale('fr')} className={cn('px-3 py-1 rounded-md text-xs font-medium', locale === 'fr' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}>FR</button>
            <button onClick={() => setLocale('en')} className={cn('px-3 py-1 rounded-md text-xs font-medium', locale === 'en' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}>EN</button>
          </div>
        </div>
      </div>

      {/* Default mode */}
      <div className="surface-elevated p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ToggleLeft className="h-4 w-4 text-primary" />
            <div className="text-sm font-medium">{t('settings.defaultMode')}</div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => settings.advancedMode && toggleAdvanced()} className={cn('px-3 py-1 rounded-md text-xs font-medium', !settings.advancedMode ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}>{t('common.simpleMode')}</button>
            <button onClick={() => !settings.advancedMode && toggleAdvanced()} className={cn('px-3 py-1 rounded-md text-xs font-medium', settings.advancedMode ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}>{t('common.advancedMode')}</button>
          </div>
        </div>
      </div>

      {/* Weather auto suggest */}
      <div className="surface-elevated p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Cloud className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium">{t('weather.autoSuggest')}</div>
              <div className="text-[11px] text-muted-foreground">{t('weather.autoSuggestDesc')}</div>
            </div>
          </div>
          <button
            onClick={toggleWeather}
            className={cn('px-3 py-1 rounded-md text-xs font-medium', settings.weatherAutoSuggest !== false ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}
          >
            {settings.weatherAutoSuggest !== false ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Energy threshold */}
      <div className="surface-elevated p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">{t('settings.energyThreshold')}</div>
            <div className="text-[11px] text-muted-foreground">{t('settings.energyThresholdDesc')}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {ENERGY_PRESETS.map((preset) => (
            <button
              key={preset.key}
              onClick={() => applyPreset(preset.key)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                presetKey === preset.key ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {t(preset.labelKey as any)}
            </button>
          ))}
        </div>
        {presetKey === 'custom' && (
          <div className="flex items-center gap-2 pt-1">
            <label htmlFor="custom-threshold" className="text-[11px] text-muted-foreground">
              {t('settings.energyThresholdCustomLabel')}
            </label>
            <input
              id="custom-threshold"
              type="number"
              min={0.1}
              step={0.1}
              value={customJ}
              onChange={(e) => applyCustom(e.target.value)}
              className="w-24 px-2 py-1 rounded-md bg-muted/40 border border-border text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-[11px] text-muted-foreground">J</span>
          </div>
        )}
      </div>
    </div>
  );
}
