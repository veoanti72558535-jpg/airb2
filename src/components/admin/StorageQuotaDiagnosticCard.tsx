import { useEffect, useState } from 'react';
import { Gauge, AlertTriangle, CheckCircle2, Loader2, Info } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import {
  getStorageQuotaDiagnostic,
  formatBytesMB,
  type StorageQuotaDiagnostic,
} from '@/lib/storage-quota-diagnostic';

/**
 * Tranche Admin Storage — Diagnostic global de capacité navigateur.
 * Lecture seule, compact, mobile-first. Aucune action destructive.
 * Affiche honnêtement quand l'API n'est pas supportée.
 */
export interface StorageQuotaDiagnosticCardProps {
  /** Compteur opaque pour forcer une relecture depuis le parent. */
  refreshKey?: number;
}

export function StorageQuotaDiagnosticCard({
  refreshKey = 0,
}: StorageQuotaDiagnosticCardProps = {}) {
  const { t } = useI18n();
  const [diag, setDiag] = useState<StorageQuotaDiagnostic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getStorageQuotaDiagnostic()
      .then((d) => {
        if (!alive) return;
        setDiag(d);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  return (
    <div data-testid="storage-quota-diagnostic" className="surface-elevated p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
          <Gauge className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{t('admin.quotaDiag.title')}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {t('admin.quotaDiag.subtitle')}
          </div>
        </div>
      </div>

      {loading || !diag ? (
        <div
          className="flex items-center gap-2 text-xs text-muted-foreground"
          data-testid="storage-quota-loading"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t('admin.diag.loading')}
        </div>
      ) : !diag.supported ? (
        <div
          data-testid="storage-quota-unsupported"
          className="flex items-start gap-2 rounded-md border border-muted-foreground/30 bg-muted/30 p-2 text-[11px] text-muted-foreground"
        >
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{t('admin.quotaDiag.unsupportedHint')}</span>
        </div>
      ) : (
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{t('admin.quotaDiag.supported')}</span>
            <span data-testid="storage-quota-supported" className="font-mono font-medium text-primary">
              {t('admin.diag.yes')}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{t('admin.quotaDiag.usage')}</span>
            <span data-testid="storage-quota-usage" className="font-mono font-medium">
              {formatBytesMB(diag.usageBytes)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{t('admin.quotaDiag.quota')}</span>
            <span data-testid="storage-quota-total" className="font-mono font-medium">
              {formatBytesMB(diag.quotaBytes)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{t('admin.quotaDiag.percent')}</span>
            <span
              data-testid="storage-quota-percent"
              className={
                diag.severity === 'critical'
                  ? 'font-mono font-medium text-destructive'
                  : diag.severity === 'watch'
                  ? 'font-mono font-medium text-amber-500'
                  : 'font-mono font-medium'
              }
            >
              {diag.usagePercent != null ? `${diag.usagePercent} %` : '—'}
            </span>
          </div>

          {/* Progress bar visuelle, uniquement si calculable */}
          {diag.usagePercent != null && (
            <div
              className="h-1.5 w-full rounded-full bg-muted overflow-hidden"
              role="progressbar"
              aria-valuenow={diag.usagePercent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                data-testid="storage-quota-bar"
                className={
                  diag.severity === 'critical'
                    ? 'h-full bg-destructive transition-all'
                    : diag.severity === 'watch'
                    ? 'h-full bg-amber-500 transition-all'
                    : 'h-full bg-primary transition-all'
                }
                style={{ width: `${Math.max(2, diag.usagePercent)}%` }}
              />
            </div>
          )}

          {diag.severity === 'critical' && (
            <div
              data-testid="storage-quota-critical"
              className="mt-2 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-[11px] text-destructive"
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{t('admin.quotaDiag.criticalHint')}</span>
            </div>
          )}

          {diag.severity === 'watch' && (
            <div
              data-testid="storage-quota-watch"
              className="mt-2 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-600 dark:text-amber-400"
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{t('admin.quotaDiag.watchHint')}</span>
            </div>
          )}

          {diag.severity === 'normal' && (
            <div
              data-testid="storage-quota-normal"
              className="mt-2 flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 p-2 text-[11px] text-primary"
            >
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{t('admin.quotaDiag.normalHint')}</span>
            </div>
          )}

          <div className="text-[10px] text-muted-foreground italic pt-1">
            {t('admin.quotaDiag.estimateDisclaimer')}
          </div>
        </div>
      )}
    </div>
  );
}