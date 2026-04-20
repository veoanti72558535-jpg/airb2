import { describe, it, expect } from 'vitest';
import { calculateTrajectory } from '@/lib/ballistics';
import { compareReference, runCaseComparison } from './compare';
import type {
  CrossValidationCase,
  ExternalReference,
  ReferenceMeta,
} from './types';
import type { BallisticInput } from '@/lib/types';

const baseInputs: BallisticInput = {
  muzzleVelocity: 270,
  bc: 0.035,
  projectileWeight: 18,
  sightHeight: 50,
  zeroRange: 30,
  maxRange: 150,
  rangeStep: 5,
  dragModel: 'G1',
  weather: {
    temperature: 15,
    humidity: 50,
    pressure: 1013.25,
    altitude: 0,
    windSpeed: 0,
    windAngle: 0,
    source: 'manual',
    timestamp: '',
  },
};

function makeMeta(overrides: Partial<ReferenceMeta> = {}): ReferenceMeta {
  return {
    source: 'auxiliary',
    version: 'test-1',
    confidence: 'A',
    extractionMethod: 'manual-entry',
    extractedAt: '2026-04-20',
    ...overrides,
  };
}

function makeCase(): CrossValidationCase {
  return {
    id: 'unit-case',
    description: 'unit test case',
    inputs: baseInputs,
    references: [],
  };
}

describe('compareReference — comportements de base', () => {
  it('produit PASS quand la référence colle exactement à la sortie moteur', () => {
    const cvCase = makeCase();
    const engineResults = calculateTrajectory(cvCase.inputs);
    // Construit une référence à partir de la sortie moteur → 0 delta partout.
    const reference: ExternalReference = {
      meta: makeMeta({ confidence: 'A' }),
      rows: engineResults
        .filter((r) => [25, 50, 75, 100].includes(r.range))
        .map((r) => ({
          range: r.range,
          drop: r.drop,
          velocity: r.velocity,
          tof: r.tof,
        })),
    };
    const result = compareReference(cvCase, reference, engineResults);
    expect(result.status).toBe('PASS');
    expect(result.warnings).toEqual([]);
    expect(result.lines).toHaveLength(4);
    for (const line of result.lines) {
      expect(line.engineRowFound).toBe(true);
      for (const m of line.metrics) {
        expect(m.absoluteDelta).toBeCloseTo(0, 6);
        expect(m.withinTolerance).toBe(true);
      }
    }
  });

  it('confiance C ne peut jamais déclarer PASS — au mieux INDICATIVE', () => {
    const cvCase = makeCase();
    const engineResults = calculateTrajectory(cvCase.inputs);
    const reference: ExternalReference = {
      meta: makeMeta({ confidence: 'C' }),
      rows: engineResults
        .filter((r) => r.range === 50)
        .map((r) => ({ range: r.range, drop: r.drop, velocity: r.velocity })),
    };
    const result = compareReference(cvCase, reference, engineResults);
    expect(result.status).toBe('INDICATIVE');
    // Toutes les comparaisons internes doivent quand même être OK
    expect(result.metricSummaries.every((s) => s.failures === 0)).toBe(true);
  });

  it('FAIL quand au moins une comparaison sort de tolérance', () => {
    const cvCase = makeCase();
    const engineResults = calculateTrajectory(cvCase.inputs);
    const r50 = engineResults.find((r) => r.range === 50)!;
    const reference: ExternalReference = {
      meta: makeMeta({ confidence: 'A' }),
      rows: [
        { range: 50, drop: r50.drop + 200, velocity: r50.velocity }, // drop monstrueux
      ],
    };
    const result = compareReference(cvCase, reference, engineResults);
    expect(result.status).toBe('FAIL');
    const dropSummary = result.metricSummaries.find((s) => s.metric === 'drop')!;
    expect(dropSummary.failures).toBe(1);
  });
});

