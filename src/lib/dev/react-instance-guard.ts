/**
 * Dev-only guard against duplicate React instances and corrupted HMR state.
 *
 * Why this matters:
 *   • Two copies of React on the page break hooks with the dreaded
 *     "Cannot read properties of null (reading 'useState')" because each
 *     copy owns its own internals/dispatcher.
 *   • A botched Fast Refresh swap can leave the shared internals object
 *     without a current dispatcher, producing the same symptom even with
 *     a single React copy.
 *
 * What we do:
 *   1. On boot, stamp a unique token on the `React` internals object and
 *      stash it on `window`. A second module evaluation that sees a
 *      DIFFERENT token means two React instances are loaded — we log a
 *      loud error and force a full reload to recover cleanly.
 *   2. On every Vite HMR update we re-check the internals exist. If the
 *      dispatcher object went missing (the classic post-HMR corruption),
 *      we full-reload before the next render can crash.
 *
 * Safety:
 *   • No-op outside `import.meta.env.DEV`.
 *   • Reload is rate-limited via sessionStorage so we never enter a
 *     reload loop if the corruption is actually persistent.
 */

import * as React from 'react';

const STAMP_KEY = '__lovable_react_guard_stamp__';
const RELOAD_FLAG = '__lovable_react_guard_reloaded_at__';
const RELOAD_COOLDOWN_MS = 10_000;

type GuardedWindow = Window & {
  [STAMP_KEY]?: string;
};

/**
 * Token generated ONCE per JS module evaluation. Two evaluations (i.e. two
 * loaded copies of this module — typically from a duplicate React bundle)
 * yield two different tokens. The same evaluation calling
 * `installReactInstanceGuard()` multiple times keeps the same token, so
 * idempotent calls never trip the duplicate check.
 */
const MODULE_TOKEN = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// React's shared internals slot. Name differs slightly across versions
// (legacy "SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED") so we probe
// both. Typed loosely on purpose — this is a runtime smoke test.
function getInternals(): Record<string, unknown> | null {
  const r = React as unknown as Record<string, unknown>;
  return (
    (r.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE as
      | Record<string, unknown>
      | undefined) ??
    (r.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED as
      | Record<string, unknown>
      | undefined) ??
    null
  );
}

function safeReload(reason: string): void {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_FLAG) ?? '0');
    const now = Date.now();
    if (now - last < RELOAD_COOLDOWN_MS) {
      // Already reloaded recently — don't loop. Surface the issue instead.
      // eslint-disable-next-line no-console
      console.error(
        `[react-guard] ${reason} — skipping auto-reload (cooldown active). ` +
          `Fix the underlying issue or hard-refresh manually.`,
      );
      return;
    }
    sessionStorage.setItem(RELOAD_FLAG, String(now));
  } catch {
    /* sessionStorage may be unavailable — fall through and reload anyway */
  }
  // eslint-disable-next-line no-console
  console.warn(`[react-guard] ${reason} — forcing full reload to recover.`);
  window.location.reload();
}

export function installReactInstanceGuard(): void {
  if (!import.meta.env.DEV) return;
  if (typeof window === 'undefined') return;

  const w = window as GuardedWindow;
  const moduleToken = MODULE_TOKEN;

  const internals = getInternals();
  if (internals) {
    const existing = (internals as { __lovableStamp?: string }).__lovableStamp;
    if (existing && existing !== moduleToken && w[STAMP_KEY] && w[STAMP_KEY] !== existing) {
      // Two different React internals stamps observed on the same page.
      safeReload('Duplicate React instance detected');
      return;
    }
    if (!existing) {
      (internals as { __lovableStamp?: string }).__lovableStamp = moduleToken;
    }
  }

  if (w[STAMP_KEY] && w[STAMP_KEY] !== moduleToken && internals) {
    // Window already had a stamp from a previous React copy.
    safeReload('Multiple React module evaluations detected');
    return;
  }
  w[STAMP_KEY] = moduleToken;

  // Hook into Vite HMR: after every update, verify React internals are
  // still healthy. If the shared dispatcher slot disappeared, the next
  // hook call will throw — reload preemptively.
  if (import.meta.hot) {
    import.meta.hot.on('vite:afterUpdate', () => {
      const post = getInternals();
      if (!post) {
        safeReload('React internals missing after HMR update');
        return;
      }
      // The dispatcher key also changes between React versions; we just
      // assert SOMETHING is present in the internals bag.
      const keys = Object.keys(post);
      if (keys.length === 0) {
        safeReload('React internals emptied after HMR update');
      }
    });
  }
}