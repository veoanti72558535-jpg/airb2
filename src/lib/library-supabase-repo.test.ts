import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Projectile } from './types';
import { isBullets4 } from './library-supabase-repo';

describe('library-supabase-repo — pure functions', () => {
  it('isBullets4 detects bullets4-db importedFrom', () => {
    expect(isBullets4({ importedFrom: 'bullets4-db' } as Projectile)).toBe(true);
  });

  it('isBullets4 detects bullets4 sourceTable', () => {
    expect(isBullets4({ sourceTable: 'bullets4_pellets' } as Projectile)).toBe(true);
  });

  it('isBullets4 returns false for user projectile', () => {
    expect(isBullets4({ importedFrom: 'json-user' } as Projectile)).toBe(false);
  });

  it('isBullets4 returns false for empty projectile', () => {
    expect(isBullets4({} as Projectile)).toBe(false);
  });

  it('getUserId returns null when supabase is null', async () => {
    // supabase is null in test env (no VITE_SUPABASE_URL)
    const { getUserId } = await import('./library-supabase-repo');
    const uid = await getUserId();
    expect(uid).toBeNull();
  });

  it('upsertToSupabase is silent no-op when supabase is null', async () => {
    const { upsertToSupabase } = await import('./library-supabase-repo');
    // Should not throw
    await expect(upsertToSupabase('airguns', { id: 'a1' })).resolves.toBeUndefined();
  });

  it('deleteFromSupabase is silent no-op when supabase is null', async () => {
    const { deleteFromSupabase } = await import('./library-supabase-repo');
    await expect(deleteFromSupabase('optics', 'o1')).resolves.toBeUndefined();
  });

  it('fetchFromSupabase returns [] when supabase is null', async () => {
    const { fetchFromSupabase } = await import('./library-supabase-repo');
    const result = await fetchFromSupabase('reticles', 'u1');
    expect(result).toEqual([]);
  });
});