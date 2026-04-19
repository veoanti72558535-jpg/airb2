import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  X,
  Check,
  Plus,
  Layers,
  Database,
  Filter as FilterIcon,
  Star,
  Clock,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { calToken, buildCaliberCounts } from '@/lib/caliber';
import { Projectile, ProjectileType } from '@/lib/types';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useVirtualList } from '@/hooks/use-virtual-list';
import { useProjectilePrefs } from '@/hooks/use-projectile-prefs';

/**
 * Tranches L + M — sélecteur projectile avancé pour QuickCalc.
 *
 * Tranche L : recherche + filtres + tri + badges + état vide.
 * Tranche M : virtualisation, debounce de la recherche, haystack pré-calculé,
 *             memoization des lignes, DialogDescription pour a11y.
 *
 * Aucune logique balistique. Aucune dérivation moteur.
 */

export type ProjectilePickerSort = 'relevance' | 'brand' | 'weight' | 'bc' | 'caliber';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectiles: Projectile[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Where the user can go to add a projectile when the library is empty. */
  addHref?: string;
}

/** Helpers locaux — on ne dépend pas de ProjectilesPage pour rester découplé. */
export function pickerHasBcZones(p: Projectile): boolean {
  return Array.isArray(p.bcZones) && p.bcZones.length > 0;
}

export function pickerIsImported(p: Projectile): boolean {
  return !!p.importedFrom;
}

const TYPE_VALUES: ProjectileType[] = ['pellet', 'slug', 'bb', 'dart', 'other'];

/** Search debounce — short enough to feel instant, long enough to skip strokes. */
const SEARCH_DEBOUNCE_MS = 120;

/**
 * Pixel height of a projectile row — kept in sync with `ProjectileRow` styles.
 * If you change row paddings/badges, audit this constant.
 */
const ROW_HEIGHT = 84;
/**
 * Threshold above which virtualization kicks in. Below it we render the
 * whole list directly (cheaper, simpler, friendlier to a11y trees).
 */
const VIRTUALIZATION_THRESHOLD = 60;

/** Pre-computed search index — stable per projectile reference. */
interface SearchEntry {
  /** lowercased haystack used for tokenized search */
  hay: string;
  /** numeric value of the canonical caliber token, +Infinity if unparseable */
  calNum: number;
  /** sort key for brand sort */
  brandKey: string;
}

/** Build a haystack/sort cache once per `projectiles` reference. */
function buildIndex(projectiles: Projectile[]): WeakMap<Projectile, SearchEntry> {
  const map = new WeakMap<Projectile, SearchEntry>();
  for (const p of projectiles) {
    const hay = (
      p.brand +
      ' ' +
      p.model +
      ' ' +
      p.caliber +
      ' ' +
      (p.caliberLabel ?? '') +
      ' ' +
      (p.shape ?? '') +
      ' ' +
      (p.projectileType ?? '') +
      ' ' +
      (p.notes ?? '')
    ).toLowerCase();
    const calNumRaw = parseFloat(calToken(p.caliber));
    map.set(p, {
      hay,
      calNum: Number.isFinite(calNumRaw) ? calNumRaw : Number.POSITIVE_INFINITY,
      brandKey: `${p.brand} ${p.model}`.toLowerCase(),
    });
  }
  return map;
}

