/**
 * R2 — Forum velocity reports for a given projectile + caliber.
 */
import { useI18n } from '@/lib/i18n';
import { WebSearchAgentBase, SourcesList, ConfidenceBadge } from './WebSearchAgentBase';

export interface VelocityForumResult {
  projectile?: string;
  caliber?: string;
  velocityRangeMs?: { min?: number; max?: number; optimal?: number };
  velocityRangeFps?: { min?: number; max?: number; optimal?: number };
  gunsmentioned?: string[];
  forumSources?: string[];
  userReports?: { gun?: string; velocityMs?: number; notes?: string }[];
  stabilityNotes?: string;
  confidence?: number;
}

interface Props {
  initialQuery?: string;
  initialCaliber?: string;
  onResult?: (data: VelocityForumResult) => void;
}

export function VelocityForumAgent({ initialQuery, initialCaliber, onResult }: Props) {
  const { t } = useI18n();
  const seed = [initialQuery, initialCaliber].filter(Boolean).join(' ');

  return (
    <WebSearchAgentBase<VelocityForumResult>
      agentSlug="velocity-forum-search"
      testIdPrefix="velocity-forum"
      inputPlaceholder={t('agentSearch.queryLabel' as any)}
      searchLabel={t('agentSearch.velocityForums' as any)}
      initialQuery={seed}
      onResult={onResult}
      renderResult={(d) => (
        <div className="space-y-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold">
              {d.projectile ?? '—'} {d.caliber ? `(${d.caliber})` : ''}
            </h4>
            <ConfidenceBadge value={d.confidence} />
          </div>
          {d.velocityRangeMs && (
            <p className="font-mono">
              {d.velocityRangeMs.min ?? '?'}–{d.velocityRangeMs.max ?? '?'} m/s
              {d.velocityRangeMs.optimal != null && (
                <span className="ml-2 text-primary">
                  ★ {d.velocityRangeMs.optimal} m/s
                </span>
              )}
            </p>
          )}
          {d.userReports && d.userReports.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="text-left">Gun</th>
                    <th className="text-right">m/s</th>
                    <th className="text-left pl-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {d.userReports.map((r, i) => (
                    <tr key={i} className="border-t border-border/40">
                      <td>{r.gun ?? '—'}</td>
                      <td className="text-right font-mono">{r.velocityMs ?? '—'}</td>
                      <td className="pl-2 italic text-muted-foreground">{r.notes ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {d.stabilityNotes && (
            <p className="text-[11px] italic text-muted-foreground">{d.stabilityNotes}</p>
          )}
          <SourcesList sources={d.forumSources} />
        </div>
      )}
    />
  );
}