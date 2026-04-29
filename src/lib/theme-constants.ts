/**
 * Theme constants & types extracted from `theme.tsx`.
 *
 * Why a separate file?
 * --------------------
 * `react-refresh` (Vite's Fast Refresh) only preserves component state
 * when a module exports **components only**. When `theme.tsx` mixed the
 * `ThemeProvider` component with constants (`THEMES`), helpers
 * (`isValidTheme`) and types (`ThemeId`, `ThemeMeta`), Fast Refresh fell
 * back to a full reload on every edit. During that reload the React
 * dispatcher is briefly null, which surfaced as the recurring runtime
 * error:
 *
 *     Cannot read properties of null (reading 'useState')
 *         at ThemeProvider (theme.tsx)
 *
 * Splitting non-component exports out makes `theme.tsx` a clean
 * components-only module so HMR can hot-swap it cleanly.
 */

// ─────────────────────────────────────────────────────────────────────────
// Theme families & variants
// ─────────────────────────────────────────────────────────────────────────
// Each "family" exposes a coherent dark + light pair that share the same
// hue identity (accent + surface tint). Users pick a family in the Theme
// Studio, then a global dark/light toggle swaps between the two variants.
//
// Six premium families:
//   • carbon-green   — vert tactique, intérieur
//   • tactical-dark  — ambre profond, lecture nocturne
//   • slate          — bleu froid neutre, plein soleil
//   • desert-tan     — terracotta chaud, longues sessions
//   • midnight-blue  — bleu nuit profond, focus
//   • mono-slate     — monochrome ardoise, sobre éditorial
//
// All 12 ids stay individually addressable so persisted preferences and
// existing storage values keep working.

export type ThemeFamily =
  | 'carbon-green'
  | 'tactical-dark'
  | 'slate'
  | 'desert-tan'
  | 'midnight-blue'
  | 'mono-slate';

export type ThemeMode = 'dark' | 'light';

export type ThemeId =
  | 'carbon-green'
  | 'carbon-green-light'
  | 'tactical-dark'
  | 'tactical-dark-light'
  | 'slate-light'
  | 'slate-dark'
  | 'desert-tan'
  | 'desert-tan-light'
  | 'midnight-blue'
  | 'midnight-blue-light'
  | 'mono-slate'
  | 'mono-slate-light';

export interface ThemeMeta {
  id: ThemeId;
  family: ThemeFamily;
  mode: ThemeMode;
  labelFR: string;
  labelEN: string;
  /** Convenience: `mode === 'dark'`. Kept for backwards compatibility. */
  isDark: boolean;
  accentColor: string;
  bgColor: string;
  /** Quick description for the studio screen (FR). */
  descFR: string;
  /** Quick description for the studio screen (EN). */
  descEN: string;
}

/**
 * All 12 themes. Order matters: it drives the Studio grid. Families come
 * in pairs (dark first, then light) so the dark/light toggle has a
 * predictable neighbour.
 */
