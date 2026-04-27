/**
 * ChairGunScopeView — pixel-perfect ChairGun Elite scope viewer.
 *
 * Canvas-based renderer reproducing the exact visual style of ChairGun
 * Android: dark background (#050505), metallic tube vignette, white
 * reticle lines, red (#ff4444) range labels, target silhouette, and
 * HUD overlays (velocity, energy, drop, wind, TOF).
 *
 * Architecture:
 *   - Uses HTML5 Canvas for rendering (not SVG) to match ChairGun's
 *     native rendering pipeline and allow gradient/vignette effects.
 *   - Takes ballistic trajectory data from the engine and renders
 *     the reticle + POI + target at the computed holdover position.
 *   - Supports FFP/SFP scaling, magnification slider, and target
 *     type selection.
 */
import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import type { ChairgunElement, ChairgunReticle } from '@/lib/chairgun-reticles-repo';
import type { BallisticResult } from '@/lib/types';

// ── Target definitions ──────────────────────────────────────────────
export interface TargetDef {
  id: string;
  label: string;
  /** Kill zone diameter in cm */
  sizeCm: number;
  /** Render shape */
  shape: 'circle' | 'rect';
  /** Aspect ratio for rect targets (width/height) */
  aspect?: number;
  /** Fill color (RGBA string) */
  fill: string;
  /** Stroke color */
  stroke: string;
}

export const TARGETS: TargetDef[] = [
  { id: 'circle-25mm', label: 'Circle 25mm', sizeCm: 2.5, shape: 'circle', fill: 'rgba(255,255,0,0.15)', stroke: '#ffcc00' },
  { id: 'rabbit-kz', label: 'Rabbit Kill Zone', sizeCm: 3.5, shape: 'circle', fill: 'rgba(255,165,0,0.15)', stroke: '#ff8c00' },
  { id: 'pigeon', label: 'Pigeon', sizeCm: 8, shape: 'rect', aspect: 0.6, fill: 'rgba(100,180,255,0.12)', stroke: '#64b5f6' },
  { id: 'rat', label: 'Rat', sizeCm: 5, shape: 'rect', aspect: 1.8, fill: 'rgba(255,200,100,0.12)', stroke: '#ffb74d' },
  { id: 'fts-40', label: 'FT Target 40mm', sizeCm: 4.0, shape: 'circle', fill: 'rgba(255,60,60,0.12)', stroke: '#ef5350' },
  { id: 'fts-15', label: 'FT Target 15mm', sizeCm: 1.5, shape: 'circle', fill: 'rgba(255,60,60,0.12)', stroke: '#ef5350' },
];

// ── Props ───────────────────────────────────────────────────────────
export interface ChairGunScopeViewProps {
  /** Canvas pixel size (square). Default 600. */
  size?: number;
  /** Reticle geometry from chairgun reticles repo. */
  reticle?: ChairgunReticle;
  /** Geometric elements to render (lines, dots). */
  elements?: ChairgunElement[];
  /** Current magnification. */
  magnification?: number;
  /** Ballistic results from engine. */
  trajectory?: BallisticResult[];
  /** Target distance in meters. */
  targetRange?: number;
  /** Target definition. */
  target?: TargetDef;
  /** Zero range in meters (for HUD display). */
  zeroRange?: number;
  /** Muzzle velocity (for HUD display). */
  muzzleVelocity?: number;
  /** Wind speed m/s (for HUD display). */
  windSpeed?: number;
  /** Wind angle degrees (for HUD display). */
  windAngle?: number;
}

// ── Helper: interpolate trajectory to exact range ───────────────────
function interpolateAtRange(traj: BallisticResult[], range: number): BallisticResult | null {
  if (!traj || traj.length === 0) return null;
  if (range <= 0) return traj[0];

  for (let i = 0; i < traj.length - 1; i++) {
    if (traj[i].range <= range && traj[i + 1].range >= range) {
      const span = traj[i + 1].range - traj[i].range;
      if (span <= 0) return traj[i];
      const t = (range - traj[i].range) / span;
      return {
        ...traj[i],
        range,
        drop: traj[i].drop + t * (traj[i + 1].drop - traj[i].drop),
        velocity: traj[i].velocity + t * (traj[i + 1].velocity - traj[i].velocity),
        energy: traj[i].energy + t * (traj[i + 1].energy - traj[i].energy),
        tof: traj[i].tof + t * (traj[i + 1].tof - traj[i].tof),
        windDrift: traj[i].windDrift + t * (traj[i + 1].windDrift - traj[i].windDrift),
        holdover: traj[i].holdover + t * (traj[i + 1].holdover - traj[i].holdover),
        holdoverMRAD: traj[i].holdoverMRAD + t * (traj[i + 1].holdoverMRAD - traj[i].holdoverMRAD),
      };
    }
  }
  // Beyond trajectory
  return traj[traj.length - 1];
}

