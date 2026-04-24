/**
 * SVG reticle renderer — faithful to Strelok Pro coordinate system.
 * Coordinate mapping: x = cx + milX * ms, y = cy - milY * ms (Y inverted).
 * All patterns rendered in pure SVG, no canvas or bitmap.
 * Memoized: SVG elements only recompute when relevant parameters change.
 * Cross-instance LRU cache: shares computed SVG across multiple viewers with same params.
 */
import React, { useMemo, useRef } from 'react';
import type { ReticleCatalogEntry } from '@/lib/reticles-catalog-repo';
import type { ChairgunElement, ChairgunReticle } from '@/lib/chairgun-reticles-repo';
import type { Reticle } from '@/lib/types';

interface Props {
  reticle: ReticleCatalogEntry | ChairgunReticle | Reticle | { pattern_type: string; focal_plane?: string | null; click_units?: string | null; click_vertical?: number | null; illuminated?: boolean; true_magnification?: number | null; name?: string };
  /**
   * MODE A — Géométrie ChairGun exacte. Si fourni et non vide, court-circuite
   * le rendu pattern générique (mode B).
   */
  elements?: ChairgunElement[];
  /**
   * Étendue angulaire visible de part et d'autre du centre (en unités du
   * réticule). Défaut : 10 (donc viewport ±10 unités).
   */
  viewportRange?: number;
  size?: number;
  darkMode?: boolean;
  currentMagnification?: number;
  /** Performance mode: skip badges, labels, and fine ticks for faster rendering during drag/scroll */
  performanceMode?: boolean;
  /**
   * Optional turret elevation adjustment (clicks already applied) in MOA.
   * Subtracted from the predicted drop angle before rendering the POI.
   */
  turretElevationMoa?: number;
  /** Optional turret windage adjustment in MOA (subtracted from drift). */
  turretWindageMoa?: number;
  /**
   * One-shot POI to render (ChairGun-style scope view). If provided,
   * renders a red dot at the predicted point of impact for the given
   * distance, applying SFP scaling and turret offsets.
   */
  showPoiAt?: { distanceM: number; dropMm: number; driftMm: number };
}

function getPatternType(r: Props['reticle']): string {
  if ('pattern_type' in r && r.pattern_type) return r.pattern_type;
  if ('type' in r) {
    const map: Record<string, string> = { 'mil-dot': 'mildot', 'moa-grid': 'moa', 'mrad-grid': 'mrad', duplex: 'duplex', bdc: 'bdc' };
    return map[(r as Reticle).type] ?? 'generic';
  }
  return 'generic';
}

function isCatalog(r: Props['reticle']): r is ReticleCatalogEntry {
  // ReticleCatalogEntry possède `pattern_type` ET `reticle_id`.
  // ChairgunReticle a `reticle_id` mais PAS `pattern_type`.
  return 'reticle_id' in r && 'pattern_type' in r;
}

interface ReticleParams {
  pattern: string;
  fp: string | null;
  trueMag: number | null;
  clickUnits: string | null;
  clickVal: number | null;
  illum: boolean;
  name: string;
}

// Extract scalar values from the reticle prop (pure, no hooks)
function extractReticleParams(reticle: Props['reticle']): ReticleParams {
  const pattern = getPatternType(reticle);
  const fp = isCatalog(reticle) ? reticle.focal_plane : ('focalPlane' in reticle ? (reticle as Reticle).focalPlane : null);
  const trueMag = isCatalog(reticle) ? reticle.true_magnification : null;
  const clickUnits = isCatalog(reticle) ? reticle.click_units : ('unit' in reticle ? (reticle as Reticle).unit : null);
  const clickVal = isCatalog(reticle) ? reticle.click_vertical : ('subtension' in reticle ? (reticle as Reticle).subtension : null);
  const illum = isCatalog(reticle) ? reticle.illuminated : false;
  const name = isCatalog(reticle) ? reticle.name : ('brand' in reticle ? `${(reticle as Reticle).brand} ${(reticle as Reticle).model}` : 'Reticle');
  return { pattern, fp, trueMag, clickUnits, clickVal, illum, name };
}

