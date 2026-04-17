import { Crosshair, MapPin, Loader2, AlertCircle, Cloud, RotateCw } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Section } from './Section';
import { UnitField } from './UnitField';
import { Switch } from '@/components/ui/switch';
import { WeatherSnapshot } from '@/lib/types';
import { useWeather } from '@/hooks/use-weather';
import { getSettings } from '@/lib/storage';
import { cn } from '@/lib/utils';

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
                <UnitField
                  label={t('calc.zeroPressure')}
                  category="pressure"
                  value={zeroWeather.pressure}
                  step={1}
                  onChange={v => onZeroWeatherChange({ pressure: v })}
                />
                <UnitField
                  label={t('calc.zeroHumidity')}
                  category="correction"
                  allowedUnits={[]}
                  lockUnit
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
