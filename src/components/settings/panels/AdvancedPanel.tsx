import React from 'react';
import { Target, Palette, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { getSettings, saveSettings } from '@/lib/storage';
import { markLocalUpdated } from '@/lib/preferences-sync';
import { ThemePicker } from '@/components/settings/ThemePicker';
import { AccessibilityCard } from '@/components/settings/AccessibilityCard';
import { SecurityAuditCard } from '@/components/settings/SecurityAuditCard';
import { cn } from '@/lib/utils';
import { useThemeFlags } from '@/lib/admin/useThemeFlags';

/**
 * Hub Réglages — onglet "Affichage & Avancé" :
 * thème visuel + feature flags (BC truing, etc.).
 */
export function AdvancedPanel() {
  const { t } = useI18n();
  const settings = getSettings();
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  const { flags } = useThemeFlags();

  return (
    <div className="space-y-3">
      <div className="surface-elevated p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Palette className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium">{t('settings.theme')}</div>
              <div className="text-[11px] text-muted-foreground">
                {t('settings.themeSubtitle' as any)}
              </div>
            </div>
          </div>
          {flags.studioRouteEnabled && (
          <Link
            to="/theme"
            className={cn(
              'inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium',
              'bg-primary/10 text-primary hover:bg-primary/20 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            {t('themeStudio.open' as any)}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
          )}
        </div>
        {/* Quick picker stays available for users who don't need the full studio. */}
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

      <SecurityAuditCard />
      <AccessibilityCard />
    </div>
  );
}