function buildSvgElements(
  pattern: string, size: number, darkMode: boolean,
  fp: string | null, trueMag: number | null, currentMagnification: number | undefined,
  illum: boolean, clickVal: number | null, clickUnits: string | null,
  performanceMode: boolean,
): { elements: React.ReactNode[]; badges: React.ReactNode[] } {
  const cx = size / 2;
  const cy = size / 2;
  const ms = size / 20;
  const color = darkMode ? '#00FF00' : '#1a1a1a';
  const thinW = 0.05 * ms;
  const thickW = 3;

  const scaleFactor = fp === 'SFP' && trueMag && currentMagnification ? currentMagnification / trueMag : 1;
  const sms = ms * scaleFactor;

  const L = (x1: number, y1: number, x2: number, y2: number, sw = thinW) => (
    <line x1={cx + x1 * ms} y1={cy - y1 * ms} x2={cx + x2 * ms} y2={cy - y2 * ms} stroke={color} strokeWidth={sw} />
  );
  const hTick = (milY: number, milX: number, w: number, sw = thinW) => (
    <line x1={cx + (milX - w / 2) * sms} y1={cy - milY * sms} x2={cx + (milX + w / 2) * sms} y2={cy - milY * sms} stroke={color} strokeWidth={sw} />
  );
  const vTick = (milX: number, milY: number, h: number, sw = thinW) => (
    <line x1={cx + milX * sms} y1={cy - (milY - h / 2) * sms} x2={cx + milX * sms} y2={cy - (milY + h / 2) * sms} stroke={color} strokeWidth={sw} />
  );
  const dot = (milX: number, milY: number, r: number) => (
    <circle cx={cx + milX * ms} cy={cy - milY * ms} r={r} fill={color} />
  );

  const elements: React.ReactNode[] = [];

  switch (pattern) {
    case 'bdc': {
      // SCB2 pattern — exact Strelok Kh() reference
      const lw = thinW;
      // Main cross with gaps
      elements.push(L(0, 10, 0, 1.25, lw), L(0, 1, 0, 0.75, lw));
      elements.push(L(0, 0.5, 0, -0.5, lw));
      elements.push(L(0, -0.75, 0, -1, lw), L(0, -1.25, 0, -12.5, lw));
      elements.push(L(-10, 0, -1.25, 0, lw), L(-1, 0, -0.75, 0, lw));
      elements.push(L(-0.5, 0, 0.5, 0, lw));
      elements.push(L(0.75, 0, 1, 0, lw), L(1.25, 0, 10, 0, lw));

      // BDC drop marks (i4: 2→20 step 1, distance = i4*0.5 MIL)
      const tickL = 0.4;
      for (let i4 = 2; i4 <= 20; i4++) {
        const d = i4 * 0.5;
        if (i4 % 2 === 0) {
          elements.push(hTick(-d, 0, tickL));
          if (!performanceMode) elements.push(
            <text key={`bdc-lbl-${i4}`} x={cx + tickL * sms} y={cy + d * sms + 3}
              fill={color} fontSize={Math.max(7, ms * 0.35)} textAnchor="start">{i4 / 2}</text>
          );
        } else {
          if (!performanceMode) elements.push(hTick(-d, 0, tickL * 0.5));
        }
      }

      // Windage ticks left/right
      for (let i = 2; i <= 10; i++) {
        const d = i * 0.5;
        if (performanceMode && i % 2 !== 0) continue;
        const tw = i % 2 === 0 ? 0.3 : 0.15;
        elements.push(vTick(-d, 0, tw), vTick(d, 0, tw));
      }

      // Triangles
      const tri = (px: number, py: number, bx1: number, by1: number, bx2: number, by2: number) => (
        <polygon points={`${cx + px * ms},${cy - py * ms} ${cx + bx1 * ms},${cy - by1 * ms} ${cx + bx2 * ms},${cy - by2 * ms}`}
          fill={color} opacity={0.6} />
      );
      elements.push(tri(0, -12.5, -0.75, -14, 0.75, -14)); // bottom
      elements.push(tri(0, 10, -0.75, 11.5, 0.75, 11.5));  // top
      elements.push(tri(10, 0, 11.5, 0.75, 11.5, -0.75));  // right
      elements.push(tri(-10, 0, -11.5, 0.75, -11.5, -0.75)); // left

      // Illuminated center circle
      if (illum) {
        elements.push(<circle cx={cx} cy={cy} r={1.5 * ms} fill="red" opacity={0.25} />);
      }
      break;
    }

    case 'mildot': {
      // Simple crosshair + dots at integer MIL positions
      elements.push(L(-10, 0, 10, 0), L(0, -10, 0, 10));
      for (let i = 1; i <= 5; i++) {
        const r = 0.15 * ms;
        elements.push(dot(i, 0, r), dot(-i, 0, r), dot(0, i, r), dot(0, -i, r));
      }
      break;
    }

    case 'duplex': {
      // Thick outer arms, thin inner
      elements.push(L(0, 10, 0, 3, thickW), L(0, -3, 0, -10, thickW));
      elements.push(L(-10, 0, -3, 0, thickW), L(3, 0, 10, 0, thickW));
      elements.push(L(0, 3, 0, 0.1, 0.5), L(0, -0.1, 0, -3, 0.5));
      elements.push(L(-3, 0, -0.1, 0, 0.5), L(0.1, 0, 3, 0, 0.5));
      break;
    }

    case 'german': {
      // German post: thin top/left/right, thick bottom post
      elements.push(L(0, 10, 0, 0.2, thinW), L(-10, 0, -0.2, 0, thinW), L(0.2, 0, 10, 0, thinW));
      elements.push(L(0, -0.2, 0, -10, thickW));
      break;
    }

    case 'moa': {
      const moaMil = 0.2909; // 1 MOA in MRAD
      elements.push(L(-10, 0, 10, 0), L(0, -10, 0, 10));
      for (let i = 1; i <= 30; i++) {
        const d = i * moaMil;
        if (d > 9.5) break;
        if (performanceMode && i % 5 !== 0) continue;
        const tw = i % 5 === 0 ? 0.4 : i % 2 === 0 ? 0.25 : 0.15;
        elements.push(hTick(d, 0, tw), hTick(-d, 0, tw));
        elements.push(vTick(d, 0, tw), vTick(-d, 0, tw));
        if (i % 5 === 0) {
          if (performanceMode) continue;
          const fs = Math.max(6, ms * 0.3);
          elements.push(
            <text key={`moa-h-${i}`} x={cx + (tw / 2 + 0.15) * sms} y={cy - d * sms + 3} fill={color} fontSize={fs}>{i}</text>
          );
        }
      }
      break;
    }

    case 'mrad': {
      elements.push(L(-10, 0, 10, 0), L(0, -10, 0, 10));
      for (let i = 1; i <= 9; i++) {
        const full = i;
        elements.push(hTick(full, 0, 0.35), hTick(-full, 0, 0.35));
        elements.push(vTick(full, 0, 0.35), vTick(-full, 0, 0.35));
        if (!performanceMode) {
          const half = i - 0.5;
          elements.push(hTick(half, 0, 0.18), hTick(-half, 0, 0.18));
          elements.push(vTick(half, 0, 0.18), vTick(-half, 0, 0.18));
        }
        if (i % 2 === 0) {
          if (performanceMode) continue;
          const fs = Math.max(6, ms * 0.3);
          elements.push(
            <text key={`mrad-h-${i}`} x={cx + 0.35 * sms} y={cy - full * sms + 3} fill={color} fontSize={fs}>{i}</text>
          );
        }
      }
      break;
    }

    case 'chevron': {
      elements.push(L(-10, 0, 10, 0), L(0, -10, 0, 10));
      // Chevron V below center
      elements.push(
        <polygon key="chevron-v"
          points={`${cx},${cy + 0.5 * ms} ${cx - 0.5 * ms},${cy + 1.5 * ms} ${cx + 0.5 * ms},${cy + 1.5 * ms}`}
          fill="none" stroke={color} strokeWidth={thinW * 1.5} />
      );
      break;
    }

    case 'dot': {
      elements.push(L(-10, 0, 10, 0), L(0, -10, 0, 10));
      elements.push(<circle cx={cx} cy={cy} r={0.1 * ms} fill={color} />);
      break;
    }

    default: {
      // Generic: simple cross + hash marks at 1 MIL
      elements.push(L(-10, 0, 10, 0), L(0, -10, 0, 10));
      for (let i = 1; i <= 9; i += (performanceMode ? 2 : 1)) {
        elements.push(hTick(i, 0, 0.2), hTick(-i, 0, 0.2));
        elements.push(vTick(i, 0, 0.2), vTick(-i, 0, 0.2));
      }
    }
  }

  const badges: React.ReactNode[] = [];
  if (!performanceMode) {
    const badgeFontSize = Math.max(7, size * 0.025);
    if (fp) {
      badges.push(
        <text key="fp-badge" x={4} y={badgeFontSize + 2} fill={color} fontSize={badgeFontSize} opacity={0.7}>{fp}</text>
      );
    }
    if (illum) {
      badges.push(
        <text key="illum-badge" x={size - 4} y={badgeFontSize + 2} fill="red" fontSize={badgeFontSize} textAnchor="end" opacity={0.8}>ILLUM</text>
      );
    }
    if (clickVal && clickUnits) {
      badges.push(
        <text key="click-badge" x={size - 4} y={size - 4} fill={color} fontSize={badgeFontSize} textAnchor="end" opacity={0.7}>
          {clickVal} {clickUnits}
        </text>
      );
    }
    if (fp === 'SFP' && trueMag) {
      badges.push(
        <text key="sfp-cal" x={cx} y={size - 4} fill={color} fontSize={badgeFontSize} textAnchor="middle" opacity={0.5}>
          @{trueMag}x
        </text>
      );
    }
  }

  return { elements, badges };
}

