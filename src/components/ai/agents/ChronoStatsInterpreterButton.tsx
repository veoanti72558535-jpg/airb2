/**
 * D2 — Chrono stats interpreter.
 * Builds a prompt from ES/SD/avg + shot count.
 */
import { useI18n } from '@/lib/i18n';
import { AgentButton } from '../AgentButton';

interface Props {
  esMs: number;
  sdMs: number;
  avgMs: number;
  shotCount: number;
  lang?: string;
}

export function ChronoStatsInterpreterButton({ esMs, sdMs, avgMs, shotCount, lang }: Props) {
  const { t, locale } = useI18n();
  const language = lang ?? locale;
  const prompt =
    `ES: ${esMs.toFixed(1)} m/s | ` +
    `SD: ${sdMs.toFixed(2)} m/s | ` +
    `Moyenne: ${avgMs.toFixed(1)} m/s | ` +
    `Nb tirs: ${shotCount} | ` +
    `Langue: ${language}`;

  return (
    <AgentButton
      agentSlug="chrono-stats-interpreter"
      prompt={prompt}
      buttonLabel={t('agents2.chronoStats' as any)}
      testIdPrefix="chrono-stats-interpreter"
    />
  );
}