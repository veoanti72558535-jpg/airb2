/**
 * Providers IA — Quatarly (primaire) et Google Direct (fallback).
 *
 * Contrat commun : on envoie une image base64 + un prompt système, et on
 * récupère un objet JSON strict (validé en aval par Zod). Aucun fallback
 * silencieux côté appelant : c'est `ai-extract-rows` qui décide, sur la
 * base de l'erreur retournée, s'il faut basculer.
 */

export interface ProviderCallInput {
  systemPrompt: string;
  /** Schéma JSON Schema, envoyé tel quel au provider quand supporté. */
  outputSchema: unknown;
  /** base64 brut (sans préfixe data:URI) */
  imageBase64: string;
  /** ex. 'image/png' */
  imageMime: string;
  model: string;
  /** Optionnel : URL de l'API (utile pour Quatarly auto-hébergé / proxy). */
  apiUrl?: string;
}

export interface ProviderCallSuccess {
  ok: true;
  /** Objet JSON brut parsé depuis la réponse du modèle. */
  data: unknown;
  latencyMs: number;
}

export interface ProviderCallFailure {
  ok: false;
  errorCode: string;
  errorMessage: string;
  latencyMs: number;
  /** Si true, le code appelant peut tenter le fallback. */
  retryable: boolean;
}

export type ProviderCallResult = ProviderCallSuccess | ProviderCallFailure;

function safeParseJson(raw: string): unknown {
  // Certains modèles renvoient un fence ```json ... ``` malgré l'instruction.
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  return JSON.parse(stripped);
}

// ----------------------------------------------------------------------------
// Quatarly (gateway type OpenAI-compatible)
// ----------------------------------------------------------------------------

export async function callQuatarly(input: ProviderCallInput): Promise<ProviderCallResult> {
  const apiKey = Deno.env.get('QUATARLY_API_KEY');
  if (!apiKey) {
    return {
      ok: false,
      errorCode: 'no-key',
      errorMessage: 'QUATARLY_API_KEY missing',
      latencyMs: 0,
      retryable: true,
    };
  }
  const url = input.apiUrl || 'https://api.quatarly.ai/v1/chat/completions';

  const body = {
    model: input.model,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: input.systemPrompt },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Return ONLY a JSON object that conforms to this JSON Schema:\n${JSON.stringify(input.outputSchema)}`,
          },
          {
            type: 'image_url',
            image_url: { url: `data:${input.imageMime};base64,${input.imageBase64}` },
          },
        ],
      },
    ],
    temperature: 0,
  };

  const t0 = Date.now();
  let resp: Response;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return {
      ok: false,
      errorCode: 'network',
      errorMessage: e instanceof Error ? e.message : String(e),
      latencyMs: Date.now() - t0,
      retryable: true,
    };
  }
  const latencyMs = Date.now() - t0;

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    return {
      ok: false,
      errorCode: `http-${resp.status}`,
      errorMessage: txt.slice(0, 500),
      latencyMs,
      retryable: resp.status >= 500 || resp.status === 429,
    };
  }

  let payload: { choices?: Array<{ message?: { content?: string } }> };
  try {
    payload = await resp.json();
  } catch (e) {
    return {
      ok: false,
      errorCode: 'invalid-response',
      errorMessage: e instanceof Error ? e.message : 'unparseable provider response',
      latencyMs,
      retryable: true,
    };
  }
  const raw = payload.choices?.[0]?.message?.content;
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return {
      ok: false,
      errorCode: 'empty-content',
      errorMessage: 'Provider returned empty content',
      latencyMs,
      retryable: true,
    };
  }
  try {
    return { ok: true, data: safeParseJson(raw), latencyMs };
  } catch (e) {
    return {
      ok: false,
      errorCode: 'invalid-json',
      errorMessage: e instanceof Error ? e.message : 'JSON parse failed',
      latencyMs,
      retryable: true,
    };
  }
}

// ----------------------------------------------------------------------------
// Google Direct (Generative Language API — gemini-2.x vision)
// ----------------------------------------------------------------------------

export async function callGoogleDirect(input: ProviderCallInput): Promise<ProviderCallResult> {
  const apiKey = Deno.env.get('GOOGLE_AI_API_KEY');
  if (!apiKey) {
    return {
      ok: false,
      errorCode: 'no-key',
      errorMessage: 'GOOGLE_AI_API_KEY missing',
      latencyMs: 0,
      retryable: false,
    };
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(input.model)}:generateContent?key=${apiKey}`;

  const body = {
    systemInstruction: { role: 'system', parts: [{ text: input.systemPrompt }] },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Return ONLY a JSON object that conforms to this JSON Schema:\n${JSON.stringify(input.outputSchema)}`,
          },
          {
            inline_data: { mime_type: input.imageMime, data: input.imageBase64 },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      response_mime_type: 'application/json',
    },
  };

  const t0 = Date.now();
  let resp: Response;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return {
      ok: false,
      errorCode: 'network',
      errorMessage: e instanceof Error ? e.message : String(e),
      latencyMs: Date.now() - t0,
      retryable: false,
    };
  }
  const latencyMs = Date.now() - t0;

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    return {
      ok: false,
      errorCode: `http-${resp.status}`,
      errorMessage: txt.slice(0, 500),
      latencyMs,
      retryable: false,
    };
  }

  type GoogleResponse = {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  let payload: GoogleResponse;
  try {
    payload = await resp.json();
  } catch (e) {
    return {
      ok: false,
      errorCode: 'invalid-response',
      errorMessage: e instanceof Error ? e.message : 'unparseable provider response',
      latencyMs,
      retryable: false,
    };
  }
  const raw = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return {
      ok: false,
      errorCode: 'empty-content',
      errorMessage: 'Provider returned empty content',
      latencyMs,
      retryable: false,
    };
  }
  try {
    return { ok: true, data: safeParseJson(raw), latencyMs };
  } catch (e) {
    return {
      ok: false,
      errorCode: 'invalid-json',
      errorMessage: e instanceof Error ? e.message : 'JSON parse failed',
      latencyMs,
      retryable: false,
    };
  }
}