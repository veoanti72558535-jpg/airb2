import { describe, it, expect, vi } from 'vitest';

const { mockUpsert, mockFrom } = vi.hoisted(() => {
  const mockUpsert = vi.fn().mockResolvedValue({ error: null });
  const mockFrom = vi.fn().mockReturnValue({
    upsert: mockUpsert,
    delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }),
  });
  return { mockUpsert, mockFrom };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockFrom,
    auth: { getUser: vi.fn() },
  },
}));

import { upsertToSupabase } from './library-supabase-repo';

describe('upsert', () => {
  it('calls from and upsert', async () => {
    await upsertToSupabase('airguns', { id: 'a1' });
    console.log('mockFrom called:', mockFrom.mock.calls.length);
    console.log('mockUpsert called:', mockUpsert.mock.calls.length);
    expect(mockFrom).toHaveBeenCalledWith('airguns');
    expect(mockUpsert).toHaveBeenCalled();
  });
});
