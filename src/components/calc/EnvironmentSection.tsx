import { Wind } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Section } from './Section';
import { UnitField } from './UnitField';
import { Field } from './Field';
import { WeatherSnapshot } from '@/lib/types';

interface Props {
  weather: WeatherSnapshot;
  onChange: (patch: Partial<WeatherSnapshot>) => void;
  advanced?: boolean;
}

export function EnvironmentSection({ weather, onChange, advanced }: Props) {
  const { t } = useI18n();

  return (
    <Section icon={Wind} title={t('calc.sectionWeather')}>
      <div className="grid grid-cols-2 gap-2.5">
        <UnitField
          label={t('calc.windSpeed')}
          category="velocity"
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
              onChange={v => onChange({ temperature: v })}
            />
            <UnitField
              label={t('calc.pressure')}
              category="pressure"
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
            <UnitField
              label={t('calc.altitude')}
              category="distance"
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
