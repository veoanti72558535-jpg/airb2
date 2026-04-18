/**
 * Profile registry — P1 + P2.
 *
 * P1 shipped only `legacy`. P2 adds `mero` (beta) — same engine code, but
 * dispatched onto: trapezoidal RK2 integrator, dt=1e-3, Tetens-full
 * atmosphere, MERO 169-pt Cd tables. Marked `beta:true` so the UI can
 * keep it hidden until P3 validates the numbers against JBM/StrelokPro.
 *
 * `chairgun`, `strelok`, `hybrid` remain reserved as comments — they will
 * be added with their physics differences in P3+, never as empty shells.
 */

import type { BallisticProfile, ProfileId } from './types';

export const LEGACY_PROFILE: BallisticProfile = {
  id: 'legacy',
  labelKey: 'profiles.legacy',
  dragLawsAvailable: ['G1', 'G7', 'GA', 'GS'],
  defaultDragLaw: 'G1',
  config: {
    integrator: 'euler',
    dt: 0.0005,
    atmosphereModel: 'icao-simple',
    windModel: 'lateral-only',
    postProcess: {
      spinDrift: true,
      coriolis: false,
      cant: false,
      slopeAngle: false,
    },
  },
};

/**
 * MERO profile — P2 beta.
 *
 * Higher-fidelity physics, opt-in. Even though the engine resolves Cd for
 * RA4/GA2/SLG0/SLG1 too, `dragLawsAvailable` lists only the four V1 laws
 * — we don't surface the slug-specific laws to the UI in P2 (they need
 * dedicated projectile inventory work first).
 */
export const MERO_PROFILE: BallisticProfile = {
  id: 'mero',
  labelKey: 'profiles.mero',
  dragLawsAvailable: ['G1', 'G7', 'GA', 'GS'],
  defaultDragLaw: 'G1',
  config: {
    integrator: 'trapezoidal',
    dt: 0.001,
    atmosphereModel: 'tetens-full',
    windModel: 'lateral-only',
    postProcess: {
      spinDrift: true,
      coriolis: false,
      cant: false,
      slopeAngle: false,
    },
  },
  beta: true,
};

const REGISTRY: Record<string, BallisticProfile> = {
  legacy: LEGACY_PROFILE,
  mero: MERO_PROFILE,
};

/** Profile used when nothing else has been selected (P2 default = legacy). */
export const DEFAULT_PROFILE_ID: ProfileId = 'legacy';

/** Returns the profile or `undefined` for unknown ids. */
export function getProfile(id: ProfileId | undefined): BallisticProfile | undefined {
  if (!id) return undefined;
  return REGISTRY[id];
}

/** Returns the resolved profile, falling back to the default. */
export function resolveProfile(id: ProfileId | undefined): BallisticProfile {
  return getProfile(id) ?? LEGACY_PROFILE;
}

/** Returns every profile registered in the current build. */
export function listProfiles(): BallisticProfile[] {
  return Object.values(REGISTRY);
}
