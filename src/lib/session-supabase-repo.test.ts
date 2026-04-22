import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resolveSessionsLastWriteWins,
  upsertSessionToSupabase,
  deleteSessionFromSupabase,
  fetchSessionsFromSupabase,
} from './session-supabase-repo';
import type { Session } from './types';

// ── Mock supabase ────────────────────────────────────────────────────────
const mockUpsert = vi.fn().mockResolvedValue({ error: null });
const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });
const mockSelectEq = vi.fn().mockResolvedValue({ data: [], error: null });

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => ({
      upsert: (...args: any[]) => mockUpsert(...args),
      delete: () => ({ eq: (...args: any[]) => mockDeleteEq(...args) }),
      select: () => ({ eq: (...args: any[]) => mockSelectEq(...args) }),
    }),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
  },
}));

// Prevent real IDB / storage access
vi.mock('./session-repo', () => ({
  readSessionsFromIdb: vi.fn().mockResolvedValue([]),
  writeSessionsToIdb: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./storage', () => ({
  sessionStore: { __hydrate: vi.fn() },
}));

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

beforeEach(() => {
  vi.clearAllMocks();
});

// ── resolveSessionsLastWriteWins ─────────────────────────────────────────
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
});

// ── CRUD ─────────────────────────────────────────────────────────────────
describe('upsertSessionToSupabase', () => {
  it('calls supabase.from("sessions").upsert()', async () => {
    await upsertSessionToSupabase(makeSession(), 'u1');
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(mockUpsert.mock.calls[0][0]).toMatchObject({ id: 'sess-1', user_id: 'u1' });
  });
});

describe('deleteSessionFromSupabase', () => {
  it('calls supabase.from("sessions").delete().eq()', async () => {
    await deleteSessionFromSupabase('sess-1');
    expect(mockDeleteEq).toHaveBeenCalledWith('id', 'sess-1');
  });
});

describe('fetchSessionsFromSupabase', () => {
  it('returns [] on error', async () => {
    mockSelectEq.mockResolvedValueOnce({ data: null, error: { message: 'fail' } });
    const result = await fetchSessionsFromSupabase('u1');
    expect(result).toEqual([]);
  });
});