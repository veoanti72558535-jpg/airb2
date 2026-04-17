import { useState } from 'react';
import { MapPin, Loader2, AlertCircle, Cloud, RotateCw, Crosshair } from 'lucide-react';
import { z } from 'zod';
import { useI18n } from '@/lib/i18n';
import { WeatherSnapshot } from '@/lib/types';
import { UseWeatherApi } from '@/hooks/use-weather';
import { cn } from '@/lib/utils';
import { CitySearch } from './CitySearch';

// Strict bounds — Open-Meteo rejects out-of-range; failing fast in the UI gives
// a clearer error than a generic HTTP 400.
const coordsSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lon: z.number().finite().min(-180).max(180),
});

interface Props {
  weather: WeatherSnapshot;
  api: UseWeatherApi;
  /** Whether the auto-suggest feature flag is on (drives the strip visibility). */
  autoEnabled: boolean;
}

/** Pretty-print "5 min ago" in a tiny, locale-aware way. */
function formatAge(iso: string, locale: 'fr' | 'en'): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff) || diff < 0) return '';
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return locale === 'fr' ? "à l'instant" : 'just now';
  if (mins < 60) return locale === 'fr' ? `il y a ${mins} min` : `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return locale === 'fr' ? `il y a ${hours} h` : `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * Shared weather location UI: actions strip (locate / refresh / manual toggle),
 * source badge, manual coords panel with city search + lat/lon inputs, and
 * fetch error banner. Stateless w.r.t. weather — owns only the local UI state
 * for the manual coords toggle and lat/lon text inputs.
 */
export function WeatherLocationPicker({ weather, api, autoEnabled }: Props) {
  const { t, locale } = useI18n();
  const source = api.effectiveSource(weather);

  const [showManualCoords, setShowManualCoords] = useState(false);
  const [latInput, setLatInput] = useState<string>(
    weather.latitude != null ? String(weather.latitude) : '',
  );
  const [lonInput, setLonInput] = useState<string>(
    weather.longitude != null ? String(weather.longitude) : '',
  );
  const [coordsError, setCoordsError] = useState<string | null>(null);

  const submitManualCoords = () => {
    const parsed = coordsSchema.safeParse({
      lat: Number(latInput.replace(',', '.')),
      lon: Number(lonInput.replace(',', '.')),
    });
    if (!parsed.success) {
      setCoordsError(t('weather.errInvalidCoords'));
      return;
    }
    setCoordsError(null);
    void api.fetchByCoords(parsed.data.lat, parsed.data.lon, { force: true });
  };

  const sourceLabel =
    source === 'auto' ? t('weather.sourceAuto') :
    source === 'mixed' ? t('weather.sourceMixed') :
    t('weather.sourceManual');

  const sourceClass =
    source === 'auto' ? 'bg-primary/15 text-primary border-primary/30' :
    source === 'mixed' ? 'bg-amber-500/15 text-amber-500 border-amber-500/30 dark:text-amber-400' :
    'bg-muted text-muted-foreground border-border';

  const errorLabel =
    api.error === 'denied' ? t('weather.errPermission') :
    api.error === 'unavailable' ? t('weather.errUnavailable') :
    api.error === 'unsupported' ? t('weather.errUnsupported') :
    api.error === 'timeout' ? t('weather.errTimeout') :
    api.error ? t('weather.errFetch') : null;

  return (
    <div className="space-y-2.5">
      {autoEnabled && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => api.fetchByLocation()}
            disabled={api.status === 'loading' || api.status === 'locating'}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors disabled:opacity-60"
          >
            {api.status === 'locating' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <MapPin className="h-3.5 w-3.5" />
            )}
            {t('weather.useMyLocation')}
          </button>
          {weather.provider && (
            <button
              type="button"
              onClick={() =>
                weather.latitude != null && weather.longitude != null
                  ? api.fetchByCoords(weather.latitude, weather.longitude, { force: true })
                  : api.fetchByLocation()
              }
              disabled={api.status === 'loading'}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted/60 text-foreground text-[11px] font-medium hover:bg-muted transition-colors disabled:opacity-60"
              title={t('weather.refresh')}
            >
              {api.status === 'loading' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCw className="h-3.5 w-3.5" />
              )}
              {t('weather.refresh')}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowManualCoords(v => !v)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted/60 text-foreground text-[11px] font-medium hover:bg-muted transition-colors"
            aria-expanded={showManualCoords}
          >
            <Crosshair className="h-3.5 w-3.5" />
            {t('weather.manualCoords')}
          </button>
          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono uppercase tracking-wide', sourceClass)}>
            <Cloud className="h-3 w-3" />
            {sourceLabel}
          </span>
          {weather.provider && (
            <span className="text-[10px] text-muted-foreground font-mono">
              {weather.location ?? weather.provider} · {formatAge(weather.timestamp, locale)}
            </span>
          )}
        </div>
      )}

      {autoEnabled && showManualCoords && (
        <div className="rounded-md border border-border/60 bg-background/40 p-2.5 space-y-3">
          <CitySearch
            disabled={api.status === 'loading'}
            onPick={(city, label) => {
              setLatInput(String(city.latitude));
              setLonInput(String(city.longitude));
              setCoordsError(null);
              void api.fetchByCoords(city.latitude, city.longitude, {
                force: true,
                locationLabel: label,
              });
            }}
          />
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground font-mono">
            <span className="h-px flex-1 bg-border" />
            <span>{t('weather.or')}</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <p className="text-[10px] text-muted-foreground">{t('weather.manualCoordsHint')}</p>
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-mono">
                {t('weather.lat')}
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="0.0001"
                min={-90}
                max={90}
                value={latInput}
                onChange={e => setLatInput(e.target.value)}
                placeholder="48.8566"
                className="w-full px-2 py-1.5 text-xs font-mono rounded-md bg-background border border-border focus:border-primary focus:outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-mono">
                {t('weather.lon')}
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="0.0001"
                min={-180}
                max={180}
                value={lonInput}
                onChange={e => setLonInput(e.target.value)}
                placeholder="2.3522"
                className="w-full px-2 py-1.5 text-xs font-mono rounded-md bg-background border border-border focus:border-primary focus:outline-none"
              />
            </label>
            <button
              type="button"
              onClick={submitManualCoords}
              disabled={api.status === 'loading'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-[11px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {api.status === 'loading' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Cloud className="h-3.5 w-3.5" />
              )}
              {t('weather.fetchAtCoords')}
            </button>
          </div>
          {coordsError && (
            <div className="flex items-start gap-1.5 text-[10px] text-destructive">
              <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
              <span>{coordsError}</span>
            </div>
          )}
        </div>
      )}

      {errorLabel && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-[11px] text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{errorLabel}</span>
        </div>
      )}
    </div>
  );
}
