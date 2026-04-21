/**
 * Edge Function: ai-providers-test
 *
 * Ping admin léger : vérifie quelles clés providers sont présentes côté
 * serveur SANS jamais les renvoyer. Utilisé par /admin/ai pour confirmer
 * que la stack self-hosted est correctement configurée.
 *
 * Réponse 200 (admin) :
 *   { quatarly: { keyPresent, urlConfigured }, google: { keyPresent, model } }
 */

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { requireAdmin } from '../_shared/auth.ts';
import { readAiSettings } from '../_shared/settings.ts';
import { checkGoogleDailyQuota } from '../_shared/rate-limit.ts';
import { ollamaHealthCheck } from '../_shared/providers.ts';
import { quatarlyModelsUrl } from '../_shared/quatarly-url.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST' && req.method !== 'GET') {
    return jsonResponse({ error: 'method-not-allowed' }, 405);
  }

  const auth = await requireAdmin(req);
  if (!auth.ok) return jsonResponse({ error: auth.code, message: auth.message }, auth.status);

  let settings;
  try {
    settings = await readAiSettings(auth.service);
  } catch (e) {
    return jsonResponse(
      { error: 'settings-read-failed', message: e instanceof Error ? e.message : String(e) },
      500,
    );
  }

  // --- Parallel fetches: Ollama health, Google quota, Quatarly models ---
  const [ollamaResult, googleQuota, quatarlyModels] = await Promise.all([
    // Ollama health check (5s timeout)
    settings.ollamaEnabled
      ? ollamaHealthCheck(settings.ollamaBaseUrl, 5_000)
      : Promise.resolve({ ok: false, errorMessage: 'disabled' } as { ok: boolean; models?: string[]; errorMessage?: string }),

    // Google daily quota
    checkGoogleDailyQuota(auth.service, settings.googleDirectMaxRequestsPerDay),

    // Quatarly models list
    (async (): Promise<{ ok: boolean; models?: string[]; errorMessage?: string }> => {
      const apiKey = Deno.env.get('QUATARLY_API_KEY');
      if (!apiKey) return { ok: false, errorMessage: 'no-key' };
      const url = quatarlyModelsUrl(settings.quatarlyApiUrl);
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8_000);
        const resp = await fetch(url, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (!resp.ok) return { ok: false, errorMessage: `HTTP ${resp.status}` };
        const data = await resp.json() as { data?: Array<{ id?: string }> };
        const models = (data.data ?? []).map((m) => m.id).filter(Boolean) as string[];
        return { ok: true, models };
      } catch (e) {
        return { ok: false, errorMessage: e instanceof Error ? e.message : String(e) };
      }
    })(),
  ]);

  return jsonResponse({
    // --- Existing fields (backward compatible) ---
    quatarly: {
      keyPresent: Boolean(Deno.env.get('QUATARLY_API_KEY')),
      urlConfigured: Boolean(settings.quatarlyApiUrl),
      model: settings.modelPrimary,
      models: quatarlyModels.ok ? quatarlyModels.models : undefined,
      modelsError: quatarlyModels.ok ? undefined : quatarlyModels.errorMessage,
    },
    google: {
      keyPresent: Boolean(Deno.env.get('GOOGLE_AI_API_KEY')),
      enabled: settings.googleDirectEnabled,
      allowedAsFallback: settings.allowGoogleFallback,
      model: settings.googleDirectModel,
      quota: {
        used: googleQuota.used,
        max: googleQuota.max,
        remaining: googleQuota.allowed ? googleQuota.max - googleQuota.used : 0,
        allowed: googleQuota.allowed,
      },
    },
    primaryProvider: settings.providerPrimary,
    maxImageBytes: settings.maxImageBytes,
    // --- New fields (IA2d) ---
    ollama: {
      enabled: settings.ollamaEnabled,
      baseUrl: settings.ollamaBaseUrl,
      defaultModel: settings.ollamaDefaultModel,
      reachable: ollamaResult.ok,
      models: ollamaResult.ok ? ollamaResult.models : undefined,
      error: ollamaResult.ok ? undefined : ollamaResult.errorMessage,
    },
  });
});