/**
 * IA2i-2 — Deviation Explainer button for wind drift rows.
 */
import { useI18n } from '@/lib/i18n';
import { AgentButton } from '@/components/ai/AgentButton';

interface Props {
  distanceM: number;
  driftMm: number;
}

export function DeviationExplainer({ distanceM, driftMm }: Props) {
  const { locale, t } = useI18n();
  const lang = locale === 'fr' ? 'fr' : 'en';
  const prompt = `Distance: ${distanceM}m | Dérive vent: ${driftMm.toFixed(1)}mm | Langue: ${lang}`;
  return (
    <AgentButton
      agentSlug="deviation-explainer"
      prompt={prompt}
      buttonLabel={t('deviationExplainer.button')}
      testIdPrefix="devex"
    />
  );
}