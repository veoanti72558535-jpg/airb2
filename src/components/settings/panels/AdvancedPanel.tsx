import React from 'react';
import { Target, Palette } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getSettings, saveSettings } from '@/lib/storage';
import { markLocalUpdated } from '@/lib/preferences-sync';
import { ThemePicker } from '@/components/settings/ThemePicker';
import { cn } from '@/lib/utils';

/**
 * Hub Réglages — onglet "Affichage & Avancé" :
 * thème visuel + feature flags (BC truing, etc.).
 */
export function AdvancedPanel() {
  const { t } = useI18n();
  const settings = getSettings();
  const [, force] = React.useReducer((x: number) => x + 1, 0);

  return (
    <div className="space-y-3">
      <div className="surface-elevated p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Palette className="h-4 w-4 text-primary" />
          <div>
            <div className="text-sm font-medium">{t('settings.theme')}</div>
            <div className="text-[11px] text-muted-foreground">{t('settings.themeSubtitle' as any)}</div>
          </div>
        </div>
        <ThemePicker />
      </div>

      <div className="surface-elevated p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Target className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium">{t('settings.featureTruing')}</div>
              <div className="text-[11px] text-muted-foreground">{t('settings.featureTruingDesc')}</div>
            </div>
          </div>
          <button
            onClick={() => {
              const current = settings.featureFlags.truing !== false;
              saveSettings({ ...settings, featureFlags: { ...settings.featureFlags, truing: !current } });
              markLocalUpdated();
              force();
            }}
            className={cn(
              'px-3 py-1 rounded-md text-xs font-medium',
              settings.featureFlags.truing !== false ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {settings.featureFlags.truing !== false ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
    </div>
  );
}
