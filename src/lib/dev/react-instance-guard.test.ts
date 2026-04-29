import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as React from 'react';

/**
 * The guard is a dev-only side-effecting module. We can't easily simulate
 * "two React copies" in jsdom, but we CAN cover the install + cooldown
 * contract: stamping the window once, refusing to reload twice in quick
 * succession, and being a no-op outside DEV.
 */

describe('react-instance-guard', () => {
  beforeEach(() => {
    vi.resetModules();
    sessionStorage.clear();
    // Clean prior stamps from previous tests on the shared window AND on
    // the shared React internals object (it survives module resets).
    delete (window as unknown as Record<string, unknown>).__lovable_react_guard_stamp__;
    const r = React as unknown as Record<string, Record<string, unknown> | undefined>;
    const internals =
      r.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE ??
      r.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
    if (internals) delete (internals as Record<string, unknown>).__lovableStamp;
  });

  it('is idempotent: repeated installs in the same module evaluation never reload', async () => {
    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    });
    const mod = await import('./react-instance-guard');
    mod.installReactInstanceGuard();
    const w = window as unknown as Record<string, string | undefined>;
    expect(typeof w.__lovable_react_guard_stamp__).toBe('string');
    const first = w.__lovable_react_guard_stamp__;

    mod.installReactInstanceGuard();
    mod.installReactInstanceGuard();
    expect(w.__lovable_react_guard_stamp__).toBe(first);
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('detects a foreign window stamp and triggers safeReload', async () => {
    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    });
    // Simulate a previous React module evaluation having stamped both
    // the window and the React internals with a different token.
    const w = window as unknown as Record<string, string | undefined>;
    w.__lovable_react_guard_stamp__ = 'foreign-token-from-other-react';
    const r = React as unknown as Record<string, Record<string, unknown> | undefined>;
    const internals =
      r.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE ??
      r.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
    if (internals) (internals as Record<string, unknown>).__lovableStamp = 'foreign-token-from-other-react';

    const mod = await import('./react-instance-guard');
    mod.installReactInstanceGuard();

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('cooldown prevents reload loops', async () => {
    sessionStorage.setItem(
      '__lovable_react_guard_reloaded_at__',
      String(Date.now()),
    );
    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Even with a duplicate-instance condition, the cooldown flag must
    // suppress the reload to avoid an infinite loop.
    const w = window as unknown as Record<string, string | undefined>;
    w.__lovable_react_guard_stamp__ = 'foreign';
    const r = React as unknown as Record<string, Record<string, unknown> | undefined>;
    const internals =
      r.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE ??
      r.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
    if (internals) (internals as Record<string, unknown>).__lovableStamp = 'foreign';

    vi.resetModules();
    const mod = await import('./react-instance-guard');
    mod.installReactInstanceGuard();

    expect(reloadSpy).not.toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalled(); // cooldown logs an error
    errSpy.mockRestore();
  });
});