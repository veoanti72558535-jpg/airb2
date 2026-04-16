/**
 * Deterministic unit conversion functions for PCP airgun use.
 * NO AI involved — pure mathematical conversions.
 */

export type VelocityUnit = 'fps' | 'mps';
export type DistanceUnit = 'yards' | 'meters' | 'feet' | 'inches' | 'mm' | 'cm';
export type WeightUnit = 'grains' | 'grams' | 'mg' | 'oz';
export type EnergyUnit = 'ftlbs' | 'joules';
export type PressureUnit = 'bar' | 'psi' | 'hpa' | 'atm' | 'mmhg';
export type TemperatureUnit = 'celsius' | 'fahrenheit' | 'kelvin';
export type AngleUnit = 'moa' | 'mrad' | 'degrees' | 'clicks_moa' | 'clicks_mrad';

// Velocity
const velocityToMps: Record<VelocityUnit, number> = {
  fps: 0.3048,
  mps: 1,
};

export function convertVelocity(value: number, from: VelocityUnit, to: VelocityUnit): number {
  const mps = value * velocityToMps[from];
  return mps / velocityToMps[to];
}

// Distance
const distanceToMeters: Record<DistanceUnit, number> = {
  yards: 0.9144,
  meters: 1,
  feet: 0.3048,
  inches: 0.0254,
  mm: 0.001,
  cm: 0.01,
};

export function convertDistance(value: number, from: DistanceUnit, to: DistanceUnit): number {
  const meters = value * distanceToMeters[from];
  return meters / distanceToMeters[to];
}

// Weight
const weightToGrams: Record<WeightUnit, number> = {
  grains: 0.06479891,
  grams: 1,
  mg: 0.001,
  oz: 28.349523125,
};

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  const grams = value * weightToGrams[from];
  return grams / weightToGrams[to];
}

// Energy
const energyToJoules: Record<EnergyUnit, number> = {
  ftlbs: 1.3558179483,
  joules: 1,
};

export function convertEnergy(value: number, from: EnergyUnit, to: EnergyUnit): number {
  const joules = value * energyToJoules[from];
  return joules / energyToJoules[to];
}

// Pressure
const pressureToHpa: Record<PressureUnit, number> = {
  bar: 1000,
  psi: 68.94757,
  hpa: 1,
  atm: 1013.25,
  mmhg: 1.33322,
};

export function convertPressure(value: number, from: PressureUnit, to: PressureUnit): number {
  const hpa = value * pressureToHpa[from];
  return hpa / pressureToHpa[to];
}

// Temperature
export function convertTemperature(value: number, from: TemperatureUnit, to: TemperatureUnit): number {
  // Convert to Celsius first
  let celsius: number;
  switch (from) {
    case 'celsius': celsius = value; break;
    case 'fahrenheit': celsius = (value - 32) * 5 / 9; break;
    case 'kelvin': celsius = value - 273.15; break;
  }
  // Convert from Celsius to target
  switch (to) {
    case 'celsius': return celsius;
    case 'fahrenheit': return celsius * 9 / 5 + 32;
    case 'kelvin': return celsius + 273.15;
  }
}

// Angle
export function convertAngle(value: number, from: AngleUnit, to: AngleUnit, clickValue?: number): number {
  // Convert to MOA first
  let moa: number;
  switch (from) {
    case 'moa': moa = value; break;
    case 'mrad': moa = value * 3.4377; break;
    case 'degrees': moa = value * 60; break;
    case 'clicks_moa': moa = value * (clickValue ?? 0.25); break;
    case 'clicks_mrad': moa = value * (clickValue ?? 0.1) * 3.4377; break;
  }
  switch (to) {
    case 'moa': return moa;
    case 'mrad': return moa / 3.4377;
    case 'degrees': return moa / 60;
    case 'clicks_moa': return moa / (clickValue ?? 0.25);
    case 'clicks_mrad': return moa / 3.4377 / (clickValue ?? 0.1);
  }
}

/**
 * Calculate muzzle energy from velocity and weight.
 */
export function calcMuzzleEnergy(velocityMps: number, weightGrains: number): { joules: number; ftlbs: number } {
  const massKg = weightGrains * 0.00006479891;
  const joules = 0.5 * massKg * velocityMps * velocityMps;
  return {
    joules: Math.round(joules * 100) / 100,
    ftlbs: Math.round(joules / 1.3558179483 * 100) / 100,
  };
}
