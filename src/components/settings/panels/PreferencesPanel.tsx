/**
 * PreferencesPanel — unified user-preferences menu.
 *
 * Why this panel exists alongside Général + Affichage?
 * ─────────────────────────────────────────────────────
 * "Préférences" is the canonical entry point a user reaches for when they
 * want to set the three things that shape the WHOLE app feel: language,
 * theme and Simple/Advanced mode. Those three are scattered across two
 * other tabs today — this panel surfaces them in one place, with a live
 * preview and a single "Reset" affordance, without removing the originals
 * (deep-links and muscle memory keep working).
 *
 * What the preview shows:
 *   • The current locale label ("Français" / "English") rendered in the
 *     Inter font of the active theme,
 *   • A surface-card swatch tinted by the active theme accent,
 *   • The Simple/Advanced badge, with a one-line copy that mirrors what
 *     the calculator will actually look like at boot.
 *
 * Reset behaviour:
 *   • Resets ONLY the three preferences this panel governs — language,
 *     theme, simple/advanced. A11y prefs (high-contrast, large-text,
 *     reduce-motion, strong-focus) and units/data are deliberately NOT
 *     touched, because the user expects "reset preferences" to be a soft
 *     cosmetic reset, not a wipe of their accessibility setup.
 *   • Confirms with `window.confirm()` to prevent accidental clicks.
 */
