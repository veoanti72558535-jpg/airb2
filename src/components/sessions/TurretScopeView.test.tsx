/**
 * Tests UI vue lunette interactive.
 *
 * Vérifie :
 *  - rendu de base + ReticleViewer + POI overlay
 *  - changement de distance via les chips
 *  - le bouton "Snap sur croix" amène le résiduel POI à ~0
 *  - le bouton "Reset" ramène les tourelles à 0
 *  - état vide quand aucune distance valide
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { TurretScopeView } from './TurretScopeView';
import type { BallisticResult, Optic, Session, WeatherSnapshot } from '@/lib/types';

function w(): WeatherSnapshot {
  return {
    temperature: 15, humidity: 50, pressure: 1013.25, altitude: 0,
    windSpeed: 0, windAngle: 90, source: 'manual', timestamp: '2026-01-01',
  };
}

function mkRow(range: number, drop: number, windDrift = 0): BallisticResult {
  return {
    range, drop, windDrift,
    holdover: 0, holdoverMRAD: 0,
    velocity: 280 - range * 0.4, energy: 25,
    tof: range * 0.004,
    windDriftMOA: 0, windDriftMRAD: 0,
    clicksElevation: 0, clicksWindage: 0,
  };
}

function mkOptic(): Optic {
  return {
    id: 'o1', name: 'Test Scope',
    clickUnit: 'MOA', clickValue: 0.25,
    focalPlane: 'FFP',
    createdAt: '2026-01-01', updatedAt: '2026-01-01',
  };
}

function mkSession(): Session {
  return {
    id: 's1', name: 'Test',
    createdAt: '2026-01-01', updatedAt: '2026-01-01',
    tags: [], favorite: false,
    input: {
      muzzleVelocity: 280, bc: 0.025, projectileWeight: 18,
      sightHeight: 47, zeroRange: 30, maxRange: 100, rangeStep: 10,
      weather: w(), dragModel: 'G1',
    },
    results: [
      mkRow(0, 0), mkRow(10, -5), mkRow(30, 0), mkRow(50, -80, 5), mkRow(100, -320, 12),
    ],
  };
}

function renderView(session = mkSession(), optic = mkOptic()) {
  return render(
    <I18nProvider>
      <TurretScopeView session={session} optic={optic} reticle={null} />
    </I18nProvider>,
  );
}

describe('TurretScopeView', () => {
  it('renders the scope viewer + controls', () => {
    renderView();
    expect(screen.getByTestId('turret-scope-view')).toBeInTheDocument();
    expect(screen.getByTestId('reticle-viewer')).toBeInTheDocument();
    expect(screen.getByTestId('reticle-poi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Snap sur croix/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Remettre à zéro/i })).toBeInTheDocument();
  });

  it('selects the zero-range distance by default', () => {
    renderView();
    // Distance chip "30" should be aria-pressed
    const chip = screen.getByRole('button', { name: '30' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
  });

  it('changes distance when a distance chip is clicked', () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: '100' }));
    expect(screen.getByRole('button', { name: '100' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '30' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('Snap brings the residual delta to ~0 MOA', () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: '100' }));
    fireEvent.click(screen.getByRole('button', { name: /Snap sur croix/i }));
    // Residual deltas are rendered as "(Δ +0.00)" or "(Δ -0.0X)"
    const deltas = screen.getAllByText(/\(Δ [+\-]?\d/);
    // both elevation and windage residuals should be |Δ| < step (0.25 MOA)
    deltas.forEach(node => {
      const match = node.textContent?.match(/Δ\s*([+\-]?\d+(?:\.\d+)?)/);
      const v = match ? parseFloat(match[1]) : NaN;
      expect(Math.abs(v)).toBeLessThanOrEqual(0.25);
    });
  });

  it('Reset zeroes both turrets', () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: '100' }));
    fireEvent.click(screen.getByRole('button', { name: /Snap sur croix/i }));
    fireEvent.click(screen.getByRole('button', { name: /Remettre à zéro/i }));
    // After reset the displayed turret value is "0.00 MOA"
    const moaSpans = screen.getAllByText(/^0\.00 MOA$/);
    expect(moaSpans.length).toBeGreaterThanOrEqual(2);
  });

  it('renders the empty state when the session has no positive-range rows', () => {
    const s = mkSession();
    s.results = [mkRow(0, 0)];
    renderView(s);
    expect(screen.queryByTestId('turret-scope-view')).toBeNull();
    expect(screen.getByText(/Aucun résultat disponible/i)).toBeInTheDocument();
  });
});