/**
 * Cross-validation — BUILD-B — Harness comparatif.
 *
 * Module pur, hors UI, hors persistence : prend un `CrossValidationCase`,
 * exécute le moteur AirBallistik sur ses inputs, aligne les sorties moteur
 * sur les distances présentes côté référence, calcule les écarts, et
 * classe le tout.
 *
 * Règles d'or (cf. doc protocolaire BUILD-A) :
 *  - aucune référence externe n'est traitée comme oracle ;
 *  - aucune valeur n'est inventée : si une métrique est absente côté
 *    référence, elle est exclue proprement ;
 *  - aucune interpolation côté moteur : on n'aligne que les distances
 *    réellement produites par `calculateTrajectory` (par défaut le
 *    `rangeStep` du cas couvre toutes les distances de référence — sinon
 *    un warning est émis et la ligne est marquée non comparable).
 *
 * Statut final :
 *  - `PASS`        : ≥1 ligne comparée et 100 % des comparaisons OK.
 *  - `INDICATIVE`  : confiance source = `C`, OU aucune ligne comparée
 *                    (p.ex. distances incompatibles), OU pipeline OK
 *                    mais classement à prendre avec recul.
 *  - `FAIL`        : ≥1 comparaison hors tolérance.
 *
 * Provisoire dans cette tranche :
 *  - tolérances uniques (cf. `tolerances.ts`) ;
 *  - pas de différenciation par profil moteur ;
 *  - pas de zone transsonique ;
 *  - pas de génération de rapport markdown (BUILD-D).
 */

import { calculateTrajectory } from '@/lib/ballistics';
import type { BallisticResult } from '@/lib/types';
import {
  DEFAULT_TOLERANCES,
  isWithinTolerance,
  type ComparableMetric,
  type MetricTolerance,
} from './tolerances';
import type {
  CrossValidationCase,
  ExternalReference,
  ExternalReferenceRow,
} from './types';

export type ComparisonStatus = 'PASS' | 'INDICATIVE' | 'FAIL';

/** Mapping métrique côté harness → champ correspondant dans `BallisticResult`. */
const METRIC_TO_RESULT: Record<ComparableMetric, keyof BallisticResult> = {
  drop: 'drop',
  velocity: 'velocity',
  tof: 'tof',
  windDrift: 'windDrift',
  energy: 'energy',
};

const ALL_METRICS: ComparableMetric[] = [
  'drop',
  'velocity',
  'tof',
  'windDrift',
  'energy',
];

export interface MetricComparison {
  metric: ComparableMetric;
  engineValue: number;
  referenceValue: number;
  /** Engine − reference, dans l'unité canonique de la métrique. */
  absoluteDelta: number;
  /**
   * Delta relatif = (engine − reference) / |reference|.
   * `null` si reference ≈ 0 (évite l'explosion numérique).
   */
  relativeDelta: number | null;
  withinTolerance: boolean;
  tolerance: MetricTolerance;
}

export interface LineComparison {
  range: number;
  /** True si le moteur a produit une ligne à cette distance exacte. */
  engineRowFound: boolean;
  /** Comparaisons par métrique disponible côté référence. */
  metrics: MetricComparison[];
  /** Métriques absentes côté référence — exclues proprement. */
  metricsMissingInReference: ComparableMetric[];
}

export interface MetricSummary {
  metric: ComparableMetric;
  /** Nombre de comparaisons effectuées (= lignes où la métrique est présente). */
  count: number;
  /** Nombre de comparaisons hors tolérance. */
  failures: number;
  /** Max |absoluteDelta| observé (0 si aucune comparaison). */
  maxAbsDelta: number;
  /** Max |relativeDelta| observé (null si aucun delta relatif calculable). */
  maxRelDelta: number | null;
}

export interface ComparisonWarning {
  kind: 'no-engine-row-at-range' | 'no-comparable-rows' | 'no-comparable-metrics';
  detail: string;
}

export interface ReferenceComparisonResult {
  caseId: string;
  source: ExternalReference['meta']['source'];
  version: string;
  confidence: ExternalReference['meta']['confidence'];
  status: ComparisonStatus;
  lines: LineComparison[];
  metricSummaries: MetricSummary[];
  warnings: ComparisonWarning[];
}

export interface CaseComparisonResult {
  caseId: string;
  /** Une entrée par référence du cas (ordre préservé). */
  perReference: ReferenceComparisonResult[];
  /**
   * Statut consolidé : pire statut parmi les références.
   * `FAIL` > `INDICATIVE` > `PASS`.
   */
  status: ComparisonStatus;
}

const STATUS_RANK: Record<ComparisonStatus, number> = {
  PASS: 0,
  INDICATIVE: 1,
  FAIL: 2,
};

function worstStatus(statuses: ComparisonStatus[]): ComparisonStatus {
  if (statuses.length === 0) return 'INDICATIVE';
  return statuses.reduce(
    (worst, s) => (STATUS_RANK[s] > STATUS_RANK[worst] ? s : worst),
    'PASS' as ComparisonStatus,
  );
}

/** Récupère la valeur d'une métrique côté résultat moteur. */
function engineMetricValue(
  row: BallisticResult,
  metric: ComparableMetric,
): number {
  // windDrift sur BallisticResult inclut déjà spinDrift — pour un cas vent
  // nul ET pas de spin-drift, c'est nul, ce qui matche les références
  // externes basiques.
  return row[METRIC_TO_RESULT[metric]] as number;
}

