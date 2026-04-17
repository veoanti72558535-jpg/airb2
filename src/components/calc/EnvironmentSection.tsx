import { Wind, MapPin, Cloud, Loader2, AlertCircle, RotateCw } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Section } from './Section';
import { UnitField } from './UnitField';
import { Field } from './Field';
import { WeatherSnapshot } from '@/lib/types';
import { useWeather } from '@/hooks/use-weather';
import { getSettings } from '@/lib/storage';
import { cn } from '@/lib/utils';

interface Props {
  weather: WeatherSnapshot;
  /** Replace the whole snapshot — used by auto fetch / reset. */
  onReplace: (next: WeatherSnapshot) => void;
  /** Patch one or more fields manually (tracks override flags). */
  onPatchManual: (patch: Partial<WeatherSnapshot>) => void;
  advanced?: boolean;
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

export function EnvironmentSection({ weather, onReplace, onPatchManual, advanced }: Props) {
  const { t, locale } = useI18n();
  const settings = getSettings();
  const autoEnabled = settings.weatherAutoSuggest !== false; // default on
  const api = useWeather(weather, onReplace);
  const source = api.effectiveSource(weather);

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
    <Section icon={Wind} title={t('calc.sectionWeather')}>
      {/* Status / actions strip */}
      {autoEnabled && (
        <div className="flex flex-wrap items-center gap-2 -mt-1">
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
                  ? api.fetchByCoords(weather.latitude, weather.longitude)
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
          {weather.provider && (
            <span className="text-[10px] text-muted-foreground font-mono">
              {weather.location ?? weather.provider} · {formatAge(weather.timestamp, locale)}
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
          label={t('calc.windSpeed')}
          category="velocity"
          value={weather.windSpeed}
          step={0.5}
          onChange={v => onPatchManual({ windSpeed: v })}
        />
        <Field
          label={t('calc.windAngle')}
          unit="°"
          value={weather.windAngle}
          step={5}
          onChange={v => onPatchManual({ windAngle: v })}
          hint={t('calc.windAngleHint')}
        />
      </div>
      {advanced && (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            <UnitField
              label={t('calc.temperature')}
              category="temperature"
              value={weather.temperature}
              step={1}
              onChange={v => onPatchManual({ temperature: v })}
            />
            <UnitField
              label={t('calc.pressure')}
              category="pressure"
              value={weather.pressure}
              step={1}
              onChange={v => onPatchManual({ pressure: v })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Field
              label={t('calc.humidity')}
              unit="%"
              value={weather.humidity}
              step={5}
              onChange={v => onPatchManual({ humidity: v })}
            />
            <UnitField
              label={t('calc.altitude')}
              category="distance"
              value={weather.altitude}
              step={50}
              onChange={v => onPatchManual({ altitude: v })}
            />
          </div>
        </>
      )}
    </Section>
  );
}
