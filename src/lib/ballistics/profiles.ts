/**
 * Profile registry — P1.
 *
 * In P1 only the `legacy` profile is registered: it freezes today's physics
 * (Euler dt=5e-4, ICAO-simple atmosphere via Tetens, lateral-only wind, no
 * post-processings beyond spin drift) so existing sessions stay reproducible.
 *
 * `mero`, `chairgun`, `strelok`, `hybrid` are reserved here as comments and
 * will be added in P2/P3 alongside their physics changes — never as empty
 * shells (avoids the "ghost profile" anti-pattern called out in the plan).
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

const REGISTRY: Record<string, BallisticProfile> = {
  legacy: LEGACY_PROFILE,
};

/** Profile used when nothing else has been selected (P1 default = legacy). */
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
