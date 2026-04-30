/**
 * Canonical catalog of validation error codes surfaced to users.
 *
 * Single source of truth for:
 *   - the SI guardrail (supabase/functions/_shared/si-guardrail.ts)
 *   - the client wrapper (src/lib/ballistic-compute-client.ts)
 *   - the SI_BOUNDS range checks
 *
 * Used by:
 *   - src/components/docs-fx/ErrorCodesTable.tsx (rendered in /docs/fx)
 *   - src/lib/docs-fx/error-codes.test.ts (locks the catalog against
 *     code drift — adding a new guardrail code MUST add a row here)
 *
 * Severity:
 *   - 'hard'  → calculation is blocked (HARD_REJECTION_CODES). The user
 *               must fix the input before retrying.
 *   - 'soft'  → guardrail could not run (env / network / auth). The app
 *               falls back to local-only with an "unverified" badge.
 *   - 'range' → not a guardrail code per se, but a per-field bound
 *               violation under the umbrella `out-of-si-range`. Listed
 *               separately so users see exactly which field is wrong.
 */

import { SI_BOUNDS, type SiBoundKey } from '../../../supabase/functions/_shared/si-guardrail';

export type ErrorSeverity = 'hard' | 'soft' | 'range';

export interface ErrorRow {
  code: string;
  severity: ErrorSeverity;
  /** Friendly label shown in the table column "Cause". */
  cause: { fr: string; en: string };
  /** Exact message shown to the user when this error fires. */
  userMessage: { fr: string; en: string };
  /** Concrete remediation instructions. */
  fix: { fr: string; en: string };
  /** Module that emits the code (for the "Source" column). */
  source: 'guardrail' | 'client' | 'engine';
}

/**
 * Hard rejections — block the calculation.
 * Order = priority surface from the edge function (sentinel → tree walk → bounds).
 */
const HARD_ROWS: ErrorRow[] = [
  {
    code: 'missing-units-sentinel',
    severity: 'hard',
    source: 'guardrail',
    cause: {
      fr: 'Le payload n\u2019inclut pas le marqueur `units: "SI"` requis à la racine.',
      en: 'Payload is missing the required `units: "SI"` sentinel at root.',
    },
    userMessage: {
      fr: 'Le calcul attend des unités SI. Veuillez relancer depuis l\u2019application — n\u2019appelez pas l\u2019API directement avec des unités d\u2019affichage.',
      en: 'The calculation expects SI units. Please retry from the app — do not call the API directly with display units.',
    },
    fix: {
      fr: 'Aucune action utilisateur : l\u2019app ajoute toujours `units: "SI"` automatiquement. Si l\u2019erreur persiste, rechargez la page.',
      en: 'No user action: the app always sets `units: "SI"` automatically. Reload the page if the error persists.',
    },
  },
  {
    code: 'display-unit-detected',
    severity: 'hard',
    source: 'guardrail',
    cause: {
      fr: 'Une clé du payload contient un suffixe d\u2019affichage interdit (fps, gr, yd, °F, inHg, mph, …).',
      en: 'A payload key contains a forbidden display-unit suffix (fps, gr, yd, °F, inHg, mph, …).',
    },
    userMessage: {
      fr: 'Unité d\u2019affichage détectée — convertissez en SI avant calcul.',
      en: 'Display unit detected — convert to SI before calculating.',
    },
    fix: {
      fr: 'Vérifiez vos préférences d\u2019affichage : la conversion doit se faire côté UI, jamais dans le payload moteur.',
      en: 'Check your display preferences: conversion must happen in the UI, never in the engine payload.',
    },
  },
  {
    code: 'out-of-si-range',
    severity: 'hard',
    source: 'guardrail',
    cause: {
      fr: 'Une valeur numérique tombe hors de la plage SI plausible (souvent : valeur saisie en unité d\u2019affichage interprétée comme SI).',
      en: 'A numeric value falls outside the plausible SI range (often: a value typed in display units interpreted as SI).',
    },
    userMessage: {
      fr: 'Valeur hors plage SI pour un champ — voir le détail par champ ci-dessous.',
      en: 'Value out of SI range for a field — see the per-field detail below.',
    },
    fix: {
      fr: 'Repérez le champ dans le tableau « Plages par champ » et corrigez la saisie.',
      en: 'Find the field in the "Per-field ranges" table and correct your input.',
    },
  },
  {
    code: 'invalid-input',
    severity: 'hard',
    source: 'guardrail',
    cause: {
      fr: 'Le payload échoue la validation Zod côté backend (champ requis manquant, type incorrect, NaN, Infinity, …).',
      en: 'The payload fails the backend Zod validation (missing required field, wrong type, NaN, Infinity, …).',
    },
    userMessage: {
      fr: 'Entrée invalide — un champ requis manque ou contient une valeur non numérique.',
      en: 'Invalid input — a required field is missing or contains a non-numeric value.',
    },
    fix: {
      fr: 'Vérifiez que la vitesse initiale, le BC, la masse et la distance de zéro sont renseignés et numériques.',
      en: 'Make sure muzzle velocity, BC, projectile weight and zero range are all set and numeric.',
    },
  },
  {
    code: 'bad-json',
    severity: 'hard',
    source: 'guardrail',
    cause: {
      fr: 'Le corps de la requête n\u2019est pas du JSON valide.',
      en: 'The request body is not valid JSON.',
    },
    userMessage: {
      fr: 'Requête mal formée — réessayez ou rechargez la page.',
      en: 'Malformed request — retry or reload the page.',
    },
    fix: {
      fr: 'Aucune action utilisateur : l\u2019app sérialise toujours en JSON. Signalez le bug si reproductible.',
      en: 'No user action: the app always serializes to JSON. Report the bug if reproducible.',
    },
  },
  {
    code: 'invalid-jwt',
    severity: 'hard',
    source: 'guardrail',
    cause: {
      fr: 'Le jeton de session est expiré, malformé ou révoqué.',
      en: 'The session token is expired, malformed, or revoked.',
    },
    userMessage: {
      fr: 'Session expirée — reconnectez-vous pour vérifier vos calculs côté serveur.',
      en: 'Session expired — sign in again to verify your calculations server-side.',
    },
    fix: {
      fr: 'Déconnectez-vous puis reconnectez-vous depuis Paramètres → Compte.',
      en: 'Sign out and sign in again from Settings → Account.',
    },
  },
];

