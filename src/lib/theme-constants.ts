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

export type ThemeId = 'carbon-green' | 'tactical-dark' | 'slate-light' | 'desert-tan';

export interface ThemeMeta {
  id: ThemeId;
  labelFR: string;
  labelEN: string;
  isDark: boolean;
  accentColor: string;
  bgColor: string;
  /** Quick description for the studio screen (FR). */
  descFR: string;
  /** Quick description for the studio screen (EN). */
  descEN: string;
}

export const THEMES: ThemeMeta[] = [
  { id: 'carbon-green',  labelFR: 'Carbon Green',  labelEN: 'Carbon Green',  isDark: true,  accentColor: '#22C55E', bgColor: '#111111',
    descFR: 'Sombre, vert tactique. Idéal en intérieur.',                  descEN: 'Dark, tactical green. Best for indoors.' },
  { id: 'tactical-dark', labelFR: 'Tactical Dark', labelEN: 'Tactical Dark', isDark: true,  accentColor: '#F59E0B', bgColor: '#0C0E14',
    descFR: 'Sombre profond, accent ambre. Lecture nocturne.',              descEN: 'Deep dark, amber accent. Night-time reading.' },
  { id: 'slate-light',   labelFR: 'Slate Light',   labelEN: 'Slate Light',   isDark: false, accentColor: '#3B82F6', bgColor: '#F8FAFC',
    descFR: 'Clair, bleu froid. Plein soleil sur le terrain.',              descEN: 'Light, cool blue. Outdoor sunlight.' },
  { id: 'desert-tan',    labelFR: 'Desert Tan',    labelEN: 'Desert Tan',    isDark: true,  accentColor: '#E07B39', bgColor: '#1C1510',
    descFR: 'Sombre chaud, accent terracotta. Confort longue durée.',       descEN: 'Warm dark, terracotta accent. Long-session comfort.' },
];

export const THEME_STORAGE_KEY = 'pcp-theme';
export const DEFAULT_THEME: ThemeId = 'carbon-green';

export function isValidTheme(v: string | null): v is ThemeId {
  return v === 'carbon-green' || v === 'tactical-dark' || v === 'slate-light' || v === 'desert-tan';
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

export interface ThemeCustomisation {
  accentHex?: string | null;
  density?: ThemeDensity;
  fontScale?: number;
  contrast?: ThemeContrast;
  radius?: ThemeRadius;
}

export const THEME_CUSTOM_STORAGE_KEY = 'pcp-theme-custom';
export const THEME_MODE_STORAGE_KEY = 'pcp-theme-studio-mode';

export const DEFAULT_CUSTOMISATION: Required<Omit<ThemeCustomisation, 'accentHex'>> & { accentHex: string | null } = {
  accentHex: null,
  density: 'cosy',
  fontScale: 1,
  contrast: 'normal',
  radius: 'normal',
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
  try {
    const raw = localStorage.getItem(THEME_CUSTOM_STORAGE_KEY);
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
  return out;
}

export function writeCustomisation(c: ThemeCustomisation): void {
  try {
    const clean = sanitiseCustomisation(c);
    localStorage.setItem(THEME_CUSTOM_STORAGE_KEY, JSON.stringify(clean));
  } catch {
    /* storage may be full or disabled — silently ignore */
  }
}