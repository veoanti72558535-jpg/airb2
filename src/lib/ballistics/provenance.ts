/**
 * Engine provenance — single source of truth for "which models and
 * guard-rails were active when this trajectory was computed?".
 *
 * The object is intentionally:
 *  - **serialisable** (plain JSON, no functions, no class instances) so
 *    it can be persisted alongside a Session, attached to a bug report,
 *    or diffed in the cross-validation tooling without any custom codec.
 *  - **derived** (never edited by hand) from the active `EngineConfig`,
 *    the user-level overrides stored in `pcp-settings`, and the exported
 *    constants of the physics modules (`spin-drift.ts`, …). Any new
 *    guard-rail MUST be added here so it shows up in the UI panel and
 *    in saved sessions automatically.
 *
 * UI consumers (e.g. `ResultsCard` "D'où vient la dérive ?" panel) read
 * this object instead of reaching into module internals — that way the
 * displayed numbers and the engine truth cannot diverge.
 */

import type { EngineConfig, ProfileId } from './types';
import {
  SG_MAX_EFFECTIVE,
  MIN_SPIN_DRIFT_VELOCITY,
} from './spin-drift';

/** Tri-state describing how a post-process step ended up enabled. */
export type PostProcessSource =
  /** No `EngineConfig` was supplied — falls back to the legacy default. */
  | 'default'
  /** Active because the profile config requested it. */
  | 'profile'
  /** Profile said one thing, the user-level setting overrode it. */
  | 'user-override';

export interface PostProcessProvenance {
  enabled: boolean;
  source: PostProcessSource;
}

/** Numerical guards exposed by the spin-drift estimator. */
export interface SpinDriftGuards {
  /** Max SG used inside the Litz formula. */
  sgMaxEffective: number;
  /** Velocity (m/s) under which spin drift is clamped to 0. */
  minVelocityMs: number;
  /** Free-form model identifier — bumped if the formula ever changes. */
  model: 'litz-1.83-capped';
}

/**
 * Full provenance snapshot. Plain object, JSON-safe.
 *
 * Versioned via `schemaVersion` so future readers (and saved sessions)
 * can detect breaking changes. Bump the version whenever a field is
 * removed or its semantics change.
 */
export interface EngineProvenance {
  schemaVersion: 1;
  /** Stable id of the active profile, or `undefined` for legacy callers. */
  profileId?: ProfileId;
  integrator: EngineConfig['integrator'] | 'euler';
  dt: number;
  atmosphereModel: EngineConfig['atmosphereModel'] | 'icao-simple';
  windModel: EngineConfig['windModel'] | 'lateral-only';
  retardationMode: NonNullable<EngineConfig['retardationMode']> | 'standard';
  postProcess: {
    spinDrift: PostProcessProvenance;
    coriolis: PostProcessProvenance;
    cant: PostProcessProvenance;
    slopeAngle: PostProcessProvenance;
  };
  guards: {
    spinDrift: SpinDriftGuards;
  };
  /** Echo of the user-level override (`undefined` = not set). */
  userOverrides: {
    spinDrift?: boolean;
  };
}

/** Resolve the user-level spin-drift override from app settings. */
function readSpinDriftOverride(): boolean | undefined {
  if (typeof localStorage === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem('pcp-settings');
    if (!raw) return undefined;
    const v = JSON.parse(raw)?.featureFlags?.spinDrift;
    return typeof v === 'boolean' ? v : undefined;
  } catch {
    return undefined;
  }
}

function resolvePostProcess(
  profileFlag: boolean | undefined,
  override: boolean | undefined,
  legacyDefault: boolean,
): PostProcessProvenance {
  if (override !== undefined) return { enabled: override, source: 'user-override' };
  if (profileFlag !== undefined) return { enabled: profileFlag, source: 'profile' };
  return { enabled: legacyDefault, source: 'default' };
}

/**
 * Build the provenance snapshot for the engine inputs that produced
 * a given trajectory.
 *
 * Pure: same inputs → same output. Reads `localStorage` once for the
 * user override (already guarded for SSR / tests).
 */
export function buildEngineProvenance(config?: EngineConfig): EngineProvenance {
  const userSpin = readSpinDriftOverride();
  return {
    schemaVersion: 1,
    profileId: config?.profileId,
    integrator: config?.integrator ?? 'euler',
    dt: config?.dt ?? 0.0005,
    atmosphereModel: config?.atmosphereModel ?? 'icao-simple',
    windModel: config?.windModel ?? 'lateral-only',
    retardationMode: config?.retardationMode ?? 'standard',
    postProcess: {
      // Legacy default for spin drift was ON — preserved here so callers
      // without a config (rare, but the bit-exact contract relies on it)
      // still report correctly.
      spinDrift: resolvePostProcess(config?.postProcess?.spinDrift, userSpin, true),
      coriolis: resolvePostProcess(config?.postProcess?.coriolis, undefined, false),
      cant: resolvePostProcess(config?.postProcess?.cant, undefined, false),
      slopeAngle: resolvePostProcess(config?.postProcess?.slopeAngle, undefined, false),
    },
    guards: {
      spinDrift: {
        sgMaxEffective: SG_MAX_EFFECTIVE,
        minVelocityMs: MIN_SPIN_DRIFT_VELOCITY,
        model: 'litz-1.83-capped',
      },
    },
    userOverrides: {
      spinDrift: userSpin,
    },
  };
}