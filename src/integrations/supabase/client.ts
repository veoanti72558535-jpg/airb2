/**
 * Client Supabase OPTIONNEL (self-hosted only).
 *
 * Règle d'or IA-1 :
 *   - si `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY` sont absents,
 *     `supabase` vaut `null` ;
 *   - toute la voie manuelle (cross-validation, sessions, library…) reste
 *     100% fonctionnelle sans Supabase ;
 *   - le bouton « Importer depuis screenshot » est masqué côté UI tant
 *     que `isSupabaseConfigured()` renvoie `false`.
 *
 * Aucune clé provider (Quatarly / Google) n'est jamais lue côté client.
 * L'anon key Supabase est publique par construction (RLS protège la base).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url  = (import.meta.env.VITE_SUPABASE_URL  ?? '').trim();
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

export const supabase: SupabaseClient | null =
  url && anon
    ? createClient(url, anon, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
    : null;

export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

export function getSupabaseUrl(): string {
  return url;
}