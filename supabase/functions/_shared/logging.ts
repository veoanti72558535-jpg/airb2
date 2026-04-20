/**
 * Insertion d'événements et de runs IA. Exécuté en service_role
 * (RLS bypass) pour pouvoir écrire malgré les politiques admin-only.
 */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

export interface NewRunInput {
  agentSlug: string;
  provider: string;
  model: string;
  userId: string;
  sourceHash?: string;
}

export async function insertRun(service: SupabaseClient, input: NewRunInput): Promise<string | null> {
  const { data, error } = await service
    .from('ai_agent_runs')
    .insert({
      agent_slug: input.agentSlug,
      provider: input.provider,
      model: input.model,
      status: 'pending',
      user_id: input.userId,
      source_hash: input.sourceHash ?? null,
    })
    .select('id')
    .maybeSingle();
  if (error || !data) return null;
  return data.id as string;
}

export async function finishRun(
  service: SupabaseClient,
  runId: string,
  patch: {
    status: 'success' | 'error' | 'partial';
    latencyMs?: number;
    errorCode?: string | null;
    fallbackUsed?: boolean;
    outputJsonb?: unknown;
  },
): Promise<void> {
  await service
    .from('ai_agent_runs')
    .update({
      status: patch.status,
      finished_at: new Date().toISOString(),
      latency_ms: patch.latencyMs ?? null,
      error_code: patch.errorCode ?? null,
      fallback_used: patch.fallbackUsed ?? false,
      output_jsonb: patch.outputJsonb ?? null,
    })
    .eq('id', runId);
}

export async function logEvent(
  service: SupabaseClient,
  ev: {
    runId: string | null;
    eventType: 'call' | 'fallback' | 'validation_error' | 'auth_denied';
    provider?: string;
    model?: string;
    success?: boolean;
    errorCode?: string | null;
    latencyMs?: number | null;
  },
): Promise<void> {
  await service.from('ai_usage_events').insert({
    run_id: ev.runId,
    event_type: ev.eventType,
    provider: ev.provider ?? null,
    model: ev.model ?? null,
    success: ev.success ?? null,
    error_code: ev.errorCode ?? null,
    latency_ms: ev.latencyMs ?? null,
  });
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}