/**
 * D4 — Wind correction coach. Receives the user's wind input + a sampled
 * drift array and asks the model for practical reading + correction tips.
 */
import { useI18n } from '@/lib/i18n';
import { AgentButton } from '../AgentButton';

export interface WindDriftSample {
  distanceM: number;
  driftMm: number;
  driftMOA?: number;
  driftMRAD?: number;
}

interface Props {
  windSpeedMs: number;
  windAngleDeg: number;
  windDriftResults: WindDriftSample[];
  lang?: string;
}

export function WindCorrectionCoachButton({
  windSpeedMs,
  windAngleDeg,
  windDriftResults,
  lang,
}: Props) {
  const { t, locale } = useI18n();
  const language = lang ?? locale;
  const samples = windDriftResults
    .slice(0, 8)
    .map(s => {
      const moa = s.driftMOA != null ? ` (${s.driftMOA.toFixed(2)} MOA)` : '';
      const mrad = s.driftMRAD != null ? ` / ${s.driftMRAD.toFixed(2)} MRAD` : '';
      return `${s.distanceM}m: ${s.driftMm.toFixed(1)}mm${moa}${mrad}`;
    })
    .join(', ');
  const prompt =
    `Vent: ${windSpeedMs.toFixed(1)} m/s | Angle: ${windAngleDeg.toFixed(0)}° | ` +
    `Dérives: ${samples || '—'} | Langue: ${language}`;
  return (
    <AgentButton
      agentSlug="wind-correction-coach"
      prompt={prompt}
      buttonLabel={t('agents.windCoach' as any)}
      testIdPrefix="wind-coach"
    />
  );
}