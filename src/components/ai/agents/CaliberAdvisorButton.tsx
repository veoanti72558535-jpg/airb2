/**
 * B4 — Caliber advisor.
 * Compares .177 / .22 / .25 / .30 for a given usage.
 */
import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { AgentButton } from '../AgentButton';

type Usage = 'hunting-small' | 'hunting-medium' | 'ft' | 'benchrest' | 'plinking';

interface Props {
  lang?: string;
}

export function CaliberAdvisorButton({ lang }: Props) {
  const { t, locale } = useI18n();
  const [usage, setUsage] = useState<Usage>('hunting-small');
  const [constraint, setConstraint] = useState('');
  const language = lang ?? locale;

  const usageLabel: Record<Usage, string> = {
    'hunting-small': t('agents2.usageHuntSmall' as any),
    'hunting-medium': t('agents2.usageHuntMedium' as any),
    ft: t('agents2.usageFt' as any),
    benchrest: t('agents2.usageBenchrest' as any),
    plinking: t('agents2.usagePlinking' as any),
  };

  const prompt =
    `Usage: ${usageLabel[usage]} | ` +
    (constraint ? `Contrainte: ${constraint} | ` : '') +
    `Langue: ${language}`;

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-2 gap-1.5">
        <select
          value={usage}
          onChange={e => setUsage(e.target.value as Usage)}
          data-testid="caliber-advisor-usage"
          aria-label="usage"
          className="text-[10px] bg-muted border border-border rounded px-1.5 py-0.5 font-mono"
        >
          <option value="hunting-small">{usageLabel['hunting-small']}</option>
          <option value="hunting-medium">{usageLabel['hunting-medium']}</option>
          <option value="ft">{usageLabel.ft}</option>
          <option value="benchrest">{usageLabel.benchrest}</option>
          <option value="plinking">{usageLabel.plinking}</option>
        </select>
        <input
          type="text"
          value={constraint}
          onChange={e => setConstraint(e.target.value)}
          placeholder={t('agents2.caliberConstraintHint' as any)}
          data-testid="caliber-advisor-constraint"
          className="text-[10px] bg-muted border border-border rounded px-1.5 py-0.5 font-mono"
        />
      </div>
      <AgentButton
        agentSlug="caliber-advisor"
        prompt={prompt}
        buttonLabel={t('agents2.caliberAdvisor' as any)}
        testIdPrefix="caliber-advisor"
      />
    </div>
  );
}