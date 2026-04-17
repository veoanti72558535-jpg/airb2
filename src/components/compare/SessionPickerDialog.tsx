import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Session } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The session that was already selected on the source page. */
  source: Session | null;
  /** All available sessions (the source one will be filtered out). */
  sessions: Session[];
  /** Called with the chosen second session when the user picks one. */
  onPick: (other: Session) => void;
}

/**
 * Lightweight picker dialog: lets the user select a second session to compare
 * against the source one. Filters out the source session itself and supports
 * a quick text search across name, notes and tags.
 */
export function SessionPickerDialog({ open, onOpenChange, source, sessions, onPick }: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions
      .filter(s => s.id !== source?.id)
      .filter(s => !q || `${s.name} ${s.notes ?? ''} ${s.tags.join(' ')}`.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [sessions, query, source]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('compare.pickSecond')}</DialogTitle>
          <DialogDescription>
            {source
              ? t('compare.pickSecondHint', { name: source.name })
              : t('compare.pickSecondAny')}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('sessions.searchPlaceholder')}
            className="w-full bg-muted border border-border rounded-md pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto -mx-1 px-1 space-y-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground italic p-3 text-center">
              {t('compare.noOther')}
            </p>
          ) : (
            filtered.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onPick(s);
                  onOpenChange(false);
                }}
                className="w-full text-left rounded-md border border-border p-2.5 hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                <div className="font-medium text-sm truncate">{s.name}</div>
                <div className="text-[11px] text-muted-foreground font-mono mt-0.5 truncate">
                  {s.input.muzzleVelocity} m/s · BC {s.input.bc} · {s.input.projectileWeight} gr
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {new Date(s.createdAt).toLocaleString()}
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
