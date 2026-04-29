import React, { useMemo, useState } from 'react';
import { Eye, Type, Contrast, CheckCircle2, AlertTriangle, XCircle, Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useA11y } from '@/lib/a11y';
import { cn } from '@/lib/utils';

/**
 * Settings → Accessibility card.
 *
 * Two persisted toggles:
 *  • High contrast — boosts muted-foreground/border tokens via `.hc` on <html>
 *  • Large text    — bumps base font-size via `.lg-text` on <html>
 *
 * Plus a tiny contrast verifier that previews the most common label
 * combinations (text-foreground, text-muted-foreground, bg-primary…) and
 * surfaces the computed WCAG AA / AAA verdict using browser-resolved colors.
 */

function srgbToLin(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function relLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map(srgbToLin) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const la = relLuminance(a);
  const lb = relLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
function parseRgb(str: string): [number, number, number] | null {
  // Matches "rgb(12, 34, 56)" or "rgba(12, 34, 56, 0.8)"
  const m = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}
function resolveColor(varClass: 'text' | 'bg', token: string): [number, number, number] | null {
  const probe = document.createElement('span');
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.className = `${varClass}-${token}`;
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const value = varClass === 'text' ? cs.color : cs.backgroundColor;
  document.body.removeChild(probe);
  return parseRgb(value);
}

type Pair = { id: string; labelKey: string; fg: string; bg: string };
const PAIRS: Pair[] = [
  { id: 'fg-on-bg',     labelKey: 'settings.a11y.pair.fgOnBg',     fg: 'foreground',        bg: 'background' },
  { id: 'muted-on-bg',  labelKey: 'settings.a11y.pair.mutedOnBg',  fg: 'muted-foreground',  bg: 'background' },
  { id: 'fg-on-card',   labelKey: 'settings.a11y.pair.fgOnCard',   fg: 'foreground',        bg: 'card' },
  { id: 'muted-on-card',labelKey: 'settings.a11y.pair.mutedOnCard',fg: 'muted-foreground',  bg: 'card' },
  { id: 'primary-on-bg',labelKey: 'settings.a11y.pair.primaryOnBg',fg: 'primary',           bg: 'background' },
];

function verdict(ratio: number): 'AAA' | 'AA' | 'fail' {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  return 'fail';
}

export function AccessibilityCard() {
  const { t } = useI18n();
  const {
    highContrast,
    largeText,
    premiumContrast,
    setHighContrast,
    setLargeText,
    setPremiumContrast,
  } = useA11y();
  const [results, setResults] = useState<{ id: string; ratio: number; verdict: 'AAA' | 'AA' | 'fail' }[] | null>(null);

  const runCheck = () => {
    const out = PAIRS.map((p) => {
      const fg = resolveColor('text', p.fg);
      const bg = resolveColor('bg', p.bg);
      const ratio = fg && bg ? contrastRatio(fg, bg) : 0;
      return { id: p.id, ratio, verdict: verdict(ratio) };
    });
    setResults(out);
  };

  const toggleClass = (active: boolean) =>
    cn(
      'px-3 py-1 rounded-md text-xs font-medium transition-colors',
      'outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card',
      active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
    );

  const verdictMeta = useMemo(() => ({
    AAA:  { icon: CheckCircle2,  cls: 'text-emerald-500' },
    AA:   { icon: CheckCircle2,  cls: 'text-amber-500' },
    fail: { icon: XCircle,       cls: 'text-destructive' },
  } as const), []);

  return (
    <div className="surface-elevated p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Eye className="h-4 w-4 text-primary shrink-0" />
        <div>
          <div className="text-sm font-medium">{t('settings.a11y.title' as any)}</div>
          <div className="text-[11px] text-muted-foreground">{t('settings.a11y.subtitle' as any)}</div>
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Sparkles className="h-4 w-4 text-primary/80 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium">{t('settings.a11y.premiumContrast' as any)}</div>
              <div className="text-[11px] text-muted-foreground">{t('settings.a11y.premiumContrastDesc' as any)}</div>
            </div>
          </div>
          <button
            onClick={() => setPremiumContrast(!premiumContrast)}
            className={toggleClass(premiumContrast)}
            aria-pressed={premiumContrast}
          >
            {premiumContrast ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Contrast className="h-4 w-4 text-primary/80 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium">{t('settings.a11y.highContrast' as any)}</div>
              <div className="text-[11px] text-muted-foreground">{t('settings.a11y.highContrastDesc' as any)}</div>
            </div>
          </div>
          <button
            onClick={() => setHighContrast(!highContrast)}
            className={toggleClass(highContrast)}
            aria-pressed={highContrast}
          >
            {highContrast ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Type className="h-4 w-4 text-primary/80 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium">{t('settings.a11y.largeText' as any)}</div>
              <div className="text-[11px] text-muted-foreground">{t('settings.a11y.largeTextDesc' as any)}</div>
            </div>
          </div>
          <button
            onClick={() => setLargeText(!largeText)}
            className={toggleClass(largeText)}
            aria-pressed={largeText}
          >
            {largeText ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Contrast checker */}
      <div className="space-y-2 pt-2 border-t border-border/40">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {t('settings.a11y.checkerTitle' as any)}
          </div>
          <button
            onClick={runCheck}
            className="px-3 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/15 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            {t('settings.a11y.runCheck' as any)}
          </button>
        </div>
        {results ? (
          <ul className="space-y-1">
            {results.map((r) => {
              const meta = verdictMeta[r.verdict];
              const Icon = meta.icon;
              const labelKey = PAIRS.find((p) => p.id === r.id)!.labelKey;
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-md hover:bg-muted/30">
                  <div className="text-xs">{t(labelKey as any)}</div>
                  <div className={cn('inline-flex items-center gap-1.5 text-[11px] font-medium', meta.cls)}>
                    <span className="font-mono">{r.ratio.toFixed(2)}:1</span>
                    <Icon className="h-3.5 w-3.5" />
                    <span>{r.verdict === 'fail' ? t('settings.a11y.fail' as any) : r.verdict}</span>
                  </div>
                </li>
              );
            })}
            <li className="text-[10px] text-muted-foreground/70 pt-1">
              {t('settings.a11y.legend' as any)}
            </li>
          </ul>
        ) : (
          <p className="text-[11px] text-muted-foreground italic">
            {t('settings.a11y.noCheck' as any)}
          </p>
        )}
      </div>
    </div>
  );
}