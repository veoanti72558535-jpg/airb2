/**
 * Golden validator — runs the deterministic engine on every known
 * "golden case" and compares its outputs against the expected oracle,
 * applying configurable per-metric tolerances.
 *
 * Scope of this module
 * --------------------
 *  - Pure orchestration. Wraps `calculateTrajectory` (engine) and
 *    `compareReference` (BUILD-B harness). NO new comparison logic, NO
 *    new tolerance semantics : we reuse `isWithinTolerance` so the
 *    rules of engagement match the existing harness exactly.
 *  - Two case shapes accepted :
 *      1. **External-reference cases** loaded from
 *         `src/lib/__fixtures__/cross-validation/<id>/` via
 *         `loadAllCases()`. These have a real external oracle → status
 *         is computed by `compareReference`.
 *      2. **In-memory cases** passed by the caller (e.g. the
 *         `GOLDEN_FIXTURES` snapshot suite). When a caller-supplied
 *         `expectedRows` oracle is present, we run the same comparator
 *         against that synthetic reference. When no oracle is supplied,
 *         the validator returns status `BASELINE` and the engine output
 *         is recorded for inspection — we never invent a verdict.
 *  - Node-only by construction : we depend on `fixture-discovery` which
 *    pulls `node:fs`. Do NOT import this file from the React bundle.
 *
 * Tolerance configuration
 * -----------------------
 * Callers can override the default per-metric tolerances on a partial
 * basis (only metrics they care about). Anything not overridden falls
 * back to `DEFAULT_TOLERANCES`. A common pattern :
 *   validateGoldenCases({ tolerances: { drop: { absThreshold: 1, relThreshold: 0.02 } } })
 * tightens drop while keeping the legacy thresholds for velocity, etc.
 *
 * Honesty rules (cf. BUILD-B doctrine)
 * ------------------------------------
 *  - No silent unit conversion.
 *  - No engine-side interpolation : we only compare at distances the
 *    engine actually produced (cf. `compareReference`).
 *  - No automatic snapshot rewrite. This module REPORTS, it does not
 *    mutate fixtures.
 */

import { calculateTrajectory } from '@/lib/ballistics';
import type { BallisticInput, BallisticResult } from '@/lib/types';

import {
  compareReference,
  type ComparisonStatus,
  type ReferenceComparisonResult,
} from './compare';
import { loadAllCases, DEFAULT_FIXTURES_ROOT } from './fixture-discovery';
import { DEFAULT_TOLERANCES, type ComparableMetric, type MetricTolerance } from './tolerances';
import type {
  CrossValidationCase,
  ExternalReference,
  ExternalReferenceRow,
} from './types';

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

/** Status with one extra value vs. `ComparisonStatus`. */
export type ValidationStatus = ComparisonStatus | 'BASELINE';

/** Tolerance overrides : partial map, falls back to DEFAULT_TOLERANCES. */
export type TolerancesOverride = Partial<Record<ComparableMetric, MetricTolerance>>;

export interface InMemoryGoldenCase {
  /** Stable identifier — also used in the report. */
  id: string;
  /** Human description (optional). */
  description?: string;
  /** Engine input fed to `calculateTrajectory`. */
  input: BallisticInput;
  /**
   * Expected oracle rows. When provided, compared against engine output
   * with the configured tolerances. When omitted, status = BASELINE.
   */
  expectedRows?: ExternalReferenceRow[];
  /** Optional tag forwarded to the comparator's reference meta. */
  oracleLabel?: string;
}

export interface ValidatedCaseReport {
  caseId: string;
  description: string | null;
  source: 'cross-validation-fixture' | 'in-memory';
  status: ValidationStatus;
  /** Engine output, full table (every range). */
  engineRows: BallisticResult[];
  /** Per-reference comparisons. Empty for BASELINE cases. */
  comparisons: ReferenceComparisonResult[];
  /** Quick metric -> max |Δ| absolute summary across all references. */
  worstAbsoluteDeltas: Partial<Record<ComparableMetric, number>>;
}

export interface ValidationReport {
  generatedAt: string;
  toleranceProfile: Record<ComparableMetric, MetricTolerance>;
  totals: {
    cases: number;
    pass: number;
    indicative: number;
    fail: number;
    baseline: number;
  };
  /** Worst (= highest priority) status across all cases. */
  overallStatus: ValidationStatus;
  cases: ValidatedCaseReport[];
}

export interface ValidateOptions {
  /** Partial override of per-metric tolerances. */
  tolerances?: TolerancesOverride;
  /** Extra in-memory cases (typically GOLDEN_FIXTURES). */
  inMemoryCases?: InMemoryGoldenCase[];
  /** Override the fixtures root (tests). */
  fixturesRoot?: string;
  /** Skip filesystem discovery entirely (tests / browser-only callers). */
  skipFixtureDiscovery?: boolean;
}

// ----------------------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------------------

const STATUS_RANK: Record<ValidationStatus, number> = {
  PASS: 0,
  BASELINE: 1,
  INDICATIVE: 2,
  FAIL: 3,
};

function worstStatus(statuses: ValidationStatus[]): ValidationStatus {
  if (statuses.length === 0) return 'BASELINE';
  return statuses.reduce<ValidationStatus>(
    (acc, s) => (STATUS_RANK[s] > STATUS_RANK[acc] ? s : acc),
    'PASS',
  );
}

function resolveTolerances(
  override: TolerancesOverride | undefined,
): Record<ComparableMetric, MetricTolerance> {
  return { ...DEFAULT_TOLERANCES, ...(override ?? {}) };
}

