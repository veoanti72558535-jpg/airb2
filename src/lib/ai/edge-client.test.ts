import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing the module
const invokeMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  isSupabaseConfigured: vi.fn(() => true),
  supabase: { functions: { invoke: invokeMock } },
}));

import { queryAIViaEdge } from './edge-client';
import { isSupabaseConfigured } from '@/integrations/supabase/client';

const BASE_REQ = { agent_slug: 'test-agent', prompt: 'Hello' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('queryAIViaEdge', () => {
  it('returns NO_SUPABASE when not configured', async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValueOnce(false);
    const r = await queryAIViaEdge(BASE_REQ);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('NO_SUPABASE');
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('returns success on valid response', async () => {
    invokeMock.mockResolvedValueOnce({
      data: { text: 'result', provider: 'quatarly', model: 'm', latency_ms: 42, run_id: 'r1' },
      error: null,
    });
    const r = await queryAIViaEdge(BASE_REQ);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.text).toBe('result');
      expect(r.data.run_id).toBe('r1');
    }
  });

  it('returns EDGE_ERROR on invoke error', async () => {
    invokeMock.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    const r = await queryAIViaEdge(BASE_REQ);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('EDGE_ERROR');
  });

  it('returns DISPATCH_ERROR on business error', async () => {
    invokeMock.mockResolvedValueOnce({ data: { error: 'quota exceeded' }, error: null });
    const r = await queryAIViaEdge(BASE_REQ);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('quota exceeded');
  });

  it('returns UNEXPECTED on thrown error', async () => {
    invokeMock.mockRejectedValueOnce(new Error('network'));
    const r = await queryAIViaEdge(BASE_REQ);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('UNEXPECTED');
  });
});