import React, { useState, useMemo } from 'react';
import { Crosshair, BarChart3, Table2, Save } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { calculateTrajectory } from '@/lib/ballistics';
import { BallisticInput, BallisticResult, WeatherSnapshot } from '@/lib/types';
import { sessionStore, getSettings } from '@/lib/storage';
import { useUnits } from '@/hooks/use-units';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';

function defaultWeather(): WeatherSnapshot {
  return {
    temperature: 15,
    humidity: 50,
    pressure: 1013.25,
    altitude: 0,
    windSpeed: 0,
    windAngle: 90,
    source: 'manual',
    timestamp: new Date().toISOString(),
  };
}

function defaultInput(): BallisticInput {
  return {
    muzzleVelocity: 280,
    bc: 0.025,
    projectileWeight: 18,
    sightHeight: 40,
    zeroRange: 30,
    maxRange: 100,
    rangeStep: 5,
    weather: defaultWeather(),
    clickValue: 0.25,
    clickUnit: 'MOA',
  };
}

export default function QuickCalc() {
  const { t } = useI18n();
  const settings = getSettings();
  const { symbol } = useUnits();
  const [input, setInput] = useState<BallisticInput>(defaultInput);
  const [results, setResults] = useState<BallisticResult[] | null>(null);
  const [view, setView] = useState<'table' | 'chart'>('table');
  const [sessionName, setSessionName] = useState('');

  const handleCalculate = () => {
    const r = calculateTrajectory(input);
    setResults(r);
  };

  const handleSave = () => {
    if (!results) return;
    const name = sessionName || `Session ${new Date().toLocaleString()}`;
    sessionStore.create({
      name,
      input,
      results,
      tags: [],
      favorite: false,
    } as any);
    toast({ title: t('calc.saveSession'), description: name });
    setSessionName('');
  };

  const updateInput = (field: string, value: number) => {
    setInput(prev => ({ ...prev, [field]: value }));
  };

  const updateWeather = (field: string, value: number) => {
    setInput(prev => ({
      ...prev,
      weather: { ...prev.weather, [field]: value },
    }));
  };

  // Unit symbols from preferences
  const velUnit = symbol('velocity');
  const weightUnit = symbol('weight');
  const lengthUnit = symbol('length');
  const distUnit = symbol('distance');
  const tempUnit = symbol('temperature');
  const pressUnit = symbol('pressure');
  const corrUnit = symbol('correction');
  const energyUnit = symbol('energy');

  const fields = [
    { key: 'muzzleVelocity', label: t('calc.muzzleVelocity'), unit: velUnit, step: 1 },
    { key: 'bc', label: t('calc.bc'), unit: '', step: 0.001 },
    { key: 'projectileWeight', label: t('calc.projectileWeight'), unit: weightUnit, step: 0.5 },
    { key: 'sightHeight', label: t('calc.sightHeight'), unit: lengthUnit, step: 1 },
    { key: 'zeroRange', label: t('calc.zeroRange'), unit: distUnit, step: 5 },
    { key: 'maxRange', label: t('calc.maxRange'), unit: distUnit, step: 10 },
    { key: 'rangeStep', label: t('calc.rangeStep'), unit: distUnit, step: 5 },
  ];

  const weatherFields = [
    { key: 'windSpeed', label: t('calc.windSpeed'), unit: velUnit, step: 0.5 },
    { key: 'windAngle', label: t('calc.windAngle'), unit: '°', step: 5 },
    { key: 'temperature', label: t('calc.temperature'), unit: tempUnit, step: 1 },
    { key: 'pressure', label: t('calc.pressure'), unit: 'hPa', step: 1 },
    { key: 'humidity', label: t('calc.humidity'), unit: '%', step: 5 },
    { key: 'altitude', label: t('calc.altitude'), unit: distUnit, step: 50 },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Crosshair className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-heading font-bold">{t('calc.title')}</h1>
        </div>
        <p className="text-xs text-muted-foreground font-mono">{t('calc.subtitle')}</p>
      </div>

      {/* Input Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ballistic params */}
        <div className="surface-elevated p-4 space-y-3">
          <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
            <Crosshair className="h-4 w-4 text-primary" />
            {t('calc.sectionProjectile')}
          </h3>
          {fields.map(f => (
            <div key={f.key} className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground min-w-[120px]">{f.label}</label>
              <input
                type="number"
                inputMode="decimal"
                step={f.step}
                value={(input as any)[f.key]}
                onChange={e => updateInput(f.key, parseFloat(e.target.value) || 0)}
                className="flex-1 bg-muted border border-border rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {f.unit && <span className="text-[10px] text-muted-foreground font-mono w-10 text-right">{f.unit}</span>}
            </div>
          ))}
        </div>

        {/* Weather */}
        <div className="surface-elevated p-4 space-y-3">
          <h3 className="font-heading font-semibold text-sm">🌤 {t('calc.sectionWeather')}</h3>
          {(settings.advancedMode ? weatherFields : weatherFields.slice(0, 2)).map(f => (
            <div key={f.key} className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground min-w-[120px]">{f.label}</label>
              <input
                type="number"
                inputMode="decimal"
                step={f.step}
                value={(input.weather as any)[f.key]}
                onChange={e => updateWeather(f.key, parseFloat(e.target.value) || 0)}
                className="flex-1 bg-muted border border-border rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-[10px] text-muted-foreground font-mono w-10 text-right">{f.unit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calculate Button */}
      <button
        onClick={handleCalculate}
        className="w-full md:w-auto px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
      >
        <Crosshair className="h-4 w-4" />
        {t('calc.calculate')}
      </button>

      {/* Results */}
      {results && results.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-semibold text-lg">{t('calc.results')}</h2>
            <div className="flex gap-1">
              <button
                onClick={() => setView('table')}
                className={`p-2 rounded-md transition-colors ${view === 'table' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Table2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView('chart')}
                className={`p-2 rounded-md transition-colors ${view === 'chart' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <BarChart3 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {view === 'table' ? (
            <div className="surface-card overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="px-3 py-2 text-left">{t('calc.range')}<br/><span className="text-[10px]">{distUnit}</span></th>
                    <th className="px-3 py-2 text-right">{t('calc.drop')}<br/><span className="text-[10px]">{lengthUnit}</span></th>
                    <th className="px-3 py-2 text-right">{t('calc.holdover')}<br/><span className="text-[10px]">{corrUnit}</span></th>
                    <th className="px-3 py-2 text-right">{t('calc.velocity')}<br/><span className="text-[10px]">{velUnit}</span></th>
                    <th className="px-3 py-2 text-right">{t('calc.energy')}<br/><span className="text-[10px]">{energyUnit}</span></th>
                    <th className="px-3 py-2 text-right">{t('calc.tof')}<br/><span className="text-[10px]">s</span></th>
                    <th className="px-3 py-2 text-right">{t('calc.windDrift')}<br/><span className="text-[10px]">{lengthUnit}</span></th>
                    <th className="px-3 py-2 text-right">{t('calc.clicksElev')}</th>
                  </tr>
                </thead>
                <tbody>
                  {results.filter(r => r.range > 0).map(r => (
                    <tr key={r.range} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="px-3 py-2 font-semibold">{r.range}</td>
                      <td className={`px-3 py-2 text-right ${r.drop > 0 ? 'text-tactical' : r.drop < -50 ? 'text-destructive' : ''}`}>{r.drop.toFixed(1)}</td>
                      <td className="px-3 py-2 text-right">{r.holdover.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">{r.velocity.toFixed(1)}</td>
                      <td className="px-3 py-2 text-right">{r.energy.toFixed(1)}</td>
                      <td className="px-3 py-2 text-right">{r.tof.toFixed(3)}</td>
                      <td className="px-3 py-2 text-right">{r.windDrift.toFixed(1)}</td>
                      <td className="px-3 py-2 text-right">{r.clicksElevation ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="surface-card p-4">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={results.filter(r => r.range > 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="range" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      fontSize: '11px',
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="drop" name={`${t('calc.drop')} (${lengthUnit})`} stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="velocity" name={`${t('calc.velocity')} (${velUnit})`} stroke="hsl(var(--tactical))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Save session */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={t('calc.saveSession') + '...'}
              value={sessionName}
              onChange={e => setSessionName(e.target.value)}
              className="flex-1 bg-muted border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Save className="h-4 w-4" />
              {t('calc.saveSession')}
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
