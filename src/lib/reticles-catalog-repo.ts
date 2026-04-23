/**
 * Supabase repository for reticles_catalog (read-only catalog of 2845 Strelok reticles).
 * Falls back gracefully when Supabase is not configured.
 */
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { reticleStore } from '@/lib/storage';
import type { OpticFocalPlane } from '@/lib/types';

export interface ReticleCatalogEntry {
  id: number;
  reticle_id: number;
  name: string;
  brand: string | null;
  focal_plane: 'FFP' | 'SFP' | null;
  min_magnification: number | null;
  true_magnification: number | null;
  max_magnification: number | null;
  click_vertical: number | null;
  click_horizontal: number | null;
  click_units: 'MOA' | 'MRAD' | null;
  illuminated: boolean;
  pattern_type: string;
}

export interface CatalogFilters {
  search?: string;
  brand?: string;
  focal_plane?: 'FFP' | 'SFP';
  click_units?: 'MOA' | 'MRAD';
  pattern_type?: string;
}

const PAGE_SIZE = 20;

export async function getReticlesCatalog(
  filters: CatalogFilters,
  page: number,
): Promise<{ data: ReticleCatalogEntry[]; count: number }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], count: 0 };
  }
  try {
    let query = supabase
      .from('reticles_catalog')
      .select('*', { count: 'exact' });

    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }
    if (filters.brand) {
      query = query.eq('brand', filters.brand);
    }
    if (filters.focal_plane) {
      query = query.eq('focal_plane', filters.focal_plane);
    }
    if (filters.click_units) {
      query = query.eq('click_units', filters.click_units);
    }
    if (filters.pattern_type) {
      query = query.eq('pattern_type', filters.pattern_type);
    }

    query = query
      .order('name')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, count, error } = await query;
    if (error) {
      console.error('[reticles-catalog]', error.message);
      return { data: [], count: 0 };
    }
    return { data: (data ?? []) as ReticleCatalogEntry[], count: count ?? 0 };
  } catch (e) {
    console.error('[reticles-catalog]', e);
    return { data: [], count: 0 };
  }
}

export async function getCatalogBrands(): Promise<string[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('reticles_catalog')
      .select('brand')
      .not('brand', 'is', null)
      .order('brand');
    if (error) { console.error('[reticles-catalog]', error.message); return []; }
    const unique = [...new Set((data ?? []).map((r: { brand: string }) => r.brand).filter(Boolean))];
    return unique as string[];
  } catch { return []; }
}

export async function getCatalogPatternTypes(): Promise<string[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('reticles_catalog')
      .select('pattern_type')
      .order('pattern_type');
    if (error) { console.error('[reticles-catalog]', error.message); return []; }
    const unique = [...new Set((data ?? []).map((r: { pattern_type: string }) => r.pattern_type))];
    return unique;
  } catch { return []; }
}

export function importToLibrary(entry: ReticleCatalogEntry): void {
  const unit = entry.click_units === 'MOA' ? 'MOA' : 'MRAD';
  const typeMap: Record<string, string> = {
    bdc: 'bdc', mildot: 'mil-dot', duplex: 'duplex',
    moa: 'moa-grid', mrad: 'mrad-grid',
  };
  const type = (typeMap[entry.pattern_type] ?? 'other') as import('@/lib/types').ReticleType;
  const subtension = entry.click_vertical ?? (unit === 'MOA' ? 0.25 : 0.1);

  reticleStore.create({
    brand: entry.brand ?? 'Unknown',
    model: entry.name,
    type,
    unit,
    subtension,
    focalPlane: (entry.focal_plane as OpticFocalPlane) ?? undefined,
    notes: `Imported from Strelok catalog #${entry.reticle_id}`,
    catalogReticleId: entry.reticle_id,
  });
}

export function isAlreadyImported(reticleId: number): boolean {
  const all = reticleStore.getAll();
  return all.some(r => (r as any).catalogReticleId === reticleId);
}