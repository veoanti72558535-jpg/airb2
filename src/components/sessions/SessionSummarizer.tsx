/**
 * IA2i-4 — Session AI summarizer button.
 */
import { useI18n } from '@/lib/i18n';
import { AgentButton } from '@/components/ai/AgentButton';
import type { Session } from '@/lib/types';

interface Props {
  session: Session;
}

export function SessionSummarizer({ session }: Props) {
  const { locale, t } = useI18n();
  const s = session;
  const lang = locale === 'fr' ? 'fr' : 'en';
  const prompt = `Arme: ${s.airgunId ?? 'N/A'} | Projectile: ${s.input.projectileWeight}gr BC ${s.input.bc} | Zéro: ${s.input.zeroRange}m | Distance max: ${s.input.maxRange}m | V0: ${s.input.muzzleVelocity}m/s | Langue: ${lang}`;
  return (
    <AgentButton
      agentSlug="session-summarizer"
      prompt={prompt}
      buttonLabel={t('sessionSummarizer.button')}
      testIdPrefix="sesssum"
    />
  );
}