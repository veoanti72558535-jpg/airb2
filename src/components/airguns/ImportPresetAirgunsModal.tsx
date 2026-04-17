import { useMemo, useState } from 'react';
import { X, Check, Search, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/lib/i18n';
import { SEED_AIRGUNS, SeedAirgun, seedAirgunKey } from '@/lib/seed-airguns';
import { airgunStore } from '@/lib/storage';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  /** Set of seedAirgunKey() entries already in the user's library. */
  existingKeys: Set<string>;
}

const CALIBERS = ['.177', '.22', '.25', '.30'] as const;

export function ImportPresetAirgunsModal({ open, onClose, onImported, existingKeys }: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [activeCaliber, setActiveCaliber] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Compute brand list dynamically from the dataset.
  const BRANDS = useMemo(() => Array.from(new Set(SEED_AIRGUNS.map(a => a.brand))).sort(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SEED_AIRGUNS.filter(a => {
      if (activeBrand && a.brand !== activeBrand) return false;
      if (activeCaliber && a.caliber !== activeCaliber) return false;
      if (q && !`${a.brand} ${a.model} ${a.notes ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, activeBrand, activeCaliber]);

  const toggle = (key: string) => {
    setSelected(s => {
      const next = new Set(s);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every(a => {
    const k = seedAirgunKey(a);
    return selected.has(k) || existingKeys.has(k);
  });

  const toggleAll = () => {
    setSelected(s => {
      const next = new Set(s);
      if (allFilteredSelected) {
        filtered.forEach(a => next.delete(seedAirgunKey(a)));
      } else {
        filtered.forEach(a => {
          const k = seedAirgunKey(a);
          if (!existingKeys.has(k)) next.add(k);
        });
      }
      return next;
    });
  };

  const handleImport = () => {
    let count = 0;
    SEED_AIRGUNS.forEach((a: SeedAirgun) => {
      const k = seedAirgunKey(a);
      if (selected.has(k) && !existingKeys.has(k)) {
        airgunStore.create(a);
        count++;
      }
    });
    toast({ title: t('airguns.importDone', { count }) });
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
                <h2 className="text-base font-heading font-bold">{t('airguns.importTitle')}</h2>
                <p className="text-xs text-muted-foreground mt-1">{t('airguns.importDesc')}</p>
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
                  placeholder={t('airguns.searchPreset')}
                  className="w-full bg-muted border border-border rounded-md pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
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
              {filtered.map(a => {
                const k = seedAirgunKey(a);
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
                      <div className="text-sm font-medium truncate">{a.brand} {a.model}</div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <span className="tactical-badge">{a.caliber}</span>
                        {a.barrelLength ? <span className="tactical-badge">{a.barrelLength}mm</span> : null}
                        {a.twistRate ? <span className="tactical-badge">1:{a.twistRate}″</span> : null}
                        {a.regPressure ? <span className="tactical-badge">Reg {a.regPressure}b</span> : null}
                        {a.fillPressure ? <span className="tactical-badge">Fill {a.fillPressure}b</span> : null}
                      </div>
                      {a.notes && <div className="text-[11px] text-muted-foreground mt-1">{a.notes}</div>}
                      {exists && <div className="text-[10px] text-muted-foreground mt-1 italic">{t('airguns.alreadyExists')}</div>}
                    </div>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="p-6 text-center text-xs text-muted-foreground">{t('airguns.noMatch')}</div>
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
                {t('airguns.importSelected', { count: selected.size })}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
