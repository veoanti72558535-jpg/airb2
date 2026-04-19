/**
 * Tranche H — Configurable ballistic table.
 *
 * Pure presentation: takes a precomputed `BallisticResult[]` and displays
 * a user-configurable table (start / max / step / columns). Never recomputes
 * physics — interpolation happens in `lib/ballistic-table.ts`.
 *
 * Mobile-first: the column toggles & range controls collapse into a sheet,
 * the table itself scrolls horizontally when the chosen columns overflow.
 */
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Settings2, RotateCcw, Crosshair } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { TranslationKey } from '@/lib/translations';
import { useUnits } from '@/hooks/use-units';
import { cn } from '@/lib/utils';
import type { BallisticResult } from '@/lib/types';
import {
  ALL_COLUMNS,
  REQUIRED_COLUMNS,
  BallisticTableColumn,
  BallisticTableConfig,
  buildTableRows,
  defaultConfig,
  isColumnVisible,
  toggleColumn,
} from '@/lib/ballistic-table';

interface Props {
  /** Engine-produced rows. Single source of truth for physics. */
  rows: BallisticResult[];
  /** Active click unit (drives holdover / clicks columns). */
  clickUnit: 'MOA' | 'MRAD';
  /** Optional energy threshold to flag overpowered rows. */
  energyThresholdJ?: number | null;
  /** Initial config (defaults to `defaultConfig(maxRange)`). */
  initialConfig?: BallisticTableConfig;
  /** Hint used to size `defaultConfig.maxDistance` when no initial config. */
  maxRangeHint?: number;
  /** Persisted callback when the user tweaks the config (optional). */
  onConfigChange?: (cfg: BallisticTableConfig) => void;
  /** Start collapsed (`false`) or expanded (`true`). */
  defaultOpen?: boolean;
  /** Optional title override; falls back to `ballisticTable.title`. */
  title?: string;
  /**
   * Tranche O — Optional Near/Far Zero distances (in metres) to highlight
   * the corresponding rows in the table. Purely visual; never recomputed.
   */
  nearZeroDistance?: number | null;
  farZeroDistance?: number | null;
}

const COLUMN_LABEL_KEYS: Record<BallisticTableColumn, TranslationKey> = {
  distance: 'ballisticTable.distance',
  drop: 'ballisticTable.drop',
  holdover: 'ballisticTable.holdover',
  elevationClicks: 'ballisticTable.elevationClicks',
  windDrift: 'ballisticTable.windDrift',
  windClicks: 'ballisticTable.windClicks',
  velocity: 'ballisticTable.velocity',
  energy: 'ballisticTable.energy',
  tof: 'ballisticTable.timeOfFlight',
};

