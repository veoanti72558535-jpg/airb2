import React from 'react';
import { Gauge, Ruler } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getSettings, saveSettings } from '@/lib/storage';
import { useAuth } from '@/lib/auth-context';
import { savePreferenceToSupabase, markLocalUpdated } from '@/lib/preferences-sync';
import { useUnits } from '@/hooks/use-units';
import { unitCategories } from '@/lib/units';
import { cn } from '@/lib/utils';

/**
 * Hub Réglages — onglet "Unités" :
 * système global métrique/impérial + préférences fines par catégorie.
 */
export function UnitsPanel() {
  const { t, locale } = useI18n();
  const settings = getSettings();
  const { user } = useAuth();
  const { prefs, setUnitPref } = useUnits();
  const [, force] = React.useReducer((x: number) => x + 1, 0);

  const toggleUnits = () => {
    const newSystem = settings.unitSystem === 'metric' ? 'imperial' : 'metric';
    saveSettings({ ...settings, unitSystem: newSystem });
    markLocalUpdated();
    if (user) savePreferenceToSupabase(user.id, 'unit_system', newSystem).catch(() => {});
    force();
  };

  return (
    <div className="space-y-3">
      <div className="surface-elevated p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gauge className="h-4 w-4 text-primary" />
            <div className="text-sm font-medium">{t('settings.unitSystem')}</div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => settings.unitSystem !== 'metric' && toggleUnits()}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium',
                settings.unitSystem === 'metric' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {t('common.metric')}
            </button>
            <button
              onClick={() => settings.unitSystem !== 'imperial' && toggleUnits()}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium',
                settings.unitSystem === 'imperial' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {t('common.imperial')}
            </button>
          </div>
        </div>
      </div>

      <div className="surface-elevated p-4 space-y-3">
        <div className="flex items-center gap-3 mb-1">
          <Ruler className="h-4 w-4 text-primary" />
          <div>
            <div className="text-sm font-medium">{t('settings.unitPrefs')}</div>
            <div className="text-[11px] text-muted-foreground">{t('settings.unitPrefsDesc')}</div>
          </div>
        </div>
        <div className="space-y-2">
          {unitCategories.map((cat) => {
            const currentVal = prefs[cat.key] ?? (settings.unitSystem === 'metric' ? cat.defaultMetric : cat.defaultImperial);
            return (
              <div key={cat.key} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                <span className="text-xs text-muted-foreground">{locale === 'fr' ? cat.labelKeyFr : cat.labelKeyEn}</span>
                <div className="flex gap-1">
                  {cat.options.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setUnitPref(cat.key, opt.value)}
                      className={cn(
                        'px-2.5 py-1 rounded text-xs font-mono transition-colors',
                        currentVal === opt.value ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-muted',
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
    </div>
  );
}
