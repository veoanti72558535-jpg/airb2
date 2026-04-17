import { useMemo, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { SessionDiffEntry } from '@/lib/compare';
import { TranslationKey } from '@/lib/translations';
import { cn } from '@/lib/utils';

interface Props {
  diff: SessionDiffEntry[];
}

const GROUP_KEYS: Record<SessionDiffEntry['group'], string> = {
  projectile: 'compare.groupProjectile',
  weapon: 'compare.groupWeapon',
  optic: 'compare.groupOptic',
  zeroing: 'compare.groupZeroing',
  distance: 'compare.groupDistance',
  weather: 'compare.groupWeather',
};

/**
 * Lists configuration differences between session A and session B grouped by
 * domain. Identical fields are hidden by default — toggleable. When neither
 * side has a value for a field we drop it entirely (no point in showing
 * "— vs —"). Different rows get a subtle amber accent so the eye lands on
 * what actually changed.
 */
export function DifferencesList({ diff }: Props) {
  const { t } = useI18n();
  const [showSame, setShowSame] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<SessionDiffEntry['group'], SessionDiffEntry[]>();
    for (const e of diff) {
      // Hide rows with no value at all on either side.
      if ((e.a == null || e.a === '' || e.a === '—') && (e.b == null || e.b === '' || e.b === '—')) continue;
      if (!showSame && e.same) continue;
      const arr = map.get(e.group) ?? [];
      arr.push(e);
      map.set(e.group, arr);
    }
    return Array.from(map.entries());
  }, [diff, showSame]);

  const diffCount = diff.filter(d => !d.same && (d.a != null || d.b != null)).length;

  return (
    <div className="surface-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-sm font-heading font-semibold">{t('compare.differences')}</h3>
          <p className="text-[11px] text-muted-foreground">
            {t('compare.differencesCount', { count: diffCount })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowSame(v => !v)}
          className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        >
          {showSame ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          {showSame ? t('compare.hideSame') : t('compare.showSame')}
        </button>
      </div>

      {groups.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">{t('compare.noDiff')}</p>
      ) : (
        <div className="space-y-3">
          {groups.map(([group, items]) => (
            <section key={group} className="space-y-1.5">
              <h4 className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                {t(GROUP_KEYS[group] as TranslationKey)}
              </h4>
              <ul className="rounded-lg border border-border/60 divide-y divide-border/40 overflow-hidden">
                {items.map(item => (
                  <li
                    key={`${group}-${item.labelKey}`}
                    className={cn(
                      'grid grid-cols-[1fr,auto,auto] gap-2 px-3 py-1.5 text-xs items-baseline',
                      !item.same && 'bg-warning/5',
                    )}
                  >
                    <span className="text-muted-foreground truncate">
                      {t(item.labelKey as TranslationKey)}
                    </span>
                    <ValueCell value={item.a} unit={item.unit} muted={item.same} />
                    <ValueCell value={item.b} unit={item.unit} muted={item.same} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ValueCell({
  value,
  unit,
  muted,
}: {
  value: SessionDiffEntry['a'];
  unit?: string;
  muted?: boolean;
}) {
  const display = value == null || value === '' ? '—' : value;
  return (
    <span
      className={cn(
        'font-mono text-right tabular-nums',
        muted ? 'text-muted-foreground' : 'text-foreground',
      )}
    >
      {display}
      {unit && display !== '—' && (
        <span className="text-muted-foreground ml-0.5 text-[10px]">{unit}</span>
      )}
    </span>
  );
}
