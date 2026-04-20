import React, { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { Upload, X, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ImportPreview } from './ImportPreview';
import {
  runImportPreview,
  MAX_PAYLOAD_BYTES,
  type ImportPreview as ImportPreviewType,
  type NormalisedOptic,
  type NormalisedProjectile,
  type NormalisedReticle,
} from '@/lib/import-pipeline';
import type { ImportEntityType } from '@/lib/import-schemas';
import {
  projectileStore,
  opticStore,
  reticleStore,
  StorageQuotaExceededError,
  flushProjectilePersistence,
} from '@/lib/storage';
import type { ImportSource } from '@/lib/types';

/**
 * Tranche F.3 — Modal d'import JSON générique.
 *
 * Workflow non contournable :
 *   1. l'utilisateur sélectionne un fichier JSON
 *   2. clic sur « Aperçu » → exécution de la pipeline F.2 (pure, dry-run)
 *   3. affichage de `ImportPreview` (rejected → sanitized → duplicate → ok)
 *   4. clic sur « Importer N » → write réel uniquement de `ok` + `sanitized`
 *
 * AUCUN write avant confirmation.
 * Les `duplicate` et `rejected` ne sont JAMAIS écrits.
 * La pipeline F.2 reste l'unique source de vérité — pas de revalidation ici.
 */
export interface ImportJsonModalProps {
  entityType: ImportEntityType;
  source: ImportSource;
  open: boolean;
  onClose: () => void;
  onSuccess?: (writtenCount: number) => void;
}

export function ImportJsonModal({
  entityType,
  source,
  open,
  onClose,
  onSuccess,
}: ImportJsonModalProps) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreviewType | null>(null);
  // Tranche Import UX — états distincts pour rendre l'UX honnête :
  //  - idle      : preview prête, en attente de clic
  //  - writing   : createMany() en cours (cache mémoire)
  //  - persisting: write IDB en cours (write-through async)
  //  - error     : la persistance a échoué — preview CONSERVÉE, retry possible
  type Phase = 'idle' | 'writing' | 'persisting' | 'error';
  const [phase, setPhase] = useState<Phase>('idle');
  const [persistError, setPersistError] = useState<string | null>(null);
  const isCommitting = phase === 'writing' || phase === 'persisting';
  // Tranche Import UX — ref miroir de `phase` lisible dans le catch async
  // (où la valeur du closure est figée au moment du await).
  const phaseRef = useRef<Phase>('idle');
  const setPhaseSafe = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const reset = useCallback(() => {
    setFileName(null);
    setRawText(null);
    setPreview(null);
    setPhaseSafe('idle');
    setPersistError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [setPhaseSafe]);

  const handleClose = useCallback(() => {
    // Garde-fou : pendant la persistance, on ne ferme pas (évite double commit
    // + perte de la preview avant confirmation IDB).
    if (isCommitting) return;
    reset();
    onClose();
  }, [isCommitting, onClose, reset]);

  const handleFile = useCallback((file: File) => {
    setPreview(null);
    if (file.size > MAX_PAYLOAD_BYTES) {
      toast.error(t('import.fileTooLarge'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      setFileName(file.name);
      setRawText(text);
    };
    reader.onerror = () => {
      toast.error(t('import.fileInvalid'));
    };
    reader.readAsText(file);
  }, [t]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handlePreview = useCallback(() => {
    if (!rawText) return;
    const result = runImportPreview(entityType, rawText, { source });
    setPreview(result);
  }, [entityType, rawText, source]);

  const writableCount = preview
    ? preview.okCount + preview.sanitizedCount
    : 0;

  const handleConfirm = useCallback(async () => {
    if (!preview || writableCount === 0) return;
    if (isCommitting) return; // double-submit guard
    setPersistError(null);
    setPhaseSafe('writing');
    try {
      // Bulk insert : un seul localStorage write quel que soit N. Sans cela,
      // un import massif (ex. bullets4 ~8700 projectiles) effectue O(N²)
      // de sérialisation et crash le tab.
      const writable = preview.items.filter(
        (item) =>
          (item.status === 'ok' || item.status === 'sanitized') && !!item.data,
      );
      let written = 0;
      if (preview.entityType === 'projectile') {
        const data = writable.map((i) => i.data as NormalisedProjectile);
        written = projectileStore.createMany(data).length;
        // Tranche Import UX — pour les projectiles, on attend la confirmation
        // réelle d'écriture IDB AVANT de déclarer succès. Sans cela, un import
        // massif (~8700 projectiles) annoncerait un succès alors que le write
        // IDB peut encore échouer (quota, IDB indisponible, …).
        setPhaseSafe('persisting');
        await flushProjectilePersistence();
      } else if (preview.entityType === 'optic') {
        const data = writable.map((i) => i.data as NormalisedOptic);
        written = opticStore.createMany(data).length;
      } else if (preview.entityType === 'reticle') {
        const data = writable.map((i) => i.data as NormalisedReticle);
        written = reticleStore.createMany(data).length;
      }
      toast.success(t('import.success', { count: written }));
      onSuccess?.(written);
      handleClose();
    } catch (e) {
      if (e instanceof StorageQuotaExceededError) {
        // Message actionnable : l'utilisateur doit purger ou exporter avant
        // de réessayer. Ne pas perdre la preview pour qu'il puisse retenter.
        toast.error(t('import.quotaExceeded'), { duration: 8000 });
        setPhaseSafe('idle');
      } else if (phaseRef.current === 'persisting') {
        // Échec IDB : on NE déclare PAS de succès, on conserve la preview,
        // et on affiche un message actionnable. L'utilisateur peut réessayer.
        const msg = e instanceof Error ? e.message : String(e);
        setPersistError(msg);
        setPhaseSafe('error');
        toast.error(t('import.persistFailed'), { duration: 8000 });
      } else {
        toast.error(e instanceof Error ? e.message : t('import.fileInvalid'));
        setPhaseSafe('idle');
      }
    }
  }, [handleClose, isCommitting, onSuccess, preview, setPhaseSafe, t, writableCount]);

  const titleKey = useMemo(() => {
    if (entityType === 'projectile') return 'import.title.projectiles';
    if (entityType === 'optic') return 'import.title.optics';
    return 'import.title.reticles';
  }, [entityType]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            {t(titleKey as never)}
          </DialogTitle>
          <DialogDescription>{t('admin.import.sectionDesc')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Étape 1 — fichier */}
          <div className="surface-elevated p-3 space-y-2">
            <label
              htmlFor="import-file-input"
              className="text-xs text-muted-foreground"
            >
              {t('import.selectFile')}
            </label>
            <input
              ref={fileInputRef}
              id="import-file-input"
              data-testid="import-file-input"
              type="file"
              accept="application/json,.json"
              onChange={onFileChange}
              className="block w-full text-xs file:mr-2 file:py-1.5 file:px-2 file:rounded-md file:border-0 file:bg-primary/10 file:text-primary file:text-xs file:font-medium"
            />
            {fileName && (
              <div className="text-[11px] text-muted-foreground truncate">
                {fileName}
              </div>
            )}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              data-testid="import-preview-btn"
              disabled={!rawText}
              onClick={handlePreview}
            >
              {t('import.preview')}
            </Button>
          </div>

          {/* Étape 2 — preview */}
          {preview ? (
            <ImportPreview preview={preview} />
          ) : (
            <div className="text-[11px] text-muted-foreground italic px-1">
              {t('import.previewRequired')}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            data-testid="import-cancel-btn"
            disabled={isCommitting}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            {t('import.cancel')}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!preview || writableCount === 0 || isCommitting}
            onClick={handleConfirm}
            data-testid="import-confirm-btn"
          >
            {phase === 'writing' ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t('import.writing')}
              </span>
            ) : phase === 'persisting' ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t('import.persisting')}
              </span>
            ) : preview && writableCount > 0 ? (
              t('import.writeCount', { count: writableCount })
            ) : (
              t('import.nothingToImport')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
