import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    delete: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    then: undefined,
  };
  // Allow `await q` after delete()/eq() to resolve
  const makeAwaitable = () => {
    builder.then = (resolve: any) => resolve({ data: null, error: null });
  };
  makeAwaitable();
  const fromMock = vi.fn(() => builder);
  return {
    isSupabaseConfigured: vi.fn(() => true),
    supabase: {
      from: fromMock,
      functions: { invoke: vi.fn() },
    },
    __builder: builder,
  };
});

vi.mock('./edge-client', () => ({
  queryAIViaEdge: vi.fn(),
}));

import {
  hashPrompt,
  buildCacheKey,
  queryAIWithCache,
  getCachedResponse,
  invalidateCache,
} from './agent-cache';
import { queryAIViaEdge } from './edge-client';
import { supabase } from '@/integrations/supabase/client';

const queryEdgeMock = vi.mocked(queryAIViaEdge);
const fromMock = vi.mocked(supabase!.from);

beforeEach(() => {
  vi.clearAllMocks();
});

function mockBuilder(overrides: Partial<any> = {}) {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    delete: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    ...overrides,
  };
  // make awaitable for delete chains
  builder.then = (resolve: any) => resolve({ data: null, error: null });
  fromMock.mockReturnValueOnce(builder as any);
  return builder;
}

describe('hashPrompt', () => {
  it('returns the same hash for the same input', () => {
    expect(hashPrompt('hello world')).toBe(hashPrompt('hello world'));
  });

  it('returns different hashes for different inputs', () => {
    expect(hashPrompt('a')).not.toBe(hashPrompt('b'));
    expect(hashPrompt('agent::prompt1')).not.toBe(hashPrompt('agent::prompt2'));
  });

  it('returns a non-empty hex string', () => {
    const h = hashPrompt('x');
    expect(h).toMatch(/^[0-9a-f]+$/);
    expect(h.length).toBeGreaterThan(0);
  });
});

describe('buildCacheKey', () => {
  it('changes when the image changes', () => {
    const a = buildCacheKey('agent', 'prompt', 'img1');
    const b = buildCacheKey('agent', 'prompt', 'img2');
    expect(a).not.toBe(b);
  });

  it('matches plain hash when no image', () => {
    expect(buildCacheKey('agent', 'prompt')).toBe(hashPrompt('agent::prompt'));
  });
});

describe('getCachedResponse', () => {
  it('returns null when row absent', async () => {
    mockBuilder({
      maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    });
    const r = await getCachedResponse('agent', 'hash', 'user-1');
    expect(r).toBeNull();
  });

  it('returns cached row when present', async () => {
    mockBuilder({
      maybeSingle: vi.fn(() =>
        Promise.resolve({
          data: {
            response_text: 'cached text',
            provider: 'quatarly',
            model: 'm',
            run_id: 'r1',
            created_at: '2025-01-01T00:00:00Z',
          },
          error: null,
        }),
      ),
    });
    const r = await getCachedResponse('agent', 'hash', 'user-1');
    expect(r).not.toBeNull();
    expect(r?.fromCache).toBe(true);
    expect(r?.text).toBe('cached text');
  });
});

describe('queryAIWithCache', () => {
  it('returns from cache when available (fromCache=true)', async () => {
    mockBuilder({
      maybeSingle: vi.fn(() =>
        Promise.resolve({
          data: {
            response_text: 'hit',
            provider: 'quatarly',
            model: 'm',
            run_id: 'r1',
            created_at: '2025-01-01T00:00:00Z',
          },
          error: null,
        }),
      ),
    });
    const r = await queryAIWithCache(
      { agent_slug: 'agent', prompt: 'p' },
      'user-1',
    );
    expect(r.ok).toBe(true);
    expect(r.ok && r.data.fromCache).toBe(true);
    expect(r.ok && r.data.text).toBe('hit');
    expect(queryEdgeMock).not.toHaveBeenCalled();
  });

  it('calls queryAIViaEdge when cache miss', async () => {
    mockBuilder(); // miss
    mockBuilder(); // upsert call
    queryEdgeMock.mockResolvedValueOnce({
      ok: true,
      data: { text: 'fresh', provider: 'p', model: 'm', latency_ms: 10, run_id: 'r2' },
    });
    const r = await queryAIWithCache(
      { agent_slug: 'agent', prompt: 'p' },
      'user-1',
    );
    expect(queryEdgeMock).toHaveBeenCalledOnce();
    expect(r.ok).toBe(true);
    expect(r.ok && r.data.fromCache).toBe(false);
    expect(r.ok && r.data.text).toBe('fresh');
  });

  it('forceRefresh=true ignores the cache', async () => {
    mockBuilder(); // upsert (no read)
    queryEdgeMock.mockResolvedValueOnce({
      ok: true,
      data: { text: 'forced', provider: 'p', model: 'm', latency_ms: 1, run_id: 'r3' },
    });
    const r = await queryAIWithCache(
      { agent_slug: 'agent', prompt: 'p', forceRefresh: true },
      'user-1',
    );
    expect(queryEdgeMock).toHaveBeenCalledOnce();
    expect(r.ok && r.data.fromCache).toBe(false);
  });

  it('propagates edge errors', async () => {
    mockBuilder({
      maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    });
    queryEdgeMock.mockResolvedValueOnce({ ok: false, error: 'boom', code: 'EDGE_ERROR' });
    const r = await queryAIWithCache(
      { agent_slug: 'agent', prompt: 'p' },
      'user-1',
    );
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.code).toBe('EDGE_ERROR');
  });
});

describe('invalidateCache', () => {
  it('issues a delete call', async () => {
    const b = mockBuilder();
    await invalidateCache('agent', 'user-1');
    expect(b.delete).toHaveBeenCalled();
    expect(b.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(b.eq).toHaveBeenCalledWith('agent_slug', 'agent');
  });

  it('narrows by promptHash when provided', async () => {
    const b = mockBuilder();
    await invalidateCache('agent', 'user-1', 'h1');
    expect(b.eq).toHaveBeenCalledWith('input_hash', 'h1');
  });
});
