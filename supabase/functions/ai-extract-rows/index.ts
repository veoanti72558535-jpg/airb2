/**
 * Edge Function: ai-extract-rows
 *
 * BUILD IA-1 — Strelok Pro screenshot → brouillon `rows[]`.
 *
 * Contrat strict :
 *   - source forcée : `strelok-pro`
 *   - 1 seule image par appel (max ~4 Mo, configurable via app_settings)
 *   - rows-only (pas d'inputs balistiques)
 *   - validation Zod côté serveur AVANT renvoi
 *   - log run + events dans tables IA-1
 *   - fallback Quatarly → Google Direct si autorisé
 *
 * Le client appelle :
 *   POST /functions/v1/ai-extract-rows
 *   Authorization: Bearer <user JWT admin>
 *   Body JSON : { imageBase64, imageMime }
 *
 * Réponse 200 :
 *   { runId, providerUsed, modelUsed, fallbackUsed, draft: AIDraftRows }
 */

// @deno-types="https://esm.sh/v135/zod@3.23.8/lib/index.d.ts"
import { z } from 'https://esm.sh/zod@3.23.8';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { requireAdmin } from '../_shared/auth.ts';
import { readAgentConfig, readAiSettings } from '../_shared/settings.ts';
import {
  callGoogleDirect,
  callQuatarly,
  type ProviderCallResult,
} from '../_shared/providers.ts';
import { finishRun, insertRun, logEvent, sha256Hex } from '../_shared/logging.ts';

const AGENT_SLUG = 'cross-validation-strelok-rows';
const ALLOWED_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp']);

const requestSchema = z
  .object({
    imageBase64: z.string().min(64, 'imageBase64 must be a non-empty base64 string'),
    imageMime: z.string().refine((m) => ALLOWED_MIMES.has(m), {
      message: 'imageMime must be image/png, image/jpeg or image/webp',
    }),
  })
  .strict();

// Schéma Zod du draft IA-1, miroir strict du JSON Schema seedé en base.
const rowSchema = z
  .object({
    range: z.number().finite().nonnegative(),
    drop: z.number().finite().optional(),
    velocity: z.number().finite().nonnegative().optional(),
    windDrift: z.number().finite().optional(),
    tof: z.number().finite().nonnegative().optional(),
    energy: z.number().finite().nonnegative().optional(),
  })
  .strict();

