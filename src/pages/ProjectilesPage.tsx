import React, { useMemo, useState } from 'react';
import { Zap, Plus, Trash2, Edit2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { projectileStore } from '@/lib/storage';
import { useUnits } from '@/hooks/use-units';
import { useUrlFilter } from '@/hooks/use-url-filter';
import { Projectile } from '@/lib/types';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { SearchBar } from '@/components/SearchBar';
import { FilterChips } from '@/components/FilterChips';

export default function ProjectilesPage() {
  const { t } = useI18n();
  const { symbol } = useUnits();
  const [projectiles, setProjectiles] = useState<Projectile[]>(projectileStore.getAll());
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
  const [editing, setEditing] = useState<Projectile | null>(null);
  const [form, setForm] = useState({ brand: '', model: '', weight: 18, bc: 0.025, shape: 'domed', caliber: '.177', length: 0, diameter: 0, material: 'lead', notes: '', dataSource: '' });

  // Derive brand list + counts from actual data (case-insensitive, original casing kept).
  const brandCounts = useMemo(() => {
    const map = new Map<string, { display: string; count: number }>();
    projectiles.forEach(p => {
      const raw = (p.brand ?? '').trim();
      if (!raw) return;
      const key = raw.toLowerCase();
      const existing = map.get(key);
      if (existing) existing.count++;
      else map.set(key, { display: raw, count: 1 });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count || a.display.localeCompare(b.display));
  }, [projectiles]);

  const calToken = (s: string) => {
    const m = (s ?? '').match(/\.\d+/);
    return m ? m[0] : '';
  };
  const CALIBERS = ['.177', '.22', '.25', '.30'];
  const caliberCounts = useMemo(() => {
    const map = new Map<string, number>();
    projectiles.forEach(p => {
      const c = calToken(p.caliber);
      if (!c) return;
      map.set(c, (map.get(c) ?? 0) + 1);
    });
    return CALIBERS.map(c => ({ value: c, count: map.get(c) ?? 0 })).filter(x => x.count > 0);
  }, [projectiles]);

  const filteredProjectiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const bf = brandFilter?.toLowerCase() ?? null;
    const cf = caliberFilter ?? null;
    return projectiles.filter(p => {
      if (bf && (p.brand ?? '').toLowerCase() !== bf) return false;
      if (cf && calToken(p.caliber) !== cf) return false;
      if (q && !`${p.brand} ${p.model} ${p.notes ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [projectiles, searchQuery, brandFilter, caliberFilter]);

  const hasAnyFilter = (brandFilter !== null && brandFilter !== '') || (caliberFilter !== null && caliberFilter !== '') || searchQuery.trim() !== '';
  const resetAllFilters = () => { setBrandFilter(null); setCaliberFilter(null); setSearchQuery(''); };

  const refresh = () => setProjectiles(projectileStore.getAll());

  const handleSave = () => {
    if (!form.brand || !form.model) return;
    if (editing) {
      projectileStore.update(editing.id, form);
    } else {
      projectileStore.create(form as any);
    }
    refresh();
    setShowForm(false);
    setEditing(null);
    toast({ title: t('common.save') });
  };

  const handleDelete = (id: string) => {
    projectileStore.delete(id);
    refresh();
  };

  const handleEdit = (p: Projectile) => {
    setEditing(p);
    setForm({ brand: p.brand, model: p.model, weight: p.weight, bc: p.bc, shape: p.shape ?? 'domed', caliber: p.caliber, length: p.length ?? 0, diameter: p.diameter ?? 0, material: p.material ?? 'lead', notes: p.notes ?? '', dataSource: p.dataSource ?? '' });
    setShowForm(true);
  };

  const weightSym = symbol('weight');
  const lengthSym = symbol('length');
  const inputClass = "w-full bg-muted border border-border rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-heading font-bold">{t('projectiles.title')}</h1>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditing(null); }} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium flex items-center gap-1 hover:opacity-90">
          <Plus className="h-4 w-4" />{t('projectiles.add')}
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="surface-elevated p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground">{t('projectiles.brand')}</label><input className={inputClass} value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">{t('projectiles.model')}</label><input className={inputClass} value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">{t('projectiles.weight')} ({weightSym})</label><input type="number" step="0.5" className={inputClass} value={form.weight} onChange={e => setForm(f => ({ ...f, weight: +e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">{t('projectiles.bc')}</label><input type="number" step="0.001" className={inputClass} value={form.bc} onChange={e => setForm(f => ({ ...f, bc: +e.target.value }))} /></div>
            <div>
              <label className="text-xs text-muted-foreground">{t('projectiles.shape')}</label>
              <select className={inputClass} value={form.shape} onChange={e => setForm(f => ({ ...f, shape: e.target.value }))}>
                <option value="domed">Domed</option>
                <option value="pointed">Pointed</option>
                <option value="flat">Flat / Wadcutter</option>
                <option value="hollow">Hollow Point</option>
                <option value="slug">Slug</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('projectiles.caliber')}</label>
              <select className={inputClass} value={form.caliber} onChange={e => setForm(f => ({ ...f, caliber: e.target.value }))}>
                <option>.177</option><option>.22</option><option>.25</option><option>.30</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('projectiles.length')} ({lengthSym})</label>
              <input type="number" step="0.1" className={inputClass} value={form.length} onChange={e => setForm(f => ({ ...f, length: +e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('projectiles.diameter')} ({lengthSym})</label>
              <input type="number" step="0.01" className={inputClass} value={form.diameter} onChange={e => setForm(f => ({ ...f, diameter: +e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('projectiles.material')}</label>
              <select className={inputClass} value={form.material} onChange={e => setForm(f => ({ ...f, material: e.target.value }))}>
                <option value="lead">Lead</option>
                <option value="alloy">Alloy</option>
                <option value="copper">Copper</option>
                <option value="tin">Tin</option>
              </select>
            </div>
          </div>
          <div><label className="text-xs text-muted-foreground">{t('airguns.notes')}</label><textarea className={inputClass} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">{t('common.save')}</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm">{t('common.cancel')}</button>
          </div>
        </motion.div>
      )}

      {projectiles.length > 0 && (
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t('projectiles.search')}
          count={filteredProjectiles.length}
          total={projectiles.length}
          showCopyLink
        />
      )}

      {projectiles.length > 0 && brandCounts.length > 0 && (
        <FilterChips
          label={t('optics.filterBrand')}
          value={brandFilter}
          onChange={setBrandFilter}
          totalCount={projectiles.length}
          options={brandCounts.map(({ display, count }) => ({ value: display, count }))}
        />
      )}

      {projectiles.length > 0 && caliberCounts.length > 0 && (
        <FilterChips
          label={t('optics.filterCaliber')}
          value={caliberFilter}
          onChange={setCaliberFilter}
          totalCount={projectiles.length}
          monoLabels
          options={caliberCounts.map(({ value, count }) => ({ value, count }))}
          onReset={resetAllFilters}
          showReset={hasAnyFilter}
        />
      )}

      {projectiles.length === 0 ? (
        <div className="surface-card p-8 text-center text-muted-foreground text-sm">{t('common.noData')}</div>
      ) : filteredProjectiles.length === 0 ? (
        <div className="surface-card p-8 text-center text-muted-foreground text-sm">{t('projectiles.noMatch')}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredProjectiles.map(p => (
            <div key={p.id} className="surface-elevated p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold text-sm">{p.brand} {p.model}</div>
                  <div className="flex gap-2 mt-0.5">
                    <span className="tactical-badge">{p.caliber}</span>
                    <span className="tactical-badge">{p.weight} {weightSym}</span>
                    <span className="tactical-badge">BC {p.bc}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(p)} className="p-1.5 rounded hover:bg-muted text-muted-foreground"><Edit2 className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              {p.shape && <span className="text-xs text-muted-foreground">{p.shape} • {p.material}</span>}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