/**
 * Soft failures — guardrail could not run, app falls back to local-only.
 * No remediation required from the user other than reconnecting if needed.
 */
const SOFT_ROWS: ErrorRow[] = [
  {
    code: 'no-supabase',
    severity: 'soft',
    source: 'client',
    cause: {
      fr: 'Lovable Cloud n\u2019est pas configuré sur ce build (mode local uniquement).',
      en: 'Lovable Cloud is not configured on this build (local-only mode).',
    },
    userMessage: {
      fr: 'Calcul effectué en local (badge « SI · local-only — non vérifié »).',
      en: 'Computed locally (badge "SI · local-only — unverified").',
    },
    fix: {
      fr: 'Aucune action requise. Le moteur balistique reste 100 % déterministe en local.',
      en: 'No action required. The ballistic engine stays 100% deterministic locally.',
    },
  },
  {
    code: 'no-auth',
    severity: 'soft',
    source: 'client',
    cause: {
      fr: 'Aucune session active — le garde-fou serveur exige un JWT.',
      en: 'No active session — the server guardrail requires a JWT.',
    },
    userMessage: {
      fr: 'Calcul local autorisé (non vérifié serveur). Connectez-vous pour activer la vérification.',
      en: 'Local calculation allowed (not server-verified). Sign in to enable verification.',
    },
    fix: {
      fr: 'Connectez-vous depuis l\u2019écran d\u2019accueil pour activer la vérification SI serveur.',
      en: 'Sign in from the welcome screen to enable server-side SI verification.',
    },
  },
  {
    code: 'network-error',
    severity: 'soft',
    source: 'client',
    cause: {
      fr: 'L\u2019edge function est injoignable (réseau, DNS, timeout).',
      en: 'The edge function is unreachable (network, DNS, timeout).',
    },
    userMessage: {
      fr: 'Vérification serveur indisponible — calcul local utilisé.',
      en: 'Server verification unavailable — local calculation used.',
    },
    fix: {
      fr: 'Réessayez quand votre connexion est rétablie. Le résultat local reste exact.',
      en: 'Retry once your connection is back. The local result stays accurate.',
    },
  },
  {
    code: 'server-misconfigured',
    severity: 'soft',
    source: 'guardrail',
    cause: {
      fr: 'L\u2019edge function démarre sans variables d\u2019environnement requises.',
      en: 'The edge function started without required environment variables.',
    },
    userMessage: {
      fr: 'Service de validation indisponible — calcul local utilisé.',
      en: 'Validation service unavailable — local calculation used.',
    },
    fix: {
      fr: 'À traiter par l\u2019admin (logs Supabase Functions).',
      en: 'To be handled by the admin (Supabase Functions logs).',
    },
  },
  {
    code: 'method-not-allowed',
    severity: 'soft',
    source: 'guardrail',
    cause: {
      fr: 'L\u2019edge function a reçu une méthode HTTP autre que POST.',
      en: 'The edge function received an HTTP method other than POST.',
    },
    userMessage: {
      fr: 'Erreur protocole — calcul local utilisé.',
      en: 'Protocol error — local calculation used.',
    },
    fix: {
      fr: 'Aucune action utilisateur. Signalez le bug si reproductible.',
      en: 'No user action. Report the bug if reproducible.',
    },
  },
];

