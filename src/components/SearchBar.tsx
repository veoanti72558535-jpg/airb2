import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  /** Number of items currently displayed after filtering. */
  count?: number;
  /** Total number of items before filtering. */
  total?: number;
}

/** Reusable search input with icon, clear button and optional results counter. */
export function SearchBar({ value, onChange, placeholder, ariaLabel, count, total }: SearchBarProps) {
  const showCounter = typeof count === 'number' && typeof total === 'number';
  const hasMatches = showCounter && count! > 0;
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel ?? placeholder}
          className="w-full bg-muted border border-border rounded-md pl-8 pr-8 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted-foreground/10 text-muted-foreground"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {showCounter && (
        <span
          className={`shrink-0 text-xs font-mono tabular-nums px-2 py-1 rounded border ${
            hasMatches
              ? 'bg-muted text-muted-foreground border-border'
              : 'bg-destructive/10 text-destructive border-destructive/30'
          }`}
          aria-live="polite"
          aria-atomic="true"
        >
          {count} / {total}
        </span>
      )}
    </div>
  );
}
