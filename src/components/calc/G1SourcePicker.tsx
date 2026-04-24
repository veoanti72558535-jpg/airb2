import { Database, Zap } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { G1Source } from '@/lib/types';

/**
 * G1 drag-table picker — Avancé uniquement.
 *
 * Choix entre :
 *  - `legacy-piecewise` (défaut, bit-exact rétrocompatible)
 *  - `chairgun-table`   (table 79 pts ChairGun Elite, plus précise sub/transsonique)
 *
 * N'AGIT QUE quand `dragModel === 'G1'` et qu'il n'y a pas de
 * `customDragTable` projectile : sinon le picker reste affiché mais
 * désactivé avec une note explicative — pas de modification silencieuse
 * du sens d'un input.
 */
interface Props {
  value: G1Source;
  onChange: (next: G1Source) => void;
  /** Permet d'expliquer pourquoi le picker est inerte si applicable. */
  disabledReason?: string | null;
}

export function G1SourcePicker({ value, onChange, disabledReason }: Props) {
  const { t } = useI18n();
  const disabled = !!disabledReason;
  const options: Array<{
    id: G1Source;
    Icon: typeof Database;
    titleKey: 'g1Source.legacyTitle' | 'g1Source.chairgunTitle';
    descKey: 'g1Source.legacyDesc' | 'g1Source.chairgunDesc';
  }> = [
    {
      id: 'legacy-piecewise',
      Icon: Zap,
      titleKey: 'g1Source.legacyTitle',
      descKey: 'g1Source.legacyDesc',
    },
    {
      id: 'chairgun-table',
      Icon: Database,
      titleKey: 'g1Source.chairgunTitle',
      descKey: 'g1Source.chairgunDesc',
    },
  ];

  return (
    <div className="rounded-lg border border-border bg-card/40 px-3 py-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('g1Source.title')}
        </div>
        <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          G1
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map(opt => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.id)}
              aria-pressed={active}
              className={cn(
                'text-left rounded-md border px-2.5 py-2 transition-colors',
                'flex items-start gap-2 disabled:opacity-60 disabled:cursor-not-allowed',
                active
                  ? 'border-primary/60 bg-primary/10 text-foreground'
                  : 'border-border bg-background hover:bg-muted/40 text-muted-foreground hover:text-foreground',
              )}
            >
              <opt.Icon
                className={cn(
                  'h-3.5 w-3.5 mt-0.5 shrink-0',
                  active ? 'text-primary' : '',
                )}
              />
              <div className="min-w-0">
                <div className="text-xs font-semibold">{t(opt.titleKey)}</div>
                <div className="text-[10px] leading-snug text-muted-foreground">
                  {t(opt.descKey)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {disabledReason && (
        <p className="text-[10px] italic text-muted-foreground">
          {disabledReason}
        </p>
      )}
    </div>
  );
}

/**
 * Compact, neutral inline label used after a calc to remind which G1
 * source actually produced the displayed numbers. Safe to render even
 * when `dragModel !== 'G1'` (it just renders nothing in that case).
 */
export function G1SourceBadge({
  g1Source,
  dragModel,
  hasCustomTable,
}: {
  g1Source: G1Source | undefined;
  dragModel: string | undefined;
  hasCustomTable?: boolean;
}) {
  const { t } = useI18n();
  if (dragModel !== 'G1') return null;
  if (hasCustomTable) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
        <Database className="h-2.5 w-2.5" />
        {t('g1Source.customActive')}
      </span>
    );
  }
  const source: G1Source = g1Source ?? 'legacy-piecewise';
  const isChair = source === 'chairgun-table';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border',
        isChair
          ? 'bg-primary/10 text-primary border-primary/30'
          : 'bg-muted text-muted-foreground border-border',
      )}
      title={t(isChair ? 'g1Source.chairgunDesc' : 'g1Source.legacyDesc')}
    >
      {isChair ? <Database className="h-2.5 w-2.5" /> : <Zap className="h-2.5 w-2.5" />}
      {t(isChair ? 'g1Source.chairgunTitle' : 'g1Source.legacyTitle')}
    </span>
  );
}