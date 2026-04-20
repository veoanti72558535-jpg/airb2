/**
 * Cross-validation — BUILD-B — Tolerances.
 *
 * Provisoires : valeurs sobres et explicites. Ce ne sont PAS les
 * tolérances de release — elles servent au harness pour classer
 * mécaniquement un résultat de comparaison.
 *
 * Doctrine :
 *  - On combine un seuil ABSOLU et un seuil RELATIF par métrique.
 *    Un delta passe si `|abs| ≤ absThreshold` OU `|rel| ≤ relThreshold`.
 *    Cela évite les faux échecs à très courte distance (où le drop est
 *    nul ou quasi-nul, faisant exploser le ratio).
 *  - Pas de zone transsonique ici (BUILD-D / BUILD-E).
 *  - Pas de différenciation par profil ici — extensible plus tard via
 *    `resolveTolerances(profileId)`.
 */

import type { ExternalReferenceRow } from './types';

/** Métrique comparable côté harness. `range` n'est jamais comparée. */
export type ComparableMetric = Exclude<keyof ExternalReferenceRow, 'range'>;

export interface MetricTolerance {
  /** Seuil absolu dans l'unité canonique de la métrique. */
  absThreshold: number;
  /** Seuil relatif (fraction, p.ex. 0.08 = 8%). */
  relThreshold: number;
}

/**
 * Tolérances par défaut (BUILD-B). Volontairement larges côté legacy :
 * on classe le pipeline, pas la science.
 */
export const DEFAULT_TOLERANCES: Record<ComparableMetric, MetricTolerance> = {
  drop: { absThreshold: 5, relThreshold: 0.08 },        // mm | 8 %
  velocity: { absThreshold: 3, relThreshold: 0.05 },    // m/s | 5 %
  tof: { absThreshold: 0.005, relThreshold: 0.05 },     // s | 5 %
  windDrift: { absThreshold: 10, relThreshold: 0.1 },   // mm | 10 %
  energy: { absThreshold: 1, relThreshold: 0.05 },      // J | 5 %
};

/**
 * Décide si un (abs, rel) tient dans la tolérance d'une métrique.
 * Si `relative` est null (référence ≈ 0), seul l'absolu compte.
 */
export function isWithinTolerance(
  metric: ComparableMetric,
  absolute: number,
  relative: number | null,
  tol: MetricTolerance = DEFAULT_TOLERANCES[metric],
): boolean {
  const absOk = Math.abs(absolute) <= tol.absThreshold;
  if (relative === null) return absOk;
  const relOk = Math.abs(relative) <= tol.relThreshold;
  return absOk || relOk;
}
