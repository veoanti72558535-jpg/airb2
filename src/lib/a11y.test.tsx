/**
 * A11yProvider — class-application + persistence tests for the new
 * `reduceMotion` and `strongFocus` preferences.
 *
 * We render the provider with a tiny consumer that flips the toggles, then
 * assert:
 *   1. The corresponding class lands on `<html>` (theme-agnostic gate).
 *   2. The setting survives a remount (persisted via getSettings/saveSettings).
 *   3. Defaults are off so existing users see no behaviour change.
 */
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import { A11yProvider, useA11y } from './a11y';
import { getSettings, saveSettings } from './storage';

function Consumer({ onReady }: { onReady: (api: ReturnType<typeof useA11y>) => void }) {
  const api = useA11y();
  React.useEffect(() => { onReady(api); }, [api, onReady]);
  return null;
}

function renderProvider() {
  let api!: ReturnType<typeof useA11y>;
  const utils = render(
    <A11yProvider>
      <Consumer onReady={(a) => { api = a; }} />
    </A11yProvider>,
  );
  return { ...utils, getApi: () => api };
}

describe('A11yProvider — reduceMotion + strongFocus', () => {
  beforeEach(() => {
    cleanup();
    document.documentElement.className = '';
    // Reset persisted prefs so each test starts clean.
    try {
      const s = getSettings();
      saveSettings({ ...s, accessibility: { ...(s.accessibility ?? {}), reduceMotion: false, strongFocus: false } });
    } catch { /* storage may be unavailable */ }
  });

  it('defaults both options to OFF and sets no extra classes on <html>', () => {
    const { getApi } = renderProvider();
    expect(getApi().reduceMotion).toBe(false);
    expect(getApi().strongFocus).toBe(false);
    expect(document.documentElement.classList.contains('reduce-motion')).toBe(false);
    expect(document.documentElement.classList.contains('strong-focus')).toBe(false);
  });

  it('toggling reduceMotion adds `reduce-motion` to <html>', () => {
    const { getApi } = renderProvider();
    act(() => { getApi().setReduceMotion(true); });
    expect(document.documentElement.classList.contains('reduce-motion')).toBe(true);
    act(() => { getApi().setReduceMotion(false); });
    expect(document.documentElement.classList.contains('reduce-motion')).toBe(false);
  });

  it('toggling strongFocus adds `strong-focus` to <html>', () => {
    const { getApi } = renderProvider();
    act(() => { getApi().setStrongFocus(true); });
    expect(document.documentElement.classList.contains('strong-focus')).toBe(true);
  });

  it('persists both prefs through a full remount', () => {
    const first = renderProvider();
    act(() => {
      first.getApi().setReduceMotion(true);
      first.getApi().setStrongFocus(true);
    });
    first.unmount();
    document.documentElement.className = ''; // simulate cold reload
    const second = renderProvider();
    expect(second.getApi().reduceMotion).toBe(true);
    expect(second.getApi().strongFocus).toBe(true);
    expect(document.documentElement.classList.contains('reduce-motion')).toBe(true);
    expect(document.documentElement.classList.contains('strong-focus')).toBe(true);
  });

  it('the two flags are independent — toggling one does not move the other', () => {
    const { getApi } = renderProvider();
    act(() => { getApi().setReduceMotion(true); });
    expect(getApi().strongFocus).toBe(false);
    expect(document.documentElement.classList.contains('strong-focus')).toBe(false);
  });

  it('flags coexist with existing prefs (highContrast stays applied)', () => {
    const { getApi } = renderProvider();
    act(() => {
      getApi().setHighContrast(true);
      getApi().setReduceMotion(true);
      getApi().setStrongFocus(true);
    });
    const cl = document.documentElement.classList;
    expect(cl.contains('hc')).toBe(true);
    expect(cl.contains('reduce-motion')).toBe(true);
    expect(cl.contains('strong-focus')).toBe(true);
  });
});
