import { Wind } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Section } from './Section';
import { Field } from './Field';
import { useUnits } from '@/hooks/use-units';
import { WeatherSnapshot } from '@/lib/types';

interface Props {
  weather: WeatherSnapshot;
  onChange: (patch: Partial<WeatherSnapshot>) => void;
  advanced?: boolean;
}

export function EnvironmentSection({ weather, onChange, advanced }: Props) {
  const { t } = useI18n();
  const { symbol } = useUnits();

  return (
    <Section icon={Wind} title={t('calc.sectionWeather')}>
      <div className="grid grid-cols-2 gap-2.5">
        <Field
          label={t('calc.windSpeed')}
          unit={symbol('velocity')}
          value={weather.windSpeed}
          step={0.5}
          onChange={v => onChange({ windSpeed: v })}
        />
        <Field
          label={t('calc.windAngle')}
          unit="°"
          value={weather.windAngle}
          step={5}
          onChange={v => onChange({ windAngle: v })}
        />
      </div>
      {advanced && (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            <Field
              label={t('calc.temperature')}
              unit={symbol('temperature')}
              value={weather.temperature}
              step={1}
              onChange={v => onChange({ temperature: v })}
            />
            <Field
              label={t('calc.pressure')}
              unit="hPa"
              value={weather.pressure}
              step={1}
              onChange={v => onChange({ pressure: v })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Field
              label={t('calc.humidity')}
              unit="%"
              value={weather.humidity}
              step={5}
              onChange={v => onChange({ humidity: v })}
            />
            <Field
              label={t('calc.altitude')}
              unit={symbol('distance')}
              value={weather.altitude}
              step={50}
              onChange={v => onChange({ altitude: v })}
            />
          </div>
        </>
      )}
    </Section>
  );
}
