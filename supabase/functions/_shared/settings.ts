/**
 * Lecture mutualisée des `app_settings` IA. Pas de cache : la latence
 * d'une seule requête `.in()` est négligeable face à un appel modèle, et
 * on évite les soucis de propagation de changements à chaud.
 */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

export interface AiSettings {
  providerPrimary: string;
  modelPrimary: string;
  quatarlyApiUrl: string;
  allowGoogleFallback: boolean;
  googleDirectEnabled: boolean;
  googleDirectModel: string;
  preferredLanguage: string;
  maxImageBytes: number;
}
  // IA2 additions
  googleDirectMaxRequestsPerDay: number;
  ollamaEnabled: boolean;
  ollamaBaseUrl: string;
  ollamaDefaultModel: string;
}

const KEYS = [
  'ai.provider_primary',
  'ai.provider_model_primary',
  'ai.quatarly_api_url',
  'ai.allow_google_fallback',
  'ai.google_direct_enabled',
  'ai.google_direct_model',
  'ai.preferred_language',
  'ai.max_image_bytes',
];

const KEYS_IA2 = [
  'ai.google_direct_max_requests_per_day',
  'ai.ollama_enabled',
  'ai.ollama_base_url',
  'ai.ollama_default_model',
];

export async function readAiSettings(service: SupabaseClient): Promise<AiSettings> {
  const { data, error } = await service
    .from('app_settings')
    .select('key,value')
    .in('key', [...KEYS, ...KEYS_IA2]);
  if (error) throw new Error(`app_settings read failed: ${error.message}`);
  const map = new Map<string, unknown>();
  for (const row of data ?? []) map.set(row.key as string, row.value);
  const get = <T>(k: string, fallback: T): T => {
    const v = map.get(k);
    return (v === undefined || v === null ? fallback : (v as T));
  };
  return {
    providerPrimary:     get('ai.provider_primary',       'quatarly'),
    modelPrimary:        get('ai.provider_model_primary', 'claude-sonnet-4'),
    quatarlyApiUrl:      get('ai.quatarly_api_url',       'https://api.quatarly.ai/v1/chat/completions'),
    allowGoogleFallback: get('ai.allow_google_fallback',  true),
    googleDirectEnabled: get('ai.google_direct_enabled',  true),
    googleDirectModel:   get('ai.google_direct_model',    'gemini-2.5-flash'),
    preferredLanguage:   get('ai.preferred_language',     'fr'),
    maxImageBytes:       get('ai.max_image_bytes',        4_194_304),
    // IA2 — rate limiting + Ollama
    googleDirectMaxRequestsPerDay: get('ai.google_direct_max_requests_per_day', 20),
    ollamaEnabled:       get('ai.ollama_enabled',          false),
    ollamaBaseUrl:       get('ai.ollama_base_url',         'http://localhost:11434'),
    ollamaDefaultModel:  get('ai.ollama_default_model',    'qwen3:14b'),
  };
}

export interface AgentConfig {
  slug: string;
  provider: string;
  model: string;
  allow_fallback: boolean;
  system_prompt: string;
  output_schema: unknown;
  prompt_version: number;
  enabled: boolean;
}

export async function readAgentConfig(
  service: SupabaseClient,
  slug: string,
): Promise<AgentConfig | null> {
  const { data, error } = await service
    .from('ai_agent_configs')
    .select('slug, provider, model, allow_fallback, system_prompt, output_schema, prompt_version, enabled')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(`agent config read failed: ${error.message}`);
  return (data as AgentConfig | null) ?? null;
}