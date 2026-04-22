/**
 * P-5bis — Dual-write & sync for cross-validation cases.
 *
 * Fire-and-forget upsert/delete towards Supabase `cross_validation_cases`.
 * localStorage remains source of truth for reads.
 * Sync on login merges remote cases into local via createdAt comparison.
 */
import { supabase } from '@/integrations/supabase/client';
import { userCaseRepo, type StoredUserCase } from './cross-validation/user-case-repo';

/* ------------------------------------------------------------------ */
/*  Fire-and-forget write helpers                                     */
/* ------------------------------------------------------------------ */

export async function upsertCaseToSupabase(
  item: StoredUserCase,
  userId: string,
  source: string = 'manual',
): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('cross_validation_cases').upsert(
      {
        id: item.id,
        user_id: userId,
        case_data: item.case as unknown as Record<string, unknown>,
        source,
        created_at: item.createdAt,
      },
      { onConflict: 'id' },
    );
    if (error) console.error('[cv-sync] upsert failed', error.message);
  } catch (e) {
    console.error('[cv-sync] upsert error', e);
  }
}

export async function deleteCaseFromSupabase(id: string): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('cross_validation_cases')
      .delete()
      .eq('id', id);
    if (error) console.error('[cv-sync] delete failed', error.message);
  } catch (e) {
    console.error('[cv-sync] delete error', e);
  }
}

/* ------------------------------------------------------------------ */
/*  Fetch remote cases                                                */
/* ------------------------------------------------------------------ */

interface RemoteCase {
  id: string;
  case_data: unknown;
  source: string;
  created_at: string;
}

export async function fetchCasesFromSupabase(
  userId: string,
): Promise<StoredUserCase[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('cross_validation_cases')
      .select('id, case_data, source, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return (data as RemoteCase[]).map((r) => ({
      id: r.id,
      case: r.case_data as any,
      createdAt: r.created_at,
      updatedAt: r.created_at, // table has no updatedAt
    }));
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Sync on login — merge by createdAt (last-write-wins)              */
/* ------------------------------------------------------------------ */

export function resolveCasesLastWriteWins(
  local: StoredUserCase[],
  remote: StoredUserCase[],
): StoredUserCase[] {
  const map = new Map<string, StoredUserCase>();
  for (const item of local) map.set(item.id, item);
  for (const item of remote) {
    const existing = map.get(item.id);
    if (!existing || item.createdAt > existing.createdAt) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
}

export async function syncCrossValidationOnLogin(userId: string): Promise<void> {
  if (!supabase) return;
  try {
    const remote = await fetchCasesFromSupabase(userId);
    const local = userCaseRepo.getAll();
    const merged = resolveCasesLastWriteWins(local, remote);

    // Write merged set to localStorage
    userCaseRepo._replaceAll(merged);

    // Push local-only items to Supabase
    const remoteIds = new Set(remote.map((r) => r.id));
    for (const item of merged) {
      if (!remoteIds.has(item.id)) {
        upsertCaseToSupabase(item, userId).catch(() => {});
      }
    }
  } catch (e) {
    console.error('[cv-sync] sync on login failed', e);
  }
}