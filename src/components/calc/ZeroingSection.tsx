import { Crosshair } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Section } from './Section';
import { UnitField } from './UnitField';
import { Field } from './Field';
import { Switch } from '@/components/ui/switch';
import { WeatherSnapshot } from '@/lib/types';
import { useWeather } from '@/hooks/use-weather';
import { getSettings } from '@/lib/storage';
import { WeatherLocationPicker } from './WeatherLocationPicker';

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
  const { t } = useI18n();
  const settings = getSettings();
  const autoEnabled = settings.weatherAutoSuggest !== false;
  const api = useWeather(zeroWeather, onZeroWeatherReplace);

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
              <WeatherLocationPicker
                weather={zeroWeather}
                api={api}
                autoEnabled={autoEnabled}
              />

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
