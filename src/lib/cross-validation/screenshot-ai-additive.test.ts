/**
 * IA-1 — garantit que l'ajout de `'screenshot-ai'` à
 * `CrossValidationExtractionMethod` reste STRICTEMENT additif.
 *
 * Si quelqu'un retire ou renomme un des extracteurs historiques, ce test
 * casse — c'est intentionnel : les fixtures existantes en dépendent.
 */
import { describe, expect, it } from 'vitest';
import {
  validateUserCase,
  makeEmptyUserCase,
  type UserCrossValidationCase,
} from './user-case-schema';

const HISTORICAL_METHODS = [
  'export-csv',
  'export-json',
  'screenshot-retyped',
  'manual-entry',
  'published-table',
] as const;

function caseWithMethod(m: string): UserCrossValidationCase {
  const c = makeEmptyUserCase();
  c.references[0].meta.version = 'v-test';
  c.references[0].meta.extractionMethod = m as never;
  // `makeEmptyUserCase()` laisse les champs balistiques à 0 / '' pour
  // forcer la saisie utilisateur. On les remplit ici pour que le seul
  // axe testé reste `extractionMethod`.
  c.inputs.projectileName = 'JSB Exact';
  c.inputs.caliber = '.22';
  c.inputs.weightGrains = 18.13;
  c.inputs.bc = 0.035;
  c.inputs.muzzleVelocity = 280;
  c.inputs.zeroDistance = 30;
  return c;
}

describe('screenshot-ai — additivité', () => {
  it('toutes les méthodes historiques restent valides', () => {
    for (const m of HISTORICAL_METHODS) {
      const v = validateUserCase(caseWithMethod(m));
      expect(v.ok, `method ${m} must still validate`).toBe(true);
    }
  });

  it('`screenshot-ai` est désormais valide', () => {
    const v = validateUserCase(caseWithMethod('screenshot-ai'));
    expect(v.ok).toBe(true);
  });

  it('une méthode inconnue est rejetée', () => {
    const v = validateUserCase(caseWithMethod('telepathy'));
    expect(v.ok).toBe(false);
  });
});