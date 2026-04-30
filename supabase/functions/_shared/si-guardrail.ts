/**
 * SI Guardrail — module partagé pour TOUS les endpoints balistiques.
 *
 * Contrat unique : aucun endpoint exposant le moteur balistique
 * (présent ou futur — `ballistic-compute`, `ballistic-zero-solver`,
 * `ballistic-truing`, `ballistic-pbr`, …) ne doit accepter d'unité
 * d'affichage. Toute valeur reçue est en SI strict :
 *
 *   - vitesse        : m/s
 *   - distance       : m
 *   - longueur       : m (sous-multiple toléré : mm pour sightHeight)
 *   - masse          : g
 *   - énergie        : J
 *   - température    : °C
 *   - pression       : hPa
 *   - vitesse vent   : m/s
 *   - angle          : deg (pour twist : cal/tour)
 *
 * Comment l'utiliser dans une nouvelle edge function :
 *
 *   import { applySiGuardrail } from '../_shared/si-guardrail.ts';
 *   const guard = applySiGuardrail(body);
 *   if (!guard.ok) return jsonResponse(guard.error, guard.status);
 *   const safeInput = guard.payload;
 *
 * Voir aussi : `docs/engine/deterministic-contract.md`,
 * `src/lib/ballistic-compute-guardrail.test.ts`,
 * `src/lib/ballistic-endpoints-guardrail-coverage.test.ts`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Suffixes interdits — repèrent toute clé qui annonce explicitement
 * une unité d'affichage. Comparaison insensible à la casse, ancrée en
 * fin de nom (séparateur `_` ou camelCase final).
 */
export const FORBIDDEN_SUFFIXES = [
  '_fps', '_yd', '_yds', '_gr', '_gn', '_in', '_inch', '_mph',
  '_lbs', '_lb', '_oz', '_f', '_fahrenheit', '_inhg', '_psi',
  '_kmh', '_kph', '_mi', '_mile', '_miles', '_ft', '_feet',
  '_cm', '_mm_display', '_mil_display', '_moa_display',
] as const;

/** Mots-clés interdits anywhere dans une clé (cas camelCase).
 *  Match insensible à la casse : `muzzleVelocityFps` ⇒ "fps". */
export const FORBIDDEN_TOKENS = [
  'fps', 'mph', 'inhg', 'lbs', 'grains', 'yards', 'inches',
  'fahrenheit', 'displayunit', 'displayvalue',
] as const;

/**
 * Bornes physiques SI plausibles pour une carabine PCP (et armes à
 * poudre testées en cross-validation). Hors de ces bornes ⇒ très
 * probablement une unité d'affichage déguisée (ex. 900 "m/s" = 900 fps
 * mal converti en m/s).
 */
export const SI_BOUNDS = {
  muzzleVelocity: { min: 30, max: 2000, unit: 'm/s' },
  bc: { min: 0.001, max: 1.5, unit: '(dimensionless)' },
  projectileWeight: { min: 0.05, max: 100, unit: 'g' },
  sightHeight: { min: 0, max: 200, unit: 'mm' },
  zeroRange: { min: 1, max: 3000, unit: 'm' },
  maxRange: { min: 1, max: 3000, unit: 'm' },
  rangeStep: { min: 0.1, max: 500, unit: 'm' },
  slopeAngle: { min: -90, max: 90, unit: 'deg' },
  latitude: { min: -90, max: 90, unit: 'deg' },
  shootingAzimuth: { min: 0, max: 360, unit: 'deg' },
  temperature: { min: -60, max: 60, unit: '°C' },
  humidity: { min: 0, max: 100, unit: '%' },
  pressure: { min: 500, max: 1100, unit: 'hPa' },
  altitude: { min: -500, max: 9000, unit: 'm' },
  windSpeed: { min: 0, max: 100, unit: 'm/s' },
  windAngle: { min: 0, max: 360, unit: 'deg' },
} as const;

export type SiBoundKey = keyof typeof SI_BOUNDS;

