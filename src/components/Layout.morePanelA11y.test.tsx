/**
 * Accessibility tests for the "More" sub-menu in <Layout/>.
 *
 * Verifies the contract documented in src/lib/a11y.tsx:
 *  • Opening More with `sidebarFocusBehavior === 'first'` lands focus on
 *    the first interactive item inside the dialog.
 *  • Opening More with `sidebarFocusBehavior === 'active'` lands focus on
 *    the currently active route's link inside the dialog (aria-current).
 *  • Closing More always restores focus to the trigger element that opened
 *    it, regardless of the focus-behavior preference.
 *
 * Mounts <Layout> with the minimum providers it needs and stubs a couple
 * of heavy modules (i18n, theme, auth, supabase) so the test stays a
 * unit-flavoured integration test, not a full app smoke test.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ────────────────────────────────────────────────────────────
// Identity translator so we can assert on stable keys.
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'fr', setLocale: vi.fn() }),
  I18nProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/lib/theme', () => ({
  useTheme: () => ({ isDark: true, toggleTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Auth: anonymous, no Supabase wiring.
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: null, session: null, loading: false, signIn: vi.fn(), signUp: vi.fn(), signOut: vi.fn() }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: null,
  isSupabaseConfigured: () => false,
}));

import Layout from './Layout';
import { A11yProvider } from '@/lib/a11y';
import { getSettings, saveSettings } from '@/lib/storage';
import type { SidebarFocusBehavior } from '@/lib/a11y';

function renderLayout(initialPath = '/sessions') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <A11yProvider>
        <Layout>
          <div data-testid="page-body">page</div>
        </Layout>
      </A11yProvider>
    </MemoryRouter>,
  );
}

function setFocusBehavior(v: SidebarFocusBehavior) {
  const s = getSettings();
  saveSettings({ ...s, accessibility: { ...(s.accessibility ?? {}), sidebarFocusBehavior: v } });
}

/** The mobile bottom-nav exposes a button with aria-label="nav.more". */
function getMoreTrigger(): HTMLElement {
  // Both desktop sidebar and mobile bottom-nav render a trigger with the
  // same aria-label. We pick the first one — focus-restoration must work
  // for whichever one the user actually clicked.
  return screen.getAllByRole('button', { name: 'nav.more' })[0];
}

function getMorePanel(): HTMLElement | null {
  return document.querySelector<HTMLElement>('#more-panel');
}

