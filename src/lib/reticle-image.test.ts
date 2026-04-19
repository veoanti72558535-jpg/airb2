/**
 * Tranche F.4 — Tests du helper `reticle-image`.
 *
 * jsdom ne décode pas réellement les images via `new Image()`, donc on
 * vérifie surtout la validation MIME / taille et le fallback gracieux
 * (renvoi de la data URL d'origine quand le canvas n'aboutit pas).
 */
import { describe, it, expect } from 'vitest';
import {
  fileToReticleImageDataUrl,
  ReticleImageError,
  RETICLE_IMAGE_MAX_INPUT_BYTES,
} from './reticle-image';

function makeFile(content: string, type: string, size?: number): File {
  const blob = new Blob([content], { type });
  // Override size when needed for the "too-large" test.
  if (size !== undefined) {
    Object.defineProperty(blob, 'size', { value: size });
  }
  return new File([blob], 'reticle.bin', { type });
}

describe('reticle-image', () => {
  it('rejects unsupported MIME types', async () => {
    const file = makeFile('xx', 'application/pdf');
    await expect(fileToReticleImageDataUrl(file)).rejects.toBeInstanceOf(ReticleImageError);
    try {
      await fileToReticleImageDataUrl(file);
    } catch (e) {
      expect((e as ReticleImageError).code).toBe('invalid-type');
    }
  });

  it('rejects files larger than the input limit', async () => {
    const file = makeFile('x', 'image/png', RETICLE_IMAGE_MAX_INPUT_BYTES + 1);
    try {
      await fileToReticleImageDataUrl(file);
      throw new Error('should have rejected');
    } catch (e) {
      expect(e).toBeInstanceOf(ReticleImageError);
      expect((e as ReticleImageError).code).toBe('too-large');
    }
  });

  it('produces a data: URL for an accepted PNG (fallback under jsdom)', async () => {
    const file = makeFile('fake-png-bytes', 'image/png');
    const out = await fileToReticleImageDataUrl(file);
    expect(out.startsWith('data:')).toBe(true);
  });

  it('accepts JPEG and WebP inputs', async () => {
    const j = await fileToReticleImageDataUrl(makeFile('j', 'image/jpeg'));
    const w = await fileToReticleImageDataUrl(makeFile('w', 'image/webp'));
    expect(j.startsWith('data:')).toBe(true);
    expect(w.startsWith('data:')).toBe(true);
  });
});
