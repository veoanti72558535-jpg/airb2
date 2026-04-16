import React, { useState, useMemo } from 'react';
import { ArrowLeftRight, Wind } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import {
  convertVelocity, convertDistance, convertWeight, convertEnergy,
  convertPressure, convertTemperature, convertAngle,
  VelocityUnit, DistanceUnit, WeightUnit, EnergyUnit, PressureUnit, TemperatureUnit, AngleUnit,
  calcMuzzleEnergy,
} from '@/lib/conversions';
import { useUnits } from '@/hooks/use-units';
import { motion } from 'framer-motion';

interface ConvGroup {
  labelKeyFr: string;
  labelKeyEn: string;
  icon: string;
  pairs: { from: string; to: string; fromSymbol: string; toSymbol: string }[];
  convert: (v: number, from: string, to: string) => number;
}

const groups: ConvGroup[] = [
  {
    labelKeyFr: 'Vitesse', labelKeyEn: 'Velocity', icon: '⚡',
    pairs: [
      { from: 'mps', to: 'fps', fromSymbol: 'm/s', toSymbol: 'fps' },
    ],
    convert: (v, f, t) => convertVelocity(v, f as VelocityUnit, t as VelocityUnit),
  },
  {
    labelKeyFr: 'Énergie', labelKeyEn: 'Energy', icon: '💥',
    pairs: [
      { from: 'joules', to: 'ftlbs', fromSymbol: 'J', toSymbol: 'ft·lbs' },
    ],
    convert: (v, f, t) => convertEnergy(v, f as EnergyUnit, t as EnergyUnit),
  },
  {
    labelKeyFr: 'Pression', labelKeyEn: 'Pressure', icon: '🔧',
    pairs: [
      { from: 'bar', to: 'psi', fromSymbol: 'bar', toSymbol: 'psi' },
      { from: 'hpa', to: 'bar', fromSymbol: 'hPa', toSymbol: 'bar' },
      { from: 'atm', to: 'bar', fromSymbol: 'atm', toSymbol: 'bar' },
    ],
    convert: (v, f, t) => convertPressure(v, f as PressureUnit, t as PressureUnit),
  },
  {
    labelKeyFr: 'Distance', labelKeyEn: 'Distance', icon: '📏',
    pairs: [
      { from: 'meters', to: 'yards', fromSymbol: 'm', toSymbol: 'yd' },
      { from: 'mm', to: 'inches', fromSymbol: 'mm', toSymbol: 'in' },
      { from: 'cm', to: 'inches', fromSymbol: 'cm', toSymbol: 'in' },
      { from: 'feet', to: 'meters', fromSymbol: 'ft', toSymbol: 'm' },
    ],
    convert: (v, f, t) => convertDistance(v, f as DistanceUnit, t as DistanceUnit),
  },
  {
    labelKeyFr: 'Poids / Masse', labelKeyEn: 'Weight / Mass', icon: '⚖️',
    pairs: [
      { from: 'grains', to: 'grams', fromSymbol: 'gr', toSymbol: 'g' },
      { from: 'grams', to: 'oz', fromSymbol: 'g', toSymbol: 'oz' },
    ],
    convert: (v, f, t) => convertWeight(v, f as WeightUnit, t as WeightUnit),
  },
  {
    labelKeyFr: 'Température', labelKeyEn: 'Temperature', icon: '🌡',
    pairs: [
      { from: 'celsius', to: 'fahrenheit', fromSymbol: '°C', toSymbol: '°F' },
      { from: 'celsius', to: 'kelvin', fromSymbol: '°C', toSymbol: 'K' },
    ],
    convert: (v, f, t) => convertTemperature(v, f as TemperatureUnit, t as TemperatureUnit),
  },
  {
    labelKeyFr: 'Angle / Correction', labelKeyEn: 'Angle / Correction', icon: '🎯',
    pairs: [
      { from: 'moa', to: 'mrad', fromSymbol: 'MOA', toSymbol: 'MRAD' },
      { from: 'degrees', to: 'moa', fromSymbol: '°', toSymbol: 'MOA' },
    ],
    convert: (v, f, t) => convertAngle(v, f as AngleUnit, t as AngleUnit),
  },
];

