/**
 * BUILD-C bis — Tests de la persistance localStorage des cas utilisateur.
 *
 * Vérifie le contrat CRUD + l'invariant de validation : on ne stocke
 * jamais un cas qui n'aurait pas passé la validation Zod.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  USER_CASES_STORAGE_KEY,
  userCaseRepo,
} from './user-case-repo';
import type { UserCrossValidationCase } from './user-case-schema';

function validCase(id = 'test-case'): UserCrossValidationCase {
  return {
    caseId: id,
    title: 'Test',
    inputs: {
      projectileName: 'JSB',
      caliber: '.22',
      weightGrains: 18,
      bc: 0.035,
      muzzleVelocity: 280,
      sightHeight: 50,
      zeroDistance: 30,
      rangeMax: 50,
      rangeStep: 10,
    },
    references: [
      {
        meta: {
          source: 'strelok-pro',
          version: '6.x',
          confidence: 'B',
          extractionMethod: 'manual-entry',
          extractedAt: '2025-04-12',
        },
        rows: [{ range: 10, drop: 5 }],
      },
    ],
    schemaVersion: 1,
  };
}

describe('userCaseRepo', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts empty', () => {
    expect(userCaseRepo.getAll()).toEqual([]);
  });

  it('creates and reads back a valid case', () => {
    const result = userCaseRepo.create(validCase());
    expect(result.ok).toBe(true);
    expect(result.stored?.id).toBeTruthy();
    expect(userCaseRepo.getAll()).toHaveLength(1);
    if (result.stored) {
      const reloaded = userCaseRepo.getById(result.stored.id);
      expect(reloaded?.case.caseId).toBe('test-case');
    }
  });

  it('rejects an invalid payload without persisting it', () => {
    const result = userCaseRepo.create({ not: 'a case' });
    expect(result.ok).toBe(false);
    expect(result.issues?.length).toBeGreaterThan(0);
    expect(userCaseRepo.getAll()).toEqual([]);
  });

  it('updates an existing case in place', () => {
    const created = userCaseRepo.create(validCase('orig'));
    const id = created.stored!.id;
    const updated = userCaseRepo.update(id, { ...validCase('orig'), title: 'New title' });
    expect(updated.ok).toBe(true);
    expect(updated.stored?.case.title).toBe('New title');
    expect(userCaseRepo.getAll()).toHaveLength(1);
  });

  it('refuses to update with an invalid payload (does not corrupt store)', () => {
    const created = userCaseRepo.create(validCase('orig'));
    const id = created.stored!.id;
    const result = userCaseRepo.update(id, { broken: true });
    expect(result.ok).toBe(false);
    const reloaded = userCaseRepo.getById(id);
    expect(reloaded?.case.title).toBe('Test');
  });

  it('removes a case', () => {
    const created = userCaseRepo.create(validCase());
    const id = created.stored!.id;
    expect(userCaseRepo.remove(id)).toBe(true);
    expect(userCaseRepo.getAll()).toEqual([]);
    expect(userCaseRepo.remove(id)).toBe(false);
  });

  it('survives a corrupted localStorage payload (returns empty)', () => {
    localStorage.setItem(USER_CASES_STORAGE_KEY, '{not json');
    expect(userCaseRepo.getAll()).toEqual([]);
  });

  it('clear() empties the repo', () => {
    userCaseRepo.create(validCase('case-a'));
    userCaseRepo.create(validCase('case-b'));
    expect(userCaseRepo.getAll()).toHaveLength(2);
    userCaseRepo.clear();
    expect(userCaseRepo.getAll()).toEqual([]);
  });
});