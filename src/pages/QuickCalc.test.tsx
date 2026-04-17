import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { I18nProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import QuickCalc from '@/pages/QuickCalc';
import { sessionStore } from '@/lib/storage';
import type { Session } from '@/lib/types';

/**
 * Smoke tests for QuickCalc — focused on the rehydration contract:
 *   /calc?session=<id>  must restore a saved session into the form,
 *   even when the session is "legacy" (missing dragModel, focalPlane,
 *   weather, etc.).
 *
 * We mock the heavy section components to keep the test fast & focused
 * on the rehydration logic itself rather than the full form UI.
 */

// Stub all heavy child sections — we only care that QuickCalc reads
// the URL, fetches the session and surfaces a loaded toast.
vi.mock('@/components/calc/ProjectileSection', () => ({
  ProjectileSection: () => <div data-testid="projectile-section" />,
}));
vi.mock('@/components/calc/VelocitySection', () => ({
  VelocitySection: () => <div data-testid="velocity-section" />,
}));
vi.mock('@/components/calc/WeaponSection', () => ({
  WeaponSection: () => <div data-testid="weapon-section" />,
}));
vi.mock('@/components/calc/OpticSection', () => ({
  OpticSection: () => <div data-testid="optic-section" />,
}));
vi.mock('@/components/calc/EnvironmentSection', () => ({
  EnvironmentSection: () => <div data-testid="environment-section" />,
}));
vi.mock('@/components/calc/DistanceSection', () => ({
  DistanceSection: () => <div data-testid="distance-section" />,
}));
vi.mock('@/components/calc/ZeroingSection', () => ({
  ZeroingSection: () => <div data-testid="zeroing-section" />,
}));
vi.mock('@/components/calc/ResultsCard', () => ({
  ResultsCard: ({ results }: { results: unknown }) => (
    <div data-testid="results-card">{results ? 'has-results' : 'no-results'}</div>
  ),
}));
vi.mock('@/components/compare/SessionPickerDialog', () => ({
  SessionPickerDialog: () => null,
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
    info: vi.fn(),
  },
}));

function renderAt(path: string) {
  return render(
    <ThemeProvider>
      <I18nProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/calc" element={<QuickCalc />} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    </ThemeProvider>,
  );
}

function makeLegacySession(overrides: Partial<Session> = {}): Session {
  // Intentionally minimal — no dragModel, no focalPlane, no zeroWeather,
  // no twistRate, no projectile/optic/airgun ids. This is the shape that
  // older builds wrote to localStorage.
  return {
    id: 'legacy-session-1',
    name: 'Legacy Session',
    input: {
      muzzleVelocity: 280,
      bc: 0.025,
      projectileWeight: 18,
      sightHeight: 50,
      zeroRange: 30,
      maxRange: 50,
      rangeStep: 10,
      // legacy weather: only the bare minimum
      weather: {
        temperature: 15,
        humidity: 50,
        pressure: 1013,
        altitude: 0,
        windSpeed: 0,
        windAngle: 0,
        source: 'manual',
        timestamp: '',
      },
    },
    results: [
      {
        range: 0, drop: -50, holdover: 0, holdoverMRAD: 0,
        velocity: 280, energy: 16, tof: 0, windDrift: 0,
        windDriftMOA: 0, windDriftMRAD: 0,
      },
      {
        range: 50, drop: -1051.9, holdover: 21.03, holdoverMRAD: 21.03,
        velocity: 37, energy: 0.8, tof: 0.585, windDrift: 648.5,
        windDriftMOA: 0, windDriftMRAD: 0,
      },
    ],
    tags: [],
    favorite: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('QuickCalc — rehydration from ?session=', () => {
  beforeEach(() => {
    localStorage.clear();
    toastSuccess.mockClear();
    toastError.mockClear();
  });

  it('rehydrates a legacy session and shows the loaded toast', async () => {
    const legacy = makeLegacySession();
    localStorage.setItem('pcp-sessions', JSON.stringify([legacy]));

    renderAt('/calc?session=legacy-session-1');

    // The page mounts (heavy sections stubbed) without crashing.
    expect(screen.getByTestId('projectile-section')).toBeInTheDocument();

    // Rehydration triggers a success toast that mentions the session name.
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalled();
    });
    const [, payload] = toastSuccess.mock.calls[0];
    expect(payload).toMatchObject({ description: 'Legacy Session' });

    // Saved results were restored — the card shows 'has-results'.
    expect(screen.getByTestId('results-card').textContent).toBe('has-results');
  });

  it('shows an error toast and does not crash when ?session= points to a missing id', async () => {
    // Empty store — id "ghost" does not exist.
    localStorage.setItem('pcp-sessions', JSON.stringify([]));

    renderAt('/calc?session=ghost');

    await waitFor(() => {
      expect(toastError).toHaveBeenCalled();
    });
    expect(toastSuccess).not.toHaveBeenCalled();
    // Page is still rendered — no rehydration crash.
    expect(screen.getByTestId('projectile-section')).toBeInTheDocument();
  });

  it('does not toast when no ?session= param is present', async () => {
    renderAt('/calc');
    // give the rehydration effect a chance to (not) run
    await new Promise(r => setTimeout(r, 10));
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });

  it('rehydrates a session that already has explicit modern fields', async () => {
    const modern = makeLegacySession({
      id: 'modern-1',
      name: 'Modern Session',
      input: {
        ...makeLegacySession().input,
        dragModel: 'G7',
        focalPlane: 'SFP',
        clickValue: 0.25,
        clickUnit: 'MOA',
        currentMag: 12,
        magCalibration: 10,
      },
    });
    sessionStore; // ensure import is referenced (helps lint)
    localStorage.setItem('pcp-sessions', JSON.stringify([modern]));

    renderAt('/calc?session=modern-1');

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalled();
    });
    const [, payload] = toastSuccess.mock.calls[0];
    expect(payload).toMatchObject({ description: 'Modern Session' });
  });
});
