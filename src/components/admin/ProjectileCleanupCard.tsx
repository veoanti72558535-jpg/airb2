import { useState } from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { projectileStore, flushProjectilePersistence } from '@/lib/storage';
import { toast } from 'sonner';
import { isAirgunBrand } from '@/lib/airgun-brands';
import type { Projectile } from '@/lib/types';

/**
 * Tranche Cleanup — Suppression en masse des projectiles non-airgun
 * (tout ce qui n'est ni `pellet` ni `slug`). Ces lignes proviennent
 * typiquement d'un import bullets4 contenant aussi des balles de
 * cartouches à poudre, hors scope d'un calculateur PCP.
 *
 * UX :
 *  - bouton "Scanner" → calcule un aperçu (count à supprimer)
 *  - bandeau de confirmation explicite (action irréversible)
 *  - "Supprimer définitivement" → applique `deleteWhere` sur le store,
 *    flush la persistance IDB, affiche un toast.
 *  - notifie le parent via `onCleaned` pour rafraîchir le diagnostic.
 *
 * Aucun changement moteur, aucun changement de schéma. Pure opération
 * locale sur le cache mémoire + IDB write-through.
 */
export interface ProjectileCleanupCardProps {
  onCleaned?: () => void;
}

const isAirgunProjectile = (p: Projectile): boolean =>
  p.projectileType === 'pellet' || p.projectileType === 'slug';

/**
 * Mode "whitelist marque" — supprime tout projectile dont la marque ne
 * figure pas dans `AIRGUN_BRANDS`. Conçu pour rattraper les imports
 * bullets4-db où des balles à poudre (Hornady, Nosler, Barnes…) ont été
 * stockées avec `projectileType = 'slug'` à tort. Indépendant du mode
 * "type" historique : les deux peuvent être utilisés successivement.
 */
const isPowderBrandProjectile = (p: Projectile): boolean =>
  !isAirgunBrand(p.brand);

export function ProjectileCleanupCard({ onCleaned }: ProjectileCleanupCardProps = {}) {
  const { t } = useI18n();
  const [scanned, setScanned] = useState<{ toRemove: number; total: number } | null>(null);
  const [scannedBrand, setScannedBrand] = useState<{ toRemove: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const handleScan = () => {
    const all = projectileStore.getAll();
    const toRemove = all.filter((p) => !isAirgunProjectile(p)).length;
    setScanned({ toRemove, total: all.length });
  };

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const removed = projectileStore.deleteWhere((p) => !isAirgunProjectile(p));
      await flushProjectilePersistence();
      toast.success(t('admin.cleanup.success').replace('{count}', String(removed)));
      setScanned(null);
      onCleaned?.();
    } catch (e) {
      console.error('[cleanup] failed', e);
      toast.error(t('admin.cleanup.error'));
    } finally {
      setBusy(false);
    }
  };

  const handleScanBrand = () => {
    const all = projectileStore.getAll();
    const toRemove = all.filter(isPowderBrandProjectile).length;
    setScannedBrand({ toRemove, total: all.length });
  };

  const handleConfirmBrand = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const removed = projectileStore.deleteWhere(isPowderBrandProjectile);
      await flushProjectilePersistence();
      toast.success(t('admin.cleanup.success').replace('{count}', String(removed)));
      setScannedBrand(null);
      onCleaned?.();
    } catch (e) {
      console.error('[cleanup-brand] failed', e);
      toast.error(t('admin.cleanup.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      data-testid="projectile-cleanup-card"
      className="surface-elevated p-4 space-y-3"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-destructive/10 text-destructive shrink-0">
          <Trash2 className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{t('admin.cleanup.title')}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {t('admin.cleanup.subtitle')}
          </div>
        </div>
      </div>

      {scanned == null && (
        <button
          type="button"
          data-testid="cleanup-scan-btn"
          onClick={handleScan}
          className="w-full px-3 py-2 bg-primary/10 text-primary rounded-md text-xs font-medium hover:bg-primary/20 transition-colors"
        >
          {t('admin.cleanup.scan')}
        </button>
      )}

      {scanned != null && scanned.toRemove === 0 && (
        <div
          data-testid="cleanup-empty"
          className="rounded-md border border-primary/30 bg-primary/5 p-2 text-[11px] text-primary"
        >
          {t('admin.cleanup.empty')}
        </div>
      )}

      {scanned != null && scanned.toRemove > 0 && (
        <div className="space-y-2">
          <div
            data-testid="cleanup-preview"
            className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-600 dark:text-amber-400"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div>
                {t('admin.cleanup.preview')
                  .replace('{count}', String(scanned.toRemove))
                  .replace('{total}', String(scanned.total))}
              </div>
              <div className="opacity-80">{t('admin.cleanup.confirmHint')}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="cleanup-cancel-btn"
              onClick={() => setScanned(null)}
              disabled={busy}
              className="flex-1 px-3 py-2 bg-muted text-muted-foreground rounded-md text-xs font-medium hover:bg-muted/70 transition-colors disabled:opacity-50"
            >
              {t('admin.cleanup.cancel')}
            </button>
            <button
              type="button"
              data-testid="cleanup-confirm-btn"
              onClick={handleConfirm}
              disabled={busy}
              className="flex-1 px-3 py-2 bg-destructive text-destructive-foreground rounded-md text-xs font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t('admin.cleanup.confirm')}
            </button>
          </div>
        </div>
      )}

      {/* ----- Mode whitelist marque (powder brand cleanup) ------------ */}
      <div className="border-t border-border pt-3 space-y-2">
        <div className="text-xs font-medium text-foreground">
          {t('admin.cleanup.brand.title')}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {t('admin.cleanup.brand.subtitle')}
        </div>

        {scannedBrand == null && (
          <button
            type="button"
            data-testid="cleanup-brand-scan-btn"
            onClick={handleScanBrand}
            className="w-full px-3 py-2 bg-primary/10 text-primary rounded-md text-xs font-medium hover:bg-primary/20 transition-colors"
          >
            {t('admin.cleanup.brand.scan')}
          </button>
        )}

        {scannedBrand != null && scannedBrand.toRemove === 0 && (
          <div
            data-testid="cleanup-brand-empty"
            className="rounded-md border border-primary/30 bg-primary/5 p-2 text-[11px] text-primary"
          >
            {t('admin.cleanup.brand.empty')}
          </div>
        )}

        {scannedBrand != null && scannedBrand.toRemove > 0 && (
          <div className="space-y-2">
            <div
              data-testid="cleanup-brand-preview"
              className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-600 dark:text-amber-400"
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div>
                  {t('admin.cleanup.brand.preview')
                    .replace('{count}', String(scannedBrand.toRemove))
                    .replace('{total}', String(scannedBrand.total))}
                </div>
                <div className="opacity-80">{t('admin.cleanup.brand.confirmHint')}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                data-testid="cleanup-brand-cancel-btn"
                onClick={() => setScannedBrand(null)}
                disabled={busy}
                className="flex-1 px-3 py-2 bg-muted text-muted-foreground rounded-md text-xs font-medium hover:bg-muted/70 transition-colors disabled:opacity-50"
              >
                {t('admin.cleanup.cancel')}
              </button>
              <button
                type="button"
                data-testid="cleanup-brand-confirm-btn"
                onClick={handleConfirmBrand}
                disabled={busy}
                className="flex-1 px-3 py-2 bg-destructive text-destructive-foreground rounded-md text-xs font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t('admin.cleanup.brand.confirm')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}