import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Crosshair, Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { useI18n } from '@/lib/i18n';
import { reticleStore } from '@/lib/storage';
import { NotFoundDetail } from '@/components/library/NotFoundDetail';
import { DetailRow, DetailSection } from '@/components/library/DetailLayout';
import {
  RETICLE_IMAGE_ACCEPTED_MIME,
  ReticleImageError,
  fileToReticleImageDataUrl,
} from '@/lib/reticle-image';
import type { Reticle } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

/**
 * Tranche F.4 — Page détail réticule.
 *
 * Affiche les champs canoniques + l'image principale optionnelle, et offre
 * trois actions sur l'image : upload, remplacement, suppression. Aucune
 * édition avancée (crop, galerie, EXIF, drag avancé) — V1 délibérée.
 */
export default function ReticleDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { t, locale } = useI18n();
  const [reticle, setReticle] = useState<Reticle | undefined>(() => reticleStore.getById(id));
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  if (!reticle) return <NotFoundDetail />;

  const date = (iso: string) =>
    new Date(iso).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });

  const onPickFile = () => fileRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const processFile = async (file: File) => {
    setBusy(true);
    try {
      const dataUrl = await fileToReticleImageDataUrl(file);
      const updated = reticleStore.update(reticle.id, { imageDataUrl: dataUrl });
      if (updated) setReticle(updated);
      toast({ title: t('common.save') });
    } catch (err) {
      if (err instanceof ReticleImageError) {
        if (err.code === 'invalid-type') toast({ title: t('reticles.image.invalidType'), variant: 'destructive' });
        else if (err.code === 'too-large') toast({ title: t('reticles.image.tooLarge'), variant: 'destructive' });
        else toast({ title: t('reticles.image.processError'), variant: 'destructive' });
      } else {
        toast({ title: t('reticles.image.processError'), variant: 'destructive' });
      }
    } finally {
      setBusy(false);
    }
  };

  const removeImage = () => {
    const updated = reticleStore.update(reticle.id, { imageDataUrl: undefined });
    if (updated) setReticle(updated);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4 pb-8"
    >
      <Link
        to="/library/reticles"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('reticles.backToList')}
      </Link>

      <header className="surface-elevated p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 shrink-0">
            <Crosshair className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-heading font-bold leading-tight truncate">
              {reticle.brand} {reticle.model}
            </h1>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="tactical-badge">{reticle.type}</span>
              <span className="tactical-badge">
                {reticle.subtension} {reticle.unit}
              </span>
              {reticle.focalPlane && <span className="tactical-badge">{reticle.focalPlane}</span>}
              {reticle.importedFrom && (
                <span className="tactical-badge">{reticle.importedFrom}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Image principale */}
      <DetailSection title={t('reticles.image')}>
        <div
          className="aspect-video w-full rounded-md overflow-hidden bg-muted border border-border flex items-center justify-center mb-3"
          data-testid="reticle-image-area"
        >
          {reticle.imageDataUrl ? (
            <img
              src={reticle.imageDataUrl}
              alt={`${reticle.brand} ${reticle.model}`}
              className="h-full w-full object-contain"
              data-testid="reticle-image"
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <ImageIcon className="h-8 w-8" />
              <span className="text-xs">{t('reticles.image.none')}</span>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={RETICLE_IMAGE_ACCEPTED_MIME.join(',')}
          onChange={onFileChange}
          className="hidden"
          data-testid="reticle-image-input"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onPickFile}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
            data-testid="reticle-image-upload-btn"
          >
            <Upload className="h-3.5 w-3.5" />
            {reticle.imageDataUrl ? t('reticles.image.replace') : t('reticles.image.upload')}
          </button>
          {reticle.imageDataUrl && (
            <button
              type="button"
              onClick={removeImage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted text-foreground text-sm font-medium hover:bg-muted/70"
              data-testid="reticle-image-remove-btn"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t('reticles.image.remove')}
            </button>
          )}
        </div>
      </DetailSection>

      <DetailSection title={t('detail.essentials')}>
        <DetailRow label={t('reticles.brand')} value={reticle.brand} />
        <DetailRow label={t('reticles.model')} value={reticle.model} />
        <DetailRow label={t('reticles.type')} value={reticle.type} />
        <DetailRow label={t('reticles.unit')} value={reticle.unit} />
        <DetailRow label={t('reticles.subtension')} value={`${reticle.subtension} ${reticle.unit}`} />
        <DetailRow label={t('reticles.focalPlane')} value={reticle.focalPlane} />
        {reticle.importedFrom && (
          <DetailRow label={t('reticles.importedFrom')} value={reticle.importedFrom} />
        )}
      </DetailSection>

      {reticle.marks && reticle.marks.length > 0 && (
        <DetailSection title={t('reticles.marks')}>
          <p className="text-sm font-mono text-muted-foreground">
            {reticle.marks.join(', ')}
          </p>
        </DetailSection>
      )}

      {reticle.notes && (
        <DetailSection title={t('airguns.notes')}>
          <p className="text-sm text-muted-foreground italic whitespace-pre-wrap">
            {reticle.notes}
          </p>
        </DetailSection>
      )}

      <DetailSection title={t('detail.metadata')}>
        <DetailRow label={t('detail.createdAt')} value={date(reticle.createdAt)} />
        <DetailRow label={t('detail.updatedAt')} value={date(reticle.updatedAt)} />
      </DetailSection>
    </motion.div>
  );
}
