import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

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

/** Dropdown that lists library entities with empty-state CTA. */
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
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">— {placeholder} —</option>
          {options.map(o => (
            <option key={o.id} value={o.id}>
              {o.label}
              {o.sub ? ` · ${o.sub}` : ''}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
