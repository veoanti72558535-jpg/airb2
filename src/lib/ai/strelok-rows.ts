/**
 * Service métier IA-1 : extraction `rows[]` Strelok Pro depuis un screenshot.
 *
 * Pourquoi un wrapper et pas un appel direct depuis l'UI ?
 *  - Centralise la conversion File → base64 + détection MIME.
 *  - Centralise la validation Zod du draft côté client (défense en
 *    profondeur : la même validation tourne déjà côté Edge Function).
 *  - Centralise la traduction du brouillon IA → `UserReferenceRow[]` du
 *    schéma utilisateur existant. ZÉRO conversion d'unités ici.
 *  - Si Supabase n'est pas configuré, lève une erreur typée que l'UI
 *    présente comme « bouton désactivé ». Aucune dégradation silencieuse.
 */
import { z } from 'zod';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import type { UserReferenceRow } from '@/lib/cross-validation/user-case-schema';

export const STRELOK_AGENT_SLUG = 'cross-validation-strelok-rows';

export const aiRowSchema = z
  .object({
    range: z.number().finite().nonnegative(),
    drop: z.number().finite().optional(),
    velocity: z.number().finite().nonnegative().optional(),
    windDrift: z.number().finite().optional(),
    tof: z.number().finite().nonnegative().optional(),
    energy: z.number().finite().nonnegative().optional(),
  })
  .strict();

export const aiDraftSchema = z
  .object({
    rows: z.array(aiRowSchema).max(200),
    fieldConfidence: z.record(z.string(), z.number().min(0).max(1)),
    unreadable: z.array(z.string()).max(100),
    assumptions: z.array(z.string()).max(30),
  })
  .strict();

export type AIDraftRow = z.infer<typeof aiRowSchema>;
export type AIDraft = z.infer<typeof aiDraftSchema>;

export interface AIExtractionMeta {
  runId: string | null;
  providerUsed: string;
  modelUsed: string;
  fallbackUsed: boolean;
  promptVersion: number;
}

export interface AIExtractionResult {
  draft: AIDraft;
  meta: AIExtractionMeta;
}

export class AIExtractionError extends Error {
  code: string;
  status?: number;
  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = 'AIExtractionError';
    this.code = code;
    this.status = status;
  }
}

const ALLOWED_MIMES = ['image/png', 'image/jpeg', 'image/webp'] as const;
const DEFAULT_MAX_BYTES = 4 * 1024 * 1024; // 4 Mo (miroir du seed app_settings)

export async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  // btoa supporte au plus ~64k sur certains navigateurs si on passe une
  // chaîne énorme : on chunk pour rester safe.
  const bytes = new Uint8Array(buf);
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function isAllowedMime(mime: string): boolean {
  return (ALLOWED_MIMES as readonly string[]).includes(mime);
}

/**
 * Appelle l'Edge Function `ai-extract-rows`. La requête PORTE le JWT du
 * user (auth Supabase) — la fonction refusera tout ce qui n'est pas
 * `admin`.
 */
export async function extractStrelokRowsFromScreenshot(
  file: File,
  opts: { maxBytes?: number } = {},
): Promise<AIExtractionResult> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new AIExtractionError(
      'no-supabase',
      'Supabase self-hosted is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing).',
    );
  }

  const max = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  if (file.size > max) {
    throw new AIExtractionError(
      'image-too-large',
      `Image too large (${file.size} bytes > ${max}).`,
    );
  }
  const mime = file.type || 'image/png';
  if (!isAllowedMime(mime)) {
    throw new AIExtractionError(
      'invalid-mime',
      `MIME type "${mime}" not supported. Use PNG, JPEG or WEBP.`,
    );
  }

  const imageBase64 = await fileToBase64(file);

  const { data, error } = await supabase.functions.invoke('ai-extract-rows', {
    body: { imageBase64, imageMime: mime },
  });

  if (error) {
    throw new AIExtractionError(
      'invoke-failed',
      error.message ?? 'Edge function invocation failed',
    );
  }
  if (!data || typeof data !== 'object') {
    throw new AIExtractionError('empty-response', 'Empty response from edge function');
  }

  const responseSchema = z.object({
    runId: z.string().nullable().optional(),
    providerUsed: z.string(),
    modelUsed: z.string(),
    fallbackUsed: z.boolean(),
    promptVersion: z.number().int().nonnegative(),
    draft: aiDraftSchema,
  });
  const parsed = responseSchema.safeParse(data);
  if (!parsed.success) {
    throw new AIExtractionError(
      'invalid-response',
      `Edge function response failed schema validation: ${parsed.error.message}`,
    );
  }

  return {
    draft: parsed.data.draft,
    meta: {
      runId: parsed.data.runId ?? null,
      providerUsed: parsed.data.providerUsed,
      modelUsed: parsed.data.modelUsed,
      fallbackUsed: parsed.data.fallbackUsed,
      promptVersion: parsed.data.promptVersion,
    },
  };
}

/**
 * Convertit un brouillon IA (potentiellement édité par l'opérateur) en
 * `UserReferenceRow[]` consommable par le schéma utilisateur existant.
 * AUCUNE conversion d'unités, AUCUNE invention.
 */
export function aiDraftRowsToUserRows(rows: AIDraftRow[]): UserReferenceRow[] {
  return rows.map((r) => ({
    range: r.range,
    drop: r.drop,
    velocity: r.velocity,
    windDrift: r.windDrift,
    tof: r.tof,
    energy: r.energy,
  }));
}

/**
 * Construit le bloc `meta.notes` à figer sur la référence Strelok Pro
 * créée à partir d'un screenshot IA. Documente le run, le provider, le
 * modèle et le brouillon initial — pour traçabilité future.
 */
export function buildAINotes(meta: AIExtractionMeta, extra?: string): string {
  const lines = [
    '— Source : screenshot Strelok Pro (brouillon IA-1, relu manuellement)',
    `— runId: ${meta.runId ?? 'n/a'}`,
    `— provider: ${meta.providerUsed}`,
    `— model: ${meta.modelUsed}`,
    `— promptVersion: ${meta.promptVersion}`,
    `— fallbackUsed: ${meta.fallbackUsed ? 'yes' : 'no'}`,
  ];
  if (extra && extra.trim()) {
    lines.push('—', extra.trim());
  }
  return lines.join('\n');
}