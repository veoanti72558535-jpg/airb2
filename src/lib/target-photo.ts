/**
 * Photo preparation + AI response parsing for the target-photo-analyzer agent.
 *
 * - prepareTargetPhoto : resize a File to ≤1920px, encode as JPEG base64.
 * - parseTargetAnalysis : parse the JSON returned by the agent (defensive).
 *
 * The image is NEVER persisted server-side; only the JSON analysis result
 * is stored (via field_measurements) when the user explicitly asks for it.
 */

export interface PreparedPhoto {
  base64: string;
  mime: 'image/jpeg';
  widthPx: number;
  heightPx: number;
  sizeKb: number;
}

const MAX_SIDE_PX = 1920;
const JPEG_QUALITY = 0.85;

/**
 * Resize and encode an image File as JPEG base64 (no data: prefix).
 * Throws if the file cannot be decoded as an image.
 */
export async function prepareTargetPhoto(file: File): Promise<PreparedPhoto> {
  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);

  const { width, height } = scaleToMax(img.naturalWidth, img.naturalHeight, MAX_SIDE_PX);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(img, 0, 0, width, height);

  const jpegDataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  // strip "data:image/jpeg;base64,"
  const base64 = jpegDataUrl.replace(/^data:image\/jpeg;base64,/, '');
  // base64 length * 3/4 ≈ binary bytes
  const sizeKb = Math.round((base64.length * 3) / 4 / 1024);

  return {
    base64,
    mime: 'image/jpeg',
    widthPx: width,
    heightPx: height,
    sizeKb,
  };
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image decode failed'));
    img.src = src;
  });
}

/**
 * Compute target dimensions so that the longest side equals at most `maxSide`,
 * preserving aspect ratio. Returns the original size when already small enough.
 */
export function scaleToMax(
  w: number,
  h: number,
  maxSide: number,
): { width: number; height: number } {
  const longest = Math.max(w, h);
  if (longest <= maxSide) return { width: w, height: h };
  const ratio = maxSide / longest;
  return {
    width: Math.round(w * ratio),
    height: Math.round(h * ratio),
  };
}

/* ------------------------------------------------------------------ */
/*  Parsing                                                           */
/* ------------------------------------------------------------------ */

export interface TargetAnalysisResult {
  groupSizeMm: number;
  groupSizeMoa: number;
  groupSizeMrad: number;
  centerOffsetXmm: number;
  centerOffsetYmm: number;
  correctionMoa: { horizontal: number; vertical: number };
  correctionMrad: { horizontal: number; vertical: number };
  shotCount: number | null;
  confidence: number;
  notes: string;
  warnings: string[];
}

/** Strip ```json fences if the model wrapped its output. */
function stripCodeFences(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) return fenced[1].trim();
  return text.trim();
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function pair(v: unknown): { horizontal: number; vertical: number } {
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return { horizontal: num(o.horizontal), vertical: num(o.vertical) };
  }
  return { horizontal: 0, vertical: 0 };
}

/**
 * Parse the JSON output of the agent. Returns null if the input cannot be
 * coerced into the expected shape. Tolerates code fences and missing fields.
 */
export function parseTargetAnalysis(text: string): TargetAnalysisResult | null {
  if (!text || typeof text !== 'string') return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(text));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const o = parsed as Record<string, unknown>;

  // Minimum viable shape: must have a numeric groupSizeMm or confidence.
  if (
    typeof o.groupSizeMm !== 'number' &&
    typeof o.groupSizeMm !== 'string' &&
    typeof o.confidence !== 'number'
  ) {
    return null;
  }

  const warningsRaw = Array.isArray(o.warnings) ? o.warnings : [];
  const warnings = warningsRaw
    .map(w => (typeof w === 'string' ? w : null))
    .filter((w): w is string => !!w);

  const shotCountRaw = o.shotCount;
  const shotCount =
    shotCountRaw == null
      ? null
      : typeof shotCountRaw === 'number' && Number.isFinite(shotCountRaw)
        ? shotCountRaw
        : null;

  return {
    groupSizeMm: num(o.groupSizeMm),
    groupSizeMoa: num(o.groupSizeMoa),
    groupSizeMrad: num(o.groupSizeMrad),
    centerOffsetXmm: num(o.centerOffsetXmm),
    centerOffsetYmm: num(o.centerOffsetYmm),
    correctionMoa: pair(o.correctionMoa),
    correctionMrad: pair(o.correctionMrad),
    shotCount,
    confidence: Math.max(0, Math.min(1, num(o.confidence))),
    notes: typeof o.notes === 'string' ? o.notes : '',
    warnings,
  };
}
