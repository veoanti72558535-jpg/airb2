/**
 * Repository ChairGun Elite — réticules avec géométrie résolue (1944 entrées).
 * Lecture seule côté utilisateur ; écriture réservée admin (RLS côté DB).
 *
 * À l'import dans la bibliothèque user :
 *  - on NE persiste PAS le tableau `elements` (volumineux) dans `reticles` ;
 *  - on ne sauve que les métadonnées + `catalogReticleId` pour retrouver
 *    la géométrie via le catalogue ChairGun en lecture.
 *
 * Fallback gracieux quand Supabase n'est pas configuré.
 */
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { reticleStore } from '@/lib/storage';
import type { OpticFocalPlane, ReticleType, ReticleUnit } from '@/lib/types';

export type ChairgunUnit = 'MRAD' | 'MIL' | 'MOA' | 'CM/100M';
export type ChairgunFocalPlane = 'FFP' | 'SFP';

export interface ChairgunElement {
  type: 'line' | 'dot' | 'circle' | 'text';
  // line: x1,y1,x2,y2 en unités angulaires (MIL ou MOA)
  x1?: number; y1?: number; x2?: number; y2?: number;
  // dot/circle/text: x,y en unités angulaires
  x?: number; y?: number; radius?: number;
  text?: string;
}

export interface ChairgunReticle {
  reticle_id: number;
  name: string;
  vendor?: string;
  focal_plane: ChairgunFocalPlane | null;
  unit: ChairgunUnit | null;
  true_magnification: number | null;
  elements: ChairgunElement[];
  element_count: number;
}

export interface ChairgunFilters {
  search?: string;
  vendor?: string;
  focal_plane?: ChairgunFocalPlane;
  unit?: ChairgunUnit;
  /** Si true → ne renvoyer que les réticules avec géométrie (element_count > 0) */
  withGeometryOnly?: boolean;
}

const PAGE_SIZE = 20;
const TABLE = 'chairgun_reticles_catalog';

function isChairgunRow(row: unknown): row is ChairgunReticle {
  if (!row || typeof row !== 'object') return false;
  const r = row as Record<string, unknown>;
  return typeof r.reticle_id === 'number' && typeof r.name === 'string';
}

function normalizeElements(raw: unknown): ChairgunElement[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
    .map((e) => {
      const t = (e.type as string) || 'line';
      const out: any = { type: t };
      const num = (k: string): number | undefined => {
        const v = e[k];
        return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
      };
      
      if (t === 'line') {
        out.x1 = num('x1'); out.y1 = num('y1');
        out.x2 = num('x2'); out.y2 = num('y2');
      } else if (t === 'circle' || t === 'dot') {
        out.x = num('x'); out.y = num('y'); out.radius = num('radius');
      } else if (t === 'text') {
        out.x = num('x'); out.y = num('y'); out.text = e.text as string;
      }
      return out as ChairgunElement;
    });
}

function normalizeRow(raw: any): ChairgunReticle {
  return {
    reticle_id: raw.reticle_id,
    name: raw.name,
    focal_plane: (raw.focal_plane as ChairgunFocalPlane | null) ?? null,
    unit: (raw.unit as ChairgunUnit | null) ?? null,
    true_magnification:
      typeof raw.true_magnification === 'number' ? raw.true_magnification : null,
    elements: normalizeElements(raw.elements),
    element_count:
      typeof raw.element_count === 'number'
        ? raw.element_count
        : Array.isArray(raw.elements) ? raw.elements.length : 0,
  };
}

export async function getChairgunReticles(
  filters: ChairgunFilters,
  page: number,
  pageSize: number = PAGE_SIZE,
): Promise<{ data: ChairgunReticle[]; count: number }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], count: 0 };
  }
  try {
    let query = supabase
      .from(TABLE)
      .select('*', { count: 'exact' });

    if (filters.search) query = query.ilike('name', `%${filters.search}%`);
    if (filters.vendor) query = query.eq('vendor', filters.vendor);
    if (filters.focal_plane) query = query.eq('focal_plane', filters.focal_plane);
    if (filters.unit) query = query.eq('unit', filters.unit);
    if (filters.withGeometryOnly) query = query.gt('element_count', 0);

    query = query
      .order('name')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    const { data, count, error } = await query;
    if (error) {
      console.error('[chairgun-reticles]', error.message);
      return { data: [], count: 0 };
    }
    const rows = (data ?? []).filter(isChairgunRow).map(normalizeRow);
    return { data: rows, count: count ?? 0 };
  } catch (e) {
    console.error('[chairgun-reticles]', e);
    return { data: [], count: 0 };
  }
}

export async function getChairgunReticleById(
  reticleId: number,
): Promise<ChairgunReticle | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('reticle_id', reticleId)
      .maybeSingle();
    if (error) {
      console.error('[chairgun-reticles]', error.message);
      return null;
    }
    return data ? normalizeRow(data) : null;
  } catch (e) {
    console.error('[chairgun-reticles]', e);
    return null;
  }
}

/** Mapping unit ChairGun → unit user (`reticles.unit`). */
function mapUnit(u: ChairgunUnit | null): ReticleUnit {
  if (u === 'MOA') return 'MOA';
  // MIL / MRAD / CM/100M → on traite comme MRAD (les CM/100M sont rares)
  return 'MRAD';
}

/**
 * Importe le réticule ChairGun dans la bibliothèque user via `reticleStore`.
 * Les `elements` (géométrie) NE sont PAS persistés — uniquement la référence
 * `catalogReticleId` pour retrouver la géométrie au rendu.
 */
export function importChairgunToLibrary(reticle: ChairgunReticle): void {
  reticleStore.create({
    brand: 'ChairGun',
    model: reticle.name,
    type: 'other' as ReticleType,
    unit: mapUnit(reticle.unit),
    subtension: reticle.unit === 'MOA' ? 0.25 : 0.1,
    focalPlane: (reticle.focal_plane as OpticFocalPlane) ?? undefined,
    notes: `Imported from ChairGun catalog #${reticle.reticle_id} (${reticle.element_count} elements)`,
    catalogReticleId: reticle.reticle_id,
  });
}

export function isChairgunImported(reticleId: number): boolean {
  const all = reticleStore.getAll();
  return all.some(
    (r) =>
      (r as { catalogReticleId?: number }).catalogReticleId === reticleId &&
      ((r as { brand?: string }).brand === 'ChairGun'),
  );
}

// Exports utilitaires pour tests
export const __test__ = { normalizeElements, normalizeRow, mapUnit };