import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Plus, Trash2, Edit2, Download, GitCompare, X, Layers, Sparkles, Database, Search, Star } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { projectileStore } from '@/lib/storage';
import { useUnits } from '@/hooks/use-units';
import { useUrlFilter } from '@/hooks/use-url-filter';
import { DragModel, DragTablePoint, Projectile, ProjectileType } from '@/lib/types';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { SearchBar } from '@/components/SearchBar';
import { FilterChips } from '@/components/FilterChips';
import { useBrandCounts } from '@/hooks/use-brand-counts';
import { calToken, buildCaliberCounts } from '@/lib/caliber';
import { AdvancedDisclosure } from '@/components/AdvancedDisclosure';
import { ImportPresetProjectilesModal } from '@/components/projectiles/ImportPresetProjectilesModal';
import { CompareProjectilesModal } from '@/components/projectiles/CompareProjectilesModal';
import { DragTableEditor } from '@/components/projectiles/DragTableEditor';
import { seedProjectileKey } from '@/lib/seed-projectiles';
import { ProjectileSearchAgent } from '@/components/ai/agents/ProjectileSearchAgent';
import { BcSearchAgent } from '@/components/ai/agents/BcSearchAgent';
import { VelocityForumAgent } from '@/components/ai/agents/VelocityForumAgent';
import { AirgunReviewAgent } from '@/components/ai/agents/AirgunReviewAgent';
import { AgentDialog } from '@/components/ai/agents/AgentDialog';
import { UnitTagSurface } from '@/components/devtools/UnitTagSurface';

/** Tranche K — un projectile a-t-il au moins une zone BC exploitable (informatif). */
export function hasBcZones(p: Projectile): boolean {
  return Array.isArray(p.bcZones) && p.bcZones.length > 0;
}

/** Tranche K — un projectile expose-t-il au moins un champ catalogue enrichi bullets4. */
export function isEnrichedProjectile(p: Projectile): boolean {
  return (
    p.caliberLabel !== undefined ||
    p.diameterMm !== undefined ||
    p.diameterIn !== undefined ||
    p.weightGrains !== undefined ||
    p.weightGrams !== undefined ||
    p.bcG1 !== undefined ||
    p.bcG7 !== undefined ||
    hasBcZones(p) ||
    (p.lengthMm !== undefined && p.lengthMm !== null) ||
    (p.lengthIn !== undefined && p.lengthIn !== null) ||
    p.sourceDbId !== undefined ||
    p.sourceTable !== undefined
  );
}

const MAX_COMPARE = 4;

interface FormState {
  brand: string;
  model: string;
  weight: number;
  bc: number;
  bcModel: DragModel;
  projectileType: ProjectileType;
  shape: string;
  caliber: string;
  length: number;
  diameter: number;
  material: string;
  notes: string;
  dataSource: string;
  customDragTable?: DragTablePoint[];
}

