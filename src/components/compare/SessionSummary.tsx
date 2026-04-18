import { Star, Calendar, Cloud } from 'lucide-react';
import { Session } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { resolveSession, summariseWeather, buildInputDescriptor } from '@/lib/compare';
import { cn } from '@/lib/utils';
import { EngineBadge } from '@/components/sessions/EngineBadge';

interface Props {
  session: Session;
  /** Either 'A' or 'B' — used for the colored badge in the corner. */
  letter: 'A' | 'B';
}

/**
 * Compact card summarising one session in a comparison view.
 * Always renders with safe fallbacks for legacy sessions (missing weather,
 * missing entity references) — the comparison must not crash on old data.
 */
export function SessionSummary({ session, letter }: Props) {
  const { t } = useI18n();
  const r = resolveSession(session);
  const wsrc = session.input.weather?.source;
  const sourceLabel =
    wsrc === 'auto' ? t('weather.sourceAuto') :
    wsrc === 'mixed' ? t('weather.sourceMixed') :
    t('weather.sourceManual');
  const sourceClass =
    wsrc === 'auto' ? 'bg-primary/15 text-primary border-primary/30' :
    wsrc === 'mixed' ? 'bg-amber-500/15 text-amber-500 border-amber-500/30 dark:text-amber-400' :
    'bg-muted text-muted-foreground border-border';

  return (
    <div className="surface-elevated p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md font-heading font-bold text-sm border',
            letter === 'A'
              ? 'bg-primary/15 text-primary border-primary/30'
              : 'bg-secondary/15 text-secondary-foreground border-secondary/30',
          )}
          aria-label={letter === 'A' ? t('compare.sessionA') : t('compare.sessionB')}
        >
          {letter}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-semibold text-sm truncate">{session.name}</h3>
            {session.favorite && (
              <Star className="h-3.5 w-3.5 text-primary shrink-0" fill="currentColor" />
            )}
            <EngineBadge session={session} size="xs" />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(session.createdAt).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="text-xs font-mono text-muted-foreground">
        {buildInputDescriptor(session.input)}
      </div>

      {/* Equipment — every line is optional and individually rendered to stay
          robust against legacy sessions referencing deleted entities. */}
      <dl className="grid grid-cols-1 gap-1 text-xs">
        {r.airgun && (
          <Row label={t('compare.fieldAirgun')} value={`${r.airgun.brand} ${r.airgun.model}`} sub={r.airgun.caliber} />
        )}
        {r.projectile && (
          <Row
            label={t('compare.fieldProjectile')}
            value={`${r.projectile.brand} ${r.projectile.model}`}
            sub={`${session.input.projectileWeight} gr · BC ${session.input.bc}`}
          />
        )}
        {r.optic && (
          <Row
            label={t('compare.fieldOptic')}
            value={r.optic.name}
            sub={`${r.optic.focalPlane ?? 'FFP'} · ${session.input.clickValue ?? r.optic.clickValue} ${session.input.clickUnit ?? r.optic.clickUnit}`}
          />
        )}
        {r.tuneName && <Row label={t('compare.fieldTune')} value={r.tuneName} />}
      </dl>

      {/* Weather strip mirrors ResultsCard so the user recognises the badge style. */}
      {session.input.weather && (
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono pt-1 border-t border-border/40">
          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded border uppercase tracking-wide', sourceClass)}>
            <Cloud className="h-3 w-3" />
            {sourceLabel}
          </span>
          <span className="text-muted-foreground/80">
            {summariseWeather(session.input.weather)}
          </span>
          {session.input.zeroWeather && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-border/60 text-muted-foreground uppercase tracking-wide">
              {t('sessions.badgeZeroWeather')}
            </span>
          )}
        </div>
      )}

      {(session.tags?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1">
          {session.tags.map(tag => (
            <span key={tag} className="tactical-badge">{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground text-[11px] uppercase tracking-wide shrink-0">{label}</dt>
      <dd className="text-right min-w-0">
        <div className="truncate font-medium">{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground font-mono truncate">{sub}</div>}
      </dd>
    </div>
  );
}
