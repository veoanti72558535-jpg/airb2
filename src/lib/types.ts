export interface Airgun {
  id: string;
  brand: string;
  model: string;
  caliber: string;
  barrelLength?: number; // mm
  regPressure?: number; // bar
  fillPressure?: number; // bar
  powerSetting?: string;
  defaultSightHeight?: number; // mm
  defaultZeroRange?: number; // m
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tune {
  id: string;
  airgunId: string;
  name: string;
  nominalVelocity?: number; // m/s
  settings?: string;
  notes?: string;
  usage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Projectile {
  id: string;
  brand: string;
  model: string;
  weight: number; // grains
  bc: number;
  shape?: string;
  caliber: string;
  length?: number; // mm
  diameter?: number; // mm
  material?: string;
  notes?: string;
  dataSource?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Optic {
  id: string;
  name: string;
  type?: string;
  clickUnit: 'MOA' | 'MRAD' | 'mil';
  clickValue: number;
  mountHeight?: number; // mm
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeatherSnapshot {
  temperature: number; // °C
  humidity: number; // %
  pressure: number; // hPa
  altitude: number; // m
  windSpeed: number; // m/s
  windAngle: number; // degrees (0 = headwind, 90 = right)
  source: 'auto' | 'manual';
  timestamp: string;
  location?: string;
}

export interface BallisticInput {
  muzzleVelocity: number; // m/s
  bc: number;
  projectileWeight: number; // grains
  sightHeight: number; // mm
  zeroRange: number; // m
  maxRange: number; // m
  rangeStep: number; // m
  weather: WeatherSnapshot;
  clickValue?: number; // MOA or MRAD per click
  clickUnit?: 'MOA' | 'MRAD';
}

export interface BallisticResult {
  range: number; // m
  drop: number; // mm
  holdover: number; // MOA
  holdoverMRAD: number; // MRAD
  velocity: number; // m/s
  energy: number; // J
  tof: number; // s
  windDrift: number; // mm
  windDriftMOA: number;
  windDriftMRAD: number;
  clicksElevation?: number;
  clicksWindage?: number;
}

export interface Session {
  id: string;
  name: string;
  airgunId?: string;
  tuneId?: string;
  projectileId?: string;
  opticId?: string;
  input: BallisticInput;
  results: BallisticResult[];
  notes?: string;
  tags: string[];
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  unitSystem: 'metric' | 'imperial';
  advancedMode: boolean;
  featureFlags: {
    ai: boolean;
    weather: boolean;
  };
}