// ── Main Component ──────────────────────────────────────────────────
const ChairGunScopeView: React.FC<ChairGunScopeViewProps> = ({
  size = 600,
  reticle,
  elements,
  magnification = 10,
  trajectory,
  targetRange = 30,
  target = TARGETS[0],
  zeroRange = 30,
  muzzleVelocity = 280,
  windSpeed = 0,
  windAngle = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const atRange = useMemo(
    () => trajectory ? interpolateAtRange(trajectory, targetRange) : null,
    [trajectory, targetRange],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = size;
    const h = size;
    const cx = w / 2;
    const cy = h / 2;
    const radius = w / 2 - 6;

    // ── 1. Background ─────────────────────────────────────────────
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    // Scope tube — dark circle with metallic ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#050505';
    ctx.fill();

    // Metallic tube ring (gradient)
    const ringGrad = ctx.createRadialGradient(cx, cy, radius - 8, cx, cy, radius + 2);
    ringGrad.addColorStop(0, '#333');
    ringGrad.addColorStop(0.5, '#555');
    ringGrad.addColorStop(0.7, '#444');
    ringGrad.addColorStop(1, '#1a1a1a');
    ctx.lineWidth = 10;
    ctx.strokeStyle = ringGrad;
    ctx.stroke();

    // Vignette gradient (edges darker)
    const vignetteGrad = ctx.createRadialGradient(cx, cy, radius * 0.6, cx, cy, radius);
    vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vignetteGrad.addColorStop(0.85, 'rgba(0,0,0,0)');
    vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = vignetteGrad;
    ctx.fill();

    // Clip to scope circle
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 5, 0, Math.PI * 2);
    ctx.clip();

    // ── 2. Calculate FOV and scaling ──────────────────────────────
    // Viewport: ±15 MIL at reference magnification (10x).
    // Higher magnification = smaller FOV = larger objects.
    const fovMil = 15 * (10 / magnification);
    const pixelsPerMil = radius / fovMil;

    // ── 3. Target rendering ───────────────────────────────────────
    if (atRange && target) {
      // Target physical size → angular size → pixel size
      const targetAngularMil = (target.sizeCm / 100 / targetRange) * 1000; // MIL
      const targetPx = targetAngularMil * pixelsPerMil;

      // POI offset from center: holdoverMRAD in MIL (1 MRAD ≈ 1 MIL)
      const holdoverMil = atRange.holdoverMRAD;
      const windMil = atRange.windDriftMRAD ?? 0;

      // Target position: holdover is negative below center, positive above
      // In scope view: negative holdover (drop) = target appears BELOW center
      const targetX = cx + windMil * pixelsPerMil;
      const targetY = cy + holdoverMil * pixelsPerMil; // holdover positive = above line of sight

      ctx.save();
      ctx.globalAlpha = 0.9;

      if (target.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(targetX, targetY, Math.max(targetPx / 2, 2), 0, Math.PI * 2);
        ctx.fillStyle = target.fill;
        ctx.fill();
        ctx.strokeStyle = target.stroke;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        const aspect = target.aspect ?? 1;
        const tw = targetPx * Math.sqrt(aspect);
        const th = targetPx / Math.sqrt(aspect);
        ctx.fillStyle = target.fill;
        ctx.fillRect(targetX - tw / 2, targetY - th / 2, tw, th);
        ctx.strokeStyle = target.stroke;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(targetX - tw / 2, targetY - th / 2, tw, th);
      }

      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // ── 4. Reticle rendering ──────────────────────────────────────
    const els = elements ?? [];
    const trueMag = reticle ? parseFloat(String(reticle.true_magnification ?? magnification)) : magnification;
    const isFFP = reticle?.focal_plane === 'FFP';
    const visualScale = isFFP ? magnification / trueMag : 1;
    const ppm = pixelsPerMil * visualScale;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';

    // Draw each element
    let hasMainCross = false;
    for (const el of els) {
      if (el.type === 'line') {
        const x1 = el.x1 ?? 0, y1 = el.y1 ?? 0;
        const x2 = el.x2 ?? 0, y2 = el.y2 ?? 0;
        const len = Math.hypot(x2 - x1, y2 - y1);
        if (len > 5) hasMainCross = true;

        ctx.beginPath();
        ctx.moveTo(cx + x1 * ppm, cy - y1 * ppm);
        ctx.lineTo(cx + x2 * ppm, cy - y2 * ppm);
        ctx.stroke();
      } else {
        // dot/circle
        const x = el.x ?? 0, y = el.y ?? 0;
        const r = el.radius ?? 0;
        if (r === 0 || r < 0.01) {
          ctx.beginPath();
          ctx.arc(cx + x * ppm, cy - y * ppm, 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(cx + x * ppm, cy - y * ppm, r * ppm, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255,255,255,0.9)';
          ctx.stroke();
        }
      }
    }

    // Auto-crosshair if no long lines in geometry
    if (!hasMainCross) {
      ctx.save();
      ctx.setLineDash([3, 6]);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - radius, cy);
      ctx.lineTo(cx + radius, cy);
      ctx.moveTo(cx, cy - radius);
      ctx.lineTo(cx, cy + radius);
      ctx.stroke();
      ctx.restore();
    }

    // ── 5. Range labels (ChairGun red numbers) ────────────────────
    if (trajectory && trajectory.length > 1) {
      ctx.font = `bold ${Math.max(10, size * 0.018)}px "Inter", "Roboto", sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ff4444'; // ChairGun Red

      // Show range labels at major MIL marks (1, 2, 3, 4, 5 MIL holdover)
      for (let milMark = 1; milMark <= 10; milMark++) {
        // Find the range that corresponds to this holdover MIL
        for (let i = 1; i < trajectory.length; i++) {
          const prev = trajectory[i - 1];
          const curr = trajectory[i];
          if (prev.holdoverMRAD >= -milMark && curr.holdoverMRAD < -milMark) {
            // Interpolate exact range
            const span = prev.holdoverMRAD - curr.holdoverMRAD;
            const t = (prev.holdoverMRAD - (-milMark)) / span;
            const labelRange = Math.round(prev.range + t * (curr.range - prev.range));

            const py = cy + milMark * pixelsPerMil;
            if (py > cy + radius - 20) break; // off-screen

            ctx.fillText(`${labelRange}`, cx + 8, py + 4);
            break;
          }
        }
      }
    }

    // ── 6. POI indicator (red dot with line from center) ──────────
    if (atRange) {
      const poiMilY = atRange.holdoverMRAD;
      const poiMilX = (atRange.windDriftMRAD ?? 0);
      const poiPx = cx + poiMilX * pixelsPerMil;
      const poiPy = cy + poiMilY * pixelsPerMil;
      const dist = Math.hypot(poiPx - cx, poiPy - cy);

      // Dashed line from center to POI
      if (dist > 3) {
        ctx.save();
        ctx.setLineDash([2, 3]);
        ctx.strokeStyle = 'rgba(255,77,77,0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(poiPx, poiPy);
        ctx.stroke();
        ctx.restore();
      }

      // POI dot
      const poiR = Math.max(3, size * 0.008);
      ctx.beginPath();
      ctx.arc(poiPx, poiPy, poiR, 0, Math.PI * 2);
      ctx.fillStyle = '#ff4d4d';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore(); // Remove clip

    // ── 7. HUD Overlays ───────────────────────────────────────────
    const hudFont = `${Math.max(11, size * 0.02)}px "Inter", "Roboto Mono", monospace`;
    const hudSmall = `${Math.max(9, size * 0.016)}px "Inter", monospace`;
    const hudPad = size * 0.03;

    // Top-left: Range & Drop
    ctx.font = hudFont;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#38bdf8'; // Sky blue
    ctx.fillText(`Range: ${targetRange}m`, hudPad + 10, hudPad + 18);

    if (atRange) {
      ctx.font = hudSmall;
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`Drop: ${atRange.drop.toFixed(1)} mm`, hudPad + 10, hudPad + 36);
      ctx.fillText(`Hold: ${Math.abs(atRange.holdoverMRAD).toFixed(2)} MIL`, hudPad + 10, hudPad + 52);
    }

    // Top-right: Velocity & Energy
    if (atRange) {
      ctx.font = hudFont;
      ctx.textAlign = 'right';
      ctx.fillStyle = '#a78bfa'; // Purple
      ctx.fillText(`${atRange.velocity.toFixed(0)} m/s`, w - hudPad - 10, hudPad + 18);
      ctx.font = hudSmall;
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`${atRange.energy.toFixed(1)} J`, w - hudPad - 10, hudPad + 36);
      ctx.fillText(`TOF: ${atRange.tof.toFixed(3)}s`, w - hudPad - 10, hudPad + 52);
    }

    // Bottom-left: Wind info
    if (windSpeed > 0) {
      ctx.font = hudSmall;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#d946ef'; // Pink
      ctx.fillText(`Wind ${windSpeed.toFixed(1)} m/s @ ${windAngle}°`, hudPad + 10, h - hudPad - 20);
      if (atRange) {
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`Drift: ${atRange.windDrift.toFixed(1)} mm`, hudPad + 10, h - hudPad - 4);
      }
    }

    // Bottom-right: Magnification
    ctx.font = hudFont;
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fbbf24'; // Amber
    ctx.fillText(`${magnification.toFixed(1)}×`, w - hudPad - 10, h - hudPad - 4);

    // Bottom-center: Zero info
    ctx.font = hudSmall;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#475569';
    ctx.fillText(`Zero: ${zeroRange}m · MV: ${muzzleVelocity} m/s`, cx, h - hudPad - 4);

  }, [size, elements, reticle, magnification, trajectory, targetRange,
      target, atRange, zeroRange, muzzleVelocity, windSpeed, windAngle]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Handle high-DPI displays
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
    draw();
  }, [size, draw]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="chairgun-scope-canvas"
      style={{
        borderRadius: '50%',
        boxShadow: '0 0 40px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,0,0,0.5)',
      }}
    />
  );
};

export default React.memo(ChairGunScopeView);
