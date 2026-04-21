/**
 * Rate limiter Google AI Studio — free tier quotidien.
 *
 * Compte les requêtes réussies du jour (UTC) dans `ai_usage_events`
 * pour le provider `google-direct`, et compare au max configurable
 * stocké dans `app_settings` (`ai.google_direct_max_requests_per_day`).
 *
 * Utilisé par le futur dispatcher (BUILD-IA2c). N'est PAS branché
 * dans `ai-extract-rows` (qui reste inchangée).
 */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

export interface QuotaCheckResult {
  allowed: boolean;
  used: number;
  max: number;
}

/**
 * Vérifie si le quota quotidien Google est encore disponible.
 *
 * @param service  Client Supabase service-role (bypass RLS).
 * @param maxPerDay  Limite quotidienne. Si non fournie, lue depuis
 *                   `app_settings` (`ai.google_direct_max_requests_per_day`).
 */
export async function checkGoogleDailyQuota(
  service: SupabaseClient,
  maxPerDay?: number,
): Promise<QuotaCheckResult> {
  // 1) Résoudre le max
  let max = maxPerDay ?? 20;
  if (maxPerDay === undefined) {
    const { data } = await service
      .from('app_settings')
      .select('value')
      .eq('key', 'ai.google_direct_max_requests_per_day')
      .maybeSingle();
    if (data?.value !== undefined && data.value !== null) {
      const parsed = typeof data.value === 'number' ? data.value : Number(data.value);
      if (Number.isFinite(parsed) && parsed >= 0) max = parsed;
    }
  }

  // 2) Compter les requêtes réussies du jour (UTC)
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { count, error } = await service
    .from('ai_usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('provider', 'google-direct')
    .eq('success', true)
    .gte('created_at', todayStart.toISOString());

  if (error) {
    // En cas d'erreur de lecture, refuser par sécurité
    return { allowed: false, used: -1, max };
  }

  const used = count ?? 0;
  return { allowed: used < max, used, max };
}