/**
 * Profile registry tests — P1.
 *
 * Verifies that the legacy profile is registered, exposes the four V1 drag
 * laws (G1/G7/GA/GS) and that resolution falls back gracefully.
 */

import { describe, it, expect } from 'vitest';
import {
  LEGACY_PROFILE,
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
    expect(resolveProfile('mero' as any)).toBe(LEGACY_PROFILE);
    expect(getProfile('chairgun' as any)).toBeUndefined();
  });

  it('listProfiles returns at least the legacy one', () => {
    const all = listProfiles();
    expect(all.length).toBeGreaterThanOrEqual(1);
    expect(all.find((p) => p.id === 'legacy')).toBeDefined();
  });
});
