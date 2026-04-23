/**
 * B2 — Optic selector advisor.
 * Inputs: max range, budget, shooting type.
 */
import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { AgentButton } from '../AgentButton';

type Type = 'hunting' | 'ft' | 'benchrest' | 'plinking';

interface Props {
  lang?: string;
}

export function OpticSelectorAdvisorButton({ lang }: Props) {
  const { t, locale } = useI18n();
  const [maxRangeM, setMaxRangeM] = useState('100');
  const [budget, setBudget] = useState('500');
  const [type, setType] = useState<Type>('hunting');
  const language = lang ?? locale;

  const typeLabel: Record<Type, string> = {
    hunting: t('agents2.usageHunting' as any),
    ft: t('agents2.usageFt' as any),
    benchrest: t('agents2.usageBenchrest' as any),
    plinking: t('agents2.usagePlinking' as any),
  };

  const ready = parseFloat(maxRangeM) > 0 && parseFloat(budget) > 0;
  const prompt =
    `Portée max: ${maxRangeM} m | ` +
    `Budget: ${budget} EUR | ` +
    `Type: ${typeLabel[type]} | ` +
    `Langue: ${language}`;

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-3 gap-1.5">
        <label className="text-[10px] text-muted-foreground">
          <span className="block">Range (m)</span>
          <input
            type="number"
            min="10"
            value={maxRangeM}
            onChange={e => setMaxRangeM(e.target.value)}
            data-testid="optic-advisor-range"
            className="w-full text-[10px] bg-muted border border-border rounded px-1.5 py-0.5 font-mono"
          />
        </label>
        <label className="text-[10px] text-muted-foreground">
          <span className="block">Budget</span>
          <input
            type="number"
            min="0"
            value={budget}
            onChange={e => setBudget(e.target.value)}
            data-testid="optic-advisor-budget"
            className="w-full text-[10px] bg-muted border border-border rounded px-1.5 py-0.5 font-mono"
          />
        </label>
        <label className="text-[10px] text-muted-foreground">
          <span className="block">Type</span>
          <select
            value={type}
            onChange={e => setType(e.target.value as Type)}
            data-testid="optic-advisor-type"
            className="w-full text-[10px] bg-muted border border-border rounded px-1.5 py-0.5 font-mono"
          >
            <option value="hunting">{typeLabel.hunting}</option>
            <option value="ft">{typeLabel.ft}</option>
            <option value="benchrest">{typeLabel.benchrest}</option>
            <option value="plinking">{typeLabel.plinking}</option>
          </select>
        </label>
      </div>
      {ready && (
        <AgentButton
          agentSlug="optic-selector-advisor"
          prompt={prompt}
          buttonLabel={t('agents2.opticAdvisor' as any)}
          testIdPrefix="optic-advisor"
        />
      )}
    </div>
  );
}