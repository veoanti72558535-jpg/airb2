import { Cpu, FlaskConical, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Session, CdProvenance } from '@/lib/types';
import type { TranslationKey } from '@/lib/translations';
import { isPublicDragLaw as isPublicDragLawPolicy } from '@/lib/drag-law-policy';
import {
  importSourceLabelKey,
  resolveSessionImportedFrom,
} from '@/lib/imported-from';

/**
 * Tranche B — EngineBadge
 *
 * Compact, honest badge that surfaces with which calculation profile a saved
 * session was produced. Three variants:
 *  - `legacy`     : neutral grey, default Cd ladder.
 *  - `mero-beta`  : amber, P2 opt-in profile (NEVER exposed as "ready").
 *  - `legacy-v0`  : dashed grey, used when metadata was inferred at read time
 *                   (= session saved before P3.1 frozen-metadata builder).
 *
 * Honesty rules:
 *  - `metadataInferred === true` ALWAYS wins, even if `profileId === 'mero'`,
 *    because the session predates frozen metadata and we cannot trust the
 *    profile claim.
 *  - aria-label never says "MERO" for a legacy session.
 *  - Internal MERO drag laws (RA4 / GA2 / SLG0 / SLG1) are stripped from the
 *    tooltip — only the public set (G1/G7/GA/GS) is rendered.
 */

export type EngineBadgeVariant = 'legacy' | 'mero-beta' | 'legacy-v0';

interface BadgeState {
  variant: EngineBadgeVariant;
  labelKey: TranslationKey;
  Icon: typeof Cpu;
  tone: string;
}

/**
 * Public drag-law guard.
 *
 * Tranche D : the canonical implementation now lives in
 * `src/lib/drag-law-policy.ts` (single source of truth for any public
 * boundary — UI, import, export). Re-exported here for backwards-compat
 * with existing imports (`CalculationMetadataBlock`, tests).
 */
export const isPublicDragLaw = isPublicDragLawPolicy;

export function resolveBadgeState(session: Session): BadgeState {
  if (session.metadataInferred) {
    return {
      variant: 'legacy-v0',
      labelKey: 'engine.badge.legacyV0',
      Icon: Info,
      tone:
        'bg-muted/40 text-muted-foreground border border-dashed border-border',
    };
  }
  if (session.profileId === 'mero') {
    return {
      variant: 'mero-beta',
      labelKey: 'engine.badge.meroBeta',
      Icon: FlaskConical,
      tone:
        'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30',
    };
  }
  return {
    variant: 'legacy',
    labelKey: 'engine.badge.legacy',
    Icon: Cpu,
    tone: 'bg-muted text-muted-foreground border border-border',
  };
}

function cdProvenanceKey(p: CdProvenance | undefined): TranslationKey | null {
  switch (p) {
    case 'derived-p2': return 'engine.cdProvenance.derivedP2';
    case 'mero-official': return 'engine.cdProvenance.meroOfficial';
    case 'legacy-piecewise': return 'engine.cdProvenance.legacyPiecewise';
    default: return null;
  }
}

function calcSourceKey(s: Session['calculatedAtSource']): TranslationKey | null {
  switch (s) {
    case 'inferred-from-updatedAt': return 'engine.calculatedAtSource.inferredFromUpdated';
    case 'inferred-from-createdAt': return 'engine.calculatedAtSource.inferredFromCreated';
    case 'frozen': return 'engine.calculatedAtSource.frozen';
    default: return null;
  }
}

interface Props {
  session: Session;
  /** `xs` = list density. `sm` = default detail/compare. */
  size?: 'xs' | 'sm';
  className?: string;
}

export function EngineBadge({ session, size = 'sm', className }: Props) {
  const { t } = useI18n();
  const state = resolveBadgeState(session);
  const { Icon } = state;
  const label = t(state.labelKey);

  const sizeClass =
    size === 'xs'
      ? 'text-[10px] px-1.5 py-0.5 gap-1'
      : 'text-[11px] px-2 py-0.5 gap-1.5';
  const iconSize = size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  // --- Tooltip lines ------------------------------------------------------
  const dateStr = session.calculatedAt
    ? new Date(session.calculatedAt).toLocaleString()
    : null;
  const provenanceKey = cdProvenanceKey(session.cdProvenance);
  const sourceKey = calcSourceKey(session.calculatedAtSource);
  const isInferred = !!session.metadataInferred;

  // Tranche F.5 — origine d'import des entités liées (projectile, optique).
  // Ne lit PAS le réticule : pas de lien session ↔ réticule en V1.
  const importedFrom = resolveSessionImportedFrom(session);

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            aria-label={`${t('engine.label.engine')}: ${label}`}
            className={cn(
              'inline-flex items-center rounded font-medium uppercase tracking-wide whitespace-nowrap',
              sizeClass,
              state.tone,
              className,
            )}
          >
            <Icon className={cn(iconSize, 'shrink-0')} aria-hidden />
            <span>{label}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[260px] text-xs space-y-1">
          <div className="font-semibold">
            {t('engine.label.calculatedWith')}: {label}
          </div>
          {dateStr && (
            <div className="text-muted-foreground">
              {t('engine.label.calculatedAt')}: <span className="font-mono">{dateStr}</span>
            </div>
          )}
          {provenanceKey && (
            <div className="text-muted-foreground">
              {t('engine.label.cdProvenance')}: {t(provenanceKey)}
            </div>
          )}
          {isInferred && (
            <div className="text-amber-600 dark:text-amber-400 pt-0.5 border-t border-border/40">
              ⚠ {t('engine.label.partialData')}
              {sourceKey && sourceKey !== 'engine.calculatedAtSource.frozen' && (
                <div className="text-[10px] mt-0.5 opacity-90">
                  {t('engine.label.dateApproximated')}
                </div>
              )}
            </div>
          )}
          {(importedFrom.projectile || importedFrom.optic) && (
            <div
              className="pt-0.5 border-t border-border/40 text-muted-foreground space-y-0.5"
              data-testid="engine-badge-imported-from"
            >
              {importedFrom.projectile && (
                <div data-testid="imported-from-projectile">
                  {t('engine.importedFrom')} : {t('engine.importedFrom.projectile')} —{' '}
                  {t(importSourceLabelKey(importedFrom.projectile))}
                </div>
              )}
              {importedFrom.optic && (
                <div data-testid="imported-from-optic">
                  {t('engine.importedFrom')} : {t('engine.importedFrom.optic')} —{' '}
                  {t(importSourceLabelKey(importedFrom.optic))}
                </div>
              )}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
