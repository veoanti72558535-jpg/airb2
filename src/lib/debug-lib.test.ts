import { describe, it, vi } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn().mockReturnValue({
    upsert: vi.fn().mockResolvedValue({ error: null }),
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom, auth: { getUser: vi.fn() } },
  isSupabaseConfigured: () => true,
  getSupabaseUrl: () => 'http://test',
}));

// Import ONLY the repo, not storage
import { supabase } from '@/integrations/supabase/client';

describe('debug', () => {
  it('check', async () => {
    // Dynamically import the repo AFTER mock is set
    const repo = await import('./library-supabase-repo');
    console.log('supabase in test:', !!supabase);
    await repo.upsertToSupabase('airguns', { id: 'a1' });
    console.log('mockFrom calls:', mockFrom.mock.calls.length);
  });
});