export function BallisticTable({
  rows,
  clickUnit,
  energyThresholdJ,
  initialConfig,
  maxRangeHint,
  onConfigChange,
  defaultOpen = false,
  title,
  nearZeroDistance,
  farZeroDistance,
}: Props) {
  const { t } = useI18n();
  const { symbol } = useUnits();

  const [open, setOpen] = useState(defaultOpen);
  const [showSettings, setShowSettings] = useState(false);
  // Tranche J — composant contrôlable. Si le parent fournit `initialConfig`
  // ET un `onConfigChange`, on synchronise l'état interne sur la prop à
  // chaque rendu pour éviter toute divergence avec une grille partagée
  // (BallisticTable ↔ ReticleAssistPanel). Sinon, comportement legacy
  // non-contrôlé conservé.
  const [internalCfg, setInternalCfg] = useState<BallisticTableConfig>(
    () => initialConfig ?? defaultConfig(maxRangeHint),
  );
  const isControlled = initialConfig != null && onConfigChange != null;
  const cfg = isControlled ? initialConfig! : internalCfg;

  const updateCfg = (next: BallisticTableConfig) => {
    if (!isControlled) setInternalCfg(next);
    onConfigChange?.(next);
  };

  const distUnit = symbol('distance');
  const lengthUnit = symbol('length');
  const velUnit = symbol('velocity');
  const energyUnit = symbol('energy');

  const tableRows = useMemo(() => buildTableRows(rows, cfg), [rows, cfg]);

  // Tranche O — Détermine quelle ligne du tableau (échantillonnée à `step`)
  // est la plus proche de Near / Far Zero. Tolérance = step/2 pour ne marquer
  // qu'au plus une ligne par croisement, sans inventer un croisement absent.
  const { nearRowDistance, farRowDistance } = useMemo(() => {
    if (tableRows.length === 0) {
      return { nearRowDistance: null as number | null, farRowDistance: null as number | null };
    }
    const tol = Math.max(0.5, cfg.step / 2);
    const findClosest = (target: number | null | undefined): number | null => {
      if (target == null || !Number.isFinite(target)) return null;
      let best: number | null = null;
      let bestDelta = Infinity;
      for (const r of tableRows) {
        const d = Math.abs(r.range - target);
        if (d < bestDelta) {
          bestDelta = d;
          best = r.range;
        }
      }
      return best != null && bestDelta <= tol ? best : null;
    };
    return {
      nearRowDistance: findClosest(nearZeroDistance),
      farRowDistance: findClosest(farZeroDistance),
    };
  }, [tableRows, cfg.step, nearZeroDistance, farZeroDistance]);

  const reset = () => updateCfg(defaultConfig(maxRangeHint));

  // Header is always visible; body collapses to keep mobile screens tidy.
  return (
    <section
      data-testid="ballistic-table"
      className="rounded-xl border border-border bg-card/60 overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0 text-left">
          <Settings2 className="h-3.5 w-3.5 text-primary shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-semibold">{title ?? t('ballisticTable.title')}</div>
            <div className="text-[10px] text-muted-foreground truncate">
              {t('ballisticTable.subtitle')}
            </div>
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowSettings(s => !s)}
              aria-expanded={showSettings}
              aria-controls="ballistic-table-settings"
              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              <Settings2 className="h-3 w-3" />
              {t('ballisticTable.settings')}
            </button>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              {t('ballisticTable.resetDefaults')}
            </button>
          </div>

          {showSettings && (
            <div
              id="ballistic-table-settings"
              className="rounded-lg border border-dashed border-border bg-muted/20 p-3 space-y-3"
            >
              <div className="grid grid-cols-3 gap-2">
                <NumberField
                  label={t('ballisticTable.startDistance')}
                  value={cfg.startDistance}
                  min={0}
                  onChange={v => updateCfg({ ...cfg, startDistance: v })}
                  testId="bt-start"
                />
                <NumberField
                  label={t('ballisticTable.maxDistance')}
                  value={cfg.maxDistance}
                  min={0}
                  onChange={v => updateCfg({ ...cfg, maxDistance: v })}
                  testId="bt-max"
                />
                <NumberField
                  label={t('ballisticTable.step')}
                  value={cfg.step}
                  min={1}
                  onChange={v => updateCfg({ ...cfg, step: Math.max(1, v) })}
                  testId="bt-step"
                />
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                  {t('ballisticTable.columns')}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_COLUMNS.map(col => {
                    const required = REQUIRED_COLUMNS.includes(col);
                    const visible = isColumnVisible(cfg, col);
                    return (
                      <button
                        key={col}
                        type="button"
                        onClick={() => !required && updateCfg(toggleColumn(cfg, col))}
                        disabled={required}
                        data-testid={`bt-col-${col}`}
                        aria-pressed={visible}
                        className={cn(
                          'px-2 py-0.5 rounded text-[11px] font-medium border transition-colors',
                          visible
                            ? 'bg-primary/10 text-primary border-primary/40'
                            : 'bg-muted text-muted-foreground border-border hover:bg-muted/70',
                          required && 'opacity-60 cursor-not-allowed',
                        )}
                      >
                        {t(COLUMN_LABEL_KEYS[col])}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tableRows.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-4 text-center text-[11px] text-muted-foreground italic">
              {t('ballisticTable.empty')}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full text-xs font-mono" data-testid="bt-table">
                <thead>
                  <tr className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
                    {isColumnVisible(cfg, 'distance') && (
                      <th data-testid="bt-th-distance" className="text-left py-1.5 pr-2">
                        {t('ballisticTable.distance')}
                      </th>
                    )}
                    {isColumnVisible(cfg, 'drop') && (
                      <th data-testid="bt-th-drop" className="text-right py-1.5 px-2">
                        {t('ballisticTable.drop')} ({lengthUnit})
                      </th>
                    )}
                    {isColumnVisible(cfg, 'holdover') && (
                      <th data-testid="bt-th-holdover" className="text-right py-1.5 px-2">
                        {t('ballisticTable.holdover')} ({clickUnit})
                      </th>
                    )}
                    {isColumnVisible(cfg, 'elevationClicks') && (
                      <th data-testid="bt-th-elevationClicks" className="text-right py-1.5 px-2">
                        {t('ballisticTable.elevationClicks')}
                      </th>
                    )}
                    {isColumnVisible(cfg, 'windDrift') && (
                      <th data-testid="bt-th-windDrift" className="text-right py-1.5 px-2">
                        {t('ballisticTable.windDrift')} ({lengthUnit})
                      </th>
                    )}
                    {isColumnVisible(cfg, 'windClicks') && (
                      <th data-testid="bt-th-windClicks" className="text-right py-1.5 px-2">
                        {t('ballisticTable.windClicks')}
                      </th>
                    )}
                    {isColumnVisible(cfg, 'velocity') && (
                      <th data-testid="bt-th-velocity" className="text-right py-1.5 px-2">
                        {t('ballisticTable.velocity')} ({velUnit})
                      </th>
                    )}
                    {isColumnVisible(cfg, 'energy') && (
                      <th data-testid="bt-th-energy" className="text-right py-1.5 px-2">
                        {t('ballisticTable.energy')} ({energyUnit})
                      </th>
                    )}
                    {isColumnVisible(cfg, 'tof') && (
                      <th data-testid="bt-th-tof" className="text-right py-1.5 pl-2">
                        {t('ballisticTable.timeOfFlight')} (s)
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map(r => {
                    const overThreshold =
                      energyThresholdJ != null &&
                      energyThresholdJ > 0 &&
                      r.energy > energyThresholdJ;
                    const isNear = nearRowDistance != null && r.range === nearRowDistance;
                    const isFar = farRowDistance != null && r.range === farRowDistance;
                    const isZero = isNear || isFar;
                    return (
                      <tr
                        key={r.range}
                        data-testid={`bt-row-${r.range}`}
                        data-zero-marker={isNear ? 'near' : isFar ? 'far' : undefined}
                        className={cn(
                          'border-b border-border/20',
                          overThreshold && 'bg-destructive/10 text-destructive',
                          isZero &&
                            !overThreshold &&
                            'bg-primary/5 border-l-2 border-l-primary/60',
                        )}
                      >
                        {isColumnVisible(cfg, 'distance') && (
                          <td className="py-1.5 pr-2 font-semibold">
                            <span className="inline-flex items-center gap-1">
                              {isZero && (
                                <Crosshair
                                  className="h-3 w-3 text-primary shrink-0"
                                  aria-hidden
                                />
                              )}
                              <span>
                                {r.range}
                                {distUnit}
                              </span>
                              {isNear && (
                                <span
                                  className="text-[8px] uppercase tracking-wide font-bold text-primary/80 px-1 rounded bg-primary/10 border border-primary/30"
                                  title={t('zeroIntersections.nearZero')}
                                  aria-label={t('zeroIntersections.nearZero')}
                                >
                                  {t('ballisticTable.nearTag')}
                                </span>
                              )}
                              {isFar && (
                                <span
                                  className="text-[8px] uppercase tracking-wide font-bold text-primary/80 px-1 rounded bg-primary/10 border border-primary/30"
                                  title={t('zeroIntersections.farZero')}
                                  aria-label={t('zeroIntersections.farZero')}
                                >
                                  {t('ballisticTable.farTag')}
                                </span>
                              )}
                            </span>
                          </td>
                        )}
                        {isColumnVisible(cfg, 'drop') && (
                          <td className="text-right py-1.5 px-2">{r.drop.toFixed(1)}</td>
                        )}
                        {isColumnVisible(cfg, 'holdover') && (
                          <td className="text-right py-1.5 px-2">
                            {(clickUnit === 'MOA' ? r.holdover : r.holdoverMRAD).toFixed(2)}
                          </td>
                        )}
                        {isColumnVisible(cfg, 'elevationClicks') && (
                          <td className="text-right py-1.5 px-2">
                            {r.clicksElevation != null ? r.clicksElevation : '—'}
                          </td>
                        )}
                        {isColumnVisible(cfg, 'windDrift') && (
                          <td className="text-right py-1.5 px-2">{r.windDrift.toFixed(1)}</td>
                        )}
                        {isColumnVisible(cfg, 'windClicks') && (
                          <td className="text-right py-1.5 px-2">
                            {r.clicksWindage != null ? r.clicksWindage : '—'}
                          </td>
                        )}
                        {isColumnVisible(cfg, 'velocity') && (
                          <td className="text-right py-1.5 px-2">{r.velocity.toFixed(0)}</td>
                        )}
                        {isColumnVisible(cfg, 'energy') && (
                          <td className="text-right py-1.5 px-2">{r.energy.toFixed(1)}</td>
                        )}
                        {isColumnVisible(cfg, 'tof') && (
                          <td className="text-right py-1.5 pl-2">{r.tof.toFixed(3)}</td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  min?: number;
  onChange: (v: number) => void;
  testId?: string;
}

function NumberField({ label, value, min, onChange, testId }: NumberFieldProps) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
        {label}
      </span>
      <input
        type="number"
        value={value}
        min={min}
        onChange={e => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(v);
        }}
        data-testid={testId}
        className="w-full bg-muted/40 border border-border rounded-md px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </label>
  );
}
