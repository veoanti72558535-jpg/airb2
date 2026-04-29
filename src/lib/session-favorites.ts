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
