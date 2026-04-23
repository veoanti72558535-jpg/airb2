/**
 * R6 — Published BC lookup for PCP pellets/slugs.
 */
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { WebSearchAgentBase, SourcesList } from './WebSearchAgentBase';

export interface BcSearchResult {
  projectile?: string;
  caliber?: string;
  weightGrains?: number;
  bcG1?: { value?: number | null; source?: string; confidence?: number } | null;
  bcG7?: { value?: number | null; source?: string; confidence?: number } | null;
  sdSectionDensity?: number;
  notes?: string;
  sources?: string[];
  pcpOnly?: boolean;
}

interface Props {
  initialQuery?: string;
  onResult?: (data: BcSearchResult) => void;
}

export function BcSearchAgent({ initialQuery, onResult }: Props) {
  const { t } = useI18n();
  return (
    <WebSearchAgentBase<BcSearchResult>
      agentSlug="bc-database-search"
      testIdPrefix="bc-search"
      inputPlaceholder={t('agentSearch.queryLabel' as any)}
      searchLabel={t('agentSearch.bcPublished' as any)}
      initialQuery={initialQuery}
      renderResult={(d) => (
        <div className="space-y-2 text-xs">
          <h4 className="text-sm font-semibold">
            {d.projectile ?? '—'} {d.caliber ? `(${d.caliber})` : ''}
          </h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <BcCard label="BC G1" entry={d.bcG1} />
            <BcCard label="BC G7" entry={d.bcG7} />
          </div>
          {d.sdSectionDensity != null && (
            <p className="font-mono text-[11px]">SD: {d.sdSectionDensity}</p>
          )}
          {d.notes && (
            <p className="text-[11px] italic text-muted-foreground">{d.notes}</p>
          )}
          <SourcesList sources={d.sources} />
          {onResult && (d.bcG1?.value != null || d.bcG7?.value != null) && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onResult(d)}
              data-testid="bc-search-use"
            >
              {t('agentSearch.useThisBC' as any)}
            </Button>
          )}
        </div>
      )}
    />
  );
}

function BcCard({
  label,
  entry,
}: {
  label: string;
  entry?: { value?: number | null; source?: string; confidence?: number } | null;
}) {
  if (!entry || entry.value == null) {
    return (
      <div className="rounded border border-dashed border-border p-2 text-[11px] text-muted-foreground">
        {label}: —
      </div>
    );
  }
  return (
    <div className="rounded border border-border bg-muted/40 p-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase text-muted-foreground">{label}</span>
        <span className="font-mono text-sm">{entry.value}</span>
      </div>
      {entry.source && (
        <p className="truncate text-[10px] text-muted-foreground">{entry.source}</p>
      )}
      {entry.confidence != null && (
        <p className="text-[10px] text-muted-foreground">
          conf: {Math.round(entry.confidence * 100)}%
        </p>
      )}
    </div>
  );
}