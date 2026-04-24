/**
 * Core engine types — P1.
 *
 * These types live alongside the engine modules and intentionally avoid
 * any React / storage import. Public ballistic types (`BallisticInput`,
 * `BallisticResult`, `WeatherSnapshot`, …) remain in `src/lib/types.ts`
 * to preserve the existing public surface used by QuickCalc, Sessions and
 * Compare.
 */

import type { DragModel } from '../types';

/**
 * Engine version baked into every `calculateTrajectory` output / Session.
 * Bump this when a breaking physics change ships so legacy sessions can be
 * detected (badge in P6) and recalculated.
 *
 *  - `1` : pre-P2 engine (inverted LOS, DRAG_K = 0.0001)
 *  - `2` : corrected LOS formula + DRAG_K = 0.00036 (2026-04)
 */
export const ENGINE_VERSION = 2 as const;
export type EngineVersion = typeof ENGINE_VERSION;

/**
 * Stable identifier for a calculation profile.
 * Profiles are presets of (lois Cd activées, intégrateur, atmosphère, vent,
 * post-processings) — never separate physics engines.
 */
export type ProfileId = 'legacy' | 'mero' | 'chairgun' | 'strelok' | 'hybrid';

/** Numerical integrator used by the flight loop. */
export type Integrator = 'euler' | 'trapezoidal' | 'heun';

/** Atmospheric density model. */
export type AtmosphereModel = 'icao-simple' | 'tetens-full';

/** Wind decomposition strategy. */
export type WindModel = 'lateral-only' | 'vectorial';

/**
 * Resolved configuration the engine consumes at runtime.
 *
 * A profile (cf. `BallisticProfile`) compiles into an `EngineConfig`. The
 * engine itself never reads the profile id — only the config — which keeps
 * the core decoupled from the profile catalogue.
 */
export interface EngineConfig {
  integrator: Integrator;
  /** Integration time-step in seconds. */
  dt: number;
  atmosphereModel: AtmosphereModel;
  windModel: WindModel;
  postProcess: {
    spinDrift: boolean;
    coriolis: boolean;
    cant: boolean;
    slopeAngle: boolean;
  };
  /**
   * Self-reference to the profile this config came from. P3.2 hardening:
   * lets `buildSessionMetadata` resolve the profile id explicitly instead
   * of comparing structural shapes. Optional for backwards compat — when
   * absent, callers fall back to the legacy structural resolution.
   */
  profileId?: ProfileId;
}

/**
 * User-facing profile descriptor.
 *
 * `dragLawsAvailable` controls what the UI offers; the engine still accepts
 * any `DragModel` it knows. `defaultDragLaw` is the law preselected when a
 * new session is created under this profile.
 */
export interface BallisticProfile {
  id: ProfileId;
  /** Translation key suffix — UI resolves to FR/EN via `t('profiles.<id>')`. */
  labelKey: string;
  dragLawsAvailable: DragModel[];
  defaultDragLaw: DragModel;
  config: EngineConfig;
  /**
   * When true, the profile is shown but tagged "beta" in the UI and is not
   * eligible to be the global default until validated.
   */
  beta?: boolean;
}