export const THEMES: ThemeMeta[] = [
  // Carbon Green
  { id: 'carbon-green',        family: 'carbon-green',  mode: 'dark',  isDark: true,  accentColor: '#22C55E', bgColor: '#111111',
    labelFR: 'Carbon Green',   labelEN: 'Carbon Green',
    descFR: 'Sombre, vert tactique. Idéal en intérieur.',  descEN: 'Dark, tactical green. Best for indoors.' },
  { id: 'carbon-green-light',  family: 'carbon-green',  mode: 'light', isDark: false, accentColor: '#16A34A', bgColor: '#F4FBF6',
    labelFR: 'Carbon Green',   labelEN: 'Carbon Green',
    descFR: 'Clair, vert tactique adouci.',                descEN: 'Light, softened tactical green.' },
  // Tactical (amber)
  { id: 'tactical-dark',       family: 'tactical-dark', mode: 'dark',  isDark: true,  accentColor: '#F59E0B', bgColor: '#0C0E14',
    labelFR: 'Tactical Amber', labelEN: 'Tactical Amber',
    descFR: 'Sombre profond, accent ambre. Lecture nocturne.', descEN: 'Deep dark, amber accent. Night-time reading.' },
  { id: 'tactical-dark-light', family: 'tactical-dark', mode: 'light', isDark: false, accentColor: '#D97706', bgColor: '#FBF7EE',
    labelFR: 'Tactical Amber', labelEN: 'Tactical Amber',
    descFR: 'Clair, ambre chaud. Bureau ensoleillé.',      descEN: 'Light, warm amber. Sunlit office.' },
  // Slate (blue)
  { id: 'slate-dark',          family: 'slate',         mode: 'dark',  isDark: true,  accentColor: '#60A5FA', bgColor: '#0E1626',
    labelFR: 'Slate Blue',     labelEN: 'Slate Blue',
    descFR: 'Sombre, bleu acier. Polyvalent.',             descEN: 'Dark, steel blue. Versatile.' },
  { id: 'slate-light',         family: 'slate',         mode: 'light', isDark: false, accentColor: '#3B82F6', bgColor: '#F8FAFC',
    labelFR: 'Slate Blue',     labelEN: 'Slate Blue',
    descFR: 'Clair, bleu froid. Plein soleil sur le terrain.', descEN: 'Light, cool blue. Outdoor sunlight.' },
  // Desert
  { id: 'desert-tan',          family: 'desert-tan',    mode: 'dark',  isDark: true,  accentColor: '#E07B39', bgColor: '#1C1510',
    labelFR: 'Desert Tan',     labelEN: 'Desert Tan',
    descFR: 'Sombre chaud, accent terracotta. Confort longue durée.', descEN: 'Warm dark, terracotta accent. Long-session comfort.' },
  { id: 'desert-tan-light',    family: 'desert-tan',    mode: 'light', isDark: false, accentColor: '#C2410C', bgColor: '#FBF6EE',
    labelFR: 'Desert Tan',     labelEN: 'Desert Tan',
    descFR: 'Clair, ton sable. Élégant et chaleureux.',    descEN: 'Light, sand tone. Warm and elegant.' },
  // Midnight Blue
  { id: 'midnight-blue',       family: 'midnight-blue', mode: 'dark',  isDark: true,  accentColor: '#7C9CFF', bgColor: '#070B1A',
    labelFR: 'Midnight Blue',  labelEN: 'Midnight Blue',
    descFR: 'Bleu nuit profond, accent indigo. Concentration.', descEN: 'Deep night blue, indigo accent. Focus mode.' },
  { id: 'midnight-blue-light', family: 'midnight-blue', mode: 'light', isDark: false, accentColor: '#4F46E5', bgColor: '#F5F6FF',
    labelFR: 'Midnight Blue',  labelEN: 'Midnight Blue',
    descFR: 'Clair, indigo doux. Lecture longue durée.',   descEN: 'Light, soft indigo. Long-form reading.' },
  // Mono Slate
  { id: 'mono-slate',          family: 'mono-slate',    mode: 'dark',  isDark: true,  accentColor: '#E2E8F0', bgColor: '#0B0D10',
    labelFR: 'Mono Slate',     labelEN: 'Mono Slate',
    descFR: 'Monochrome ardoise. Minimaliste éditorial.',  descEN: 'Slate monochrome. Editorial minimalism.' },
  { id: 'mono-slate-light',    family: 'mono-slate',    mode: 'light', isDark: false, accentColor: '#1F2937', bgColor: '#FAFAFA',
    labelFR: 'Mono Slate',     labelEN: 'Mono Slate',
    descFR: 'Clair, encre & papier. Sobre haut de gamme.', descEN: 'Light, ink & paper. Premium minimal.' },
];

const THEME_IDS = new Set<ThemeId>(THEMES.map((t) => t.id));

export const THEME_STORAGE_KEY = 'pcp-theme';
export const DEFAULT_THEME: ThemeId = 'carbon-green';

export function isValidTheme(v: string | null | undefined): v is ThemeId {
  return typeof v === 'string' && THEME_IDS.has(v as ThemeId);
}

/**
 * Find a theme's matching variant in the opposite mode (dark ↔ light) so
 * the dark/light toggle can swap inside the same family without losing
 * the user's family choice.
 */
export function getFamilyVariant(id: ThemeId, mode: ThemeMode): ThemeId {
  const meta = THEMES.find((t) => t.id === id);
  if (!meta) return DEFAULT_THEME;
  if (meta.mode === mode) return meta.id;
  const sibling = THEMES.find((t) => t.family === meta.family && t.mode === mode);
  return sibling?.id ?? meta.id;
}

/** Distinct families in display order, derived from THEMES. */
export const THEME_FAMILIES: ThemeFamily[] = Array.from(
  new Set(THEMES.map((t) => t.family)),
);

// ─────────────────────────────────────────────────────────────────────────
// Per-user storage helpers
// ─────────────────────────────────────────────────────────────────────────
// Theme + customisation are stored per-device (Supabase profiles is left
// untouched on purpose — see preferences-sync.ts). To still give a "per
// user" experience on shared devices, we scope the storage key to the
// signed-in user id when available, and migrate the anonymous value
// forward on first sign-in.
//
//   Anonymous → "pcp-theme"
//   User abc  → "pcp-theme:abc"
//
// When the active user changes, callers swap storage keys via
// `themeStorageKeyFor(userId)` and `customStorageKeyFor(userId)`.

export function themeStorageKeyFor(userId: string | null | undefined): string {
  return userId ? `${THEME_STORAGE_KEY}:${userId}` : THEME_STORAGE_KEY;
}

export function customStorageKeyFor(userId: string | null | undefined): string {
  return userId ? `${THEME_CUSTOM_STORAGE_KEY}:${userId}` : THEME_CUSTOM_STORAGE_KEY;
}