// ── Cross-instance LRU cache ──
const SVG_CACHE_MAX = 64;
type CacheEntry = { elements: React.ReactNode[]; badges: React.ReactNode[] };
const svgCache = new Map<string, CacheEntry>();
let _svgBuildCount = 0;

function makeCacheKey(
  pattern: string, size: number, darkMode: boolean,
  fp: string | null, trueMag: number | null, mag: number | undefined,
  illum: boolean, clickVal: number | null, clickUnits: string | null,
  performanceMode: boolean,
): string {
  return `${pattern}|${size}|${darkMode ? 1 : 0}|${fp ?? ''}|${trueMag ?? ''}|${mag ?? ''}|${illum ? 1 : 0}|${clickVal ?? ''}|${clickUnits ?? ''}|${performanceMode ? 1 : 0}`;
}

function cachedBuild(
  pattern: string, size: number, darkMode: boolean,
  fp: string | null, trueMag: number | null, mag: number | undefined,
  illum: boolean, clickVal: number | null, clickUnits: string | null,
  performanceMode: boolean,
): CacheEntry {
  const key = makeCacheKey(pattern, size, darkMode, fp, trueMag, mag, illum, clickVal, clickUnits, performanceMode);
  const cached = svgCache.get(key);
  if (cached) {
    // Move to end (most recently used)
    svgCache.delete(key);
    svgCache.set(key, cached);
    return cached;
  }
  const result = buildSvgElements(pattern, size, darkMode, fp, trueMag, mag, illum, clickVal, clickUnits, performanceMode);
  _svgBuildCount++;
  svgCache.set(key, result);
  // Evict oldest if over limit
  if (svgCache.size > SVG_CACHE_MAX) {
    const oldest = svgCache.keys().next().value;
    if (oldest !== undefined) svgCache.delete(oldest);
  }
  return result;
}

