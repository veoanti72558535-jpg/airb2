/**
 * Deterministic unit conversion functions.
 * NO AI involved — pure mathematical conversions using exact factors.
 * Each category has a reference unit (SI when possible) and a factor map.
 */

// ── Types ──
export type VelocityUnit =
  | 'mps' | 'fps' | 'kmps' | 'mpmin' | 'fpmin' | 'kmpmin'
  | 'kmh' | 'mph' | 'knot' | 'mach';
export type DistanceUnit =
  | 'um' | 'mm' | 'cm' | 'dm' | 'meters' | 'inches' | 'feet'
  | 'yards' | 'miles' | 'km' | 'nm';
export type AreaUnit =
  | 'mm2' | 'cm2' | 'dm2' | 'm2' | 'in2' | 'ft2' | 'yd2'
  | 'are' | 'hectare' | 'km2' | 'acre' | 'mile2';
export type VolumeUnit =
  | 'ml' | 'cl' | 'dl' | 'liter' | 'mm3' | 'cm3' | 'dm3' | 'm3'
  | 'in3' | 'ft3' | 'yd3' | 'gal_uk' | 'gal_us' | 'bbl' | 'pt_uk' | 'pt_us';
export type WeightUnit =
  | 'mg' | 'grams' | 'kg' | 'tonne' | 'grains' | 'oz' | 'lb' | 'stone';
export type ForceUnit = 'dyn' | 'newton' | 'daN' | 'kN' | 'kgf' | 'lbf' | 'kip';
export type EnergyUnit =
  | 'joules' | 'kJ' | 'cal' | 'kcal' | 'kWh' | 'kgfm'
  | 'inlbf' | 'ftlbs' | 'btu' | 'toe';
export type PowerUnit =
  | 'watt' | 'kW' | 'MW' | 'kcalps' | 'kcalph'
  | 'hp' | 'ps' | 'btuph' | 'tr' | 'bhp' | 'dBm';
export type PressureUnit =
  | 'atm' | 'pa' | 'hpa' | 'kpa' | 'mpa' | 'bar' | 'psi' | 'psf'
  | 'ksi' | 'kgfcm2' | 'kgfm2' | 'mmhg' | 'cmhg' | 'inhg' | 'mmh2o';
export type TemperatureUnit = 'celsius' | 'fahrenheit' | 'kelvin' | 'rankine' | 'reaumur';
export type AngleUnit =
  | 'rad' | 'arcsec' | 'arcmin' | 'degrees' | 'grad'
  | 'percent' | 'circle' | 'mil_nato' | 'mil_ussr'
  | 'moa' | 'mrad' | 'clicks_moa' | 'clicks_mrad';

// ── Generic linear converter ──
function linearConvert<T extends string>(
  value: number,
  from: T,
  to: T,
  factors: Record<T, number>,
): number {
  return (value * factors[from]) / factors[to];
}

// ── Velocity (reference: m/s) ──
const velocityFactors: Record<VelocityUnit, number> = {
  mps: 1,
  fps: 0.3048,
  kmps: 1000,
  mpmin: 1 / 60,
  fpmin: 0.3048 / 60,
  kmpmin: 1000 / 60,
  kmh: 1 / 3.6,
  mph: 0.44704,
  knot: 0.514444,
  mach: 340.29,
};
export function convertVelocity(v: number, f: VelocityUnit, t: VelocityUnit): number {
  return linearConvert(v, f, t, velocityFactors);
}

// ── Distance / Length (reference: meters) ──
const distanceFactors: Record<DistanceUnit, number> = {
  um: 1e-6,
  mm: 0.001,
  cm: 0.01,
  dm: 0.1,
  meters: 1,
  inches: 0.0254,
  feet: 0.3048,
  yards: 0.9144,
  miles: 1609.344,
  km: 1000,
  nm: 1852,
};
export function convertDistance(v: number, f: DistanceUnit, t: DistanceUnit): number {
  return linearConvert(v, f, t, distanceFactors);
}

