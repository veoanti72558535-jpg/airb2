/**
 * Tests UI carte comparaison Euler ↔ Heun.
 *
 * Vérifie :
 *  - rendu fermé par défaut + hint visible
 *  - badge intégrateur SESSION = Euler quand engineConfig absent
 *  - ouverture déclenche le recalcul et affiche le tableau triple
 *  - intégrateur alternatif = Heun pour une SESSION Euler
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { IntegratorCompareCard } from './IntegratorCompareCard';
import type { BallisticResult, Session, WeatherSnapshot } from '@/lib/types';

function w(): WeatherSnapshot {
  return {
    temperature: 15, humidity: 50, pressure: 1013.25, altitude: 0,
    windSpeed: 0, windAngle: 90, source: 'manual', timestamp: '2026-01-01',
  };
}

function mkRow(range: number, drop: number): BallisticResult {
  return {
    range, drop, windDrift: 0,
    holdover: 0, holdoverMRAD: 0,
    velocity: 280 - range * 0.4, energy: 25,
    tof: range * 0.004,
    windDriftMOA: 0, windDriftMRAD: 0,
    clicksElevation: 0, clicksWindage: 0,
  };
}

function mkSession(): Session {
  return {
    id: 's1',
    name: 'Test',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    tags: [],
    favorite: false,
    input: {
      muzzleVelocity: 280, bc: 0.025, projectileWeight: 18,
      sightHeight: 47, zeroRange: 30, maxRange: 100, rangeStep: 10,
      weather: w(), dragModel: 'G1',
    },
    results: [
      mkRow(0, 0), mkRow(10, -5), mkRow(25, -20), mkRow(50, -80),
      mkRow(75, -180), mkRow(100, -320),
    ],
  };
}

function renderCard(session: Session = mkSession()) {
  return render(
    <I18nProvider>
      <IntegratorCompareCard session={session} />
    </I18nProvider>,
  );
}

describe('IntegratorCompareCard', () => {
  it('renders closed by default and shows the hint', () => {
    renderCard();
    expect(screen.getByText(/Comparer Euler/i)).toBeInTheDocument();
    expect(screen.getByText(/utile pour estimer/i)).toBeInTheDocument();
    // Table not rendered yet
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('shows the SESSION integrator (Euler when engineConfig missing) and Heun as alternate', () => {
    renderCard();
    expect(screen.getByText(/SESSION : intégrateur: Euler/)).toBeInTheDocument();
    expect(screen.getByText(/Alternatif: Heun/)).toBeInTheDocument();
  });

  it('opens on toggle and renders the comparison table', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: /Afficher la comparaison/i }));
    expect(screen.getByRole('table')).toBeInTheDocument();
    // Header columns
    expect(screen.getByText(/^Chute$/)).toBeInTheDocument();
    expect(screen.getByText(/^Dérive$/)).toBeInTheDocument();
    expect(screen.getByText(/^Vitesse$/)).toBeInTheDocument();
    // Sample range rendered
    expect(screen.getByText('100m')).toBeInTheDocument();
  });

  it('flips to Euler as alternate when SESSION uses Heun', () => {
    const s = mkSession();
    s.input.engineConfig = {
      profileId: 'legacy',
      integrator: 'heun',
      dt: 0.0005,
      atmosphereModel: 'icao-simple',
      windModel: 'lateral-only',
      postProcess: { spinDrift: true, coriolis: false, cant: false, slopeAngle: false },
    };
    renderCard(s);
    expect(screen.getByText(/SESSION : intégrateur: Heun/)).toBeInTheDocument();
    expect(screen.getByText(/Alternatif: Euler/)).toBeInTheDocument();
  });
});