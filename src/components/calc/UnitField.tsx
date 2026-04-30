import { useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useUnits } from '@/hooks/use-units';
import { useI18n } from '@/lib/i18n';
import { unitCategories } from '@/lib/units';
import { convertUnit } from '@/lib/units-helpers';
import { cn } from '@/lib/utils';
import { UnitTag } from '@/components/devtools/UnitTag';

interface UnitFieldProps {
  label: string;
  /** Unit category key from unitCategories (e.g. 'velocity', 'distance', 'weight'…). */
  category: string;
  /** Current value in the user's currently displayed unit. */
  value: number;
  /** Called with the new value, expressed in the SAME unit currently displayed. */
  onChange: (next: number) => void;
  step?: number;
  hint?: string;
  /** Restrict which unit options are offered (subset of category options). */
  allowedUnits?: string[];
  /** Disable the unit popover entirely. */
  lockUnit?: boolean;
  className?: string;
}

/**
 * Numeric input where the unit suffix is itself a popover button.
 * Tapping the unit lets the user switch unit; the value is converted
 * in place and the displayed unit becomes the new project preference
 * for that category.
 */
export function UnitField({
  label,
  category,
  value,
  onChange,
  step = 1,
  hint,
  allowedUnits,
  lockUnit,
  className,
}: UnitFieldProps) {
  const { locale } = useI18n();
  const { prefs, setUnitPref, symbol } = useUnits();
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const cat = useMemo(() => unitCategories.find(c => c.key === category), [category]);
  const currentUnit = prefs[category] ?? cat?.reference ?? '';
  // The input is "SI" only if the user happens to be displaying the
  // category's reference unit. Otherwise the value entered is a display
  // conversion that the parent must convert back via `useUnits().toRef()`
  // before handing it to the engine — that's the most common
  // re-injection bug, so we surface it explicitly.
  const isSiInput = !!cat && currentUnit === cat.reference;
  const options = useMemo(() => {
    if (!cat) return [];
    if (!allowedUnits?.length) return cat.options;
    return cat.options.filter(o => allowedUnits.includes(o.value));
  }, [cat, allowedUnits]);

  const handleUnitChange = (nextUnit: string) => {
    if (nextUnit === currentUnit) {
      setOpen(false);
      return;
    }
    const converted = convertUnit(category, value, currentUnit, nextUnit);
    setUnitPref(category, nextUnit);
    onChange(converted);
    setOpen(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          {label}
          {cat && (
            <UnitTag
              kind={isSiInput ? 'si' : 'display'}
              reference={cat.reference}
              display={currentUnit}
              label={label}
            />
          )}
        </label>
        {hint && <span className="text-[10px] text-muted-foreground/70">{hint}</span>}
      </div>
      <div className="flex items-center bg-muted/40 border border-border rounded-md focus-within:ring-1 focus-within:ring-primary transition-colors">
        <input
          ref={inputRef}
          type="number"
          inputMode="decimal"
          step={step}
          value={Number.isFinite(value) ? value : ''}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="flex-1 min-w-0 bg-transparent px-3 py-2 text-sm font-mono focus:outline-none"
        />
        {options.length === 0 || lockUnit ? (
          <span className="px-2.5 py-2 text-[11px] text-muted-foreground font-mono border-l border-border/50">
            {symbol(category)}
          </span>
        ) : (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={`Change unit for ${label}`}
                className="px-2.5 py-2 text-[11px] text-muted-foreground hover:text-foreground font-mono border-l border-border/50 inline-flex items-center gap-1 transition-colors"
              >
                {symbol(category)}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-44 p-1">
              <ul role="listbox" className="max-h-64 overflow-y-auto">
                {options.map(o => (
                  <li key={o.value}>
                    <button
                      type="button"
                      onClick={() => handleUnitChange(o.value)}
                      className={cn(
                        'w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between gap-2 hover:bg-muted',
                        o.value === currentUnit && 'bg-primary/10 text-primary font-medium',
                      )}
                    >
                      <span>{locale === 'fr' ? o.labelFr : o.labelEn}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {o.symbol}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
