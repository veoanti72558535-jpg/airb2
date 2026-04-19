import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crosshair, Image as ImageIcon, Link2Off, Pencil, ExternalLink, Plus } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { reticleStore } from '@/lib/storage';
import type { Reticle } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * Tranche G — Liaison Optic ↔ Reticle.
 *
 * Composant contrôlé : reçoit `reticleId` et émet `onChange(nextId | undefined)`.
 * - aucun calcul moteur
 * - une seule source de vérité : `reticleStore`
 * - gère 3 états : aucun lien / réticule présent / réticule introuvable
 */
interface Props {
  reticleId?: string;
  onChange: (next: string | undefined) => void;
  /** Si `false`, masque les actions (lecture seule). */
  editable?: boolean;
  /** Si présent, propose un lien vers le détail du réticule (par défaut: oui). */
  showOpenLink?: boolean;
}

export function OpticReticleLink({
  reticleId,
  onChange,
  editable = true,
  showOpenLink = true,
}: Props) {
  const { t } = useI18n();
  const [pickerOpen, setPickerOpen] = useState(false);

  const all = useMemo<Reticle[]>(
    () => reticleStore.getAll().sort(
      (a, b) => a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model),
    ),
    [pickerOpen],
  );

  const linked = reticleId ? all.find(r => r.id === reticleId) : undefined;
  const linkedMissing = !!reticleId && !linked;

  const handleSelect = (id: string) => {
    onChange(id);
    setPickerOpen(false);
  };

  const handleUnlink = () => onChange(undefined);

  return (
    <div className="space-y-2" data-testid="optic-reticle-link">
      {/* État A : aucun lien */}
      {!reticleId && (
        <div
          className="flex items-center justify-between gap-3 rounded-md border border-dashed border-border bg-muted/30 px-3 py-2"
          data-testid="optic-reticle-none"
        >
          <span className="text-sm text-muted-foreground">
            {t('optics.reticle.none')}
          </span>
          {editable && (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
              data-testid="optic-reticle-link-btn"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('optics.reticle.link')}
            </button>
          )}
        </div>
      )}

      {/* État C : lien cassé */}
      {linkedMissing && (
        <div
          className="flex items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2"
          data-testid="optic-reticle-missing"
        >
          <span className="text-sm text-destructive">
            {t('optics.reticle.notFound')}
          </span>
          {editable && (
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs font-medium hover:bg-muted/70"
                data-testid="optic-reticle-change-btn"
              >
                <Pencil className="h-3.5 w-3.5" />
                {t('optics.reticle.change')}
              </button>
              <button
                type="button"
                onClick={handleUnlink}
                className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
                data-testid="optic-reticle-unlink-btn"
              >
                <Link2Off className="h-3.5 w-3.5" />
                {t('optics.reticle.unlink')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* État B : réticule lié et trouvé */}
      {linked && (
        <div
          className="flex items-start gap-3 rounded-md border border-border bg-muted/20 p-3"
          data-testid="optic-reticle-linked"
        >
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-muted flex items-center justify-center">
            {linked.imageDataUrl ? (
              <img
                src={linked.imageDataUrl}
                alt={`${linked.brand} ${linked.model}`}
                className="h-full w-full object-cover"
                data-testid="optic-reticle-thumb"
              />
            ) : (
              <ImageIcon
                className="h-4 w-4 text-muted-foreground"
                aria-label={t('optics.reticle.placeholder')}
                data-testid="optic-reticle-placeholder"
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">
              {linked.brand} {linked.model}
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <span className="tactical-badge">{linked.type}</span>
              <span className="tactical-badge">
                {linked.subtension} {linked.unit}
              </span>
              {linked.focalPlane && (
                <span className="tactical-badge">{linked.focalPlane}</span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-1.5">
            {showOpenLink && (
              <Link
                to={`/library/reticles/${linked.id}`}
                className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] font-medium hover:bg-muted/70"
                data-testid="optic-reticle-open-btn"
              >
                <ExternalLink className="h-3 w-3" />
                {t('optics.reticle.open')}
              </Link>
            )}
            {editable && (
              <>
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] font-medium hover:bg-muted/70"
                  data-testid="optic-reticle-change-btn"
                >
                  <Pencil className="h-3 w-3" />
                  {t('optics.reticle.change')}
                </button>
                <button
                  type="button"
                  onClick={handleUnlink}
                  className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/10"
                  data-testid="optic-reticle-unlink-btn"
                >
                  <Link2Off className="h-3 w-3" />
                  {t('optics.reticle.unlink')}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-md" data-testid="optic-reticle-picker">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crosshair className="h-4 w-4 text-primary" />
              {t('optics.reticle.selectTitle')}
            </DialogTitle>
          </DialogHeader>
          {all.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {t('reticles.empty')}
            </div>
          ) : (
            <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
              {all.map(r => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(r.id)}
                    className={`w-full text-left flex gap-3 items-center rounded-md p-2 hover:bg-muted ${
                      r.id === reticleId ? 'bg-muted/50' : ''
                    }`}
                    data-testid={`optic-reticle-option-${r.id}`}
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border bg-muted flex items-center justify-center">
                      {r.imageDataUrl ? (
                        <img
                          src={r.imageDataUrl}
                          alt={`${r.brand} ${r.model}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {r.brand} {r.model}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {r.type} · {r.subtension} {r.unit}
                        {r.focalPlane ? ` · ${r.focalPlane}` : ''}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}