/**
 * IA2i-5 — Compare Insights button for ComparePage.
 */
import { useI18n } from '@/lib/i18n';
import { AgentButton } from '@/components/ai/AgentButton';
import type { Session } from '@/lib/types';

interface Props {
  sessionA: Session;
  sessionB: Session;
}

export function CompareInsights({ sessionA, sessionB }: Props) {
  const { locale, t } = useI18n();
  const lang = locale === 'fr' ? 'fr' : 'en';
  const desc = (s: Session) =>
    `${s.name}: V0=${s.input.muzzleVelocity}m/s BC=${s.input.bc} Poids=${s.input.projectileWeight}gr Zéro=${s.input.zeroRange}m`;
  const prompt = `Session A: ${desc(sessionA)} | Session B: ${desc(sessionB)} | Langue: ${lang}`;
  return (
    <AgentButton
      agentSlug="compare-insights"
      prompt={prompt}
      buttonLabel={t('compareInsights.button')}
      testIdPrefix="cmpins"
    />
  );
}