export function ProjectilePicker({
  open,
  onOpenChange,
  projectiles,
  selectedId,
  onSelect,
  addHref = '/library',
}: Props) {
  const { t } = useI18n();
  const { favorites, recents, isFavorite, toggleFavorite, pushRecent, clearRecents } =
    useProjectilePrefs();

  const [query, setQuery] = useState('');
  const [caliberFilter, setCaliberFilter] = useState<string>(''); // '' = all
  const [typeFilter, setTypeFilter] = useState<string>(''); // '' = all
  const [onlyImported, setOnlyImported] = useState(false);
  const [onlyBcZones, setOnlyBcZones] = useState(false);
  const [sortBy, setSortBy] = useState<ProjectilePickerSort>('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced query — heavy work runs only after the user pauses typing.
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);

  // Reset transient state on open/close.
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery('');
      setShowFilters(false);
    }
  }, [open]);

  /** Pre-compute haystacks once per projectiles reference. */
  const searchIndex = useMemo(() => buildIndex(projectiles), [projectiles]);

  /** Lookup map id → projectile, used to resolve favorite/recent ids fast. */
  const byId = useMemo(() => {
    const map = new Map<string, Projectile>();
    for (const p of projectiles) map.set(p.id, p);
    return map;
  }, [projectiles]);

  /** Caliber availability — only show calibers actually present in the data. */
  const caliberCounts = useMemo(
    () => buildCaliberCounts(projectiles, p => p.caliber),
    [projectiles],
  );

  /** Type availability — only show types actually present. */
  const typeCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of projectiles) {
      const tt = p.projectileType;
      if (!tt) continue;
      map.set(tt, (map.get(tt) ?? 0) + 1);
    }
    return TYPE_VALUES.filter(v => (map.get(v) ?? 0) > 0).map(value => ({
      value,
      count: map.get(value) ?? 0,
    }));
  }, [projectiles]);

  const hasAnyImported = useMemo(() => projectiles.some(pickerIsImported), [projectiles]);
  const hasAnyBcZones = useMemo(() => projectiles.some(pickerHasBcZones), [projectiles]);

  const tokens = useMemo(
    () => debouncedQuery.trim().toLowerCase().split(/\s+/).filter(Boolean),
    [debouncedQuery],
  );

  const filtered = useMemo(() => {
    const noTokens = tokens.length === 0;
    const list: Projectile[] = [];

    for (const p of projectiles) {
      if (caliberFilter && calToken(p.caliber) !== caliberFilter) continue;
      if (typeFilter && p.projectileType !== typeFilter) continue;
      if (onlyImported && !pickerIsImported(p)) continue;
      if (onlyBcZones && !pickerHasBcZones(p)) continue;
      if (!noTokens) {
        const entry = searchIndex.get(p);
        const hay = entry?.hay ?? '';
        let match = true;
        for (const tok of tokens) {
          if (!hay.includes(tok)) {
            match = false;
            break;
          }
        }
        if (!match) continue;
      }
      list.push(p);
    }

    if (sortBy === 'relevance') return list;

    switch (sortBy) {
      case 'brand':
        list.sort((a, b) => {
          const ka = searchIndex.get(a)?.brandKey ?? '';
          const kb = searchIndex.get(b)?.brandKey ?? '';
          return ka < kb ? -1 : ka > kb ? 1 : 0;
        });
        break;
      case 'weight':
        list.sort((a, b) => (a.weight ?? 0) - (b.weight ?? 0));
        break;
      case 'bc':
        list.sort((a, b) => (b.bc ?? 0) - (a.bc ?? 0));
        break;
      case 'caliber':
        list.sort((a, b) => {
          const na = searchIndex.get(a)?.calNum ?? Number.POSITIVE_INFINITY;
          const nb = searchIndex.get(b)?.calNum ?? Number.POSITIVE_INFINITY;
          return na - nb;
        });
        break;
    }
    return list;
  }, [
    projectiles,
    searchIndex,
    tokens,
    caliberFilter,
    typeFilter,
    onlyImported,
    onlyBcZones,
    sortBy,
  ]);

  // Virtualization — only kicks in for big lists. Below the threshold, we
  // pretend there are 0 virtual items (and fall back to a normal map).
  const useVirtual = filtered.length >= VIRTUALIZATION_THRESHOLD;
  const virtual = useVirtualList({
    itemCount: useVirtual ? filtered.length : 0,
    itemHeight: ROW_HEIGHT,
    overscan: 8,
  });

  // Reset scroll when the result set changes shape (filters/sort/query).
  useEffect(() => {
    if (useVirtual) virtual.scrollToTop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedQuery,
    caliberFilter,
    typeFilter,
    onlyImported,
    onlyBcZones,
    sortBy,
    useVirtual,
  ]);

  const activeFilterCount =
    (caliberFilter ? 1 : 0) +
    (typeFilter ? 1 : 0) +
    (onlyImported ? 1 : 0) +
    (onlyBcZones ? 1 : 0);

  const clearFilters = useCallback(() => {
    setCaliberFilter('');
    setTypeFilter('');
    setOnlyImported(false);
    setOnlyBcZones(false);
  }, []);

  // Stable click handler — does not re-create per row, so memoized rows skip
  // re-rendering when other rows' selection state changes.
  // Tranche N — sélectionner un projectile pousse aussi son id dans les récents.
  const pickRef = useRef<(id: string) => void>(() => {});
  useEffect(() => {
    pickRef.current = (id: string) => {
      if (id) pushRecent(id);
      onSelect(id);
      onOpenChange(false);
    };
  }, [onSelect, onOpenChange, pushRecent]);

  const handleRowPick = useCallback((id: string) => pickRef.current(id), []);

  // Stable favorite toggle — same pattern as pick, keeps rows memoized.
  const toggleFavRef = useRef<(id: string) => void>(() => {});
  useEffect(() => {
    toggleFavRef.current = toggleFavorite;
  }, [toggleFavorite]);
  const handleToggleFav = useCallback((id: string) => toggleFavRef.current(id), []);

  const isEmptyLibrary = projectiles.length === 0;

  /**
   * Quick-access sections (favorites + recents) are only shown when no
   * search/filter is active — otherwise they would compete with the user's
   * own filtering intent. We resolve ids → projectiles via the lookup map
   * and skip orphaned ids (deleted from library).
   */
  const hasActiveQuery = tokens.length > 0 || activeFilterCount > 0;
  const favoriteProjectiles = useMemo(
    () =>
      hasActiveQuery
        ? []
        : favorites.map(id => byId.get(id)).filter((p): p is Projectile => !!p),
    [hasActiveQuery, favorites, byId],
  );
  const recentProjectiles = useMemo(() => {
    if (hasActiveQuery) return [];
    const favSet = new Set(favorites);
    return recents
      .filter(id => !favSet.has(id))
      .map(id => byId.get(id))
      .filter((p): p is Projectile => !!p);
  }, [hasActiveQuery, recents, favorites, byId]);
  const showQuickAccess =
    !hasActiveQuery && (favoriteProjectiles.length > 0 || recentProjectiles.length > 0);

  // Compute the slice to render.
  const visibleSlice = useVirtual
    ? filtered.slice(virtual.startIndex, virtual.endIndex)
    : filtered;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl w-[calc(100vw-2rem)] sm:w-full p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col"
        onOpenAutoFocus={e => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <DialogHeader className="px-4 pt-4 pb-2 border-b border-border shrink-0">
          <DialogTitle className="text-base font-heading">
            {t('projectilePicker.title')}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t('projectilePicker.dialogDescription')}
          </DialogDescription>
        </DialogHeader>

        {isEmptyLibrary ? (
          <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
            <Database className="h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">
              {t('projectilePicker.noProjectiles')}
            </p>
            <Link
              to={addHref}
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center gap-1 text-primary text-sm font-medium hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('calc.addInLibrary')}
            </Link>
          </div>
        ) : (
          <>
            {/* Search row */}
            <div className="px-4 pt-3 pb-2 shrink-0">
              <div className="relative">
                <Search
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                  aria-hidden
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={t('projectilePicker.search')}
                  aria-label={t('projectilePicker.search')}
                  className="w-full bg-muted/40 border border-border rounded-md pl-8 pr-8 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label={t('common.clear')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted text-muted-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Toolbar: filters toggle + sort + count */}
              <div className="flex items-center justify-between gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowFilters(o => !o)}
                  aria-expanded={showFilters}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border transition-colors',
                    showFilters || activeFilterCount > 0
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50',
                  )}
                >
                  <FilterIcon className="h-3 w-3" aria-hidden />
                  {t('projectilePicker.filters')}
                  {activeFilterCount > 0 && (
                    <span className="ml-1 px-1 rounded-full bg-primary/20 text-primary text-[10px]">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                <div className="flex items-center gap-2 min-w-0">
                  <label className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">
                    {t('projectilePicker.sort')}
                  </label>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as ProjectilePickerSort)}
                    aria-label={t('projectilePicker.sort')}
                    className="bg-muted/40 border border-border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="relevance">{t('projectilePicker.sortRelevance')}</option>
                    <option value="brand">{t('projectilePicker.sortBrand')}</option>
                    <option value="weight">{t('projectilePicker.sortWeight')}</option>
                    <option value="bc">{t('projectilePicker.sortBc')}</option>
                    <option value="caliber">{t('projectilePicker.sortCaliber')}</option>
                  </select>
                </div>
              </div>

              {showFilters && (
                <div className="mt-3 space-y-2 rounded-md border border-border bg-muted/20 p-2.5">
                  {caliberCounts.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {t('projectilePicker.filterCaliber')}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <FilterChip
                          active={caliberFilter === ''}
                          onClick={() => setCaliberFilter('')}
                          label={t('common.all')}
                        />
                        {caliberCounts.map(c => (
                          <FilterChip
                            key={c.value}
                            active={caliberFilter === c.value}
                            onClick={() => setCaliberFilter(c.value)}
                            label={`${c.value} (${c.count})`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {typeCounts.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {t('projectilePicker.filterType')}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <FilterChip
                          active={typeFilter === ''}
                          onClick={() => setTypeFilter('')}
                          label={t('common.all')}
                        />
                        {typeCounts.map(c => (
                          <FilterChip
                            key={c.value}
                            active={typeFilter === c.value}
                            onClick={() => setTypeFilter(c.value)}
                            label={`${c.value} (${c.count})`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {(hasAnyImported || hasAnyBcZones) && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {hasAnyImported && (
                        <FilterChip
                          active={onlyImported}
                          onClick={() => setOnlyImported(o => !o)}
                          label={t('projectilePicker.filterImported')}
                          icon={<Database className="h-3 w-3" />}
                        />
                      )}
                      {hasAnyBcZones && (
                        <FilterChip
                          active={onlyBcZones}
                          onClick={() => setOnlyBcZones(o => !o)}
                          label={t('projectilePicker.filterHasBcZones')}
                          icon={<Layers className="h-3 w-3" />}
                        />
                      )}
                    </div>
                  )}

                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-[11px] text-primary hover:underline"
                    >
                      {t('projectilePicker.clearFilters')}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Results list (scroll container) */}
            <div
              ref={virtual.containerRef}
              role="listbox"
              aria-label={t('projectilePicker.title')}
              data-virtualized={useVirtual ? 'true' : 'false'}
              className="flex-1 overflow-y-auto px-2 pb-2 border-t border-border bg-card/30"
            >
              {/* Manual entry / clear — always rendered, always at the top */}
              <button
                type="button"
                onClick={() => handleRowPick('')}
                className={cn(
                  'w-full text-left px-3 py-2 mt-2 mb-1 rounded-md text-xs italic border transition-colors',
                  selectedId === ''
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-dashed border-border text-muted-foreground hover:bg-muted/40',
                )}
              >
                — {t('calc.manualEntry')} —
              </button>

              {/* Tranche N — Quick-access sections (only when no search/filter active) */}
              {showQuickAccess && (
                <div
                  data-testid="quick-access"
                  className="space-y-2 mt-1 mb-2 px-1"
                >
                  {favoriteProjectiles.length > 0 && (
                    <QuickAccessSection
                      testid="favorites-section"
                      icon={<Star className="h-3 w-3 fill-primary text-primary" aria-hidden />}
                      title={t('projectilePicker.favorites')}
                      items={favoriteProjectiles}
                      selectedId={selectedId}
                      isFavorite={isFavorite}
                      onPick={handleRowPick}
                      onToggleFav={handleToggleFav}
                    />
                  )}
                  {recentProjectiles.length > 0 && (
                    <QuickAccessSection
                      testid="recents-section"
                      icon={<Clock className="h-3 w-3 text-muted-foreground" aria-hidden />}
                      title={t('projectilePicker.recents')}
                      items={recentProjectiles}
                      selectedId={selectedId}
                      isFavorite={isFavorite}
                      onPick={handleRowPick}
                      onToggleFav={handleToggleFav}
                      action={
                        <button
                          type="button"
                          onClick={clearRecents}
                          className="text-[10px] text-muted-foreground hover:text-primary hover:underline"
                        >
                          {t('projectilePicker.clearRecents')}
                        </button>
                      }
                    />
                  )}
                </div>
              )}

              {filtered.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {t('projectilePicker.noResults')}
                </div>
              ) : useVirtual ? (
                <div
                  style={{
                    paddingTop: virtual.paddingTop,
                    paddingBottom: virtual.paddingBottom,
                  }}
                >
                  <ul className="space-y-1">
                    {visibleSlice.map(p => (
                      <li
                        key={p.id}
                        style={{ height: ROW_HEIGHT - 4 /* matches space-y-1 gap */ }}
                      >
                        <ProjectileRow
                          projectile={p}
                          selected={p.id === selectedId}
                          favorite={isFavorite(p.id)}
                          onPick={handleRowPick}
                          onToggleFav={handleToggleFav}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <ul className="space-y-1">
                  {visibleSlice.map(p => (
                    <li key={p.id}>
                      <ProjectileRow
                        projectile={p}
                        selected={p.id === selectedId}
                        favorite={isFavorite(p.id)}
                        onPick={handleRowPick}
                        onToggleFav={handleToggleFav}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="px-4 py-2 border-t border-border bg-muted/20 text-[11px] text-muted-foreground flex items-center justify-between shrink-0">
              <span>
                {t('projectilePicker.resultsCount', {
                  shown: filtered.length,
                  total: projectiles.length,
                })}
              </span>
              {useVirtual && (
                <span className="text-[10px] uppercase tracking-wide opacity-70">
                  {t('projectilePicker.virtualized')}
                </span>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────── Internal small UI bits ───────────────────── */

function FilterChip({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] border transition-colors',
        active
          ? 'border-primary/40 bg-primary/15 text-primary'
          : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted/60',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

interface RowProps {
  projectile: Projectile;
  selected: boolean;
  onPick: (id: string) => void;
}

const ProjectileRow = memo(function ProjectileRow({ projectile, selected, onPick }: RowProps) {
  const { t } = useI18n();
  const p = projectile;

  const weightDisplay =
    p.weightGrains !== undefined
      ? `${p.weightGrains} gr`
      : p.weight !== undefined
        ? `${p.weight} gr`
        : '—';

  const diameterDisplay =
    p.diameterMm !== undefined
      ? `${p.diameterMm.toFixed(2)} mm`
      : p.diameter !== undefined && p.diameter > 0
        ? `${p.diameter.toFixed(2)} mm`
        : null;

  const caliberDisplay = p.caliberLabel || p.caliber || '—';

  const bcModel = p.bcModel ?? 'G1';
  const hasZones = pickerHasBcZones(p);
  const isImported = pickerIsImported(p);

  return (
    <button
      type="button"
      onClick={() => onPick(p.id)}
      role="option"
      aria-selected={selected}
      data-projectile-id={p.id}
      className={cn(
        'w-full h-full text-left p-2.5 rounded-md border transition-colors flex items-start gap-2',
        selected
          ? 'border-primary/40 bg-primary/10'
          : 'border-border bg-card/60 hover:bg-muted/40',
      )}
    >
      <Check
        className={cn(
          'h-4 w-4 mt-0.5 shrink-0',
          selected ? 'text-primary' : 'opacity-0',
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1 space-y-1">
        {/* Title row */}
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="font-medium text-sm truncate">
            {p.brand} {p.model}
          </span>
          {p.projectileType && (
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              · {p.projectileType}
            </span>
          )}
        </div>
        {/* Specs row */}
        <div className="text-[11px] font-mono text-muted-foreground flex flex-wrap gap-x-2 gap-y-0.5">
          <span>{caliberDisplay}</span>
          <span>· {weightDisplay}</span>
          <span>
            · BC {p.bc?.toFixed(3) ?? '—'} {bcModel}
          </span>
          {diameterDisplay && <span>· ⌀ {diameterDisplay}</span>}
          {p.shape && <span>· {p.shape}</span>}
        </div>
        {/* Badges row */}
        {(hasZones || isImported) && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {hasZones && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary border border-primary/20"
                title={t('projectiles.list.bcZonesBadgeTitle')}
              >
                <Layers className="h-2.5 w-2.5" aria-hidden />
                {t('projectilePicker.bcZones')}
              </span>
            )}
            {isImported && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] bg-muted/60 text-muted-foreground border border-border"
                title={t('projectiles.list.importedBadgeTitle', {
                  source: p.importedFrom ?? '',
                })}
              >
                <Database className="h-2.5 w-2.5" aria-hidden />
                {t('projectilePicker.imported')}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
});

/** Test-only export — exposes internal tuning constants. */
export const __PICKER_INTERNAL = {
  ROW_HEIGHT,
  VIRTUALIZATION_THRESHOLD,
  SEARCH_DEBOUNCE_MS,
};
