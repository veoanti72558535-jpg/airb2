import { useEffect, useMemo, useRef, useState } from 'react';
import { X, GitCompare, Gauge, RotateCcw, Target } from 'lucide-react';
import { Projectile, WeatherSnapshot } from '@/lib/types';
import { calculateTrajectory } from '@/lib/ballistics';
import { useI18n } from '@/lib/i18n';
import { useUnits } from '@/hooks/use-units';
import { cn } from '@/lib/utils';

const MIN_V = 200;
const MAX_V = 380;
const DEFAULT_V = 280;
const MIN_Z = 10;
const MAX_Z = 50;
const DEFAULT_Z = 30;

interface Props {
  projectiles: Projectile[];
  open: boolean;
  onClose: () => void;
  onRemove: (id: string) => void;
  /** Muzzle velocity used for the simulation (m/s). */
  muzzleVelocity?: number;
}

const COMPARE_RANGES = [25, 50, 75, 100] as const;
const CHART_STEP = 5; // m — fine sampling for the SVG drop chart
const CHART_MAX = 100; // m

/** Distinct hues for up to 4 projectiles. Tuned for dark + light themes. */
const SERIES_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--tactical))',
  'hsl(199 89% 60%)', // sky
  'hsl(280 70% 65%)', // violet
] as const;

