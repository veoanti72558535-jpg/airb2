import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { I18nProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import { AuthProvider } from '@/lib/auth-context';
import ComparePage from '@/pages/ComparePage';
import type { Session } from '@/lib/types';

/**
 * Smoke tests for ComparePage — focused on the resilience paths:
 *   - missing ids in the URL                    → EmptyState
 *   - one id resolves, the other doesn't       → MissingState
 *   - both resolve but one is "legacy"         → renders without crash
 *
 * The full render path (with framer-motion, html-to-image, etc.) must
 * stay green; we don't assert on layout, only that the right branch is
 * picked and no error bubbles up.
 */

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// html-to-image is loaded lazily inside the export handler so it never
// runs in these tests, but mocking it keeps the import side-effect free.
vi.mock('html-to-image', () => ({
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,'),
}));

function makeSession(
  id: string,
  name: string,
  overrides: Partial<Session['input']> = {},
): Session {
  return {
    id,
    name,
    input: {
      muzzleVelocity: 280,
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
      ...overrides,
    },
    results: [
      {
        range: 0, drop: -50, holdover: 0, holdoverMRAD: 0,
        velocity: 280, energy: 16, tof: 0, windDrift: 0,
        windDriftMOA: 0, windDriftMRAD: 0,
      },
      {
        range: 50, drop: -1000, holdover: 20, holdoverMRAD: 20,
        velocity: 40, energy: 1, tof: 0.5, windDrift: 100,
        windDriftMOA: 0, windDriftMRAD: 0,
      },
    ],
    tags: [],
    favorite: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

function renderAt(path: string) {
  return render(
    <AuthProvider>
      <ThemeProvider>
        <I18nProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/compare" element={<ComparePage />} />
            </Routes>
          </MemoryRouter>
        </I18nProvider>
      </ThemeProvider>
    </AuthProvider>,
  );
}

describe('ComparePage — resilience', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the EmptyState when neither ?a nor ?b is present', () => {
    renderAt('/compare');
    // EmptyState shows the "select exactly two" hint.
    expect(
      screen.getByText(/Sélectionnez exactement 2 sessions|Select exactly 2 sessions/i),
    ).toBeInTheDocument();
  });

  it('renders the MissingState when an id does not resolve to a session', () => {
    // Store contains "real" but URL asks for "ghost".
    localStorage.setItem('pcp-sessions', JSON.stringify([makeSession('real', 'Real')]));
    renderAt('/compare?a=real&b=ghost');

    expect(
      screen.getByText(/Session introuvable|Session not found/i),
    ).toBeInTheDocument();
  });

  it('renders the PartialState when only one side is provided', () => {
    localStorage.setItem('pcp-sessions', JSON.stringify([makeSession('only', 'Only One')]));
    renderAt('/compare?a=only');

    // PartialState shows the same hint as EmptyState along with the A summary.
    expect(
      screen.getByText(/Sélectionnez exactement 2 sessions|Select exactly 2 sessions/i),
    ).toBeInTheDocument();
  });

  it('renders the full view when both sessions resolve, including a legacy one', () => {
    // "legacy" = no dragModel, no focalPlane, no zeroWeather.
    const legacy = makeSession('legacy', 'Legacy Session');
    const modern = makeSession('modern', 'Modern Session', {
      dragModel: 'G7',
      focalPlane: 'SFP',
      clickValue: 0.25,
      clickUnit: 'MOA',
    });
    localStorage.setItem('pcp-sessions', JSON.stringify([legacy, modern]));

    renderAt('/compare?a=legacy&b=modern');

    // Page header is visible — full view rendered, no MissingState fallback.
    expect(
      screen.getByRole('heading', { name: /Comparaison de sessions|Session comparison/i }),
    ).toBeInTheDocument();

    // Both session names render in the summary cards.
    expect(screen.getAllByText(/Legacy Session/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Modern Session/).length).toBeGreaterThan(0);

    // Swap action is wired up and reachable by accessible name.
    expect(
      screen.getByRole('button', { name: /Inverser A.*B|Swap A.*B/i }),
    ).toBeInTheDocument();
  });
});

describe('ComparePage — mixed profiles warning', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows the warning when sessions have different profiles', () => {
    const legacySession: Session = {
      ...makeSession('s-leg', 'Leg'),
      profileId: 'legacy',
    };
    const meroSession: Session = {
      ...makeSession('s-mero', 'Mero'),
      profileId: 'mero',
    };
    localStorage.setItem('pcp-sessions', JSON.stringify([legacySession, meroSession]));
    renderAt('/compare?a=s-leg&b=s-mero');

    expect(
      screen.getByText(/profils différents|different profiles/i),
    ).toBeInTheDocument();
  });

  it('does not show the warning when both sessions share the same profile', () => {
    const a: Session = { ...makeSession('a', 'A'), profileId: 'legacy' };
    const b: Session = { ...makeSession('b', 'B'), profileId: 'legacy' };
    localStorage.setItem('pcp-sessions', JSON.stringify([a, b]));
    renderAt('/compare?a=a&b=b');

    expect(
      screen.queryByText(/profils différents|different profiles/i),
    ).not.toBeInTheDocument();
  });

  it('treats undefined profileId as "legacy" (no warning when both are undefined)', () => {
    const a = makeSession('a', 'A'); // no profileId
    const b = makeSession('b', 'B'); // no profileId
    localStorage.setItem('pcp-sessions', JSON.stringify([a, b]));
    renderAt('/compare?a=a&b=b');

    expect(
      screen.queryByText(/profils différents|different profiles/i),
    ).not.toBeInTheDocument();
  });
});
