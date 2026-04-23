/**
 * D6 — Tune stability check.
 * Hidden when fewer than 5 measurements. Builds a prompt with the velocity series.
 */
import { useI18n } from '@/lib/i18n';
import { AgentButton } from '../AgentButton';

interface Props {
  velocitiesMs: number[];
  lang?: string;
}

const MIN_SHOTS = 5;

export function TuneStabilityCheckButton({ velocitiesMs, lang }: Props) {
  const { t, locale } = useI18n();
  if (!Array.isArray(velocitiesMs) || velocitiesMs.length < MIN_SHOTS) return null;
  const language = lang ?? locale;
  const list = velocitiesMs.map(v => v.toFixed(1)).join(', ');
  const prompt =
    `Vitesses (m/s): [${list}] | ` +
    `Nb tirs: ${velocitiesMs.length} | ` +
    `Langue: ${language}`;

  return (
    <AgentButton
      agentSlug="tune-stability-check"
      prompt={prompt}
      buttonLabel={t('agents2.tuneStability' as any)}
      testIdPrefix="tune-stability-check"
    />
  );
}