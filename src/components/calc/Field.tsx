import { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label: string;
  unit?: string;
  value: number | string;
  onChange: (v: number) => void;
  hint?: string;
  error?: string;
}

/** Compact labeled numeric input with unit suffix, used across calc sections. */
export function Field({ label, unit, value, onChange, hint, error, className, ...rest }: FieldProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </label>
        {hint && <span className="text-[10px] text-muted-foreground/70">{hint}</span>}
      </div>
      <div
        className={cn(
          'flex items-center bg-muted/40 border rounded-md focus-within:ring-1 focus-within:ring-primary transition-colors',
          error ? 'border-destructive' : 'border-border',
          className,
        )}
      >
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="flex-1 min-w-0 bg-transparent px-3 py-2 text-sm font-mono focus:outline-none"
          {...rest}
        />
        {unit && (
          <span className="px-2.5 py-2 text-[11px] text-muted-foreground font-mono border-l border-border/50">
            {unit}
          </span>
        )}
      </div>
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  );
}
