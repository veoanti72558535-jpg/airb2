import React from 'react';
import { Settings, Globe, Sun, Moon, Monitor, Gauge, ToggleLeft, Cloud, Bot } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { getSettings, saveSettings } from '@/lib/storage';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const settings = getSettings();

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
              <div>
                <div className="text-sm font-medium">{t('settings.language')}</div>
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setLocale('fr')}
                className={cn('px-3 py-1 rounded-md text-xs font-medium', locale === 'fr' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}
              >
                FR
              </button>
              <button
                onClick={() => setLocale('en')}
                className={cn('px-3 py-1 rounded-md text-xs font-medium', locale === 'en' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}
              >
                EN
              </button>
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
              <button
                onClick={() => theme !== 'dark' && toggleTheme()}
                className={cn('px-3 py-1 rounded-md text-xs font-medium', theme === 'dark' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}
              >
                {t('common.dark')}
              </button>
              <button
                onClick={() => theme !== 'light' && toggleTheme()}
                className={cn('px-3 py-1 rounded-md text-xs font-medium', theme === 'light' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}
              >
                {t('common.light')}
              </button>
            </div>
          </div>
        </div>

        {/* Units */}
        <div className="surface-elevated p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Gauge className="h-4 w-4 text-primary" />
              <div className="text-sm font-medium">{t('settings.units')}</div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => settings.unitSystem !== 'metric' && toggleUnits()}
                className={cn('px-3 py-1 rounded-md text-xs font-medium', settings.unitSystem === 'metric' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}
              >
                {t('common.metric')}
              </button>
              <button
                onClick={() => settings.unitSystem !== 'imperial' && toggleUnits()}
                className={cn('px-3 py-1 rounded-md text-xs font-medium', settings.unitSystem === 'imperial' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}
              >
                {t('common.imperial')}
              </button>
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
              <button
                onClick={() => settings.advancedMode && toggleAdvanced()}
                className={cn('px-3 py-1 rounded-md text-xs font-medium', !settings.advancedMode ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}
              >
                {t('common.simpleMode')}
              </button>
              <button
                onClick={() => !settings.advancedMode && toggleAdvanced()}
                className={cn('px-3 py-1 rounded-md text-xs font-medium', settings.advancedMode ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}
              >
                {t('common.advancedMode')}
              </button>
            </div>
          </div>
        </div>

        {/* Weather - disabled placeholder */}
        <div className="surface-elevated p-4 opacity-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cloud className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">{t('settings.weather')}</div>
                <div className="text-[11px] text-muted-foreground">{t('settings.weatherDesc')}</div>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">{t('settings.comingSoon')}</span>
          </div>
        </div>

        {/* AI - disabled placeholder */}
        <div className="surface-elevated p-4 opacity-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bot className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">{t('settings.ai')}</div>
                <div className="text-[11px] text-muted-foreground">{t('settings.aiDesc')}</div>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">{t('settings.comingSoon')}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
