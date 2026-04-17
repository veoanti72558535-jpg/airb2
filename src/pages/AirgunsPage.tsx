import React, { useMemo, useState } from 'react';
import { Target, Plus, Trash2, Edit2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { airgunStore } from '@/lib/storage';
import { useUnits } from '@/hooks/use-units';
import { useUrlFilter } from '@/hooks/use-url-filter';
import { Airgun } from '@/lib/types';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { SearchBar } from '@/components/SearchBar';
import { FilterChips } from '@/components/FilterChips';
import { useBrandCounts } from '@/hooks/use-brand-counts';

export default function AirgunsPage() {
  const { t } = useI18n();
  const { symbol } = useUnits();
  const [airguns, setAirguns] = useState<Airgun[]>(airgunStore.getAll());
  const [searchParam, setSearchParam] = useUrlFilter('q');
  const [brandParam, setBrandParam] = useUrlFilter('brand');
  const [caliberParam, setCaliberParam] = useUrlFilter('caliber');
  const searchQuery = searchParam ?? '';
  const setSearchQuery = (v: string) => setSearchParam(v);
  const brandFilter = brandParam;
  const setBrandFilter = (v: string | null) => setBrandParam(v);
  const caliberFilter = caliberParam;
  const setCaliberFilter = (v: string | null) => setCaliberParam(v);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Airgun | null>(null);
  const [form, setForm] = useState({ brand: '', model: '', caliber: '.177', barrelLength: 600, regPressure: 110, fillPressure: 250, powerSetting: '', defaultSightHeight: 40, defaultZeroRange: 30, notes: '' });

  const brandCounts = useBrandCounts(airguns, a => a.brand);

  // Canonical caliber token (".177", ".22", ".25", ".30") extracted from stored value.
  const calToken = (s: string) => {
    const m = (s ?? '').match(/\.\d+/);
    return m ? m[0] : '';
  };
  const CALIBERS = ['.177', '.22', '.25', '.30'];
  const caliberCounts = useMemo(() => {
    const map = new Map<string, number>();
    airguns.forEach(a => {
      const c = calToken(a.caliber);
      if (!c) return;
      map.set(c, (map.get(c) ?? 0) + 1);
    });
    return CALIBERS.map(c => ({ value: c, count: map.get(c) ?? 0 })).filter(x => x.count > 0);
  }, [airguns]);

  const filteredAirguns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const bf = brandFilter?.toLowerCase() ?? null;
    const cf = caliberFilter ?? null;
    return airguns.filter(a => {
      if (bf && (a.brand ?? '').toLowerCase() !== bf) return false;
      if (cf && calToken(a.caliber) !== cf) return false;
      if (q && !`${a.brand} ${a.model} ${a.notes ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [airguns, searchQuery, brandFilter, caliberFilter]);

  const refresh = () => setAirguns(airgunStore.getAll());

  const handleSave = () => {
    if (!form.brand || !form.model) return;
    if (editing) {
      airgunStore.update(editing.id, form);
    } else {
      airgunStore.create(form as any);
    }
    refresh();
    setShowForm(false);
    setEditing(null);
    setForm({ brand: '', model: '', caliber: '.177', barrelLength: 600, regPressure: 110, fillPressure: 250, powerSetting: '', defaultSightHeight: 40, defaultZeroRange: 30, notes: '' });
    toast({ title: t('common.save') });
  };

  const handleDelete = (id: string) => {
    airgunStore.delete(id);
    refresh();
  };

  const handleEdit = (a: Airgun) => {
    setEditing(a);
    setForm({ brand: a.brand, model: a.model, caliber: a.caliber, barrelLength: a.barrelLength ?? 600, regPressure: a.regPressure ?? 110, fillPressure: a.fillPressure ?? 250, powerSetting: a.powerSetting ?? '', defaultSightHeight: a.defaultSightHeight ?? 40, defaultZeroRange: a.defaultZeroRange ?? 30, notes: a.notes ?? '' });
    setShowForm(true);
  };

  const lengthSym = symbol('length');
  const pressSym = symbol('pressure');
  const inputClass = "w-full bg-muted border border-border rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary";

  const hasAnyFilter = (brandFilter !== null && brandFilter !== '') || (caliberFilter !== null && caliberFilter !== '') || searchQuery.trim() !== '';
  const resetAllFilters = () => { setBrandFilter(null); setCaliberFilter(null); setSearchQuery(''); };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-heading font-bold">{t('airguns.title')}</h1>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditing(null); }}
          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium flex items-center gap-1 hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          {t('airguns.add')}
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="surface-elevated p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">{t('airguns.brand')}</label>
              <input className={inputClass} value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('airguns.model')}</label>
              <input className={inputClass} value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('airguns.caliber')}</label>
              <select className={inputClass} value={form.caliber} onChange={e => setForm(f => ({ ...f, caliber: e.target.value }))}>
                <option>.177 (4.5mm)</option>
                <option>.22 (5.5mm)</option>
                <option>.25 (6.35mm)</option>
                <option>.30 (7.62mm)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('airguns.barrelLength')} ({lengthSym})</label>
              <input type="number" className={inputClass} value={form.barrelLength} onChange={e => setForm(f => ({ ...f, barrelLength: +e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('airguns.regPressure')} ({pressSym})</label>
              <input type="number" className={inputClass} value={form.regPressure} onChange={e => setForm(f => ({ ...f, regPressure: +e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('airguns.fillPressure')} ({pressSym})</label>
              <input type="number" className={inputClass} value={form.fillPressure} onChange={e => setForm(f => ({ ...f, fillPressure: +e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{t('airguns.notes')}</label>
            <textarea className={inputClass} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">{t('common.save')}</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm">{t('common.cancel')}</button>
          </div>
        </motion.div>
      )}

      {airguns.length > 0 && (
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t('airguns.search')}
          count={filteredAirguns.length}
          total={airguns.length}
          showCopyLink
        />
      )}

      {airguns.length > 0 && brandCounts.length > 0 && (
        <FilterChips
          label={t('optics.filterBrand')}
          value={brandFilter}
          onChange={setBrandFilter}
          totalCount={airguns.length}
          options={brandCounts.map(({ display, count }) => ({ value: display, count }))}
        />
      )}

      {airguns.length > 0 && caliberCounts.length > 0 && (
        <FilterChips
          label={t('optics.filterCaliber')}
          value={caliberFilter}
          onChange={setCaliberFilter}
          totalCount={airguns.length}
          monoLabels
          options={caliberCounts.map(({ value, count }) => ({ value, count }))}
          onReset={resetAllFilters}
          showReset={hasAnyFilter}
        />
      )}

      {airguns.length === 0 ? (
        <div className="surface-card p-8 text-center text-muted-foreground text-sm">{t('common.noData')}</div>
      ) : filteredAirguns.length === 0 ? (
        <div className="surface-card p-8 text-center text-muted-foreground text-sm">{t('airguns.noMatch')}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredAirguns.map(a => (
            <div key={a.id} className="surface-elevated p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold text-sm">{a.brand} {a.model}</div>
                  <div className="text-xs text-muted-foreground font-mono">{a.caliber}</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(a)} className="p-1.5 rounded hover:bg-muted text-muted-foreground"><Edit2 className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground font-mono">
                {a.barrelLength && <span>{t('airguns.barrelLength')}: {a.barrelLength} {lengthSym}</span>}
                {a.regPressure && <span>Reg: {a.regPressure} {pressSym}</span>}
                {a.fillPressure && <span>Fill: {a.fillPressure} {pressSym}</span>}
              </div>
              {a.notes && <p className="text-xs text-muted-foreground mt-2 italic">{a.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