// ─────────────────────────────────────────────────────────────────────────
// Customisation layer (M5 — Theme Studio)
// ─────────────────────────────────────────────────────────────────────────
// On top of the four base themes, users can override a small set of
// presentation knobs. These are persisted separately from the chosen
// theme so they survive theme switches:
//
//   • accentHex — overrides the theme's accent (primary) colour.
//   • density   — UI spacing scale (compact / cosy / comfortable).
//   • fontScale — typography scale multiplier (0.875 → 1.125).
//   • contrast  — boosts surface contrast for outdoor / a11y use.
//   • radius    — border-radius scale (sharp → soft).
//
// All overrides are nullable; null/undefined means "fall back to the
// base theme value" so existing users see no visual change after upgrade.
export type ThemeDensity = 'compact' | 'cosy' | 'comfortable';
export type ThemeContrast = 'normal' | 'high';
export type ThemeRadius = 'sharp' | 'normal' | 'soft';
/**
 * Typography family selector exposed in the Studio.
 *
 *   • sans    — DM Sans / Inter (default, neutral premium)
 *   • display — Space Grotesk (modern, geometric headings)
 *   • serif   — Fraunces (editorial, elegant)
 */
export type ThemeFontFamily = 'sans' | 'display' | 'serif';

export interface ThemeCustomisation {
  accentHex?: string | null;
  density?: ThemeDensity;
  fontScale?: number;
  contrast?: ThemeContrast;
  radius?: ThemeRadius;
  /** Heading + body font family. `undefined` falls back to 'sans'. */
  fontFamily?: ThemeFontFamily;
}

export const THEME_CUSTOM_STORAGE_KEY = 'pcp-theme-custom';
export const THEME_MODE_STORAGE_KEY = 'pcp-theme-studio-mode';

export const DEFAULT_CUSTOMISATION: Required<Omit<ThemeCustomisation, 'accentHex'>> & { accentHex: string | null } = {
  accentHex: null,
  density: 'cosy',
  fontScale: 1,
  contrast: 'normal',
  radius: 'normal',
  fontFamily: 'sans',
};

export const FONT_SCALE_BOUNDS = { min: 0.875, max: 1.25, step: 0.025 } as const;

/**
 * Curated accent palette shown in the studio. Hand-picked to look good
 * across all four base themes (saturation kept moderate, contrast tested
 * on both dark and light surfaces).
 */
export const ACCENT_PRESETS: { hex: string; labelFR: string; labelEN: string }[] = [
  { hex: '#22C55E', labelFR: 'Vert',     labelEN: 'Green'   },
  { hex: '#F59E0B', labelFR: 'Ambre',    labelEN: 'Amber'   },
  { hex: '#3B82F6', labelFR: 'Bleu',     labelEN: 'Blue'    },
  { hex: '#E07B39', labelFR: 'Terracotta', labelEN: 'Terracotta' },
  { hex: '#EF4444', labelFR: 'Rouge',    labelEN: 'Red'     },
  { hex: '#A855F7', labelFR: 'Violet',   labelEN: 'Violet'  },
  { hex: '#06B6D4', labelFR: 'Cyan',     labelEN: 'Cyan'    },
  { hex: '#EC4899', labelFR: 'Rose',     labelEN: 'Pink'    },
];

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Convert `#RRGGBB` (or `#RGB`) into Tailwind's `H S% L%` token format.
 * Returns null on invalid input — callers should fall back to the base
 * theme value in that case.
 */
export function hexToHslTokens(hex: string): string | null {
  if (typeof hex !== 'string') return null;
  let h = hex.trim();
  if (h.startsWith('#')) h = h.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let hue = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hue = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: hue = ((b - r) / d + 2);               break;
      default: hue = ((r - g) / d + 4);
    }
    hue *= 60;
  }
  return `${Math.round(hue)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function readCustomisation(): ThemeCustomisation {
  return readCustomisationFor(null);
}

export function readCustomisationFor(userId: string | null | undefined): ThemeCustomisation {
  try {
    const raw = localStorage.getItem(customStorageKeyFor(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ThemeCustomisation;
    return sanitiseCustomisation(parsed);
  } catch {
    return {};
  }
}

export function sanitiseCustomisation(c: ThemeCustomisation): ThemeCustomisation {
  const out: ThemeCustomisation = {};
  if (c.accentHex && hexToHslTokens(c.accentHex)) out.accentHex = c.accentHex;
  if (c.density === 'compact' || c.density === 'cosy' || c.density === 'comfortable') out.density = c.density;
  if (typeof c.fontScale === 'number' && Number.isFinite(c.fontScale)) {
    out.fontScale = clamp(c.fontScale, FONT_SCALE_BOUNDS.min, FONT_SCALE_BOUNDS.max);
  }
  if (c.contrast === 'normal' || c.contrast === 'high') out.contrast = c.contrast;
  if (c.radius === 'sharp' || c.radius === 'normal' || c.radius === 'soft') out.radius = c.radius;
  if (c.fontFamily === 'sans' || c.fontFamily === 'display' || c.fontFamily === 'serif') {
    out.fontFamily = c.fontFamily;
  }
  return out;
}

export function writeCustomisation(c: ThemeCustomisation): void {
  writeCustomisationFor(null, c);
}

export function writeCustomisationFor(userId: string | null | undefined, c: ThemeCustomisation): void {
  try {
    const clean = sanitiseCustomisation(c);
    localStorage.setItem(customStorageKeyFor(userId), JSON.stringify(clean));
  } catch {
    /* storage may be full or disabled — silently ignore */
  }
}