/** Turn an in-memory oracle into a synthetic ExternalReference. */
function asSyntheticReference(
  expected: ExternalReferenceRow[],
  label: string,
): ExternalReference {
  return {
    meta: {
      source: 'auxiliary',
      version: label,
      confidence: 'B',
      extractionMethod: 'manual-entry',
      extractedAt: new Date().toISOString().slice(0, 10),
      assumptions: ['In-memory oracle supplied by validator caller'],
    },
    rows: expected,
  };
}

function computeWorstAbsDeltas(
  comparisons: ReferenceComparisonResult[],
): Partial<Record<ComparableMetric, number>> {
  const out: Partial<Record<ComparableMetric, number>> = {};
  for (const c of comparisons) {
    for (const m of c.metricSummaries) {
      const cur = out[m.metric] ?? 0;
      if (m.maxAbsDelta > cur) out[m.metric] = m.maxAbsDelta;
    }
  }
  return out;
}

// ----------------------------------------------------------------------------
// Per-case runners
// ----------------------------------------------------------------------------

/**
 * Runs the engine on a cross-validation fixture and compares it against
 * every external reference attached to the case.
 */
export function validateExternalCase(
  cvCase: CrossValidationCase,
  tolerances: TolerancesOverride = {},
): ValidatedCaseReport {
  const engineRows = calculateTrajectory(cvCase.inputs);
  const comparisons = cvCase.references.map((ref) =>
    compareReference(cvCase, ref, engineRows, { tolerances }),
  );
  const refStatuses = comparisons.map((c) => c.status as ValidationStatus);
  return {
    caseId: cvCase.id,
    description: cvCase.description ?? null,
    source: 'cross-validation-fixture',
    status: worstStatus(refStatuses),
    engineRows,
    comparisons,
    worstAbsoluteDeltas: computeWorstAbsDeltas(comparisons),
  };
}

/**
 * Runs the engine on an in-memory golden case. If `expectedRows` is
 * supplied, the validator compares against it as a synthetic reference.
 * Otherwise the case is recorded as `BASELINE` (engine ran, no oracle).
 */
export function validateInMemoryCase(
  goldenCase: InMemoryGoldenCase,
  tolerances: TolerancesOverride = {},
): ValidatedCaseReport {
  const engineRows = calculateTrajectory(goldenCase.input);

  if (!goldenCase.expectedRows || goldenCase.expectedRows.length === 0) {
    return {
      caseId: goldenCase.id,
      description: goldenCase.description ?? null,
      source: 'in-memory',
      status: 'BASELINE',
      engineRows,
      comparisons: [],
      worstAbsoluteDeltas: {},
    };
  }

  const synthRef = asSyntheticReference(
    goldenCase.expectedRows,
    goldenCase.oracleLabel ?? `${goldenCase.id}-oracle`,
  );
  // Build a minimal CrossValidationCase wrapper so compareReference is happy.
  const wrapped: CrossValidationCase = {
    id: goldenCase.id,
    description: goldenCase.description ?? '',
    inputs: goldenCase.input,
    references: [synthRef],
  };
  const comparison = compareReference(wrapped, synthRef, engineRows, { tolerances });

  return {
    caseId: goldenCase.id,
    description: goldenCase.description ?? null,
    source: 'in-memory',
    status: comparison.status as ValidationStatus,
    engineRows,
    comparisons: [comparison],
    worstAbsoluteDeltas: computeWorstAbsDeltas([comparison]),
  };
}

// ----------------------------------------------------------------------------
// Top-level entry point
// ----------------------------------------------------------------------------

/**
 * Validates every discoverable golden case + every in-memory case
 * supplied by the caller. Pure orchestration : no I/O outside of the
 * fixture discovery (which can be skipped via `skipFixtureDiscovery`).
 */
export function validateGoldenCases(options: ValidateOptions = {}): ValidationReport {
  const tolProfile = resolveTolerances(options.tolerances);
  const cases: ValidatedCaseReport[] = [];

  // 1. External-reference fixtures (Node only).
  if (!options.skipFixtureDiscovery) {
    const root = options.fixturesRoot ?? DEFAULT_FIXTURES_ROOT;
    let assembled: ReturnType<typeof loadAllCases>;
    try {
      assembled = loadAllCases(root);
    } catch (err) {
      // Honest failure : surface the error rather than silently skipping.
      throw new Error(
        `validateGoldenCases: failed to load fixtures from ${root} — ${(err as Error).message}`,
      );
    }
    for (const a of assembled) {
      cases.push(validateExternalCase(a.case, options.tolerances));
    }
  }

  // 2. In-memory cases (e.g. GOLDEN_FIXTURES snapshot suite).
  for (const inMem of options.inMemoryCases ?? []) {
    cases.push(validateInMemoryCase(inMem, options.tolerances));
  }

  // 3. Aggregate.
  const totals = {
    cases: cases.length,
    pass: cases.filter((c) => c.status === 'PASS').length,
    indicative: cases.filter((c) => c.status === 'INDICATIVE').length,
    fail: cases.filter((c) => c.status === 'FAIL').length,
    baseline: cases.filter((c) => c.status === 'BASELINE').length,
  };
  const overall = worstStatus(cases.map((c) => c.status));

  return {
    generatedAt: new Date().toISOString(),
    toleranceProfile: tolProfile,
    totals,
    overallStatus: overall,
    cases,
  };
}