export function keyMentionsDisplayUnit(key: string): string | null {
  const lower = key.toLowerCase();
  for (const sfx of FORBIDDEN_SUFFIXES) {
    if (lower.endsWith(sfx)) return sfx;
  }
  for (const tok of FORBIDDEN_TOKENS) {
    if (lower.includes(tok)) return tok;
  }
  return null;
}

/**
 * Walks the payload depth-first; returns the first offending path or
 * null if every key is SI-clean. Skips the top-level `units` sentinel.
 */
export function findDisplayUnitKey(
  node: unknown,
  path = '$',
): { path: string; key: string; hit: string } | null {
  if (node === null || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const sub = findDisplayUnitKey(node[i], `${path}[${i}]`);
      if (sub) return sub;
    }
    return null;
  }
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (path === '$' && k === 'units') continue;
    const hit = keyMentionsDisplayUnit(k);
    if (hit) return { path: `${path}.${k}`, key: k, hit };
    const sub = findDisplayUnitKey(v, `${path}.${k}`);
    if (sub) return sub;
  }
  return null;
}

export function checkSiBound(field: SiBoundKey, value: number): string | null {
  const b = SI_BOUNDS[field];
  if (value < b.min || value > b.max) {
    return `${field}=${value} is outside SI plausible range [${b.min}, ${b.max}] ${b.unit} — looks like a display-unit value (e.g. fps/grains/inHg/°F).`;
  }
  return null;
}

/**
 * Walks a flat record of <SI field, number> entries and returns the
 * first bound violation, if any. Endpoints can build the entry list
 * from their own validated input.
 */
export function findOutOfSiRange(
  entries: Array<[SiBoundKey, number | undefined]>,
): string | null {
  for (const [field, value] of entries) {
    if (value === undefined) continue;
    if (!Number.isFinite(value)) {
      return `${field}=${value} is not a finite number.`;
    }
    const err = checkSiBound(field, value);
    if (err) return err;
  }
  return null;
}

export type GuardrailError =
  | { code: 'missing-units-sentinel'; message: string }
  | { code: 'display-unit-detected'; message: string; offendingPath: string }
  | { code: 'out-of-si-range'; message: string };

export type GuardrailResult<T> =
  | { ok: true; payload: T }
  | { ok: false; status: number; error: { ok: false } & GuardrailError };

/**
 * Applies the FULL SI guardrail to a request body. Use at the TOP of
 * every ballistic edge function — before Zod, before any computation.
 *
 *   1. Sentinel `units: "SI"` mandatory at root.
 *   2. No display-unit keys anywhere in the tree.
 *   3. (Optional) bound checks for fields the caller knows about.
 *
 * Bound checks are opt-in via `bounded`: pass the tuples your endpoint
 * uses. This keeps the helper agnostic to each endpoint's schema.
 */
export function applySiGuardrail<T extends Record<string, unknown>>(
  body: unknown,
  bounded?: Array<[SiBoundKey, number | undefined]>,
): GuardrailResult<T> {
  if (
    !body ||
    typeof body !== 'object' ||
    (body as Record<string, unknown>).units !== 'SI'
  ) {
    return {
      ok: false,
      status: 400,
      error: {
        ok: false,
        code: 'missing-units-sentinel',
        message:
          'Payload must include `units: "SI"` at root. Display units (fps, yd, gr, °F, inHg, mph, …) are rejected by ballistic endpoints.',
      },
    };
  }

  const offending = findDisplayUnitKey(body);
  if (offending) {
    return {
      ok: false,
      status: 422,
      error: {
        ok: false,
        code: 'display-unit-detected',
        message:
          `Display-unit key detected at ${offending.path} (suffix/token "${offending.hit}"). ` +
          `Ballistic endpoints accept SI units only.`,
        offendingPath: offending.path,
      },
    };
  }

  if (bounded && bounded.length > 0) {
    const boundErr = findOutOfSiRange(bounded);
    if (boundErr) {
      return {
        ok: false,
        status: 422,
        error: { ok: false, code: 'out-of-si-range', message: boundErr },
      };
    }
  }

  return { ok: true, payload: body as T };
}