const emptyForm: FormState = {
  brand: '',
  model: '',
  weight: 18,
  bc: 0.025,
  bcModel: 'G1',
  projectileType: 'pellet',
  shape: 'domed',
  caliber: '.177',
  length: 0,
  diameter: 0,
  material: 'lead',
  notes: '',
  dataSource: '',
};

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
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<Projectile | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [typeFilter, setTypeFilter] = useState<'all' | ProjectileType>('all');
  const [importedFilter, setImportedFilter] = useState(false);
  const [bcZonesFilter, setBcZonesFilter] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortKey, setSortKey] = useState<'name' | 'weight' | 'bc' | 'caliber'>('name');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  // AI agent dialogs
  const [aiOpen, setAiOpen] = useState<null | 'search' | 'bc' | 'velocity' | 'review'>(null);
  const [aiSeed, setAiSeed] = useState<string>('');

  const compareSelected = useMemo(
    () => compareIds
      .map(id => projectiles.find(p => p.id === id))
      .filter((p): p is Projectile => Boolean(p)),
    [compareIds, projectiles]
  );

  const toggleCompare = (id: string) => {
    setCompareIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= MAX_COMPARE) {
        toast({ title: t('projectiles.compareMax') });
        return prev;
      }
      return [...prev, id];
    });
  };

  const existingKeys = useMemo(
    () => new Set(projectiles.map(p => seedProjectileKey({ brand: p.brand, model: p.model, weight: p.weight, caliber: p.caliber }))),
    [projectiles]
  );

  const brandCounts = useBrandCounts(projectiles, p => p.brand);
  const caliberCounts = useMemo(() => buildCaliberCounts(projectiles, p => p.caliber), [projectiles]);

  const filteredProjectiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const tokens = q ? q.split(/\s+/).filter(Boolean) : [];
    const bf = brandFilter?.toLowerCase() ?? null;
    const cf = caliberFilter ?? null;
    const list = projectiles.filter(p => {
      if (bf && (p.brand ?? '').toLowerCase() !== bf) return false;
      if (cf && calToken(p.caliber) !== cf) return false;
      if (typeFilter !== 'all' && (p.projectileType ?? 'pellet') !== typeFilter) return false;
      if (importedFilter && !p.importedFrom) return false;
      if (bcZonesFilter && !hasBcZones(p)) return false;
      if (favoritesOnly && !p.favorite) return false;
      if (tokens.length) {
        const hay = `${p.brand} ${p.model} ${p.notes ?? ''} ${p.caliber} ${p.weight} ${p.bc}`.toLowerCase();
        if (!tokens.every(tok => hay.includes(tok))) return false;
      }
      return true;
    });
    const sorted = [...list];
    if (sortKey === 'weight') sorted.sort((a, b) => a.weight - b.weight);
    else if (sortKey === 'bc') sorted.sort((a, b) => b.bc - a.bc);
    else if (sortKey === 'caliber') sorted.sort((a, b) => calToken(a.caliber).localeCompare(calToken(b.caliber)) || `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`));
    else sorted.sort((a, b) => `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`));
    // Pin favorites to the top while preserving the chosen sort within each group.
    sorted.sort((a, b) => {
      const fa = a.favorite ? 1 : 0;
      const fb = b.favorite ? 1 : 0;
      return fb - fa;
    });
    return sorted;
  }, [projectiles, searchQuery, brandFilter, caliberFilter, typeFilter, importedFilter, bcZonesFilter, favoritesOnly, sortKey]);

  const toggleFavorite = (p: Projectile) => {
    projectileStore.update(p.id, { favorite: !p.favorite });
    refresh();
  };

  const hasAnyFilter = (brandFilter !== null && brandFilter !== '') || (caliberFilter !== null && caliberFilter !== '') || typeFilter !== 'all' || importedFilter || bcZonesFilter || searchQuery.trim() !== '';
  const resetAllFilters = () => { setBrandFilter(null); setCaliberFilter(null); setSearchQuery(''); setTypeFilter('all'); setImportedFilter(false); setBcZonesFilter(false); };

  const importedCount = useMemo(() => projectiles.filter(p => Boolean(p.importedFrom)).length, [projectiles]);
  const bcZonesCount = useMemo(() => projectiles.filter(hasBcZones).length, [projectiles]);

  const refresh = () => setProjectiles(projectileStore.getAll());

  const handleSave = () => {
    if (!form.brand || !form.model) return;
    const payload = {
      ...form,
      length: form.length || undefined,
      diameter: form.diameter || undefined,
    };
    if (editing) {
      projectileStore.update(editing.id, payload);
    } else {
      projectileStore.create(payload as any);
    }
    refresh();
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
    toast({ title: t('common.save') });
  };

  const handleDelete = (id: string) => {
    projectileStore.delete(id);
    refresh();
  };

  const handleEdit = (p: Projectile) => {
    setEditing(p);
    setForm({
      brand: p.brand,
      model: p.model,
      weight: p.weight,
      bc: p.bc,
      bcModel: p.bcModel ?? 'G1',
      projectileType: p.projectileType ?? 'pellet',
      shape: p.shape ?? 'domed',
      caliber: p.caliber,
      length: p.length ?? 0,
      diameter: p.diameter ?? 0,
      material: p.material ?? 'lead',
      notes: p.notes ?? '',
      dataSource: p.dataSource ?? '',
      customDragTable: p.customDragTable,
    });
    setShowForm(true);
  };

  const weightSym = symbol('weight');
  const lengthSym = symbol('length');
  const inputClass = "w-full bg-muted border border-border rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-heading font-bold">{t('projectiles.title')}</h1>
        <UnitTagSurface categories={["weight","length","velocity"]} label="ProjectilesPage" />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setAiSeed(''); setAiOpen('search'); }}
            className="px-3 py-1.5 bg-muted text-foreground rounded-md text-sm font-medium flex items-center gap-1 hover:bg-muted/70 border border-border"
            data-testid="projectiles-ai-search-btn"
          >
            <Search className="h-4 w-4" />{t('agentSearch.searchProjectile' as any)}
          </button>
          <button onClick={() => setShowImport(true)} className="px-3 py-1.5 bg-muted text-foreground rounded-md text-sm font-medium flex items-center gap-1 hover:bg-muted/70 border border-border">
            <Download className="h-4 w-4" />{t('projectiles.importPreset')}
          </button>
          <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm(emptyForm); }} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium flex items-center gap-1 hover:opacity-90">
            <Plus className="h-4 w-4" />{t('projectiles.add')}
          </button>
        </div>
      </div>

      <ImportPresetProjectilesModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImported={refresh}
        existingKeys={existingKeys}
      />

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="surface-elevated p-4 pb-20 md:pb-4 space-y-3">
          {/* Essential fields */}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground">{t('projectiles.brand')}</label><input className={inputClass} value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">{t('projectiles.model')}</label><input className={inputClass} value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">{t('projectiles.weight')} ({weightSym})</label><input type="number" step="0.5" className={inputClass} value={form.weight} onChange={e => setForm(f => ({ ...f, weight: +e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">{t('projectiles.bc')}</label><input type="number" step="0.001" className={inputClass} value={form.bc} onChange={e => setForm(f => ({ ...f, bc: +e.target.value }))} /></div>
            <div>
              <label className="text-xs text-muted-foreground">{t('projectiles.caliber')}</label>
              <select className={inputClass} value={form.caliber} onChange={e => setForm(f => ({ ...f, caliber: e.target.value }))}>
                <option>.177</option><option>.22</option><option>.25</option><option>.30</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('projectiles.type')}</label>
              <select className={inputClass} value={form.projectileType} onChange={e => setForm(f => ({ ...f, projectileType: e.target.value as ProjectileType }))}>
                <option value="pellet">{t('calc.typePellet')}</option>
                <option value="slug">{t('calc.typeSlug')}</option>
                <option value="other">{t('calc.typeOther')}</option>
              </select>
            </div>
          </div>

          {/* Advanced fields */}
          <AdvancedDisclosure
            title={t('common.advancedMode')}
            description={t('projectiles.advancedHint')}
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">{t('projectiles.dragModel')}</label>
                <select className={inputClass} value={form.bcModel} onChange={e => setForm(f => ({ ...f, bcModel: e.target.value as DragModel }))}>
                  <option value="G1">G1 — {t('calc.dragG1Hint')}</option>
                  <option value="G7">G7 — {t('calc.dragG7Hint')}</option>
                  <option value="GA">GA — {t('calc.dragGAHint')}</option>
                  <option value="GS">GS — {t('calc.dragGSHint')}</option>
                </select>
              </div>
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

            <div className="mt-4 pt-3 border-t border-border">
              <DragTableEditor
                value={form.customDragTable}
                onChange={tbl => setForm(f => ({ ...f, customDragTable: tbl }))}
              />
            </div>
          </AdvancedDisclosure>

          <div><label className="text-xs text-muted-foreground">{t('airguns.notes')}</label><textarea className={inputClass} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">{t('common.save')}</button>
            <button onClick={() => { setShowForm(false); setEditing(null); setForm(emptyForm); }} className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm">{t('common.cancel')}</button>
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

      {projectiles.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-pressed={favoritesOnly}
            onClick={() => setFavoritesOnly(v => !v)}
            data-testid="projectiles-favorites-only"
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

      {projectiles.length > 0 && (importedCount > 0 || bcZonesCount > 0) && (
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground mr-1">
            {t('projectiles.list.filterFlags')}
          </span>
          {importedCount > 0 && (
            <button
              type="button"
              aria-pressed={importedFilter}
              onClick={() => setImportedFilter(v => !v)}
              className={`px-2.5 py-1 rounded font-medium border inline-flex items-center gap-1 ${
                importedFilter
                  ? 'bg-primary/10 text-primary border-primary/40'
                  : 'bg-muted text-muted-foreground border-border hover:bg-muted/70'
              }`}
            >
              <Database className="h-3 w-3" />
              {t('projectiles.list.filterImported')} ({importedCount})
            </button>
          )}
          {bcZonesCount > 0 && (
            <button
              type="button"
              aria-pressed={bcZonesFilter}
              onClick={() => setBcZonesFilter(v => !v)}
              className={`px-2.5 py-1 rounded font-medium border inline-flex items-center gap-1 ${
                bcZonesFilter
                  ? 'bg-primary/10 text-primary border-primary/40'
                  : 'bg-muted text-muted-foreground border-border hover:bg-muted/70'
              }`}
            >
              <Layers className="h-3 w-3" />
              {t('projectiles.list.filterHasBcZones')} ({bcZonesCount})
            </button>
          )}
        </div>
      )}

      {projectiles.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="uppercase tracking-wide text-muted-foreground font-medium">{t('projectiles.filterType')}</span>
          {(['all', 'pellet', 'slug', 'other'] as const).map(tf => (
            <button
              key={tf}
              onClick={() => setTypeFilter(tf)}
              className={`px-2.5 py-1 rounded font-medium ${typeFilter === tf ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
            >
              {tf === 'all' ? t('optics.filterAll')
                : tf === 'pellet' ? t('projectiles.typePellet')
                : tf === 'slug' ? t('projectiles.typeSlug')
                : t('projectiles.typeOther')}
            </button>
          ))}
          <span className="mx-2 h-4 w-px bg-border" />
          <span className="uppercase tracking-wide text-muted-foreground font-medium">{t('common.sortBy')}</span>
          {(['name', 'weight', 'bc', 'caliber'] as const).map(sk => (
            <button
              key={sk}
              onClick={() => setSortKey(sk)}
              className={`px-2.5 py-1 rounded font-medium ${sortKey === sk ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
            >
              {sk === 'name' ? t('common.sortName')
                : sk === 'weight' ? t('common.sortWeight')
                : sk === 'bc' ? t('common.sortBc')
                : t('projectiles.list.sortCaliber')}
            </button>
          ))}
        </div>
      )}
      {projectiles.length === 0 ? (
        <div className="surface-card p-8 text-center text-muted-foreground text-sm">{t('common.noData')}</div>
      ) : filteredProjectiles.length === 0 ? (
        <div className="surface-card p-8 text-center text-muted-foreground text-sm">{t('projectiles.noMatch')}</div>
      ) : (
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${compareIds.length > 0 ? 'pb-24' : ''}`}>
          {filteredProjectiles.map(p => {
            const isCompared = compareIds.includes(p.id);
            return (
              <div
                key={p.id}
                className={`glass-card p-4 transition-colors relative group ${
                  isCompared ? 'border-primary/60 ring-1 ring-primary/30' : 'hover:border-primary/40'
                }`}
              >
                <Link to={`/library/projectile/${p.id}`} className="block">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="font-heading font-bold text-base flex items-center gap-1.5 flex-wrap group-hover:text-primary transition-colors">
                        <span className="truncate">{p.brand} {p.model}</span>
                        {p.caliberLabel && p.caliberLabel !== p.caliber && (
                          <span className="text-[10px] font-mono text-muted-foreground">({p.caliberLabel})</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <span className="tactical-badge">{p.caliber}</span>
                        <span className="tactical-badge">{p.weight} {weightSym}</span>
                        <span className="tactical-badge">BC {p.bc}{p.bcModel ? ` ${p.bcModel}` : ''}</span>
                        {p.projectileType && p.projectileType !== 'pellet' && (
                          <span className="tactical-badge">{p.projectileType}</span>
                        )}
                        {hasBcZones(p) && (
                          <span
                            className="tactical-badge bg-primary/10 text-primary border-primary/30 inline-flex items-center gap-1"
                            title={t('projectiles.list.bcZonesBadgeTitle')}
                            data-testid="badge-bc-zones"
                          >
                            <Layers className="h-3 w-3" />
                            {t('projectiles.list.bcZonesBadge')} ({p.bcZones!.length})
                          </span>
                        )}
                        {p.importedFrom && (
                          <span
                            className="tactical-badge bg-accent/10 text-accent-foreground border-accent/30 inline-flex items-center gap-1"
                            title={t('projectiles.list.importedBadgeTitle', { source: p.importedFrom })}
                            data-testid="badge-imported"
                          >
                            <Database className="h-3 w-3" />
                            {t('projectiles.list.importedBadge')}
                          </span>
                        )}
                        {!hasBcZones(p) && !p.importedFrom && isEnrichedProjectile(p) && (
                          <span
                            className="tactical-badge bg-muted text-muted-foreground border-border inline-flex items-center gap-1"
                            title={t('projectiles.list.enrichedBadgeTitle')}
                            data-testid="badge-enriched"
                          >
                            <Sparkles className="h-3 w-3" />
                            {t('projectiles.list.enrichedBadge')}
                          </span>
                        )}
                      </div>
                      {(p.length || p.lengthMm || p.diameter || p.diameterMm || p.diameterIn || p.shape || p.material) && (
                        <div className="text-[11px] text-muted-foreground font-mono mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                          {(p.lengthMm ?? p.length) ? <span>L {p.lengthMm ?? p.length}{lengthSym}</span> : null}
                          {(p.diameterMm ?? p.diameter)
                            ? <span>⌀ {(p.diameterMm ?? p.diameter)!.toFixed?.(2) ?? p.diameterMm ?? p.diameter}{lengthSym}</span>
                            : p.diameterIn ? <span>⌀ {p.diameterIn} in</span> : null}
                          {p.shape ? <span>{p.shape}</span> : null}
                          {p.material ? <span>{p.material}</span> : null}
                        </div>
                      )}
                      {p.notes && <p className="text-[11px] text-muted-foreground mt-1 italic line-clamp-2">{p.notes}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(p); }}
                        title={p.favorite ? t('favorites.remove') : t('favorites.add')}
                        aria-label={p.favorite ? t('favorites.remove') : t('favorites.add')}
                        aria-pressed={!!p.favorite}
                        data-testid={`projectile-fav-${p.id}`}
                        className={`p-1.5 rounded transition-colors duration-150 ${p.favorite ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground hover:bg-muted hover:text-primary'}`}
                      >
                        <Star className="h-3.5 w-3.5" fill={p.favorite ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCompare(p.id); }}
                        title={t('projectiles.compare')}
                        className={`p-1.5 rounded ${isCompared ? 'bg-primary/15 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
                      >
                        <GitCompare className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEdit(p); }} className="p-1.5 rounded hover:bg-muted text-muted-foreground"><Edit2 className="h-3.5 w-3.5" /></button>
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(p.id); }} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </Link>
                <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border/40 pt-2">
                  <button
                    type="button"
                    onClick={() => { setAiSeed(`${p.brand} ${p.model} ${p.weight}gr ${p.caliber}`); setAiOpen('bc'); }}
                    className="text-[10px] px-1.5 py-0.5 rounded border border-primary/30 text-primary/80 hover:bg-primary/10"
                    data-testid={`projectile-ai-bc-${p.id}`}
                  >
                    {t('agentSearch.bcPublished' as any)}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAiSeed(`${p.brand} ${p.model} ${p.caliber}`); setAiOpen('velocity'); }}
                    className="text-[10px] px-1.5 py-0.5 rounded border border-primary/30 text-primary/80 hover:bg-primary/10"
                  >
                    {t('agentSearch.velocityForums' as any)}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAiSeed(`${p.brand} ${p.model}`); setAiOpen('review'); }}
                    className="text-[10px] px-1.5 py-0.5 rounded border border-primary/30 text-primary/80 hover:bg-primary/10"
                  >
                    {t('agentSearch.reviews' as any)}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating compare bar */}
      {compareIds.length > 0 && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 surface-elevated shadow-xl border border-primary/30 rounded-full px-2 py-1.5 flex items-center gap-2"
        >
          <span className="text-xs font-medium px-2 text-foreground">
            {compareIds.length} / {MAX_COMPARE}
          </span>
          <button
            onClick={() => setShowCompare(true)}
            disabled={compareIds.length < 2}
            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-xs font-semibold flex items-center gap-1 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <GitCompare className="h-3.5 w-3.5" />
            {t('projectiles.compareSelected', { count: compareIds.length })}
          </button>
          <button
            onClick={() => setCompareIds([])}
            className="p-1.5 rounded-full hover:bg-muted text-muted-foreground"
            aria-label={t('projectiles.compareClear')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}

      <CompareProjectilesModal
        open={showCompare}
        onClose={() => setShowCompare(false)}
        projectiles={compareSelected}
        onRemove={(id) => {
          setCompareIds(prev => {
            const next = prev.filter(x => x !== id);
            if (next.length < 2) setShowCompare(false);
            return next;
          });
        }}
      />

      {/* AI agent dialogs */}
      <AgentDialog
        open={aiOpen === 'search'}
        onOpenChange={(o) => setAiOpen(o ? 'search' : null)}
        title={t('agentSearch.searchProjectile' as any)}
      >
        <ProjectileSearchAgent initialQuery={aiSeed} onResult={refresh} />
      </AgentDialog>
      <AgentDialog
        open={aiOpen === 'bc'}
        onOpenChange={(o) => setAiOpen(o ? 'bc' : null)}
        title={t('agentSearch.bcPublished' as any)}
      >
        <BcSearchAgent initialQuery={aiSeed} />
      </AgentDialog>
      <AgentDialog
        open={aiOpen === 'velocity'}
        onOpenChange={(o) => setAiOpen(o ? 'velocity' : null)}
        title={t('agentSearch.velocityForums' as any)}
      >
        <VelocityForumAgent initialQuery={aiSeed} />
      </AgentDialog>
      <AgentDialog
        open={aiOpen === 'review'}
        onOpenChange={(o) => setAiOpen(o ? 'review' : null)}
        title={t('agentSearch.reviews' as any)}
      >
        <AirgunReviewAgent initialQuery={aiSeed} />
      </AgentDialog>
    </motion.div>
  );
}
