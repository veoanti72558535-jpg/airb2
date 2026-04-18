/**
 * Session metadata builder — P3.1.
 *
 * Single source of truth for the audit-trail fields that get FROZEN onto
 * a Session at save time:
 *  - engineVersion
 *  - profileId
 *  - dragLawEffective
 *  - cdProvenance
 *  - calculatedAt
 *  - engineMetadata (integrator + atmosphereModel + dt)
 *
 * Centralised so every save path produces consistent metadata and so future
 * P4+ provenance flips (`derived-p2` → `mero-official`) only touch this file.
 *
 * Pure: returns a fresh object, never mutates inputs.
 *
 * Compatibility contract:
 *  - When `input.engineConfig` is omitted → falls back to the LEGACY profile
 *    snapshot (Euler dt=5e-4, ICAO-simple, `legacy-piecewise`). This matches
 *    what `calculateTrajectory(input)` actually does internally so the
 *    metadata never lies about how the numbers were produced.
 *  - When `input.engineConfig` is the MERO profile config → `derived-p2`.
 *    The label flips to `mero-official` only once the digitised tables ship
 *    in P4 (single line change here, no schema migration).
 */

import { ENGINE_VERSION } from './ballistics/types';
import { LEGACY_PROFILE, MERO_PROFILE } from './ballistics/profiles';
import type {
  BallisticInput,
  CdProvenance,
  DragModel,
  Session,
  SessionEngineMetadata,
} from './types';
import type { EngineConfig, ProfileId } from './ballistics/types';

/**
 * Bundle of frozen metadata to attach to a freshly-calculated session.
 * Returned as a partial Session so callers can spread it next to their
 * own fields without having to know the exact key list.
 */
export type SessionCalcMetadata = Required<
  Pick<
    Session,
    | 'engineVersion'
    | 'profileId'
    | 'dragLawEffective'
    | 'cdProvenance'
    | 'calculatedAt'
    | 'engineMetadata'
  >
>;

/**
 * Resolve the profile id that matches a given engine config. We compare on
 * the structural shape (integrator + atmosphereModel) rather than holding
 * a back-reference, because the engine has always consumed `EngineConfig`
 * directly and we don't want to introduce a new coupling.
 */
function resolveProfileId(cfg: EngineConfig | undefined): ProfileId {
  if (!cfg) return 'legacy';
  if (
    cfg.integrator === MERO_PROFILE.config.integrator &&
    cfg.atmosphereModel === MERO_PROFILE.config.atmosphereModel
  ) {
    return 'mero';
  }
  return 'legacy';
}

/**
 * Resolve the Cd provenance from a profile id. Kept as a function so the
 * P4 flip (derived-p2 → mero-official) is one line.
 */
function resolveProvenance(profileId: ProfileId): CdProvenance {
  if (profileId === 'mero') return 'derived-p2';
  return 'legacy-piecewise';
}

/**
 * Snapshot the engine config into a stable, serialisable shape. Defaults
 * mirror `LEGACY_PROFILE.config` so a missing `engineConfig` records the
 * exact dispatch the engine actually used.
 */
function snapshotEngineMetadata(cfg: EngineConfig | undefined): SessionEngineMetadata {
  const src = cfg ?? LEGACY_PROFILE.config;
  return {
    integrator: src.integrator,
    atmosphereModel: src.atmosphereModel,
    dt: src.dt,
  };
}

/**
 * Resolve the drag law actually used. The engine resolves `dragModel`
 * with a `?? 'G1'` fallback, so we mirror that here to record the
 * EFFECTIVE law (not the requested one).
 */
function resolveDragLawEffective(input: BallisticInput): DragModel {
  return input.dragModel ?? 'G1';
}

/**
 * Build the immutable metadata bundle to attach to a new session.
 *
 * @param input - the ballistic input the engine consumed
 * @param now   - ISO timestamp injection point (tests pass a fixed value)
 */
export function buildSessionMetadata(
  input: BallisticInput,
  now: string = new Date().toISOString(),
): SessionCalcMetadata {
  const profileId = resolveProfileId(input.engineConfig);
  return {
    engineVersion: ENGINE_VERSION,
    profileId,
    dragLawEffective: resolveDragLawEffective(input),
    cdProvenance: resolveProvenance(profileId),
    calculatedAt: now,
    engineMetadata: snapshotEngineMetadata(input.engineConfig),
  };
}
