import React, { useState, useMemo } from 'react';
import { ArrowLeftRight, Wind, Search, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import {
  convertVelocity, convertDistance, convertWeight, convertEnergy,
  convertPressure, convertTemperature, convertAngle, convertArea,
  convertVolume, convertForce, convertPower,
  VelocityUnit, DistanceUnit, WeightUnit, EnergyUnit, PressureUnit,
  TemperatureUnit, AngleUnit, AreaUnit, VolumeUnit, ForceUnit, PowerUnit,
  calcMuzzleEnergy,
} from '@/lib/conversions';
import { unitCategories, UnitOption } from '@/lib/units';
import { motion } from 'framer-motion';

// ── Map category key → converter fn ──
const convertFns: Record<string, (v: number, f: string, t: string) => number> = {
  velocity: (v, f, t) => convertVelocity(v, f as VelocityUnit, t as VelocityUnit),
  energy: (v, f, t) => convertEnergy(v, f as EnergyUnit, t as EnergyUnit),
  power: (v, f, t) => convertPower(v, f as PowerUnit, t as PowerUnit),
  force: (v, f, t) => convertForce(v, f as ForceUnit, t as ForceUnit),
  pressure: (v, f, t) => convertPressure(v, f as PressureUnit, t as PressureUnit),
  distance: (v, f, t) => convertDistance(v, f as DistanceUnit, t as DistanceUnit),
  length: (v, f, t) => convertDistance(v, f as DistanceUnit, t as DistanceUnit),
  area: (v, f, t) => convertArea(v, f as AreaUnit, t as AreaUnit),
  volume: (v, f, t) => convertVolume(v, f as VolumeUnit, t as VolumeUnit),
  weight: (v, f, t) => convertWeight(v, f as WeightUnit, t as WeightUnit),
  temperature: (v, f, t) => convertTemperature(v, f as TemperatureUnit, t as TemperatureUnit),
  correction: (v, f, t) => convertAngle(v, f as AngleUnit, t as AngleUnit),
};

const categoryIcons: Record<string, string> = {
  velocity: '⚡', energy: '💥', power: '🔋', force: '💪',
  pressure: '🔧', distance: '📏', length: '📐', area: '⬛',
  volume: '🧪', weight: '⚖️', temperature: '🌡', correction: '🎯',
};

interface ConverterProps {
  categoryKey: string;
  options: UnitOption[];
  defaultFrom: string;
  defaultTo: string;
  label: string;
  icon: string;
}

function ConverterCard({ categoryKey, options, defaultFrom, defaultTo, label, icon }: ConverterProps) {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [value, setValue] = useState<string>('');

  const numValue = parseFloat(value) || 0;
  const result = useMemo(() => {
    try {
      const fn = convertFns[categoryKey];
      return fn ? fn(numValue, from, to) : 0;
    } catch { return 0; }
  }, [numValue, from, to, categoryKey]);

  const swap = () => { setFrom(to); setTo(from); };

  const fromOpt = options.find(o => o.value === from);
  const toOpt = options.find(o => o.value === to);

  const formatResult = (n: number) => {
    if (!value) return '—';
    if (Math.abs(n) >= 1e6 || (Math.abs(n) < 1e-3 && n !== 0)) {
      return n.toExponential(4);
    }
    return n.toFixed(6).replace(/\.?0+$/, '');
  };

  const selectClass = "w-full bg-muted border border-border rounded-md px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="surface-elevated p-4 space-y-3">
      <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
        <span>{icon}</span>
        {label}
      </h3>

      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <div className="space-y-1">
            <select className={selectClass} value={from} onChange={e => setFrom(e.target.value)}>
              {options.map(o => (
                <option key={o.value} value={o.value}>{o.symbol} — {o.labelEn}</option>
              ))}
            </select>
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
            onClick={swap}
            className="p-2 rounded-md hover:bg-muted text-primary shrink-0"
            title="Swap"
            aria-label="Swap units"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-1">
          <select className={selectClass} value={to} onChange={e => setTo(e.target.value)}>
            {options.map(o => (
              <option key={o.value} value={o.value}>{o.symbol} — {o.labelEn}</option>
            ))}
          </select>
          <div className="bg-primary/5 border border-primary/20 rounded-md px-3 py-2 text-sm font-mono font-semibold text-primary min-h-[38px] flex items-center justify-between gap-2">
            <span className="truncate">{formatResult(result)}</span>
            <span className="text-[10px] text-muted-foreground shrink-0">{toOpt?.symbol}</span>
          </div>
        </div>

        {value && fromOpt && toOpt && (
          <div className="text-[10px] text-muted-foreground font-mono pt-1 border-t border-border/50">
            {numValue} {fromOpt.symbol} = {formatResult(result)} {toOpt.symbol}
          </div>
        )}
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
        {unitCategories.map(cat => (
          <ConverterCard
            key={cat.key}
            categoryKey={cat.key}
            options={cat.options}
            defaultFrom={cat.defaultMetric}
            defaultTo={cat.defaultImperial}
            label={locale === 'fr' ? cat.labelKeyFr : cat.labelKeyEn}
            icon={categoryIcons[cat.key] ?? '🔢'}
          />
        ))}
      </div>

      {/* Quick energy calculator */}
      <div className="surface-elevated p-4">
        <h3 className="font-heading font-semibold text-sm mb-3">⚡ {t('conv.muzzleEnergy')}</h3>
        <QuickEnergy />
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

function QuickEnergy() {
  const { t } = useI18n();
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
  const knot = numKmh * 0.539957;
  const inputClass = "w-full bg-muted border border-border rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary";
  const resultClass = "bg-primary/5 border border-primary/20 rounded-md px-3 py-1.5 text-sm font-mono font-semibold text-primary min-h-[34px] flex items-center";

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div>
        <label className="text-[10px] text-muted-foreground font-mono">km/h</label>
        <input type="number" inputMode="decimal" className={inputClass} value={kmh} onChange={e => setKmh(e.target.value)} placeholder="0" />
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground font-mono">m/s</label>
        <div className={resultClass}>{kmh ? ms.toFixed(2) : '—'}</div>
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground font-mono">mph</label>
        <div className={resultClass}>{kmh ? mph.toFixed(2) : '—'}</div>
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground font-mono">kn</label>
        <div className={resultClass}>{kmh ? knot.toFixed(2) : '—'}</div>
      </div>
    </div>
  );
}
