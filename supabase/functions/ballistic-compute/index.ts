/**
 * Edge Function: ballistic-compute
 *
 * GARDE-FOU SI — Refuse toute unité d'affichage en entrée du moteur
 * balistique. Le contrat backend impose strictement le Système
 * International (m, m/s, kg, °C, hPa, Pa, J, rad/deg pour angles, …).
 *
 * Pourquoi ce garde-fou existe :
 *   AirBallistik est mobile-first FR/EN avec des préférences d'affichage
 *   par catégorie (fps/yd/gr/inHg/°F en Imperial, m/s/m/g/hPa/°C en Metric).
 *   Toute la conversion vit côté UI (`toDisplay`/`fromDisplay`). Le moteur
 *   ne doit JAMAIS recevoir une valeur convertie pour l'affichage. Cette
 *   edge function matérialise ce contrat côté serveur :
 *
 *     1. Sentinel `units: "SI"` OBLIGATOIRE en racine du payload.
 *     2. Aucune clé suffixée d'une unité d'affichage tolérée
 *        (_fps, _yd, _gr, _in, _mph, _lbs, _F, _inHg, _hPa, _kmh, _mi,
 *         _mil, _moa, _kg ailleurs que weight, …) à AUCUNE profondeur.
 *     3. Bornes physiques en SI : tout dépassement hors-borne (ex:
 *        muzzleVelocity > 500 m/s ⇒ très probablement des fps) ⇒ 422
 *        avec un diagnostic clair "looks like display unit".
 *
 * Sortie : un payload normalisé identique à l'entrée (mêmes nombres SI),
 * prêt à être passé au moteur client `calculateTrajectory()`. La
 * computation elle-même reste côté client (le moteur est 100% TS et vit
 * dans `src/lib/ballistics`). Cet endpoint est un VALIDATEUR.
 *
 * Contrat de réponse :
 *   200 { ok: true, units: "SI", normalized: <input>, engineVersion: 2 }
 *   400 { ok: false, code: "bad-json" | "missing-units-sentinel", message }
 *   422 { ok: false, code: "display-unit-detected" | "out-of-si-range",
 *         message, offendingPath, offendingValue }
 *   401 { ok: false, code: "no-auth" | "invalid-jwt", message }
 */

// @deno-types="https://esm.sh/v135/zod@3.23.8/lib/index.d.ts"
import { z } from 'https://esm.sh/zod@3.23.8';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  applySiGuardrail,
  findDisplayUnitKey,
  keyMentionsDisplayUnit,
  checkSiBound,
  findOutOfSiRange,
  SI_BOUNDS,
  FORBIDDEN_SUFFIXES,
  FORBIDDEN_TOKENS,
  type SiBoundKey,
} from '../_shared/si-guardrail.ts';

/**
 * Schéma minimal des champs balistiques SI. `passthrough()` permet aux
 * consommateurs de passer des champs additionnels (engineConfig, etc.)
 * tant qu'aucune clé n'est suffixée d'une unité d'affichage.
 */
const weatherSchema = z
  .object({
    temperature: z.number().finite(),
    humidity: z.number().finite(),
    pressure: z.number().finite(),
    altitude: z.number().finite(),
    windSpeed: z.number().finite(),
    windAngle: z.number().finite(),
  })
  .passthrough();

const inputSchema = z
  .object({
    units: z.literal('SI'),
    muzzleVelocity: z.number().finite().positive(),
    bc: z.number().finite().positive(),
    projectileWeight: z.number().finite().positive(),
    sightHeight: z.number().finite().nonnegative(),
    zeroRange: z.number().finite().positive(),
    maxRange: z.number().finite().positive(),
    rangeStep: z.number().finite().positive(),
    weather: weatherSchema,
    slopeAngle: z.number().finite().optional(),
    latitude: z.number().finite().optional(),
    shootingAzimuth: z.number().finite().optional(),
  })
  .passthrough();

function enforceSiBounds(input: z.infer<typeof inputSchema>): string | null {
  const checks: Array<[SiBoundKey, number | undefined]> = [
    ['muzzleVelocity', input.muzzleVelocity],
    ['bc', input.bc],
    ['projectileWeight', input.projectileWeight],
    ['sightHeight', input.sightHeight],
    ['zeroRange', input.zeroRange],
    ['maxRange', input.maxRange],
    ['rangeStep', input.rangeStep],
    ['slopeAngle', input.slopeAngle],
    ['latitude', input.latitude],
    ['shootingAzimuth', input.shootingAzimuth],
    ['temperature', input.weather.temperature as number],
    ['humidity', input.weather.humidity as number],
    ['pressure', input.weather.pressure as number],
    ['altitude', input.weather.altitude as number],
    ['windSpeed', input.weather.windSpeed as number],
    ['windAngle', input.weather.windAngle as number],
  ];
  return findOutOfSiRange(checks);
}

/**
 * Auth: any authenticated user (no admin requirement). The endpoint is
 * a stateless validator — its only side effect is rejecting bad payloads.
 */
async function requireAuthedUser(req: Request): Promise<{ ok: true } | { ok: false; status: number; code: string; message: string }> {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return { ok: false, status: 401, code: 'no-auth', message: 'Missing Authorization header' };
  }
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  if (!SUPABASE_URL || !ANON_KEY) {
    return { ok: false, status: 500, code: 'server-misconfigured', message: 'SUPABASE_URL / SUPABASE_ANON_KEY missing' };
  }
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) {
    return { ok: false, status: 401, code: 'invalid-jwt', message: 'Invalid or expired JWT' };
  }
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, code: 'method-not-allowed', message: 'POST only' }, 405);
  }

  const auth = await requireAuthedUser(req);
  if (!auth.ok) {
    return jsonResponse({ ok: false, code: auth.code, message: auth.message }, auth.status);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(
      { ok: false, code: 'bad-json', message: 'Body must be valid JSON' },
      400,
    );
  }

  // Garde-fou SI partagé — sentinel `units: "SI"` + interdit toute clé
  // suffixée d'une unité d'affichage (à n'importe quelle profondeur).
  // Mutualisé pour TOUS les endpoints balistiques : voir
  // `_shared/si-guardrail.ts` et `docs/engine/backend-si-contract.md`.
  const guard = applySiGuardrail<Record<string, unknown>>(body);
  if (!guard.ok) {
    return jsonResponse(guard.error, guard.status);
  }

  // Validation structurelle Zod.
  const parsed = inputSchema.safeParse(guard.payload);
  if (!parsed.success) {
    return jsonResponse(
      {
        ok: false,
        code: 'invalid-input',
        message: 'Payload does not match SI ballistic input schema.',
        issues: parsed.error.flatten(),
      },
      422,
    );
  }

  // Bornes physiques SI.
  const boundErr = enforceSiBounds(parsed.data);
  if (boundErr) {
    return jsonResponse(
      { ok: false, code: 'out-of-si-range', message: boundErr },
      422,
    );
  }

  return jsonResponse({
    ok: true,
    units: 'SI',
    engineVersion: 2,
    normalized: parsed.data,
  });
});

// Exports pour les tests unitaires (consommés via dynamic import en TS).
export {
  enforceSiBounds,
  inputSchema,
  // Re-exports du module partagé : permettent aux tests existants
  // de continuer à importer ces helpers depuis ce fichier.
  keyMentionsDisplayUnit,
  findDisplayUnitKey,
  checkSiBound,
  applySiGuardrail,
  SI_BOUNDS,
};