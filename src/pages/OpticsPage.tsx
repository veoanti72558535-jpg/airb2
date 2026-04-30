import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Plus, Trash2, Edit2, Download, Star } from 'lucide-react';
import { SearchBar } from '@/components/SearchBar';
import { FilterChips } from '@/components/FilterChips';
import { useI18n } from '@/lib/i18n';
import { opticStore } from '@/lib/storage';
import { useUnits } from '@/hooks/use-units';
import { useUrlFilter } from '@/hooks/use-url-filter';
import { Optic, OpticFocalPlane } from '@/lib/types';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { ImportPresetOpticsModal } from '@/components/optics/ImportPresetOpticsModal';
import { OpticReticleLink } from '@/components/optics/OpticReticleLink';
import { UnitTagSurface } from '@/components/devtools/UnitTagSurface';

interface FormState {
  name: string;
  type: string;
  focalPlane: OpticFocalPlane;
  clickUnit: 'MOA' | 'MRAD' | 'mil';
  clickValue: number;
  mountHeight: number;
  tubeDiameter: 25.4 | 30 | 34;
  magCalibration: number | '';
  notes: string;
  reticleId: string | undefined;
}

const emptyForm: FormState = {
  name: '',
  type: 'scope',
  focalPlane: 'FFP',
  clickUnit: 'MOA',
  clickValue: 0.25,
  mountHeight: 0,
  tubeDiameter: 30,
  magCalibration: '',
  notes: '',
  reticleId: undefined,
};

