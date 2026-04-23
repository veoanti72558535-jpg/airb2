/**
 * R7 — Forum tune advice for a given PCP gun model.
 */
import { useI18n } from '@/lib/i18n';
import { WebSearchAgentBase, SourcesList, ConfidenceBadge } from './WebSearchAgentBase';

export interface TuneAdviceResult {
  gun?: string;
  tunes?: {
    name?: string;
    hammerSpring?: string;
    regulatorPsi?: number;
    transferPortMm?: number;
    targetVelocityMs?: number;
    forProjectile?: string;
    notes?: string;
    source?: string;
  }[];
  generalAdvice?: string;
  sources?: string[];
  confidence?: number;
}

interface Props {
  initialQuery?: string;
  onResult?: (data: TuneAdviceResult) => void;
}

export function TuneAdviceAgent({ initialQuery, onResult }: Props) {
  const { t } = useI18n();
  return (
    <WebSearchAgentBase<TuneAdviceResult>
      agentSlug="tune-advice-search"
      testIdPrefix="tune-advice"
      inputPlaceholder={t('agentSearch.queryLabel' as any)}
      searchLabel={t('agentSearch.tuneAdvice' as any)}
      initialQuery={initialQuery}
      onResult={onResult}
      renderResult={(d) => (
        <div className="space-y-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold">{d.gun ?? '—'}</h4>
            <ConfidenceBadge value={d.confidence} />
          </div>
          {d.tunes && d.tunes.length > 0 ? (
            <div className="space-y-2">
              {d.tunes.map((tu, i) => (
                <div key={i} className="rounded border border-border bg-muted/40 p-2">
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="text-[11px] font-semibold">{tu.name ?? `Tune ${i + 1}`}</span>
                    {tu.targetVelocityMs != null && (
                      <span className="font-mono text-[11px] text-primary">
                        {tu.targetVelocityMs} m/s
                      </span>
                    )}
                  </div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
                    {tu.hammerSpring && <Pair label="Hammer" v={tu.hammerSpring} />}
                    {tu.regulatorPsi != null && <Pair label="Reg" v={`${tu.regulatorPsi} psi`} />}
                    {tu.transferPortMm != null && (
                      <Pair label="TP" v={`${tu.transferPortMm} mm`} />
                    )}
                    {tu.forProjectile && <Pair label="For" v={tu.forProjectile} />}
                  </dl>
                  {tu.notes && (
                    <p className="mt-1 text-[10px] italic text-muted-foreground">{tu.notes}</p>
                  )}
                  {tu.source && (
                    <a
                      href={tu.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-primary underline hover:opacity-80"
                    >
                      source
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">{t('agentSearch.noResult' as any)}</p>
          )}
          {d.generalAdvice && (
            <p className="text-[11px] italic text-muted-foreground">{d.generalAdvice}</p>
          )}
          <SourcesList sources={d.sources} />
        </div>
      )}
    />
  );
}

function Pair({ label, v }: { label: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono">{v}</dd>
    </div>
  );
}