// ── Area (reference: m²) ──
const areaFactors: Record<AreaUnit, number> = {
  mm2: 1e-6,
  cm2: 1e-4,
  dm2: 0.01,
  m2: 1,
  in2: 0.00064516,
  ft2: 0.09290304,
  yd2: 0.83612736,
  are: 100,
  hectare: 10000,
  km2: 1e6,
  acre: 4046.8564224,
  mile2: 2589988.110336,
};
export function convertArea(v: number, f: AreaUnit, t: AreaUnit): number {
  return linearConvert(v, f, t, areaFactors);
}

// ── Volume (reference: liter) ──
const volumeFactors: Record<VolumeUnit, number> = {
  ml: 0.001,
  cl: 0.01,
  dl: 0.1,
  liter: 1,
  mm3: 1e-6,
  cm3: 0.001,
  dm3: 1,
  m3: 1000,
  in3: 0.016387064,
  ft3: 28.316846592,
  yd3: 764.554857984,
  gal_uk: 4.54609,
  gal_us: 3.785411784,
  bbl: 158.987294928,
  pt_uk: 0.56826125,
  pt_us: 0.473176473,
};
export function convertVolume(v: number, f: VolumeUnit, t: VolumeUnit): number {
  return linearConvert(v, f, t, volumeFactors);
}

// ── Weight / Mass (reference: grams) ──
const weightFactors: Record<WeightUnit, number> = {
  mg: 0.001,
  grams: 1,
  kg: 1000,
  tonne: 1e6,
  grains: 0.06479891,
  oz: 28.349523125,
  lb: 453.59237,
  stone: 6350.29318,
};
export function convertWeight(v: number, f: WeightUnit, t: WeightUnit): number {
  return linearConvert(v, f, t, weightFactors);
}

// ── Force (reference: Newton) ──
const forceFactors: Record<ForceUnit, number> = {
  dyn: 1e-5,
  newton: 1,
  daN: 10,
  kN: 1000,
  kgf: 9.80665,
  lbf: 4.4482216152605,
  kip: 4448.2216152605,
};
export function convertForce(v: number, f: ForceUnit, t: ForceUnit): number {
  return linearConvert(v, f, t, forceFactors);
}

// ── Energy (reference: Joule) ──
const energyFactors: Record<EnergyUnit, number> = {
  joules: 1,
  kJ: 1000,
  cal: 4.184,
  kcal: 4184,
  kWh: 3.6e6,
  kgfm: 9.80665,
  inlbf: 0.1129848290276167,
  ftlbs: 1.3558179483314004,
  btu: 1055.05585262,
  toe: 4.1868e10,
};
export function convertEnergy(v: number, f: EnergyUnit, t: EnergyUnit): number {
  return linearConvert(v, f, t, energyFactors);
}

// ── Power (reference: Watt) ──
const powerFactors: Record<PowerUnit, number> = {
  watt: 1,
  kW: 1000,
  MW: 1e6,
  kcalps: 4184,
  kcalph: 4184 / 3600,
  hp: 745.69987158227,
  ps: 735.49875,
  btuph: 0.29307107,
  tr: 3516.8528421,
  bhp: 745.69987158227,
  dBm: 1, // special case below
};
export function convertPower(v: number, f: PowerUnit, t: PowerUnit): number {
  // dBm ↔ Watt: P(W) = 10^((dBm-30)/10)
  const toWatt = f === 'dBm' ? Math.pow(10, (v - 30) / 10) : v * powerFactors[f];
  if (t === 'dBm') return 10 * Math.log10(toWatt) + 30;
  return toWatt / powerFactors[t];
}

