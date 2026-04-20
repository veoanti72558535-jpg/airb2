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

  return jsonResponse({
    quatarly: {
      keyPresent: Boolean(Deno.env.get('QUATARLY_API_KEY')),
      urlConfigured: Boolean(settings.quatarlyApiUrl),
      model: settings.modelPrimary,
    },
    google: {
      keyPresent: Boolean(Deno.env.get('GOOGLE_AI_API_KEY')),
      enabled: settings.googleDirectEnabled,
      allowedAsFallback: settings.allowGoogleFallback,
      model: settings.googleDirectModel,
    },
    primaryProvider: settings.providerPrimary,
    maxImageBytes: settings.maxImageBytes,
  });
});