import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  X,
  Check,
  Plus,
  Layers,
  Database,
  Filter as FilterIcon,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { calToken, buildCaliberCounts } from '@/lib/caliber';
import { Projectile, ProjectileType } from '@/lib/types';

/**
 * Tranche L — sélecteur projectile avancé pour QuickCalc.
 *
 * Objectifs :
 * - retrouver vite un projectile parmi des milliers (bullets4)
 * - filtres : caliber, type, importé, BC zones
 * - tri : pertinence (par défaut), marque, poids, BC, calibre
 * - mobile-friendly (modal full-width compact)
 * - rétro-compatible : projectile legacy (sans champs enrichis) reste affiché
 *
 * IMPORTANT : ce composant n'effectue AUCUN calcul. Il se contente de
 * sélectionner un id de projectile et de le renvoyer via `onSelect`.
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

/** Tokenized substring match across brand, model, caliber, caliberLabel, notes. */
function matchesQuery(p: Projectile, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const hay = [
    p.brand,
    p.model,
    p.caliber,
    p.caliberLabel ?? '',
    p.shape ?? '',
    p.projectileType ?? '',
    p.notes ?? '',
  ]
    .join(' ')
    .toLowerCase();
  return tokens.every(tok => hay.includes(tok));
}

const TYPE_VALUES: ProjectileType[] = ['pellet', 'slug', 'bb', 'dart', 'other'];

export function ProjectilePicker({
  open,
  onOpenChange,
  projectiles,
  selectedId,
  onSelect,
  addHref = '/library',
}: Props) {
  const { t } = useI18n();

  const [query, setQuery] = useState('');
  const [caliberFilter, setCaliberFilter] = useState<string>(''); // '' = all
  const [typeFilter, setTypeFilter] = useState<string>(''); // '' = all
  const [onlyImported, setOnlyImported] = useState(false);
  const [onlyBcZones, setOnlyBcZones] = useState(false);
  const [sortBy, setSortBy] = useState<ProjectilePickerSort>('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset transient state on open/close.
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery('');
      setShowFilters(false);
    }
  }, [open]);

  /** Caliber availability — only show calibers actually present in the data. */
  const caliberCounts = useMemo(
    () => buildCaliberCounts(projectiles, p => p.caliber),
    [projectiles],
  );

  /** Type availability — only show types actually present. */
  const typeCounts = useMemo(() => {
    const map = new Map<string, number>();
    projectiles.forEach(p => {
      const t2 = p.projectileType;
      if (!t2) return;
      map.set(t2, (map.get(t2) ?? 0) + 1);
    });
    return TYPE_VALUES.filter(v => (map.get(v) ?? 0) > 0).map(value => ({
      value,
      count: map.get(value) ?? 0,
    }));
  }, [projectiles]);

  const hasAnyImported = useMemo(() => projectiles.some(pickerIsImported), [projectiles]);
  const hasAnyBcZones = useMemo(() => projectiles.some(pickerHasBcZones), [projectiles]);

  const tokens = useMemo(
    () =>
      query
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean),
    [query],
  );

  const filtered = useMemo(() => {
    let list = projectiles.filter(p => matchesQuery(p, tokens));
    if (caliberFilter) list = list.filter(p => calToken(p.caliber) === caliberFilter);
    if (typeFilter) list = list.filter(p => p.projectileType === typeFilter);
    if (onlyImported) list = list.filter(pickerIsImported);
    if (onlyBcZones) list = list.filter(pickerHasBcZones);

    const sorted = [...list];
    switch (sortBy) {
      case 'brand':
        sorted.sort((a, b) =>
          `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`, undefined, {
            sensitivity: 'base',
          }),
        );
        break;
      case 'weight':
        sorted.sort((a, b) => (a.weight ?? 0) - (b.weight ?? 0));
        break;
      case 'bc':
        sorted.sort((a, b) => (b.bc ?? 0) - (a.bc ?? 0));
        break;
      case 'caliber':
        sorted.sort((a, b) =>
          calToken(a.caliber).localeCompare(calToken(b.caliber), undefined, { numeric: true }),
        );
        break;
      case 'relevance':
      default:
        // Keep insertion order — already roughly recency-based via store.
        break;
    }
    return sorted;
  }, [projectiles, tokens, caliberFilter, typeFilter, onlyImported, onlyBcZones, sortBy]);

  const activeFilterCount =
    (caliberFilter ? 1 : 0) +
    (typeFilter ? 1 : 0) +
    (onlyImported ? 1 : 0) +
    (onlyBcZones ? 1 : 0);

  const clearFilters = () => {
    setCaliberFilter('');
    setTypeFilter('');
    setOnlyImported(false);
    setOnlyBcZones(false);
  };

  const pick = (id: string) => {
    onSelect(id);
    onOpenChange(false);
  };

  const isEmptyLibrary = projectiles.length === 0;

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
                  {/* Caliber */}
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

                  {/* Type */}
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

                  {/* Flags */}
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

            {/* Results list */}
            <div
              role="listbox"
              aria-label={t('projectilePicker.title')}
              className="flex-1 overflow-y-auto px-2 pb-2 border-t border-border bg-card/30"
            >
              {/* Manual entry / clear */}
              <button
                type="button"
                onClick={() => pick('')}
                className={cn(
                  'w-full text-left px-3 py-2 mt-2 mb-1 rounded-md text-xs italic border transition-colors',
                  selectedId === ''
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-dashed border-border text-muted-foreground hover:bg-muted/40',
                )}
              >
                — {t('calc.manualEntry')} —
              </button>

              {filtered.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {t('projectilePicker.noResults')}
                </div>
              ) : (
                <ul className="space-y-1">
                  {filtered.map(p => (
                    <li key={p.id}>
                      <ProjectileRow
                        projectile={p}
                        selected={p.id === selectedId}
                        onPick={() => pick(p.id)}
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

function ProjectileRow({
  projectile,
  selected,
  onPick,
}: {
  projectile: Projectile;
  selected: boolean;
  onPick: () => void;
}) {
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
      onClick={onPick}
      role="option"
      aria-selected={selected}
      data-projectile-id={p.id}
      className={cn(
        'w-full text-left p-2.5 rounded-md border transition-colors flex items-start gap-2',
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
}
