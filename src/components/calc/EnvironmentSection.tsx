import { Wind } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Section } from './Section';
import { UnitField } from './UnitField';
import { Field } from './Field';
import { WeatherSnapshot } from '@/lib/types';
import { useWeather } from '@/hooks/use-weather';
import { getSettings } from '@/lib/storage';
import { WeatherLocationPicker } from './WeatherLocationPicker';

interface Props {
  weather: WeatherSnapshot;
  /** Replace the whole snapshot — used by auto fetch / reset. */
  onReplace: (next: WeatherSnapshot) => void;
  /** Patch one or more fields manually (tracks override flags). */
  onPatchManual: (patch: Partial<WeatherSnapshot>) => void;
  advanced?: boolean;
}

export function EnvironmentSection({ weather, onReplace, onPatchManual, advanced }: Props) {
  const { t } = useI18n();
  const settings = getSettings();
  const autoEnabled = settings.weatherAutoSuggest !== false; // default on
  const api = useWeather(weather, onReplace);

  return (
    <Section icon={Wind} title={t('calc.sectionWeather')}>
      <WeatherLocationPicker weather={weather} api={api} autoEnabled={autoEnabled} />

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