// ── Pressure (reference: Pascal) ──
const pressureFactors: Record<PressureUnit, number> = {
  atm: 101325,
  pa: 1,
  hpa: 100,
  kpa: 1000,
  mpa: 1e6,
  bar: 100000,
  psi: 6894.757293168,
  psf: 47.88025898,
  ksi: 6894757.293168,
  kgfcm2: 98066.5,
  kgfm2: 9.80665,
  mmhg: 133.322387415,
  cmhg: 1333.22387415,
  inhg: 3386.389,
  mmh2o: 9.80665,
};
export function convertPressure(v: number, f: PressureUnit, t: PressureUnit): number {
  return linearConvert(v, f, t, pressureFactors);
}

// ── Temperature (non-linear) ──
export function convertTemperature(v: number, f: TemperatureUnit, t: TemperatureUnit): number {
  // To Celsius
  let c: number;
  switch (f) {
    case 'celsius': c = v; break;
    case 'fahrenheit': c = (v - 32) * 5 / 9; break;
    case 'kelvin': c = v - 273.15; break;
    case 'rankine': c = (v - 491.67) * 5 / 9; break;
    case 'reaumur': c = v * 1.25; break;
  }
  switch (t) {
    case 'celsius': return c;
    case 'fahrenheit': return c * 9 / 5 + 32;
    case 'kelvin': return c + 273.15;
    case 'rankine': return (c + 273.15) * 9 / 5;
    case 'reaumur': return c * 0.8;
  }
}

// ── Angle (reference: radian) ──
// Note: clicks_moa & clicks_mrad use a default click value (0.25 MOA / 0.1 MRAD).
const MOA_PER_RAD = 180 * 60 / Math.PI;
const MRAD_PER_RAD = 1000;

export function convertAngle(
  v: number, f: AngleUnit, t: AngleUnit, clickValue?: number,
): number {
  // To radians
  let rad: number;
  switch (f) {
    case 'rad': rad = v; break;
    case 'arcsec': rad = v * Math.PI / (180 * 3600); break;
    case 'arcmin': rad = v * Math.PI / (180 * 60); break;
    case 'degrees': rad = v * Math.PI / 180; break;
    case 'grad': rad = v * Math.PI / 200; break;
    case 'percent': rad = Math.atan(v / 100); break;
    case 'circle': rad = v * 2 * Math.PI; break;
    case 'mil_nato': rad = v * 2 * Math.PI / 6400; break;
    case 'mil_ussr': rad = v * 2 * Math.PI / 6000; break;
    case 'moa': rad = v / MOA_PER_RAD; break;
    case 'mrad': rad = v / MRAD_PER_RAD; break;
    case 'clicks_moa': rad = (v * (clickValue ?? 0.25)) / MOA_PER_RAD; break;
    case 'clicks_mrad': rad = (v * (clickValue ?? 0.1)) / MRAD_PER_RAD; break;
  }
  switch (t) {
    case 'rad': return rad;
    case 'arcsec': return rad * 180 * 3600 / Math.PI;
    case 'arcmin': return rad * 180 * 60 / Math.PI;
    case 'degrees': return rad * 180 / Math.PI;
    case 'grad': return rad * 200 / Math.PI;
    case 'percent': return Math.tan(rad) * 100;
    case 'circle': return rad / (2 * Math.PI);
    case 'mil_nato': return rad * 6400 / (2 * Math.PI);
    case 'mil_ussr': return rad * 6000 / (2 * Math.PI);
    case 'moa': return rad * MOA_PER_RAD;
    case 'mrad': return rad * MRAD_PER_RAD;
    case 'clicks_moa': return (rad * MOA_PER_RAD) / (clickValue ?? 0.25);
    case 'clicks_mrad': return (rad * MRAD_PER_RAD) / (clickValue ?? 0.1);
  }
}

/** Calculate muzzle energy from velocity and weight. */
export function calcMuzzleEnergy(velocityMps: number, weightGrains: number): { joules: number; ftlbs: number } {
  const massKg = weightGrains * 0.00006479891;
  const joules = 0.5 * massKg * velocityMps * velocityMps;
  return {
    joules: Math.round(joules * 100) / 100,
    ftlbs: Math.round(joules / 1.3558179483314004 * 100) / 100,
  };
}
