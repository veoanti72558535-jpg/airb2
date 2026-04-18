/**
 * Tranche C — RecalculateDialog
 *
 * Confirms an explicit recalculation of an existing session. Honest:
 *  - Never mutates the source.
 *  - Always creates a new linked copy via `derivedFromSessionId`.
 *  - No engine selector — the "after" profile is whatever the engine
 *    resolves today (legacy by default).
 *
 * The recalculation runs ONLY on confirm — opening the dialog is free.
 */

import { useMemo } from 'react';
import { FlaskConical, RotateCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useI18n } from '@/lib/i18n';
import { sessionStore } from '@/lib/storage';
import type { Session } from '@/lib/types';
import { LEGACY_PROFILE } from '@/lib/ballistics/profiles';
import {
  buildRecalcPayload,
  composeRecalcName,
} from '@/lib/session-recalc';
import { resolveBadgeState } from './EngineBadge';

interface Props {
  /** Source session — when null, dialog is closed. */
  source: Session | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the freshly created copy on confirm. */
  onCreated?: (created: Session) => void;
}

export function RecalculateDialog({ source, open, onOpenChange, onCreated }: Props) {
  const { t } = useI18n();

  const sourceProfileId = source?.profileId ?? 'legacy';
  // Today the engine dispatches via the legacy profile by default. Single
  // source of truth — don't hardcode the string here.
  const targetProfileId = LEGACY_PROFILE.id;
  const profilesDiffer = sourceProfileId !== targetProfileId;

  const sourceBadgeKey = source ? resolveBadgeState(source).labelKey : null;
  const sourceBadgeLabel = sourceBadgeKey ? t(sourceBadgeKey) : '';
  // The target is by definition a freshly-frozen modern session → "Legacy".
  const targetLabel = t('engine.badge.legacy');

  const allNames = useMemo(
    () => sessionStore.getAll().map(s => s.name),
    [open], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleConfirm = () => {
    if (!source) return;
    const newName = composeRecalcName(
      source.name,
      t('session.recalculatedSuffix'),
      allNames,
    );
    const { draft } = buildRecalcPayload(source, newName);
    const created = sessionStore.create(draft);
    onCreated?.(created);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <RotateCcw className="h-4 w-4 text-primary" />
            {t('recalculate.title')}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {t('recalculate.description')}
          </DialogDescription>
        </DialogHeader>

        {source && (
          <div className="space-y-3 text-xs">
            {/* Before */}
            <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {t('recalculate.before')}
              </div>
              <div className="font-semibold truncate">{source.name}</div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] font-mono">
                <Cell label={t('engine.label.engine')} value={sourceBadgeLabel} />
                <Cell label={t('engine.label.profile')} value={sourceProfileId} />
                {source.dragLawRequested && (
                  <Cell
                    label={t('engine.label.requestedDragModel')}
                    value={String(source.dragLawRequested)}
                  />
                )}
                {source.dragLawEffective && (
                  <Cell
                    label={t('engine.label.effectiveDragModel')}
                    value={String(source.dragLawEffective)}
                  />
                )}
                {source.calculatedAt && (
                  <Cell
                    label={t('engine.label.calculatedAt')}
                    value={new Date(source.calculatedAt).toLocaleString()}
                  />
                )}
              </div>
            </div>

            {/* After */}
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-1">
              <div className="text-[10px] uppercase tracking-wide text-primary">
                {t('recalculate.after')}
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] font-mono">
                <Cell label={t('engine.label.engine')} value={targetLabel} />
                <Cell label={t('engine.label.profile')} value={targetProfileId} />
              </div>
            </div>

            {/* Honest note about profile match / mismatch */}
            <div
              role="note"
              className={
                profilesDiffer
                  ? 'rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300 flex gap-2'
                  : 'rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground'
              }
            >
              {profilesDiffer && <FlaskConical className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
              <span>
                {profilesDiffer
                  ? t('recalculate.differentProfile')
                  : t('recalculate.sameProfile')}
              </span>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-3 py-1.5 rounded-md border border-border text-xs hover:bg-muted/40"
          >
            {t('recalculate.cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!source}
            className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t('recalculate.confirm')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-muted-foreground normal-case">{label}</span>
      <span className="text-right truncate">{value}</span>
    </>
  );
}
