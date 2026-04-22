import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveCasesLastWriteWins } from './cross-validation-supabase-repo';
import type { StoredUserCase } from './cross-validation/user-case-repo';

function makeCase(overrides: Partial<StoredUserCase> = {}): StoredUserCase {
  return {
    id: 'case-1',
    case: { caseId: 'c', title: 'T', inputs: {}, references: [], schemaVersion: 1 } as any,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('resolveCasesLastWriteWins', () => {
  it('local newer → local wins', () => {
    const local = [makeCase({ createdAt: '2025-06-01T00:00:00Z' })];
    const remote = [makeCase({ createdAt: '2025-01-01T00:00:00Z' })];
    const result = resolveCasesLastWriteWins(local, remote);
    expect(result).toHaveLength(1);
    expect(result[0].createdAt).toBe('2025-06-01T00:00:00Z');
  });

  it('remote newer → remote wins', () => {
    const local = [makeCase({ createdAt: '2025-01-01T00:00:00Z' })];
    const remote = [makeCase({ createdAt: '2025-06-01T00:00:00Z' })];
    const result = resolveCasesLastWriteWins(local, remote);
    expect(result).toHaveLength(1);
    expect(result[0].createdAt).toBe('2025-06-01T00:00:00Z');
  });

  it('local-only item included', () => {
    const local = [makeCase({ id: 'only-local' })];
    expect(resolveCasesLastWriteWins(local, [])).toHaveLength(1);
  });

  it('remote-only item included', () => {
    const remote = [makeCase({ id: 'only-remote' })];
    expect(resolveCasesLastWriteWins([], remote)).toHaveLength(1);
  });

  it('merges disjoint sets', () => {
    const local = [makeCase({ id: 'a' })];
    const remote = [makeCase({ id: 'b' })];
    expect(resolveCasesLastWriteWins(local, remote)).toHaveLength(2);
  });

  it('empty + empty = empty', () => {
    expect(resolveCasesLastWriteWins([], [])).toEqual([]);
  });
});

describe('syncCrossValidationOnLogin', () => {
  it('no-op when supabase is null', async () => {
    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: null,
      isSupabaseConfigured: () => false,
    }));
    const { syncCrossValidationOnLogin } = await import('./cross-validation-supabase-repo');
    await expect(syncCrossValidationOnLogin('user-123')).resolves.toBeUndefined();
    vi.doUnmock('@/integrations/supabase/client');
  });
});