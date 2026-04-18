import { AdvancedDisclosure } from '@/components/AdvancedDisclosure';
import { useI18n } from '@/lib/i18n';
import type { Session } from '@/lib/types';
import { isPublicDragLaw, resolveBadgeState } from './EngineBadge';
import type { TranslationKey } from '@/lib/translations';

/**
 * Tranche B — Bloc repliable "Métadonnées de calcul" pour le détail session.
 *
 * Lit uniquement les champs déjà figés/normalisés par P3.1/P3.2. Aucune
 * dérivation supplémentaire ici. Strip systématique des lois de drag
 * internes (RA4/GA2/SLG0/SLG1) afin qu'aucune fuite n'arrive en UI.
 */

interface Props {
  session: Session;
  defaultOpen?: boolean;
}

function safeDragLawLabel(law: Session['dragLawEffective']): string | null {
  if (!law) return null;
  return isPublicDragLaw(law) ? law : 'Custom';
}

function provenanceLabel(p: Session['cdProvenance']): TranslationKey | null {
  switch (p) {
    case 'derived-p2': return 'engine.cdProvenance.derivedP2';
    case 'mero-official': return 'engine.cdProvenance.meroOfficial';
    case 'legacy-piecewise': return 'engine.cdProvenance.legacyPiecewise';
    default: return null;
  }
}

function sourceLabel(s: Session['calculatedAtSource']): TranslationKey | null {
  switch (s) {
    case 'frozen': return 'engine.calculatedAtSource.frozen';
    case 'inferred-from-updatedAt': return 'engine.calculatedAtSource.inferredFromUpdated';
    case 'inferred-from-createdAt': return 'engine.calculatedAtSource.inferredFromCreated';
    default: return null;
  }
}

export function CalculationMetadataBlock({ session, defaultOpen = false }: Props) {
  const { t } = useI18n();
  const badge = resolveBadgeState(session);
  const profileLabel = t(badge.labelKey);

  const requested = safeDragLawLabel(session.dragLawRequested);
  const effective = safeDragLawLabel(session.dragLawEffective);
  const provKey = provenanceLabel(session.cdProvenance);
  const srcKey = sourceLabel(session.calculatedAtSource);
  const dateStr = session.calculatedAt
    ? new Date(session.calculatedAt).toLocaleString()
    : null;

  return (
    <AdvancedDisclosure
      title={t('engine.metadata.title')}
      defaultOpen={defaultOpen}
    >
      <dl className="grid grid-cols-1 gap-1.5 text-xs">
        <Row label={t('engine.label.engine')} value={profileLabel} />
        {session.profileId && (
          <Row label={t('engine.label.profile')} value={session.profileId} mono />
        )}
        {requested && (
          <Row label={t('engine.label.requestedDragModel')} value={requested} mono />
        )}
        {effective && (
          <Row label={t('engine.label.effectiveDragModel')} value={effective} mono />
        )}
        {provKey && (
          <Row label={t('engine.label.cdProvenance')} value={t(provKey)} />
        )}
        {dateStr && (
          <Row label={t('engine.label.calculatedAt')} value={dateStr} mono />
        )}
        {srcKey && (
          <Row label={t('engine.label.calculatedAtSource')} value={t(srcKey)} />
        )}
        {session.metadataInferred && (
          <div className="mt-1 pt-1 border-t border-border/40 text-[11px] text-amber-600 dark:text-amber-400">
            ⚠ {t('engine.label.partialData')}
          </div>
        )}
      </dl>
    </AdvancedDisclosure>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground text-[10px] uppercase tracking-wide shrink-0">
        {label}
      </dt>
      <dd className={`text-right min-w-0 truncate ${mono ? 'font-mono' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
