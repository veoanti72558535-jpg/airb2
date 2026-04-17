import React, { useMemo, useState } from 'react';
import { Eye, Plus, Trash2, Edit2, Download, RotateCcw } from 'lucide-react';
import { SearchBar } from '@/components/SearchBar';
import { useI18n } from '@/lib/i18n';
import { opticStore } from '@/lib/storage';
import { useUnits } from '@/hooks/use-units';
import { useUrlFilter } from '@/hooks/use-url-filter';
import { Optic } from '@/lib/types';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { ImportPresetOpticsModal } from '@/components/optics/ImportPresetOpticsModal';

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
  const [form, setForm] = useState<{ name: string; type: string; clickUnit: 'MOA' | 'MRAD' | 'mil'; clickValue: number; mountHeight: number; tubeDiameter: 25.4 | 30 | 34; magCalibration: number | ''; notes: string }>({ name: '', type: 'scope', clickUnit: 'MOA', clickValue: 0.25, mountHeight: 0, tubeDiameter: 30, magCalibration: '', notes: '' });

  const existingNames = useMemo(() => new Set(optics.map(o => o.name)), [optics]);

  const refresh = () => setOptics(opticStore.getAll());

  const handleSave = () => {
    if (!form.name) return;
    const payload = {
      name: form.name,
      type: form.type,
      clickUnit: form.clickUnit,
      clickValue: form.clickValue,
      mountHeight: form.mountHeight || undefined,
      tubeDiameter: form.tubeDiameter,
      magCalibration: form.magCalibration === '' ? undefined : Number(form.magCalibration),
      notes: form.notes,
    };
    if (editing) {
      opticStore.update(editing.id, payload);
    } else {
      opticStore.create(payload as any);
    }
    refresh();
    setShowForm(false);
    setEditing(null);
    toast({ title: t('common.save') });
  };

  const handleDelete = (id: string) => { opticStore.delete(id); refresh(); };
  const handleEdit = (o: Optic) => {
    setEditing(o);
    setForm({
      name: o.name,
      type: o.type ?? 'scope',
      clickUnit: o.clickUnit,
      clickValue: o.clickValue,
      mountHeight: o.mountHeight ?? 0,
      tubeDiameter: o.tubeDiameter ?? 30,
      magCalibration: o.magCalibration ?? '',
      notes: o.notes ?? '',
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
    return optics.filter(o => {
      if (tubeFilter && o.tubeDiameter !== tubeFilter) return false;
      if (brandFilter && detectBrand(o.name) !== brandFilter) return false;
      if (q) {
        const hay = `${o.name} ${o.notes ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [optics, tubeFilter, brandFilter, searchQuery]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-heading font-bold">{t('optics.title')}</h1>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setShowImport(true)} className="px-3 py-1.5 bg-muted text-foreground rounded-md text-sm font-medium flex items-center gap-1 hover:bg-muted/70 border border-border">
            <Download className="h-4 w-4" />{t('optics.importPreset')}
          </button>
          <button onClick={() => { setShowForm(!showForm); setEditing(null); }} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium flex items-center gap-1 hover:opacity-90">
            <Plus className="h-4 w-4" />{t('optics.add')}
          </button>
        </div>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="surface-elevated p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground">{t('optics.name')}</label><input className={inputClass} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">{t('optics.type')}</label>
              <select className={inputClass} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="scope">Scope</option><option value="red-dot">Red Dot</option><option value="iron">Iron Sights</option>
              </select>
            </div>
            <div><label className="text-xs text-muted-foreground">{t('optics.clickUnit')}</label>
              <select className={inputClass} value={form.clickUnit} onChange={e => setForm(f => ({ ...f, clickUnit: e.target.value as any }))}>
                <option>MOA</option><option>MRAD</option>
              </select>
            </div>
            <div><label className="text-xs text-muted-foreground">{t('optics.clickValue')} ({corrSym}/click)</label>
              <input type="number" step="0.01" className={inputClass} value={form.clickValue} onChange={e => setForm(f => ({ ...f, clickValue: +e.target.value }))} />
            </div>
            <div><label className="text-xs text-muted-foreground">{t('optics.mountHeight')} ({lengthSym})</label>
              <input type="number" step="1" className={inputClass} value={form.mountHeight} onChange={e => setForm(f => ({ ...f, mountHeight: +e.target.value }))} />
            </div>
            <div><label className="text-xs text-muted-foreground">{t('optics.tubeDiameter')}</label>
              <select className={inputClass} value={form.tubeDiameter} onChange={e => setForm(f => ({ ...f, tubeDiameter: Number(e.target.value) as 25.4 | 30 | 34 }))}>
                <option value={25.4}>25.4 mm (1")</option>
                <option value={30}>30 mm</option>
                <option value={34}>34 mm</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('optics.magCalibration')}</label>
              <input
                type="number"
                step="1"
                placeholder="ex: 10, 12, 24 (FFP: vide)"
                className={inputClass}
                value={form.magCalibration}
                onChange={e => setForm(f => ({ ...f, magCalibration: e.target.value === '' ? '' : +e.target.value }))}
              />
              <span className="text-[10px] text-muted-foreground">{t('optics.magCalibrationHint')}</span>
            </div>
          </div>
          <div><label className="text-xs text-muted-foreground">{t('airguns.notes')}</label><textarea className={inputClass} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">{t('common.save')}</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm">{t('common.cancel')}</button>
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
        />
      )}

      {optics.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground mr-1">
            {t('optics.tubeDiameter')}
          </span>
          <button
            onClick={() => setTubeFilter(null)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              tubeFilter === null
                ? 'bg-primary/10 text-primary border border-primary/40'
                : 'bg-muted text-muted-foreground border border-border hover:bg-muted/70'
            }`}
          >
            {t('optics.filterAll')} ({optics.length})
          </button>
          {tubeOptions.map(d => (
            <button
              key={d}
              onClick={() => setTubeFilter(tubeFilter === d ? null : d)}
              disabled={tubeCounts[String(d)] === 0}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                tubeFilter === d
                  ? 'bg-primary/10 text-primary border border-primary/40'
                  : 'bg-muted text-muted-foreground border border-border hover:bg-muted/70'
              }`}
            >
              ⌀ {d}mm ({tubeCounts[String(d)]})
            </button>
          ))}
        </div>
      )}

      {optics.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground mr-1">
            {t('optics.filterBrand')}
          </span>
          <button
            onClick={() => setBrandFilter(null)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              brandFilter === null
                ? 'bg-primary/10 text-primary border border-primary/40'
                : 'bg-muted text-muted-foreground border border-border hover:bg-muted/70'
            }`}
          >
            {t('optics.filterAll')} ({optics.length})
          </button>
          {brandOptions.map(b => (
            <button
              key={b}
              onClick={() => setBrandFilter(brandFilter === b ? null : b)}
              disabled={brandCounts[b] === 0}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                brandFilter === b
                  ? 'bg-primary/10 text-primary border border-primary/40'
                  : 'bg-muted text-muted-foreground border border-border hover:bg-muted/70'
              }`}
            >
              {b} ({brandCounts[b]})
            </button>
          ))}
          {(tubeFilter !== null || brandFilter !== null || searchQuery.trim() !== '') && (
            <button
              onClick={() => {
                setTubeFilter(null);
                setBrandFilter(null);
                setSearchQuery('');
              }}
              className="ml-auto px-2.5 py-1 rounded text-xs font-medium transition-colors bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20 inline-flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              {t('optics.resetFilters')}
            </button>
          )}
        </div>
      )}

      {optics.length === 0 ? (
        <div className="surface-card p-8 text-center text-muted-foreground text-sm">{t('common.noData')}</div>
      ) : filteredOptics.length === 0 ? (
        <div className="surface-card p-8 text-center text-muted-foreground text-sm">{t('optics.noMatch')}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredOptics.map(o => (
            <div key={o.id} className="surface-elevated p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm">{o.name}</div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <span className="tactical-badge">{o.clickUnit}</span>
                    <span className="tactical-badge">{o.clickValue} {o.clickUnit}/click</span>
                    {o.tubeDiameter && <span className="tactical-badge">⌀ {o.tubeDiameter}mm</span>}
                    {o.magCalibration && <span className="tactical-badge">cal {o.magCalibration}×</span>}
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
                  <button onClick={() => handleEdit(o)} className="p-1.5 rounded hover:bg-muted text-muted-foreground"><Edit2 className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDelete(o.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
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
