/**
 * D5 — Grouping analyzer (manual entry).
 * User enters group size in mm + distance + optional conditions.
 */
import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { AgentButton } from '../AgentButton';

interface Props {
  defaultDistanceM?: number;
  defaultGroupMm?: number;
  projectileLabel?: string;
  conditionsSummary?: string;
  lang?: string;
}

export function GroupingAnalyzerButton({
  defaultDistanceM,
  defaultGroupMm,
  projectileLabel,
  conditionsSummary,
  lang,
}: Props) {
  const { t, locale } = useI18n();
  const language = lang ?? locale;
  const [groupMm, setGroupMm] = useState<string>(
    defaultGroupMm != null ? String(defaultGroupMm) : '',
  );
  const [distM, setDistM] = useState<string>(
    defaultDistanceM != null ? String(defaultDistanceM) : '',
  );

  const ready = parseFloat(groupMm) > 0 && parseFloat(distM) > 0;

  const prompt =
    `Groupement: ${groupMm} mm | ` +
    `Distance: ${distM} m | ` +
    (projectileLabel ? `Projectile: ${projectileLabel} | ` : '') +
    (conditionsSummary ? `Conditions: ${conditionsSummary} | ` : '') +
    `Langue: ${language}`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          step="0.1"
          min="0"
          value={groupMm}
          onChange={e => setGroupMm(e.target.value)}
          placeholder="mm"
          aria-label="group-mm"
          data-testid="grouping-analyzer-group"
          className="w-20 text-[10px] bg-muted border border-border rounded px-1.5 py-0.5 font-mono"
        />
        <span className="text-[10px] text-muted-foreground">@</span>
        <input
          type="number"
          step="1"
          min="0"
          value={distM}
          onChange={e => setDistM(e.target.value)}
          placeholder="m"
          aria-label="distance-m"
          data-testid="grouping-analyzer-distance"
          className="w-20 text-[10px] bg-muted border border-border rounded px-1.5 py-0.5 font-mono"
        />
      </div>
      {ready ? (
        <AgentButton
          agentSlug="grouping-analyzer"
          prompt={prompt}
          buttonLabel={t('agents2.groupingAnalysis' as any)}
          testIdPrefix="grouping-analyzer"
        />
      ) : (
        <span
          data-testid="grouping-analyzer-disabled"
          className="inline-flex items-center text-[10px] text-muted-foreground/60 italic"
        >
          {t('agents2.groupingAnalysis' as any)}
        </span>
      )}
    </div>
  );
}