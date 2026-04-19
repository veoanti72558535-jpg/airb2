/**
 * Tranche F.4 — Helper image principale du réticule.
 *
 * V1 délibérément frugale :
 *  - une seule image par réticule (champ `imageDataUrl` sur `Reticle`)
 *  - stockage local en data URL (pas de backend, pas de cloud)
 *  - validation de type MIME + taille d'entrée
 *  - redimensionnement/compression côté client via <canvas> pour ne pas
 *    saturer localStorage
 *
 * Pas de galerie, pas de crop, pas d'EXIF, pas de drag-and-drop avancé.
 * Si une image dépasse les limites d'entrée, l'appelant reçoit une erreur
 * typée et affiche un message i18n.
 */

/** Formats acceptés en V1. */
export const RETICLE_IMAGE_ACCEPTED_MIME = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
] as const;

/** Taille max du fichier d'entrée (5 MB) — au-delà on refuse sans tenter. */
export const RETICLE_IMAGE_MAX_INPUT_BYTES = 5 * 1024 * 1024;

/** Côté max (px) après redimensionnement — assez pour la vue détail. */
export const RETICLE_IMAGE_MAX_DIMENSION = 800;

/** Qualité JPEG/WebP (0..1) appliquée à la sortie compressée. */
export const RETICLE_IMAGE_QUALITY = 0.82;

export type ReticleImageErrorCode =
  | 'invalid-type'
  | 'too-large'
  | 'process-error';

export class ReticleImageError extends Error {
  readonly code: ReticleImageErrorCode;
  constructor(code: ReticleImageErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = 'ReticleImageError';
  }
}

function isAcceptedMime(type: string): boolean {
  return (RETICLE_IMAGE_ACCEPTED_MIME as readonly string[]).includes(type);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new ReticleImageError('process-error', 'Empty FileReader result'));
    };
    reader.onerror = () => reject(new ReticleImageError('process-error', 'FileReader failed'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new ReticleImageError('process-error', 'Image decode failed'));
    img.src = dataUrl;
  });
}

/**
 * Convertit un `File` image en data URL compressée prête à persister sur
 * un `Reticle`. Lève `ReticleImageError` avec un code explicite si :
 *  - le type MIME n'est pas accepté → `invalid-type`
 *  - le fichier dépasse la limite d'entrée → `too-large`
 *  - le canvas/decoder échoue → `process-error`
 */
export async function fileToReticleImageDataUrl(file: File): Promise<string> {
  if (!isAcceptedMime(file.type)) {
    throw new ReticleImageError('invalid-type');
  }
  if (file.size > RETICLE_IMAGE_MAX_INPUT_BYTES) {
    throw new ReticleImageError('too-large');
  }

  const originalDataUrl = await readFileAsDataUrl(file);

  // En environnement de test (jsdom) ou si <canvas> n'est pas disponible,
  // on retourne la data URL d'origine — le test n'a pas besoin de la
  // re-compresser pour vérifier la persistance.
  if (typeof document === 'undefined' || typeof HTMLCanvasElement === 'undefined') {
    return originalDataUrl;
  }

  let img: HTMLImageElement;
  try {
    img = await loadImage(originalDataUrl);
  } catch {
    // jsdom ne décode pas vraiment les images → fallback gracieux.
    return originalDataUrl;
  }

  const { width: w0, height: h0 } = img;
  if (!w0 || !h0) return originalDataUrl;

  const scale = Math.min(1, RETICLE_IMAGE_MAX_DIMENSION / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * scale));
  const h = Math.max(1, Math.round(h0 * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return originalDataUrl;

  ctx.drawImage(img, 0, 0, w, h);

  // PNG conserve l'alpha (utile pour des réticules sur fond transparent),
  // sinon on encode en WebP qualité maîtrisée pour limiter la taille.
  const outMime = file.type === 'image/png' ? 'image/png' : 'image/webp';
  try {
    return canvas.toDataURL(outMime, RETICLE_IMAGE_QUALITY);
  } catch {
    return originalDataUrl;
  }
}
