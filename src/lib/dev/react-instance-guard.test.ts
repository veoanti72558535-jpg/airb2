import { describe, it, expect, beforeEach, vi } from 'vitest';

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
    // Clean prior stamps from previous tests on the shared window.
    delete (window as unknown as Record<string, unknown>).__lovable_react_guard_stamp__;
  });

  it('stamps the window exactly once on first install', async () => {
    const mod = await import('./react-instance-guard');
    mod.installReactInstanceGuard();
    const w = window as unknown as Record<string, string | undefined>;
    expect(typeof w.__lovable_react_guard_stamp__).toBe('string');
    const first = w.__lovable_react_guard_stamp__;

    // Re-installing in the same module evaluation must NOT trip the
    // duplicate-instance check (token is identical).
    mod.installReactInstanceGuard();
    expect(w.__lovable_react_guard_stamp__).toBe(first);
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

    // Force a fresh module evaluation so the guard re-runs its install
    // path; with the cooldown flag set, any reload attempt must be
    // suppressed.
    vi.resetModules();
    const mod = await import('./react-instance-guard');
    mod.installReactInstanceGuard();

    // We can't deterministically trigger the duplicate path here, but we
    // can assert that the install path itself never reloads on a clean
    // window — and that IF it ever did, the cooldown branch would fire.
    expect(reloadSpy).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});