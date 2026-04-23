/**
 * B1 — Airgun pairing advisor.
 * Recommends 3-5 projectiles for a given airgun + usage.
 */
import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { AgentButton } from '../AgentButton';

type Usage = 'hunting' | 'target' | 'ft' | 'plinking' | 'unspecified';

interface Props {
  airgunLabel: string;
  caliber?: string;
  powerJ?: number;
  defaultUsage?: Usage;
  lang?: string;
}

export function AirgunPairingAdvisorButton({
  airgunLabel,
  caliber,
  powerJ,
  defaultUsage = 'unspecified',
  lang,
}: Props) {
  const { t, locale } = useI18n();
  const [usage, setUsage] = useState<Usage>(defaultUsage);
  const language = lang ?? locale;

  const usageLabel: Record<Usage, string> = {
    hunting: t('agents2.usageHunting' as any),
    target: t('agents2.usageTarget' as any),
    ft: t('agents2.usageFt' as any),
    plinking: t('agents2.usagePlinking' as any),
    unspecified: t('agents2.usageUnspecified' as any),
  };

  const prompt =
    `Arme: ${airgunLabel} | ` +
    (caliber ? `Calibre: ${caliber} | ` : '') +
    (powerJ != null ? `Puissance: ${powerJ.toFixed(1)} J | ` : '') +
    `Usage: ${usageLabel[usage]} | ` +
    `Langue: ${language}`;

  return (
    <div className="space-y-1.5">
      <select
        value={usage}
        onChange={e => setUsage(e.target.value as Usage)}
        data-testid="airgun-pairing-usage"
        aria-label="usage"
        className="text-[10px] bg-muted border border-border rounded px-1.5 py-0.5 font-mono"
      >
        <option value="unspecified">{usageLabel.unspecified}</option>
        <option value="hunting">{usageLabel.hunting}</option>
        <option value="target">{usageLabel.target}</option>
        <option value="ft">{usageLabel.ft}</option>
        <option value="plinking">{usageLabel.plinking}</option>
      </select>
      <AgentButton
        agentSlug="airgun-pairing-advisor"
        prompt={prompt}
        buttonLabel={t('agents2.pairingAdvisor' as any)}
        testIdPrefix="airgun-pairing-advisor"
      />
    </div>
  );
}