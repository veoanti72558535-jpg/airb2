/**
 * Public entry point for the ballistic core engine.
 *
 * Re-exports every symbol that used to live in the monolithic
 * `src/lib/ballistics.ts`. The legacy file (still at that path) re-exports
 * from here, so existing call sites (QuickCalc, Sessions, Compare,
 * calibration tooling, tests) keep working byte-for-byte.
 *
 * P2 additions are exported alongside the P1 surface; nothing has been
 * removed. P3 adds ChairGun/Strelok profiles, Coriolis, and the ChairGun
 * drag table.
 */

export { calcAtmosphericFactor } from './atmosphere';
export { cdFor, cdFromTable } from './drag/standard-models';
export { dragDecel, type CdResolver, type RetardationMode } from './drag/retardation';
export { decomposeWind, type WindComponents } from './wind';
export { findZeroAngle } from './zero-solver';
export { calculateTrajectory } from './engine';
export { getLastEngineProvenance } from './engine';
export {
  buildEngineProvenance,
  type EngineProvenance,
  type PostProcessProvenance,
  type PostProcessSource,
  type SpinDriftGuards,
} from './provenance';

// Profiles & engine config (P1 surface — opt-in for callers).
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
  MERO_PROFILE,
  CHAIRGUN_PROFILE,
  STRELOK_PROFILE,
  DEFAULT_PROFILE_ID,
  getProfile,
  resolveProfile,
  listProfiles,
} from './profiles';

// MERO tables (P2 — exported for tooling / future UI badge).
export {
  cdFromMero,
  hasMeroTable,
  getProvenance,
  getMeroTableRaw,
  type Provenance,
} from './drag/mero-tables';

// ChairGun drag table (P3 — exported for cross-validation tooling).
export {
  cdFromChairgun,
  chairgunRetardation,
  CHAIRGUN_DRAG_TABLE,
  CHAIRGUN_SOUND_MS,
} from './drag/chairgun-drag-table';

// Coriolis (P3).
export { coriolisLateralMm, coriolisVerticalMm } from './coriolis';

