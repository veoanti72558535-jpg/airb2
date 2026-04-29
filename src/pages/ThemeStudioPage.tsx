import React, { useState, useMemo, useCallback } from 'react';
import {
  Palette,
  Check,
  RotateCcw,
  Sliders,
  Eye,
  Type,
  Square,
  ChevronLeft,
  Sparkles,
  Sun,
  Moon,
  Contrast,
  LayoutGrid,
  Shuffle,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
  THEMES,
  ACCENT_PRESETS,
  FONT_SCALE_BOUNDS,
  type ThemeId,
  type ThemeDensity,
  type ThemeContrast,
  type ThemeRadius,
  type ThemeFontFamily,
  type ThemeFamily,
  type ThemeMode,
  type ThemeMeta,
  THEME_FAMILIES,
  getFamilyVariant,
  THEME_MODE_STORAGE_KEY,
} from '@/lib/theme-constants';

/**
 * Theme Studio — mobile-first theme selection screen.
 *
 * Two modes:
 *   • Simple   → just the four base themes, big swatch cards.
 *   • Avancé   → mini-mockup preview + accent picker + density, font
 *                scale, contrast, and radius controls.
 *
 * Layout is mobile-first (single column, large tap targets, stacked
 * controls). Above `sm` we widen to 2 columns where it makes sense.
 */

type StudioMode = 'simple' | 'advanced';

function readMode(): StudioMode {
  const v = localStorage.getItem(THEME_MODE_STORAGE_KEY);
  return v === 'advanced' ? 'advanced' : 'simple';
}

