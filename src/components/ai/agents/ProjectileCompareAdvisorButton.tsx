/**
 * B3 — Compare advisor.
 * Triggered after multi-projectile compare. Sends serialized snapshot.
 */
import { useI18n } from '@/lib/i18n';
import { AgentButton } from '../AgentButton';

export interface CompareEntry {
  name: string;
  weightGrains?: number;
  bc?: number;
}

interface Props {
  entries: CompareEntry[];
  distanceM?: number;
  usage?: string;
  lang?: string;
}

export function ProjectileCompareAdvisorButton({ entries, distanceM, usage, lang }: Props) {
  const { t, locale } = useI18n();
  if (!entries || entries.length < 2) return null;
  const language = lang ?? locale;
  const list = entries
    .map(
      e =>
        `${e.name} (${e.weightGrains != null ? e.weightGrains.toFixed(1) + 'gr' : '?'}, BC ${e.bc != null ? e.bc.toFixed(3) : '?'})`,
    )
    .join(' | ');
  const prompt =
    `Projectiles: ${list} | ` +
    (distanceM != null ? `Distance: ${distanceM} m | ` : '') +
    (usage ? `Usage: ${usage} | ` : '') +
    `Langue: ${language}`;

  return (
    <AgentButton
      agentSlug="projectile-compare-advisor"
      prompt={prompt}
      buttonLabel={t('agents2.compareAdvisor' as any)}
      testIdPrefix="compare-advisor"
    />
  );
}