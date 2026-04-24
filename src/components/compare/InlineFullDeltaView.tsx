/**
 * Inline full-distance comparison view, expanded from the SessionDetail
 * "Comparer avec…" block.
 *
 * Pure presentation: it consumes `buildComparisonRows(a, b, defaultRange)`
 * — the same helper used by the existing 3-pick KPI block — and renders:
 *   - A complete delta table on every aligned distance.
 *   - A small SVG sparkline-style chart of Δ drop and Δ velocity vs range.
 *
 * No new business logic, no new metric. We deliberately avoid re-running the
 * ballistic engine: this view reads strictly from `session.results`. If a
 * row is missing on one side, deltas render as em-dash (honest absence).
 *
 * Kept inside `src/components/compare/` to sit next to the other compare
 * widgets (`ComparisonTable`, `BallisticTable`, `DifferencesList`,
 * `SessionPickerDialog`). Not used by `/compare` page — that one already has
 * its own richer table; this is the inline-on-detail-page variant.
 */

import { useMemo } from 'react';
import { TrendingDown, TrendingUp, Activity } from 'lucide-react';
import type { Session } from '@/lib/types';
import { buildComparisonRows, defaultRange } from '@/lib/compare';
import { useI18n } from '@/lib/i18n';

interface Props {
  a: Session;
  b: Session;
}

interface DeltaRow {
  range: number;
  dropA: number | null;
  dropB: number | null;
  dropDelta: number | null;
  velA: number | null;
  velB: number | null;
  velDelta: number | null;
  windDelta: number | null;
  tofDelta: number | null;
}

function fmtSigned(value: number | null, digits: number, unit: string): string {
  if (value == null) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)} ${unit}`;
}

function fmt(value: number | null | undefined, digits: number): string {
  if (value == null) return '—';
  return value.toFixed(digits);
}

/**
 * Compute series and the SVG path for the delta chart.
 * Two polylines on a shared x-axis (range), independent y-scales:
 *  - Δ drop (mm) — primary curve, accent colour
 *  - Δ velocity (m/s) — secondary curve, muted colour
 *
 * Y is symmetric around 0 so the sign is immediately readable.
 * Returns null if there is not enough data to draw anything meaningful
 * (≤1 valid sample on either side).
 */
function buildChart(rows: DeltaRow[]) {
  const xs = rows.map(r => r.range);
  if (xs.length < 2) return null;
  const xMin = xs[0];
  const xMax = xs[xs.length - 1];
  if (xMax <= xMin) return null;

  const dropPts = rows
    .map((r, i) => (r.dropDelta != null ? { i, x: r.range, y: r.dropDelta } : null))
    .filter((p): p is { i: number; x: number; y: number } => p !== null);
  const velPts = rows
    .map((r, i) => (r.velDelta != null ? { i, x: r.range, y: r.velDelta } : null))
    .filter((p): p is { i: number; x: number; y: number } => p !== null);

  if (dropPts.length < 2 && velPts.length < 2) return null;

  const dropAbs = Math.max(0.5, ...dropPts.map(p => Math.abs(p.y)));
  const velAbs = Math.max(0.5, ...velPts.map(p => Math.abs(p.y)));

  const W = 600;
  const H = 140;
  const padX = 36;
  const padY = 14;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;
  const midY = padY + innerH / 2;

  const xToPx = (x: number) => padX + ((x - xMin) / (xMax - xMin)) * innerW;
  const dropToPx = (y: number) => midY - (y / dropAbs) * (innerH / 2);
  const velToPx = (y: number) => midY - (y / velAbs) * (innerH / 2);

  const dropPath = dropPts
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'}${xToPx(p.x).toFixed(1)},${dropToPx(p.y).toFixed(1)}`)
    .join(' ');
  const velPath = velPts
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'}${xToPx(p.x).toFixed(1)},${velToPx(p.y).toFixed(1)}`)
    .join(' ');

  return {
    W, H, padX, padY, midY, xMin, xMax,
    dropPath, velPath,
    dropPts: dropPts.map(p => ({ cx: xToPx(p.x), cy: dropToPx(p.y), y: p.y })),
    velPts: velPts.map(p => ({ cx: xToPx(p.x), cy: velToPx(p.y), y: p.y })),
    dropAbs, velAbs,
  };
}

