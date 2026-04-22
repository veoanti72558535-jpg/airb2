import { describe, it, expect, vi } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn().mockReturnValue({ upsert: vi.fn().mockResolvedValue({ error: null }) }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom, auth: { getUser: vi.fn() } },
}));

import { supabase } from '@/integrations/supabase/client';

describe('debug', () => {
  it('from is the mock', () => {
    console.log('typeof supabase.from:', typeof supabase?.from);
    console.log('from === mockFrom:', supabase?.from === mockFrom);
    if (supabase) {
      const r = supabase.from('test');
      console.log('direct call result:', r);
      console.log('mockFrom called:', mockFrom.mock.calls.length);
    }
  });
});
