/**
 * Profile registry — P1 + P2 + P3 (ChairGun / Strelok).
 *
 * P1 shipped only `legacy`. P2 adds `mero` (beta) — same engine code, but
 * dispatched onto: trapezoidal RK2 integrator, dt=1e-3, Tetens-full
 * atmosphere, MERO 169-pt Cd tables. Marked `beta:true` so the UI can
 * keep it hidden until P3 validates the numbers against JBM/StrelokPro.
 *
 * P3 adds `chairgun` and `strelok` — each reproducing the exact physics
 * model of their namesake application:
 *   - `chairgun`: Heun integrator, dt=1e-3, ChairGun 14-pt Cd table,
 *     chairgun-direct retardation ((Cd/BC)×v), no atmosphere correction.
 *   - `strelok`: trapezoidal, dt=5e-4, Tetens-full atmosphere, vectorial
 *     wind (head+cross), slope angle, Coriolis. The closest to "full
 *     physics" that AirBallistiK currently offers.
 */

import type { BallisticProfile, ProfileId } from './types';

export const LEGACY_PROFILE: BallisticProfile = {
  id: 'legacy',
  labelKey: 'profiles.legacy',
  dragLawsAvailable: ['G1', 'G7', 'GA', 'GS'],
  defaultDragLaw: 'G1',
  config: {
    profileId: 'legacy',
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
    profileId: 'mero',
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

/**
 * ChairGun profile — P3.
 *
 * Reproduces the exact physics of ChairGun Elite v4.7.2:
 *   - Heun integrator (RK2, predictor-corrector) — same as chairgun_engine.js
 *   - dt = 1ms (ChairGun uses 1ms in the main loop, 2ms in zero solver)
 *   - ChairGun's custom 14-point subsonic G1 Cd table
 *   - Retardation formula: (Cd / BC) × v — NO DRAG_K, NO atmosphere factor
 *   - Speed of sound: 340.3 m/s (CHAIRGUN_SOUND_MS)
 *   - No vectorial wind (ChairGun only does lateral crosswind)
 *
 * This profile lets users validate their AirBallistiK results against
 * ChairGun's output. Marked beta until cross-validation is complete.
 */
export const CHAIRGUN_PROFILE: BallisticProfile = {
  id: 'chairgun',
  labelKey: 'profiles.chairgun',
  dragLawsAvailable: ['G1', 'G7', 'GA', 'GS'],
  defaultDragLaw: 'G1',
  config: {
    profileId: 'chairgun',
    integrator: 'heun',
    dt: 0.001,
    atmosphereModel: 'icao-simple',
    windModel: 'lateral-only',
    retardationMode: 'chairgun-direct',
    postProcess: {
      spinDrift: false,  // ChairGun does not compute spin drift
      coriolis: false,
      cant: false,
      slopeAngle: false,
    },
  },
  beta: true,
};

/**
 * Strelok profile — P3.
 *
 * Reproduces the physics model of Strelok Pro v6.x:
 *   - Trapezoidal (Heun-like) integrator, dt = 0.5ms
 *   - Tetens-full atmosphere with altitude lapse correction
 *   - Vectorial wind (head + cross components)
 *   - Slope angle correction (Improved Rifleman's Rule)
 *   - Coriolis effect
 *   - Spin drift (Litz SG)
 *
 * This is the "full physics" profile — maximum accuracy, slightly slower
 * computation. Ideal for .22 LR and slug shooters at extended ranges.
 */
export const STRELOK_PROFILE: BallisticProfile = {
  id: 'strelok',
  labelKey: 'profiles.strelok',
  dragLawsAvailable: ['G1', 'G7', 'GA', 'GS'],
  defaultDragLaw: 'G1',
  config: {
    profileId: 'strelok',
    integrator: 'trapezoidal',
    dt: 0.0005,
    atmosphereModel: 'tetens-full',
    windModel: 'vectorial',
    postProcess: {
      spinDrift: true,
      coriolis: true,
      cant: false,
      slopeAngle: true,
    },
  },
  beta: true,
};

const REGISTRY: Record<string, BallisticProfile> = {
  legacy: LEGACY_PROFILE,
  mero: MERO_PROFILE,
  chairgun: CHAIRGUN_PROFILE,
  strelok: STRELOK_PROFILE,
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
