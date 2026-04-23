/**
 * SVG reticle renderer — faithful to Strelok Pro coordinate system.
 * Coordinate mapping: x = cx + milX * ms, y = cy - milY * ms (Y inverted).
 * All patterns rendered in pure SVG, no canvas or bitmap.
 * Memoized: SVG elements only recompute when relevant parameters change.
 */
import React, { useMemo } from 'react';
import type { ReticleCatalogEntry } from '@/lib/reticles-catalog-repo';
import type { Reticle } from '@/lib/types';

interface Props {
  reticle: ReticleCatalogEntry | Reticle | { pattern_type: string; focal_plane?: string | null; click_units?: string | null; click_vertical?: number | null; illuminated?: boolean; true_magnification?: number | null; name?: string };
  size?: number;
  darkMode?: boolean;
  currentMagnification?: number;
  /** Performance mode: skip badges, labels, and fine ticks for faster rendering during drag/scroll */
  performanceMode?: boolean;
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
  return 'reticle_id' in r;
}

// Extract stable scalar values from the reticle prop for memoization
function extractReticleParams(reticle: Props['reticle']) {
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

const ReticleViewer = React.memo(function ReticleViewer({ reticle, size = 400, darkMode = true, currentMagnification, performanceMode = false }: Props) {
  const { pattern, fp, trueMag, clickUnits, clickVal, illum, name } = extractReticleParams(reticle);

  const { elements, badges } = useMemo(
    () => buildSvgElements(pattern, size, darkMode, fp, trueMag, currentMagnification, illum, clickVal, clickUnits, performanceMode),
    [pattern, size, darkMode, fp, trueMag, currentMagnification, illum, clickVal, clickUnits, performanceMode],
  );

  const bg = darkMode ? '#0a0a0a' : '#f5f5f5';

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      data-testid="reticle-viewer"
      data-pattern={pattern}
      role="img"
      aria-label={name}
    >
      <rect width={size} height={size} fill={bg} rx={2} />
      <circle cx={size / 2} cy={size / 2} r={size / 2 - 2} stroke={darkMode ? '#333' : '#ccc'} strokeWidth={1} fill="none" />
      {elements.map((el, i) => <React.Fragment key={i}>{el}</React.Fragment>)}
      {badges}
    </svg>
  );
});

export default ReticleViewer;