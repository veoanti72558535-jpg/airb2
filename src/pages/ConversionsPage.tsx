import React, { useState, useMemo } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import {
  convertVelocity, convertDistance, convertWeight, convertEnergy,
  convertPressure, convertTemperature, convertAngle,
  VelocityUnit, DistanceUnit, WeightUnit, EnergyUnit, PressureUnit, TemperatureUnit, AngleUnit,
  calcMuzzleEnergy,
} from '@/lib/conversions';
import { motion } from 'framer-motion';

interface ConvGroup {
  labelKey: string;
  units: string[];
  convert: (v: number, from: string, to: string) => number;
}

const groups: ConvGroup[] = [
  { labelKey: 'conv.velocity', units: ['fps', 'mps'], convert: (v, f, t) => convertVelocity(v, f as VelocityUnit, t as VelocityUnit) },
  { labelKey: 'conv.distance', units: ['meters', 'yards', 'feet', 'inches', 'mm', 'cm'], convert: (v, f, t) => convertDistance(v, f as DistanceUnit, t as DistanceUnit) },
  { labelKey: 'conv.weight', units: ['grains', 'grams', 'mg', 'oz'], convert: (v, f, t) => convertWeight(v, f as WeightUnit, t as WeightUnit) },
  { labelKey: 'conv.energy', units: ['joules', 'ftlbs'], convert: (v, f, t) => convertEnergy(v, f as EnergyUnit, t as EnergyUnit) },
  { labelKey: 'conv.pressure', units: ['bar', 'psi', 'hpa', 'atm', 'mmhg'], convert: (v, f, t) => convertPressure(v, f as PressureUnit, t as PressureUnit) },
  { labelKey: 'conv.temperature', units: ['celsius', 'fahrenheit', 'kelvin'], convert: (v, f, t) => convertTemperature(v, f as TemperatureUnit, t as TemperatureUnit) },
  { labelKey: 'conv.angle', units: ['moa', 'mrad', 'degrees'], convert: (v, f, t) => convertAngle(v, f as AngleUnit, t as AngleUnit) },
];

export default function ConversionsPage() {
  const { t } = useI18n();
  const [activeGroup, setActiveGroup] = useState(0);
  const [value, setValue] = useState(0);
  const [fromUnit, setFromUnit] = useState(groups[0].units[0]);
  const [toUnit, setToUnit] = useState(groups[0].units[1]);

  const group = groups[activeGroup];

  const result = useMemo(() => {
    try {
      return group.convert(value, fromUnit, toUnit);
    } catch { return 0; }
  }, [value, fromUnit, toUnit, activeGroup]);

  const handleGroupChange = (idx: number) => {
    setActiveGroup(idx);
    setFromUnit(groups[idx].units[0]);
    setToUnit(groups[idx].units[1]);
    setValue(0);
  };

  const swap = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
  };

  const inputClass = "w-full bg-muted border border-border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ArrowLeftRight className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-heading font-bold">{t('conv.title')}</h1>
        </div>
        <p className="text-xs text-muted-foreground font-mono">{t('conv.subtitle')}</p>
      </div>

      {/* Group tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {groups.map((g, i) => (
          <button
            key={g.labelKey}
            onClick={() => handleGroupChange(i)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              i === activeGroup ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {t(g.labelKey as any)}
          </button>
        ))}
      </div>

      {/* Converter */}
      <div className="surface-elevated p-4 space-y-4">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('conv.from')}</label>
            <select className={inputClass} value={fromUnit} onChange={e => setFromUnit(e.target.value)}>
              {group.units.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <button onClick={swap} className="p-2 rounded-md hover:bg-muted text-primary mb-0.5">
            <ArrowLeftRight className="h-4 w-4" />
          </button>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('conv.to')}</label>
            <select className={inputClass} value={toUnit} onChange={e => setToUnit(e.target.value)}>
              {group.units.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('conv.value')}</label>
            <input type="number" className={inputClass} value={value} onChange={e => setValue(parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('conv.result')}</label>
            <div className="bg-primary/5 border border-primary/20 rounded-md px-3 py-2 text-sm font-mono font-semibold text-primary">
              {result.toFixed(4)}
            </div>
          </div>
        </div>
      </div>

      {/* Quick energy calculator */}
      <div className="surface-elevated p-4">
        <h3 className="font-heading font-semibold text-sm mb-3">⚡ {t('calc.energy')}</h3>
        <QuickEnergy />
      </div>
    </motion.div>
  );
}

function QuickEnergy() {
  const [vel, setVel] = useState(280);
  const [weight, setWeight] = useState(18);
  const e = calcMuzzleEnergy(vel, weight);
  const inputClass = "w-full bg-muted border border-border rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-xs text-muted-foreground">Velocity (m/s)</label>
        <input type="number" className={inputClass} value={vel} onChange={e => setVel(+e.target.value)} />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Weight (gr)</label>
        <input type="number" className={inputClass} value={weight} onChange={e => setWeight(+e.target.value)} />
      </div>
      <div className="bg-primary/5 border border-primary/20 rounded-md px-3 py-2 text-center">
        <div className="text-lg font-mono font-bold text-primary">{e.joules}</div>
        <div className="text-[10px] text-muted-foreground">Joules</div>
      </div>
      <div className="bg-primary/5 border border-primary/20 rounded-md px-3 py-2 text-center">
        <div className="text-lg font-mono font-bold text-primary">{e.ftlbs}</div>
        <div className="text-[10px] text-muted-foreground">ft·lbs</div>
      </div>
    </div>
  );
}
