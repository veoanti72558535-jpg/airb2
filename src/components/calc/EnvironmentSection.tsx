import { useState } from 'react';
import { Wind, CloudSun } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Section } from './Section';
import { UnitField } from './UnitField';
import { Field } from './Field';
import { WeatherSnapshot } from '@/lib/types';
import { useWeather } from '@/hooks/use-weather';
import { getSettings } from '@/lib/storage';
import { WeatherLocationPicker } from './WeatherLocationPicker';
import { WeatherSearchAgent } from '@/components/ai/agents/WeatherSearchAgent';
import { AgentDialog } from '@/components/ai/agents/AgentDialog';

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
  const [aiWeatherOpen, setAiWeatherOpen] = useState(false);

  return (
    <Section icon={Wind} title={t('calc.sectionWeather')}>
      <WeatherLocationPicker weather={weather} api={api} autoEnabled={autoEnabled} />

      <div>
        <button
          type="button"
          onClick={() => setAiWeatherOpen(true)}
          className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-primary/30 text-primary/80 hover:bg-primary/10"
          data-testid="env-ai-weather-btn"
        >
          <CloudSun className="h-3.5 w-3.5" />
          {t('agentSearch.weatherCurrent' as any)}
        </button>
      </div>

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

      <AgentDialog
        open={aiWeatherOpen}
        onOpenChange={setAiWeatherOpen}
        title={t('agentSearch.weatherCurrent' as any)}
      >
        <WeatherSearchAgent
          initialQuery={weather.location ?? ''}
          onResult={(d) => {
            const patch: Partial<WeatherSnapshot> = {};
            if (d.temperatureC != null) patch.temperature = d.temperatureC;
            if (d.pressureHpa != null) patch.pressure = d.pressureHpa;
            if (d.humidityPct != null) patch.humidity = d.humidityPct;
            if (d.altitudeM != null) patch.altitude = d.altitudeM;
            if (d.windSpeedMs != null) patch.windSpeed = d.windSpeedMs;
            if (d.windDirectionDeg != null) patch.windAngle = d.windDirectionDeg;
            if (Object.keys(patch).length > 0) onPatchManual(patch);
            setAiWeatherOpen(false);
          }}
        />
      </AgentDialog>
    </Section>
  );
}
