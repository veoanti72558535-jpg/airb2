import { useMemo, useState } from 'react';
import { X, Check, Search, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/lib/i18n';
import { SEED_PROJECTILES, SeedProjectile, seedProjectileKey } from '@/lib/seed-projectiles';
import { projectileStore } from '@/lib/storage';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  /** Set of seedProjectileKey() entries already in the user's library. */
  existingKeys: Set<string>;
}

const BRANDS = ['JSB', 'H&N', 'Air Arms', 'Crosman', 'Predator', 'NSA', 'FX', 'Air Venturi', 'Patriot', 'ZAN'] as const;
const CALIBERS = ['.177', '.20', '.22', '.25', '.30', '.35'] as const;
type TypeFilter = 'all' | 'pellet' | 'slug' | 'other';
type SortKey = 'name' | 'weight' | 'bc';

export function ImportPresetProjectilesModal({ open, onClose, onImported, existingKeys }: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [activeCaliber, setActiveCaliber] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const tokens = q ? q.split(/\s+/).filter(Boolean) : [];
    const list = SEED_PROJECTILES.filter(p => {
      if (activeBrand && p.brand !== activeBrand) return false;
      if (activeCaliber && p.caliber !== activeCaliber) return false;
      if (typeFilter !== 'all' && (p.projectileType ?? 'pellet') !== typeFilter) return false;
      if (tokens.length) {
        const hay = `${p.brand} ${p.model} ${p.caliber} ${p.weight} ${p.bc}`.toLowerCase();
        if (!tokens.every(tok => hay.includes(tok))) return false;
      }
      return true;
    });
    const sorted = [...list];
    if (sortKey === 'weight') sorted.sort((a, b) => a.weight - b.weight);
    else if (sortKey === 'bc') sorted.sort((a, b) => b.bc - a.bc);
    else sorted.sort((a, b) => `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`));
    return sorted;
  }, [query, activeBrand, activeCaliber, typeFilter, sortKey]);

  const toggle = (key: string) => {
    setSelected(s => {
      const next = new Set(s);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every(p => {
    const k = seedProjectileKey(p);
    return selected.has(k) || existingKeys.has(k);
  });

  const toggleAll = () => {
    setSelected(s => {
      const next = new Set(s);
      if (allFilteredSelected) {
        filtered.forEach(p => next.delete(seedProjectileKey(p)));
      } else {
        filtered.forEach(p => {
          const k = seedProjectileKey(p);
          if (!existingKeys.has(k)) next.add(k);
        });
      }
      return next;
    });
  };

  const handleImport = () => {
    let count = 0;
    SEED_PROJECTILES.forEach((p: SeedProjectile) => {
      const k = seedProjectileKey(p);
      if (selected.has(k) && !existingKeys.has(k)) {
        projectileStore.create(p);
        count++;
      }
    });
    toast({ title: t('projectiles.importDone', { count }) });
    setSelected(new Set());
    onImported();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="surface-elevated w-full sm:max-w-2xl max-h-[calc(100vh-5rem)] sm:max-h-[90vh] mb-16 sm:mb-0 flex flex-col rounded-t-xl sm:rounded-xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-border flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-heading font-bold">{t('projectiles.importTitle')}</h2>
                <p className="text-xs text-muted-foreground mt-1">{t('projectiles.importDesc')}</p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded hover:bg-muted text-muted-foreground shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Filters */}
            <div className="p-3 border-b border-border space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={t('projectiles.searchPreset')}
                  className="w-full bg-muted border border-border rounded-md pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Type filter */}
              <div className="flex gap-1 flex-wrap">
                {(['all', 'pellet', 'slug', 'other'] as TypeFilter[]).map(tf => (
                  <button
                    key={tf}
                    onClick={() => setTypeFilter(tf)}
                    className={cn('px-2.5 py-1 rounded text-xs font-medium',
                      typeFilter === tf ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}
                  >
                    {tf === 'all' ? t('optics.filterAll')
                      : tf === 'pellet' ? t('projectiles.typePellet')
                      : tf === 'slug' ? t('projectiles.typeSlug')
                      : t('projectiles.typeOther')}
                  </button>
                ))}
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{t('common.sortBy')}</span>
                {(['name', 'weight', 'bc'] as SortKey[]).map(sk => (
                  <button
                    key={sk}
                    onClick={() => setSortKey(sk)}
                    className={cn('px-2.5 py-1 rounded text-xs font-medium',
                      sortKey === sk ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}
                  >
                    {sk === 'name' ? t('common.sortName') : sk === 'weight' ? t('common.sortWeight') : t('common.sortBc')}
                  </button>
                ))}
              </div>

              {/* Caliber filter */}
              <div className="flex gap-1 overflow-x-auto">
                <button
                  onClick={() => setActiveCaliber(null)}
                  className={cn('px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap font-mono',
                    !activeCaliber ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}
                >{t('optics.filterAll')}</button>
                {CALIBERS.map(c => (
                  <button
                    key={c}
                    onClick={() => setActiveCaliber(c === activeCaliber ? null : c)}
                    className={cn('px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap font-mono',
                      activeCaliber === c ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}
                  >{c}</button>
                ))}
              </div>

              {/* Brand filter */}
              <div className="flex gap-1 overflow-x-auto">
                <button
                  onClick={() => setActiveBrand(null)}
                  className={cn('px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap',
                    !activeBrand ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}
                >{t('optics.filterAll')}</button>
                {BRANDS.map(b => (
                  <button
                    key={b}
                    onClick={() => setActiveBrand(b === activeBrand ? null : b)}
                    className={cn('px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap',
                      activeBrand === b ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}
                  >{b}</button>
                ))}
              </div>

              <button onClick={toggleAll} className="text-xs text-primary hover:underline">
                {allFilteredSelected ? t('optics.deselectAll') : t('optics.selectAll')}
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filtered.map(p => {
                const k = seedProjectileKey(p);
                const exists = existingKeys.has(k);
                const isSel = selected.has(k);
                return (
                  <button
                    key={k}
                    disabled={exists}
                    onClick={() => toggle(k)}
                    className={cn(
                      'w-full text-left p-2.5 rounded-md border transition-colors flex items-start gap-2',
                      exists
                        ? 'bg-muted/30 border-border opacity-60 cursor-not-allowed'
                        : isSel
                          ? 'bg-primary/10 border-primary/40'
                          : 'bg-muted/20 border-border hover:bg-muted/40'
                    )}
                  >
                    <div className={cn('h-4 w-4 rounded border flex items-center justify-center shrink-0 mt-0.5',
                      isSel ? 'bg-primary border-primary' : 'border-border')}>
                      {isSel && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{p.brand} {p.model}</div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <span className="tactical-badge">{p.caliber}</span>
                        <span className="tactical-badge">{p.weight} gr</span>
                        <span className="tactical-badge">BC {p.bc} {p.bcModel ?? 'G1'}</span>
                        {p.projectileType && (
                          <span className="tactical-badge">
                            {p.projectileType === 'pellet' ? t('projectiles.typePellet') : p.projectileType === 'slug' ? t('projectiles.typeSlug') : p.projectileType}
                          </span>
                        )}
                        {p.diameter ? <span className="text-[10px] text-muted-foreground font-mono self-center">⌀ {p.diameter}mm</span> : null}
                      </div>
                      {p.notes && <div className="text-[11px] text-muted-foreground mt-1">{p.notes}</div>}
                      {exists && <div className="text-[10px] text-muted-foreground mt-1 italic">{t('projectiles.alreadyExists')}</div>}
                    </div>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="p-6 text-center text-xs text-muted-foreground">{t('projectiles.noMatch')}</div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-3 py-2 bg-muted text-muted-foreground rounded-md text-sm"
              >{t('common.cancel')}</button>
              <button
                onClick={handleImport}
                disabled={selected.size === 0}
                className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-3.5 w-3.5" />
                {t('projectiles.importSelected', { count: selected.size })}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
