import { describe, it, expect } from 'vitest';
import { computeScore, RUNBOOK_ITEMS, type CheckStatus } from './RunbookChecklist';

describe('RunbookChecklist', () => {
  it('has exactly 13 items', () => {
    expect(RUNBOOK_ITEMS).toHaveLength(13);
  });

  it('computeScore returns 0/13 for empty state', () => {
    const score = computeScore({});
    expect(score).toEqual({ ok: 0, ko: 0, total: 13 });
  });

  it('computeScore counts ok and ko correctly', () => {
    const state: Record<string, CheckStatus> = {
      'auth-admin-ok': 'ok',
      'auth-no-jwt': 'ok',
      'auth-no-role': 'ko',
      'providers-test': 'ok',
    };
    const score = computeScore(state);
    expect(score.ok).toBe(3);
    expect(score.ko).toBe(1);
    expect(score.total).toBe(13);
  });

  it('computeScore returns 13/13 when all ok', () => {
    const state: Record<string, CheckStatus> = {};
    for (const item of RUNBOOK_ITEMS) state[item.id] = 'ok';
    const score = computeScore(state);
    expect(score.ok).toBe(13);
    expect(score.ko).toBe(0);
  });
});