import { useEffect, useState } from 'react';
import { HardDrive, AlertTriangle, CheckCircle2, Database, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import {
  getProjectileStorageDiagnostic,
  type ProjectileStorageDiagnostic,
} from '@/lib/projectile-storage-diagnostic';

/**
 * Tranche Admin Diagnostic — Bloc compact de diagnostic du backend de
 * persistance projectile. Lecture seule, aucun bouton destructif.
 *
 * S'intègre dans la zone admin/import projectile, mobile-first, libellés
 * compréhensibles pour un usage non-développeur (support self-host).
 */
export function ProjectileStorageDiagnosticCard() {
  const { t } = useI18n();
  const [diag, setDiag] = useState<ProjectileStorageDiagnostic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getProjectileStorageDiagnostic()
      .then((d) => {
        if (alive) {
          setDiag(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const triLabel = (v: 'yes' | 'no' | 'unknown') =>
    v === 'yes' ? t('admin.diag.yes') : v === 'no' ? t('admin.diag.no') : t('admin.diag.unknown');

  return (
    <div
      data-testid="projectile-storage-diagnostic"
      className="surface-elevated p-4 space-y-3"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
          <HardDrive className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{t('admin.diag.title')}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {t('admin.diag.subtitle')}
          </div>
        </div>
      </div>

      {loading || !diag ? (
        <div
          className="flex items-center gap-2 text-xs text-muted-foreground"
          data-testid="projectile-storage-diagnostic-loading"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t('admin.diag.loading')}
        </div>
      ) : (
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" />
              {t('admin.diag.backend')}
            </span>
            <span
              data-testid="diag-backend"
              className={
                diag.idb === 'available'
                  ? 'font-mono font-medium text-primary'
                  : 'font-mono font-medium text-destructive'
              }
            >
              {diag.idb === 'available'
                ? t('admin.diag.backendIdb')
                : t('admin.diag.backendDegraded')}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{t('admin.diag.migration')}</span>
            <span data-testid="diag-migration" className="font-mono font-medium">
              {diag.migration === 'migrated'
                ? t('admin.diag.migrationDone')
                : diag.migration === 'not-migrated'
                ? t('admin.diag.migrationPending')
                : t('admin.diag.unknown')}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{t('admin.diag.legacyKey')}</span>
            <span
              data-testid="diag-legacy"
              className={
                diag.legacyKeyPresent === 'yes'
                  ? 'font-mono font-medium text-amber-500'
                  : 'font-mono font-medium'
              }
            >
              {triLabel(diag.legacyKeyPresent)}
              {diag.legacyKeyByteSize != null && (
                <span className="text-muted-foreground ml-1">
                  ({Math.round(diag.legacyKeyByteSize / 1024)} kB)
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{t('admin.diag.localCount')}</span>
            <span data-testid="diag-count" className="font-mono font-medium">
              {diag.inMemoryCount}
            </span>
          </div>

          {diag.persistedCount != null && diag.persistedCount !== diag.inMemoryCount && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{t('admin.diag.persistedCount')}</span>
              <span data-testid="diag-persisted" className="font-mono font-medium">
                {diag.persistedCount}
              </span>
            </div>
          )}

          {diag.degraded && (
            <div
              data-testid="diag-degraded"
              className="mt-2 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-[11px] text-destructive"
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{t('admin.diag.degradedHint')}</span>
            </div>
          )}

          {!diag.degraded && diag.migration === 'migrated' && diag.legacyKeyPresent === 'no' && (
            <div className="mt-2 flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 p-2 text-[11px] text-primary">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{t('admin.diag.healthyHint')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
