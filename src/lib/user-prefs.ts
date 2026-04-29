/**
 * Per-user / per-guest preference storage helpers.
 *
 * Why: things like locale, theme studio mode (Simple/Avancé), and theme
 * itself must persist between sessions on the same device — but they
 * should also feel personal: signing in as Alice on a shared device
 * shouldn't leak Bob's choices, and Alice should keep what she had as a
 * guest the moment she creates an account.
 *
 * Strategy:
 *   • Anonymous (guest) bucket → "<key>"               e.g. "pcp-locale"
 *   • Per-user bucket           → "<key>:<userId>"     e.g. "pcp-locale:abc"
 *
 * On first sign-in we migrate the guest value forward into the user
 * bucket if (and only if) the user bucket is empty. We also mirror every
 * write back into the guest bucket so the next page load — before auth
 * has resolved — applies the user's most recent choice instead of a
 * stale default. This matches the convention already established for
 * theme + theme customisation in `theme-constants.ts`.
 */
export function userScopedKey(base: string, userId: string | null | undefined): string {
  return userId ? `${base}:${userId}` : base;
}

/**
 * Read a string preference, falling back to the guest bucket when the
 * user bucket is empty (so first-sign-in users keep their selection).
 * Returns `null` when nothing is stored.
 */
export function readUserPref(base: string, userId: string | null | undefined): string | null {
  try {
    const userKey = userScopedKey(base, userId);
    const direct = localStorage.getItem(userKey);
    if (direct !== null) return direct;
    // Fall back to the guest bucket for first sign-in / migration.
    if (userId) return localStorage.getItem(base);
    return null;
  } catch {
    return null;
  }
}

/**
 * Write a string preference. Always mirrors the value into the guest
 * bucket so first-paint after reload (before auth resolves) sees the
 * latest choice instead of the default.
 */
export function writeUserPref(
  base: string,
  userId: string | null | undefined,
  value: string,
): void {
  try {
    localStorage.setItem(userScopedKey(base, userId), value);
    // Mirror to the guest bucket — see file header.
    localStorage.setItem(base, value);
  } catch {
    /* storage may be full or disabled — visuals still apply via context. */
  }
}

/**
 * On first sign-in (anonymous → user) seed the user bucket with the
 * guest value if the user has no per-user value yet. No-op when the user
 * already has stored prefs, so re-signing in never overwrites a previous
 * choice from a different device.
 */
export function migrateGuestPrefToUser(base: string, userId: string): void {
  try {
    const userKey = userScopedKey(base, userId);
    if (localStorage.getItem(userKey) !== null) return;
    const guest = localStorage.getItem(base);
    if (guest !== null) localStorage.setItem(userKey, guest);
  } catch {
    /* ignore */
  }
}
