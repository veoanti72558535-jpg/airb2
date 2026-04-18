/**
 * Public entry point for the ballistic core engine.
 *
 * Re-exports every symbol that used to live in the monolithic
 * `src/lib/ballistics.ts`. The legacy file (still at that path) re-exports
 * from here, so existing call sites (QuickCalc, Sessions, Compare,
 * calibration tooling, tests) keep working byte-for-byte.
 *
 * New code should import from `@/lib/ballistics` (this directory) rather
 * than from `@/lib/ballistics.ts` so the legacy file can eventually be
 * removed in P3+ once all imports have been migrated.
 */

export { calcAtmosphericFactor } from './atmosphere';
export { cdFor, cdFromTable } from './drag/standard-models';
export { dragDecel } from './drag/retardation';
export { decomposeWind, type WindComponents } from './wind';
export { findZeroAngle } from './zero-solver';
export { calculateTrajectory } from './engine';

// Profiles & engine config (new P1 surface — opt-in for callers).
export {
  ENGINE_VERSION,
  type EngineVersion,
  type ProfileId,
  type Integrator,
  type AtmosphereModel,
  type WindModel,
  type EngineConfig,
  type BallisticProfile,
} from './types';
export {
  LEGACY_PROFILE,
  DEFAULT_PROFILE_ID,
  getProfile,
  resolveProfile,
  listProfiles,
} from './profiles';
