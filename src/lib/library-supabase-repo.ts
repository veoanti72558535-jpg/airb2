/**
 * P-4 — Dual-write repo for library entities (airguns, tunes, projectiles, optics, reticles).
 * All writes are fire-and-forget; errors → console.error only.
 * localStorage/IDB remains the source of truth for reads.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Airgun, Tune, Projectile, Optic, Reticle } from './types';

type LibraryTable = 'airguns' | 'tunes' | 'projectiles' | 'optics' | 'reticles';

// ── helpers ──────────────────────────────────────────────────────────────

export async function getUserId(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

// ── generic CRUD ─────────────────────────────────────────────────────────

export async function upsertToSupabase(
  table: LibraryTable,
  row: Record<string, unknown>,
): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.from(table).upsert(row as any, { onConflict: 'id' });
    if (error) console.error(`[${table}] upsert error`, error.message);
  } catch (e) {
    console.error(`[${table}] upsert failed`, e);
  }
}

export async function deleteFromSupabase(
  table: LibraryTable,
  id: string,
): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) console.error(`[${table}] delete error`, error.message);
  } catch (e) {
    console.error(`[${table}] delete failed`, e);
  }
}

export async function fetchFromSupabase<T>(
  table: LibraryTable,
  userId: string,
): Promise<T[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', userId);
    if (error) {
      console.error(`[${table}] fetch error`, error.message);
      return [];
    }
    return (data ?? []) as T[];
  } catch (e) {
    console.error(`[${table}] fetch failed`, e);
    return [];
  }
}

// ── row mappers ──────────────────────────────────────────────────────────

function airgunToRow(a: Airgun, userId: string): Record<string, unknown> {
  return {
    id: a.id,
    user_id: userId,
    brand: a.brand,
    model: a.model,
    caliber: a.caliber,
    barrel_length: a.barrelLength ?? null,
    twist_rate: a.twistRate ?? null,
    reg_pressure: a.regPressure ?? null,
    fill_pressure: a.fillPressure ?? null,
    power_setting: a.powerSetting ?? null,
    default_sight_height: a.defaultSightHeight ?? null,
    default_zero_range: a.defaultZeroRange ?? null,
    notes: a.notes ?? null,
    created_at: a.createdAt,
    updated_at: a.updatedAt,
  };
}

function tuneToRow(t: Tune, userId: string): Record<string, unknown> {
  return {
    id: t.id,
    user_id: userId,
    airgun_id: t.airgunId,
    name: t.name,
    nominal_velocity: t.nominalVelocity ?? null,
    settings: t.settings ?? null,
    notes: t.notes ?? null,
    usage: t.usage ?? null,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

function projectileToRow(p: Projectile, userId: string): Record<string, unknown> {
  return {
    id: p.id,
    user_id: userId,
    brand: p.brand,
    model: p.model,
    weight: p.weight,
    bc: p.bc,
    bc_model: p.bcModel ?? 'G1',
    projectile_type: p.projectileType ?? null,
    shape: p.shape ?? null,
    caliber: p.caliber,
    length: p.length ?? null,
    diameter: p.diameter ?? null,
    material: p.material ?? null,
    notes: p.notes ?? null,
    data_source: p.dataSource ?? null,
    custom_drag_table: p.customDragTable ? JSON.stringify(p.customDragTable) : null,
    imported_from: p.importedFrom ?? null,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

function opticToRow(o: Optic, userId: string): Record<string, unknown> {
  return {
    id: o.id,
    user_id: userId,
    name: o.name,
    type: o.type ?? null,
    focal_plane: o.focalPlane ?? null,
    click_unit: o.clickUnit,
    click_value: o.clickValue,
    mount_height: o.mountHeight ?? null,
    tube_diameter: o.tubeDiameter ?? null,
    mag_calibration: o.magCalibration ?? null,
    notes: o.notes ?? null,
    imported_from: o.importedFrom ?? null,
    reticle_id: o.reticleId ?? null,
    created_at: o.createdAt,
    updated_at: o.updatedAt,
  };
}

function reticleToRow(r: Reticle, userId: string): Record<string, unknown> {
  return {
    id: r.id,
    user_id: userId,
    brand: r.brand,
    model: r.model,
    type: r.type,
    unit: r.unit,
    subtension: r.subtension,
    focal_plane: r.focalPlane ?? null,
    marks: r.marks ? JSON.stringify(r.marks) : null,
    notes: r.notes ?? null,
    imported_from: r.importedFrom ?? null,
    image_data_url: r.imageDataUrl ?? null,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

// ── public row builders ──────────────────────────────────────────────────

export function toRow(
  table: LibraryTable,
  item: Airgun | Tune | Projectile | Optic | Reticle,
  userId: string,
): Record<string, unknown> {
  switch (table) {
    case 'airguns': return airgunToRow(item as Airgun, userId);
    case 'tunes': return tuneToRow(item as Tune, userId);
    case 'projectiles': return projectileToRow(item as Projectile, userId);
    case 'optics': return opticToRow(item as Optic, userId);
    case 'reticles': return reticleToRow(item as Reticle, userId);
  }
}

// ── bullets4 filter ──────────────────────────────────────────────────────

export function isBullets4(p: Projectile): boolean {
  return p.importedFrom === 'bullets4-db' || p.sourceTable?.startsWith('bullets4') === true;
}

// ── last-write-wins merge ────────────────────────────────────────────────

export function resolveLastWriteWins<T extends { id: string; updatedAt: string }>(
  local: T[],
  remote: T[],
): T[] {
  const map = new Map<string, T>();
  for (const item of local) map.set(item.id, item);
  for (const item of remote) {
    const existing = map.get(item.id);
    if (!existing || item.updatedAt > existing.updatedAt) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
}

// ── row → camelCase mappers ─────────────────────────────────────────────

function rowToAirgun(r: Record<string, any>): Airgun {
  return {
    id: r.id, brand: r.brand, model: r.model, caliber: r.caliber,
    barrelLength: r.barrel_length ?? undefined, twistRate: r.twist_rate ?? undefined,
    regPressure: r.reg_pressure ?? undefined, fillPressure: r.fill_pressure ?? undefined,
    powerSetting: r.power_setting ?? undefined,
    defaultSightHeight: r.default_sight_height ?? undefined,
    defaultZeroRange: r.default_zero_range ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function rowToTune(r: Record<string, any>): Tune {
  return {
    id: r.id, airgunId: r.airgun_id, name: r.name,
    nominalVelocity: r.nominal_velocity ?? undefined,
    settings: r.settings ?? undefined, notes: r.notes ?? undefined,
    usage: r.usage ?? undefined,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function rowToProjectile(r: Record<string, any>): Projectile {
  return {
    id: r.id, brand: r.brand, model: r.model, weight: r.weight,
    bc: r.bc, bcModel: r.bc_model ?? 'G1',
    projectileType: r.projectile_type ?? undefined,
    shape: r.shape ?? undefined, caliber: r.caliber,
    length: r.length ?? undefined, diameter: r.diameter ?? undefined,
    material: r.material ?? undefined, notes: r.notes ?? undefined,
    dataSource: r.data_source ?? undefined,
    customDragTable: r.custom_drag_table ? JSON.parse(r.custom_drag_table) : undefined,
    importedFrom: r.imported_from ?? undefined,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function rowToOptic(r: Record<string, any>): Optic {
  return {
    id: r.id, name: r.name, type: r.type ?? undefined,
    focalPlane: r.focal_plane ?? undefined, clickUnit: r.click_unit,
    clickValue: r.click_value, mountHeight: r.mount_height ?? undefined,
    tubeDiameter: r.tube_diameter ?? undefined,
    magCalibration: r.mag_calibration ?? undefined,
    notes: r.notes ?? undefined, importedFrom: r.imported_from ?? undefined,
    reticleId: r.reticle_id ?? undefined,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function rowToReticle(r: Record<string, any>): Reticle {
  return {
    id: r.id, brand: r.brand, model: r.model, type: r.type,
    unit: r.unit, subtension: r.subtension,
    focalPlane: r.focal_plane ?? undefined,
    marks: r.marks ? JSON.parse(r.marks) : undefined,
    notes: r.notes ?? undefined, importedFrom: r.imported_from ?? undefined,
    imageDataUrl: r.image_data_url ?? undefined,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

// ── sync on login ────────────────────────────────────────────────────────

const LS_KEYS = {
  airguns: 'pcp-airguns',
  tunes: 'pcp-tunes',
  projectiles: 'pcp-projectiles',
  optics: 'pcp-optics',
  reticles: 'pcp-reticles',
} as const;

function lsLoad<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) ?? '[]'); }
  catch { return []; }
}

function lsSave<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

async function syncEntity<T extends { id: string; updatedAt: string }>(
  table: LibraryTable,
  lsKey: string,
  userId: string,
  rowToEntity: (r: Record<string, any>) => T,
  filter?: (item: T) => boolean,
): Promise<void> {
  const remoteRows = await fetchFromSupabase<Record<string, any>>(table, userId);
  const remote = remoteRows.map(rowToEntity);
  const allLocal: T[] = lsLoad(lsKey);
  const local = filter ? allLocal.filter(filter) : allLocal;
  const excluded = filter ? allLocal.filter((i) => !filter(i)) : [];

  const merged = resolveLastWriteWins(local, remote);
  lsSave(lsKey, [...excluded, ...merged]);

  // Push local-only or local-wins back to Supabase
  const remoteIds = new Set(remote.map((r) => r.id));
  for (const item of merged) {
    const rem = remote.find((r) => r.id === item.id);
    if (!rem || item.updatedAt > rem.updatedAt) {
      upsertToSupabase(table, toRow(table, item as any, userId)).catch((e) =>
        console.error(`[sync:${table}] push failed`, e),
      );
    }
  }
}

export async function syncLibraryOnLogin(userId: string): Promise<void> {
  if (!supabase) return;
  try {
    // Order: reticles → optics → airguns → tunes → projectiles (FK deps)
    await syncEntity<Reticle>('reticles', LS_KEYS.reticles, userId, rowToReticle);
    await syncEntity<Optic>('optics', LS_KEYS.optics, userId, rowToOptic);
    await syncEntity<Airgun>('airguns', LS_KEYS.airguns, userId, rowToAirgun);
    await syncEntity<Tune>('tunes', LS_KEYS.tunes, userId, rowToTune);
    await syncEntity<Projectile>(
      'projectiles', LS_KEYS.projectiles, userId, rowToProjectile,
      (p) => !isBullets4(p),
    );
  } catch (e) {
    console.error('[syncLibraryOnLogin] failed', e);
  }
}