function ConverterCard({ group, locale }: { group: ConvGroup; locale: string }) {
  const [activePair, setActivePair] = useState(0);
  const [value, setValue] = useState<string>('');
  const [swapped, setSwapped] = useState(false);

  const pair = group.pairs[activePair];
  const from = swapped ? pair.to : pair.from;
  const to = swapped ? pair.from : pair.to;
  const fromSymbol = swapped ? pair.toSymbol : pair.fromSymbol;
  const toSymbol = swapped ? pair.fromSymbol : pair.toSymbol;

  const numValue = parseFloat(value) || 0;
  const result = useMemo(() => {
    try { return group.convert(numValue, from, to); }
    catch { return 0; }
  }, [numValue, from, to]);

  const label = locale === 'fr' ? group.labelKeyFr : group.labelKeyEn;

  return (
    <div className="surface-elevated p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
          <span>{group.icon}</span>
          {label}
        </h3>
        {group.pairs.length > 1 && (
          <div className="flex gap-1">
            {group.pairs.map((p, i) => (
              <button
                key={i}
                onClick={() => { setActivePair(i); setSwapped(false); setValue(''); }}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  i === activePair ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {p.fromSymbol}→{p.toSymbol}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1">
          <div className="text-[10px] text-muted-foreground mb-1 font-mono">{fromSymbol}</div>
          <input
            type="number"
            inputMode="decimal"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="0"
            className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <button
          onClick={() => setSwapped(!swapped)}
          className="p-2 rounded-md hover:bg-muted text-primary mt-4 shrink-0"
          title="Swap"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </button>

        <div className="flex-1">
          <div className="text-[10px] text-muted-foreground mb-1 font-mono">{toSymbol}</div>
          <div className="bg-primary/5 border border-primary/20 rounded-md px-3 py-2 text-sm font-mono font-semibold text-primary min-h-[38px] flex items-center">
            {value ? result.toFixed(4).replace(/\.?0+$/, '') : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConversionsPage() {
  const { t, locale } = useI18n();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ArrowLeftRight className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-heading font-bold">{t('conv.title')}</h1>
        </div>
        <p className="text-xs text-muted-foreground font-mono">{t('conv.subtitle')}</p>
      </div>

      {/* Converter cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {groups.map((g, i) => (
          <ConverterCard key={i} group={g} locale={locale} />
        ))}
      </div>

      {/* Quick energy calculator */}
      <div className="surface-elevated p-4">
        <h3 className="font-heading font-semibold text-sm mb-3">⚡ {t('conv.muzzleEnergy')}</h3>
        <QuickEnergy locale={locale} />
      </div>

      {/* Wind speed converter */}
      <div className="surface-elevated p-4">
        <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
          <Wind className="h-4 w-4 text-primary" />
          {t('conv.windSpeed')}
        </h3>
        <WindConverter />
      </div>
    </motion.div>
  );
}

function QuickEnergy({ locale }: { locale: string }) {
  const { t } = useI18n();
  const { symbol } = useUnits();
  const [vel, setVel] = useState('280');
  const [weight, setWeight] = useState('18');
  const v = parseFloat(vel) || 0;
  const w = parseFloat(weight) || 0;
  const e = calcMuzzleEnergy(v, w);
  const inputClass = "w-full bg-muted border border-border rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-muted-foreground font-mono">{t('calc.muzzleVelocity')} (m/s)</label>
          <input type="number" inputMode="decimal" className={inputClass} value={vel} onChange={e => setVel(e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground font-mono">{t('calc.projectileWeight')} (gr)</label>
          <input type="number" inputMode="decimal" className={inputClass} value={weight} onChange={e => setWeight(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-primary/5 border border-primary/20 rounded-md px-3 py-2 text-center">
          <div className="text-lg font-mono font-bold text-primary">{e.joules}</div>
          <div className="text-[10px] text-muted-foreground">Joules</div>
        </div>
        <div className="bg-primary/5 border border-primary/20 rounded-md px-3 py-2 text-center">
          <div className="text-lg font-mono font-bold text-primary">{e.ftlbs}</div>
          <div className="text-[10px] text-muted-foreground">ft·lbs</div>
        </div>
      </div>
    </div>
  );
}

function WindConverter() {
  const [kmh, setKmh] = useState<string>('');
  const numKmh = parseFloat(kmh) || 0;
  const ms = numKmh / 3.6;
  const mph = numKmh * 0.621371;
  const inputClass = "w-full bg-muted border border-border rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="grid grid-cols-3 gap-3">
      <div>
        <label className="text-[10px] text-muted-foreground font-mono">km/h</label>
        <input type="number" inputMode="decimal" className={inputClass} value={kmh} onChange={e => setKmh(e.target.value)} placeholder="0" />
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground font-mono">m/s</label>
        <div className="bg-primary/5 border border-primary/20 rounded-md px-3 py-1.5 text-sm font-mono font-semibold text-primary min-h-[34px] flex items-center">
          {kmh ? ms.toFixed(1) : '—'}
        </div>
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground font-mono">mph</label>
        <div className="bg-primary/5 border border-primary/20 rounded-md px-3 py-1.5 text-sm font-mono font-semibold text-primary min-h-[34px] flex items-center">
          {kmh ? mph.toFixed(1) : '—'}
        </div>
      </div>
    </div>
  );
}