export function InlineFullDeltaView({ a, b }: Props) {
  const { t } = useI18n();
  const range = useMemo(() => defaultRange(a, b), [a, b]);
  const baseRows = useMemo(() => buildComparisonRows(a, b, range), [a, b, range]);

  const rows: DeltaRow[] = useMemo(
    () => baseRows.map(r => ({
      range: r.range,
      dropA: r.a?.drop ?? null,
      dropB: r.b?.drop ?? null,
      dropDelta: r.a && r.b ? r.b.drop - r.a.drop : null,
      velA: r.a?.velocity ?? null,
      velB: r.b?.velocity ?? null,
      velDelta: r.a && r.b ? r.b.velocity - r.a.velocity : null,
      windDelta: r.a && r.b ? r.b.windDrift - r.a.windDrift : null,
      tofDelta: r.a && r.b ? r.b.tof - r.a.tof : null,
    })),
    [baseRows],
  );

  const validDeltas = rows.filter(r => r.dropDelta != null);
  const stats = useMemo(() => {
    if (validDeltas.length === 0) {
      return { maxAbsDrop: null, maxAbsVel: null, atRange: null };
    }
    let maxAbsDrop = 0;
    let maxAbsVel = 0;
    let atRange = validDeltas[0].range;
    for (const r of validDeltas) {
      const ad = Math.abs(r.dropDelta ?? 0);
      if (ad > maxAbsDrop) {
        maxAbsDrop = ad;
        atRange = r.range;
      }
      const av = Math.abs(r.velDelta ?? 0);
      if (av > maxAbsVel) maxAbsVel = av;
    }
    return { maxAbsDrop, maxAbsVel, atRange };
  }, [validDeltas]);

  const chart = useMemo(() => buildChart(rows), [rows]);

  if (rows.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        {t('compare.noOverlap')}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Headline stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div className="surface-elevated px-2.5 py-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1">
            <Activity className="h-2.5 w-2.5" />
            {t('compare.fullDelta.range')}
          </div>
          <div className="mt-0.5 text-[12px] font-mono">
            {rows[0].range}–{rows[rows.length - 1].range} m
            <span className="text-muted-foreground"> · {rows.length} {t('compare.fullDelta.points')}</span>
          </div>
        </div>
        <div className="surface-elevated px-2.5 py-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1">
            <TrendingDown className="h-2.5 w-2.5" />
            {t('compare.fullDelta.maxDropDelta')}
          </div>
          <div className="mt-0.5 text-[12px] font-mono">
            {stats.maxAbsDrop != null
              ? <>{stats.maxAbsDrop.toFixed(1)} mm <span className="text-muted-foreground">@ {stats.atRange} m</span></>
              : '—'}
          </div>
        </div>
        <div className="surface-elevated px-2.5 py-2 col-span-2 sm:col-span-1">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1">
            <TrendingUp className="h-2.5 w-2.5" />
            {t('compare.fullDelta.maxVelDelta')}
          </div>
          <div className="mt-0.5 text-[12px] font-mono">
            {stats.maxAbsVel != null ? `${stats.maxAbsVel.toFixed(1)} m/s` : '—'}
          </div>
        </div>
      </div>

      {/* Delta chart */}
      {chart && (
        <div className="surface-elevated p-2 space-y-1">
          <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
            <span>{t('compare.fullDelta.chartTitle')}</span>
            <span className="flex items-center gap-2 normal-case tracking-normal">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block w-3 h-[2px] bg-primary" />
                Δ drop
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block w-3 h-[2px] bg-muted-foreground" />
                Δ V
              </span>
            </span>
          </div>
          <svg
            viewBox={`0 0 ${chart.W} ${chart.H}`}
            preserveAspectRatio="none"
            className="w-full h-32"
            role="img"
            aria-label={t('compare.fullDelta.chartTitle')}
          >
            {/* zero baseline */}
            <line
              x1={chart.padX}
              x2={chart.W - chart.padX}
              y1={chart.midY}
              y2={chart.midY}
              stroke="hsl(var(--border))"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            {/* x-axis ticks: first / mid / last */}
            {[chart.xMin, Math.round((chart.xMin + chart.xMax) / 2), chart.xMax].map(x => (
              <text
                key={x}
                x={chart.padX + ((x - chart.xMin) / (chart.xMax - chart.xMin)) * (chart.W - chart.padX * 2)}
                y={chart.H - 2}
                textAnchor="middle"
                fontSize="9"
                fill="hsl(var(--muted-foreground))"
              >
                {x}m
              </text>
            ))}
            {/* y-axis labels: top = +max, bottom = -max for drop scale */}
            <text x={4} y={chart.padY + 6} fontSize="9" fill="hsl(var(--muted-foreground))">
              +{chart.dropAbs.toFixed(0)}
            </text>
            <text x={4} y={chart.H - chart.padY} fontSize="9" fill="hsl(var(--muted-foreground))">
              -{chart.dropAbs.toFixed(0)}
            </text>
            {/* Δ drop curve */}
            {chart.dropPath && (
              <path d={chart.dropPath} fill="none" stroke="hsl(var(--primary))" strokeWidth={1.5} />
            )}
            {chart.dropPts.map((p, i) => (
              <circle key={`d-${i}`} cx={p.cx} cy={p.cy} r={1.8} fill="hsl(var(--primary))" />
            ))}
            {/* Δ velocity curve */}
            {chart.velPath && (
              <path d={chart.velPath} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth={1.2} strokeDasharray="4 2" />
            )}
            {chart.velPts.map((p, i) => (
              <circle key={`v-${i}`} cx={p.cx} cy={p.cy} r={1.4} fill="hsl(var(--muted-foreground))" />
            ))}
          </svg>
        </div>
      )}

      {/* Full delta table */}
      <div className="overflow-x-auto -mx-1">
        <table className="w-full min-w-[480px] text-[11px] font-mono border-collapse">
          <thead>
            <tr className="text-muted-foreground border-b border-border/60">
              <th className="text-left py-1 px-1.5 font-normal">m</th>
              <th className="text-right py-1 px-1.5 font-normal">drop A</th>
              <th className="text-right py-1 px-1.5 font-normal">drop B</th>
              <th className="text-right py-1 px-1.5 font-normal text-primary/80">Δ drop</th>
              <th className="text-right py-1 px-1.5 font-normal">V A</th>
              <th className="text-right py-1 px-1.5 font-normal">V B</th>
              <th className="text-right py-1 px-1.5 font-normal text-primary/80">Δ V</th>
              <th className="text-right py-1 px-1.5 font-normal">Δ wind</th>
              <th className="text-right py-1 px-1.5 font-normal">Δ tof</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const isHot = r.dropDelta != null && Math.abs(r.dropDelta) >= 5;
              return (
                <tr key={r.range} className="border-b border-border/20 last:border-b-0">
                  <td className="py-1 px-1.5">{r.range}</td>
                  <td className="text-right py-1 px-1.5">{fmt(r.dropA, 1)}</td>
                  <td className="text-right py-1 px-1.5">{fmt(r.dropB, 1)}</td>
                  <td className={`text-right py-1 px-1.5 ${isHot ? 'text-primary font-semibold' : ''}`}>
                    {fmtSigned(r.dropDelta, 1, 'mm')}
                  </td>
                  <td className="text-right py-1 px-1.5">{fmt(r.velA, 1)}</td>
                  <td className="text-right py-1 px-1.5">{fmt(r.velB, 1)}</td>
                  <td className="text-right py-1 px-1.5">{fmtSigned(r.velDelta, 1, 'm/s')}</td>
                  <td className="text-right py-1 px-1.5 text-muted-foreground">{fmtSigned(r.windDelta, 1, 'mm')}</td>
                  <td className="text-right py-1 px-1.5 text-muted-foreground">{fmtSigned(r.tofDelta, 3, 's')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-muted-foreground italic">
        {t('compare.fullDelta.footnote')}
      </p>
    </div>
  );
}