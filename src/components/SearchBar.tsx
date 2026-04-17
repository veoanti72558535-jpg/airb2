import { Search, X, Link2, Check } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { toast } from '@/hooks/use-toast';

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  /** Number of items currently displayed after filtering. */
  count?: number;
  /** Total number of items before filtering. */
  total?: number;
  /** Show a "copy filtered link" button that copies the current URL. */
  showCopyLink?: boolean;
}

/** Reusable search input with icon, clear button, optional results counter and copy-link button. */
export function SearchBar({
  value,
  onChange,
  placeholder,
  ariaLabel,
  count,
  total,
  showCopyLink,
}: SearchBarProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const showCounter = typeof count === 'number' && typeof total === 'number';
  const hasMatches = showCounter && count! > 0;

  const handleCopy = async () => {
    const url = window.location.href;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for non-secure contexts
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      toast({ title: t('common.linkCopied') });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: t('common.copyFailed'), variant: 'destructive' });
    }
  };

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
      {showCopyLink && (
        <button
          onClick={handleCopy}
          title={t('common.copyLink')}
          aria-label={t('common.copyLink')}
          className={`shrink-0 inline-flex items-center gap-1 px-2 py-1.5 rounded border text-xs font-medium transition-colors ${
            copied
              ? 'bg-primary/10 text-primary border-primary/40'
              : 'bg-muted text-muted-foreground border-border hover:bg-muted/70 hover:text-foreground'
          }`}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );
}
