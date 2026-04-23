/**
 * R5 — Current weather lookup. The "Use these conditions" button calls
 * `onResult` so the parent can pre-fill the atmosphere form.
 */
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { CloudSun } from 'lucide-react';
import { WebSearchAgentBase, ConfidenceBadge } from './WebSearchAgentBase';

export interface WeatherSearchResult {
  location?: string;
  temperatureC?: number;
  pressureHpa?: number;
  humidityPct?: number;
  altitudeM?: number;
  windSpeedMs?: number;
  windDirectionDeg?: number;
  windDirectionLabel?: string;
  conditions?: string;
  timestamp?: string;
  source?: string;
  confidence?: number;
}

interface Props {
  initialQuery?: string;
  onResult?: (data: WeatherSearchResult) => void;
}

export function WeatherSearchAgent({ initialQuery, onResult }: Props) {
  const { t } = useI18n();
  return (
    <WebSearchAgentBase<WeatherSearchResult>
      agentSlug="weather-location-search"
      testIdPrefix="weather-search"
      inputPlaceholder={t('agentSearch.queryLabel' as any)}
      searchLabel={t('agentSearch.weatherCurrent' as any)}
      initialQuery={initialQuery}
      renderResult={(d) => (
        <div className="space-y-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <CloudSun className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">{d.location ?? '—'}</h4>
            <ConfidenceBadge value={d.confidence} />
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3">
            {d.temperatureC != null && <Pair label="T°" v={`${d.temperatureC} °C`} />}
            {d.pressureHpa != null && <Pair label="P" v={`${d.pressureHpa} hPa`} />}
            {d.humidityPct != null && <Pair label="RH" v={`${d.humidityPct} %`} />}
            {d.altitudeM != null && <Pair label="Alt" v={`${d.altitudeM} m`} />}
            {d.windSpeedMs != null && <Pair label="Wind" v={`${d.windSpeedMs} m/s`} />}
            {d.windDirectionLabel && <Pair label="Dir" v={d.windDirectionLabel} />}
          </dl>
          {d.conditions && (
            <p className="text-[11px] italic text-muted-foreground">{d.conditions}</p>
          )}
          {d.source && (
            <p className="text-[10px] text-muted-foreground">source: {d.source}</p>
          )}
          {onResult && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onResult(d)}
              data-testid="weather-search-use"
            >
              {t('agentSearch.useConditions' as any)}
            </Button>
          )}
        </div>
      )}
    />
  );
}

function Pair({ label, v }: { label: string; v: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-border/40 py-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono">{v}</dd>
    </div>
  );
}