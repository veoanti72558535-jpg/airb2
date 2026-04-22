import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveLastWriteWins } from './library-supabase-repo';

interface Item { id: string; updatedAt: string; name: string }

describe('resolveLastWriteWins', () => {
  it('local newer → local wins', () => {
    const local: Item[] = [{ id: '1', updatedAt: '2026-04-22T10:00:00Z', name: 'local' }];
    const remote: Item[] = [{ id: '1', updatedAt: '2026-04-21T10:00:00Z', name: 'remote' }];
    const merged = resolveLastWriteWins(local, remote);
    expect(merged).toHaveLength(1);
    expect(merged[0].name).toBe('local');
  });

  it('remote newer → remote wins', () => {
    const local: Item[] = [{ id: '1', updatedAt: '2026-04-20T10:00:00Z', name: 'local' }];
    const remote: Item[] = [{ id: '1', updatedAt: '2026-04-22T10:00:00Z', name: 'remote' }];
    const merged = resolveLastWriteWins(local, remote);
    expect(merged).toHaveLength(1);
    expect(merged[0].name).toBe('remote');
  });

  it('local-only item included', () => {
    const local: Item[] = [{ id: 'local-only', updatedAt: '2026-04-22T10:00:00Z', name: 'lo' }];
    const remote: Item[] = [];
    expect(resolveLastWriteWins(local, remote)).toHaveLength(1);
  });

  it('remote-only item included', () => {
    const local: Item[] = [];
    const remote: Item[] = [{ id: 'remote-only', updatedAt: '2026-04-22T10:00:00Z', name: 'ro' }];
    expect(resolveLastWriteWins(local, remote)).toHaveLength(1);
  });

  it('both sides merged', () => {
    const local: Item[] = [{ id: '1', updatedAt: '2026-04-22T10:00:00Z', name: 'a' }];
    const remote: Item[] = [{ id: '2', updatedAt: '2026-04-22T10:00:00Z', name: 'b' }];
    expect(resolveLastWriteWins(local, remote)).toHaveLength(2);
  });
});

describe('syncLibraryOnLogin', () => {
  it('no-op when supabase is null', async () => {
    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: null,
      isSupabaseConfigured: () => false,
    }));
    const { syncLibraryOnLogin } = await import('./library-supabase-repo');
    // Should not throw
    await expect(syncLibraryOnLogin('user-123')).resolves.toBeUndefined();
    vi.doUnmock('@/integrations/supabase/client');
  });
});