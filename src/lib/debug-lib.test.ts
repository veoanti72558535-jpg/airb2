import { describe, it, expect, vi } from 'vitest';

const { mockFrom } = vi.hoisted(() => {
  const mockFrom = vi.fn().mockReturnValue({
    upsert: vi.fn().mockResolvedValue({ error: null }),
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

describe('debug', () => {
  it('supabase is truthy', () => {
    console.log('supabase:', supabase);
    console.log('typeof supabase:', typeof supabase);
    console.log('!!supabase:', !!supabase);
    expect(supabase).toBeTruthy();
  });
  it('from is callable', () => {
    const result = supabase!.from('airguns');
    console.log('from result:', result);
    expect(mockFrom).toHaveBeenCalled();
  });
});
