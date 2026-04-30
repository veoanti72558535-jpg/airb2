/**
 * Legacy entry point — kept as a thin re-export for backwards compatibility.
 *
 * Since P1, the actual engine lives in `src/lib/ballistics/` (see
 * `./ballistics/index.ts`). Every consumer in the app, tests included,
 * imports from this file via `@/lib/ballistics` and continues to work
 * unchanged.
 *
 * New code SHOULD import from `@/lib/ballistics` (the directory) instead
 * of from this file. This file will be removed once every import in the
 * codebase has been migrated (planned P3+).
 */

export {
  calcAtmosphericFactor,
  cdFor,
  cdFromTable,
  dragDecel,
  findZeroAngle,
  calculateTrajectory,
  getLastEngineProvenance,
  type EngineProvenance,
} from './ballistics/index';
