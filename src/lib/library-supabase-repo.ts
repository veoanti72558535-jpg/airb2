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