const draftSchema = z
  .object({
    rows: z.array(rowSchema).min(0).max(200),
    fieldConfidence: z.record(z.string(), z.number().min(0).max(1)),
    unreadable: z.array(z.string().max(300)).max(100),
    assumptions: z.array(z.string().max(300)).max(30),
  })
  .strict();

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'method-not-allowed' }, 405);

  // 1) Auth + rôle admin
  const auth = await requireAdmin(req);
  if (!auth.ok) return jsonResponse({ error: auth.code, message: auth.message }, auth.status);
  const { user, service } = auth;

  // 2) Body validation
  let parsedBody: z.infer<typeof requestSchema>;
  try {
    const json = await req.json();
    const parsed = requestSchema.safeParse(json);
    if (!parsed.success) {
      return jsonResponse(
        { error: 'invalid-body', issues: parsed.error.flatten().fieldErrors },
        400,
      );
    }
    parsedBody = parsed.data;
  } catch (_e) {
    return jsonResponse({ error: 'invalid-json' }, 400);
  }

  // 3) Settings + agent config
  let settings;
  let agent;
  try {
    settings = await readAiSettings(service);
    agent = await readAgentConfig(service, AGENT_SLUG);
  } catch (e) {
    return jsonResponse(
      { error: 'settings-read-failed', message: e instanceof Error ? e.message : String(e) },
      500,
    );
  }
  if (!agent || !agent.enabled) {
    return jsonResponse({ error: 'agent-disabled' }, 503);
  }

  // 4) Taille image (le base64 ~ 4/3 octets)
  const approxBytes = Math.floor((parsedBody.imageBase64.length * 3) / 4);
  if (approxBytes > settings.maxImageBytes) {
    return jsonResponse(
      { error: 'image-too-large', max: settings.maxImageBytes, got: approxBytes },
      413,
    );
  }

  // 5) Hash de l'image (audit trail — pas l'image elle-même)
  let sourceHash: string | undefined;
  try {
    const bin = Uint8Array.from(atob(parsedBody.imageBase64), (c) => c.charCodeAt(0));
    sourceHash = `sha256:${await sha256Hex(bin)}`;
  } catch (_e) {
    return jsonResponse({ error: 'invalid-base64' }, 400);
  }

  // 6) Création du run
  const runId = await insertRun(service, {
    agentSlug: AGENT_SLUG,
    provider: agent.provider,
    model: agent.model,
    userId: user.id,
    sourceHash,
  });

  // 7) Provider primaire
  let providerUsed = agent.provider;
  let modelUsed = agent.model;
  let fallbackUsed = false;
  let totalLatency = 0;

  const providerInputBase = {
    systemPrompt: agent.system_prompt,
    outputSchema: agent.output_schema,
    imageBase64: parsedBody.imageBase64,
    imageMime: parsedBody.imageMime,
  };

  let primary: ProviderCallResult;
  if (agent.provider === 'quatarly') {
    primary = await callQuatarly({
      ...providerInputBase,
      model: agent.model,
      apiUrl: settings.quatarlyApiUrl,
    });
  } else if (agent.provider === 'google-direct') {
    primary = await callGoogleDirect({ ...providerInputBase, model: agent.model });
  } else {
    primary = {
      ok: false,
      errorCode: 'unknown-provider',
      errorMessage: `Unknown provider: ${agent.provider}`,
      latencyMs: 0,
      retryable: false,
    };
  }
  totalLatency += primary.latencyMs;
  await logEvent(service, {
    runId,
    eventType: 'call',
    provider: agent.provider,
    model: agent.model,
    success: primary.ok,
    errorCode: primary.ok ? null : primary.errorCode,
    latencyMs: primary.latencyMs,
  });

  // 8) Fallback Google si nécessaire et autorisé
  let result = primary;
  if (
    !primary.ok &&
    primary.retryable &&
    agent.allow_fallback &&
    settings.allowGoogleFallback &&
    settings.googleDirectEnabled
  ) {
    const fb = await callGoogleDirect({
      ...providerInputBase,
      model: settings.googleDirectModel,
    });
    totalLatency += fb.latencyMs;
    fallbackUsed = true;
    providerUsed = 'google-direct';
    modelUsed = settings.googleDirectModel;
    await logEvent(service, {
      runId,
      eventType: 'fallback',
      provider: 'google-direct',
      model: settings.googleDirectModel,
      success: fb.ok,
      errorCode: fb.ok ? null : fb.errorCode,
      latencyMs: fb.latencyMs,
    });
    result = fb;
  }

  // 9) Échec définitif
  if (!result.ok) {
    if (runId) {
      await finishRun(service, runId, {
        status: 'error',
        latencyMs: totalLatency,
        errorCode: result.errorCode,
        fallbackUsed,
      });
    }
    return jsonResponse(
      {
        error: 'provider-failed',
        runId,
        providerUsed,
        modelUsed,
        errorCode: result.errorCode,
        message: result.errorMessage,
      },
      502,
    );
  }

  // 10) Validation du draft
  const draftCheck = draftSchema.safeParse(result.data);
  if (!draftCheck.success) {
    await logEvent(service, {
      runId,
      eventType: 'validation_error',
      provider: providerUsed,
      model: modelUsed,
      success: false,
      errorCode: 'schema-mismatch',
    });
    if (runId) {
      await finishRun(service, runId, {
        status: 'error',
        latencyMs: totalLatency,
        errorCode: 'schema-mismatch',
        fallbackUsed,
        outputJsonb: result.data,
      });
    }
    return jsonResponse(
      {
        error: 'invalid-draft',
        runId,
        providerUsed,
        modelUsed,
        issues: draftCheck.error.flatten(),
      },
      502,
    );
  }

  if (runId) {
    await finishRun(service, runId, {
      status: 'success',
      latencyMs: totalLatency,
      fallbackUsed,
      outputJsonb: draftCheck.data,
    });
  }

  return jsonResponse({
    runId,
    providerUsed,
    modelUsed,
    fallbackUsed,
    promptVersion: agent.prompt_version,
    draft: draftCheck.data,
  });
});