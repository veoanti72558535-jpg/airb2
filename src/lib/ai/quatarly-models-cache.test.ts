import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInvoke = vi.fn();

vi.mock('@/integrations/supabase/client', () => {
  return {
    supabase: {
      functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    },
  };
});

import { getQuatarlyModels, refreshQuatarlyModels, isCacheFresh } from './quatarly-models-cache';

describe('quatarly-models-cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('isCacheFresh returns false when no cache', () => {
    expect(isCacheFresh()).toBe(false);
  });

  it('isCacheFresh returns true when cache is recent', () => {
    localStorage.setItem('quatarly_models_cache', JSON.stringify({
      models: ['m1'], fetchedAt: Date.now() - 1000,
    }));
    expect(isCacheFresh()).toBe(true);
  });

  it('isCacheFresh returns false when cache is old', () => {
    localStorage.setItem('quatarly_models_cache', JSON.stringify({
      models: ['m1'], fetchedAt: Date.now() - 25 * 60 * 60 * 1000,
    }));
    expect(isCacheFresh()).toBe(false);
  });

  it('getQuatarlyModels returns cache if fresh', async () => {
    localStorage.setItem('quatarly_models_cache', JSON.stringify({
      models: ['cached-model'], fetchedAt: Date.now() - 1000,
    }));
    const result = await getQuatarlyModels();
    expect(result).toEqual(['cached-model']);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('getQuatarlyModels calls API if cache expired', async () => {
    localStorage.setItem('quatarly_models_cache', JSON.stringify({
      models: ['old'], fetchedAt: Date.now() - 25 * 60 * 60 * 1000,
    }));
    mockInvoke.mockResolvedValue({
      data: { quatarly: { models: ['new-model'] } },
      error: null,
    });
    const result = await getQuatarlyModels();
    expect(result).toEqual(['new-model']);
    expect(mockInvoke).toHaveBeenCalled();
  });

  it('getQuatarlyModels returns stale cache if API fails', async () => {
    localStorage.setItem('quatarly_models_cache', JSON.stringify({
      models: ['stale'], fetchedAt: Date.now() - 25 * 60 * 60 * 1000,
    }));
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'fail' } });
    const result = await getQuatarlyModels();
    expect(result).toEqual(['stale']);
  });

  it('refreshQuatarlyModels ignores TTL', async () => {
    localStorage.setItem('quatarly_models_cache', JSON.stringify({
      models: ['cached'], fetchedAt: Date.now() - 1000,
    }));
    mockInvoke.mockResolvedValue({
      data: { quatarly: { models: ['refreshed'] } },
      error: null,
    });
    const result = await refreshQuatarlyModels();
    expect(result).toEqual(['refreshed']);
  });
});