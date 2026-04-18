/**
 * Wind decomposition — P1 extraction (lateral-only).
 *
 * Convention (locked, see plan): bearing in degrees, **clockwise**, with
 *   0° = headwind (from front)
 *  90° = wind from the right
 * 180° = tailwind
 * 270° = wind from the left
 *
 * In P1 the engine consumes only the lateral (cross) component because the
 * legacy integration loop ignored longitudinal wind. The longitudinal
 * component is computed and exposed for forward compatibility with the P3
 * `vectorial` wind model — callers that opt into lateral-only behaviour can
 * simply ignore it.
 */

import type { WeatherSnapshot } from '../types';

export interface WindComponents {
  /** Crosswind in m/s (positive = pushing projectile to the right). */
  cross: number;
  /**
   * Headwind component in m/s (positive = blowing into the projectile's
   * face). Not yet consumed by the P1 integrator — reserved for P3.
   */
  head: number;
}

/**
 * Decompose a `WeatherSnapshot` wind vector into head/cross components.
 *
 * Identity preserved from the legacy engine: `cross = speed * sin(angle)`.
 * `head = speed * cos(angle)` is added for P3 readiness — its sign matches
 * the convention above (headwind positive).
 */
export function decomposeWind(weather: WeatherSnapshot): WindComponents {
  const angleRad = (weather.windAngle * Math.PI) / 180;
  return {
    cross: weather.windSpeed * Math.sin(angleRad),
    head: weather.windSpeed * Math.cos(angleRad),
  };
}
