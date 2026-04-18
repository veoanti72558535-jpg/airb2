/**
 * Tranche C — SessionLineage
 *
 * Compact, mobile-friendly filiation chip for a session. Reads:
 *  - `derivedFromSessionId` → "Issue de : <name>" link to the original
 *  - count of sessions whose `derivedFromSessionId === session.id` →
 *    "Copies liées : N"
 *
 * Both lines are optional — the component renders nothing when neither
 * applies, so it's safe to drop into every card without visual noise.
 */

import { useMemo } from 'react';
import { GitFork, CornerDownRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { sessionStore } from '@/lib/storage';
import type { Session } from '@/lib/types';

interface Props {
  session: Session;
  /**
   * Optional pool of sessions to scan for linked copies. When omitted we
   * read from the store. Tests pass an explicit pool to stay deterministic.
   */
  allSessions?: Session[];
}

export function SessionLineage({ session, allSessions }: Props) {
  const { t } = useI18n();

  const pool = useMemo<Session[]>(
    () => allSessions ?? sessionStore.getAll(),
    [allSessions, session.id],
  );

  const parent = useMemo(() => {
    if (!session.derivedFromSessionId) return null;
    return pool.find(s => s.id === session.derivedFromSessionId) ?? null;
  }, [pool, session.derivedFromSessionId]);

  const linkedCopies = useMemo(
    () => pool.filter(s => s.derivedFromSessionId === session.id).length,
    [pool, session.id],
  );

  if (!session.derivedFromSessionId && linkedCopies === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
      {session.derivedFromSessionId && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border">
          <CornerDownRight className="h-3 w-3 shrink-0" aria-hidden />
          <span className="text-muted-foreground">{t('session.derivedFrom')}:</span>
          {parent ? (
            <Link
              to={`/sessions#${parent.id}`}
              className="font-medium text-foreground hover:text-primary truncate max-w-[160px]"
              onClick={e => e.stopPropagation()}
            >
              {parent.name}
            </Link>
          ) : (
            <span className="italic">{t('session.derivedFromMissing')}</span>
          )}
        </span>
      )}
      {linkedCopies > 0 && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
          <GitFork className="h-3 w-3 shrink-0" aria-hidden />
          <span>{t('session.linkedCopies')}:</span>
          <span className="font-mono font-semibold">{linkedCopies}</span>
        </span>
      )}
    </div>
  );
}