import React, { useCallback, useState } from 'react';
import {
  SlidersHorizontal,
  Globe,
  Palette,
  Eye,
  Sparkles,
  RotateCcw,
  Check,
  Sun,
  Moon,
  Star,
  ChevronRight,
  Ruler,
  Clock,
  PlayCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { THEMES, DEFAULT_THEME } from '@/lib/theme-constants';
import { getSettings, saveSettings, sessionStore } from '@/lib/storage';
import { toDisplay, getDefaultUnitPrefs, getUnitSymbol } from '@/lib/units';
import { useUnits } from '@/hooks/use-units';
import { getSortedFavorites, formatLastUsed, getLastSession } from '@/lib/session-favorites';
import { markLocalUpdated, savePreferenceToSupabase } from '@/lib/preferences-sync';
import { useAuth } from '@/lib/auth-context';
import { ThemePicker } from '@/components/settings/ThemePicker';
import { cn } from '@/lib/utils';

type Locale = 'fr' | 'en';

const DEFAULT_LOCALE: Locale = 'fr';
const DEFAULT_ADVANCED_MODE = false;

export function PreferencesPanel() {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme, isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { prefs, setUnitPref } = useUnits();
  const settings = getSettings();
  // `advancedMode` is local-only (no Supabase column today). Locale and
  // theme have their own per-user sync paths inside their providers, so
  // this panel stays purely client-side.
  const [, force] = React.useReducer((x) => x + 1, 0);
  const [justReset, setJustReset] = useState(false);

  const advancedMode = settings.advancedMode === true;
  const unitSystem: 'metric' | 'imperial' = settings.unitSystem === 'imperial' ? 'imperial' : 'metric';

  // Switching the unit SYSTEM only changes how reference values are
  // formatted at render time — the ballistic engine keeps storing/
  // computing in the deterministic SI reference (m, m/s, J, °C…).
  // We deliberately reset `unitPreferences` to the new system's
  // defaults so the preview and the rest of the app agree, but users
  // can still fine-tune per category in the dedicated Unités tab.
  const setUnitSystem = useCallback(
    (next: 'metric' | 'imperial') => {
      const cur = getSettings();
      if (cur.unitSystem === next) return;
      saveSettings({ ...cur, unitSystem: next, unitPreferences: undefined });
      markLocalUpdated();
      if (user) savePreferenceToSupabase(user.id, 'unit_system', next).catch(() => {});
      force();
    },
    [user],
  );

  // ── Favorites quick-switch ────────────────────────────────────────
  // Re-read on every render: cheap (in-memory cache) and `force()` is
  // already wired below for the mode toggle. The star button calls
  // `sessionStore.update()` then `force()` so the list refreshes
  // without leaving the panel.
  //
  // Sorting (last-used DESC, then name ASC) is delegated to the shared
  // `getSortedFavorites` helper so this list stays in lockstep with the
  // Dashboard "Favoris" widget — single source of truth, no drift.
  const favSessions = getSortedFavorites(sessionStore.getAll());

  const toggleFav = useCallback(
    (id: string) => {
      const s = sessionStore.getAll().find((x) => x.id === id);
      if (!s) return;
      sessionStore.update(id, { favorite: !s.favorite });
      force();
    },
    [],
  );

  const setMode = useCallback(
    (advanced: boolean) => {
      saveSettings({ ...getSettings(), advancedMode: advanced });
      markLocalUpdated();
      force();
    },
    [],
  );

  const handleReset = useCallback(() => {
    const ok = window.confirm(t('settings.preferences.resetConfirm' as any));
    if (!ok) return;
    setLocale(DEFAULT_LOCALE);
    setTheme(DEFAULT_THEME);
    setMode(DEFAULT_ADVANCED_MODE);
    setJustReset(true);
    window.setTimeout(() => setJustReset(false), 2200);
  }, [setLocale, setTheme, setMode, t]);

  const themeMeta = THEMES.find((th) => th.id === theme) ?? THEMES[0];
  const themeLabel = locale === 'fr' ? themeMeta.labelFR : themeMeta.labelEN;

  // Same source of truth as the Dashboard "Dernière session" widget —
  // most recent `updatedAt`, fallback to `createdAt`. Re-read on every
  // render (in-memory cache); `force()` after favorite-toggle keeps it
  // in sync without a route change.
  const lastSession = getLastSession(sessionStore.getAll());

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="surface-elevated p-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <SlidersHorizontal className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-medium">
              {t('settings.preferences.title' as any)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {t('settings.preferences.subtitle' as any)}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
            'border-border hover:bg-muted',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            justReset && 'border-primary/40 bg-primary/10 text-primary',
          )}
          aria-label={t('settings.preferences.reset' as any)}
        >
          {justReset ? <Check className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
          <span>{justReset ? t('settings.preferences.resetDone' as any) : t('settings.preferences.reset' as any)}</span>
        </button>
      </div>

      {/* Resume — quick shortcut to the most recently touched session.
          Hidden when there is nothing to resume. */}
      {lastSession && (
        <button
          type="button"
          onClick={() => navigate(`/sessions/${lastSession.id}`)}
          className={cn(
            'surface-elevated p-3 w-full text-left flex items-center gap-3',
            'hover:border-primary/40 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md',
          )}
          aria-label={`${t('settings.preferences.resume' as any)} — ${lastSession.name}`}
        >
          <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <PlayCircle className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t('settings.preferences.resume' as any)}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                <Clock className="h-3 w-3" />
                {formatLastUsed(lastSession.updatedAt, locale)}
              </span>
            </div>
            <div className="text-sm font-medium truncate">{lastSession.name}</div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      )}

      {/* Language */}
      <section className="surface-elevated p-4 space-y-2">
        <header className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary/80" />
          <h3 className="text-sm font-medium">{t('settings.language')}</h3>
        </header>
        <div
          role="radiogroup"
          aria-label={t('settings.language')}
          className="inline-flex w-full sm:w-auto rounded-md border border-border bg-card p-0.5"
        >
          <LangButton active={locale === 'fr'} onClick={() => setLocale('fr')} label="Français" />
          <LangButton active={locale === 'en'} onClick={() => setLocale('en')} label="English" />
        </div>
      </section>

      {/* Theme */}
      <section className="surface-elevated p-4 space-y-3">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary/80" />
            <h3 className="text-sm font-medium">{t('settings.theme')}</h3>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] font-medium',
              'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
            aria-label={
              isDark
                ? t('settings.preferences.toLight' as any)
                : t('settings.preferences.toDark' as any)
            }
          >
            {isDark ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
            {isDark ? t('settings.preferences.light' as any) : t('settings.preferences.dark' as any)}
          </button>
        </header>
        <ThemePicker />
      </section>

      {/* Simple / Advanced */}
      <section className="surface-elevated p-4 space-y-2">
        <header className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary/80" />
          <h3 className="text-sm font-medium">{t('settings.defaultMode')}</h3>
        </header>
        <p className="text-[11px] text-muted-foreground">
          {t('settings.preferences.modeDesc' as any)}
        </p>
        <div
          role="radiogroup"
          aria-label={t('settings.defaultMode')}
          className="inline-flex w-full sm:w-auto rounded-md border border-border bg-card p-0.5"
        >
          <LangButton active={!advancedMode} onClick={() => setMode(false)} label={t('common.simpleMode')} />
          <LangButton active={advancedMode} onClick={() => setMode(true)} label={t('common.advancedMode')} />
        </div>
      </section>

      {/* Units (display only — engine stays in SI reference) */}
      <section
        className="surface-elevated p-4 space-y-2"
        aria-label={t('settings.unitSystem')}
      >
        <header className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Ruler className="h-4 w-4 text-primary/80 shrink-0" />
            <h3 className="text-sm font-medium truncate">{t('settings.unitSystem')}</h3>
          </div>
          <button
            type="button"
            onClick={() => navigate('/settings?tab=units')}
            className={cn(
              'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium',
              'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            {t('settings.preferences.unitsFine' as any)}
            <ChevronRight className="h-3 w-3" />
          </button>
        </header>
        <p className="text-[11px] text-muted-foreground">
          {t('settings.preferences.unitsDesc' as any)}
        </p>
        <div
          role="radiogroup"
          aria-label={t('settings.unitSystem')}
          className="inline-flex w-full sm:w-auto rounded-md border border-border bg-card p-0.5"
        >
          <LangButton
            active={unitSystem === 'metric'}
            onClick={() => setUnitSystem('metric')}
            label={t('common.metric')}
          />
          <LangButton
            active={unitSystem === 'imperial'}
            onClick={() => setUnitSystem('imperial')}
            label={t('common.imperial')}
          />
        </div>

        {/* Side-by-side comparison — both systems shown for the same
            reference values, the active column highlighted. Lets the
            user pick the unit system by SEEING the format, not by
            guessing the conversion. */}
        <UnitsComparison activeSystem={unitSystem} t={t} />
        {/* Per-category fine-tune — quick toggle between the 2-3 most
            common options for each category, with an inline preview.
            Goes BEYOND the system-wide switch above: a user can pick
            metric distances but imperial energy, for example. */}
        <UnitsFineTune prefs={prefs} setUnitPref={(k, v) => { setUnitPref(k, v); force(); }} t={t} />
        <p className="text-[10px] text-muted-foreground">
          {t('settings.preferences.unitsHint' as any)}
        </p>
      </section>

      {/* Favorites quick-switch */}
      <section
        className="surface-elevated p-4 space-y-2"
        aria-label={t('settings.preferences.favorites' as any)}
      >
        <header className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Star className="h-4 w-4 text-primary/80 shrink-0" />
            <h3 className="text-sm font-medium truncate">
              {t('settings.preferences.favorites' as any)}
            </h3>
            <span className="text-[10px] text-muted-foreground font-mono shrink-0">
              {favSessions.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/sessions?filter=favorites')}
            className={cn(
              'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium',
              'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            {t('settings.preferences.favoritesAll' as any)}
            <ChevronRight className="h-3 w-3" />
          </button>
        </header>
        <p className="text-[11px] text-muted-foreground">
          {t('settings.preferences.favoritesDesc' as any)}
        </p>

        {favSessions.length === 0 ? (
          <p className="text-xs text-muted-foreground italic px-1 py-2">
            {t('settings.preferences.favoritesEmpty' as any)}
          </p>
        ) : (
          <ul className="space-y-1" role="list">
            {favSessions.slice(0, 6).map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-1 rounded-md hover:bg-muted/50 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFav(s.id)}
                  className={cn(
                    'p-1.5 rounded-md text-primary shrink-0',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                  aria-label={t('settings.preferences.favoritesUnpin' as any)}
                  title={t('settings.preferences.favoritesUnpin' as any)}
                >
                  <Star className="h-3.5 w-3.5" fill="currentColor" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/sessions/${s.id}`)}
                  className={cn(
                    'flex-1 min-w-0 flex items-center gap-2 px-1 py-1.5 text-left',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md',
                  )}
                >
                  <span className="text-xs truncate">{s.name}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground font-mono shrink-0">
                    {formatLastUsed(s.updatedAt, locale)}
                  </span>
                  {typeof s.input?.bc === 'number' && (
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0 hidden sm:inline">
                      BC {s.input.bc}
                    </span>
                  )}
                  <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {favSessions.length > 6 && (
          <p className="text-[10px] text-muted-foreground text-right">
            +{favSessions.length - 6} {t('settings.preferences.favoritesMore' as any)}
          </p>
        )}
      </section>

      {/* Live preview */}
      <section
        className="surface-elevated p-4 space-y-3"
        aria-label={t('settings.preferences.preview' as any)}
      >
        <header className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary/80" />
          <h3 className="text-sm font-medium">{t('settings.preferences.preview' as any)}</h3>
        </header>

        <div
          className={cn(
            'rounded-lg border border-border/60 bg-card p-4 space-y-3',
            'transition-colors',
          )}
        >
          {/* Mock heading */}
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5 min-w-0">
              <div className="text-sm font-semibold truncate">
                {locale === 'fr' ? 'Tir 50 m — diabolo .22' : '50 m shot — .22 pellet'}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {themeLabel} · {isDark ? t('settings.preferences.dark' as any) : t('settings.preferences.light' as any)} · {advancedMode ? t('common.advancedMode') : t('common.simpleMode')}
              </div>
            </div>
            <span
              className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[10px] font-medium border border-primary/25"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: themeMeta.accentColor }}
              />
              {advancedMode ? 'PRO' : 'STD'}
            </span>
          </div>

          {/* Mock body — 2 lines change with mode (the calculator-Simple
              variant collapses to 1 metric, Advanced shows 4). */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['Drop', 'Wind', 'Energy', 'BC'] as const).map((label, i) => {
              const visible = advancedMode || i < 2; // Simple: 2 metrics; Advanced: 4
              return (
                <div
                  key={label}
                  className={cn(
                    'rounded-md border border-border/40 bg-background/40 px-2 py-1.5',
                    !visible && 'opacity-30',
                  )}
                  aria-hidden={!visible}
                >
                  <div className="text-[9px] uppercase text-muted-foreground">{label}</div>
                  <div className="text-xs font-mono font-semibold">
                    {label === 'Drop' ? '−12.4' : label === 'Wind' ? '0.6' : label === 'Energy' ? '24.1' : '0.041'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mock CTA */}
          <button
            type="button"
            disabled
            className="w-full rounded-md bg-primary text-primary-foreground text-xs font-medium px-3 py-2 cursor-default"
          >
            {locale === 'fr' ? 'Calculer la solution' : 'Compute solution'}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {t('settings.preferences.previewHint' as any)}
        </p>
      </section>
    </div>
  );
}

function LangButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        'flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'bg-primary/15 text-primary ring-1 ring-inset ring-primary/25' : 'text-muted-foreground hover:bg-muted',
      )}
    >
      {label}
    </button>
  );
}

/**
 * Side-by-side units preview.
 *
 * Why duplicate the conversion logic instead of reusing `useUnits()`?
 * `useUnits` reads the user's CURRENT prefs — but here we want to show
 * BOTH systems regardless of what's saved, so the user can compare
 * before committing. We call `toDisplay()` directly with each system's
 * default prefs (`getDefaultUnitPrefs('metric'|'imperial')`), keeping
 * conversions deterministic and identical to what the rest of the app
 * will render after the choice is saved.
 */
function UnitsComparison({
  activeSystem,
  t,
}: {
  activeSystem: 'metric' | 'imperial';
  t: (k: string) => string;
}) {
  const metricPrefs = getDefaultUnitPrefs('metric');
  const imperialPrefs = getDefaultUnitPrefs('imperial');

  const rows = [
    { cat: 'distance', refValue: 50, label: t('settings.preferences.unitsDistance' as any) },
    { cat: 'velocity', refValue: 280, label: t('settings.preferences.unitsVelocity' as any) },
    { cat: 'energy', refValue: 24, label: t('settings.preferences.unitsEnergy' as any) },
  ] as const;

  const fmt = (v: number) =>
    Number.isFinite(v) ? (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2)) : '—';

  return (
    <div className="rounded-md border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-1.5 bg-muted/30 text-[9px] uppercase tracking-wider text-muted-foreground">
        <span>{t('settings.preferences.unitsCompareValue' as any)}</span>
        <span
          className={cn(
            'text-right tabular-nums px-2 rounded',
            activeSystem === 'metric' && 'text-primary font-semibold',
          )}
        >
          {t('common.metric')}
        </span>
        <span
          className={cn(
            'text-right tabular-nums px-2 rounded',
            activeSystem === 'imperial' && 'text-primary font-semibold',
          )}
        >
          {t('common.imperial')}
        </span>
      </div>
      {/* Body */}
      {rows.map(({ cat, refValue, label }) => {
        const mVal = toDisplay(cat, refValue, metricPrefs);
        const iVal = toDisplay(cat, refValue, imperialPrefs);
        const mSym = getUnitSymbol(cat, metricPrefs[cat]);
        const iSym = getUnitSymbol(cat, imperialPrefs[cat]);
        return (
          <div
            key={cat}
            className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-1.5 border-t border-border/40 items-center"
          >
            <span className="text-[10px] text-muted-foreground uppercase">{label}</span>
            <span
              className={cn(
                'text-xs font-mono text-right px-2 py-0.5 rounded',
                activeSystem === 'metric'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground',
              )}
              aria-current={activeSystem === 'metric' ? 'true' : undefined}
            >
              {fmt(mVal)} <span className="opacity-70">{mSym}</span>
            </span>
            <span
              className={cn(
                'text-xs font-mono text-right px-2 py-0.5 rounded',
                activeSystem === 'imperial'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground',
              )}
              aria-current={activeSystem === 'imperial' ? 'true' : undefined}
            >
              {fmt(iVal)} <span className="opacity-70">{iSym}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
