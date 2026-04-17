import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ChevronDown, X, Check, Search } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface EntityOption {
  id: string;
  label: string;
  sub?: string;
}

interface EntitySelectProps {
  label: string;
  value: string;
  onChange: (id: string) => void;
  options: EntityOption[];
  placeholder: string;
  emptyText: string;
  addHref?: string;
}

/**
 * Combobox: type to filter, click to pick. Tokenized substring match across
 * label + sub (e.g. typing "jumbo 18" narrows to JSB Exact Jumbo Heavy 18.13gr).
 *
 * Uses a Radix Popover so the dropdown renders in a portal — it never gets
 * clipped or hidden by sibling sections that have their own stacking context.
 */
export function EntitySelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  emptyText,
  addHref,
}: EntitySelectProps) {
  const { t } = useI18n();
  const isEmpty = options.length === 0;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected = useMemo(() => options.find(o => o.id === value), [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    const tokens = q.split(/\s+/).filter(Boolean);
    return options.filter(o => {
      const hay = `${o.label} ${o.sub ?? ''}`.toLowerCase();
      return tokens.every(tok => hay.includes(tok));
    });
  }, [options, query]);

  // Reset query + highlight on open/close.
  useEffect(() => {
    if (open) {
      setHighlight(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery('');
    }
  }, [open]);

  // Keep highlighted item in view.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[highlight] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open, filtered.length]);

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(h => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filtered[highlight];
      if (opt) pick(opt.id);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </label>

      {isEmpty ? (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-dashed border-border bg-muted/20 text-xs text-muted-foreground">
          <span>{emptyText}</span>
          {addHref && (
            <Link
              to={addHref}
              className="inline-flex items-center gap-1 text-primary font-medium hover:underline"
            >
              <Plus className="h-3 w-3" />
              {t('calc.addInLibrary')}
            </Link>
          )}
        </div>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              ref={triggerRef}
              type="button"
              className="w-full flex items-center justify-between gap-2 bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-left focus:outline-none focus:ring-1 focus:ring-primary hover:bg-muted/60"
            >
              <span className={cn('truncate', !selected && 'text-muted-foreground')}>
                {selected ? (
                  <>
                    <span>{selected.label}</span>
                    {selected.sub && (
                      <span className="text-muted-foreground"> · {selected.sub}</span>
                    )}
                  </>
                ) : (
                  <>— {placeholder} —</>
                )}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                {selected && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={e => {
                      e.stopPropagation();
                      onChange('');
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        onChange('');
                      }
                    }}
                    className="p-0.5 rounded hover:bg-muted text-muted-foreground cursor-pointer"
                    aria-label={t('common.clear')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                )}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="start"
            sideOffset={4}
            className="p-0 w-[--radix-popover-trigger-width] surface-elevated overflow-hidden"
            onOpenAutoFocus={e => {
              e.preventDefault();
              inputRef.current?.focus();
            }}
          >
            {/* Search input */}
            <div className="relative border-b border-border">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => {
                  setQuery(e.target.value);
                  setHighlight(0);
                }}
                onKeyDown={onKeyDown}
                placeholder={t('common.searchHint')}
                className="w-full bg-transparent pl-8 pr-3 py-2 text-sm focus:outline-none"
              />
            </div>

            {/* Manual-entry / clear option */}
            <button
              type="button"
              onClick={() => pick('')}
              className={cn(
                'w-full text-left px-3 py-2 text-xs italic text-muted-foreground border-b border-border hover:bg-muted/40',
                !value && 'bg-primary/5 text-primary'
              )}
            >
              — {placeholder} —
            </button>

            {filtered.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                {t('common.noResults')}
              </div>
            ) : (
              <ul ref={listRef} className="max-h-64 overflow-y-auto">
                {filtered.map((o, idx) => {
                  const isSel = o.id === value;
                  const isHi = idx === highlight;
                  return (
                    <li key={o.id}>
                      <button
                        type="button"
                        onClick={() => pick(o.id)}
                        onMouseEnter={() => setHighlight(idx)}
                        className={cn(
                          'w-full text-left px-3 py-2 text-sm flex items-start gap-2 transition-colors',
                          isHi ? 'bg-primary/10' : 'hover:bg-muted/40',
                          isSel && 'text-primary font-medium'
                        )}
                      >
                        <Check
                          className={cn(
                            'h-3.5 w-3.5 mt-0.5 shrink-0',
                            isSel ? 'text-primary' : 'opacity-0'
                          )}
                        />
                        <span className="flex-1 min-w-0">
                          <span className="block truncate">{o.label}</span>
                          {o.sub && (
                            <span className="block text-[11px] text-muted-foreground font-mono truncate">
                              {o.sub}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
