import { useMemo, useState } from 'react';
import { X, Check, Search, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/lib/i18n';
import { SEED_OPTICS, SeedOptic } from '@/lib/seed-optics';
import { opticStore } from '@/lib/storage';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  existingNames: Set<string>;
}

const BRAND_GROUPS: { label: string; match: (name: string) => boolean }[] = [
  { label: 'FX', match: n => n.startsWith('FX ') },
  { label: 'Element', match: n => n.startsWith('Element ') },
  { label: 'Discovery', match: n => n.startsWith('Discovery ') },
  { label: 'Pard', match: n => n.startsWith('Pard ') },
  { label: 'MTC', match: n => n.startsWith('MTC ') },
];

export function ImportPresetOpticsModal({ open, onClose, onImported, existingNames }: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return SEED_OPTICS.filter(o => {
      if (activeBrand && !BRAND_GROUPS.find(b => b.label === activeBrand)?.match(o.name)) return false;
      if (query && !o.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [query, activeBrand]);

  const toggle = (name: string) => {
    setSelected(s => {
      const next = new Set(s);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every(o => selected.has(o.name) || existingNames.has(o.name));

  const toggleAll = () => {
    setSelected(s => {
      const next = new Set(s);
      if (allFilteredSelected) {
        filtered.forEach(o => next.delete(o.name));
      } else {
        filtered.forEach(o => { if (!existingNames.has(o.name)) next.add(o.name); });
      }
      return next;
    });
  };

  const handleImport = () => {
    let count = 0;
    SEED_OPTICS.forEach((o: SeedOptic) => {
      if (selected.has(o.name) && !existingNames.has(o.name)) {
        opticStore.create(o);
        count++;
      }
    });
    toast({ title: t('optics.importDone', { count }) });
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
                <h2 className="text-base font-heading font-bold">{t('optics.importTitle')}</h2>
                <p className="text-xs text-muted-foreground mt-1">{t('optics.importDesc')}</p>
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
                  placeholder={t('optics.searchPreset')}
                  className="w-full bg-muted border border-border rounded-md pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex gap-1 overflow-x-auto">
                <button
                  onClick={() => setActiveBrand(null)}
                  className={cn('px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap',
                    !activeBrand ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}
                >Tout</button>
                {BRAND_GROUPS.map(b => (
                  <button
                    key={b.label}
                    onClick={() => setActiveBrand(b.label === activeBrand ? null : b.label)}
                    className={cn('px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap',
                      activeBrand === b.label ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}
                  >{b.label}</button>
                ))}
              </div>
              <button onClick={toggleAll} className="text-xs text-primary hover:underline">
                {allFilteredSelected ? t('optics.deselectAll') : t('optics.selectAll')}
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filtered.map(o => {
                const exists = existingNames.has(o.name);
                const isSel = selected.has(o.name);
                return (
                  <button
                    key={o.name}
                    disabled={exists}
                    onClick={() => toggle(o.name)}
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
                      <div className="text-sm font-medium truncate">{o.name}</div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <span className="tactical-badge">{o.clickValue} {o.clickUnit}/click</span>
                        {o.tubeDiameter && <span className="tactical-badge">⌀ {o.tubeDiameter}mm</span>}
                        {o.magCalibration && <span className="tactical-badge">cal {o.magCalibration}×</span>}
                        {o.mountHeight ? <span className="text-[10px] text-muted-foreground font-mono self-center">mount {o.mountHeight}mm</span> : null}
                      </div>
                      {o.notes && <div className="text-[11px] text-muted-foreground mt-1">{o.notes}</div>}
                      {exists && <div className="text-[10px] text-muted-foreground mt-1 italic">{t('optics.alreadyExists')}</div>}
                    </div>
                  </button>
                );
              })}
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
                {t('optics.importSelected', { count: selected.size })}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
