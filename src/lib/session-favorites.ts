/**
 * Favorite-session sort helper — single source of truth for any UI that
 * lists "favorite sessions" (Dashboard widget, Preferences quick-switch,
 * future surfaces).
 *
 * Order:
 *   1. `updatedAt` DESC — most recently used first ("last used" proxy:
 *      every save / recalc / favorite-toggle bumps `updatedAt`).
 *   2. `name` ASC (locale-aware, case-insensitive) as a stable
 *      tiebreaker so two sessions saved within the same millisecond
 *      stay deterministically ordered between renders.
 *
 * Pure function — does not mutate the input array.
 */
import type { Session } from './types';

export function sortFavoriteSessions(sessions: readonly Session[]): Session[] {
  return [...sessions].sort((a, b) => {
    // updatedAt: ISO strings sort lexicographically the same as Date,
    // but parse defensively in case of legacy rows with bad data.
    const ta = Date.parse(a.updatedAt);
    const tb = Date.parse(b.updatedAt);
    const va = Number.isFinite(ta) ? ta : 0;
    const vb = Number.isFinite(tb) ? tb : 0;
    if (vb !== va) return vb - va; // DESC
    return (a.name ?? '').localeCompare(b.name ?? '', undefined, {
      sensitivity: 'base',
      numeric: true,
    });
  });
}

/** Convenience: filter + sort in one call. */
export function getSortedFavorites(sessions: readonly Session[]): Session[] {
  return sortFavoriteSessions(sessions.filter((s) => s.favorite));
}

/**
 * Compact "last used" relative-time label, locale-aware.
 * Used by both the Dashboard favorites widget and the Preferences
 * quick-switch list so the same session shows the same age string in
 * both places.
 *
 * Examples (fr): "à l'instant", "il y a 5 min", "il y a 3 h",
 *               "il y a 2 j", "il y a 4 sem".
 * Examples (en): "just now", "5m ago", "3h ago", "2d ago", "4w ago".
 */
export function formatLastUsed(iso: string | undefined, locale: 'fr' | 'en'): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const diffSec = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (diffSec < 60) return locale === 'fr' ? "à l'instant" : 'just now';
  const min = Math.round(diffSec / 60);
  if (min < 60) return locale === 'fr' ? `il y a ${min} min` : `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 24) return locale === 'fr' ? `il y a ${h} h` : `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return locale === 'fr' ? `il y a ${d} j` : `${d}d ago`;
  const w = Math.round(d / 7);
  if (w < 5) return locale === 'fr' ? `il y a ${w} sem` : `${w}w ago`;
  const mo = Math.round(d / 30);
  if (mo < 12) return locale === 'fr' ? `il y a ${mo} mois` : `${mo}mo ago`;
  const y = Math.round(d / 365);
  return locale === 'fr' ? `il y a ${y} an${y > 1 ? 's' : ''}` : `${y}y ago`;
}

/**
 * Return the "last used" session — the one with the most recent
 * `updatedAt`, falling back to `createdAt` if `updatedAt` is missing
 * or invalid (legacy rows). This is the canonical "Reprendre la
 * dernière session" target shared by:
 *   • the Dashboard "Dernière session" widget,
 *   • the Preferences "Reprendre" shortcut.
 *
 * Returns `null` when the store is empty.
 *
 * Why not just use `sessions[length - 1]`? Insertion order doesn't
 * track usage — opening, recalculating or favoriting a session bumps
 * `updatedAt`, so this function reflects what the user actually
 * touched last, not just what they saved last.
 */
export function getLastSession(sessions: readonly Session[]): Session | null {
  if (sessions.length === 0) return null;
  let best: Session | null = null;
  let bestT = -Infinity;
  for (const s of sessions) {
    const t = Date.parse(s.updatedAt) || Date.parse(s.createdAt) || 0;
    if (t > bestT) {
      bestT = t;
      best = s;
    }
  }
  return best;
}
