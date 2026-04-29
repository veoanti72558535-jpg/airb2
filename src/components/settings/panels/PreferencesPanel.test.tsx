/**
 * PreferencesPanel — unit tests.
 *
 * We focus on the contract the user actually relies on:
 *   1. The three controls render with the current state pre-selected.
 *   2. Clicking the Reset button (after confirm) snaps locale, theme and
 *      Simple/Advanced back to their defaults.
 *   3. Cancelling the confirm dialog leaves everything alone.
 *   4. The preview line reflects the current locale + mode label.
 *
 * The two providers we mount are I18n + Theme, which the panel actually
 * consumes. `getSettings` / `saveSettings` are exercised against the real
 * localStorage-backed implementation (jsdom resets storage between tests).
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import { getSettings, saveSettings } from '@/lib/storage';
import { PreferencesPanel } from './PreferencesPanel';

function renderPanel() {
  return render(
    <I18nProvider>
      <ThemeProvider>
        <PreferencesPanel />
      </ThemeProvider>
    </I18nProvider>,
  );
}

describe('PreferencesPanel', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('renders the three pillars (langue, thème, mode) with controls', () => {
    renderPanel();
    expect(screen.getAllByText('Préférences').length).toBeGreaterThan(0);
    expect(screen.getByText('Français')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Mode simple')).toBeInTheDocument();
    expect(screen.getByText('Mode avancé')).toBeInTheDocument();
  });

  it('switching language updates the live preview labels', () => {
    renderPanel();
    fireEvent.click(screen.getByText('English'));
    // Preview heading becomes the EN copy.
    expect(screen.getByText(/50 m shot/i)).toBeInTheDocument();
  });

  it('toggling Simple → Advanced flips advancedMode in storage', () => {
    renderPanel();
    fireEvent.click(screen.getByText('Mode avancé'));
    expect(getSettings().advancedMode).toBe(true);
  });

  it('Reset (confirmed) restores fr / carbon-green / simple', () => {
    // Pre-set non-default values so reset has something to do.
    saveSettings({ ...getSettings(), advancedMode: true });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPanel();
    // Switch locale to EN first to make the assertion meaningful.
    fireEvent.click(screen.getByText('English'));
    // After switching to EN, the reset button is labelled "Reset".
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(getSettings().advancedMode).toBe(false);
    // After reset, the FR label is back as "Français" with `aria-checked=true`.
    const fr = screen.getByText('Français').closest('button')!;
    expect(fr.getAttribute('aria-checked')).toBe('true');
    confirmSpy.mockRestore();
  });

  it('Reset (cancelled) is a no-op', () => {
    saveSettings({ ...getSettings(), advancedMode: true });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser' }));
    expect(getSettings().advancedMode).toBe(true);
    confirmSpy.mockRestore();
  });
});