/** Exposed for testing — clears the cross-instance SVG cache */
export function clearSvgCache() { svgCache.clear(); }
/** Exposed for testing — returns current cache size */
export function svgCacheSize() { return svgCache.size; }
/** Exposed for testing/devtools — returns how many times SVG was actually rebuilt (cache misses) */
export function svgBuildCount() { return _svgBuildCount; }
/** Exposed for testing — resets build counter */
export function resetSvgBuildCount() { _svgBuildCount = 0; }

// ── MODE A — Géométrie ChairGun exacte ──
// Convention coordonnées : (0,0) = centre, +X droite, +Y bas (déjà
// convention image SVG, pas d'inversion Y comme en mode B).
function buildChairgunSvg(
  els: ChairgunElement[],
  size: number,
  darkMode: boolean,
  viewportRange: number,
): { svgEls: React.ReactNode[]; autoCrosshair: boolean } {
  const center = size / 2;
  const pixelsPerUnit = size / (2 * viewportRange);
  const lineWidth = Math.max(0.5, size * 0.003);
  const color = darkMode ? '#00FF00' : '#1a1a1a';

  const toPx = (ang: number) => center + ang * pixelsPerUnit;

  // Détecte si une ligne « longue » > 5 unités existe (proxy d'une croix).
  let hasLongLine = false;
  for (const e of els) {
    if (e.type !== 'line') continue;
    const x1 = e.x1 ?? 0, y1 = e.y1 ?? 0, x2 = e.x2 ?? 0, y2 = e.y2 ?? 0;
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len > 5) { hasLongLine = true; break; }
  }
  const autoCrosshair = !hasLongLine;

  const svgEls: React.ReactNode[] = [];

  if (autoCrosshair) {
    svgEls.push(
      <line key="auto-h"
        x1={toPx(-viewportRange)} y1={toPx(0)}
        x2={toPx(viewportRange)} y2={toPx(0)}
        stroke={color} strokeWidth={lineWidth} opacity={0.7}
        data-testid="cg-auto-crosshair-h" />,
      <line key="auto-v"
        x1={toPx(0)} y1={toPx(-viewportRange)}
        x2={toPx(0)} y2={toPx(viewportRange)}
        stroke={color} strokeWidth={lineWidth} opacity={0.7}
        data-testid="cg-auto-crosshair-v" />,
    );
  }

  els.forEach((e, idx) => {
    if (e.type === 'line') {
      const x1 = e.x1 ?? 0, y1 = e.y1 ?? 0, x2 = e.x2 ?? 0, y2 = e.y2 ?? 0;
      svgEls.push(
        <line key={`cg-line-${idx}`}
          x1={toPx(x1)} y1={toPx(y1)} x2={toPx(x2)} y2={toPx(y2)}
          stroke={color} strokeWidth={lineWidth} />,
      );
    } else {
      const x = e.x ?? 0, y = e.y ?? 0, r = e.radius ?? 0;
      if (r === 0) {
        svgEls.push(
          <circle key={`cg-tick-${idx}`}
            cx={toPx(x)} cy={toPx(y)} r={2}
            fill={color}
            data-cg-tick="1" />,
        );
      } else {
        svgEls.push(
          <circle key={`cg-circle-${idx}`}
            cx={toPx(x)} cy={toPx(y)} r={r * pixelsPerUnit}
            fill="none" stroke={color} strokeWidth={lineWidth}
            data-cg-circle="1" />,
        );
      }
    }
  });

  return { svgEls, autoCrosshair };
}