describe('compareReference — métriques manquantes & deltas', () => {
  it('ignore proprement une métrique absente côté référence', () => {
    const cvCase = makeCase();
    const engineResults = calculateTrajectory(cvCase.inputs);
    const r50 = engineResults.find((r) => r.range === 50)!;
    const reference: ExternalReference = {
      meta: makeMeta({ confidence: 'A' }),
      rows: [{ range: 50, drop: r50.drop }], // pas de velocity, pas de tof
    };
    const result = compareReference(cvCase, reference, engineResults);
    const line = result.lines[0];
    expect(line.metrics.map((m) => m.metric)).toEqual(['drop']);
    expect(line.metricsMissingInReference).toEqual(
      expect.arrayContaining(['velocity', 'tof', 'windDrift', 'energy']),
    );
    expect(result.status).toBe('PASS');
  });

  it('calcule abs et rel correctement, et met rel=null si ref≈0', () => {
    const cvCase = makeCase();
    const engineResults = calculateTrajectory(cvCase.inputs);
    const r50 = engineResults.find((r) => r.range === 50)!;
    // ref drop = 0 → rel doit être null mais abs doit être calculé
    const reference: ExternalReference = {
      meta: makeMeta({ confidence: 'A' }),
      rows: [{ range: 50, drop: 0, velocity: r50.velocity * 1.10 }],
    };
    const result = compareReference(cvCase, reference, engineResults);
    const dropM = result.lines[0].metrics.find((m) => m.metric === 'drop')!;
    expect(dropM.relativeDelta).toBeNull();
    expect(dropM.absoluteDelta).toBeCloseTo(r50.drop, 1);

    const velM = result.lines[0].metrics.find((m) => m.metric === 'velocity')!;
    expect(velM.relativeDelta).not.toBeNull();
    // engine - ref ≈ -10% de ref
    expect(velM.relativeDelta!).toBeCloseTo(-0.10 / 1.10 * 1.10, 1);
  });
});

describe('compareReference — alignement de range', () => {
  it('warn et marque la ligne non comparable si aucune row moteur à ce range', () => {
    const cvCase = makeCase();
    const engineResults = calculateTrajectory(cvCase.inputs);
    const reference: ExternalReference = {
      meta: makeMeta({ confidence: 'A' }),
      rows: [
        { range: 33, drop: -10, velocity: 250 }, // 33m n'est pas un multiple de rangeStep=5
        { range: 50, drop: engineResults.find((r) => r.range === 50)!.drop },
      ],
    };
    const result = compareReference(cvCase, reference, engineResults);
    const warn = result.warnings.find((w) => w.kind === 'no-engine-row-at-range');
    expect(warn).toBeDefined();
    const orphan = result.lines.find((l) => l.range === 33)!;
    expect(orphan.engineRowFound).toBe(false);
    expect(orphan.metrics).toEqual([]);
  });

  it('INDICATIVE si aucune métrique comparable au final', () => {
    const cvCase = makeCase();
    const engineResults = calculateTrajectory(cvCase.inputs);
    const reference: ExternalReference = {
      meta: makeMeta({ confidence: 'A' }),
      rows: [
        { range: 33 }, // pas de range moteur ET aucune métrique
      ],
    };
    const result = compareReference(cvCase, reference, engineResults);
    expect(result.status).toBe('INDICATIVE');
    expect(
      result.warnings.some((w) => w.kind === 'no-comparable-metrics'),
    ).toBe(true);
  });
});

describe('runCaseComparison — wrapper haut niveau', () => {
  it('exécute moteur + compare toutes les références d\'un cas', () => {
    const engineResults = calculateTrajectory(baseInputs);
    const r50 = engineResults.find((r) => r.range === 50)!;
    const r100 = engineResults.find((r) => r.range === 100)!;
    const cvCase: CrossValidationCase = {
      id: 'multi-ref',
      description: 'two refs',
      inputs: baseInputs,
      references: [
        {
          meta: makeMeta({ source: 'strelok', confidence: 'A' }),
          rows: [
            { range: 50, drop: r50.drop, velocity: r50.velocity },
            { range: 100, drop: r100.drop, velocity: r100.velocity },
          ],
        },
        {
          meta: makeMeta({ source: 'auxiliary', confidence: 'C' }),
          rows: [{ range: 50, drop: r50.drop }],
        },
      ],
    };
    const result = runCaseComparison(cvCase);
    expect(result.perReference).toHaveLength(2);
    expect(result.perReference[0].status).toBe('PASS');
    expect(result.perReference[1].status).toBe('INDICATIVE');
    // Pire statut = INDICATIVE (pas PASS, pas FAIL)
    expect(result.status).toBe('INDICATIVE');
  });

  it('le statut consolidé est FAIL dès qu\'une référence FAIL', () => {
    const engineResults = calculateTrajectory(baseInputs);
    const r50 = engineResults.find((r) => r.range === 50)!;
    const cvCase: CrossValidationCase = {
      id: 'mixed',
      description: 'one good one bad',
      inputs: baseInputs,
      references: [
        {
          meta: makeMeta({ source: 'strelok', confidence: 'A' }),
          rows: [{ range: 50, drop: r50.drop }],
        },
        {
          meta: makeMeta({ source: 'mero', confidence: 'A' }),
          rows: [{ range: 50, drop: r50.drop + 500 }],
        },
      ],
    };
    const result = runCaseComparison(cvCase);
    expect(result.status).toBe('FAIL');
  });
});
