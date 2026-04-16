/**
 * Unit preferences system for AirBallistik.
 * Defines per-category unit preferences with display labels and conversion helpers.
 * Internal reference units: m/s, joules, bar, meters, mm, grains, celsius, MOA
 */

import {
  convertVelocity, convertDistance, convertWeight, convertEnergy,
  convertPressure, convertTemperature,
  VelocityUnit, DistanceUnit, WeightUnit, EnergyUnit, PressureUnit, TemperatureUnit,
} from './conversions';

// ── Unit category definitions ──

export interface UnitOption {
  value: string;
  labelFr: string;
  labelEn: string;
  symbol: string;
}

export interface UnitCategory {
  key: string;
  labelKeyFr: string;
  labelKeyEn: string;
  options: UnitOption[];
  defaultMetric: string;
  defaultImperial: string;
  /** Internal reference unit for storage */
  reference: string;
}

export const unitCategories: UnitCategory[] = [
  {
    key: 'velocity',
    labelKeyFr: 'Vitesse',
    labelKeyEn: 'Velocity',
    reference: 'mps',
    defaultMetric: 'mps',
    defaultImperial: 'fps',
    options: [
      { value: 'mps', labelFr: 'm/s', labelEn: 'm/s', symbol: 'm/s' },
      { value: 'fps', labelFr: 'fps', labelEn: 'fps', symbol: 'fps' },
    ],
  },
  {
    key: 'energy',
    labelKeyFr: 'Énergie',
    labelKeyEn: 'Energy',
    reference: 'joules',
    defaultMetric: 'joules',
    defaultImperial: 'ftlbs',
    options: [
      { value: 'joules', labelFr: 'Joules', labelEn: 'Joules', symbol: 'J' },
      { value: 'ftlbs', labelFr: 'ft·lbs', labelEn: 'ft·lbs', symbol: 'ft·lbs' },
    ],
  },
  {
    key: 'pressure',
    labelKeyFr: 'Pression',
    labelKeyEn: 'Pressure',
    reference: 'bar',
    defaultMetric: 'bar',
    defaultImperial: 'psi',
    options: [
      { value: 'bar', labelFr: 'bar', labelEn: 'bar', symbol: 'bar' },
      { value: 'psi', labelFr: 'psi', labelEn: 'psi', symbol: 'psi' },
    ],
  },
  {
    key: 'distance',
    labelKeyFr: 'Distance',
    labelKeyEn: 'Distance',
    reference: 'meters',
    defaultMetric: 'meters',
    defaultImperial: 'yards',
    options: [
      { value: 'meters', labelFr: 'Mètres', labelEn: 'Meters', symbol: 'm' },
      { value: 'yards', labelFr: 'Yards', labelEn: 'Yards', symbol: 'yd' },
    ],
  },
  {
    key: 'length',
    labelKeyFr: 'Longueur',
    labelKeyEn: 'Length',
    reference: 'mm',
    defaultMetric: 'mm',
    defaultImperial: 'inches',
    options: [
      { value: 'mm', labelFr: 'mm', labelEn: 'mm', symbol: 'mm' },
      { value: 'cm', labelFr: 'cm', labelEn: 'cm', symbol: 'cm' },
      { value: 'inches', labelFr: 'pouces', labelEn: 'inches', symbol: 'in' },
    ],
  },
  {
    key: 'weight',
    labelKeyFr: 'Poids projectile',
    labelKeyEn: 'Projectile weight',
    reference: 'grains',
    defaultMetric: 'grams',
    defaultImperial: 'grains',
    options: [
      { value: 'grains', labelFr: 'Grains', labelEn: 'Grains', symbol: 'gr' },
      { value: 'grams', labelFr: 'Grammes', labelEn: 'Grams', symbol: 'g' },
    ],
  },
  {
    key: 'temperature',
    labelKeyFr: 'Température',
    labelKeyEn: 'Temperature',
    reference: 'celsius',
    defaultMetric: 'celsius',
    defaultImperial: 'fahrenheit',
    options: [
      { value: 'celsius', labelFr: '°C', labelEn: '°C', symbol: '°C' },
      { value: 'fahrenheit', labelFr: '°F', labelEn: '°F', symbol: '°F' },
    ],
  },
  {
    key: 'correction',
    labelKeyFr: 'Correction optique',
    labelKeyEn: 'Optic correction',
    reference: 'moa',
    defaultMetric: 'mrad',
    defaultImperial: 'moa',
    options: [
      { value: 'moa', labelFr: 'MOA', labelEn: 'MOA', symbol: 'MOA' },
      { value: 'mrad', labelFr: 'MRAD', labelEn: 'MRAD', symbol: 'MRAD' },
    ],
  },
];

// ── Unit preferences type ──

export type UnitPreferences = Record<string, string>;

export function getDefaultUnitPrefs(system: 'metric' | 'imperial'): UnitPreferences {
  const prefs: UnitPreferences = {};
  for (const cat of unitCategories) {
    prefs[cat.key] = system === 'metric' ? cat.defaultMetric : cat.defaultImperial;
  }
  return prefs;
}

// ── Symbol lookup ──

export function getUnitSymbol(categoryKey: string, unitValue: string): string {
  const cat = unitCategories.find(c => c.key === categoryKey);
  if (!cat) return unitValue;
  const opt = cat.options.find(o => o.value === unitValue);
  return opt?.symbol ?? unitValue;
}

// ── Convert from reference unit to display unit ──

type ConvertFn = (value: number, fromRef: string, toDisplay: string) => number;

const converters: Record<string, ConvertFn> = {
  velocity: (v, f, t) => convertVelocity(v, f as VelocityUnit, t as VelocityUnit),
  energy: (v, f, t) => convertEnergy(v, f as EnergyUnit, t as EnergyUnit),
  pressure: (v, f, t) => convertPressure(v, f as PressureUnit, t as PressureUnit),
  distance: (v, f, t) => convertDistance(v, f as DistanceUnit, t as DistanceUnit),
  length: (v, f, t) => convertDistance(v, f as DistanceUnit, t as DistanceUnit),
  weight: (v, f, t) => convertWeight(v, f as WeightUnit, t as WeightUnit),
  temperature: (v, f, t) => convertTemperature(v, f as TemperatureUnit, t as TemperatureUnit),
};

/** Convert a value from reference unit to the user's preferred display unit */
export function toDisplay(categoryKey: string, value: number, prefs: UnitPreferences): number {
  const cat = unitCategories.find(c => c.key === categoryKey);
  if (!cat) return value;
  const displayUnit = prefs[categoryKey] ?? cat.reference;
  if (displayUnit === cat.reference) return value;
  const fn = converters[categoryKey];
  if (!fn) return value;
  return fn(value, cat.reference, displayUnit);
}

/** Convert a value from the user's preferred display unit back to reference */
export function fromDisplay(categoryKey: string, value: number, prefs: UnitPreferences): number {
  const cat = unitCategories.find(c => c.key === categoryKey);
  if (!cat) return value;
  const displayUnit = prefs[categoryKey] ?? cat.reference;
  if (displayUnit === cat.reference) return value;
  const fn = converters[categoryKey];
  if (!fn) return value;
  return fn(value, displayUnit, cat.reference);
}
