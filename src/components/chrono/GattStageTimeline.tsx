import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { GattStage, GattStageEvent } from '@/lib/chrono/fx-radar-ble';

interface Props {
  /** Ordered stages to render. */
  order: GattStage[];
  /** Latest event per stage. */
  stages: Record<GattStage, GattStageEvent | undefined>;
  /** Top-level error message to surface above the timeline. */
  error?: string;
}

/**
 * Visual timeline of GATT pipeline stages — used by `ChronoConnectButton`
 * to show exactly which step succeeded, is in progress, or failed.
 */
export default function GattStageTimeline({ order, stages, error }: Props) {
  const { t } = useI18n();

  const stageLabel = (s: GattStage) =>
    t(`chrono.gatt.stage.${s}` as Parameters<typeof t>[0]);

  const stageIcon = (event: GattStageEvent | undefined) => {
    if (!event)            return <Circle className="h-3.5 w-3.5 text-muted-foreground" />;
    if (event.status === 'ok')          return <CheckCircle2 className="h-3.5 w-3.5 text-primary" />;
    if (event.status === 'in-progress') return <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />;
    if (event.status === 'error')       return <XCircle className="h-3.5 w-3.5 text-destructive" />;
    return <Circle className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const lineColor = (event: GattStageEvent | undefined): string => {
    if (!event)                          return 'border-border';
    if (event.status === 'ok')           return 'border-primary/40';
    if (event.status === 'error')        return 'border-destructive/40';
    return 'border-primary/30';
  };

  // Detect whether any stage is non-pending — otherwise the panel is hidden.
  const hasAnyEvent = order.some((s) => stages[s] !== undefined);
  if (!hasAnyEvent && !error) return null;

  return (
    <div
      className="rounded-md border border-border bg-muted/30 p-2.5 space-y-2 text-xs"
      data-testid="gatt-stage-timeline"
      role="status"
      aria-live="polite"
    >
      <p className="font-semibold text-foreground">
        {t('chrono.gatt.title')}
      </p>
      <ol className="space-y-1.5">
        {order.map((s, idx) => {
          const ev = stages[s];
          const isLast = idx === order.length - 1;
          return (
            <li
              key={s}
              className="flex items-start gap-2"
              data-testid={`gatt-stage-${s}`}
              data-status={ev?.status ?? 'pending'}
            >
              <div className="flex flex-col items-center shrink-0">
                {stageIcon(ev)}
                {!isLast && (
                  <div className={`w-px flex-1 min-h-[10px] border-l ${lineColor(ev)}`} />
                )}
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={
                    ev?.status === 'error'
                      ? 'text-destructive font-medium'
                      : ev?.status === 'ok'
                        ? 'text-foreground'
                        : ev?.status === 'in-progress'
                          ? 'text-primary'
                          : 'text-muted-foreground'
                  }>
                    {stageLabel(s)}
                  </span>
                  {ev?.status === 'in-progress' && (
                    <span className="text-[10px] text-primary uppercase tracking-wide">
                      {t('chrono.gatt.status.inProgress')}
                    </span>
                  )}
                  {ev?.status === 'ok' && (
                    <span className="text-[10px] text-primary uppercase tracking-wide">
                      {t('chrono.gatt.status.ok')}
                    </span>
                  )}
                  {ev?.status === 'error' && (
                    <span className="text-[10px] text-destructive uppercase tracking-wide">
                      {t('chrono.gatt.status.error')}
                    </span>
                  )}
                </div>
                {ev?.detail && (
                  <div className="text-[10px] font-mono text-muted-foreground break-all">
                    {ev.detail}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {error && (
        <div className="flex items-start gap-2 p-2 rounded bg-destructive/10 text-destructive text-[11px]">
          <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span className="break-all">{error}</span>
        </div>
      )}
    </div>
  );
}