function neutralWeather(): WeatherSnapshot {
  return {
    temperature: 15,
    humidity: 50,
    pressure: 1013.25,
    altitude: 0,
    windSpeed: 0,
    windAngle: 90,
    source: 'manual',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Side-by-side projectile comparison: weight, BC, drag model, and a quick
 * trajectory preview at 25/50/75/100 m using a neutral atmosphere.
 *
 * Velocity is identical for all projectiles (default 280 m/s) so the drop
 * differences truly reflect ballistic behaviour, not muzzle energy.
 */
export function CompareProjectilesModal({
  projectiles,
  open,
  onClose,
  onRemove,
  muzzleVelocity: initialVelocity = DEFAULT_V,
}: Props) {
  const { t } = useI18n();
  const { symbol } = useUnits();
  const [velocity, setVelocity] = useState<number>(initialVelocity);
  const [zeroRange, setZeroRange] = useState<number>(DEFAULT_Z);

  // Reset sliders when modal re-opens with a new initial velocity.
  useEffect(() => {
    if (open) {
      setVelocity(initialVelocity);
      setZeroRange(DEFAULT_Z);
    }
  }, [open, initialVelocity]);

  const rows = useMemo(() => {
    if (!open || projectiles.length === 0) return [];
    const weather = neutralWeather();
    return projectiles.map(p => {
      const traj = calculateTrajectory({
        muzzleVelocity: velocity,
        bc: p.bc,
        projectileWeight: p.weight,
        sightHeight: 50,
        zeroRange,
        maxRange: CHART_MAX,
        rangeStep: CHART_STEP,
        weather,
        dragModel: p.bcModel ?? 'G1',
        customDragTable: p.customDragTable,
      });
      const drops: Record<number, number> = {};
      const vels: Record<number, number> = {};
      const energies: Record<number, number> = {};
      const curve: { range: number; drop: number }[] = [];
      for (const r of traj) {
        curve.push({ range: r.range, drop: r.drop });
        if ((COMPARE_RANGES as readonly number[]).includes(r.range)) {
          drops[r.range] = r.drop;
          vels[r.range] = r.velocity;
          energies[r.range] = r.energy;
        }
      }
      return { p, drops, vels, energies, curve };
    });
  }, [projectiles, open, velocity, zeroRange]);

  if (!open) return null;

  const weightSym = symbol('weight');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4">
      <div className="surface-elevated w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0">
              <GitCompare className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-heading font-semibold">{t('projectiles.compareTitle')}</h2>
              <p className="text-[11px] text-muted-foreground">
                {t('projectiles.compareHint', { v: velocity, z: zeroRange })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Sliders: velocity + zero range */}
        <div className="px-4 py-3 border-b border-border bg-muted/20 grid gap-4 sm:grid-cols-2">
          {/* Velocity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="compare-velocity"
                className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
              >
                <Gauge className="h-3.5 w-3.5" />
                {t('projectiles.compareVelocity')}
              </label>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-foreground tabular-nums">
                  {velocity} m/s
                </span>
                {velocity !== DEFAULT_V && (
                  <button
                    type="button"
                    onClick={() => setVelocity(DEFAULT_V)}
                    className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                    aria-label={t('common.reset')}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
            <input
              id="compare-velocity"
              type="range"
              min={MIN_V}
              max={MAX_V}
              step={5}
              value={velocity}
              onChange={e => setVelocity(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>{MIN_V}</span>
              <span>{MAX_V}</span>
            </div>
          </div>

          {/* Zero range */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="compare-zero"
                className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
              >
                <Target className="h-3.5 w-3.5" />
                {t('projectiles.compareZero')}
              </label>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-foreground tabular-nums">
                  {zeroRange} m
                </span>
                {zeroRange !== DEFAULT_Z && (
                  <button
                    type="button"
                    onClick={() => setZeroRange(DEFAULT_Z)}
                    className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                    aria-label={t('common.reset')}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
            <input
              id="compare-zero"
              type="range"
              min={MIN_Z}
              max={MAX_Z}
              step={1}
              value={zeroRange}
              onChange={e => setZeroRange(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>{MIN_Z}</span>
              <span>{MAX_Z}</span>
            </div>
          </div>
        </div>

        {/* Drop chart */}
        <DropChart rows={rows} t={t} />

        {/* Table */}
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-3 py-2 sticky left-0 bg-muted/40 z-10">
                  {t('projectiles.compareMetric')}
                </th>
                {(() => {
                  // Pre-compute FPE for all rows so we can highlight the maximum.
                  const velocityFps = velocity * 3.28084;
                  const energies = rows.map(({ p }) => {
                    const fpe = (p.weight * velocityFps * velocityFps) / 450240;
                    const joules = 0.5 * (p.weight * 0.0000647989) * velocity * velocity;
                    return { id: p.id, fpe, joules };
                  });
                  const maxFpe = energies.reduce((m, e) => (e.fpe > m ? e.fpe : m), 0);
                  return rows.map(({ p }) => {
                    const e = energies.find(x => x.id === p.id)!;
                    // Highlight only when there's >1 row and this row is (uniquely or jointly) the max.
                    const isMax =
                      rows.length > 1 && Math.abs(e.fpe - maxFpe) < 0.05;
                    return (
                      <th key={p.id} className="text-left font-medium px-3 py-2 min-w-[160px]">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-foreground normal-case truncate">
                              {p.brand} {p.model}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {p.caliber} · {p.bcModel ?? 'G1'}
                            </div>
                            <div
                              className={cn(
                                'mt-1 text-[10px] font-mono normal-case inline-flex items-center gap-1 rounded px-1 -mx-1',
                                isMax
                                  ? 'text-tactical font-semibold bg-tactical/10'
                                  : 'text-muted-foreground'
                              )}
                              title={t('projectiles.compareMuzzleEnergy')}
                            >
                              {isMax && <span aria-hidden>★</span>}
                              {e.fpe.toFixed(1)} fpe · {e.joules.toFixed(1)} J
                            </div>
                          </div>
                          <button
                            onClick={() => onRemove(p.id)}
                            className="p-0.5 rounded hover:bg-muted text-muted-foreground shrink-0"
                            aria-label={t('common.delete')}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </th>
                    );
                  });
                })()}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {/* Static specs */}
              <tr>
                <td className="px-3 py-2 text-xs text-muted-foreground sticky left-0 bg-card z-10">
                  {t('projectiles.weight')}
                </td>
                {rows.map(({ p }) => (
                  <td key={p.id} className="px-3 py-2 font-mono text-xs">
                    {p.weight} {weightSym}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-3 py-2 text-xs text-muted-foreground sticky left-0 bg-card z-10">
                  BC
                </td>
                {rows.map(({ p }) => (
                  <td key={p.id} className="px-3 py-2 font-mono text-xs">
                    {p.bc}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-3 py-2 text-xs text-muted-foreground sticky left-0 bg-card z-10">
                  {t('projectiles.type')}
                </td>
                {rows.map(({ p }) => (
                  <td key={p.id} className="px-3 py-2 font-mono text-xs">
                    {p.projectileType ?? 'pellet'}
                  </td>
                ))}
              </tr>

              {/* Drop section header */}
              <tr className="bg-muted/20">
                <td colSpan={rows.length + 1} className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                  {t('projectiles.compareDropSection')}
                </td>
              </tr>
              {COMPARE_RANGES.map(r => {
                const best = Math.min(...rows.map(x => Math.abs(x.drops[r] ?? Infinity)));
                return (
                  <tr key={`drop-${r}`}>
                    <td className="px-3 py-2 text-xs text-muted-foreground sticky left-0 bg-card z-10">
                      {t('projectiles.compareDropAt', { r })}
                    </td>
                    {rows.map(({ p, drops }) => {
                      const d = drops[r];
                      const isBest = d !== undefined && Math.abs(d) === best && rows.length > 1;
                      return (
                        <td
                          key={p.id}
                          className={cn(
                            'px-3 py-2 font-mono text-xs',
                            isBest && 'text-tactical font-semibold'
                          )}
                        >
                          {d !== undefined ? `${d.toFixed(1)} mm` : '—'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* Velocity / energy section */}
              <tr className="bg-muted/20">
                <td colSpan={rows.length + 1} className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                  {t('projectiles.compareEnergySection')}
                </td>
              </tr>
              {COMPARE_RANGES.map(r => (
                <tr key={`v-${r}`}>
                  <td className="px-3 py-2 text-xs text-muted-foreground sticky left-0 bg-card z-10">
                    {t('projectiles.compareEnergyAt', { r })}
                  </td>
                  {rows.map(({ p, vels, energies }) => (
                    <td key={p.id} className="px-3 py-2 font-mono text-xs">
                      {vels[r] !== undefined
                        ? `${vels[r].toFixed(0)} m/s · ${energies[r].toFixed(1)} J`
                        : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border text-[10px] text-muted-foreground">
          {t('projectiles.compareDisclaimer')}
        </div>
      </div>
    </div>
  );
}

interface DropChartProps {
  rows: {
    p: Projectile;
    curve: { range: number; drop: number }[];
  }[];
  t: (key: string, vars?: Record<string, string | number>) => string;
}

/**
 * Compact SVG chart of drop (mm, Y) vs distance (m, X) for each projectile.
 * Uses a shared Y scale so curves are directly comparable. Drop is plotted
 * with negative values (below sight line) downward, matching shooter intuition.
 */
function DropChart({ rows, t }: DropChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null); // distance in meters

  if (rows.length === 0 || rows.every(r => r.curve.length === 0)) return null;

  const W = 600;
  const H = 180;
  const PAD_L = 36;
  const PAD_R = 12;
  const PAD_T = 12;
  const PAD_B = 24;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  let minDrop = 0;
  let maxDrop = 0;
  for (const { curve } of rows) {
    for (const pt of curve) {
      if (pt.drop < minDrop) minDrop = pt.drop;
      if (pt.drop > maxDrop) maxDrop = pt.drop;
    }
  }
  if (maxDrop < 0) maxDrop = 0;
  if (minDrop > 0) minDrop = 0;
  const span = Math.max(1, maxDrop - minDrop);
  const yMin = minDrop - span * 0.08;
  const yMax = maxDrop + span * 0.04;

  const xMax = CHART_MAX;
  const xToPx = (x: number) => PAD_L + (x / xMax) * innerW;
  const yToPx = (y: number) => PAD_T + ((yMax - y) / (yMax - yMin)) * innerH;
  const pxToX = (px: number) => ((px - PAD_L) / innerW) * xMax;

  const xTicks = [0, 25, 50, 75, 100];
  const yTickCount = 4;
  const yTicks: number[] = [];
  for (let i = 0; i <= yTickCount; i++) {
    yTicks.push(yMin + ((yMax - yMin) * i) / yTickCount);
  }

  const buildPath = (curve: { range: number; drop: number }[]) =>
    curve
      .map((pt, i) => `${i === 0 ? 'M' : 'L'}${xToPx(pt.range).toFixed(1)},${yToPx(pt.drop).toFixed(1)}`)
      .join(' ');

  /** Snap an SVG-local px coordinate to the nearest sample in the chart range. */
  const handlePointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const localX = ((e.clientX - rect.left) / rect.width) * W;
    if (localX < PAD_L || localX > W - PAD_R) {
      setHoverX(null);
      return;
    }
    const rawX = pxToX(localX);
    // snap to chart sampling step
    const snapped = Math.max(0, Math.min(xMax, Math.round(rawX / CHART_STEP) * CHART_STEP));
    setHoverX(snapped);
  };

  // Build tooltip rows for the hovered distance (interpolation not needed: chart uses CHART_STEP samples).
  const tooltipPoints =
    hoverX !== null
      ? rows
          .map(({ p, curve }, i) => {
            const pt = curve.find(c => c.range === hoverX);
            if (!pt) return null;
            return {
              id: p.id,
              label: `${p.brand} ${p.model}`,
              drop: pt.drop,
              color: SERIES_COLORS[i % SERIES_COLORS.length],
            };
          })
          .filter((x): x is NonNullable<typeof x> => x !== null)
      : [];

  // Position tooltip — flip to the left of the cursor when near the right edge
  const tooltipPxX = hoverX !== null ? xToPx(hoverX) : 0;
  const tooltipFlip = tooltipPxX > W * 0.6;

  return (
    <div className="px-4 py-3 border-b border-border bg-card/40">
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t('projectiles.compareChartTitle')}
        </h3>
        <div className="flex flex-wrap gap-x-3 gap-y-1 justify-end">
          {rows.map(({ p }, i) => (
            <div key={p.id} className="flex items-center gap-1.5 text-[10px]">
              <span
                className="inline-block h-0.5 w-3 rounded"
                style={{ backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length] }}
              />
              <span className="text-foreground truncate max-w-[140px]">
                {p.brand} {p.model}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto touch-none"
          role="img"
          aria-label={t('projectiles.compareChartTitle')}
          onPointerMove={handlePointer}
          onPointerDown={handlePointer}
          onPointerLeave={() => setHoverX(null)}
        >
          {yTicks.map((y, i) => (
            <g key={`y-${i}`}>
              <line
                x1={PAD_L}
                x2={W - PAD_R}
                y1={yToPx(y)}
                y2={yToPx(y)}
                stroke="hsl(var(--border))"
                strokeWidth={0.5}
                strokeDasharray={Math.abs(y) < 0.01 ? undefined : '2 3'}
              />
              <text
                x={PAD_L - 4}
                y={yToPx(y)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted-foreground"
                fontSize={9}
                fontFamily="ui-monospace, monospace"
              >
                {y.toFixed(0)}
              </text>
            </g>
          ))}

          {xTicks.map(x => (
            <g key={`x-${x}`}>
              <line
                x1={xToPx(x)}
                x2={xToPx(x)}
                y1={PAD_T}
                y2={H - PAD_B}
                stroke="hsl(var(--border))"
                strokeWidth={0.5}
                strokeDasharray="2 3"
              />
              <text
                x={xToPx(x)}
                y={H - PAD_B + 12}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize={9}
                fontFamily="ui-monospace, monospace"
              >
                {x}
              </text>
            </g>
          ))}

          <text
            x={W - PAD_R}
            y={H - 4}
            textAnchor="end"
            className="fill-muted-foreground"
            fontSize={9}
          >
            {t('projectiles.compareChartX')}
          </text>
          <text
            x={4}
            y={PAD_T + 4}
            textAnchor="start"
            className="fill-muted-foreground"
            fontSize={9}
          >
            {t('projectiles.compareChartY')}
          </text>

          {rows.map(({ p, curve }, i) => {
            const color = SERIES_COLORS[i % SERIES_COLORS.length];
            return (
              <g key={p.id}>
                <path
                  d={buildPath(curve)}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.75}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {/* Markers at comparison distances */}
                {COMPARE_RANGES.map(r => {
                  const pt = curve.find(c => c.range === r);
                  if (!pt) return null;
                  return (
                    <circle
                      key={`${p.id}-${r}`}
                      cx={xToPx(pt.range)}
                      cy={yToPx(pt.drop)}
                      r={3}
                      fill={color}
                      stroke="hsl(var(--card))"
                      strokeWidth={1}
                      style={{ cursor: 'help' }}
                    >
                      <title>{`${p.brand} ${p.model} — ${pt.range} m · ${pt.drop.toFixed(1)} mm`}</title>
                    </circle>
                  );
                })}
              </g>
            );
          })}

          {/* Hover crosshair + emphasized markers */}
          {hoverX !== null && tooltipPoints.length > 0 && (
            <g pointerEvents="none">
              <line
                x1={tooltipPxX}
                x2={tooltipPxX}
                y1={PAD_T}
                y2={H - PAD_B}
                stroke="hsl(var(--primary))"
                strokeWidth={0.75}
                strokeDasharray="3 2"
                opacity={0.7}
              />
              {tooltipPoints.map(pt => (
                <circle
                  key={`hover-${pt.id}`}
                  cx={tooltipPxX}
                  cy={yToPx(pt.drop)}
                  r={4}
                  fill={pt.color}
                  stroke="hsl(var(--background))"
                  strokeWidth={1.5}
                />
              ))}
            </g>
          )}
        </svg>

        {/* HTML tooltip overlaid on the SVG — positioned in % so it scales with the responsive svg */}
        {hoverX !== null && tooltipPoints.length > 0 && (
          <div
            className={cn(
              'pointer-events-none absolute top-1 z-10 surface-elevated shadow-lg border border-border rounded-md px-2 py-1.5 min-w-[140px]',
              tooltipFlip ? '-translate-x-full' : ''
            )}
            style={{
              left: `calc(${(tooltipPxX / W) * 100}% ${tooltipFlip ? '- 8px' : '+ 8px'})`,
            }}
          >
            <div className="text-[10px] font-mono text-muted-foreground mb-1 uppercase tracking-wide">
              {t('projectiles.compareDropAt', { r: hoverX })}
            </div>
            <div className="space-y-0.5">
              {tooltipPoints.map(pt => (
                <div key={`tip-${pt.id}`} className="flex items-center gap-1.5 text-[11px]">
                  <span
                    className="inline-block h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: pt.color }}
                  />
                  <span className="text-foreground truncate flex-1 min-w-0">{pt.label}</span>
                  <span className="font-mono tabular-nums text-foreground shrink-0">
                    {pt.drop.toFixed(1)} mm
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
