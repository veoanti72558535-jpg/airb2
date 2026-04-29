import React from 'react';
import { Check } from 'lucide-react';
import { useTheme, THEMES } from '@/lib/theme';
import { THEME_FAMILIES, getFamilyVariant } from '@/lib/theme-constants';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function ThemePicker() {
  const { theme, setTheme, isDark } = useTheme();
  const { locale } = useI18n();
  const mode = isDark ? 'dark' : 'light';
  const activeFamily = THEMES.find((t) => t.id === theme)?.family ?? 'carbon-green';
  const cards = THEME_FAMILIES.map(
    (family) =>
      THEMES.find((t) => t.family === family && t.mode === mode) ??
      THEMES.find((t) => t.family === family)!,
  );

  return (
    <div className="grid grid-cols-2 gap-2">
      {cards.map((t) => {
        const selected = activeFamily === t.family;
        const label = locale === 'fr' ? t.labelFR : t.labelEN;
        return (
          <button
            key={t.id}
            onClick={() => setTheme(getFamilyVariant(t.id, mode))}
            className={cn(
              'relative flex flex-col items-start gap-1.5 p-3 rounded-lg border-2 transition-all duration-200 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              selected
                ? 'border-primary bg-primary/10 shadow-sm shadow-primary/10'
                : 'border-border hover:border-muted-foreground/50 bg-card'
            )}
            aria-pressed={selected}
          >
            {/* Mini preview */}
            <div
              className="w-full h-8 rounded-md flex items-center justify-center gap-1 border border-border/50"
              style={{ backgroundColor: t.bgColor }}
            >
              <div className="w-6 h-2 rounded-sm" style={{ backgroundColor: t.accentColor }} />
              <div className="w-4 h-2 rounded-sm" style={{ backgroundColor: t.accentColor, opacity: 0.4 }} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-foreground">{label}</span>
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