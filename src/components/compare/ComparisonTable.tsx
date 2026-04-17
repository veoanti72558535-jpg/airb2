import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { ComparisonRow } from '@/lib/compare';
import { cn } from '@/lib/utils';

interface Props {
  rows: ComparisonRow[];
  /** Click unit chosen by the user — drives the hold/wind display. */
  clickUnit: 'MOA' | 'MRAD';
}

interface ColDef {
  /** Translation key for the header. */
  labelKey: string;
  /** Suffix displayed after the value in the header. */
  unit?: string;
  /** Number formatter — receives undefined when no value. */
  format: (n: number | undefined) => string;
  /** Reads the metric off a result row. */
  pick: (r: { a?: any; b?: any }, side: 'a' | 'b', clickUnit: 'MOA' | 'MRAD') => number | undefined;
  /** When true, renders the column only in the "advanced" set. */
  advanced?: boolean;
  /** Optional preferred direction — drives delta colour (lower better, higher better). */
  betterWhen?: 'lower' | 'higher';
}

const fmt = (digits: number) => (n: number | undefined) =>
  n == null || Number.isNaN(n) ? '—' : n.toFixed(digits);

const COLS: ColDef[] = [
  {
    labelKey: 'calc.drop',
    unit: 'mm',
    format: fmt(1),
    pick: (r, s) => r[s]?.drop,
    betterWhen: 'higher', // less negative drop = better (closer to zero)
  },
  {
    labelKey: 'calc.holdover',
    format: fmt(2),
    pick: (r, s, u) => (u === 'MOA' ? r[s]?.holdover : r[s]?.holdoverMRAD),
    betterWhen: 'lower',
  },
  {
    labelKey: 'calc.velocity',
    unit: 'm/s',
    format: fmt(0),
    pick: (r, s) => r[s]?.velocity,
    betterWhen: 'higher',
  },
  {
    labelKey: 'calc.energy',
    unit: 'J',
    format: fmt(1),
    pick: (r, s) => r[s]?.energy,
    betterWhen: 'higher',
  },
  // Advanced columns
  {
    labelKey: 'calc.tof',
    unit: 's',
    format: fmt(3),
    pick: (r, s) => r[s]?.tof,
    advanced: true,
    betterWhen: 'lower',
  },
  {
    labelKey: 'calc.windDrift',
    unit: 'mm',
    format: fmt(1),
    pick: (r, s) => r[s]?.windDrift,
    advanced: true,
    betterWhen: 'lower',
  },
  {
    labelKey: 'calc.spinDrift',
    unit: 'mm',
    format: fmt(1),
    pick: (r, s) => r[s]?.spinDrift,
    advanced: true,
    betterWhen: 'lower',
  },
  {
    labelKey: 'calc.clicksElev',
    format: fmt(0),
    pick: (r, s) => r[s]?.clicksElevation,
    advanced: true,
  },
];

export function ComparisonTable({ rows, clickUnit }: Props) {
  const { t } = useI18n();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const visible = COLS.filter(c => showAdvanced || !c.advanced);

  return (
    <div className="surface-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-heading font-semibold">{t('compare.tableTitle')}</h3>
        <button
          type="button"
          onClick={() => setShowAdvanced(v => !v)}
          className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        >
          {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {showAdvanced ? t('compare.hideAdvanced') : t('compare.showAdvanced')}
        </button>
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-xs font-mono border-collapse">
          <thead>
            <tr className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
              <th rowSpan={2} className="text-left py-1.5 pr-3 sticky left-0 bg-card z-10">
                {t('calc.range')}
              </th>
              {visible.map(c => (
                <th key={c.labelKey} colSpan={3} className="text-center px-2 py-1 border-l border-border/40">
                  {t(c.labelKey as any)}
                  {c.unit && <span className="text-muted-foreground/70 ml-1">({c.unit})</span>}
                  {c.labelKey === 'calc.holdover' && (
                    <span className="text-muted-foreground/70 ml-1">({clickUnit})</span>
                  )}
                </th>
              ))}
            </tr>
            <tr className="text-[9px] uppercase text-muted-foreground/80 border-b border-border/40">
              {visible.map(c => (
                <SubHeaders key={c.labelKey} />
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.range} className="border-b border-border/20 hover:bg-muted/20">
                <td className="py-1.5 pr-3 font-semibold sticky left-0 bg-card z-10">
                  {row.range}m
                </td>
                {visible.map(col => {
                  const av = col.pick(row, 'a', clickUnit);
                  const bv = col.pick(row, 'b', clickUnit);
                  const delta = av != null && bv != null ? bv - av : undefined;
                  return (
                    <Cell key={col.labelKey} av={av} bv={bv} delta={delta} col={col} />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SubHeaders() {
  return (
    <>
      <th className="text-right px-1.5 py-1 border-l border-border/40">A</th>
      <th className="text-right px-1.5 py-1">B</th>
      <th className="text-right px-1.5 py-1">Δ</th>
    </>
  );
}

function Cell({
  av,
  bv,
  delta,
  col,
}: {
  av: number | undefined;
  bv: number | undefined;
  delta: number | undefined;
  col: ColDef;
}) {
  const deltaClass = (() => {
    if (delta == null || Math.abs(delta) < 1e-6 || !col.betterWhen) return 'text-muted-foreground';
    // delta = B − A. If higher is better and delta > 0 → B is better → green for B side reading.
    const bIsBetter =
      (col.betterWhen === 'higher' && delta > 0) ||
      (col.betterWhen === 'lower' && delta < 0);
    return bIsBetter ? 'text-primary' : 'text-amber-500 dark:text-amber-400';
  })();

  return (
    <>
      <td className="text-right px-1.5 py-1.5 border-l border-border/40 tabular-nums">
        {col.format(av)}
      </td>
      <td className="text-right px-1.5 py-1.5 tabular-nums">{col.format(bv)}</td>
      <td className={cn('text-right px-1.5 py-1.5 tabular-nums font-semibold', deltaClass)}>
        {delta == null ? '—' : `${delta > 0 ? '+' : ''}${col.format(delta)}`}
      </td>
    </>
  );
}
