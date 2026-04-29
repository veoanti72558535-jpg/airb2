import { describe, it, expect, beforeEach } from 'vitest';
import { act, render, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nProvider, useI18n } from './i18n';
import { LOCALE_STORAGE_KEY } from './i18n-internals';

/**
 * Integration tests for the i18n provider's per-user persistence:
 *   - guest writes round-trip through localStorage
 *   - signing in (setUserId) migrates the guest value forward
 *   - signing out reverts to the guest bucket
 *   - two users on the same device do not leak each other's locale
 *   - re-mounting the provider (HMR analogue) restores the right locale
 */

function wrap({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

describe('I18nProvider — per-user locale persistence', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to French and persists guest writes', () => {
    const { result } = renderHook(() => useI18n(), { wrapper: wrap });
    expect(result.current.locale).toBe('fr');
    act(() => result.current.setLocale('en'));
    expect(result.current.locale).toBe('en');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en');
  });

  it('migrates the guest locale forward on first sign-in', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en'); // guest had English
    const { result } = renderHook(() => useI18n(), { wrapper: wrap });
    expect(result.current.locale).toBe('en');
    act(() => result.current.setUserId('alice'));
    // User bucket seeded with the guest value.
    expect(localStorage.getItem(`${LOCALE_STORAGE_KEY}:alice`)).toBe('en');
    expect(result.current.locale).toBe('en');
  });

  it('does NOT overwrite a pre-existing user locale on re-sign-in', () => {
    // Alice had previously chosen French while signed in.
    localStorage.setItem(`${LOCALE_STORAGE_KEY}:alice`, 'fr');
    // Guest later picked English on the same device.
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    const { result } = renderHook(() => useI18n(), { wrapper: wrap });
    act(() => result.current.setUserId('alice'));
    // Alice keeps her own previous choice.
    expect(result.current.locale).toBe('fr');
    expect(localStorage.getItem(`${LOCALE_STORAGE_KEY}:alice`)).toBe('fr');
  });

  it('isolates two users on the same device', () => {
    const { result } = renderHook(() => useI18n(), { wrapper: wrap });
    act(() => result.current.setUserId('alice'));
    act(() => result.current.setLocale('en'));
    act(() => result.current.setUserId('bob'));
    // Bob has no per-user value yet → falls back to the mirrored guest
    // bucket which currently holds Alice's last write.
    // Bob switches explicitly to French.
    act(() => result.current.setLocale('fr'));
    // Switching back to Alice restores her English choice.
    act(() => result.current.setUserId('alice'));
    expect(result.current.locale).toBe('en');
    act(() => result.current.setUserId('bob'));
    expect(result.current.locale).toBe('fr');
  });

  it('reverts to the guest bucket on sign-out', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    const { result } = renderHook(() => useI18n(), { wrapper: wrap });
    act(() => result.current.setUserId('alice'));
    act(() => result.current.setLocale('fr')); // alice → fr (mirrors to guest too)
    act(() => result.current.setUserId(null));
    // Guest bucket reflects the latest write.
    expect(result.current.locale).toBe('fr');
  });

  it('survives a remount (HMR analogue) by reading from storage', () => {
    const containerA = document.createElement('div');
    const containerB = document.createElement('div');
    document.body.appendChild(containerA);
    document.body.appendChild(containerB);

    function Probe({ onMount }: { onMount: (api: ReturnType<typeof useI18n>) => void }) {
      const api = useI18n();
      onMount(api);
      return <span data-testid="locale">{api.locale}</span>;
    }

    let api1!: ReturnType<typeof useI18n>;
    const { unmount } = render(
      <I18nProvider><Probe onMount={(a) => (api1 = a)} /></I18nProvider>,
      { container: containerA, baseElement: containerA },
    );
    act(() => api1.setLocale('en'));
    unmount();

    let api2!: ReturnType<typeof useI18n>;
    render(
      <I18nProvider><Probe onMount={(a) => (api2 = a)} /></I18nProvider>,
      { container: containerB, baseElement: containerB },
    );
    expect(api2.locale).toBe('en');
  });
});
