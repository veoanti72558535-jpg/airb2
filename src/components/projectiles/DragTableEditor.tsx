import { useMemo, useRef, useState, useCallback } from 'react';
import { Upload, X, Check, AlertTriangle, FileText, Trash2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { DragModel, DragTablePoint } from '@/lib/types';
import { parseDragTable, dragTableToCsv, DragTableParseError } from '@/lib/drag-table';
import { cdFor } from '@/lib/ballistics';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface Props {
  value: DragTablePoint[] | undefined;
  onChange: (table: DragTablePoint[] | undefined) => void;
}

/**
 * Drop-zone + textarea editor for a custom Cd/Mach drag table.
 * Accepts CSV (mach,cd) or JSON. Parses, validates, and previews
 * the first few points before committing.
 */
export function DragTableEditor({ value, onChange }: Props) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<string>(() => (value ? dragTableToCsv(value) : ''));
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tryApply = (text: string) => {
    setDraft(text);
    if (!text.trim()) {
      setError(null);
      setWarnings([]);
      return null;
    }
    try {
      const { table, warnings } = parseDragTable(text);
      setError(null);
      setWarnings(warnings);
      return table;
    } catch (e) {
      const msg = e instanceof DragTableParseError ? e.message : (e as Error).message;
      setError(msg);
      setWarnings([]);
      return null;
    }
  };

  const handleApply = () => {
    const table = tryApply(draft);
    if (table) {
      onChange(table);
      toast({ title: t('projectiles.dragTableApplied', { count: table.length }) });
    }
  };

  const handleClear = () => {
    setDraft('');
    setError(null);
    setWarnings([]);
    onChange(undefined);
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    tryApply(text);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-foreground">
          {t('projectiles.dragTableTitle')}
        </label>
        <div className="flex items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,.txt,text/csv,application/json,text/plain"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded border border-border hover:bg-muted/40"
          >
            <Upload className="h-3 w-3" /> {t('projectiles.dragTableFile')}
          </button>
          {value && value.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded border border-border text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3 w-3" /> {t('common.clear')}
            </button>
          )}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        {t('projectiles.dragTableHint')}
      </p>

      <textarea
        value={draft}
        onChange={e => tryApply(e.target.value)}
        onDragOver={e => e.preventDefault()}
        onDrop={onDrop}
        placeholder={'mach,cd\n0.5,0.235\n0.7,0.235\n0.9,0.45\n1.0,0.59\n1.2,0.55'}
        rows={6}
        className="w-full bg-muted border border-border rounded-md px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
      />

      {error && (
        <div className="flex items-start gap-2 text-[11px] text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="flex items-start gap-2 text-[11px] text-warning bg-warning/10 border border-warning/30 rounded-md p-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <ul className="space-y-0.5">
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {value && value.length > 0 && (
        <div className="surface-card p-2 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] text-tactical font-medium">
            <Check className="h-3 w-3" />
            {t('projectiles.dragTableActive', { count: value.length })}
          </div>
          <div className="text-[10px] text-muted-foreground font-mono">
            Mach {value[0].mach}–{value[value.length - 1].mach} ·
            Cd {Math.min(...value.map(p => p.cd)).toFixed(3)}–{Math.max(...value.map(p => p.cd)).toFixed(3)}
          </div>
          <DragTablePreview table={value} t={t} />
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleApply}
          disabled={!draft.trim() || !!error}
          className="px-3 py-1.5 text-xs font-medium rounded bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 inline-flex items-center gap-1"
        >
          <FileText className="h-3.5 w-3.5" />
          {t('projectiles.dragTableApply')}
        </button>
      </div>
    </div>
  );
}

/**
 * Toggleable reference curves: each row uses the engine's `cdFor` so the
 * preview always matches the actual ballistic computation. Distinct hues
 * keep up to 4 overlays readable on dark + light themes.
 */
const REF_MODELS: { model: DragModel; color: string; dash: string }[] = [
  { model: 'G1', color: 'hsl(var(--muted-foreground))', dash: '3 3' },
  { model: 'G7', color: 'hsl(199 89% 60%)', dash: '4 2' },
  { model: 'GA', color: 'hsl(280 70% 65%)', dash: '5 2 1 2' },
  { model: 'GS', color: 'hsl(160 65% 50%)', dash: '2 2' },
];

interface PreviewProps {
  table: DragTablePoint[];
  t: (key: string, vars?: Record<string, string | number>) => string;
}

/**
 * Small SVG plot of imported Cd vs Mach (solid primary) overlaid with one or
 * more standard reference curves (dashed). Users toggle G1/G7/GA/GS chips to
 * compare the imported set against multiple drag models at once.
 *
 * G1 is enabled by default since it's the most common reference for pellets.
 * Auto-scales the X axis to the imported range and Y to the combined extents
 * of every visible curve.
 */
function DragTablePreview({ table, t }: PreviewProps) {
  const [enabled, setEnabled] = useState<Record<DragModel, boolean>>({
    G1: true,
    G7: false,
    GA: false,
    GS: false,
  });

  const W = 320;
  const H = 120;
  const PAD_L = 28;
  const PAD_R = 8;
  const PAD_T = 8;
  const PAD_B = 18;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const xMin = Math.min(table[0].mach, 0.5);
  const xMax = Math.max(table[table.length - 1].mach, 1.3);

  // Sample every enabled reference curve across the same X range.
  const STEPS = 60;
  const refCurves = useMemo(() => {
    return REF_MODELS.filter(r => enabled[r.model]).map(r => {
      const pts: { mach: number; cd: number }[] = [];
      for (let i = 0; i <= STEPS; i++) {
        const mach = xMin + ((xMax - xMin) * i) / STEPS;
        pts.push({ mach, cd: cdFor(r.model, mach) });
      }
      return { ...r, pts };
    });
  }, [enabled, xMin, xMax]);

  // Y range spans the imported table + every visible reference (so toggling
  // GS, which peaks at ~0.92, doesn't clip the curve).
  const allCd = [
    ...table.map(p => p.cd),
    ...refCurves.flatMap(c => c.pts.map(p => p.cd)),
  ];
  const yMin = Math.max(0, Math.min(...allCd) - 0.05);
  const yMax = Math.max(...allCd) + 0.05;

  const xToPx = (x: number) => PAD_L + ((x - xMin) / (xMax - xMin)) * innerW;
  const yToPx = (y: number) => PAD_T + ((yMax - y) / (yMax - yMin)) * innerH;
  const pxToX = (px: number) => xMin + ((px - PAD_L) / innerW) * (xMax - xMin);

  const buildPath = (pts: { mach: number; cd: number }[]) =>
    pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${xToPx(p.mach).toFixed(1)},${yToPx(p.cd).toFixed(1)}`)
      .join(' ');

  // Linear interpolation of the imported table at an arbitrary Mach (clamped
  // to the table extents — outside the imported range we'd be extrapolating
  // which has no physical meaning for a measured Cd curve).
  const interpImported = (mach: number): number | null => {
    if (mach < table[0].mach || mach > table[table.length - 1].mach) return null;
    for (let i = 1; i < table.length; i++) {
      const a = table[i - 1];
      const b = table[i];
      if (mach <= b.mach) {
        const t = (mach - a.mach) / (b.mach - a.mach);
        return a.cd + (b.cd - a.cd) * t;
      }
    }
    return table[table.length - 1].cd;
  };

  // Hover state — `null` = not hovering. `mach` is in data units.
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    // Convert client coords → SVG viewBox coords so the math stays correct
    // regardless of CSS scaling (the SVG is width:100%).
    const rect = svg.getBoundingClientRect();
    const vbX = ((e.clientX - rect.left) / rect.width) * W;
    if (vbX < PAD_L || vbX > W - PAD_R) {
      setHover(null);
      return;
    }
    setHover(pxToX(vbX));
  }, [pxToX]);

  // 3 ticks on each axis
  const xTicks = [xMin, (xMin + xMax) / 2, xMax];
  const yTicks = [yMin, (yMin + yMax) / 2, yMax];

  // Build tooltip rows for the hovered Mach: imported value (if in range) plus
  // every currently-enabled reference curve, in the same colour as the line.
  const hoverRows = hover === null
    ? []
    : [
        ...(interpImported(hover) !== null
          ? [{ label: t('projectiles.dragTableImported'), color: 'hsl(var(--primary))', cd: interpImported(hover)! }]
          : []),
        ...refCurves.map(r => ({ label: r.model, color: r.color, cd: cdFor(r.model, hover) })),
      ];

  // Tooltip box dimensions (sized to fit ~5 rows). Positioned to flip sides
  // when near the right edge so it never clips out of the viewBox.
  const TT_W = 78;
  const TT_LINE_H = 10;
  const TT_H = 14 + hoverRows.length * TT_LINE_H;
  const tooltipX = hover !== null && xToPx(hover) + TT_W + 8 > W - PAD_R
    ? xToPx(hover) - TT_W - 6
    : hover !== null
      ? xToPx(hover) + 6
      : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="text-muted-foreground uppercase tracking-wide">
          {t('projectiles.dragTablePreview')}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-0.5 w-3 rounded bg-primary" aria-hidden />
          <span className="text-foreground">{t('projectiles.dragTableImported')}</span>
        </span>
      </div>

      {/* Reference toggle chips — each chip shows its own dash style preview. */}
      <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
        <span className="text-muted-foreground uppercase tracking-wide mr-0.5">
          {t('projectiles.dragTableReferences')}:
        </span>
        {REF_MODELS.map(r => {
          const on = enabled[r.model];
          return (
            <button
              key={r.model}
              type="button"
              onClick={() => setEnabled(prev => ({ ...prev, [r.model]: !prev[r.model] }))}
              aria-pressed={on}
              title={t('projectiles.dragTableToggleRef', { model: r.model })}
              className={cn(
                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-mono transition-colors',
                on
                  ? 'border-border bg-muted text-foreground'
                  : 'border-border/50 text-muted-foreground hover:bg-muted/40'
              )}
            >
              <span
                className="inline-block h-0.5 w-3 rounded shrink-0"
                style={{
                  background: on
                    ? `repeating-linear-gradient(to right, ${r.color} 0 4px, transparent 4px 7px)`
                    : 'hsl(var(--border))',
                }}
                aria-hidden
              />
              {r.model}
            </button>
          );
        })}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto touch-none"
        role="img"
        aria-label={t('projectiles.dragTablePreview')}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHover(null)}
      >
        {/* grid + axis labels */}
        {yTicks.map((y, i) => (
          <g key={`y-${i}`}>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={yToPx(y)}
              y2={yToPx(y)}
              stroke="hsl(var(--border))"
              strokeWidth={0.5}
              strokeDasharray="2 3"
            />
            <text
              x={PAD_L - 3}
              y={yToPx(y)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-muted-foreground"
              fontSize={8}
              fontFamily="ui-monospace, monospace"
            >
              {y.toFixed(2)}
            </text>
          </g>
        ))}
        {xTicks.map((x, i) => (
          <g key={`x-${i}`}>
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
              y={H - PAD_B + 10}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize={8}
              fontFamily="ui-monospace, monospace"
            >
              {x.toFixed(1)}
            </text>
          </g>
        ))}
        {/* axis titles */}
        <text
          x={W - PAD_R}
          y={H - 3}
          textAnchor="end"
          className="fill-muted-foreground"
          fontSize={8}
        >
          Mach
        </text>
        <text x={3} y={PAD_T + 4} textAnchor="start" className="fill-muted-foreground" fontSize={8}>
          Cd
        </text>

        {/* Reference curves (dashed, one per enabled model) */}
        {refCurves.map(r => (
          <path
            key={r.model}
            d={buildPath(r.pts)}
            fill="none"
            stroke={r.color}
            strokeWidth={1.25}
            strokeDasharray={r.dash}
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={0.75}
          >
            <title>{r.model}</title>
          </path>
        ))}

        {/* Imported table (solid + markers) */}
        <path
          d={buildPath(table)}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={1.75}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {table.map((p, i) => (
          <circle
            key={i}
            cx={xToPx(p.mach)}
            cy={yToPx(p.cd)}
            r={2}
            fill="hsl(var(--primary))"
            stroke="hsl(var(--card))"
            strokeWidth={0.75}
          >
            <title>{`Mach ${p.mach} · Cd ${p.cd.toFixed(3)}`}</title>
          </circle>
        ))}

        {/* Hover overlay: vertical guide, per-curve dots, and tooltip box.
            Renders last so it sits above all curves. pointer-events: none on
            children so they never steal the pointer from the svg listeners. */}
        {hover !== null && hoverRows.length > 0 && (
          <g pointerEvents="none">
            <line
              x1={xToPx(hover)}
              x2={xToPx(hover)}
              y1={PAD_T}
              y2={H - PAD_B}
              stroke="hsl(var(--foreground))"
              strokeWidth={0.5}
              strokeDasharray="2 2"
              opacity={0.5}
            />
            {hoverRows.map((row, i) => (
              <circle
                key={i}
                cx={xToPx(hover)}
                cy={yToPx(row.cd)}
                r={2.5}
                fill={row.color}
                stroke="hsl(var(--card))"
                strokeWidth={0.75}
              />
            ))}
            <rect
              x={tooltipX}
              y={PAD_T}
              width={TT_W}
              height={TT_H}
              rx={3}
              fill="hsl(var(--popover))"
              stroke="hsl(var(--border))"
              strokeWidth={0.5}
            />
            <text
              x={tooltipX + 4}
              y={PAD_T + 9}
              className="fill-muted-foreground"
              fontSize={7}
              fontFamily="ui-monospace, monospace"
            >
              {`Mach ${hover.toFixed(3)}`}
            </text>
            {hoverRows.map((row, i) => (
              <g key={i} transform={`translate(${tooltipX + 4}, ${PAD_T + 14 + i * TT_LINE_H})`}>
                <rect x={0} y={2} width={5} height={2} fill={row.color} rx={0.5} />
                <text
                  x={8}
                  y={7}
                  className="fill-popover-foreground"
                  fontSize={7.5}
                  fontFamily="ui-monospace, monospace"
                >
                  {`${row.label}: ${row.cd.toFixed(3)}`}
                </text>
              </g>
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}
