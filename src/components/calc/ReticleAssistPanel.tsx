/**
 * Tranche I — Assistant de correction réticule (UI).
 *
 * Panneau sobre, mobile-first, placé sous la table balistique. Lit la
 * structure pure produite par `buildReticleAssist` et l'affiche. Aucun
 * recalcul moteur, aucune subtension dynamique.
 */
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Crosshair, AlertTriangle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { BallisticResult, Optic } from '@/lib/types';
import { reticleStore } from '@/lib/storage';
import {
  buildReticleAssist,
  type ReticleAssist,
} from '@/lib/reticle-assist';

interface Props {
  /** Optique sélectionnée — peut être absente. */
  optic?: Optic | null;
  /** Résultats du moteur (source de vérité). */
  results: BallisticResult[];
  /** Distances à matérialiser (typiquement issues de la table balistique). */
  distances: number[];
  /** Replié par défaut pour ne pas saturer mobile. */
  defaultOpen?: boolean;
}

export function ReticleAssistPanel({
  optic,
  results,
  distances,
  defaultOpen = false,
}: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(defaultOpen);

  const assist: ReticleAssist = useMemo(
    () =>
      buildReticleAssist({
        optic: optic ?? null,
        getReticleById: id => reticleStore.getById(id),
        results,
        distances,
      }),
    [optic, results, distances],
  );

  const unitLabel = assist.unit === 'MOA' ? t('reticleAssist.moa') : t('reticleAssist.mrad');

  return (
    <section
      data-testid="reticle-assist"
      data-status={assist.status}
      className="rounded-xl border border-border bg-card/60 overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0 text-left">
          <Crosshair className="h-3.5 w-3.5 text-primary shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-semibold">{t('reticleAssist.title')}</div>
            <div className="text-[10px] text-muted-foreground truncate">
              {assist.status === 'ok'
                ? `${t('reticleAssist.subtitle')} · ${unitLabel}`
                : t('reticleAssist.subtitle')}
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
          {assist.status === 'no-optic' && (
            <EmptyState
              testId="ra-empty-no-optic"
              message={t('reticleAssist.noOptic')}
            />
          )}
          {assist.status === 'no-reticle' && (
            <EmptyState
              testId="ra-empty-no-reticle"
              message={t('reticleAssist.noReticle')}
            />
          )}
          {assist.status === 'reticle-missing' && (
            <EmptyState
              testId="ra-empty-reticle-missing"
              message={t('reticleAssist.reticleMissing')}
              tone="warning"
            />
          )}

          {assist.status === 'ok' && (
            <>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                <span className="inline-flex items-center px-2 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary uppercase tracking-wide">
                  {t('reticleAssist.unit')} : {unitLabel}
                </span>
                {assist.reticle && (
                  <span className="text-muted-foreground truncate">
                    {assist.reticle.brand} {assist.reticle.model}
                  </span>
                )}
              </div>

              {assist.degraded === 'sfp-unsupported' && (
                <div
                  data-testid="ra-degraded-sfp"
                  className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-400"
                >
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{t('reticleAssist.notAvailable')}</span>
                </div>
              )}
              {assist.degraded === 'no-marks' && assist.unit && (
                <div
                  data-testid="ra-degraded-nomarks"
                  className="rounded-md border border-dashed border-border bg-muted/20 p-2 text-[11px] text-muted-foreground"
                >
                  {t('reticleAssist.noMarks', { unit: unitLabel })}
                </div>
              )}

              {assist.rows.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-4 text-center text-[11px] text-muted-foreground italic">
                  {t('reticleAssist.none')}
                </div>
              ) : (
                <div className="overflow-x-auto -mx-1 px-1">
                  <table
                    className="w-full text-xs font-mono"
                    data-testid="ra-table"
                  >
                    <thead>
                      <tr className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
                        <th className="text-left py-1.5 pr-2">
                          {t('ballisticTable.distance')}
                        </th>
                        <th className="text-right py-1.5 px-2">
                          {t('reticleAssist.vertical')} ({unitLabel})
                        </th>
                        <th className="text-right py-1.5 px-2">
                          {t('reticleAssist.wind')} ({unitLabel})
                        </th>
                        {assist.degraded !== 'no-marks' &&
                          assist.degraded !== 'sfp-unsupported' && (
                            <th className="text-right py-1.5 pl-2">
                              {t('reticleAssist.nearestMark')}
                            </th>
                          )}
                      </tr>
                    </thead>
                    <tbody>
                      {assist.rows.map(r => (
                        <tr
                          key={r.distance}
                          data-testid={`ra-row-${r.distance}`}
                          className="border-b border-border/20"
                        >
                          <td className="py-1.5 pr-2 font-semibold">{r.distance}m</td>
                          <td className="text-right py-1.5 px-2">
                            {r.vertical.toFixed(2)}
                          </td>
                          <td className="text-right py-1.5 px-2">
                            {r.wind.toFixed(2)}
                          </td>
                          {assist.degraded !== 'no-marks' &&
                            assist.degraded !== 'sfp-unsupported' && (
                              <td className="text-right py-1.5 pl-2 text-muted-foreground">
                                {r.nearestMark != null
                                  ? r.nearestMark.toFixed(2)
                                  : r.betweenMarks
                                    ? `${r.betweenMarks[0].toFixed(2)}–${r.betweenMarks[1].toFixed(2)}`
                                    : '—'}
                              </td>
                            )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

function EmptyState({
  message,
  testId,
  tone = 'muted',
}: {
  message: string;
  testId: string;
  tone?: 'muted' | 'warning';
}) {
  return (
    <div
      data-testid={testId}
      className={cn(
        'rounded-md border p-3 text-[11px]',
        tone === 'warning'
          ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400'
          : 'border-dashed border-border bg-muted/20 text-muted-foreground italic',
      )}
    >
      {message}
    </div>
  );
}
