import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ── Mock supabase ────────────────────────────────────────────────────────
vi.mock('@/integrations/supabase/client', () => ({
  supabase: null,
  isSupabaseConfigured: () => false,
}));

// ── Mock auth ────────────────────────────────────────────────────────────
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: { id: 'test-user' }, session: {} }),
  AuthProvider: ({ children }: any) => children,
}));

// ── Mock i18n ────────────────────────────────────────────────────────────
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, language: 'en' }),
  I18nProvider: ({ children }: any) => children,
}));

// ── Mock repo (supabase is null so these won't fire) ─────────────────────
vi.mock('@/lib/field-measurements-repo', () => ({
  saveFieldMeasurement: vi.fn().mockResolvedValue(undefined),
  getFieldMeasurements: vi.fn().mockResolvedValue([]),
  deleteFieldMeasurement: vi.fn().mockResolvedValue(undefined),
}));

import { FieldValidation } from './FieldValidation';
import type { Session } from '@/lib/types';

const makeSession = (overrides?: Partial<Session>): Session => ({
  id: 's1',
  name: 'Test',
  input: {
    muzzleVelocity: 280,
    bc: 0.084,
    projectileWeight: 25.39,
    sightHeight: 47,
    zeroRange: 50,
    maxRange: 100,
    rangeStep: 10,
    weather: {
      temperature: 20,
      humidity: 25,
      pressure: 1014.58,
      altitude: 770,
      windSpeed: 0,
      windAngle: 0,
      source: 'manual',
      timestamp: new Date().toISOString(),
    },
  },
  results: [
    { range: 0, drop: 0, holdover: 0, holdoverMRAD: 0, velocity: 280, energy: 100, tof: 0, windDrift: 0, windDriftMOA: 0, windDriftMRAD: 0 },
    { range: 50, drop: 0, holdover: 0, holdoverMRAD: 0, velocity: 260, energy: 90, tof: 0.18, windDrift: 0, windDriftMOA: 0, windDriftMRAD: 0 },
    { range: 70, drop: -83, holdover: -4.1, holdoverMRAD: -1.19, velocity: 246, energy: 80, tof: 0.26, windDrift: 5, windDriftMOA: 0.25, windDriftMRAD: 0.07 },
  ],
  tags: [],
  favorite: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('FieldValidation', () => {
  it('renders without error', () => {
    render(<FieldValidation session={makeSession()} />);
    expect(screen.getByText('field.validation.title')).toBeTruthy();
  });

  it('shows "no measurements" when history is empty', () => {
    render(<FieldValidation session={makeSession()} />);
    expect(screen.getByText('field.validation.noMeasurements')).toBeTruthy();
  });
});

// ── Badge classification unit tests ──────────────────────────────────────

describe('accuracy classification', () => {
  const predicted = { range: 70, drop: -83, holdover: 0, holdoverMRAD: 0, velocity: 246, energy: 80, tof: 0.26, windDrift: 5, windDriftMOA: 0, windDriftMRAD: 0 };

  // Re-implement inline to test logic without importing private fn
  function classify(measDrop: number | undefined, measVel: number | undefined) {
    const dropDelta = measDrop != null ? Math.abs(measDrop - predicted.drop) : 0;
    const velDelta = measVel != null ? Math.abs(measVel - predicted.velocity) : 0;
    if (dropDelta < 5 && velDelta < 5) return 'accurate';
    if (dropDelta < 20 && velDelta < 15) return 'moderate';
    return 'large';
  }

  it('classifies accurate (drop < 5mm, vel < 5 m/s)', () => {
    expect(classify(-84, 247)).toBe('accurate');
  });

  it('classifies moderate (drop 5-20mm)', () => {
    expect(classify(-95, 248)).toBe('moderate');
  });

  it('classifies large (drop > 20mm)', () => {
    expect(classify(-110, 230)).toBe('large');
  });
});