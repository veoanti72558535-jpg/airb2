/**
 * D1 — Field delta analyzer.
 * Compares predicted vs measured drop and asks the AI for likely causes.
 */
import { useI18n } from '@/lib/i18n';
import { AgentButton } from '../AgentButton';

interface Props {
  predictedDropMm: number;
  measuredDropMm: number;
  distanceM: number;
  conditionsSummary?: string;
  projectileLabel?: string;
  zeroRangeM?: number;
  lang?: string;
}

export function FieldDeltaAnalyzerButton({
  predictedDropMm,
  measuredDropMm,
  distanceM,
  conditionsSummary,
  projectileLabel,
  zeroRangeM,
  lang,
}: Props) {
  const { t, locale } = useI18n();
  const language = lang ?? locale;
  const delta = measuredDropMm - predictedDropMm;
  const prompt =
    `Drop calculé: ${predictedDropMm.toFixed(1)} mm | ` +
    `Drop mesuré: ${measuredDropMm.toFixed(1)} mm | ` +
    `Delta: ${delta.toFixed(1)} mm | ` +
    `Distance: ${distanceM} m | ` +
    (zeroRangeM != null ? `Zéro: ${zeroRangeM} m | ` : '') +
    (projectileLabel ? `Projectile: ${projectileLabel} | ` : '') +
    (conditionsSummary ? `Conditions: ${conditionsSummary} | ` : '') +
    `Langue: ${language}`;

  return (
    <AgentButton
      agentSlug="field-delta-analyzer"
      prompt={prompt}
      buttonLabel={t('agents2.fieldDelta' as any)}
      testIdPrefix="field-delta-analyzer"
    />
  );
}