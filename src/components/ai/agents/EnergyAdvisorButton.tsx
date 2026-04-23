/**
 * A9 — Hunting energy advisor.
 * Optional game-size selector adds context to the prompt.
 */
import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { AgentButton } from '../AgentButton';

type Game = 'small' | 'medium' | 'large' | 'unspecified';

interface Props {
  energyJ: number;
  distanceM: number;
  lang?: string;
}

export function EnergyAdvisorButton({ energyJ, distanceM, lang }: Props) {
  const { t, locale } = useI18n();
  const [game, setGame] = useState<Game>('unspecified');
  const language = lang ?? locale;
  const gameLabel: Record<Game, string> = {
    small: t('agents.gameSmall' as any),
    medium: t('agents.gameMedium' as any),
    large: t('agents.gameLarge' as any),
    unspecified: t('agents.gameUnspecified' as any),
  };
  const prompt =
    `Énergie: ${energyJ.toFixed(1)} J | Distance: ${distanceM} m | ` +
    `Gibier: ${gameLabel[game]} | Langue: ${language}`;

  return (
    <div className="space-y-1.5">
      <select
        value={game}
        onChange={e => setGame(e.target.value as Game)}
        data-testid="energy-advisor-game"
        aria-label={t('agents.gameUnspecified' as any)}
        className="text-[10px] bg-muted border border-border rounded px-1.5 py-0.5 font-mono"
      >
        <option value="unspecified">{t('agents.gameUnspecified' as any)}</option>
        <option value="small">{t('agents.gameSmall' as any)}</option>
        <option value="medium">{t('agents.gameMedium' as any)}</option>
        <option value="large">{t('agents.gameLarge' as any)}</option>
      </select>
      <AgentButton
        agentSlug="energy-advisor"
        prompt={prompt}
        buttonLabel={t('agents.energyAdvisor' as any)}
        testIdPrefix="energy-advisor"
      />
    </div>
  );
}