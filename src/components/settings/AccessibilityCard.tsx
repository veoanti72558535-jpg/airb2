import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, Type, Contrast, CheckCircle2, AlertTriangle, XCircle, Sparkles, Focus, Keyboard, ArrowRight, ArrowLeft, LogOut, Zap, Target } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useA11y } from '@/lib/a11y';
import { cn } from '@/lib/utils';
import { moreFlat } from '@/components/sidebar/more-nav';

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
    sidebarFocusBehavior,
    keyboardNavMode,
    reduceMotion,
    strongFocus,
    setHighContrast,
    setLargeText,
    setPremiumContrast,
    setSidebarFocusBehavior,
    setKeyboardNavMode,
    setReduceMotion,
    setStrongFocus,
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

  // Segmented-control variant: same focus contract as toggleClass but the
  // active branch carries a slightly stronger tint to read as "selected"
  // within a 2-option group rather than a binary on/off.
  const segmentClass = (active: boolean) =>
    cn(
      'px-3 py-1 rounded-md text-xs font-medium transition-colors',
      'outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card',
      active
        ? 'bg-primary/15 text-primary ring-1 ring-inset ring-primary/20'
        : 'text-muted-foreground hover:bg-muted'
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

        {/* Sidebar focus behaviour — segmented control. */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Focus className="h-4 w-4 text-primary/80 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium">{t('settings.a11y.sidebarFocus' as any)}</div>
              <div className="text-[11px] text-muted-foreground">{t('settings.a11y.sidebarFocusDesc' as any)}</div>
            </div>
          </div>
          <div
            role="radiogroup"
            aria-label={t('settings.a11y.sidebarFocus' as any)}
            className="inline-flex items-center gap-1 p-0.5 rounded-md bg-muted/40"
          >
            <button
              type="button"
              role="radio"
              aria-checked={sidebarFocusBehavior === 'first'}
              onClick={() => setSidebarFocusBehavior('first')}
              className={segmentClass(sidebarFocusBehavior === 'first')}
            >
              {t('settings.a11y.sidebarFocus.first' as any)}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={sidebarFocusBehavior === 'active'}
              onClick={() => setSidebarFocusBehavior('active')}
              className={segmentClass(sidebarFocusBehavior === 'active')}
            >
              {t('settings.a11y.sidebarFocus.active' as any)}
            </button>
          </div>
        </div>

        {/* Keyboard navigation mode — segmented control. */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Keyboard className="h-4 w-4 text-primary/80 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium">{t('settings.a11y.keyboardNav' as any)}</div>
              <div className="text-[11px] text-muted-foreground">{t('settings.a11y.keyboardNavDesc' as any)}</div>
            </div>
          </div>
          <div
            role="radiogroup"
            aria-label={t('settings.a11y.keyboardNav' as any)}
            className="inline-flex items-center gap-1 p-0.5 rounded-md bg-muted/40"
          >
            <button
              type="button"
              role="radio"
              aria-checked={keyboardNavMode === 'normal'}
              onClick={() => setKeyboardNavMode('normal')}
              className={segmentClass(keyboardNavMode === 'normal')}
            >
              {t('settings.a11y.keyboardNav.normal' as any)}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={keyboardNavMode === 'cyclic'}
              onClick={() => setKeyboardNavMode('cyclic')}
              className={segmentClass(keyboardNavMode === 'cyclic')}
            >
              {t('settings.a11y.keyboardNav.cyclic' as any)}
            </button>
          </div>
        </div>

        {/*
          Explainer + live preview for the active keyboard-nav mode.
          Re-uses the muted surface tokens so it sits below the segmented
          control without competing visually. `aria-live="polite"` lets AT
          users hear the new behaviour after toggling without stealing
          focus.
        */}
        <div
          aria-live="polite"
          className="ml-7 rounded-md border border-border/40 bg-muted/20 p-3 space-y-2"
        >
          <p className="text-[11px] text-muted-foreground">
            {keyboardNavMode === 'cyclic'
              ? t('settings.a11y.keyboardNav.cyclicHint' as any)
              : t('settings.a11y.keyboardNav.normalHint' as any)}
          </p>
          <div className="pt-1 border-t border-border/30">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">
              {t('settings.a11y.keyboardNav.previewTitle' as any)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {keyboardNavMode === 'cyclic'
                ? t('settings.a11y.keyboardNav.previewCyclic' as any)
                : t('settings.a11y.keyboardNav.previewNormal' as any)}
            </p>
            <KeyboardNavSimulator mode={keyboardNavMode} />
          </div>
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

/**
 * Mini "More panel" simulator embedded in the AccessibilityCard preview.
 *
 * Renders the EXACT ordered list of items from the real More panel
 * (sourced from `@/components/sidebar/more-nav`) as focusable buttons,
 * plus a "sentinel" element OUTSIDE the simulated panel so the user can
 * see whether Tab leaves the list or wraps inside it.
 *
 * Behaviour matches the real Layout focus trap on the More panel:
 *  • cyclic mode → Tab from last → first; Shift+Tab from first → last
 *                  (the sentinel is unreachable from inside the list).
 *  • normal mode → Tab from last → sentinel (mirrors browser default,
 *                  i.e. focus is allowed to leave).
 * Arrow keys (↑/↓) always cycle within the list — that's the menu
 * pattern used in the real panel regardless of the user preference.
 */
function KeyboardNavSimulator({ mode }: { mode: 'normal' | 'cyclic' }) {
  const { t } = useI18n();
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const sentinelRef = useRef<HTMLButtonElement | null>(null);
  const [status, setStatus] = useState<string>('');
  const [activeIdx, setActiveIdx] = useState<number>(-1);

  // Stable ordered list of items — same source-of-truth as the real panel.
  const items = moreFlat;

  const focusIdx = useCallback((i: number) => {
    const el = itemRefs.current[i];
    if (el) {
      el.focus();
      setActiveIdx(i);
    }
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
      const last = items.length - 1;
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (idx === 0) {
            if (mode === 'cyclic') {
              e.preventDefault();
              focusIdx(last);
              setStatus(t('settings.a11y.keyboardNav.simWrappedBack' as any));
            } else {
              // Let the browser move focus naturally → out of the list.
              setStatus(t('settings.a11y.keyboardNav.simExited' as any));
            }
          } else {
            e.preventDefault();
            focusIdx(idx - 1);
            setStatus('');
          }
        } else {
          if (idx === last) {
            if (mode === 'cyclic') {
              e.preventDefault();
              focusIdx(0);
              setStatus(t('settings.a11y.keyboardNav.simWrapped' as any));
            } else {
              setStatus(t('settings.a11y.keyboardNav.simExited' as any));
            }
          } else {
            e.preventDefault();
            focusIdx(idx + 1);
            setStatus('');
          }
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        focusIdx(idx === last ? 0 : idx + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        focusIdx(idx <= 0 ? last : idx - 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        focusIdx(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        focusIdx(last);
      }
    },
    [focusIdx, items.length, mode, t],
  );

  const reset = () => {
    setActiveIdx(-1);
    setStatus('');
    itemRefs.current[0]?.blur();
  };

  // Reset transient status when mode changes so the announcer doesn't
  // contradict the newly-selected behaviour.
  useEffect(() => {
    setStatus('');
  }, [mode]);

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          {t('settings.a11y.keyboardNav.simTitle' as any)}
        </div>
        <button
          type="button"
          onClick={reset}
          className="px-2 py-0.5 rounded text-[10px] font-medium text-muted-foreground hover:bg-muted/40 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card"
        >
          {t('settings.a11y.keyboardNav.simReset' as any)}
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground/80">
        {t('settings.a11y.keyboardNav.simHint' as any)}
      </p>

      <div
        role="group"
        aria-label={t('settings.a11y.keyboardNav.simTitle' as any)}
        className="rounded-md border border-border/40 bg-card/40 p-1.5 max-h-44 overflow-y-auto"
      >
        <ul className="space-y-0.5">
          {items.map((item, idx) => {
            const Icon = item.icon;
            const isActive = idx === activeIdx;
            return (
              <li key={item.path}>
                <button
                  type="button"
                  ref={(el) => { itemRefs.current[idx] = el; }}
                  onKeyDown={(e) => onKeyDown(e, idx)}
                  onFocus={() => setActiveIdx(idx)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1 rounded text-[11px] text-left',
                    'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card',
                    isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/40',
                  )}
                >
                  <span className="text-[9px] font-mono w-4 text-muted-foreground/60 shrink-0">
                    {idx + 1}
                  </span>
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{t(item.labelKey)}</span>
                  {idx === 0 && (
                    <ArrowLeft className="h-3 w-3 ml-auto opacity-40" aria-hidden />
                  )}
                  {idx === items.length - 1 && (
                    mode === 'cyclic'
                      ? <ArrowRight className="h-3 w-3 ml-auto opacity-40" aria-hidden />
                      : <LogOut className="h-3 w-3 ml-auto opacity-40" aria-hidden />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Sentinel: lives OUTSIDE the simulated panel. In normal mode, Tab
          from the last item should land here (proving focus left). In
          cyclic mode it should never receive focus from inside. */}
      <button
        type="button"
        ref={sentinelRef}
        className="w-full text-[10px] text-muted-foreground/70 italic px-2 py-1 rounded border border-dashed border-border/40 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card focus-visible:not-italic focus-visible:text-foreground"
      >
        ⤵ {t('settings.a11y.keyboardNav.simExited' as any)}
      </button>

      <p className="text-[11px] text-muted-foreground min-h-[1em]" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}