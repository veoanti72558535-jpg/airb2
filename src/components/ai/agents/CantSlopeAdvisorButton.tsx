/**
 * D3 — Slope + cant impact advisor.
 * Hidden when both slope and cant are zero.
 */
import { useI18n } from '@/lib/i18n';
import { AgentButton } from '../AgentButton';

interface Props {
  slopeAngleDeg: number;
  cantAngleDeg: number;
  dropMm: number;
  distanceM: number;
  lang?: string;
}

export function CantSlopeAdvisorButton({
  slopeAngleDeg,
  cantAngleDeg,
  dropMm,
  distanceM,
  lang,
}: Props) {
  const { t, locale } = useI18n();
  if (slopeAngleDeg === 0 && cantAngleDeg === 0) return null;
  const language = lang ?? locale;
  const prompt =
    `Slope: ${slopeAngleDeg.toFixed(1)}° | Cant: ${cantAngleDeg.toFixed(1)}° | ` +
    `Drop: ${dropMm.toFixed(1)} mm | Distance: ${distanceM} m | Langue: ${language}`;
  return (
    <AgentButton
      agentSlug="cant-slope-advisor"
      prompt={prompt}
      buttonLabel={t('agents.cantSlope' as any)}
      testIdPrefix="cant-slope-advisor"
    />
  );
}