/**
 * Per-field range rows. Generated from SI_BOUNDS so this stays in sync
 * automatically when bounds change. Each row is a sub-detail of
 * `out-of-si-range` and shares its severity (`range`).
 */
const FIELD_LABELS: Record<SiBoundKey, { fr: string; en: string }> = {
  muzzleVelocity:   { fr: 'Vitesse initiale',          en: 'Muzzle velocity' },
  bc:               { fr: 'Coefficient balistique (G1)', en: 'Ballistic coefficient (G1)' },
  projectileWeight: { fr: 'Masse du projectile',       en: 'Projectile weight' },
  sightHeight:      { fr: 'Hauteur d\u2019optique',    en: 'Sight height' },
  zeroRange:        { fr: 'Distance de zéro',          en: 'Zero range' },
  maxRange:         { fr: 'Portée maximale',           en: 'Max range' },
  rangeStep:        { fr: 'Pas de table',              en: 'Range step' },
  slopeAngle:       { fr: 'Angle de tir (pente)',      en: 'Slope angle' },
  latitude:         { fr: 'Latitude',                  en: 'Latitude' },
  shootingAzimuth:  { fr: 'Azimut de tir',             en: 'Shooting azimuth' },
  temperature:      { fr: 'Température',               en: 'Temperature' },
  humidity:         { fr: 'Humidité',                  en: 'Humidity' },
  pressure:         { fr: 'Pression',                  en: 'Pressure' },
  altitude:         { fr: 'Altitude',                  en: 'Altitude' },
  windSpeed:        { fr: 'Vitesse du vent',           en: 'Wind speed' },
  windAngle:        { fr: 'Angle du vent',             en: 'Wind angle' },
};

export interface RangeRow {
  field: SiBoundKey;
  label: { fr: string; en: string };
  min: number;
  max: number;
  unit: string;
  /** Reason this range is conservative — short hint for the user. */
  hint: { fr: string; en: string };
}

const RANGE_HINTS: Partial<Record<SiBoundKey, { fr: string; en: string }>> = {
  muzzleVelocity: {
    fr: 'Saisie en m/s. Une valeur ~900 vient probablement d\u2019une saisie en fps.',
    en: 'Entered as m/s. A value around 900 likely comes from a fps entry.',
  },
  projectileWeight: {
    fr: 'Saisie en grammes. ~16 vient probablement d\u2019une saisie en grains.',
    en: 'Entered in grams. ~16 likely comes from a grains entry.',
  },
  pressure: {
    fr: 'Saisie en hPa. ~30 vient probablement d\u2019une saisie en inHg.',
    en: 'Entered in hPa. ~30 likely comes from an inHg entry.',
  },
  temperature: {
    fr: 'Saisie en °C. ~70 vient probablement d\u2019une saisie en °F.',
    en: 'Entered in °C. ~70 likely comes from a °F entry.',
  },
  windSpeed: {
    fr: 'Saisie en m/s. ~25 vient probablement d\u2019une saisie en mph ou km/h.',
    en: 'Entered in m/s. ~25 likely comes from a mph or km/h entry.',
  },
  zeroRange: {
    fr: 'Saisie en mètres.',
    en: 'Entered in meters.',
  },
  sightHeight: {
    fr: 'Saisie en millimètres (axe canon → axe optique).',
    en: 'Entered in millimeters (bore axis → scope axis).',
  },
};

export const RANGE_ROWS: RangeRow[] = (Object.keys(SI_BOUNDS) as SiBoundKey[]).map((field) => ({
  field,
  label: FIELD_LABELS[field],
  min: SI_BOUNDS[field].min,
  max: SI_BOUNDS[field].max,
  unit: SI_BOUNDS[field].unit,
  hint:
    RANGE_HINTS[field] ??
    {
      fr: 'Plage SI plausible.',
      en: 'Plausible SI range.',
    },
}));

export const ERROR_ROWS: ErrorRow[] = [...HARD_ROWS, ...SOFT_ROWS];

/** Test helper — list every code declared by the contract. */
export const KNOWN_ERROR_CODES = ERROR_ROWS.map((r) => r.code);