function buildMetricComparison(
  metric: ComparableMetric,
  engineValue: number,
  referenceValue: number,
  tolerances: Record<ComparableMetric, MetricTolerance>,
): MetricComparison {
  const absoluteDelta = engineValue - referenceValue;
  const relativeDelta =
    Math.abs(referenceValue) < 1e-9 ? null : absoluteDelta / Math.abs(referenceValue);
  const tol = tolerances[metric];
  return {
    metric,
    engineValue,
    referenceValue,
    absoluteDelta,
    relativeDelta,
    withinTolerance: isWithinTolerance(metric, absoluteDelta, relativeDelta, tol),
    tolerance: tol,
  };
}

function summariseMetrics(lines: LineComparison[]): MetricSummary[] {
  const summaries: MetricSummary[] = [];
  for (const metric of ALL_METRICS) {
    let count = 0;
    let failures = 0;
    let maxAbs = 0;
    let maxRel: number | null = null;
    for (const line of lines) {
      const m = line.metrics.find((x) => x.metric === metric);
      if (!m) continue;
      count++;
      if (!m.withinTolerance) failures++;
      const a = Math.abs(m.absoluteDelta);
      if (a > maxAbs) maxAbs = a;
      if (m.relativeDelta !== null) {
        const r = Math.abs(m.relativeDelta);
        if (maxRel === null || r > maxRel) maxRel = r;
      }
    }
    if (count > 0) {
      summaries.push({ metric, count, failures, maxAbsDelta: maxAbs, maxRelDelta: maxRel });
    }
  }
  return summaries;
}

export interface CompareOptions {
  /** Override des tolérances par défaut (utile pour tests). */
  tolerances?: Partial<Record<ComparableMetric, MetricTolerance>>;
}

/**
 * Compare une référence externe au moteur pour un cas donné.
 * Module pur : ne lit aucun fichier, ne fait aucun I/O.
 */
export function compareReference(
  cvCase: CrossValidationCase,
  reference: ExternalReference,
  engineResults: BallisticResult[],
  options: CompareOptions = {},
): ReferenceComparisonResult {
  const tolerances = { ...DEFAULT_TOLERANCES, ...(options.tolerances ?? {}) };

  // Index des résultats moteur par range exact pour alignement O(1).
  const engineByRange = new Map<number, BallisticResult>();
  for (const r of engineResults) engineByRange.set(r.range, r);

  const warnings: ComparisonWarning[] = [];
  const lines: LineComparison[] = [];

  for (const refRow of reference.rows) {
    const engineRow = engineByRange.get(refRow.range);
    if (!engineRow) {
      warnings.push({
        kind: 'no-engine-row-at-range',
        detail: `No engine row at range=${refRow.range} m (rangeStep=${cvCase.inputs.rangeStep})`,
      });
      lines.push({
        range: refRow.range,
        engineRowFound: false,
        metrics: [],
        metricsMissingInReference: [],
      });
      continue;
    }

    const metrics: MetricComparison[] = [];
    const missing: ComparableMetric[] = [];
    for (const metric of ALL_METRICS) {
      const refVal = refRow[metric];
      if (refVal === undefined) {
        missing.push(metric);
        continue;
      }
      const engVal = engineMetricValue(engineRow, metric);
      metrics.push(buildMetricComparison(metric, engVal, refVal, tolerances));
    }

    lines.push({
      range: refRow.range,
      engineRowFound: true,
      metrics,
      metricsMissingInReference: missing,
    });
  }

  const metricSummaries = summariseMetrics(lines);

  // Statut : honnête face à l'absence de comparaisons.
  const totalComparisons = metricSummaries.reduce((s, m) => s + m.count, 0);
  const totalFailures = metricSummaries.reduce((s, m) => s + m.failures, 0);

  let status: ComparisonStatus;
  if (totalComparisons === 0) {
    warnings.push({
      kind: 'no-comparable-metrics',
      detail: 'Aucune métrique comparable entre moteur et référence',
    });
    status = 'INDICATIVE';
  } else if (totalFailures > 0) {
    status = 'FAIL';
  } else if (reference.meta.confidence === 'C') {
    // Confiance C → on ne déclare jamais PASS, seulement INDICATIVE.
    status = 'INDICATIVE';
  } else {
    status = 'PASS';
  }

  return {
    caseId: cvCase.id,
    source: reference.meta.source,
    version: reference.meta.version,
    confidence: reference.meta.confidence,
    status,
    lines,
    metricSummaries,
    warnings,
  };
}

/**
 * Exécute le moteur sur un cas et compare toutes ses références.
 * Wrapper haut-niveau utilisé par les tests d'infra et par le futur
 * runner BUILD-D.
 */
export function runCaseComparison(
  cvCase: CrossValidationCase,
  options: CompareOptions = {},
): CaseComparisonResult {
  const engineResults = calculateTrajectory(cvCase.inputs);
  const perReference = cvCase.references.map((ref) =>
    compareReference(cvCase, ref, engineResults, options),
  );
  return {
    caseId: cvCase.id,
    perReference,
    status: worstStatus(perReference.map((r) => r.status)),
  };
}

// Re-export type aliases utiles à l'extérieur sans forcer un import depuis
// tolerances pour l'API publique du harness.
export type { ComparableMetric, MetricTolerance };
