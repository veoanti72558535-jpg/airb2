import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ThemeProvider, useTheme } from './theme';
import {
  THEME_STORAGE_KEY,
  THEME_CUSTOM_STORAGE_KEY,
  type ThemeId,
} from './theme-constants';

/**
 * Unit + integration tests for `ThemeProvider`.
 *
 * What we explicitly cover:
 *   1. The provider mounts without throwing — guards against the regression
 *      where mixing component + non-component exports made Fast Refresh
 *      blow up `useState` with "Cannot read properties of null".
 *   2. Theme selection round-trips through `localStorage`.
 *   3. Customisation overrides round-trip and patch correctly (incl.
 *      explicit `null` clearing a single key).
 *   4. Re-mounting the provider — the closest analogue to a Fast Refresh
 *      module swap we can simulate in jsdom — restores both the chosen
 *      theme and any customisation from storage. This proves the provider
 *      survives the full unmount → remount cycle without losing user
 *      state, which is the user-facing promise of HMR.
 *   5. Re-mounting with a corrupted storage payload falls back cleanly
 *      to defaults instead of crashing the tree.
 */

function wrap({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function ThemeProbe() {
  const { theme, isDark, custom } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="dark">{String(isDark)}</span>
      <span data-testid="accent">{custom.accentHex ?? 'auto'}</span>
      <span data-testid="density">{custom.density ?? 'cosy'}</span>
    </div>
  );
}

describe('ThemeProvider — mount safety', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('dark', 'light');
  });

  it('mounts without throwing on a fresh storage', () => {
    expect(() =>
      render(
        <ThemeProvider>
          <ThemeProbe />
        </ThemeProvider>,
      ),
    ).not.toThrow();
    // Default theme is dark.
    expect(screen.getByTestId('theme').textContent).toBe('carbon-green');
    expect(document.documentElement.getAttribute('data-theme')).toBe('carbon-green');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('useTheme outside the provider throws a clear error', () => {
    // Suppress React's error-boundary noise for this single negative case.
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useTheme())).toThrow(
      /useTheme must be used within ThemeProvider/,
    );
    err.mockRestore();
  });

  it('falls back to default when storage is corrupted', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'not-a-real-theme');
    localStorage.setItem(THEME_CUSTOM_STORAGE_KEY, '{not json');
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme').textContent).toBe('carbon-green');
    expect(screen.getByTestId('accent').textContent).toBe('auto');
  });

  it('migrates legacy "dark" / "light" stored values', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    const { unmount } = render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme').textContent).toBe('slate-light');
    unmount();

    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme').textContent).toBe('carbon-green');
  });
});

describe('ThemeProvider — selection persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists the selected theme to localStorage and reapplies on remount', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: wrap });
    act(() => result.current.setTheme('desert-tan'));
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('desert-tan');

    // Simulate an HMR-style remount: same module, fresh tree, storage intact.
    const { result: remounted } = renderHook(() => useTheme(), { wrapper: wrap });
    expect(remounted.current.theme).toBe('desert-tan');
    expect(remounted.current.isDark).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('desert-tan');
  });

  it('toggleTheme flips between dark and light branches', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: wrap });
    const start = result.current.theme;
    act(() => result.current.toggleTheme());
    expect(result.current.theme).not.toBe(start);
    // Next toggle returns to the dark default branch.
    act(() => result.current.toggleTheme());
    expect(['carbon-green', 'slate-light']).toContain(result.current.theme as ThemeId);
  });
});

