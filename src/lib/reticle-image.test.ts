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

function makeFile(content: string, type: string): File {
  return new File([content], 'reticle.bin', { type });
}

function makeOversizedFile(type: string): File {
  const file = new File(['x'], 'big.bin', { type });
  Object.defineProperty(file, 'size', {
    value: RETICLE_IMAGE_MAX_INPUT_BYTES + 1,
    configurable: true,
  });
  return file;
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
    const file = makeOversizedFile('image/png');
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
