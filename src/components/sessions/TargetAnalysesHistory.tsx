/**
 * TargetAnalysesHistory — lists previous target-photo analyses linked to a
 * session via the `field_measurements` table (rows whose `conditions.source`
 * equals `target-photo-analyzer`).
 *
 * Read-only, fire-and-forget: if Supabase is not configured or the user is
 * signed-out, the section quietly hides. Errors are logged but never break
 * the page.
 */
import { useEffect, useState } from 'react';
import { Camera, Loader2, AlertTriangle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import {
  getFieldMeasurements,
  type FieldMeasurement,
} from '@/lib/field-measurements-repo';
import { cn } from '@/lib/utils';

interface Props {
  sessionId: string;
  /** Optional bump to force refetch (increment after a new analysis is linked). */
  refreshKey?: number;
}

interface ConditionsShape {
  source?: string;
  confidence?: number;
  groupSizeMm?: number;
  shotCount?: number | null;
}

function isTargetAnalysis(m: FieldMeasurement): boolean {
  const c = (m.conditions ?? {}) as ConditionsShape;
  return c.source === 'target-photo-analyzer';
}

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function confidenceTone(conf: number): string {
  if (conf >= 0.75) return 'bg-primary/15 text-primary border-primary/30';
  if (conf >= 0.5) return 'bg-warning/15 text-warning-foreground border-warning/40';
  return 'bg-destructive/15 text-destructive border-destructive/30';
}

export function TargetAnalysesHistory({ sessionId, refreshKey = 0 }: Props) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [items, setItems] = useState<FieldMeasurement[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id || !sessionId) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    void getFieldMeasurements(sessionId, user.id)
      .then(rows => {
        if (cancelled) return;
        setItems(rows.filter(isTargetAnalysis));
      })
      .catch(err => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'unknown-error');
        setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, user?.id, refreshKey]);

  // Hide entirely when nothing useful to show (no auth, no Supabase, or empty)
  if (!user?.id) return null;
  if (items != null && items.length === 0 && !loading && !error) return null;

  return (
    <section
      data-testid="target-analyses-history"
      className="rounded-md border border-border bg-card/50 p-3 space-y-2"
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Camera className="h-3.5 w-3.5 text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wide">
            {t('targetHistory.title' as any)}
          </h3>
        </div>
        {items && items.length > 0 && (
          <span className="text-[10px] text-muted-foreground font-mono">
            {items.length}
          </span>
        )}
      </header>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          {t('targetHistory.loading' as any)}
        </div>
      )}

      {error && (
        <p className="flex items-start gap-1.5 text-[11px] text-destructive">
          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{t('targetHistory.error' as any)}</span>
        </p>
      )}

      {items && items.length > 0 && (
        <ul className="space-y-1.5" data-testid="target-analyses-list">
          {items.map(m => {
            const c = (m.conditions ?? {}) as ConditionsShape;
            const conf = typeof c.confidence === 'number' ? c.confidence : null;
            const groupMm = typeof c.groupSizeMm === 'number' ? c.groupSizeMm : null;
            const shots = typeof c.shotCount === 'number' ? c.shotCount : null;
            const drop = m.measuredDropMm;
            const wind = m.measuredWindageMm;
            const cleanNote = (m.notes ?? '')
              .replace(/^\[target-photo-analyzer\]\s*/, '')
              .trim();
            return (
              <li
                key={m.id ?? `${m.measuredAt}-${m.distanceM}`}
                data-testid="target-analyses-item"
                className="rounded border border-border bg-background/40 p-2 space-y-1"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {fmtDate(m.measuredAt ?? m.createdAt)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wide border border-border bg-muted">
                      {m.distanceM} m
                    </span>
                    {conf != null && (
                      <span
                        data-testid="target-analyses-confidence"
                        className={cn(
                          'inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wide border',
                          confidenceTone(conf),
                        )}
                      >
                        {Math.round(conf * 100)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-mono">
                  {groupMm != null && (
                    <span>
                      <span className="text-muted-foreground">
                        {t('targetHistory.group' as any)}:
                      </span>{' '}
                      {groupMm.toFixed(1)} mm
                    </span>
                  )}
                  {shots != null && (
                    <span>
                      <span className="text-muted-foreground">
                        {t('targetHistory.shots' as any)}:
                      </span>{' '}
                      {shots}
                    </span>
                  )}
                  {drop != null && (
                    <span>
                      <span className="text-muted-foreground">
                        {t('targetHistory.drop' as any)}:
                      </span>{' '}
                      {drop.toFixed(1)} mm
                    </span>
                  )}
                  {wind != null && (
                    <span>
                      <span className="text-muted-foreground">
                        {t('targetHistory.windage' as any)}:
                      </span>{' '}
                      {wind.toFixed(1)} mm
                    </span>
                  )}
                </div>
                {cleanNote && (
                  <p className="text-[11px] italic text-foreground/70 line-clamp-2">
                    {cleanNote}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}