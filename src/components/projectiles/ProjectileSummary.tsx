/**
 * IA2i-3 — Projectile AI summary button.
 */
import { useI18n } from '@/lib/i18n';
import { AgentButton } from '@/components/ai/AgentButton';
import type { Projectile } from '@/lib/types';

interface Props {
  projectile: Projectile;
}

export function ProjectileSummary({ projectile }: Props) {
  const { locale, t } = useI18n();
  const p = projectile;
  const lang = locale === 'fr' ? 'fr' : 'en';
  const prompt = `Nom: ${p.brand} ${p.model} | Calibre: ${p.caliber} | Poids: ${p.weight}gr | BC G1: ${p.bc} | Langue: ${lang}`;
  return (
    <AgentButton
      agentSlug="projectile-summary"
      prompt={prompt}
      buttonLabel={t('projectileSummary.button')}
      testIdPrefix="projsum"
    />
  );
}