const ReticleViewer = React.memo(function ReticleViewer({
  reticle, size = 400, darkMode = true, currentMagnification,
  performanceMode = false, elements: chairgunElements, viewportRange = 10,
}: Props) {
  // Stabilise extracted params: only update the object ref when a scalar value actually changes
  const raw = extractReticleParams(reticle);
  const prevRef = useRef<ReticleParams>(raw);
  const params = useMemo(() => {
    const p = prevRef.current;
    if (
      p.pattern === raw.pattern && p.fp === raw.fp && p.trueMag === raw.trueMag &&
      p.clickUnits === raw.clickUnits && p.clickVal === raw.clickVal &&
      p.illum === raw.illum && p.name === raw.name
    ) return p;
    prevRef.current = raw;
    return raw;
  }, [raw.pattern, raw.fp, raw.trueMag, raw.clickUnits, raw.clickVal, raw.illum, raw.name]);

  const { pattern, fp, trueMag, clickUnits, clickVal, illum, name } = params;

  // MODE A actif si géométrie ChairGun fournie et non vide, sinon MODE B (fallback).
  const useChairgun = Array.isArray(chairgunElements) && chairgunElements.length > 0;

  const genericBuild = useMemo(
    () => useChairgun
      ? { elements: [] as React.ReactNode[], badges: [] as React.ReactNode[] }
      : cachedBuild(pattern, size, darkMode, fp, trueMag, currentMagnification, illum, clickVal, clickUnits, performanceMode),
    [useChairgun, pattern, size, darkMode, fp, trueMag, currentMagnification, illum, clickVal, clickUnits, performanceMode],
  );

  const chairgunBuild = useMemo(
    () => useChairgun
      ? buildChairgunSvg(chairgunElements!, size, darkMode, viewportRange)
      : null,
    [useChairgun, chairgunElements, size, darkMode, viewportRange],
  );

  const bg = darkMode ? '#0a0a0a' : '#f5f5f5';
  const badgeColor = darkMode ? '#00FF00' : '#1a1a1a';
  const cgBadgeFontSize = Math.max(7, size * 0.025);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      data-testid="reticle-viewer"
      data-pattern={useChairgun ? 'chairgun' : pattern}
      data-render-mode={useChairgun ? 'chairgun' : 'generic'}
      data-cg-auto-crosshair={useChairgun && chairgunBuild?.autoCrosshair ? '1' : undefined}
      role="img"
      aria-label={name}
    >
      <rect width={size} height={size} fill={bg} rx={2} />
      <circle cx={size / 2} cy={size / 2} r={size / 2 - 2} stroke={darkMode ? '#333' : '#ccc'} strokeWidth={1} fill="none" />
      {useChairgun
        ? chairgunBuild!.svgEls.map((el, i) => <React.Fragment key={i}>{el}</React.Fragment>)
        : genericBuild.elements.map((el, i) => <React.Fragment key={i}>{el}</React.Fragment>)
      }
      {!useChairgun && genericBuild.badges}
      {useChairgun && !performanceMode && (
        <>
          <text
            data-testid="cg-badge"
            x={size - 4} y={cgBadgeFontSize + 2}
            fill={badgeColor} fontSize={cgBadgeFontSize}
            textAnchor="end" opacity={0.85}
          >
            ChairGun · {chairgunElements!.length}
          </text>
        </>
      )}
    </svg>
  );
});

export default ReticleViewer;