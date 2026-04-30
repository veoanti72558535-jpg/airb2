import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { BallisticResult } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { useUnits } from '@/hooks/use-units';
import { cn } from '@/lib/utils';
import { UnitTagSurface } from '@/components/devtools/UnitTagSurface';

interface Props {
  rows: BallisticResult[];
  clickUnit: 'MOA' | 'MRAD';
  /** Optional energy threshold to flag overpowered rows. */
  energyThresholdJ?: number | null;
  /** Initial expansion state of the advanced columns. */
  defaultAdvanced?: boolean;
  /** Optional title override; falls back to `calc.rangeBreakdown`. */
  title?: string;
}

/**
 * Enriched single-session ballistic table. Essential columns are always
 * visible; advanced columns (TOF, wind drift true, spin drift, clicks) sit
 * behind a collapse so mobile readers don't get a wall of numbers.
 *
 * Reused by ComparePage (one per side) but designed to be dropped into any
 * detail view that already has a result set.
 */
export function BallisticTable({
  rows,
  clickUnit,
  energyThresholdJ,
  defaultAdvanced = false,
  title,
}: Props) {
  const { t } = useI18n();
  const { symbol } = useUnits();
  const [adv, setAdv] = useState(defaultAdvanced);

  if (!rows || rows.length === 0) {
    return (
      <div className="surface-card p-4 text-xs text-muted-foreground italic">
        {t('compare.noResults')}
      </div>
    );
  }

  const distUnit = symbol('distance');
  const lengthUnit = symbol('length');
  const velUnit = symbol('velocity');
  const energyUnit = symbol('energy');

  return (
    <div className="surface-card p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h4 className="text-xs font-heading font-semibold uppercase tracking-wide text-muted-foreground">
          {title ?? t('calc.rangeBreakdown')}
        </h4>
        <UnitTagSurface
          categories={['distance', 'length', 'velocity', 'energy']}
          label="CompareTable"
        />
        <button
          type="button"
          onClick={() => setAdv(v => !v)}
          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        >
          {adv ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {adv ? t('compare.hideAdvanced') : t('compare.showAdvanced')}
        </button>
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
              <th className="text-left py-1.5 pr-2">{t('calc.range')}</th>
              <th className="text-right py-1.5 px-2">{t('calc.drop')} ({lengthUnit})</th>
              <th className="text-right py-1.5 px-2">{t('calc.holdover')} ({clickUnit})</th>
              <th className="text-right py-1.5 px-2">{t('calc.velocity')} ({velUnit})</th>
              <th className="text-right py-1.5 px-2">{t('calc.energy')} ({energyUnit})</th>
              {adv && (
                <>
                  <th className="text-right py-1.5 px-2">{t('calc.windDrift')} ({lengthUnit})</th>
                  <th className="text-right py-1.5 px-2">{t('calc.tof')} (s)</th>
                  <th className="text-right py-1.5 px-2">{t('calc.spinDrift')} ({lengthUnit})</th>
                  <th className="text-right py-1.5 pl-2">{t('calc.clicksElev')}</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const isOverThreshold =
                energyThresholdJ != null && energyThresholdJ > 0 && r.energy > energyThresholdJ;
              return (
                <tr
                  key={r.range}
                  className={cn(
                    'border-b border-border/20',
                    isOverThreshold && 'bg-destructive/10 text-destructive',
                  )}
                >
                  <td className="py-1.5 pr-2 font-semibold">
                    {r.range}{distUnit}
                  </td>
                  <td className="text-right py-1.5 px-2">{r.drop.toFixed(1)}</td>
                  <td className="text-right py-1.5 px-2">
                    {(clickUnit === 'MOA' ? r.holdover : r.holdoverMRAD).toFixed(2)}
                  </td>
                  <td className="text-right py-1.5 px-2">{r.velocity.toFixed(0)}</td>
                  <td className="text-right py-1.5 px-2">{r.energy.toFixed(1)}</td>
                  {adv && (
                    <>
                      <td className="text-right py-1.5 px-2">{r.windDrift.toFixed(1)}</td>
                      <td className="text-right py-1.5 px-2">{r.tof.toFixed(3)}</td>
                      <td className="text-right py-1.5 px-2">
                        {r.spinDrift != null ? r.spinDrift.toFixed(1) : '—'}
                      </td>
                      <td className="text-right py-1.5 pl-2">
                        {r.clicksElevation != null ? r.clicksElevation : '—'}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
