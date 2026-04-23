/**
 * R4 — User reviews summary for a gun or projectile.
 */
import { useI18n } from '@/lib/i18n';
import { WebSearchAgentBase, SourcesList, ConfidenceBadge } from './WebSearchAgentBase';

export interface AirgunReviewResult {
  subject?: string;
  type?: 'gun' | 'pellet' | 'slug' | string;
  overallSentiment?: 'positive' | 'mixed' | 'negative' | string;
  rating?: number;
  pros?: string[];
  cons?: string[];
  commonIssues?: string[];
  recommendedUse?: string;
  sources?: string[];
  reviewCount?: number;
  confidence?: number;
}

interface Props {
  initialQuery?: string;
  onResult?: (data: AirgunReviewResult) => void;
}

export function AirgunReviewAgent({ initialQuery, onResult }: Props) {
  const { t } = useI18n();
  return (
    <WebSearchAgentBase<AirgunReviewResult>
      agentSlug="airgun-review-search"
      testIdPrefix="airgun-review"
      inputPlaceholder={t('agentSearch.queryLabel' as any)}
      searchLabel={t('agentSearch.reviews' as any)}
      initialQuery={initialQuery}
      onResult={onResult}
      renderResult={(d) => {
        const sentimentTone =
          d.overallSentiment === 'positive'
            ? 'border-primary/30 bg-primary/15 text-primary'
            : d.overallSentiment === 'negative'
              ? 'border-destructive/30 bg-destructive/15 text-destructive'
              : 'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400';
        return (
          <div className="space-y-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-semibold">{d.subject ?? '—'}</h4>
              {d.overallSentiment && (
                <span className={`rounded border px-1.5 py-0.5 text-[10px] font-mono uppercase ${sentimentTone}`}>
                  {d.overallSentiment}
                </span>
              )}
              {d.rating != null && (
                <span className="font-mono">★ {d.rating.toFixed(1)} / 5</span>
              )}
              {d.reviewCount != null && (
                <span className="text-muted-foreground">({d.reviewCount} reviews)</span>
              )}
              <ConfidenceBadge value={d.confidence} />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <BulletList title="✓ Pros" items={d.pros} tone="positive" />
              <BulletList title="✗ Cons" items={d.cons} tone="negative" />
            </div>
            {d.commonIssues && d.commonIssues.length > 0 && (
              <BulletList title="⚠ Common issues" items={d.commonIssues} tone="warn" />
            )}
            {d.recommendedUse && (
              <p className="text-[11px] italic text-muted-foreground">{d.recommendedUse}</p>
            )}
            <SourcesList sources={d.sources} />
          </div>
        );
      }}
    />
  );
}

function BulletList({
  title,
  items,
  tone,
}: {
  title: string;
  items?: string[];
  tone: 'positive' | 'negative' | 'warn';
}) {
  if (!items || items.length === 0) return null;
  const cls =
    tone === 'positive'
      ? 'text-primary'
      : tone === 'negative'
        ? 'text-destructive'
        : 'text-amber-700 dark:text-amber-400';
  return (
    <div>
      <div className={`text-[11px] font-medium ${cls}`}>{title}</div>
      <ul className="ml-3 list-disc space-y-0.5 text-[11px]">
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  );
}