export default function ThemeStudioPage() {
  const { locale, t } = useI18n();
  const { theme, setTheme, isDark, custom, updateCustom, resetCustom, toggleTheme } = useTheme();
  const [mode, setMode] = useState<StudioMode>(() => readMode());

  const setStudioMode = useCallback((m: StudioMode) => {
    setMode(m);
    try {
      localStorage.setItem(THEME_MODE_STORAGE_KEY, m);
    } catch {
      /* ignore storage errors */
    }
  }, []);

  const isFR = locale === 'fr';
  const tx = (fr: string, en: string) => (isFR ? fr : en);

  // Resolve current family for the grid → we render one card per family,
  // and pressing a card swaps to that family's variant in the active mode.
  const activeMode: ThemeMode = isDark ? 'dark' : 'light';
  const familyCards = useMemo(
    () =>
      THEME_FAMILIES.map((family) => {
        // Show the variant matching the user's current dark/light mode.
        const meta =
          THEMES.find((t) => t.family === family && t.mode === activeMode) ??
          THEMES.find((t) => t.family === family)!;
        return meta;
      }),
    [activeMode],
  );
  const activeFamily: ThemeFamily =
    THEMES.find((t) => t.id === theme)?.family ?? 'carbon-green';

  const handlePickFamily = (meta: ThemeMeta) => {
    setTheme(getFamilyVariant(meta.id, activeMode));
  };

  const pickRandomFamily = useCallback(() => {
    // Random *different* family for satisfying tactile feedback.
    const others = THEME_FAMILIES.filter((f) => f !== activeFamily);
    const next = others[Math.floor(Math.random() * others.length)];
    const meta =
      THEMES.find((t) => t.family === next && t.mode === activeMode) ??
      THEMES.find((t) => t.family === next)!;
    setTheme(meta.id);
  }, [activeFamily, activeMode, setTheme]);

  return (
    <main className="mx-auto w-full max-w-2xl px-3 py-4 sm:px-4 sm:py-6 space-y-4">
      <ThemeStudioHeader
        mode={mode}
        onModeChange={setStudioMode}
        onReset={resetCustom}
        isDark={isDark}
        onToggleMode={toggleTheme}
        onShuffle={pickRandomFamily}
        tx={tx}
      />

      {/* Theme grid (mobile-first: 1 col phone, 2 cols ≥ sm) */}
      <section
        aria-label={tx('Choix du thème', 'Theme choice')}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        {familyCards.map((meta) => (
          <ThemeCard
            key={meta.id}
            meta={meta}
            selected={activeFamily === meta.family}
            mode={mode}
            isFR={isFR}
            onPick={() => handlePickFamily(meta)}
          />
        ))}
      </section>

      {/* Advanced controls only visible in Avancé mode. */}
      {mode === 'advanced' && (
        <AdvancedControls
          isDark={isDark}
          custom={custom}
          updateCustom={updateCustom}
          tx={tx}
        />
      )}

      <p className="text-[11px] text-muted-foreground text-center pt-2">
        {tx(
          'Vos préférences sont sauvegardées localement et appliquées immédiatement.',
          'Your preferences are saved locally and applied immediately.',
        )}
      </p>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────────────────

function ThemeStudioHeader({
  mode,
  onModeChange,
  onReset,
  isDark,
  onToggleMode,
  onShuffle,
  tx,
}: {
  mode: StudioMode;
  onModeChange: (m: StudioMode) => void;
  onReset: () => void;
  isDark: boolean;
  onToggleMode: () => void;
  onShuffle: () => void;
  tx: (fr: string, en: string) => string;
}) {
  return (
    <header className="space-y-3">
      <div className="flex items-center gap-2">
        <Link
          to="/settings"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={tx('Retour aux réglages', 'Back to settings')}
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2 flex-1">
          <Palette className="h-5 w-5 text-primary" aria-hidden="true" />
          <h1 className="text-lg font-semibold leading-tight">
            {tx('Studio de thèmes', 'Theme Studio')}
          </h1>
        </div>
        {/* Shuffle — picks a random family for quick exploration. */}
        <button
          type="button"
          onClick={onShuffle}
          className={cn(
            'inline-flex h-9 w-9 items-center justify-center rounded-md border border-border',
            'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
          aria-label={tx('Thème aléatoire', 'Random theme')}
          title={tx('Thème aléatoire', 'Random theme')}
        >
          <Shuffle className="h-3.5 w-3.5" />
        </button>
        {/* Global dark/light swap — preserves the active family. */}
        <button
          type="button"
          onClick={onToggleMode}
          className={cn(
            'inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium',
            'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
          aria-label={tx(
            isDark ? 'Passer en clair' : 'Passer en sombre',
            isDark ? 'Switch to light' : 'Switch to dark',
          )}
        >
          {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          <span className="hidden xs:inline">
            {isDark ? tx('Clair', 'Light') : tx('Sombre', 'Dark')}
          </span>
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        {tx(
          'Choisissez un thème puis personnalisez accent, densité, typographie et contraste.',
          'Pick a theme then customise accent, density, typography and contrast.',
        )}
      </p>

      {/* Simple / Avancé toggle */}
      <div
        role="tablist"
        aria-label={tx('Mode du studio', 'Studio mode')}
        className="flex w-full rounded-md border border-border bg-card p-0.5 text-xs"
      >
        <ModeTab active={mode === 'simple'} onClick={() => onModeChange('simple')} icon={<Eye className="h-3.5 w-3.5" />}>
          {tx('Simple', 'Simple')}
        </ModeTab>
        <ModeTab active={mode === 'advanced'} onClick={() => onModeChange('advanced')} icon={<Sliders className="h-3.5 w-3.5" />}>
          {tx('Avancé', 'Advanced')}
        </ModeTab>
      </div>

      {mode === 'advanced' && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" />
            {tx('Réinitialiser personnalisation', 'Reset customisation')}
          </button>
        </div>
      )}
    </header>
  );
}

function ModeTab({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 inline-flex items-center justify-center gap-1.5 rounded-sm px-2 py-1.5 font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'bg-primary/15 text-primary'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Theme card (Simple → swatches; Advanced → mini-mockup)
// ─────────────────────────────────────────────────────────────────────────

function ThemeCard({
  meta,
  selected,
  mode,
  isFR,
  onPick,
}: {
  meta: (typeof THEMES)[number];
  selected: boolean;
  mode: StudioMode;
  isFR: boolean;
  onPick: () => void;
}) {
  const label = isFR ? meta.labelFR : meta.labelEN;
  const desc = isFR ? meta.descFR : meta.descEN;

  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      className={cn(
        'group relative flex flex-col items-stretch gap-2 rounded-lg border-2 p-3 text-left transition-all',
        'min-h-[112px]', // mobile-first big tap target
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        selected
          ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
          : 'border-border bg-card hover:border-muted-foreground/50',
      )}
    >
      {/* Header: name + dark/light pill */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-foreground truncate">{label}</span>
        <span
          className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium',
            meta.isDark ? 'bg-secondary text-secondary-foreground' : 'bg-primary/15 text-primary',
          )}
        >
          {meta.isDark ? <Moon className="h-2.5 w-2.5" /> : <Sun className="h-2.5 w-2.5" />}
          {meta.isDark ? (isFR ? 'Sombre' : 'Dark') : (isFR ? 'Clair' : 'Light')}
        </span>
      </div>

      {/* Preview: swatches in Simple, mini-mockup in Advanced */}
      {mode === 'simple' ? (
        <SwatchRow meta={meta} />
      ) : (
        <MiniMockup meta={meta} isFR={isFR} />
      )}

      <p className="text-[11px] text-muted-foreground line-clamp-2">{desc}</p>

      {selected && (
        <span className="absolute top-2 right-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary">
          <Check className="h-3 w-3 text-primary-foreground" />
        </span>
      )}
    </button>
  );
}

function SwatchRow({ meta }: { meta: (typeof THEMES)[number] }) {
  // Derive a credible foreground & surface tone from the theme's bg.
  const surface = adjustHex(meta.bgColor, meta.isDark ? +12 : -8);
  const fg = meta.isDark ? '#F8FAFC' : '#0F172A';
  return (
    <div
      className="flex items-center gap-1.5 rounded-md p-2 border border-border/50"
      style={{ backgroundColor: meta.bgColor }}
    >
      <Swatch color={meta.accentColor} label="accent" />
      <Swatch color={surface} label="surface" />
      <Swatch color={fg} label="text" />
      <div className="flex-1" />
      <span
        className="text-[10px] font-mono px-1.5 py-0.5 rounded"
        style={{ color: fg, backgroundColor: surface }}
      >
        {meta.accentColor.toUpperCase()}
      </span>
    </div>
  );
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <span
      title={label}
      className="inline-block h-5 w-5 rounded-full ring-1 ring-black/10"
      style={{ backgroundColor: color }}
    />
  );
}

/**
 * Mini in-card mockup that mirrors the actual app's surface tone, accent
 * button and a sample text block — so users can compare themes at a
 * glance without applying each one.
 */
function MiniMockup({ meta, isFR }: { meta: (typeof THEMES)[number]; isFR: boolean }) {
  const surface = adjustHex(meta.bgColor, meta.isDark ? +14 : -6);
  const fg = meta.isDark ? '#F8FAFC' : '#0F172A';
  const muted = meta.isDark ? '#94A3B8' : '#64748B';
  return (
    <div
      className="rounded-md p-2 border border-border/50 space-y-1.5"
      style={{ backgroundColor: meta.bgColor }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: meta.accentColor }}
          />
          <span className="text-[10px] font-semibold tracking-wide" style={{ color: fg }}>
            AIRBALLISTIK
          </span>
        </div>
        <span className="text-[9px]" style={{ color: muted }}>
          {isFR ? 'Aperçu' : 'Preview'}
        </span>
      </div>
      <div className="rounded p-1.5" style={{ backgroundColor: surface }}>
        <div className="text-[10px] font-medium" style={{ color: fg }}>
          {isFR ? 'Énergie' : 'Energy'}
        </div>
        <div className="font-mono text-xs" style={{ color: meta.accentColor }}>
          43.2 J
        </div>
      </div>
      <button
        type="button"
        tabIndex={-1}
        className="block w-full rounded text-center text-[10px] font-semibold py-1"
        style={{ backgroundColor: meta.accentColor, color: meta.isDark ? '#0B0B0B' : '#FFFFFF' }}
      >
        {isFR ? 'Calculer' : 'Compute'}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Advanced controls
// ─────────────────────────────────────────────────────────────────────────

function AdvancedControls({
  isDark,
  custom,
  updateCustom,
  tx,
}: {
  isDark: boolean;
  custom: ReturnType<typeof useTheme>['custom'];
  updateCustom: ReturnType<typeof useTheme>['updateCustom'];
  tx: (fr: string, en: string) => string;
}) {
  const fontScale = custom.fontScale ?? 1;
  const fontFamily: ThemeFontFamily = custom.fontFamily ?? 'sans';
  return (
    <section className="space-y-3" aria-label={tx('Personnalisation avancée', 'Advanced customisation')}>
      {/* Accent picker */}
      <ControlCard
        icon={<Sparkles className="h-4 w-4 text-primary" />}
        title={tx('Couleur d\'accent', 'Accent colour')}
        hint={tx('Override la couleur primaire du thème.', 'Overrides the theme primary colour.')}
      >
        <div className="flex flex-wrap gap-2">
          {ACCENT_PRESETS.map((p) => {
            const active = (custom.accentHex ?? '').toUpperCase() === p.hex.toUpperCase();
            return (
              <button
                key={p.hex}
                type="button"
                onClick={() => updateCustom({ accentHex: p.hex })}
                aria-pressed={active}
                aria-label={`${tx('Accent', 'Accent')} ${tx(p.labelFR, p.labelEN)}`}
                className={cn(
                  'h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all',
                  active ? 'ring-primary scale-110' : 'ring-transparent hover:ring-border',
                )}
                style={{ backgroundColor: p.hex }}
              />
            );
          })}
          {custom.accentHex && (
            <button
              type="button"
              onClick={() => updateCustom({ accentHex: null })}
              className="h-8 px-2 rounded-full text-[11px] text-muted-foreground hover:text-foreground border border-dashed border-border"
            >
              {tx('Auto', 'Auto')}
            </button>
          )}
        </div>
      </ControlCard>

      {/* Density */}
      <ControlCard
        icon={<LayoutGrid className="h-4 w-4 text-primary" />}
        title={tx('Densité', 'Density')}
        hint={tx('Espacement global de l\'interface.', 'Global UI spacing.')}
      >
        <SegmentedGroup
          value={custom.density ?? 'cosy'}
          onChange={(v) => updateCustom({ density: v as ThemeDensity })}
          options={[
            { value: 'compact', labelFR: 'Compact', labelEN: 'Compact' },
            { value: 'cosy', labelFR: 'Standard', labelEN: 'Cosy' },
            { value: 'comfortable', labelFR: 'Confort', labelEN: 'Comfort' },
          ]}
          isFR={tx('', '') === ''} // unused; we pass labels directly
        />
      </ControlCard>

      {/* Font scale */}
      <ControlCard
        icon={<Type className="h-4 w-4 text-primary" />}
        title={tx('Taille du texte', 'Text size')}
        hint={`${Math.round(fontScale * 100)}%`}
      >
        <input
          type="range"
          min={FONT_SCALE_BOUNDS.min}
          max={FONT_SCALE_BOUNDS.max}
          step={FONT_SCALE_BOUNDS.step}
          value={fontScale}
          onChange={(e) => updateCustom({ fontScale: parseFloat(e.target.value) })}
          aria-label={tx('Échelle de typographie', 'Font scale')}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>A</span>
          <span className="text-base">A</span>
        </div>
      </ControlCard>

      {/* Font family */}
      <ControlCard
        icon={<Type className="h-4 w-4 text-primary" />}
        title={tx('Police', 'Font family')}
        hint={tx('Sans / Display / Serif', 'Sans / Display / Serif')}
      >
        <div role="radiogroup" className="grid grid-cols-3 gap-1.5">
          {([
            { value: 'sans',    labelFR: 'Sans',    labelEN: 'Sans',    sample: 'Aa', font: "'DM Sans', system-ui, sans-serif" },
            { value: 'display', labelFR: 'Display', labelEN: 'Display', sample: 'Aa', font: "'Space Grotesk', system-ui, sans-serif" },
            { value: 'serif',   labelFR: 'Serif',   labelEN: 'Serif',   sample: 'Aa', font: "'Fraunces', Georgia, serif" },
          ] as const).map((opt) => {
            const active = fontFamily === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => updateCustom({ fontFamily: opt.value as ThemeFontFamily })}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 rounded-md border-2 py-2',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/50',
                )}
              >
                <span className="text-lg leading-none" style={{ fontFamily: opt.font }}>
                  {opt.sample}
                </span>
                <span className="text-[10px] font-medium">
                  {tx(opt.labelFR, opt.labelEN)}
                </span>
              </button>
            );
          })}
        </div>
      </ControlCard>

      {/* Contrast */}
      <ControlCard
        icon={<Contrast className="h-4 w-4 text-primary" />}
        title={tx('Contraste', 'Contrast')}
        hint={tx('Améliore la lisibilité en plein soleil.', 'Improves outdoor readability.')}
      >
        <SegmentedGroup
          value={custom.contrast ?? 'normal'}
          onChange={(v) => updateCustom({ contrast: v as ThemeContrast })}
          options={[
            { value: 'normal', labelFR: 'Normal', labelEN: 'Normal' },
            { value: 'high', labelFR: 'Élevé', labelEN: 'High' },
          ]}
          isFR
        />
      </ControlCard>

      {/* Radius */}
      <ControlCard
        icon={<Square className="h-4 w-4 text-primary" />}
        title={tx('Arrondi', 'Corner radius')}
        hint={tx('Style des coins (anguleux à doux).', 'Corner style (sharp → soft).')}
      >
        <SegmentedGroup
          value={custom.radius ?? 'normal'}
          onChange={(v) => updateCustom({ radius: v as ThemeRadius })}
          options={[
            { value: 'sharp', labelFR: 'Anguleux', labelEN: 'Sharp' },
            { value: 'normal', labelFR: 'Standard', labelEN: 'Normal' },
            { value: 'soft', labelFR: 'Doux', labelEN: 'Soft' },
          ]}
          isFR
        />
      </ControlCard>

      <p className="text-[10px] text-muted-foreground italic px-1">
        {tx(
          `Mode courant : ${isDark ? 'sombre' : 'clair'}. Les ajustements s'appliquent par-dessus.`,
          `Current mode: ${isDark ? 'dark' : 'light'}. Adjustments apply on top.`,
        )}
      </p>
    </section>
  );
}

function ControlCard({
  icon,
  title,
  hint,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="surface-elevated p-3 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <span className="text-sm font-medium truncate">{title}</span>
        </div>
        {hint && <span className="text-[11px] text-muted-foreground shrink-0">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function SegmentedGroup<V extends string>({
  value,
  onChange,
  options,
  isFR,
}: {
  value: V;
  onChange: (v: V) => void;
  options: { value: V; labelFR: string; labelEN: string }[];
  isFR: boolean;
}) {
  return (
    <div role="radiogroup" className="flex w-full rounded-md border border-border bg-card/40 p-0.5 text-xs">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex-1 rounded-sm px-2 py-1.5 font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {isFR ? opt.labelFR : opt.labelEN}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

/** Lighten/darken `#RRGGBB` by `delta` (in 0-255 increments). */
function adjustHex(hex: string, delta: number): string {
  let h = hex.startsWith('#') ? hex.slice(1) : hex;
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return hex;
  const r = clamp255(parseInt(h.slice(0, 2), 16) + delta);
  const g = clamp255(parseInt(h.slice(2, 4), 16) + delta);
  const b = clamp255(parseInt(h.slice(4, 6), 16) + delta);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
function clamp255(n: number): number {
  return Math.min(255, Math.max(0, Math.round(n)));
}