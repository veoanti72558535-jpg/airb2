/**
 * Tranche I — Assistant de correction réticule (logique pure).
 *
 * Lit des résultats balistiques DÉJÀ calculés par le moteur et les présente
 * dans l'unité du réticule lié à l'optique. Aucun recalcul, aucune physique
 * nouvelle, aucune subtension dynamique inventée :
 *  - on lit `result.holdover` (MOA) et `result.holdoverMRAD` (MRAD) tels
 *    quels (FFP-correct, source de vérité moteur) ;
 *  - on choisit l'unité d'affichage à partir du réticule lié ;
 *  - on propose éventuellement un repère approximatif (`marks[]`) sans
 *    interpolation balistique ni promesse excessive.
 *
 * Strict scope :
 *  - aucune interaction avec le moteur (`ballistics/**`)
 *  - aucune logique MERO
 *  - aucun `EngineBadge`
 *  - aucun calcul SFP avancé : si `Reticle.focalPlane === 'SFP'` et qu'on
 *    n'a pas de calibration fiable côté résultats, on revient à l'unité
 *    seule et on signale `assistDegraded: 'sfp-unsupported'`.
 *
 * Tout est sérialisable + testable sans React.
 */
import type {
  BallisticResult,
  Optic,
  Reticle,
  ReticleUnit,
} from './types';
import { resolveRowAt } from './ballistic-table';

// ── Statuts d'erreur affichés par l'UI ──────────────────────────────────
export type ReticleAssistStatus =
  | 'ok'                 // optique + réticule + unité exploitable
  | 'no-optic'           // pas d'optique liée
  | 'no-reticle'         // optique sans `reticleId`
  | 'reticle-missing';   // `reticleId` pointe vers un réticule introuvable

/** Détérioration partielle de l'aide quand on ne peut pas faire mieux. */
export type ReticleAssistDegraded =
  | 'no-marks'           // unité OK, pas de `marks[]`
  | 'sfp-unsupported';   // SFP sans calibration exploitable → unit-only

export interface ReticleAssistMark {
  /** Distance lue depuis la table (m). */
  distance: number;
  /** Holdover vertical exprimé dans `unit`. Toujours signé (chute = négatif). */
  vertical: number;
  /** Dérive vent dans `unit`. Toujours signé. */
  wind: number;
  /**
   * Repère le plus proche dans `marks[]` lorsque disponible — sinon `null`.
   * On compare la valeur absolue du holdover vertical.
   */
  nearestMark: number | null;
  /**
   * Encadrement entre deux repères consécutifs si `marks[]` permet de le
   * dire — sinon `null`. Le tuple est trié croissant.
   */
  betweenMarks: [number, number] | null;
}

export interface ReticleAssist {
  status: ReticleAssistStatus;
  /** Renseigné dès que `status === 'ok'`. */
  reticle?: Reticle;
  /** Toujours renseigné si on a une optique, même sans réticule lié. */
  optic?: Optic;
  /** Unité d'affichage (réticule). Présente uniquement si `status === 'ok'`. */
  unit?: ReticleUnit;
  /** Lignes prêtes à afficher. Vide en dehors de `status === 'ok'`. */
  rows: ReticleAssistMark[];
  /** Dégradation éventuelle même si `status === 'ok'`. */
  degraded?: ReticleAssistDegraded;
}

interface ResolveArgs {
  optic?: Optic | null;
  /**
   * Lookup de réticule injecté pour rester pur / testable. En prod le
   * caller passe `(id) => reticleStore.getById(id)`.
   */
  getReticleById: (id: string) => Reticle | undefined;
  results: BallisticResult[];
  /** Distances à matérialiser dans le panneau. */
  distances: number[];
}

/**
 * Repère le mark le plus proche d'un holdover (en valeur absolue).
 * Retourne `null` si `marks` est absent / vide.
 */
export function pickNearestMark(holdover: number, marks?: number[]): number | null {
  if (!marks || marks.length === 0) return null;
  const target = Math.abs(holdover);
  let best = marks[0];
  let bestDist = Math.abs(target - best);
  for (let i = 1; i < marks.length; i++) {
    const d = Math.abs(target - marks[i]);
    if (d < bestDist) {
      best = marks[i];
      bestDist = d;
    }
  }
  return best;
}

/**
 * Renvoie les deux repères qui encadrent strictement `|holdover|` lorsque
 * `marks[]` permet de le dire. `null` si on est en dehors ou si `marks`
 * est trop court.
 */
export function pickBetweenMarks(
  holdover: number,
  marks?: number[],
): [number, number] | null {
  if (!marks || marks.length < 2) return null;
  const sorted = [...marks].sort((a, b) => a - b);
  const target = Math.abs(holdover);
  for (let i = 0; i < sorted.length - 1; i++) {
    if (target > sorted[i] && target < sorted[i + 1]) {
      return [sorted[i], sorted[i + 1]];
    }
  }
  return null;
}

/**
 * Construit l'aide réticule. Pure : pas d'I/O, pas de moteur, pas de
 * dépendance UI. Le caller garde la main sur les distances affichées
 * (typiquement la même config que la table balistique).
 */
export function buildReticleAssist({
  optic,
  getReticleById,
  results,
  distances,
}: ResolveArgs): ReticleAssist {
  if (!optic) return { status: 'no-optic', rows: [] };
  if (!optic.reticleId) return { status: 'no-reticle', optic, rows: [] };

  const reticle = getReticleById(optic.reticleId);
  if (!reticle) return { status: 'reticle-missing', optic, rows: [] };

  // SFP sans calibration : on n'invente rien. Unit-only signalé.
  const sfpUnsupported =
    reticle.focalPlane === 'SFP' &&
    (optic.magCalibration == null || optic.magCalibration <= 0);

  const unit: ReticleUnit = reticle.unit;
  const hasMarks = !!reticle.marks && reticle.marks.length > 0;

  const rows: ReticleAssistMark[] = [];
  for (const d of distances) {
    const row = resolveRowAt(results, d);
    if (!row) continue;
    const vertical = unit === 'MOA' ? row.holdover : row.holdoverMRAD;
    const wind = unit === 'MOA' ? row.windDriftMOA : row.windDriftMRAD;
    rows.push({
      distance: d,
      vertical,
      wind,
      nearestMark: hasMarks ? pickNearestMark(vertical, reticle.marks) : null,
      betweenMarks: hasMarks ? pickBetweenMarks(vertical, reticle.marks) : null,
    });
  }

  let degraded: ReticleAssistDegraded | undefined;
  if (sfpUnsupported) degraded = 'sfp-unsupported';
  else if (!hasMarks) degraded = 'no-marks';

  return {
    status: 'ok',
    reticle,
    optic,
    unit,
    rows,
    degraded,
  };
}
