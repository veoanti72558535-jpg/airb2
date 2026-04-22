import { describe, it, expect, vi } from 'vitest';

const { mockFrom } = vi.hoisted(() => {
  const mockFrom = vi.fn().mockReturnValue({
    upsert: vi.fn().mockResolvedValue({ error: null }),
    select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [{ x: 1 }], error: null }) }),
  });
  return { mockFrom };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockFrom,
    auth: { getUser: vi.fn() },
  },
}));

import { supabase } from '@/integrations/supabase/client';
import { upsertToSupabase, fetchFromSupabase } from './library-supabase-repo';

describe('debug', () => {
  it('supabase imported value', () => {
    console.log('supabase ===', JSON.stringify(supabase));
    console.log('supabase is null?', supabase === null);
    console.log('!supabase?', !supabase);
  });
  it('fetch calls from', async () => {
    const r = await fetchFromSupabase('airguns', 'u1');
    console.log('fetch result:', r);
    console.log('mockFrom calls after fetch:', mockFrom.mock.calls.length);
  });
  it('upsert calls from', async () => {
    mockFrom.mockClear();
    await upsertToSupabase('airguns', { id: 'a1' });
    console.log('mockFrom calls after upsert:', mockFrom.mock.calls.length);
  });
});
