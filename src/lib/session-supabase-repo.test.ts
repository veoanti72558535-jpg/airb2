import { describe, it, expect } from 'vitest';
import { resolveSessionsLastWriteWins } from './session-supabase-repo';
import type { Session } from './types';

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'sess-1',
    name: 'Test',
    input: {} as any,
    results: [],
    tags: [],
    favorite: false,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('resolveSessionsLastWriteWins', () => {
  it('local wins when more recent', () => {
    const local = [makeSession({ updatedAt: '2025-06-01T00:00:00Z', name: 'Local' })];
    const remote = [makeSession({ updatedAt: '2025-01-01T00:00:00Z', name: 'Remote' })];
    const result = resolveSessionsLastWriteWins(local, remote);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Local');
  });

  it('remote wins when more recent', () => {
    const local = [makeSession({ updatedAt: '2025-01-01T00:00:00Z', name: 'Local' })];
    const remote = [makeSession({ updatedAt: '2025-06-01T00:00:00Z', name: 'Remote' })];
    const result = resolveSessionsLastWriteWins(local, remote);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Remote');
  });

  it('includes local-only sessions', () => {
    const local = [makeSession({ id: 'only-local' })];
    const result = resolveSessionsLastWriteWins(local, []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('only-local');
  });

  it('includes remote-only sessions', () => {
    const remote = [makeSession({ id: 'only-remote' })];
    const result = resolveSessionsLastWriteWins([], remote);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('only-remote');
  });

  it('merges disjoint sets', () => {
    const local = [makeSession({ id: 'a' })];
    const remote = [makeSession({ id: 'b' })];
    const result = resolveSessionsLastWriteWins(local, remote);
    expect(result).toHaveLength(2);
  });

  it('empty + empty = empty', () => {
    expect(resolveSessionsLastWriteWins([], [])).toEqual([]);
  });
});