describe('ThemeProvider — customisation persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('updateCustom round-trips through storage', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: wrap });
    act(() =>
      result.current.updateCustom({
        accentHex: '#3B82F6',
        density: 'comfortable',
        fontScale: 1.1,
      }),
    );

    const stored = JSON.parse(localStorage.getItem(THEME_CUSTOM_STORAGE_KEY) ?? '{}');
    expect(stored.accentHex).toBe('#3B82F6');
    expect(stored.density).toBe('comfortable');
    expect(stored.fontScale).toBeCloseTo(1.1, 5);

    // Remount and assert state hydrates from storage (HMR-survival contract).
    const { result: remounted } = renderHook(() => useTheme(), { wrapper: wrap });
    expect(remounted.current.custom.accentHex).toBe('#3B82F6');
    expect(remounted.current.custom.density).toBe('comfortable');
  });

  it('passing null for a key clears just that override', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: wrap });
    act(() => result.current.updateCustom({ accentHex: '#22C55E', density: 'compact' }));
    act(() => result.current.updateCustom({ accentHex: null }));

    expect(result.current.custom.accentHex).toBeUndefined();
    expect(result.current.custom.density).toBe('compact');
    const stored = JSON.parse(localStorage.getItem(THEME_CUSTOM_STORAGE_KEY) ?? '{}');
    expect(stored.accentHex).toBeUndefined();
    expect(stored.density).toBe('compact');
  });

  it('resetCustom wipes every override and storage entry', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: wrap });
    act(() => result.current.updateCustom({ accentHex: '#EF4444', radius: 'soft' }));
    act(() => result.current.resetCustom());

    expect(result.current.custom).toEqual({});
    expect(localStorage.getItem(THEME_CUSTOM_STORAGE_KEY)).toBe('{}');
  });

  it('applies accent override to the document root as --primary', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: wrap });
    act(() => result.current.updateCustom({ accentHex: '#ff0000' }));
    // hexToHslTokens('#ff0000') === '0 100% 50%'
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('0 100% 50%');
    expect(document.documentElement.style.getPropertyValue('--ring')).toBe('0 100% 50%');

    act(() => result.current.updateCustom({ accentHex: null }));
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('');
  });
});

describe('ThemeProvider — HMR remount integration', () => {
  // The most damaging HMR regression we shipped surfaced as
  // `useState of null` thrown DURING render of `ThemeProvider` after a
  // module swap. We can't trigger Vite's swap inside vitest, but we CAN
  // exercise the equivalent React lifecycle: tree unmount + fresh mount
  // of the same module — which is exactly what Fast Refresh does when it
  // can't preserve state. If the provider is structured correctly
  // (components-only, no stale dispatcher captured in a closure) this
  // round trips cleanly N times without throwing.

  beforeEach(() => {
    localStorage.clear();
  });

  it('survives 5 consecutive unmount → remount cycles with state intact', () => {
    let probe: ReturnType<typeof render> | null = null;

    // Initial setup: pick a non-default theme + customisation.
    probe = render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    const { result } = renderHook(() => useTheme(), { wrapper: wrap });
    act(() => {
      result.current.setTheme('tactical-dark');
      result.current.updateCustom({ accentHex: '#A855F7', density: 'compact' });
    });
    probe.unmount();

    for (let i = 0; i < 5; i++) {
      const r = render(
        <ThemeProvider>
          <ThemeProbe />
        </ThemeProvider>,
      );
      // Both selection AND customisation must survive each cycle.
      expect(r.getByTestId('theme').textContent).toBe('tactical-dark');
      expect(r.getByTestId('accent').textContent).toBe('#A855F7');
      expect(r.getByTestId('density').textContent).toBe('compact');
      // Document attributes were re-applied by the new effect.
      expect(document.documentElement.getAttribute('data-theme')).toBe('tactical-dark');
      expect(document.documentElement.style.getPropertyValue('--primary')).not.toBe('');
      r.unmount();
    }
  });

  it('two ThemeProviders mounted in parallel each see the same persisted state', () => {
    // Edge case: a stray double-mount (which can happen mid-HMR) must not
    // produce divergent UI. Both probes should agree on the theme.
    const { result } = renderHook(() => useTheme(), { wrapper: wrap });
    act(() => result.current.setTheme('slate-light'));

    const containerA = document.body.appendChild(document.createElement('div'));
    const containerB = document.body.appendChild(document.createElement('div'));
    const a = render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
      { container: containerA, baseElement: containerA },
    );
    const b = render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
      { container: containerB, baseElement: containerB },
    );
    // Scope queries to each tree's baseElement so duplicate test-ids
    // across the parallel mounts don't trip getByTestId.
    expect(a.getByTestId('theme').textContent).toBe('slate-light');
    expect(b.getByTestId('theme').textContent).toBe('slate-light');
    a.unmount();
    b.unmount();
  });
});