import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Search, Download, Check, Heart, Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { isSupabaseConfigured } from '@/integrations/supabase/client';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { toast } from '@/hooks/use-toast';
import {
  getReticlesCatalog,
  getCatalogBrands,
  getCatalogPatternTypes,
  importToLibrary,
  isAlreadyImported,
  toggleFavorite,
  isFavorite,
  type ReticleCatalogEntry,
  type CatalogFilters,
} from '@/lib/reticles-catalog-repo';
import {
  getChairgunReticles,
  importChairgunToLibrary,
  isChairgunImported,
  type ChairgunReticle,
  type ChairgunFilters,
  type ChairgunFocalPlane,
  type ChairgunUnit,
} from '@/lib/chairgun-reticles-repo';
import ReticleViewer from './ReticleViewer';

type SourceTab = 'strelok' | 'chairgun';

export default function ReticleCatalogBrowser() {
  const { t } = useI18n();
  const [sourceTab, setSourceTab] = useState<SourceTab>('strelok');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [brand, setBrand] = useState('');
  const [focalPlane, setFocalPlane] = useState('');
  const [clickUnits, setClickUnits] = useState('');
  const [patternType, setPatternType] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<ReticleCatalogEntry[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [brands, setBrands] = useState<string[]>([]);
  const [patterns, setPatterns] = useState<string[]>([]);
  const [importedIds, setImportedIds] = useState<Set<number>>(new Set());
  const [favIds, setFavIds] = useState<Set<number>>(() => {
    try { const raw = localStorage.getItem('reticle_catalog_favorites'); return new Set(raw ? JSON.parse(raw) : []); } catch { return new Set(); }
  });

  // ── ChairGun tab state ──
  const [cgData, setCgData] = useState<ChairgunReticle[]>([]);
  const [cgCount, setCgCount] = useState(0);
  const [cgLoading, setCgLoading] = useState(false);
  const [cgWithGeometry, setCgWithGeometry] = useState(true);
  const [cgImportedIds, setCgImportedIds] = useState<Set<number>>(new Set());

  // Performance mode: activate during scroll to reduce SVG complexity
  const [scrolling, setScrolling] = useState(false);
  const scrollTimer = useRef<ReturnType<typeof setTimeout>>();
  const handleScroll = useCallback(() => {
    setScrolling(true);
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => setScrolling(false), 150);
  }, []);

  // Load filter options once
  useEffect(() => {
    getCatalogBrands().then(setBrands);
    getCatalogPatternTypes().then(setPatterns);
  }, []);

  const filters: CatalogFilters = useMemo(() => ({
    search: debouncedSearch || undefined,
    brand: brand || undefined,
    focal_plane: (focalPlane as 'FFP' | 'SFP') || undefined,
    click_units: (clickUnits as 'MOA' | 'MRAD') || undefined,
    pattern_type: patternType || undefined,
  }), [debouncedSearch, brand, focalPlane, clickUnits, patternType]);

  const cgFilters: ChairgunFilters = useMemo(() => ({
    search: debouncedSearch || undefined,
    focal_plane: (focalPlane as ChairgunFocalPlane) || undefined,
    unit: (clickUnits as ChairgunUnit) || undefined,
    withGeometryOnly: cgWithGeometry,
  }), [debouncedSearch, focalPlane, clickUnits, cgWithGeometry]);

  // Reset page on filter change
  useEffect(() => { setPage(0); }, [debouncedSearch, brand, focalPlane, clickUnits, patternType, sourceTab, cgWithGeometry]);

  // Fetch Strelok data
  useEffect(() => {
    if (sourceTab !== 'strelok') return;
    let cancelled = false;
    setLoading(true);
    getReticlesCatalog(filters, page).then(res => {
      if (cancelled) return;
      setData(res.data);
      setCount(res.count);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [filters, page, sourceTab]);

  // Fetch ChairGun data
  useEffect(() => {
    if (sourceTab !== 'chairgun') return;
    let cancelled = false;
    setCgLoading(true);
    getChairgunReticles(cgFilters, page).then(res => {
      if (cancelled) return;
      setCgData(res.data);
      setCgCount(res.count);
      setCgLoading(false);
    });
    return () => { cancelled = true; };
  }, [cgFilters, page, sourceTab]);

  const handleImport = useCallback((entry: ReticleCatalogEntry) => {
    importToLibrary(entry);
    setImportedIds(prev => new Set(prev).add(entry.reticle_id));
    toast({ title: t('reticles.catalog.importSuccess') });
  }, [t]);

  const handleImportChairgun = useCallback((entry: ChairgunReticle) => {
    importChairgunToLibrary(entry);
    setCgImportedIds(prev => new Set(prev).add(entry.reticle_id));
    toast({ title: t('reticles.catalog.importSuccess') });
  }, [t]);

  const handleToggleFav = useCallback((reticleId: number) => {
    const added = toggleFavorite(reticleId);
    setFavIds(prev => {
      const next = new Set(prev);
      if (added) next.add(reticleId); else next.delete(reticleId);
      return next;
    });
    toast({ title: added ? t('reticles.catalog.favoriteAdded') : t('reticles.catalog.favoriteRemoved') });
  }, [t]);

  const activeCount = sourceTab === 'strelok' ? count : cgCount;
  const activeLoading = sourceTab === 'strelok' ? loading : cgLoading;
  const totalPages = Math.ceil(activeCount / 20);
  const selectClass = 'bg-muted border border-border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary';
  const tabBtn = (active: boolean) =>
    `px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
      active
        ? 'bg-primary text-primary-foreground'
        : 'bg-muted text-muted-foreground hover:bg-muted/80'
    }`;

  if (!isSupabaseConfigured()) {
    return (
      <div className="surface-card p-8 text-center text-muted-foreground text-sm">
        Supabase non configuré — catalogue indisponible.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Source tabs */}
      <div className="flex flex-wrap gap-1.5" data-testid="catalog-source-tabs">
        <button
          type="button"
          className={tabBtn(sourceTab === 'strelok')}
          onClick={() => setSourceTab('strelok')}
          data-testid="catalog-tab-strelok"
        >
          Strelok ({count || '…'})
        </button>
        <button
          type="button"
          className={tabBtn(sourceTab === 'chairgun')}
          onClick={() => setSourceTab('chairgun')}
          data-testid="catalog-tab-chairgun"
        >
          {t('reticles.chairgun.tab')}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          className="w-full bg-muted border border-border rounded-md pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder={t('reticles.catalog.search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          data-testid="catalog-search"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {sourceTab === 'strelok' && (
          <select className={selectClass} value={brand} onChange={e => setBrand(e.target.value)} data-testid="catalog-filter-brand">
            <option value="">{t('reticles.catalog.all')} — {t('reticles.catalog.brand')}</option>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        )}
        <select className={selectClass} value={focalPlane} onChange={e => setFocalPlane(e.target.value)} data-testid="catalog-filter-fp">
          <option value="">{t('reticles.catalog.all')} — {t('reticles.catalog.focalPlane')}</option>
          <option value="FFP">FFP</option>
          <option value="SFP">SFP</option>
        </select>
        <select className={selectClass} value={clickUnits} onChange={e => setClickUnits(e.target.value)} data-testid="catalog-filter-units">
          <option value="">{t('reticles.catalog.all')} — {t('reticles.catalog.units')}</option>
          <option value="MOA">MOA</option>
          <option value="MRAD">MRAD</option>
        </select>
        {sourceTab === 'strelok' && (
          <select className={selectClass} value={patternType} onChange={e => setPatternType(e.target.value)} data-testid="catalog-filter-pattern">
            <option value="">{t('reticles.catalog.all')} — {t('reticles.catalog.pattern')}</option>
            {patterns.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
        {sourceTab === 'chairgun' && (
          <label className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-muted border border-border cursor-pointer">
            <input
              type="checkbox"
              checked={cgWithGeometry}
              onChange={(e) => setCgWithGeometry(e.target.checked)}
              data-testid="catalog-filter-cg-geometry"
            />
            {t('reticles.chairgun.geometry')}
          </label>
        )}
      </div>

      {/* Count */}
      <div className="text-xs text-muted-foreground">
        {activeCount} {t('reticles.catalog.title').toLowerCase()}
        {activeLoading && ' …'}
      </div>

      {/* Grid */}
      {sourceTab === 'strelok' && (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" onWheel={handleScroll} data-testid="catalog-grid-strelok">
        {data.map(entry => {
          const imported = importedIds.has(entry.reticle_id) || isAlreadyImported(entry.reticle_id);
          return (
            <div key={entry.reticle_id} className="surface-elevated p-3 flex gap-3 items-start" data-testid={`catalog-item-${entry.reticle_id}`}>
              <div className="shrink-0">
                <ReticleViewer reticle={entry} size={80} darkMode performanceMode={scrolling} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-xs truncate" title={entry.name}>
                  {entry.name.length > 40 ? entry.name.slice(0, 40) + '…' : entry.name}
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {entry.focal_plane && <span className="tactical-badge">{entry.focal_plane}</span>}
                  {entry.click_units && <span className="tactical-badge">{entry.click_units}</span>}
                  <span className="tactical-badge">{entry.pattern_type}</span>
                  {entry.min_magnification && entry.max_magnification && (
                    <span className="tactical-badge">{entry.min_magnification}-{entry.max_magnification}x</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <button
                    onClick={() => handleToggleFav(entry.reticle_id)}
                    className="p-1 rounded hover:bg-muted"
                    aria-label={favIds.has(entry.reticle_id) ? t('reticles.catalog.favoriteRemove') : t('reticles.catalog.favoriteAdd')}
                    data-testid={`catalog-fav-${entry.reticle_id}`}
                  >
                    <Heart className={`h-3.5 w-3.5 ${favIds.has(entry.reticle_id) ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                  </button>
                  <button
                    disabled={imported}
                    onClick={() => handleImport(entry)}
                    className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                      imported
                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                        : 'bg-primary text-primary-foreground hover:opacity-90'
                    }`}
                    data-testid={`catalog-import-${entry.reticle_id}`}
                  >
                    {imported ? (
                      <><Check className="h-3 w-3" />{t('reticles.catalog.imported')}</>
                    ) : (
                      <><Download className="h-3 w-3" />{t('reticles.catalog.import')}</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {sourceTab === 'chairgun' && (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" onWheel={handleScroll} data-testid="catalog-grid-chairgun">
        {cgData.map(entry => {
          const imported = cgImportedIds.has(entry.reticle_id) || isChairgunImported(entry.reticle_id);
          const hasGeom = entry.element_count > 0;
          return (
            <div key={entry.reticle_id} className="surface-elevated p-3 flex gap-3 items-start" data-testid={`catalog-cg-item-${entry.reticle_id}`}>
              <div className="shrink-0">
                <ReticleViewer
                  reticle={entry}
                  elements={entry.elements}
                  size={80}
                  darkMode
                  performanceMode={scrolling}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-xs truncate" title={entry.name}>
                  {entry.name.length > 40 ? entry.name.slice(0, 40) + '…' : entry.name}
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {entry.focal_plane && <span className="tactical-badge">{entry.focal_plane}</span>}
                  {entry.unit && <span className="tactical-badge">{entry.unit}</span>}
                  {entry.true_magnification && (
                    <span className="tactical-badge">@{entry.true_magnification}x</span>
                  )}
                  {hasGeom && (
                    <span
                      className="tactical-badge inline-flex items-center gap-0.5"
                      data-testid={`catalog-cg-geom-${entry.reticle_id}`}
                    >
                      <Sparkles className="h-2.5 w-2.5" />
                      {t('reticles.chairgun.elements', { n: entry.element_count })}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <button
                    disabled={imported}
                    onClick={() => handleImportChairgun(entry)}
                    className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                      imported
                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                        : 'bg-primary text-primary-foreground hover:opacity-90'
                    }`}
                    data-testid={`catalog-cg-import-${entry.reticle_id}`}
                  >
                    {imported ? (
                      <><Check className="h-3 w-3" />{t('reticles.catalog.imported')}</>
                    ) : (
                      <><Download className="h-3 w-3" />{t('reticles.catalog.import')}</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 rounded text-xs bg-muted hover:bg-muted/80 disabled:opacity-40"
          >
            ←
          </button>
          <span className="text-xs text-muted-foreground">{page + 1} / {totalPages}</span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 rounded text-xs bg-muted hover:bg-muted/80 disabled:opacity-40"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}