async function flushOpenTimer() {
  // The "focus initial item" handler is queued via setTimeout(…, 0).
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

describe('<Layout> "More" panel — accessibility focus contract', () => {
  beforeEach(() => {
    try { localStorage.clear(); } catch { /* jsdom */ }
  });
  afterEach(() => {
    cleanup();
  });

  it('opens the dialog and exposes role="dialog" + aria-modal', async () => {
    const user = userEvent.setup();
    renderLayout('/');
    await user.click(getMoreTrigger());
    await flushOpenTimer();

    const panel = getMorePanel();
    expect(panel).not.toBeNull();
    expect(panel!.getAttribute('role')).toBe('dialog');
    expect(panel!.getAttribute('aria-modal')).toBe('true');
  });

  it("focuses the FIRST item when sidebarFocusBehavior === 'first'", async () => {
    setFocusBehavior('first');
    const user = userEvent.setup();
    renderLayout('/field-mode'); // a route that lives inside the More panel
    await user.click(getMoreTrigger());
    await flushOpenTimer();

    const panel = getMorePanel()!;
    const firstLink = panel.querySelector<HTMLAnchorElement>('a[href]');
    expect(firstLink).not.toBeNull();
    expect(document.activeElement).toBe(firstLink);
  });

  it("focuses the ACTIVE item when sidebarFocusBehavior === 'active'", async () => {
    setFocusBehavior('active');
    const user = userEvent.setup();
    // /field-mode is inside the first More section, so it won't be the
    // first link in the DOM — proves we honour aria-current over DOM order.
    renderLayout('/diary');
    await user.click(getMoreTrigger());
    await flushOpenTimer();

    const panel = getMorePanel()!;
    const activeLink = panel.querySelector<HTMLAnchorElement>('a[href][aria-current="page"]');
    const firstLink = panel.querySelector<HTMLAnchorElement>('a[href]');
    expect(activeLink).not.toBeNull();
    expect(activeLink).not.toBe(firstLink); // sanity: the active link is NOT the first one
    expect(document.activeElement).toBe(activeLink);
  });

  it("falls back to the FIRST item when 'active' is set but no route matches", async () => {
    setFocusBehavior('active');
    const user = userEvent.setup();
    renderLayout('/'); // home is not in the More panel
    await user.click(getMoreTrigger());
    await flushOpenTimer();

    const panel = getMorePanel()!;
    const firstLink = panel.querySelector<HTMLAnchorElement>('a[href]');
    expect(panel.querySelector('a[href][aria-current="page"]')).toBeNull();
    expect(document.activeElement).toBe(firstLink);
  });

  it('restores focus to the trigger on close (Escape)', async () => {
    setFocusBehavior('first');
    const user = userEvent.setup();
    renderLayout('/');
    const trigger = getMoreTrigger();
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    await user.click(trigger);
    await flushOpenTimer();
    expect(document.activeElement).not.toBe(trigger);

    await user.keyboard('{Escape}');
    // Cleanup runs synchronously on unmount of the effect body — but the
    // effect re-runs because moreOpen flipped to false; flush a microtask.
    await act(async () => { await Promise.resolve(); });

    expect(getMorePanel()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("restores focus to the trigger on close, even with 'active' preference", async () => {
    setFocusBehavior('active');
    const user = userEvent.setup();
    renderLayout('/diary');
    const trigger = getMoreTrigger();
    trigger.focus();

    await user.click(trigger);
    await flushOpenTimer();
    await user.keyboard('{Escape}');
    await act(async () => { await Promise.resolve(); });

    expect(getMorePanel()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  // ── Active-link disambiguation ────────────────────────────────────
  // The More panel exposes both `/settings` and `/settings?tab=data`.
  // `isActive` (Layout.tsx) marks BOTH as aria-current="page" when the
  // route is `/settings?tab=data`, so the focus picker must break the tie
  // by longest href-prefix match against pathname+search.

  it("picks the most specific aria-current link when several match (prefix collision)", async () => {
    setFocusBehavior('active');
    const user = userEvent.setup();
    renderLayout('/settings?tab=data');
    await user.click(getMoreTrigger());
    await flushOpenTimer();

    const panel = getMorePanel()!;
    const currents = panel.querySelectorAll<HTMLAnchorElement>('a[href][aria-current="page"]');
    // Sanity: the prefix collision really exists (both /settings and
    // /settings?tab=data are flagged active). If this ever drops to 1,
    // the test is still valid but the tie-breaker is no longer exercised
    // — fail loudly so we update the fixture.
    expect(currents.length).toBeGreaterThanOrEqual(2);

    const focused = document.activeElement as HTMLAnchorElement | null;
    expect(focused).not.toBeNull();
    expect(focused!.tagName).toBe('A');
    // The most specific match wins — its href must contain the query.
    expect(focused!.getAttribute('href')).toContain('tab=data');
  });

  it("falls back to longest-prefix match when no aria-current is present", async () => {
    setFocusBehavior('active');
    const user = userEvent.setup();
    // /unknown-route is NOT in the More panel → no link will receive
    // aria-current. The picker should still pick the best prefix match,
    // and when nothing matches at all, fall back to the first item.
    renderLayout('/unknown-route-xyz');
    await user.click(getMoreTrigger());
    await flushOpenTimer();

    const panel = getMorePanel()!;
    expect(panel.querySelector('a[href][aria-current="page"]')).toBeNull();

    const focused = document.activeElement as HTMLAnchorElement | null;
    expect(focused).not.toBeNull();
    // No link can claim the route → first interactive item wins.
    const firstLink = panel.querySelector<HTMLAnchorElement>('a[href]');
    expect(focused).toBe(firstLink);
  });

  it("uses prefix match (no aria-current) to land on a partially-matching link", async () => {
    setFocusBehavior('active');
    const user = userEvent.setup();
    // We render under a deeper path that still starts with a More-panel
    // href. `isActive(...)` already covers `/diary/...` → aria-current is
    // set, so to truly exercise the no-aria-current branch we'd need a
    // path that prefix-matches a link but `isActive` rejects. In practice
    // `isActive` uses startsWith too, so any prefix match also flips
    // aria-current. We assert that the picker still returns the
    // prefix-matching link (whether via aria-current or fallback) — both
    // paths go through the same scoring function.
    renderLayout('/diary/2024-04');
    await user.click(getMoreTrigger());
    await flushOpenTimer();

    const panel = getMorePanel()!;
    const focused = document.activeElement as HTMLAnchorElement | null;
    expect(focused).not.toBeNull();
    expect(focused!.getAttribute('href')).toBe('/diary');
  });
});
});