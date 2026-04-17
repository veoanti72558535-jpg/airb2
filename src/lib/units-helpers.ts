/**
 * Tiny helpers around the unit-conversion system used by the calculator.
 * Keeps `units.ts` focused on category metadata and lets components import
 * convert helpers without pulling the whole conversions module.
 */

import { unitCategories, getDefaultUnitPrefs, UnitPreferences } from './units';
import {
  convertVelocity, convertDistance, convertWeight, convertEnergy,
  convertPressure, convertTemperature, convertArea, convertVolume,
  convertForce, convertPower, convertAngle,
  VelocityUnit, DistanceUnit, WeightUnit, EnergyUnit, PressureUnit,
  TemperatureUnit, AreaUnit, VolumeUnit, ForceUnit, PowerUnit, AngleUnit,
} from './conversions';

type ConvertFn = (value: number, from: string, to: string) => number;

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

/** Convert a value between any two units of the same category. */
export function convertUnit(category: string, value: number, from: string, to: string): number {
  if (from === to) return value;
  const fn = converters[category];
  if (!fn) return value;
  return fn(value, from, to);
}

/** Convert a value from the user's current preferred unit to the category reference. */
export function toReference(category: string, value: number, prefs: UnitPreferences): number {
  const cat = unitCategories.find(c => c.key === category);
  if (!cat) return value;
  const display = prefs[category] ?? cat.reference;
  return convertUnit(category, value, display, cat.reference);
}

/** Convert a value from the category reference to the user's current preferred unit. */
export function fromReference(category: string, value: number, prefs: UnitPreferences): number {
  const cat = unitCategories.find(c => c.key === category);
  if (!cat) return value;
  const display = prefs[category] ?? cat.reference;
  return convertUnit(category, value, cat.reference, display);
}

/** Reasonable, mobile-friendly subset of units to expose in the calculator UI. */
export const CALC_UNIT_OPTIONS: Record<string, string[]> = {
  velocity: ['mps', 'fps', 'kmh', 'mph'],
  distance: ['meters', 'yards', 'feet'],
  length: ['mm', 'cm', 'inches'],
  weight: ['grains', 'grams'],
  temperature: ['celsius', 'fahrenheit', 'kelvin'],
  pressure: ['hpa', 'bar', 'psi', 'inhg'],
  energy: ['joules', 'ftlbs'],
  correction: ['mrad', 'moa'],
};

export { getDefaultUnitPrefs };