export default function OpticsPage() {
  const { t } = useI18n();
  const { symbol } = useUnits();
  const [optics, setOptics] = useState<Optic[]>(opticStore.getAll());

  const [tubeParam, setTubeParam] = useUrlFilter('tube');
  const [brandParam, setBrandParam] = useUrlFilter('brand');
  const [searchParam, setSearchParam] = useUrlFilter('q');

  const tubeFilter: 25.4 | 30 | 34 | null =
    tubeParam === '25.4' ? 25.4 : tubeParam === '30' ? 30 : tubeParam === '34' ? 34 : null;
  const setTubeFilter = (v: 25.4 | 30 | 34 | null) => setTubeParam(v == null ? null : String(v));

  const brandFilter = brandParam;
  const setBrandFilter = (v: string | null) => setBrandParam(v);

  const searchQuery = searchParam ?? '';
  const setSearchQuery = (v: string) => setSearchParam(v);

  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<Optic | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const existingNames = useMemo(() => new Set(optics.map(o => o.name)), [optics]);

  const refresh = () => setOptics(opticStore.getAll());

  const handleSave = () => {
    if (!form.name) return;
    const payload = {
      name: form.name,
      type: form.type,
      focalPlane: form.focalPlane,
      clickUnit: form.clickUnit,
      clickValue: form.clickValue,
      mountHeight: form.mountHeight || undefined,
      tubeDiameter: form.tubeDiameter,
      // magCalibration only applies to SFP. Drop on FFP.
      magCalibration:
        form.focalPlane === 'SFP' && form.magCalibration !== ''
          ? Number(form.magCalibration)
          : undefined,
      notes: form.notes,
      reticleId: form.reticleId,
    };
    if (editing) {
      opticStore.update(editing.id, payload);
    } else {
      opticStore.create(payload as any);
    }
    refresh();
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
    toast({ title: editing ? t('optics.edited') : t('common.save') });
  };

  const handleDelete = (id: string) => { opticStore.delete(id); refresh(); };
  const handleEdit = (o: Optic) => {
    setEditing(o);
    setForm({
      name: o.name,
      type: o.type ?? 'scope',
      focalPlane: o.focalPlane ?? (o.magCalibration ? 'SFP' : 'FFP'),
      clickUnit: o.clickUnit,
      clickValue: o.clickValue,
      mountHeight: o.mountHeight ?? 0,
      tubeDiameter: o.tubeDiameter ?? 30,
      magCalibration: o.magCalibration ?? '',
      notes: o.notes ?? '',
      reticleId: o.reticleId,
    });
    setShowForm(true);
  };

  const lengthSym = symbol('length');
  const corrSym = symbol('correction');
  const inputClass = "w-full bg-muted border border-border rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary";

  const tubeOptions: (25.4 | 30 | 34)[] = [25.4, 30, 34];
  const brandOptions = ['FX', 'Element', 'Discovery', 'Pard', 'MTC'];

  const detectBrand = (name: string): string | null => {
    const lower = name.toLowerCase();
    return brandOptions.find(b => lower.startsWith(b.toLowerCase())) ?? null;
  };

  const tubeCounts = useMemo(() => {
    const counts: Record<string, number> = { '25.4': 0, '30': 0, '34': 0 };
    optics.forEach(o => {
      if (o.tubeDiameter && counts[String(o.tubeDiameter)] !== undefined) {
        counts[String(o.tubeDiameter)]++;
      }
    });
    return counts;
  }, [optics]);

  const brandCounts = useMemo(() => {
    const counts: Record<string, number> = Object.fromEntries(brandOptions.map(b => [b, 0]));
    optics.forEach(o => {
      const b = detectBrand(o.name);
      if (b) counts[b]++;
    });
    return counts;
  }, [optics]);

  const filteredOptics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = optics.filter(o => {
      if (tubeFilter && o.tubeDiameter !== tubeFilter) return false;
      if (brandFilter && detectBrand(o.name) !== brandFilter) return false;
      if (favoritesOnly && !o.favorite) return false;
      if (q) {
        const hay = `${o.name} ${o.notes ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return [...list].sort((a, b) => {
      const fa = a.favorite ? 1 : 0;
      const fb = b.favorite ? 1 : 0;
      if (fa !== fb) return fb - fa;
      return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
    });
  }, [optics, tubeFilter, brandFilter, searchQuery, favoritesOnly]);

  const toggleFavorite = (o: Optic) => {
    opticStore.update(o.id, { favorite: !o.favorite });
    refresh();
  };

  const isSFP = form.focalPlane === 'SFP';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-heading font-bold">{t('optics.title')}</h1>
        <UnitTagSurface categories={["length"]} label="OpticsPage" />
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setShowImport(true)} className="px-3 py-1.5 bg-muted text-foreground rounded-md text-sm font-medium flex items-center gap-1 hover:bg-muted/70 border border-border">
            <Download className="h-4 w-4" />{t('optics.importPreset')}
          </button>
          <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm(emptyForm); }} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium flex items-center gap-1 hover:opacity-90">
            <Plus className="h-4 w-4" />{t('optics.add')}
          </button>
        </div>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="surface-elevated p-4 pb-20 md:pb-4 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">{editing ? t('optics.editTitle') : t('optics.addTitle')}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">{t('optics.name')}</label>
              <input className={inputClass} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('optics.type')}</label>
              <select className={inputClass} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="scope">Scope</option><option value="red-dot">Red Dot</option><option value="iron">Iron Sights</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('calc.focalPlane')}</label>
              <select className={inputClass} value={form.focalPlane} onChange={e => setForm(f => ({ ...f, focalPlane: e.target.value as OpticFocalPlane }))}>
                <option value="FFP">FFP</option>
                <option value="SFP">SFP</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('optics.clickUnit')}</label>
              <select className={inputClass} value={form.clickUnit} onChange={e => setForm(f => ({ ...f, clickUnit: e.target.value as any }))}>
                <option>MOA</option><option>MRAD</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('optics.clickValue')} ({corrSym}/click)</label>
              <input type="number" step="0.01" className={inputClass} value={form.clickValue} onChange={e => setForm(f => ({ ...f, clickValue: +e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('optics.mountHeight')} ({lengthSym})</label>
              <input type="number" step="1" className={inputClass} value={form.mountHeight} onChange={e => setForm(f => ({ ...f, mountHeight: +e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('optics.tubeDiameter')}</label>
              <select className={inputClass} value={form.tubeDiameter} onChange={e => setForm(f => ({ ...f, tubeDiameter: Number(e.target.value) as 25.4 | 30 | 34 }))}>
                <option value={25.4}>25.4 mm (1")</option>
                <option value={30}>30 mm</option>
                <option value={34}>34 mm</option>
              </select>
            </div>

            {/* SFP-only field */}
            {isSFP ? (
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground">{t('optics.magCalibration')}</label>
                <input
                  type="number"
                  step="1"
                  placeholder="ex: 10, 12, 24"
                  className={inputClass}
                  value={form.magCalibration}
                  onChange={e => setForm(f => ({ ...f, magCalibration: e.target.value === '' ? '' : +e.target.value }))}
                />
                <span className="text-[10px] text-muted-foreground">{t('optics.magCalibrationHint')}</span>
              </div>
            ) : (
              <div className="col-span-2 text-[11px] text-muted-foreground italic px-1">
                {t('calc.ffpHint')}
              </div>
            )}
          </div>
          <div><label className="text-xs text-muted-foreground">{t('airguns.notes')}</label><textarea className={inputClass} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          <div>
            <label className="text-xs text-muted-foreground">{t('optics.reticle.label')}</label>
            <OpticReticleLink
              reticleId={form.reticleId}
              onChange={next => setForm(f => ({ ...f, reticleId: next }))}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">{t('common.save')}</button>
            <button onClick={() => { setShowForm(false); setEditing(null); setForm(emptyForm); }} className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm">{t('common.cancel')}</button>
          </div>
        </motion.div>
      )}

      {optics.length > 0 && (
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t('optics.search')}
          count={filteredOptics.length}
          total={optics.length}
          showCopyLink
        />
      )}

      {optics.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-pressed={favoritesOnly}
            onClick={() => setFavoritesOnly(v => !v)}
            data-testid="optics-favorites-only"
            className={`px-2.5 py-1 rounded text-xs font-medium border inline-flex items-center gap-1 transition-colors ${
              favoritesOnly
                ? 'bg-primary/10 text-primary border-primary/40'
                : 'bg-muted text-muted-foreground border-border hover:bg-muted/70'
            }`}
          >
            {t('favorites.onlyFavorites')}
          </button>
        </div>
      )}

      {optics.length > 0 && (
        <FilterChips
          label={t('optics.tubeDiameter')}
          value={tubeFilter === null ? null : String(tubeFilter)}
          onChange={v => setTubeFilter(v === null ? null : (Number(v) as 25.4 | 30 | 34))}
          totalCount={optics.length}
          options={tubeOptions.map(d => ({
            value: String(d),
            label: `⌀ ${d}mm`,
            count: tubeCounts[String(d)],
          }))}
        />
      )}

      {optics.length > 0 && (
        <FilterChips
          label={t('optics.filterBrand')}
          value={brandFilter}
          onChange={setBrandFilter}
          totalCount={optics.length}
          options={brandOptions.map(b => ({ value: b, count: brandCounts[b] }))}
          onReset={() => {
            setTubeFilter(null);
            setBrandFilter(null);
            setSearchQuery('');
          }}
          showReset={tubeFilter !== null || brandFilter !== null || searchQuery.trim() !== ''}
        />
      )}

      {optics.length === 0 ? (
        <div className="surface-card p-8 text-center text-muted-foreground text-sm">{t('common.noData')}</div>
      ) : filteredOptics.length === 0 ? (
        <div className="surface-card p-8 text-center text-muted-foreground text-sm">{t('optics.noMatch')}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredOptics.map(o => {
            const fp = o.focalPlane ?? (o.magCalibration ? 'SFP' : null);
            return (
              <Link
                key={o.id}
                to={`/library/optic/${o.id}`}
                className="glass-card p-4 block hover:border-primary/40 transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-heading font-bold text-base group-hover:text-primary transition-colors">{o.name}</div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {fp && <span className="tactical-badge">{fp}</span>}
                      <span className="tactical-badge">{o.clickValue} {o.clickUnit}/click</span>
                      {o.tubeDiameter && <span className="tactical-badge">⌀ {o.tubeDiameter}mm</span>}
                      {fp === 'SFP' && o.magCalibration && (
                        <span className="tactical-badge">cal {o.magCalibration}×</span>
                      )}
                      {o.type && <span className="text-[10px] text-muted-foreground self-center">{o.type}</span>}
                    </div>
                    {o.mountHeight ? (
                      <div className="text-[11px] text-muted-foreground font-mono mt-1.5">
                        {t('optics.mountHeight')}: {o.mountHeight} {lengthSym}
                      </div>
                    ) : null}
                    {o.notes && <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{o.notes}</div>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(o); }}
                      title={o.favorite ? t('favorites.remove') : t('favorites.add')}
                      aria-label={o.favorite ? t('favorites.remove') : t('favorites.add')}
                      aria-pressed={!!o.favorite}
                      data-testid={`optic-fav-${o.id}`}
                      className={`p-1.5 rounded transition-colors duration-150 ${o.favorite ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground hover:bg-muted hover:text-primary'}`}
                    >
                      <Star className="h-3.5 w-3.5" fill={o.favorite ? 'currentColor' : 'none'} />
                    </button>
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEdit(o); }} className="p-1.5 rounded hover:bg-muted text-muted-foreground"><Edit2 className="h-3.5 w-3.5" /></button>
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(o.id); }} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <ImportPresetOpticsModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImported={refresh}
        existingNames={existingNames}
      />
    </motion.div>
  );
}
