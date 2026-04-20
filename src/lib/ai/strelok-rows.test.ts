/**
 * IA-1 — tests unitaires du service métier `strelok-rows`.
 *
 * Couverture :
 *   - validation Zod stricte du brouillon retourné par l'edge function ;
 *   - allow-list MIME et taille max ;
 *   - mapping `aiDraftRowsToUserRows` (zéro conversion d'unités) ;
 *   - `extractStrelokRowsFromScreenshot` lève `AIExtractionError` si
 *     Supabase n'est pas configuré.
 *
 * On NE teste PAS l'appel réseau lui-même : c'est l'Edge Function qui
 * porte cette responsabilité (et le contrat est figé par Zod).
 */
import { describe, expect, it, vi } from 'vitest';
import {
  AIExtractionError,
  aiDraftRowsToUserRows,
  aiDraftSchema,
  buildAINotes,
  extractStrelokRowsFromScreenshot,
  fileToBase64,
  isAllowedMime,
  type AIDraftRow,
} from './strelok-rows';

vi.mock('@/integrations/supabase/client', () => ({
  isSupabaseConfigured: () => false,
  supabase: null,
  getSupabaseUrl: () => '',
}));

describe('strelok-rows — schéma et helpers', () => {
  it('accepte un brouillon minimal valide', () => {
    const ok = aiDraftSchema.safeParse({
      rows: [{ range: 50, drop: -12.3, velocity: 240 }],
      fieldConfidence: { 'rows[0].range': 0.99 },
      unreadable: [],
      assumptions: [],
    });
    expect(ok.success).toBe(true);
  });

  it('refuse un brouillon avec un champ inattendu (strict)', () => {
    const bad = aiDraftSchema.safeParse({
      rows: [{ range: 50, foo: 1 }],
      fieldConfidence: {},
      unreadable: [],
      assumptions: [],
    });
    expect(bad.success).toBe(false);
  });

  it('refuse une range négative', () => {
    const bad = aiDraftSchema.safeParse({
      rows: [{ range: -10 }],
      fieldConfidence: {},
      unreadable: [],
      assumptions: [],
    });
    expect(bad.success).toBe(false);
  });

  it('isAllowedMime accepte PNG/JPEG/WEBP uniquement', () => {
    expect(isAllowedMime('image/png')).toBe(true);
    expect(isAllowedMime('image/jpeg')).toBe(true);
    expect(isAllowedMime('image/webp')).toBe(true);
    expect(isAllowedMime('image/gif')).toBe(false);
    expect(isAllowedMime('application/pdf')).toBe(false);
  });

  it('aiDraftRowsToUserRows ne convertit AUCUNE unité', () => {
    const rows: AIDraftRow[] = [
      { range: 30, drop: -5.5, velocity: 250, windDrift: 1.2, tof: 0.13, energy: 18 },
      { range: 50, drop: -12.1 },
    ];
    const out = aiDraftRowsToUserRows(rows);
    expect(out).toEqual(rows);
    // Ne doit PAS être la même référence (copie) :
    expect(out[0]).not.toBe(rows[0]);
  });

  it('buildAINotes contient runId, provider, model et fallback', () => {
    const notes = buildAINotes({
      runId: 'r-123',
      providerUsed: 'quatarly',
      modelUsed: 'claude-sonnet-4',
      fallbackUsed: false,
      promptVersion: 1,
    });
    expect(notes).toContain('r-123');
    expect(notes).toContain('quatarly');
    expect(notes).toContain('claude-sonnet-4');
    expect(notes).toContain('promptVersion: 1');
    expect(notes).toContain('fallbackUsed: no');
  });

  it('fileToBase64 encode correctement un petit File', async () => {
    const f = new File([new Uint8Array([1, 2, 3, 250])], 't.png', { type: 'image/png' });
    const b64 = await fileToBase64(f);
    expect(typeof b64).toBe('string');
    // Doit décoder à l'identique côté navigateur (atob).
    const decoded = atob(b64);
    expect(decoded.charCodeAt(3)).toBe(250);
  });
});

describe('strelok-rows — bouton désactivé sans Supabase', () => {
  it('lève AIExtractionError("no-supabase") si client non configuré', async () => {
    const f = new File([new Uint8Array([1])], 'x.png', { type: 'image/png' });
    await expect(extractStrelokRowsFromScreenshot(f)).rejects.toBeInstanceOf(AIExtractionError);
    await expect(extractStrelokRowsFromScreenshot(f)).rejects.toMatchObject({ code: 'no-supabase' });
  });
});