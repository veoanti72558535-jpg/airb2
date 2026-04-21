/**
 * Edge Function: ai-provider-dispatch
 *
 * BUILD IA-2c — Dispatcher générique multi-agents.
 *
 * Contrat :
 *   - Reçoit un `agent_slug` + payload (prompt texte et/ou image)
 *   - Charge la config agent depuis `ai_agent_configs`
 *   - Résout provider/model (override > agent > settings globaux)
 *   - Vérifie le quota Google si le provider résolu est `google-direct`
 *   - Appelle le provider
 *   - Fallback Google si autorisé et quota disponible
 *   - Logue run + events
 *   - Retourne une réponse standardisée
 *
 * Cette function coexiste avec `ai-extract-rows` qui reste inchangée.
 * Les futurs agents utiliseront ce dispatcher ; l'agent existant
 * `cross-validation-strelok-rows` reste sur `ai-extract-rows` jusqu'à
 * migration explicite (BUILD-IA2f).
 */

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { requireAdmin } from '../_shared/auth.ts';
import { readAgentConfig, readAiSettings } from '../_shared/settings.ts';
import {
  callGoogleDirect,
  callOllama,
  callQuatarly,
  type ProviderCallResult,
} from '../_shared/providers.ts';
import { checkGoogleDailyQuota } from '../_shared/rate-limit.ts';
import { quatarlyChatUrl } from '../_shared/quatarly-url.ts';
import { finishRun, insertRun, logEvent } from '../_shared/logging.ts';

// ---------------------------------------------------------------------------
// Input / output contracts
// ---------------------------------------------------------------------------

interface DispatchRequest {
  agent_slug: string;
  prompt: string;
  system_prompt?: string;
  output_schema?: unknown;
  image_base64?: string;
  image_mime?: string;
  max_tokens?: number;
  temperature?: number;
  provider_override?: string;
  model_override?: string;
}

function validateRequest(json: unknown): { ok: true; data: DispatchRequest } | { ok: false; message: string } {
  if (typeof json !== 'object' || json === null) {
    return { ok: false, message: 'Body must be a JSON object' };
  }
  const obj = json as Record<string, unknown>;
  if (typeof obj.agent_slug !== 'string' || obj.agent_slug.length === 0) {
    return { ok: false, message: 'agent_slug is required (non-empty string)' };
  }
  if (typeof obj.prompt !== 'string' || obj.prompt.length === 0) {
    return { ok: false, message: 'prompt is required (non-empty string)' };
  }
  if (obj.image_base64 !== undefined && typeof obj.image_base64 !== 'string') {
    return { ok: false, message: 'image_base64 must be a string if provided' };
  }
  if (obj.image_mime !== undefined && typeof obj.image_mime !== 'string') {
    return { ok: false, message: 'image_mime must be a string if provided' };
  }
  if (obj.image_base64 && !obj.image_mime) {
    return { ok: false, message: 'image_mime is required when image_base64 is provided' };
  }
  return {
    ok: true,
    data: {
      agent_slug: obj.agent_slug as string,
      prompt: obj.prompt as string,
      system_prompt: typeof obj.system_prompt === 'string' ? obj.system_prompt : undefined,
      output_schema: obj.output_schema ?? undefined,
      image_base64: obj.image_base64 as string | undefined,
      image_mime: obj.image_mime as string | undefined,
      max_tokens: typeof obj.max_tokens === 'number' ? obj.max_tokens : undefined,
      temperature: typeof obj.temperature === 'number' ? obj.temperature : undefined,
      provider_override: typeof obj.provider_override === 'string' ? obj.provider_override : undefined,
      model_override: typeof obj.model_override === 'string' ? obj.model_override : undefined,
    },
  };
}

// ---------------------------------------------------------------------------
// Provider call helpers
// ---------------------------------------------------------------------------

const KNOWN_PROVIDERS = new Set(['quatarly', 'google-direct', 'ollama']);

