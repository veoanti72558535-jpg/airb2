import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { History, ChevronRight, Star } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { sessionStore } from '@/lib/storage';

interface Props {
  /** Field of Session to filter on. */
  field: 'airgunId' | 'projectileId' | 'opticId';
  /** Id of the entity to match. */
  id: string;
}

/**
 * List of sessions referencing the current entity. Click a session to reload it
 * in the calculator (uses /calc?session=<id> handled by QuickCalc).
 */
export function LinkedSessions({ field, id }: Props) {
  const { t, locale } = useI18n();
  const sessions = useMemo(
    () =>
      sessionStore
        .getAll()
        .filter(s => s[field] === id)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [field, id],
  );

  return (
    <section className="surface-card p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1.5">
          <History className="h-3.5 w-3.5" />
          {t('detail.linkedSessions')}
        </h2>
        <span className="text-[10px] text-muted-foreground font-mono">
          {sessions.length}
        </span>
      </div>
      {sessions.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          {t('detail.noLinkedSessions')}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {sessions.slice(0, 8).map(s => (
            <li key={s.id}>
              <Link
                to={`/calc?session=${s.id}`}
                className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-md hover:bg-muted/60 transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate flex items-center gap-1.5">
                    {s.favorite && (
                      <Star className="h-3 w-3 text-primary fill-primary shrink-0" />
                    )}
                    {s.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    {new Date(s.updatedAt).toLocaleDateString(locale)} ·{' '}
                    {s.input.muzzleVelocity} m/s · z{s.input.zeroRange}m
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
