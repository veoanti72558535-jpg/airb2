import { Crosshair } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useUnits } from '@/hooks/use-units';
import { cn } from '@/lib/utils';
import type { ZeroIntersections } from '@/lib/zero-intersections';

/**
 * Tranche O — Bloc UI sobre Near Zero / Far Zero.
 * Purement présentationnel : reçoit le résultat du helper pur et l'affiche
 * dans l'unité de distance configurée par l'utilisateur. Aucune physique.
 */

interface Props {
  data: ZeroIntersections;
  className?: string;
  /** Use a more compact layout (for sidebar / dense surfaces). */
  dense?: boolean;
}

export function ZeroIntersectionsCard({ data, className, dense }: Props) {
  const { t } = useI18n();
  const { display, symbol } = useUnits();
  const distSym = symbol('distance');

  const fmt = (m: number) => `${display('distance', m).toFixed(1)} ${distSym}`;

  const renderSlot = (
    label: string,
    distance: number | null,
    reason: 'out-of-range' | 'insufficient' | null,
    exact: boolean,
  ) => {
    if (distance != null) {
      return (
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <span className="text-sm font-mono font-semibold text-foreground">
            {fmt(distance)}
            {exact && (
              <span
                className="ml-1 text-[9px] uppercase tracking-wide text-primary/80 align-middle"
                title={t('zeroIntersections.exactSample')}
              >
                ●
              </span>
            )}
          </span>
        </div>
      );
    }
    const msg =
      reason === 'out-of-range'
        ? t('zeroIntersections.outOfRange')
        : t('zeroIntersections.notDeterminable');
    return (
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="text-[11px] italic text-muted-foreground/80">{msg}</span>
      </div>
    );
  };

  return (
    <section
      data-testid="zero-intersections"
      aria-label={t('zeroIntersections.title')}
      className={cn(
        'rounded-xl border border-border bg-card/60',
        dense ? 'p-2.5' : 'p-3',
        className,
      )}
    >
      <header className="flex items-center gap-1.5 mb-2">
        <Crosshair className="h-3.5 w-3.5 text-primary" aria-hidden />
        <h3 className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
          {t('zeroIntersections.title')}
        </h3>
      </header>
      <div className="grid grid-cols-2 gap-3">
        {renderSlot(
          t('zeroIntersections.nearZero'),
          data.nearZeroDistance,
          data.nearMissingReason,
          data.nearExactSample,
        )}
        {renderSlot(
          t('zeroIntersections.farZero'),
          data.farZeroDistance,
          data.farMissingReason,
          data.farExactSample,
        )}
      </div>
    </section>
  );
}
