/**
 * A10 — PBR explainer.
 */
import { useI18n } from '@/lib/i18n';
import { AgentButton } from '../AgentButton';

interface Props {
  pbrMin: number;
  pbrMax: number;
  killZoneMm: number;
  lang?: string;
}

export function PbrExplainerButton({ pbrMin, pbrMax, killZoneMm, lang }: Props) {
  const { t, locale } = useI18n();
  const language = lang ?? locale;
  const prompt =
    `PBR min: ${pbrMin.toFixed(1)} m | PBR max: ${pbrMax.toFixed(1)} m | ` +
    `Kill zone: ${killZoneMm.toFixed(0)} mm | Langue: ${language}`;
  return (
    <AgentButton
      agentSlug="pbr-explainer"
      prompt={prompt}
      buttonLabel={t('agents.pbrExplain' as any)}
      testIdPrefix="pbr-explainer"
    />
  );
}