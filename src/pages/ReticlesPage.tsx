import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crosshair, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useI18n } from '@/lib/i18n';
import { reticleStore } from '@/lib/storage';
import { RETICLE_TYPES, RETICLE_UNITS } from '@/lib/reticle';
import type { Reticle, ReticleType, ReticleUnit, OpticFocalPlane } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

interface FormState {
  brand: string;
  model: string;
  type: ReticleType;
  unit: ReticleUnit;
  subtension: number;
  focalPlane: OpticFocalPlane | '';
  notes: string;
}

const emptyForm: FormState = {
  brand: '',
  model: '',
  type: 'mrad-grid',
  unit: 'MRAD',
  subtension: 1,
  focalPlane: '',
  notes: '',
};

/**
 * Tranche F.4 — Bibliothèque de réticules.
 *
 * Liste simple : carte par réticule avec vignette image (ou placeholder),
 * navigation vers le détail, création/suppression légère. Pas de filtres
 * avancés en V1 — on reste sobre, mobile-friendly, cohérent avec le reste
 * de la bibliothèque.
 */
export default function ReticlesPage() {
  const { t } = useI18n();
  const [reticles, setReticles] = useState<Reticle[]>(() => reticleStore.getAll());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const refresh = () => setReticles(reticleStore.getAll());

  const handleSave = () => {
    if (!form.brand.trim() || !form.model.trim() || !(form.subtension > 0)) return;
    reticleStore.create({
      brand: form.brand.trim(),
      model: form.model.trim(),
      type: form.type,
      unit: form.unit,
      subtension: form.subtension,
      focalPlane: form.focalPlane === '' ? undefined : form.focalPlane,
      notes: form.notes.trim() || undefined,
    });
    refresh();
    setShowForm(false);
    setForm(emptyForm);
    toast({ title: t('common.save') });
  };

  const handleDelete = (id: string) => {
    reticleStore.delete(id);
    refresh();
  };

  const inputClass =
    'w-full bg-muted border border-border rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary';

  const sorted = useMemo(
    () => [...reticles].sort((a, b) => a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model)),
    [reticles],
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crosshair className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-heading font-bold">{t('reticles.title')}</h1>
        </div>
        <button
          onClick={() => {
            setShowForm(s => !s);
            setForm(emptyForm);
          }}
          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium flex items-center gap-1 hover:opacity-90"
          data-testid="reticles-add-btn"
        >
          <Plus className="h-4 w-4" />
          {t('reticles.add')}
        </button>
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-elevated p-4 space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">{t('reticles.brand')}</label>
              <input
                className={inputClass}
                value={form.brand}
                onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('reticles.model')}</label>
              <input
                className={inputClass}
                value={form.model}
                onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('reticles.type')}</label>
              <select
                className={inputClass}
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as ReticleType }))}
              >
                {RETICLE_TYPES.map(rt => (
                  <option key={rt} value={rt}>
                    {rt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('reticles.unit')}</label>
              <select
                className={inputClass}
                value={form.unit}
                onChange={e => setForm(f => ({ ...f, unit: e.target.value as ReticleUnit }))}
              >
                {RETICLE_UNITS.map(u => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('reticles.subtension')}</label>
              <input
                type="number"
                step="0.1"
                min="0"
                className={inputClass}
                value={form.subtension}
                onChange={e => setForm(f => ({ ...f, subtension: +e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('reticles.focalPlane')}</label>
              <select
                className={inputClass}
                value={form.focalPlane}
                onChange={e => setForm(f => ({ ...f, focalPlane: e.target.value as OpticFocalPlane | '' }))}
              >
                <option value="">—</option>
                <option value="FFP">FFP</option>
                <option value="SFP">SFP</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">{t('airguns.notes')}</label>
              <textarea
                className={inputClass}
                rows={2}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium"
            >
              {t('common.save')}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setForm(emptyForm);
              }}
              className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm"
            >
              {t('common.cancel')}
            </button>
          </div>
        </motion.div>
      )}

      {sorted.length === 0 ? (
        <div
          className="surface-card p-8 text-center text-muted-foreground text-sm"
          data-testid="reticles-empty"
        >
          {t('reticles.empty')}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sorted.map(r => (
            <div key={r.id} className="surface-elevated p-3 flex gap-3 items-start">
              <Link
                to={`/library/reticles/${r.id}`}
                className="flex gap-3 items-start flex-1 min-w-0 hover:opacity-90"
                data-testid={`reticles-item-${r.id}`}
              >
                <div className="shrink-0 h-16 w-16 rounded-md overflow-hidden bg-muted border border-border flex items-center justify-center">
                  {r.imageDataUrl ? (
                    <img
                      src={r.imageDataUrl}
                      alt={`${r.brand} ${r.model}`}
                      className="h-full w-full object-cover"
                      data-testid={`reticles-thumb-${r.id}`}
                    />
                  ) : (
                    <ImageIcon
                      className="h-5 w-5 text-muted-foreground"
                      data-testid={`reticles-placeholder-${r.id}`}
                      aria-label={t('reticles.placeholder')}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">
                    {r.brand} {r.model}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <span className="tactical-badge">{r.type}</span>
                    <span className="tactical-badge">
                      {r.subtension} {r.unit}
                    </span>
                    {r.focalPlane && <span className="tactical-badge">{r.focalPlane}</span>}
                    {r.importedFrom && (
                      <span className="tactical-badge" title={r.importedFrom}>
                        {r.importedFrom}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
              <button
                onClick={() => handleDelete(r.id)}
                className="p-1.5 rounded hover:bg-destructive/10 text-destructive shrink-0"
                aria-label={t('common.delete')}
                data-testid={`reticles-delete-${r.id}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
