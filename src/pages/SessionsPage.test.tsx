import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { I18nProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import { AuthProvider } from '@/lib/auth-context';
import SessionsPage from '@/pages/SessionsPage';
import type { Session } from '@/lib/types';

/**
 * Smoke tests for SessionsPage — focused on the compare flow:
 *   - selection mode toggle
 *   - selecting exactly two cards
 *   - "Compare (2)" navigates to /compare?a=…&b=…
 *
 * We capture navigation via a sentinel route inside MemoryRouter so we
 * can assert the resulting URL without mocking react-router internals.
 */

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

function makeSession(id: string, name: string, mv: number): Session {
  return {
    id,
    name,
    input: {
      muzzleVelocity: mv,
      bc: 0.025,
      projectileWeight: 18,
      sightHeight: 50,
      zeroRange: 30,
      maxRange: 50,
      rangeStep: 10,
      weather: {
        temperature: 15, humidity: 50, pressure: 1013, altitude: 0,
        windSpeed: 0, windAngle: 0, source: 'manual', timestamp: '',
      },
    },
    results: [],
    tags: [],
    favorite: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

function ComparePathProbe() {
  // Renders the search string so tests can assert on a/b ids.
  // useLocation reflects MemoryRouter's internal history — window.location
  // is NOT updated by MemoryRouter, so we must read from the hook.
  const loc = useLocation();
  return <div data-testid="compare-probe">{loc.search}</div>;
}

function renderApp() {
  return render(
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={['/sessions']}>
            <Routes>
              <Route path="/sessions" element={<SessionsPage />} />
              <Route path="/compare" element={<ComparePathProbe />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>,
  );
}

describe('SessionsPage — compare flow', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('disables "Mode sélection" when fewer than 2 sessions exist', () => {
    localStorage.setItem('pcp-sessions', JSON.stringify([makeSession('a', 'Only One', 280)]));
    renderApp();
    const btn = screen.getByRole('button', { name: /Mode sélection|Selection mode/i });
    expect(btn).toBeDisabled();
  });

  it('enables selection mode and reveals checkboxes when ≥ 2 sessions exist', () => {
    localStorage.setItem('pcp-sessions', JSON.stringify([
      makeSession('a', 'Session A', 280),
      makeSession('b', 'Session B', 320),
    ]));
    renderApp();

    const enter = screen.getByRole('button', { name: /Mode sélection|Selection mode/i });
    expect(enter).not.toBeDisabled();
    fireEvent.click(enter);

    // Two checkboxes appear (one per card) with aria-labels we set.
    expect(screen.getByLabelText('Select Session A')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Session B')).toBeInTheDocument();

    // Compare button is initially "(0)" and disabled.
    const compareBtn = screen.getByRole('button', { name: /Comparer \(0\)|Compare \(0\)/ });
    expect(compareBtn).toBeDisabled();
  });

  it('navigates to /compare?a=…&b=… after checking exactly 2 sessions', () => {
    localStorage.setItem('pcp-sessions', JSON.stringify([
      makeSession('id-a', 'Session A', 280),
      makeSession('id-b', 'Session B', 320),
    ]));
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: /Mode sélection|Selection mode/i }));
    fireEvent.click(screen.getByLabelText('Select Session A'));
    fireEvent.click(screen.getByLabelText('Select Session B'));

    const compareBtn = screen.getByRole('button', { name: /Comparer \(2\)|Compare \(2\)/ });
    expect(compareBtn).not.toBeDisabled();
    fireEvent.click(compareBtn);

    // Probe component rendered → navigation succeeded.
    const probe = screen.getByTestId('compare-probe');
    expect(probe.textContent).toContain('a=id-a');
    expect(probe.textContent).toContain('b=id-b');
  });

  it('caps selection at 2 — extra clicks do not add more than 2 ids', () => {
    localStorage.setItem('pcp-sessions', JSON.stringify([
      makeSession('id-a', 'Session A', 280),
      makeSession('id-b', 'Session B', 320),
      makeSession('id-c', 'Session C', 300),
    ]));
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: /Mode sélection|Selection mode/i }));
    fireEvent.click(screen.getByLabelText('Select Session A'));
    fireEvent.click(screen.getByLabelText('Select Session B'));
    fireEvent.click(screen.getByLabelText('Select Session C'));

    // The button must still read "(2)", not "(3)".
    expect(screen.getByRole('button', { name: /Comparer \(2\)|Compare \(2\)/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Comparer \(3\)|Compare \(3\)/ })).not.toBeInTheDocument();
  });

  it('exits selection mode and clears the selection', () => {
    localStorage.setItem('pcp-sessions', JSON.stringify([
      makeSession('id-a', 'Session A', 280),
      makeSession('id-b', 'Session B', 320),
    ]));
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: /Mode sélection|Selection mode/i }));
    fireEvent.click(screen.getByLabelText('Select Session A'));
    fireEvent.click(screen.getByRole('button', { name: /Quitter la sélection|Exit selection/i }));

    // Back to non-selection mode → re-entering shows the entry button again.
    expect(
      screen.getByRole('button', { name: /Mode sélection|Selection mode/i }),
    ).toBeInTheDocument();
    // Checkbox is gone (we exited selection mode).
    expect(screen.queryByLabelText('Select Session A')).not.toBeInTheDocument();
  });
});

// Silence "within" import lint when not used in some assertions
void within;
