import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { assembleCrossValidationCase } from './case-loader';
import type { ReferenceMeta } from './types';
import type { BallisticInput } from '@/lib/types';

const FIXTURE_DIR = resolve(
  __dirname,
  '../__fixtures__/cross-validation/case-22-pellet-18gr-270-zero30',
);

function readFixture(name: string): string {
  return readFileSync(resolve(FIXTURE_DIR, name), 'utf-8');
}

describe('assembleCrossValidationCase + pilot fixture', () => {
  it('loads the pilot case end-to-end', () => {
    const inputs = JSON.parse(readFixture('inputs.json')) as BallisticInput;
    const meta = JSON.parse(readFixture('source-auxiliary.meta.json')) as ReferenceMeta;
    const csv = readFixture('source-auxiliary.csv');

    const { case: cvCase, warningsByReference } = assembleCrossValidationCase({
      id: 'case-22-pellet-18gr-270-zero30',
      description: '.22 pellet 18gr @ 270 m/s, zero 30m',
      tags: ['.22', 'pellet', 'bootstrap'],
      inputs,
      references: [{ meta, csv }],
    });

    expect(cvCase.id).toBe('case-22-pellet-18gr-270-zero30');
    expect(cvCase.inputs.muzzleVelocity).toBe(270);
    expect(cvCase.inputs.bc).toBeCloseTo(0.035);
    expect(cvCase.inputs.dragModel).toBe('G1');

    expect(cvCase.references).toHaveLength(1);
    const ref = cvCase.references[0];
    expect(ref.meta.source).toBe('auxiliary');
    expect(ref.meta.confidence).toBe('C');
    expect(ref.rows.length).toBeGreaterThanOrEqual(5);

    const r100 = ref.rows.find((r) => r.range === 100);
    expect(r100).toBeDefined();
    expect(r100!.drop).toBeLessThan(0);
    expect(r100!.velocity).toBeGreaterThan(150);

    expect(warningsByReference[0]).toEqual([]);
  });

  it('throws when no references are provided', () => {
    expect(() =>
      assembleCrossValidationCase({
        id: 'broken',
        description: 'no refs',
        inputs: {} as BallisticInput,
        references: [],
      }),
    ).toThrow(/no references/i);
  });
});