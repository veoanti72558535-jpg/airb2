import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { I18nProvider } from '@/lib/i18n';
import { ProjectileComparisonTable, type ComparisonEntry } from './ProjectileComparisonTable';
import type { Projectile, BallisticResult } from '@/lib/types';

const mkResult = (range: number, drop: number, velocity: number, energy: number): BallisticResult => ({
  range, drop, holdover: 0, holdoverMRAD: 0, velocity, energy,
  tof: range * 0.0004, windDrift: range * 0.05, windDriftMOA: 0, windDriftMRAD: 0,
});

const P1: Projectile = { id: 'p1', brand: 'JSB', model: 'Exact', weight: 18, bc: 0.025, caliber: '.22', createdAt: '', updatedAt: '' };
const P2: Projectile = { id: 'p2', brand: 'FX', model: 'Hybrid', weight: 22, bc: 0.035, caliber: '.22', createdAt: '', updatedAt: '' };

const RESULTS: ComparisonEntry[] = [
  { projectile: P1, trajectory: [mkResult(0, 0, 280, 45), mkResult(50, -30, 250, 35)] },
  { projectile: P2, trajectory: [mkResult(0, 0, 280, 55), mkResult(50, -20, 260, 42)] },
];

const wrap = (ui: React.ReactElement) =>
  render(<I18nProvider>{ui}</I18nProvider>);

describe('ProjectileComparisonTable', () => {
  it('identifies correct winner for drop', () => {
    wrap(<ProjectileComparisonTable results={RESULTS} compareDistance={50} />);
    // P2 has -20 (less drop), should show "Best compromise" since it wins more categories
    expect(screen.getByText(/Best compromise|Meilleur compromis/i)).toBeInTheDocument();
  });

  it('renders all projectiles', () => {
    wrap(<ProjectileComparisonTable results={RESULTS} compareDistance={50} />);
    expect(screen.getByText(/JSB Exact/)).toBeInTheDocument();
    expect(screen.getByText(/FX Hybrid/)).toBeInTheDocument();
  });
});