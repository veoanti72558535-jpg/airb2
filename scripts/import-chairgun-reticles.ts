/**
 * Import idempotent du catalogue ChairGun Elite (~1944 réticules) dans
 * `public.chairgun_reticles_catalog` via la `service_role` key Supabase.
 *
 * Pourquoi ce script vit hors de l'app :
 *  - Opération one-shot administrateur (pas une feature utilisateur).
 *  - Évite d'embarquer ~50 MB de JSON dans le bundle frontend.
 *  - Évite d'ouvrir Postgres au monde extérieur (PostgREST + service_role).
 *
 * Usage :
 *   export SUPABASE_URL="https://supabase.votre-domaine"
 *   export SUPABASE_SERVICE_ROLE_KEY="eyJ..."
 *   bun run scripts/import-chairgun-reticles.ts ./chairgun_final_supabase_import.json
 *   bun run scripts/import-chairgun-reticles.ts ./chairgun_final_supabase_import.json --dry-run
 *
 * Idempotence : `upsert(onConflict:'reticle_id')` — relancer le script ne
 * crée pas de doublons, met à jour les champs si la source a changé.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// ── Schéma source ───────────────────────────────────────────────────────────
// On reste tolérant sur `elements` (array opaque) car la géométrie ChairGun
// est validée côté lecteur (`ChairGunScopeView`) — ici on persiste tel quel.
const RowSchema = z.object({
  reticle_id: z.number().int().positive(),
  name: z.string().min(1),
  vendor: z.string().optional().nullable(),
  focal_plane: z.enum(['FFP', 'SFP']).optional().nullable(),
  unit: z.enum(['MRAD', 'MIL', 'MOA', 'CM/100M']).optional().nullable(),
  true_magnification: z.number().optional().nullable(),
  elements: z.array(z.unknown()),
});

type Row = z.infer<typeof RowSchema>;

// Champs énumérés où une chaîne vide doit être traitée comme "non renseigné"
// (ChairGun publie certains réticules sans plan focal documenté — donnée
// légitimement absente, pas corrompue). La colonne SQL est nullable et le
// CHECK (focal_plane IN ('FFP','SFP')) accepte NULL.
const ENUM_FIELDS = ['focal_plane', 'unit'] as const;

function normalizeRow(raw: unknown): { value: unknown; normalizedFields: string[] } {
  if (!raw || typeof raw !== 'object') return { value: raw, normalizedFields: [] };
  const obj = { ...(raw as Record<string, unknown>) };
  const normalizedFields: string[] = [];
  for (const key of ENUM_FIELDS) {
    const v = obj[key];
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && v.trim() === '') {
      obj[key] = null;
      normalizedFields.push(key);
    }
  }
  return { value: obj, normalizedFields };
}

const CHUNK_SIZE = 200; // Garde les payloads PostgREST sous ~5 MB.
const TABLE = 'chairgun_reticles_catalog';

// ── Bootstrap ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const filePath = resolve(args.find((a) => !a.startsWith('--')) ?? '/tmp/chairgun_final_supabase_import.json');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('✖ Env requises: SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY');
  console.error('  (la service_role key se trouve dans Supabase Studio → Settings → API)');
  process.exit(2);
}

if (!existsSync(filePath)) {
  console.error(`✖ Fichier introuvable: ${filePath}`);
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Parsing ─────────────────────────────────────────────────────────────────
console.log(`▸ Lecture ${filePath}…`);
const t0 = Date.now();
let rawJson: unknown;
try {
  rawJson = JSON.parse(readFileSync(filePath, 'utf8'));
} catch (e) {
  console.error('✖ JSON.parse a échoué:', e instanceof Error ? e.message : String(e));
  process.exit(2);
}

if (!Array.isArray(rawJson)) {
  console.error('✖ Le JSON racine doit être un array.');
  process.exit(2);
}

const valid: Row[] = [];
const skipped: Array<{ index: number; error: string }> = [];
let normalizedCount = 0;
const normalizedByField: Record<string, number> = {};
for (let i = 0; i < rawJson.length; i++) {
  const { value, normalizedFields } = normalizeRow(rawJson[i]);
  if (normalizedFields.length > 0) {
    normalizedCount++;
    for (const f of normalizedFields) normalizedByField[f] = (normalizedByField[f] ?? 0) + 1;
  }
  const parsed = RowSchema.safeParse(value);
  if (parsed.success) valid.push(parsed.data);
  else skipped.push({ index: i, error: parsed.error.issues.map((x) => `${x.path.join('.')}: ${x.message}`).join('; ') });
}

const normalizedSummary = Object.entries(normalizedByField)
  .map(([k, v]) => `${k}=${v}`)
  .join(', ');
console.log(
  `▸ Items lus: ${rawJson.length} — valides: ${valid.length} — normalisés: ${normalizedCount}` +
    (normalizedSummary ? ` (${normalizedSummary} → null)` : '') +
    ` — skippés: ${skipped.length}`,
);
if (skipped.length > 0) {
  console.warn('  Premiers skips:');
  skipped.slice(0, 5).forEach((s) => console.warn(`   #${s.index}: ${s.error}`));
}

if (dryRun) {
  console.log(`✓ Dry-run: aucune écriture. ${valid.length} lignes prêtes en ${Date.now() - t0} ms.`);
  process.exit(skipped.length > 0 ? 1 : 0);
}

// ── Comptage avant ──────────────────────────────────────────────────────────
const before = await supabase.from(TABLE).select('*', { count: 'exact', head: true });
if (before.error) {
  console.error(`✖ Comptage initial impossible — la table existe-t-elle ? ${before.error.message}`);
  process.exit(3);
}
console.log(`▸ Lignes en base avant: ${before.count ?? 0}`);

// ── Upsert par chunks ───────────────────────────────────────────────────────
let okCount = 0;
let failCount = 0;
const failedChunks: Array<{ from: number; to: number; message: string }> = [];

for (let i = 0; i < valid.length; i += CHUNK_SIZE) {
  const chunk = valid.slice(i, i + CHUNK_SIZE);
  const { error } = await supabase
    .from(TABLE)
    .upsert(chunk, { onConflict: 'reticle_id' });
  if (error) {
    failCount += chunk.length;
    failedChunks.push({ from: i, to: i + chunk.length, message: error.message });
    process.stdout.write('x');
  } else {
    okCount += chunk.length;
    process.stdout.write('.');
  }
}
process.stdout.write('\n');

// ── Comptage après + récap ──────────────────────────────────────────────────
const after = await supabase.from(TABLE).select('*', { count: 'exact', head: true });
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

console.log(`\n──── Résumé ────`);
console.log(`  ok        : ${okCount}`);
console.log(`  failed    : ${failCount}`);
console.log(`  skipped   : ${skipped.length}`);
console.log(`  base avant: ${before.count ?? 0}`);
console.log(`  base après: ${after.count ?? '?'}`);
console.log(`  temps     : ${elapsed}s`);

if (failedChunks.length > 0) {
  console.error(`\n✖ ${failedChunks.length} chunk(s) en échec:`);
  failedChunks.slice(0, 10).forEach((c) => console.error(`   [${c.from}..${c.to}] ${c.message}`));
  process.exit(1);
}

console.log(`\n✓ Import terminé.`);
process.exit(skipped.length > 0 ? 1 : 0);