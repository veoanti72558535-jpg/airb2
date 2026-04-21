import React, { useState } from 'react';
import { Settings, Globe, Sun, Moon, Gauge, ToggleLeft, Cloud, Bot, Ruler, Zap, Shield } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { getSettings, saveSettings } from '@/lib/storage';
import { useUnits } from '@/hooks/use-units';
import { unitCategories } from '@/lib/units';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { isSupabaseConfigured } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

/** Preset thresholds (J) — covers the most common airgun regulations. */
const ENERGY_PRESETS: { key: string; value: number | null; labelKey: string }[] = [
  { key: 'off', value: null, labelKey: 'settings.energyThresholdOff' },
  { key: 'fr', value: 7.5, labelKey: 'settings.energyThresholdFr' },
  { key: 'uk', value: 16.27, labelKey: 'settings.energyThresholdUk' },
  { key: 'custom', value: -1, labelKey: 'settings.energyThresholdCustom' },
];

export default function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const settings = getSettings();
  const { prefs, setUnitPref } = useUnits();
  const navigate = useNavigate();

  // Identify which preset matches the stored value (null/7.5/16.27 → preset; anything else → custom).
  const currentThreshold = settings.energyThresholdJ === undefined ? 16.27 : settings.energyThresholdJ;
  const matchedPreset = ENERGY_PRESETS.find(p => p.value === currentThreshold);
  const initialPresetKey = matchedPreset ? matchedPreset.key : 'custom';
  const [presetKey, setPresetKey] = useState<string>(initialPresetKey);
  const [customJ, setCustomJ] = useState<string>(
    initialPresetKey === 'custom' && currentThreshold !== null ? String(currentThreshold) : '12'
  );

  const applyEnergyPreset = (key: string) => {
    setPresetKey(key);
    if (key === 'custom') {
      const parsed = parseFloat(customJ);
      saveSettings({ ...settings, energyThresholdJ: Number.isFinite(parsed) && parsed > 0 ? parsed : 12 });
    } else {
      const preset = ENERGY_PRESETS.find(p => p.key === key);
      if (preset) saveSettings({ ...settings, energyThresholdJ: preset.value });
    }
  };

  const applyCustomValue = (raw: string) => {
    setCustomJ(raw);
    const parsed = parseFloat(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      saveSettings({ ...settings, energyThresholdJ: parsed });
    }
  };

  const toggleAdvanced = () => {
    saveSettings({ ...settings, advancedMode: !settings.advancedMode });
    window.location.reload();
  };

  const toggleUnits = () => {
    saveSettings({ ...settings, unitSystem: settings.unitSystem === 'metric' ? 'imperial' : 'metric' });
    window.location.reload();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-heading font-bold">{t('settings.title')}</h1>
      </div>

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

        {/* Theme */}
        <div className="surface-elevated p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />}
              <div className="text-sm font-medium">{t('settings.theme')}</div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => theme !== 'dark' && toggleTheme()} className={cn('px-3 py-1 rounded-md text-xs font-medium', theme === 'dark' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}>{t('common.dark')}</button>
              <button onClick={() => theme !== 'light' && toggleTheme()} className={cn('px-3 py-1 rounded-md text-xs font-medium', theme === 'light' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}>{t('common.light')}</button>
            </div>
          </div>
        </div>

        {/* Unit system quick toggle */}
        <div className="surface-elevated p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Gauge className="h-4 w-4 text-primary" />
              <div className="text-sm font-medium">{t('settings.unitSystem')}</div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => settings.unitSystem !== 'metric' && toggleUnits()} className={cn('px-3 py-1 rounded-md text-xs font-medium', settings.unitSystem === 'metric' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}>{t('common.metric')}</button>
              <button onClick={() => settings.unitSystem !== 'imperial' && toggleUnits()} className={cn('px-3 py-1 rounded-md text-xs font-medium', settings.unitSystem === 'imperial' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}>{t('common.imperial')}</button>
            </div>
          </div>
        </div>

        {/* Per-category unit preferences */}
        <div className="surface-elevated p-4 space-y-3">
          <div className="flex items-center gap-3 mb-1">
            <Ruler className="h-4 w-4 text-primary" />
            <div>
              <div className="text-sm font-medium">{t('settings.unitPrefs')}</div>
              <div className="text-[11px] text-muted-foreground">{t('settings.unitPrefsDesc')}</div>
            </div>
          </div>
          <div className="space-y-2">
            {unitCategories.map(cat => {
              const currentVal = prefs[cat.key] ?? (settings.unitSystem === 'metric' ? cat.defaultMetric : cat.defaultImperial);
              return (
                <div key={cat.key} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-xs text-muted-foreground">{locale === 'fr' ? cat.labelKeyFr : cat.labelKeyEn}</span>
                  <div className="flex gap-1">
                    {cat.options.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setUnitPref(cat.key, opt.value)}
                        className={cn(
                          'px-2.5 py-1 rounded text-xs font-mono transition-colors',
                          currentVal === opt.value ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-muted'
                        )}
                      >
                        {opt.symbol}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
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
              onClick={() => {
                saveSettings({ ...settings, weatherAutoSuggest: !(settings.weatherAutoSuggest !== false) });
                window.location.reload();
              }}
              className={cn('px-3 py-1 rounded-md text-xs font-medium', settings.weatherAutoSuggest !== false ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}
            >
              {settings.weatherAutoSuggest !== false ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Energy threshold (FAC / FR / custom / off) */}
        <div className="surface-elevated p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{t('settings.energyThreshold')}</div>
              <div className="text-[11px] text-muted-foreground">{t('settings.energyThresholdDesc')}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {ENERGY_PRESETS.map(preset => (
              <button
                key={preset.key}
                onClick={() => applyEnergyPreset(preset.key)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                  presetKey === preset.key
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted'
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
                onChange={e => applyCustomValue(e.target.value)}
                className="w-24 px-2 py-1 rounded-md bg-muted/40 border border-border text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-[11px] text-muted-foreground">J</span>
            </div>
          )}
        </div>

        {/* AI — état conditionnel */}
        <div className="surface-elevated p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bot className="h-4 w-4 text-primary" />
              <div>
                <div className="text-sm font-medium">{t('settings.ai')}</div>
                <div className="text-[11px] text-muted-foreground">{t('settings.aiDesc')}</div>
              </div>
            </div>
            {isSupabaseConfigured() ? (
              <button
                onClick={() => navigate('/admin/ai')}
                className="px-3 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1"
              >
                <Shield className="h-3 w-3" />
                {t('settings.aiConfigure')}
              </button>
            ) : (
              <span className="text-xs text-muted-foreground italic">{t('settings.aiRequiresSupabase')}</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