async function callProvider(
  provider: string,
  model: string,
  body: DispatchRequest,
  systemPrompt: string,
  outputSchema: unknown,
  settings: Awaited<ReturnType<typeof readAiSettings>>,
): Promise<ProviderCallResult> {
  if (provider === 'quatarly') {
    if (body.image_base64 && body.image_mime) {
      return callQuatarly({
        systemPrompt,
        outputSchema,
        imageBase64: body.image_base64,
        imageMime: body.image_mime,
        model,
        apiUrl: quatarlyChatUrl(settings.quatarlyApiUrl),
      });
    }
    // Text-only via Quatarly — use the same OpenAI-compatible endpoint
    const apiKey = Deno.env.get('QUATARLY_API_KEY');
    if (!apiKey) {
      return { ok: false, errorCode: 'no-key', errorMessage: 'QUATARLY_API_KEY missing', latencyMs: 0, retryable: true };
    }
    const url = quatarlyChatUrl(settings.quatarlyApiUrl);
    const reqBody = {
      model,
      response_format: { type: 'json_object' as const },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: body.prompt },
      ],
      temperature: body.temperature ?? 0,
      ...(body.max_tokens ? { max_tokens: body.max_tokens } : {}),
    };
    const t0 = Date.now();
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
      });
      const latencyMs = Date.now() - t0;
      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        return { ok: false, errorCode: `http-${resp.status}`, errorMessage: txt.slice(0, 500), latencyMs, retryable: resp.status >= 500 || resp.status === 429 };
      }
      const payload = await resp.json() as { choices?: Array<{ message?: { content?: string } }> };
      const raw = payload.choices?.[0]?.message?.content;
      if (typeof raw !== 'string' || raw.trim().length === 0) {
        return { ok: false, errorCode: 'empty-content', errorMessage: 'Provider returned empty content', latencyMs, retryable: true };
      }
      try {
        const stripped = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
        return { ok: true, data: JSON.parse(stripped), latencyMs };
      } catch (e) {
        return { ok: false, errorCode: 'invalid-json', errorMessage: e instanceof Error ? e.message : 'JSON parse failed', latencyMs, retryable: true };
      }
    } catch (e) {
      return { ok: false, errorCode: 'network', errorMessage: e instanceof Error ? e.message : String(e), latencyMs: Date.now() - t0, retryable: true };
    }
  }

  if (provider === 'google-direct') {
    if (body.image_base64 && body.image_mime) {
      return callGoogleDirect({
        systemPrompt,
        outputSchema,
        imageBase64: body.image_base64,
        imageMime: body.image_mime,
        model,
      });
    }
    // Text-only Google
    const apiKey = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!apiKey) {
      return { ok: false, errorCode: 'no-key', errorMessage: 'GOOGLE_AI_API_KEY missing', latencyMs: 0, retryable: false };
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;
    const reqBody = {
      systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: body.prompt }] }],
      generationConfig: { temperature: body.temperature ?? 0, response_mime_type: 'application/json' },
    };
    const t0 = Date.now();
    try {
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reqBody) });
      const latencyMs = Date.now() - t0;
      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        return { ok: false, errorCode: `http-${resp.status}`, errorMessage: txt.slice(0, 500), latencyMs, retryable: false };
      }
      type GR = { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const payload = await resp.json() as GR;
      const raw = payload.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof raw !== 'string' || raw.trim().length === 0) {
        return { ok: false, errorCode: 'empty-content', errorMessage: 'Provider returned empty content', latencyMs, retryable: false };
      }
      try {
        const stripped = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
        return { ok: true, data: JSON.parse(stripped), latencyMs };
      } catch (e) {
        return { ok: false, errorCode: 'invalid-json', errorMessage: e instanceof Error ? e.message : 'JSON parse failed', latencyMs, retryable: false };
      }
    } catch (e) {
      return { ok: false, errorCode: 'network', errorMessage: e instanceof Error ? e.message : String(e), latencyMs: Date.now() - t0, retryable: false };
    }
  }

  if (provider === 'ollama') {
    return callOllama({
      systemPrompt,
      userPrompt: body.prompt,
      model,
      baseUrl: settings.ollamaBaseUrl,
      timeoutMs: 60_000,
      imageBase64: body.image_base64,
    });
  }

  return {
    ok: false,
    errorCode: 'unknown-provider',
    errorMessage: `Unknown provider: ${provider}`,
    latencyMs: 0,
    retryable: false,
  };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'method-not-allowed' }, 405);

  // 1) Auth admin
  const auth = await requireAdmin(req);
  if (!auth.ok) return jsonResponse({ error: auth.code, message: auth.message }, auth.status);
  const { user, service } = auth;

  // 2) Body validation
  let body: DispatchRequest;
  try {
    const json = await req.json();
    const parsed = validateRequest(json);
    if (!parsed.ok) return jsonResponse({ error: 'invalid-body', message: parsed.message }, 400);
    body = parsed.data;
  } catch (_e) {
    return jsonResponse({ error: 'invalid-json' }, 400);
  }

  // 3) Load agent config + global settings
  let settings: Awaited<ReturnType<typeof readAiSettings>>;
  let agent: Awaited<ReturnType<typeof readAgentConfig>>;
  try {
    settings = await readAiSettings(service);
    agent = await readAgentConfig(service, body.agent_slug);
  } catch (e) {
    return jsonResponse({ error: 'settings-read-failed', message: e instanceof Error ? e.message : String(e) }, 500);
  }
  if (!agent || !agent.enabled) {
    return jsonResponse({ error: 'agent-disabled', agent_slug: body.agent_slug }, 503);
  }

  // 4) Resolve provider / model (override > agent > global settings)
  const provider = body.provider_override ?? agent.provider ?? settings.providerPrimary;
  const model = body.model_override ?? agent.model ?? settings.modelPrimary;
  const systemPrompt = body.system_prompt ?? agent.system_prompt;
  const outputSchema = body.output_schema ?? agent.output_schema;

  if (!KNOWN_PROVIDERS.has(provider)) {
    return jsonResponse({ error: 'unknown-provider', provider }, 400);
  }

  // 5) Ollama gate — if Ollama is selected but disabled in settings
  if (provider === 'ollama' && !settings.ollamaEnabled) {
    return jsonResponse({ error: 'ollama-disabled', message: 'Ollama is disabled in app_settings' }, 503);
  }

  // 6) Create run
  const runId = await insertRun(service, {
    agentSlug: body.agent_slug,
    provider,
    model,
    userId: user.id,
  });

  let providerUsed = provider;
  let modelUsed = model;
  let fallbackUsed = false;
  let totalLatency = 0;

  // 7) Google quota check (if primary is google-direct)
  if (provider === 'google-direct') {
    const quota = await checkGoogleDailyQuota(service);
    await logEvent(service, { runId, eventType: 'call', provider: 'google-direct', model, success: quota.allowed, errorCode: quota.allowed ? null : 'quota-exceeded' });
    if (!quota.allowed) {
      if (runId) await finishRun(service, runId, { status: 'error', latencyMs: 0, errorCode: 'quota-exceeded' });
      return jsonResponse({ error: 'google-quota-exceeded', used: quota.used, max: quota.max, run_id: runId }, 429);
    }
  }

  // 8) Call primary provider
  const primary = await callProvider(provider, model, body, systemPrompt, outputSchema, settings);
  totalLatency += primary.latencyMs;

  await logEvent(service, {
    runId,
    eventType: 'call',
    provider,
    model,
    success: primary.ok,
    errorCode: primary.ok ? null : primary.errorCode,
    latencyMs: primary.latencyMs,
  });

  // 9) Fallback Google if primary failed and allowed
  let result = primary;
  if (
    !primary.ok &&
    primary.retryable &&
    provider !== 'google-direct' &&
    provider !== 'ollama' &&
    agent.allow_fallback &&
    settings.allowGoogleFallback &&
    settings.googleDirectEnabled
  ) {
    // Check Google quota before fallback
    const fbQuota = await checkGoogleDailyQuota(service);
    if (fbQuota.allowed) {
      const fbModel = settings.googleDirectModel;
      const fb = await callProvider('google-direct', fbModel, body, systemPrompt, outputSchema, settings);
      totalLatency += fb.latencyMs;
      fallbackUsed = true;
      providerUsed = 'google-direct';
      modelUsed = fbModel;
      await logEvent(service, {
        runId,
        eventType: 'fallback',
        provider: 'google-direct',
        model: fbModel,
        success: fb.ok,
        errorCode: fb.ok ? null : fb.errorCode,
        latencyMs: fb.latencyMs,
      });
      result = fb;
    } else {
      // Quota exhausted — log and keep primary error
      await logEvent(service, {
        runId,
        eventType: 'fallback',
        provider: 'google-direct',
        model: settings.googleDirectModel,
        success: false,
        errorCode: 'quota-exceeded',
        latencyMs: 0,
      });
    }
  }

  // 10) Final failure
  if (!result.ok) {
    if (runId) {
      await finishRun(service, runId, {
        status: 'error',
        latencyMs: totalLatency,
        errorCode: result.errorCode,
        fallbackUsed,
      });
    }
    return jsonResponse({
      error: 'provider-failed',
      run_id: runId,
      provider: providerUsed,
      model: modelUsed,
      fallback_used: fallbackUsed,
      error_code: result.errorCode,
      message: result.errorMessage,
      latency_ms: totalLatency,
    }, 502);
  }

  // 11) Success
  if (runId) {
    await finishRun(service, runId, {
      status: 'success',
      latencyMs: totalLatency,
      fallbackUsed,
      outputJsonb: result.data,
    });
  }

  return jsonResponse({
    text: result.data,
    provider: providerUsed,
    model: modelUsed,
    fallback_used: fallbackUsed,
    latency_ms: totalLatency,
    run_id: runId,
  });
});