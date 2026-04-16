/**
 * Unit preferences system for AirBallistik.
 * Defines per-category unit preferences with display labels and conversion helpers.
 * Internal reference units: m/s, joules, bar, meters, mm, grains, celsius, MOA
 */

import {
  convertVelocity, convertDistance, convertWeight, convertEnergy,
  convertPressure, convertTemperature, convertArea, convertVolume,
  convertForce, convertPower, convertAngle,
  VelocityUnit, DistanceUnit, WeightUnit, EnergyUnit, PressureUnit,
  TemperatureUnit, AreaUnit, VolumeUnit, ForceUnit, PowerUnit, AngleUnit,
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
      { value: 'kmps', labelFr: 'km/s', labelEn: 'km/s', symbol: 'km/s' },
      { value: 'mpmin', labelFr: 'm/min', labelEn: 'm/min', symbol: 'm/min' },
      { value: 'fpmin', labelFr: 'ft/min', labelEn: 'ft/min', symbol: 'ft/min' },
      { value: 'kmpmin', labelFr: 'km/min', labelEn: 'km/min', symbol: 'km/min' },
      { value: 'kmh', labelFr: 'km/h', labelEn: 'km/h', symbol: 'km/h' },
      { value: 'mph', labelFr: 'mph', labelEn: 'mph', symbol: 'mph' },
      { value: 'knot', labelFr: 'nœud', labelEn: 'knot', symbol: 'kn' },
      { value: 'mach', labelFr: 'Mach', labelEn: 'Mach', symbol: 'Ma' },
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
      { value: 'kJ', labelFr: 'kJ', labelEn: 'kJ', symbol: 'kJ' },
      { value: 'cal', labelFr: 'cal', labelEn: 'cal', symbol: 'cal' },
      { value: 'kcal', labelFr: 'kcal', labelEn: 'kcal', symbol: 'kcal' },
      { value: 'kWh', labelFr: 'kW·h', labelEn: 'kW·h', symbol: 'kW·h' },
      { value: 'kgfm', labelFr: 'kgf·m', labelEn: 'kgf·m', symbol: 'kgf·m' },
      { value: 'inlbf', labelFr: 'in·lbf', labelEn: 'in·lbf', symbol: 'in·lbf' },
      { value: 'ftlbs', labelFr: 'ft·lbf', labelEn: 'ft·lbf', symbol: 'ft·lbf' },
      { value: 'btu', labelFr: 'BTU', labelEn: 'BTU', symbol: 'BTU' },
      { value: 'toe', labelFr: 'tep', labelEn: 'toe', symbol: 'toe' },
    ],
  },
  {
    key: 'power',
    labelKeyFr: 'Puissance',
    labelKeyEn: 'Power',
    reference: 'watt',
    defaultMetric: 'watt',
    defaultImperial: 'hp',
    options: [
      { value: 'watt', labelFr: 'W', labelEn: 'W', symbol: 'W' },
      { value: 'kW', labelFr: 'kW', labelEn: 'kW', symbol: 'kW' },
      { value: 'MW', labelFr: 'MW', labelEn: 'MW', symbol: 'MW' },
      { value: 'kcalps', labelFr: 'kcal/s', labelEn: 'kcal/s', symbol: 'kcal/s' },
      { value: 'kcalph', labelFr: 'kcal/h', labelEn: 'kcal/h', symbol: 'kcal/h' },
      { value: 'hp', labelFr: 'HP', labelEn: 'HP', symbol: 'HP' },
      { value: 'ps', labelFr: 'PS', labelEn: 'PS', symbol: 'PS' },
      { value: 'btuph', labelFr: 'BTU/h', labelEn: 'BTU/h', symbol: 'BTU/h' },
      { value: 'tr', labelFr: 'TR', labelEn: 'TR', symbol: 'TR' },
      { value: 'bhp', labelFr: 'BHP', labelEn: 'BHP', symbol: 'BHP' },
      { value: 'dBm', labelFr: 'dBm', labelEn: 'dBm', symbol: 'dBm' },
    ],
  },
  {
    key: 'force',
    labelKeyFr: 'Force',
    labelKeyEn: 'Force',
    reference: 'newton',
    defaultMetric: 'newton',
    defaultImperial: 'lbf',
    options: [
      { value: 'dyn', labelFr: 'dyn', labelEn: 'dyn', symbol: 'dyn' },
      { value: 'newton', labelFr: 'N', labelEn: 'N', symbol: 'N' },
      { value: 'daN', labelFr: 'daN', labelEn: 'daN', symbol: 'daN' },
      { value: 'kN', labelFr: 'kN', labelEn: 'kN', symbol: 'kN' },
      { value: 'kgf', labelFr: 'kgf', labelEn: 'kgf', symbol: 'kgf' },
      { value: 'lbf', labelFr: 'lbf', labelEn: 'lbf', symbol: 'lbf' },
      { value: 'kip', labelFr: 'kip', labelEn: 'kip', symbol: 'kip' },
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
      { value: 'atm', labelFr: 'atm', labelEn: 'atm', symbol: 'atm' },
      { value: 'pa', labelFr: 'Pa', labelEn: 'Pa', symbol: 'Pa' },
      { value: 'hpa', labelFr: 'mbar', labelEn: 'mbar', symbol: 'hPa' },
      { value: 'kpa', labelFr: 'kPa', labelEn: 'kPa', symbol: 'kPa' },
      { value: 'mpa', labelFr: 'MPa', labelEn: 'MPa', symbol: 'MPa' },
      { value: 'bar', labelFr: 'bar', labelEn: 'bar', symbol: 'bar' },
      { value: 'psi', labelFr: 'psi', labelEn: 'psi', symbol: 'psi' },
      { value: 'psf', labelFr: 'psf', labelEn: 'psf', symbol: 'psf' },
      { value: 'ksi', labelFr: 'ksi', labelEn: 'ksi', symbol: 'ksi' },
      { value: 'kgfcm2', labelFr: 'kgf/cm²', labelEn: 'kgf/cm²', symbol: 'kgf/cm²' },
      { value: 'kgfm2', labelFr: 'kgf/m²', labelEn: 'kgf/m²', symbol: 'kgf/m²' },
      { value: 'mmhg', labelFr: 'Torr', labelEn: 'Torr', symbol: 'mmHg' },
      { value: 'cmhg', labelFr: 'cmHg', labelEn: 'cmHg', symbol: 'cmHg' },
      { value: 'inhg', labelFr: 'inHg', labelEn: 'inHg', symbol: 'inHg' },
      { value: 'mmh2o', labelFr: 'mmH₂O', labelEn: 'mmH₂O', symbol: 'mmH₂O' },
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
      { value: 'um', labelFr: 'µm', labelEn: 'µm', symbol: 'µm' },
      { value: 'mm', labelFr: 'mm', labelEn: 'mm', symbol: 'mm' },
      { value: 'cm', labelFr: 'cm', labelEn: 'cm', symbol: 'cm' },
      { value: 'dm', labelFr: 'dm', labelEn: 'dm', symbol: 'dm' },
      { value: 'meters', labelFr: 'm', labelEn: 'm', symbol: 'm' },
      { value: 'inches', labelFr: 'pouces', labelEn: 'inches', symbol: 'in' },
      { value: 'feet', labelFr: 'pieds', labelEn: 'feet', symbol: 'ft' },
      { value: 'yards', labelFr: 'yards', labelEn: 'yards', symbol: 'yd' },
      { value: 'miles', labelFr: 'miles', labelEn: 'miles', symbol: 'mi' },
      { value: 'km', labelFr: 'km', labelEn: 'km', symbol: 'km' },
      { value: 'nm', labelFr: 'mille marin', labelEn: 'nautical mile', symbol: 'NM' },
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
      { value: 'um', labelFr: 'µm', labelEn: 'µm', symbol: 'µm' },
      { value: 'mm', labelFr: 'mm', labelEn: 'mm', symbol: 'mm' },
      { value: 'cm', labelFr: 'cm', labelEn: 'cm', symbol: 'cm' },
      { value: 'dm', labelFr: 'dm', labelEn: 'dm', symbol: 'dm' },
      { value: 'meters', labelFr: 'm', labelEn: 'm', symbol: 'm' },
      { value: 'inches', labelFr: 'pouces', labelEn: 'inches', symbol: 'in' },
      { value: 'feet', labelFr: 'pieds', labelEn: 'feet', symbol: 'ft' },
      { value: 'yards', labelFr: 'yards', labelEn: 'yards', symbol: 'yd' },
      { value: 'km', labelFr: 'km', labelEn: 'km', symbol: 'km' },
    ],
  },
  {
    key: 'area',
    labelKeyFr: 'Surface',
    labelKeyEn: 'Area',
    reference: 'm2',
    defaultMetric: 'm2',
    defaultImperial: 'ft2',
    options: [
      { value: 'mm2', labelFr: 'mm²', labelEn: 'mm²', symbol: 'mm²' },
      { value: 'cm2', labelFr: 'cm²', labelEn: 'cm²', symbol: 'cm²' },
      { value: 'dm2', labelFr: 'dm²', labelEn: 'dm²', symbol: 'dm²' },
      { value: 'm2', labelFr: 'm²', labelEn: 'm²', symbol: 'm²' },
      { value: 'in2', labelFr: 'in²', labelEn: 'in²', symbol: 'in²' },
      { value: 'ft2', labelFr: 'ft²', labelEn: 'ft²', symbol: 'ft²' },
      { value: 'yd2', labelFr: 'yd²', labelEn: 'yd²', symbol: 'yd²' },
      { value: 'are', labelFr: 'are', labelEn: 'are', symbol: 'a' },
      { value: 'hectare', labelFr: 'hectare', labelEn: 'hectare', symbol: 'ha' },
      { value: 'km2', labelFr: 'km²', labelEn: 'km²', symbol: 'km²' },
      { value: 'acre', labelFr: 'acre', labelEn: 'acre', symbol: 'acre' },
      { value: 'mile2', labelFr: 'mile²', labelEn: 'mile²', symbol: 'mi²' },
    ],
  },
  {
    key: 'volume',
    labelKeyFr: 'Volume',
    labelKeyEn: 'Volume',
    reference: 'liter',
    defaultMetric: 'liter',
    defaultImperial: 'gal_us',
    options: [
      { value: 'ml', labelFr: 'ml (cc)', labelEn: 'ml (cc)', symbol: 'ml' },
      { value: 'cl', labelFr: 'cl', labelEn: 'cl', symbol: 'cl' },
      { value: 'dl', labelFr: 'dl', labelEn: 'dl', symbol: 'dl' },
      { value: 'liter', labelFr: 'L', labelEn: 'L', symbol: 'L' },
      { value: 'mm3', labelFr: 'mm³', labelEn: 'mm³', symbol: 'mm³' },
      { value: 'cm3', labelFr: 'cm³', labelEn: 'cm³', symbol: 'cm³' },
      { value: 'dm3', labelFr: 'dm³', labelEn: 'dm³', symbol: 'dm³' },
      { value: 'm3', labelFr: 'm³', labelEn: 'm³', symbol: 'm³' },
      { value: 'in3', labelFr: 'in³', labelEn: 'in³', symbol: 'in³' },
      { value: 'ft3', labelFr: 'ft³', labelEn: 'ft³', symbol: 'ft³' },
      { value: 'yd3', labelFr: 'yd³', labelEn: 'yd³', symbol: 'yd³' },
      { value: 'gal_uk', labelFr: 'gal (UK)', labelEn: 'gal (UK)', symbol: 'gal UK' },
      { value: 'gal_us', labelFr: 'gal (US)', labelEn: 'gal (US)', symbol: 'gal US' },
      { value: 'bbl', labelFr: 'baril', labelEn: 'bbl', symbol: 'bbl' },
      { value: 'pt_uk', labelFr: 'pt (UK)', labelEn: 'pt (UK)', symbol: 'pt UK' },
      { value: 'pt_us', labelFr: 'pt (US)', labelEn: 'pt (US)', symbol: 'pt US' },
    ],
  },
  {
    key: 'weight',
    labelKeyFr: 'Poids / Masse',
    labelKeyEn: 'Weight / Mass',
    reference: 'grains',
    defaultMetric: 'grams',
    defaultImperial: 'grains',
    options: [
      { value: 'mg', labelFr: 'mg', labelEn: 'mg', symbol: 'mg' },
      { value: 'grams', labelFr: 'g', labelEn: 'g', symbol: 'g' },
      { value: 'kg', labelFr: 'kg', labelEn: 'kg', symbol: 'kg' },
      { value: 'tonne', labelFr: 'tonne', labelEn: 'tonne', symbol: 't' },
      { value: 'grains', labelFr: 'grains', labelEn: 'grains', symbol: 'gr' },
      { value: 'oz', labelFr: 'once', labelEn: 'oz', symbol: 'oz' },
      { value: 'lb', labelFr: 'livre', labelEn: 'lb', symbol: 'lb' },
      { value: 'stone', labelFr: 'stone', labelEn: 'stone', symbol: 'st' },
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
      { value: 'kelvin', labelFr: 'K', labelEn: 'K', symbol: 'K' },
      { value: 'rankine', labelFr: '°R', labelEn: '°R', symbol: '°R' },
      { value: 'reaumur', labelFr: '°Ré', labelEn: '°Ré', symbol: '°Ré' },
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
      { value: 'degrees', labelFr: 'degrés', labelEn: 'degrees', symbol: '°' },
      { value: 'rad', labelFr: 'radian', labelEn: 'radian', symbol: 'rad' },
      { value: 'grad', labelFr: 'grade', labelEn: 'grad', symbol: 'gon' },
      { value: 'mil_nato', labelFr: 'mil OTAN (6400)', labelEn: 'NATO mil (6400)', symbol: 'mil' },
      { value: 'mil_ussr', labelFr: 'mil URSS (6000)', labelEn: 'USSR mil (6000)', symbol: 'mil' },
      { value: 'arcmin', labelFr: 'minute (\')', labelEn: 'arcmin (\')', symbol: '\'' },
      { value: 'arcsec', labelFr: 'seconde (")', labelEn: 'arcsec (")', symbol: '"' },
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
