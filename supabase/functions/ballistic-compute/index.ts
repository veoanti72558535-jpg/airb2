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

/**
 * Suffixes interdits — repèrent toute clé qui annonce explicitement
 * une unité d'affichage. Comparaison insensible à la casse, ancrée en
 * fin de nom (séparateur `_` ou camelCase final).
 */
const FORBIDDEN_SUFFIXES = [
  '_fps', '_yd', '_yds', '_gr', '_gn', '_in', '_inch', '_mph',
  '_lbs', '_lb', '_oz', '_f', '_fahrenheit', '_inhg', '_psi',
  '_kmh', '_kph', '_mi', '_mile', '_miles', '_ft', '_feet',
  '_cm', '_mm_display', '_mil_display', '_moa_display',
] as const;

/** Mots-clés interdits anywhere dans une clé (cas camelCase). */
const FORBIDDEN_TOKENS = [
  'fps', 'mph', 'inHg', 'lbs', 'grains', 'yards', 'inches',
  'fahrenheit', 'displayUnit', 'displayValue',
];

function keyMentionsDisplayUnit(key: string): string | null {
  const lower = key.toLowerCase();
  for (const sfx of FORBIDDEN_SUFFIXES) {
    if (lower.endsWith(sfx)) return sfx;
  }
  for (const tok of FORBIDDEN_TOKENS) {
    if (key.includes(tok)) return tok;
  }
  return null;
}

/**
 * Walks the payload depth-first; throws on any forbidden key.
 * Skips the top-level `units` sentinel (already validated).
 */
function assertNoDisplayUnitKeys(node: unknown, path = '$'): void {
  if (node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((item, i) => assertNoDisplayUnitKeys(item, `${path}[${i}]`));
    return;
  }
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (path === '$' && k === 'units') continue;
    const hit = keyMentionsDisplayUnit(k);
    if (hit) {
      const err = new Error(
        `Display-unit key detected at ${path}.${k} (suffix/token "${hit}"). ` +
        `The ballistic engine accepts SI units only.`,
      );
      (err as { code?: string }).code = 'display-unit-detected';
      (err as { offendingPath?: string }).offendingPath = `${path}.${k}`;
      throw err;
    }
    assertNoDisplayUnitKeys(v, `${path}.${k}`);
  }
}

/**
 * Bornes physiques SI plausibles pour une carabine PCP.
 * Hors de ces bornes ⇒ très probablement une unité d'affichage déguisée
 * (ex. 900 "m/s" = 900 fps mal converti). Volontairement larges pour
 * couvrir les armes à poudre testées en cross-validation, sans laisser
 * passer 2000 fps annoncés en m/s.
 */
const SI_BOUNDS = {
  // muzzleVelocity en m/s — pellet airgun ~150-380, slug ~250-300,
  // poudre extrême ~1500. > 2000 m/s = forcément fps.
  muzzleVelocity: { min: 30, max: 2000, unit: 'm/s' },
  // BC sans dimension, ~0.005 (BB) à ~1.0 (long range).
  bc: { min: 0.001, max: 1.5, unit: '(dimensionless)' },
  // projectileWeight en GRAMS (interne SI projet — voir types.ts:301
  // legacy "grains" mais le moteur convertit en interne ; on impose ici
  // grams pour interdire toute injection en grains via cet endpoint).
  // Pellet ~0.3 à slug ~5 g. > 100 g = sûrement grains.
  projectileWeight: { min: 0.05, max: 100, unit: 'g' },
  // sightHeight en mm.
  sightHeight: { min: 0, max: 200, unit: 'mm' },
  // distances en m.
  zeroRange: { min: 1, max: 3000, unit: 'm' },
  maxRange: { min: 1, max: 3000, unit: 'm' },
  rangeStep: { min: 0.1, max: 500, unit: 'm' },
  slopeAngle: { min: -90, max: 90, unit: 'deg' },
  latitude: { min: -90, max: 90, unit: 'deg' },
  shootingAzimuth: { min: 0, max: 360, unit: 'deg' },
  // Weather SI :
  temperature: { min: -60, max: 60, unit: '°C' },   // > 60 ⇒ probable °F
  humidity: { min: 0, max: 100, unit: '%' },
  pressure: { min: 500, max: 1100, unit: 'hPa' },   // < 500 ⇒ probable inHg
  altitude: { min: -500, max: 9000, unit: 'm' },
  windSpeed: { min: 0, max: 100, unit: 'm/s' },     // > 100 ⇒ probable fps/mph
  windAngle: { min: 0, max: 360, unit: 'deg' },
} as const;

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

type SiBoundKey = keyof typeof SI_BOUNDS;

function checkBound(field: SiBoundKey, value: number): string | null {
  const b = SI_BOUNDS[field];
  if (value < b.min || value > b.max) {
    return `${field}=${value} is outside SI plausible range [${b.min}, ${b.max}] ${b.unit} — looks like a display-unit value (e.g. fps/grains/inHg/°F).`;
  }
  return null;
}

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
  for (const [field, value] of checks) {
    if (value === undefined) continue;
    const err = checkBound(field, value);
    if (err) return err;
  }
  return null;
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

  // Sentinel d'unités obligatoire AVANT toute autre validation — refus
  // explicite de tout payload qui n'affirme pas être en SI.
  if (
    !body || typeof body !== 'object' ||
    (body as Record<string, unknown>).units !== 'SI'
  ) {
    return jsonResponse(
      {
        ok: false,
        code: 'missing-units-sentinel',
        message: 'Payload must include `units: "SI"` at root. Display units (fps, yd, gr, °F, inHg, mph, …) are rejected by the engine endpoint.',
      },
      400,
    );
  }

  // Garde-fou clés — refuse toute clé qui mentionne une unité d'affichage.
  try {
    assertNoDisplayUnitKeys(body);
  } catch (e) {
    const err = e as Error & { code?: string; offendingPath?: string };
    return jsonResponse(
      {
        ok: false,
        code: err.code ?? 'display-unit-detected',
        message: err.message,
        offendingPath: err.offendingPath,
      },
      422,
    );
  }

  // Validation structurelle Zod.
  const parsed = inputSchema.safeParse(body);
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
  assertNoDisplayUnitKeys,
  checkBound,
  enforceSiBounds,
  inputSchema,
  keyMentionsDisplayUnit,
  SI_BOUNDS,
};