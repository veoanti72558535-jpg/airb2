/**
 * A7 — Zero distance advisor.
 */
import { useI18n } from '@/lib/i18n';
import { AgentButton } from '../AgentButton';

interface Projectile {
  name: string;
  weightGrains: number;
  bc: number;
}

interface Props {
  projectile: Projectile;
  muzzleVelocityMs: number;
  typicalDistancesM: number[];
  /** "hunting" | "target" | "field-target" — passed verbatim to the model. */
  usage: string;
  lang?: string;
}

export function ZeroAdvisorButton({
  projectile,
  muzzleVelocityMs,
  typicalDistancesM,
  usage,
  lang,
}: Props) {
  const { t, locale } = useI18n();
  const language = lang ?? locale;
  const distances = typicalDistancesM.length
    ? typicalDistancesM.map(d => `${d}m`).join(', ')
    : '—';
  const prompt =
    `Projectile: ${projectile.name} (${projectile.weightGrains}gr, BC=${projectile.bc}) | ` +
    `Vitesse initiale: ${muzzleVelocityMs} m/s | Distances typiques: ${distances} | ` +
    `Usage: ${usage} | Langue: ${language}`;
  return (
    <AgentButton
      agentSlug="zero-advisor"
      prompt={prompt}
      buttonLabel={t('agents.zeroAdvisor' as any)}
      testIdPrefix="zero-advisor"
    />
  );
}