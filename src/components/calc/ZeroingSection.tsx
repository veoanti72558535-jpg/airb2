import { useState } from 'react';
import { Crosshair, MapPin, Loader2, AlertCircle, Cloud, RotateCw } from 'lucide-react';
import { z } from 'zod';
import { useI18n } from '@/lib/i18n';
import { Section } from './Section';
import { UnitField } from './UnitField';
import { Field } from './Field';
import { Switch } from '@/components/ui/switch';
import { WeatherSnapshot } from '@/lib/types';
import { useWeather } from '@/hooks/use-weather';
import { getSettings } from '@/lib/storage';
import { cn } from '@/lib/utils';

// Strict bounds — Open-Meteo rejects out-of-range
const coordsSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lon: z.number().finite().min(-180).max(180),
});

interface Props {
  zeroRange: number;
  sightHeight: number;
  useZeroWeather: boolean;
  zeroWeather: WeatherSnapshot;
  onChange: (patch: {
    zeroRange?: number;
    sightHeight?: number;
    useZeroWeather?: boolean;
  }) => void;
  onZeroWeatherChange: (patch: Partial<WeatherSnapshot>) => void;
  /** Replace the whole zero weather snapshot (used by auto fetch). */
  onZeroWeatherReplace: (next: WeatherSnapshot) => void;
  advanced?: boolean;
}

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

export function ZeroingSection({
  zeroRange,
  sightHeight,
  useZeroWeather,
  zeroWeather,
  onChange,
  onZeroWeatherChange,
  onZeroWeatherReplace,
  advanced,
}: Props) {
  const { t, locale } = useI18n();
  const settings = getSettings();
  const autoEnabled = settings.weatherAutoSuggest !== false;
  const api = useWeather(zeroWeather, onZeroWeatherReplace);
  const source = api.effectiveSource(zeroWeather);

  // Manual coords UI — collapsed by default
  const [showManualCoords, setShowManualCoords] = useState(false);
  const [latInput, setLatInput] = useState<string>(
    zeroWeather.latitude != null ? String(zeroWeather.latitude) : '',
  );
  const [lonInput, setLonInput] = useState<string>(
    zeroWeather.longitude != null ? String(zeroWeather.longitude) : '',
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
    <Section
      icon={Crosshair}
      title={t('calc.sectionZeroing')}
      description={t('calc.sectionZeroingHint')}
    >
      <div className="grid grid-cols-2 gap-2.5">
        <UnitField
          label={t('calc.zeroRange')}
          category="distance"
          value={zeroRange}
          step={5}
          onChange={v => onChange({ zeroRange: v })}
        />
        <UnitField
          label={t('calc.sightHeight')}
          category="length"
          value={sightHeight}
          step={1}
          onChange={v => onChange({ sightHeight: v })}
          hint={t('calc.sightHeightHint')}
        />
      </div>

      {advanced && (
        <>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2">
            <div className="min-w-0">
              <div className="text-xs font-semibold">{t('calc.useZeroWeather')}</div>
              <div className="text-[10px] text-muted-foreground">
                {t('calc.useZeroWeatherHint')}
              </div>
            </div>
            <Switch
              checked={useZeroWeather}
              onCheckedChange={v => onChange({ useZeroWeather: v })}
            />
          </div>

          {useZeroWeather && (
            <div className="space-y-2.5 pt-1">
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
                  {zeroWeather.provider && (
                    <button
                      type="button"
                      onClick={() =>
                        zeroWeather.latitude != null && zeroWeather.longitude != null
                          ? api.fetchByCoords(zeroWeather.latitude, zeroWeather.longitude, { force: true })
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
              {zeroWeather.provider && (
                <span className="text-[10px] text-muted-foreground font-mono">
                  {zeroWeather.location ?? zeroWeather.provider} · {formatAge(zeroWeather.timestamp, locale)}
                </span>
              )}
            </div>
          )}

          {autoEnabled && showManualCoords && (
            <div className="rounded-md border border-border/60 bg-background/40 p-2.5 space-y-2">
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

              <div className="grid grid-cols-2 gap-2.5">
                <UnitField
                  label={t('calc.zeroTemp')}
                  category="temperature"
                  value={zeroWeather.temperature}
                  step={1}
                  onChange={v => onZeroWeatherChange({ temperature: v })}
                />
                <Field
                  label={t('calc.zeroPressure')}
                  unit="hPa"
                  value={zeroWeather.pressure}
                  step={1}
                  onChange={v => onZeroWeatherChange({ pressure: v })}
                />
                <Field
                  label={t('calc.zeroHumidity')}
                  unit="%"
                  value={zeroWeather.humidity}
                  step={5}
                  onChange={v => onZeroWeatherChange({ humidity: v })}
                />
                <UnitField
                  label={t('calc.zeroAltitude')}
                  category="distance"
                  value={zeroWeather.altitude}
                  step={50}
                  onChange={v => onZeroWeatherChange({ altitude: v })}
                />
              </div>
            </div>
          )}
        </>
      )}
    </Section>
  );
}
