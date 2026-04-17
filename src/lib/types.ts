export type DragModel = 'G1' | 'G7' | 'GA' | 'GS';
export type ProjectileType = 'pellet' | 'slug' | 'other';
export type OpticFocalPlane = 'FFP' | 'SFP';
/** Twist rate as "1:N" inches per turn, stored as N (e.g. 16, 18, 24). */
export type TwistRate = number;

export interface Airgun {
  id: string;
  brand: string;
  model: string;
  caliber: string;
  barrelLength?: number; // mm
  twistRate?: TwistRate; // 1:N inches
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

export interface DragTablePoint {
  /** Mach number (≥0). */
  mach: number;
  /** Drag coefficient at this Mach. */
  cd: number;
}

export interface Projectile {
  id: string;
  brand: string;
  model: string;
  weight: number; // grains
  bc: number;
  bcModel?: DragModel; // drag model BC is referenced against (default G1)
  projectileType?: ProjectileType;
  shape?: string;
  caliber: string;
  length?: number; // mm
  diameter?: number; // mm
  material?: string;
  notes?: string;
  dataSource?: string;
  /**
   * Optional custom Cd vs Mach table. When present, the engine bypasses the
   * standard drag model and interpolates linearly between points.
   * Source: Doppler radar export, JBM table, or manual measurement.
   */
  customDragTable?: DragTablePoint[];
  createdAt: string;
  updatedAt: string;
}

export interface Optic {
  id: string;
  name: string;
  type?: string;
  focalPlane?: OpticFocalPlane; // FFP or SFP
  clickUnit: 'MOA' | 'MRAD' | 'mil';
  clickValue: number;
  mountHeight?: number; // mm
  tubeDiameter?: 25.4 | 30 | 34; // mm
  magCalibration?: number; // x (zoom at which SFP reticle is calibrated)
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type WeatherSource = 'auto' | 'manual' | 'mixed';
export type WeatherFieldKey =
  | 'temperature'
  | 'humidity'
  | 'pressure'
  | 'altitude'
  | 'windSpeed'
  | 'windAngle';

export interface WeatherSnapshot {
  temperature: number; // °C
  humidity: number; // %
  pressure: number; // hPa
  altitude: number; // m
  windSpeed: number; // m/s
  windAngle: number; // degrees (0 = headwind, 90 = right)
  /** Origin of the snapshot as a whole. */
  source: WeatherSource;
  /** ISO timestamp of last data refresh (auto fetch or manual edit). */
  timestamp: string;
  /** Human-readable location label when known (auto fetch only). */
  location?: string;
  /** Provider id when fetched (e.g. 'open-meteo'). */
  provider?: string;
  /** Latitude used for the fetch. */
  latitude?: number;
  /** Longitude used for the fetch. */
  longitude?: number;
  /** Names of fields the user manually overrode after an auto fetch. */
  manualOverrides?: WeatherFieldKey[];
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
  /** Drag model the BC is referenced against. Defaults to G1. */
  dragModel?: DragModel;
  /** Optic focal plane — affects how reticle holdover is rendered. */
  focalPlane?: OpticFocalPlane;
  /** Magnification used while shooting (SFP only). */
  currentMag?: number;
  /** Magnification at which the SFP reticle is calibrated. */
  magCalibration?: number;
  /** Twist rate 1:N inches — used for spin drift estimation. */
  twistRate?: TwistRate;
  /** Projectile length in mm — used for spin drift estimation. */
  projectileLength?: number;
  /** Projectile diameter in mm — used for spin drift estimation. */
  projectileDiameter?: number;
  /** When set, used as the atmosphere during the zeroing pass instead of `weather`. */
  zeroWeather?: WeatherSnapshot;
}

export interface BallisticResult {
  range: number; // m
  drop: number; // mm
  /** Holdover in MOA, true angular (FFP-correct). */
  holdover: number;
  /** Holdover in MRAD, true angular (FFP-correct). */
  holdoverMRAD: number;
  /** Apparent reticle holdover in MOA when SFP at currentMag (= angular × magCal/currentMag). */
  reticleHoldoverMOA?: number;
  /** Apparent reticle holdover in MRAD when SFP at currentMag. */
  reticleHoldoverMRAD?: number;
  /** Apparent reticle wind drift in MOA when SFP at currentMag. */
  reticleWindMOA?: number;
  /** Apparent reticle wind drift in MRAD when SFP at currentMag. */
  reticleWindMRAD?: number;
  velocity: number; // m/s
  energy: number; // J
  tof: number; // s
  windDrift: number; // mm
  windDriftMOA: number;
  windDriftMRAD: number;
  /** Estimated spin drift in mm (right-handed twist → positive = right). */
  spinDrift?: number;
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
  unitPreferences?: Record<string, string>;
  featureFlags: {
    ai: boolean;
    weather: boolean;
  };
  /** When true, the calculator may suggest auto-fill from a weather provider. */
  weatherAutoSuggest?: boolean;
}
