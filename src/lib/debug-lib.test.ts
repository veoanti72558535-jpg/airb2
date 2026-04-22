import { describe, it, vi } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn().mockReturnValue({
    upsert: vi.fn().mockResolvedValue({ error: null }),
    select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }),
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom, auth: { getUser: vi.fn() } },
}));

// Spy console.error to see what's caught
const origError = console.error;
console.error = (...args: any[]) => { origError('CAUGHT ERROR:', ...args); };

import { upsertToSupabase } from './library-supabase-repo';

describe('debug', () => {
  it('upsert with error capture', async () => {
    try {
      await upsertToSupabase('airguns', { id: 'a1' });
    } catch (e) {
      console.log('THROWN:', e);
    }
    console.log('mockFrom calls:', mockFrom.mock.calls.length);
  });
});
