/**
 * A6 — Truing BC explainer.
 *
 * Wraps the shared `AgentButton` with a slug + prompt specific to the
 * truing-explainer agent. Pure presentation — no calculation.
 */
import { useI18n } from '@/lib/i18n';
import { AgentButton } from '../AgentButton';

interface Props {
  factor: number;
  originalBc: number;
  correctedBc: number;
  /** Override the language sent to the model. Defaults to current i18n locale. */
  lang?: string;
}

export function TruingExplainerButton({ factor, originalBc, correctedBc, lang }: Props) {
  const { t, locale } = useI18n();
  const language = lang ?? locale;
  const prompt =
    `Facteur: ×${factor.toFixed(3)} | BC original: ${originalBc.toFixed(4)} | ` +
    `BC corrigé: ${correctedBc.toFixed(4)} | Langue: ${language}`;
  return (
    <AgentButton
      agentSlug="truing-explainer"
      prompt={prompt}
      buttonLabel={t('agents.truingExplain' as any)}
      testIdPrefix="truing-explainer"
    />
  );
}