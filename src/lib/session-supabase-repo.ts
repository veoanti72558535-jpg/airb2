/**
 * P-3 — Dual-write sessions: Supabase repo + sync logic.
 *
 * All Supabase operations are fire-and-forget: errors are logged via
 * console.error and never surface to the user or break the app.
 * IDB remains the authoritative read source.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Session } from './types';
import { readSessionsFromIdb, writeSessionsToIdb } from './session-repo';
import { sessionStore } from './storage';

// ── Mapping helpers ─────────────────────────────────────────────────────

/** Convert a local Session to a Supabase row payload. */
function toRow(session: Session, userId: string): Record<string, unknown> {
  return {
    id: session.id,
    user_id: userId,
    name: session.name,
    input: session.input,
    results: session.results,
    notes: session.notes ?? null,
    tags: session.tags ?? [],
    favorite: session.favorite ?? false,
    engine_version: session.engineVersion ?? null,
    engine_metadata: session.engineMetadata ?? null,
    derived_from_session_id: session.derivedFromSessionId ?? null,
    pending_sync: false,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
  };
}

/** Convert a Supabase row to a local Session object. */
function fromRow(row: Record<string, unknown>): Session {
  return {
    id: row.id as string,
    name: (row.name as string) ?? '',
    airgunId: (row as any).airgun_id ?? undefined,
    tuneId: (row as any).tune_id ?? undefined,
    projectileId: (row as any).projectile_id ?? undefined,
    opticId: (row as any).optic_id ?? undefined,
    input: row.input as Session['input'],
    results: (row.results ?? []) as Session['results'],
    notes: (row.notes as string) ?? undefined,
    tags: (Array.isArray(row.tags) ? row.tags : []) as string[],
    favorite: (row.favorite as boolean) ?? false,
    engineVersion: (row.engine_version as number) ?? undefined,
    engineMetadata: (row.engine_metadata as Session['engineMetadata']) ?? undefined,
    derivedFromSessionId: (row.derived_from_session_id as string) ?? undefined,
    profileId: (row as any).profile_id ?? undefined,
    dragLawEffective: (row as any).drag_law_effective ?? undefined,
    dragLawRequested: (row as any).drag_law_requested ?? undefined,
    cdProvenance: (row as any).cd_provenance ?? undefined,
    calculatedAt: (row as any).calculated_at ?? undefined,
    calculatedAtSource: (row as any).calculated_at_source ?? undefined,
    metadataInferred: (row as any).metadata_inferred ?? undefined,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
  };
}

// ── CRUD ─────────────────────────────────────────────────────────────────

export async function upsertSessionToSupabase(
  session: Session,
  userId: string,
): Promise<void> {
  try {
    if (!supabase) return;
    const { error } = await supabase
      .from('sessions')
      .upsert(toRow(session, userId), { onConflict: 'id' });
    if (error) console.error('[session-supa] upsert error', error);
  } catch (e) {
    console.error('[session-supa] upsert exception', e);
  }
}

export async function deleteSessionFromSupabase(
  sessionId: string,
): Promise<void> {
  try {
    if (!supabase) return;
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', sessionId);
    if (error) console.error('[session-supa] delete error', error);
  } catch (e) {
    console.error('[session-supa] delete exception', e);
  }
}

export async function fetchSessionsFromSupabase(
  userId: string,
): Promise<Session[]> {
  try {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId);
    if (error) {
      console.error('[session-supa] fetch error', error);
      return [];
    }
    return (data ?? []).map((r: any) => fromRow(r));
  } catch (e) {
    console.error('[session-supa] fetch exception', e);
    return [];
  }
}

// ── Merge logic ──────────────────────────────────────────────────────────

/**
 * Bidirectional merge: last-write-wins by `updatedAt`.
 * Sessions present only on one side are always included.
 */
export function resolveSessionsLastWriteWins(
  local: Session[],
  remote: Session[],
): Session[] {
  const map = new Map<string, Session>();
  for (const s of local) map.set(s.id, s);
  for (const s of remote) {
    const existing = map.get(s.id);
    if (!existing || s.updatedAt > existing.updatedAt) {
      map.set(s.id, s);
    }
  }
  return Array.from(map.values());
}

// ── Login sync ───────────────────────────────────────────────────────────

export async function syncSessionsOnLogin(userId: string): Promise<void> {
  if (!supabase) return;
  const local = await readSessionsFromIdb();
  const remote = await fetchSessionsFromSupabase(userId);
  const resolved = resolveSessionsLastWriteWins(local, remote);

  // Persist merged result to IDB and hydrate in-memory cache
  await writeSessionsToIdb(resolved);
  sessionStore.__hydrate(resolved);

  // Push local-only or newer-local sessions to Supabase
  const remoteMap = new Map(remote.map(s => [s.id, s]));
  const toUpsert = resolved.filter(s => {
    const r = remoteMap.get(s.id);
    return !r || s.updatedAt > r.updatedAt;
  });
  if (toUpsert.length > 0) {
    await Promise.allSettled(
      toUpsert.map(s => upsertSessionToSupabase(s, userId)),
    );
  }
}