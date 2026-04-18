/**
 * Profile registry tests — P1 + P2.
 *
 * P1 verified the legacy profile + V1 lock.
 * P2 adds MERO registration + beta flag + UI surface restriction
 * (RA4/GA2/SLG0/SLG1 must NOT appear in `dragLawsAvailable`).
 */

import { describe, it, expect } from 'vitest';
import {
  LEGACY_PROFILE,
  MERO_PROFILE,
  DEFAULT_PROFILE_ID,
  getProfile,
  resolveProfile,
  listProfiles,
} from './profiles';

describe('profiles — P1 registry', () => {
  it('legacy profile is the default', () => {
    expect(DEFAULT_PROFILE_ID).toBe('legacy');
    expect(resolveProfile(undefined)).toBe(LEGACY_PROFILE);
  });

  it('legacy exposes G1/G7/GA/GS only (V1 lock)', () => {
    expect(LEGACY_PROFILE.dragLawsAvailable).toEqual(['G1', 'G7', 'GA', 'GS']);
    expect(LEGACY_PROFILE.defaultDragLaw).toBe('G1');
  });

  it('legacy uses Euler dt=5e-4 (frozen physics)', () => {
    expect(LEGACY_PROFILE.config.integrator).toBe('euler');
    expect(LEGACY_PROFILE.config.dt).toBe(0.0005);
  });

  it('post-processings: only spin drift active in legacy', () => {
    expect(LEGACY_PROFILE.config.postProcess).toEqual({
      spinDrift: true,
      coriolis: false,
      cant: false,
      slopeAngle: false,
    });
  });

  it('resolveProfile falls back to legacy for unknown ids', () => {
    expect(resolveProfile('chairgun' as any)).toBe(LEGACY_PROFILE);
    expect(getProfile('chairgun' as any)).toBeUndefined();
  });

  it('listProfiles returns at least legacy + mero in P2', () => {
    const all = listProfiles();
    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(all.find((p) => p.id === 'legacy')).toBeDefined();
    expect(all.find((p) => p.id === 'mero')).toBeDefined();
  });
});

describe('profiles — P2 MERO registration', () => {
  it('mero profile is registered and resolvable', () => {
    expect(getProfile('mero')).toBe(MERO_PROFILE);
    expect(resolveProfile('mero')).toBe(MERO_PROFILE);
  });

  it('mero is flagged beta in P2', () => {
    expect(MERO_PROFILE.beta).toBe(true);
  });

  it('mero uses trapezoidal integrator + Tetens-full atmosphere', () => {
    expect(MERO_PROFILE.config.integrator).toBe('trapezoidal');
    expect(MERO_PROFILE.config.atmosphereModel).toBe('tetens-full');
    expect(MERO_PROFILE.config.dt).toBe(0.001);
  });

  it('mero exposes ONLY G1/G7/GA/GS in UI (RA4/GA2/SLG0/SLG1 stay engine-only in P2)', () => {
    expect(MERO_PROFILE.dragLawsAvailable).toEqual(['G1', 'G7', 'GA', 'GS']);
    expect(MERO_PROFILE.dragLawsAvailable).not.toContain('RA4');
    expect(MERO_PROFILE.dragLawsAvailable).not.toContain('GA2');
    expect(MERO_PROFILE.dragLawsAvailable).not.toContain('SLG0');
    expect(MERO_PROFILE.dragLawsAvailable).not.toContain('SLG1');
  });

  it('mero default profile is NOT mero in P2 (legacy stays default)', () => {
    expect(DEFAULT_PROFILE_ID).toBe('legacy');
  });
});
