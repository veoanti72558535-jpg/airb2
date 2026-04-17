import React from 'react';
import { RotateCcw } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export interface FilterChipOption {
  /** URL/value used for matching. */
  value: string;
  /** Label rendered in the chip (defaults to `value`). */
  label?: string;
  /** Count badge appended in parentheses. */
  count: number;
  /** Disable the chip when count is 0 (default true). */
  disableWhenZero?: boolean;
}

interface FilterChipsProps {
  /** Short uppercase label shown before the chips (e.g. "Marque", "Calibre"). */
  label: string;
  /** Currently active value, or null when "Tous" is selected. */
  value: string | null;
  onChange: (next: string | null) => void;
  /** Available options. */
  options: FilterChipOption[];
  /** Total count for the "All" chip. */
  totalCount: number;
  /** Use monospace font for option labels (good for numeric values like calibers/tubes). */
  monoLabels?: boolean;
  /** Optional reset button shown at the right end. */
  onReset?: () => void;
  /** When false, the reset button stays hidden even if `onReset` is provided. */
  showReset?: boolean;
}

/**
 * Generic filter chip row used across Library pages (Airguns, Projectiles, Optics).
 * Renders an "All (n)" chip + one chip per option with count badges, all themed via
 * design tokens. Optional reset button at the right end.
 */
export function FilterChips({
  label,
  value,
  onChange,
  options,
  totalCount,
  monoLabels = false,
  onReset,
  showReset = false,
}: FilterChipsProps) {
  const { t } = useI18n();
  const baseChip = 'px-2.5 py-1 rounded text-xs font-medium transition-colors';
  const activeChip = 'bg-primary/10 text-primary border border-primary/40';
  const inactiveChip = 'bg-muted text-muted-foreground border border-border hover:bg-muted/70';

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground mr-1">
        {label}
      </span>
      <button
        onClick={() => onChange(null)}
        className={`${baseChip} ${value === null ? activeChip : inactiveChip}`}
      >
        {t('optics.filterAll')} ({totalCount})
      </button>
      {options.map(opt => {
        const active = value !== null && value.toLowerCase() === opt.value.toLowerCase();
        const isZero = opt.count === 0;
        const disabled = isZero && (opt.disableWhenZero ?? true);
        return (
          <button
            key={opt.value}
            onClick={() => onChange(active ? null : opt.value)}
            disabled={disabled}
            className={`${baseChip} ${monoLabels ? 'font-mono' : ''} disabled:opacity-40 disabled:cursor-not-allowed ${
              active ? activeChip : inactiveChip
            }`}
          >
            {opt.label ?? opt.value} ({opt.count})
          </button>
        );
      })}
      {onReset && showReset && (
        <button
          onClick={onReset}
          className="ml-auto px-2.5 py-1 rounded text-xs font-medium transition-colors bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20 inline-flex items-center gap-1"
        >
          <RotateCcw className="h-3 w-3" />
          {t('optics.resetFilters')}
        </button>
      )}
    </div>
  );
}
