import React from 'react';
import { Check } from 'lucide-react';
import { useTheme, THEMES, ThemeId } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const { locale } = useI18n();

  return (
    <div className="grid grid-cols-2 gap-2">
      {THEMES.map(t => {
        const selected = theme === t.id;
        const label = locale === 'fr' ? t.labelFR : t.labelEN;
        return (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={cn(
              'relative flex flex-col items-start gap-1.5 p-3 rounded-lg border-2 transition-all duration-200 text-left',
              selected
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-muted-foreground/30 bg-card'
            )}
          >
            {/* Mini preview */}
            <div
              className="w-full h-8 rounded-md flex items-center justify-center gap-1 border border-border/30"
              style={{ backgroundColor: t.bgColor }}
            >
              <div className="w-6 h-2 rounded-sm" style={{ backgroundColor: t.accentColor }} />
              <div className="w-4 h-2 rounded-sm" style={{ backgroundColor: t.accentColor, opacity: 0.4 }} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-foreground">{label}</span>
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded font-medium',
                t.isDark ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
              )}>
                {t.isDark ? (locale === 'fr' ? 'Sombre' : 'Dark') : (locale === 'fr' ? 'Clair' : 'Light')}
              </span>
            </div>
            {selected && (
              <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-2.5 w-2.5 text-primary-foreground" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}