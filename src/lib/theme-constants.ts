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
}

export const THEMES: ThemeMeta[] = [
  { id: 'carbon-green',  labelFR: 'Carbon Green',  labelEN: 'Carbon Green',  isDark: true,  accentColor: '#22C55E', bgColor: '#111111' },
  { id: 'tactical-dark', labelFR: 'Tactical Dark', labelEN: 'Tactical Dark', isDark: true,  accentColor: '#F59E0B', bgColor: '#0C0E14' },
  { id: 'slate-light',   labelFR: 'Slate Light',   labelEN: 'Slate Light',   isDark: false, accentColor: '#3B82F6', bgColor: '#F8FAFC' },
  { id: 'desert-tan',    labelFR: 'Desert Tan',    labelEN: 'Desert Tan',    isDark: true,  accentColor: '#E07B39', bgColor: '#1C1510' },
];

export const THEME_STORAGE_KEY = 'pcp-theme';
export const DEFAULT_THEME: ThemeId = 'carbon-green';

export function isValidTheme(v: string | null): v is ThemeId {
  return v === 'carbon-green' || v === 'tactical-dark' || v === 'slate-light' || v === 'desert-tan';
}