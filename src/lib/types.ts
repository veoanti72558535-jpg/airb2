/**
 * Drag law families.
 *
 * V1 UI exposes only G1/G7/GA/GS (cf. `LEGACY_PROFILE.dragLawsAvailable`).
 * P2 widens the type to include the four MERO slug/round-ball laws
 * (RA4, GA2, SLG0, SLG1) so the engine can resolve their Cd tables, but
 * the UI surface is intentionally unchanged — these four are not picked
 * by any selector and remain engine-only until validated.
 */
export type DragModel = 'G1' | 'G7' | 'GA' | 'GS' | 'RA4' | 'GA2' | 'SLG0' | 'SLG1';
/**
 * Catégorie projectile. Étendu pour accepter la taxonomie bullets4 :
 * `bb` (billes acier) et `dart` (fléchettes), en plus de `pellet`/`slug`/`other`.
 * Rétrocompatible : les valeurs existantes restent valides.
 */
export type ProjectileType = 'pellet' | 'slug' | 'bb' | 'dart' | 'other';
/**
 * Forme normalisée du projectile. Reste optionnelle ; le modèle continue
 * d'accepter `shape?: string` pour les valeurs libres historiques (cf.
 * `Projectile.shape`). Cette union sert surtout à documenter la taxonomie
 * cible importée depuis bullets4.
 */
export type ProjectileShape =
  | 'domed'
  | 'pointed'
  | 'hollow-point'
  | 'wadcutter'
  | 'round-nose'
  | 'semi-wadcutter'
  | 'flat-nose'
  | 'hybrid'
  | 'other';
/** Unité d'expression du poids du projectile (grains ou grammes). */
export type ProjectileWeightUnit = 'gr' | 'g';
export type OpticFocalPlane = 'FFP' | 'SFP';

/**
 * Tranche F.1 — Provenance d'une donnée importée.
 *
 * Taxonomie fermée pour tracer l'origine des entités (Projectile, Optic,
 * Reticle) qui n'ont pas été créées manuellement par l'utilisateur dans
 * l'app. Utilisée uniquement comme marqueur — la pipeline d'import réelle
 * (validation Zod, sanitisation, dry-run) arrivera en F.2/F.3.
 *
 * - `'json-user'`        : import JSON utilisateur arbitraire
 * - `'preset-internal'`  : seed embarqué dans l'app (SEED_PROJECTILES, …)
 * - `'strelok'`          : import depuis un export Strelok Pro
 * - `'chairgun'`         : import depuis un export ChairGun Elite
 * - `'airballistik'`     : round-trip d'un export AirBallistik (`exportAllData`)
 *
 * Volontairement NON appliqué à `Session` : la provenance d'une session
 * est déjà couverte par `derivedFromSessionId` + `metadataInferred`.
 */
export type ImportSource =
  | 'json-user'
  | 'preset-internal'
  | 'strelok'
  | 'chairgun'
  | 'airballistik'
  | 'bullets4-db';

/**
 * Tranche F.1 — Type de réticule (taxonomie fermée V1).
 * Extensible plus tard sans migration : on ajoute juste un littéral.
 */
export type ReticleType =
  | 'mil-dot'
  | 'moa-grid'
  | 'mrad-grid'
  | 'duplex'
  | 'bdc'
  | 'other';

/**
 * Tranche F.1 — Unité angulaire canonique d'un réticule, persistée dans le
 * modèle interne. STRICTEMENT `'MOA' | 'MRAD'` : `'mil'` n'est PAS un
 * troisième canon (alias possiblement géré au moment de l'import en F.2,
 * jamais stocké tel quel).
 */
export type ReticleUnit = 'MOA' | 'MRAD';
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
  /** Tranche F.1 — origine de la donnée si importée. */
  importedFrom?: ImportSource;
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
  /** Tranche F.1 — origine de la donnée si importée. */
  importedFrom?: ImportSource;
  /**
   * Tranche G — lien optionnel vers un réticule de la bibliothèque
   * (`reticleStore`). Une optique référence 0 ou 1 réticule en V1.
   *
   * Règles :
   *  - rétrocompatible : champ optionnel, les optiques existantes restent
   *    valides ;
   *  - source de vérité : le réticule lui-même reste dans `reticleStore`
   *    (pas de duplication / snapshot dans l'optique) ;
   *  - aucune sémantique balistique en V1 : ce lien est purement
   *    documentaire et ne participe à aucun calcul moteur ;
   *  - lien unidirectionnel Optic → Reticle (pas de back-pointer
   *    persistant côté `Reticle`).
   */
  reticleId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Tranche F.1 — Réticule (entité minimale V1).
 *
 * Persistable, propre, extensible. PAS de lien Optic↔Reticle ici, PAS de
 * holdover dynamique, PAS de PBR : tout cela arrivera après F.x si jamais
 * un besoin produit le justifie.
 *
 * `unit` est strictement `'MOA' | 'MRAD'` (cf. ReticleUnit) — `'mil'` est
 * un alias d'import éventuel, jamais un canon interne.
 *
 * `subtension` = valeur d'un cran principal du réticule, exprimée dans
 * `unit` (ex. mil-dot ⇒ unit='MRAD', subtension=1).
 *
 * `marks` = positions optionnelles des graduations majeures dans `unit`,
 * relatives au centre (utile pour BDC custom). Vide pour les réticules
 * réguliers — la régularité est implicite via `subtension`.
 */
export interface Reticle {
  id: string;
  brand: string;
  model: string;
  type: ReticleType;
  unit: ReticleUnit;
  subtension: number;
  focalPlane?: OpticFocalPlane;
  marks?: number[];
  notes?: string;
  /** Tranche F.1 — origine de la donnée si importée. */
  importedFrom?: ImportSource;
  /**
   * Tranche F.4 — image principale optionnelle, encodée en data URL
   * (data:image/<png|jpeg|webp>;base64,...). Une seule image par réticule
   * en V1 (pas de galerie). Compressée/redimensionnée côté client avant
   * stockage pour ne pas saturer localStorage. Champ optionnel : les
   * réticules existants sans image restent strictement valides.
   */
  imageDataUrl?: string;
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
  /**
   * Optional custom Cd vs Mach table. When present, overrides `dragModel` for
   * the entire trajectory (linear interpolation between provided points).
   */
  customDragTable?: DragTablePoint[];
  /**
   * Optional engine configuration (P2). When omitted, the engine runs in
   * legacy bit-exact mode (Euler dt=5e-4, ICAO-simple atmosphere, piecewise
   * Cd) so existing sessions/tests reproduce identically. When present, the
   * engine dispatches integrator / atmosphere / Cd source per profile.
   *
   * Stored on the input rather than passed as a separate argument to keep
   * the public signature `calculateTrajectory(input)` stable for every
   * existing call site.
   */
  engineConfig?: import('./ballistics/types').EngineConfig;
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

/**
 * Provenance of the Cd source used to produce a session's results.
 *
 * - `legacy-piecewise` : pre-P2 hand-tuned Cd ladders (G1/G7/GA/GS only).
 * - `derived-p2`       : 169-pt analytical fits shipped in P2 (MERO beta).
 * - `mero-official`    : digitised official MERO tables (post-P3).
 *
 * Stored on each Session so we can later flip provenance without changing
 * the schema, and so a UI badge can warn users that "MERO beta" is not yet
 * a scientific contract.
 */
export type CdProvenance = 'legacy-piecewise' | 'derived-p2' | 'mero-official';

/**
 * Snapshot of the engine config compiled at calculation time. Frozen on the
 * Session at save time and never recomputed — this is the audit trail.
 */
export interface SessionEngineMetadata {
  integrator: 'euler' | 'trapezoidal';
  atmosphereModel: 'icao-simple' | 'tetens-full';
  /** Integration time-step in seconds. */
  dt: number;
}

/**
 * How the `calculatedAt` timestamp was obtained.
 *
 * - `frozen`                  : recorded by `buildSessionMetadata` at save time. Trustworthy.
 * - `inferred-from-updatedAt` : back-filled from the legacy v0 `updatedAt` (approximation).
 * - `inferred-from-createdAt` : back-filled from `createdAt` when `updatedAt` was missing too.
 *
 * UI consumers (EngineBadge) MUST surface non-`frozen` values as approximate.
 */
export type CalculatedAtSource = 'frozen' | 'inferred-from-updatedAt' | 'inferred-from-createdAt';

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
  /**
   * Engine version that produced `results`. Optional for backwards compat:
   * sessions saved before P1 don't carry this — `session-normalize` reads
   * them as `legacy v0` (no rewrite). Required on every NEW save (P3+).
   */
  engineVersion?: number;
  /**
   * Calculation profile id active when `results` was produced. Optional
   * for backwards compat — defaults to `'legacy'` everywhere it matters.
   * Required on every NEW save (P3+).
   */
  profileId?: string;
  /**
   * Drag law actually used by the engine to produce `results` (post-resolution
   * — may differ from the projectile's stored bcModel if the profile forced a
   * fallback). Optional only for legacy v0 sessions.
   */
  dragLawEffective?: DragModel;
  /**
   * Drag law REQUESTED by the input before the engine's `?? 'G1'` fallback
   * (P3.2). Lets the UI explain "you asked G7 but a G1 fallback was used
   * because the projectile carried no bcModel". Optional for legacy v0.
   */
  dragLawRequested?: DragModel;
  /**
   * Provenance of the Cd source used. Optional only for legacy v0 sessions
   * (treated as `legacy-piecewise` at read time).
   */
  cdProvenance?: CdProvenance;
  /**
   * ISO timestamp at which `results` was produced. Distinct from
   * `createdAt` (which is the session row creation time) and `updatedAt`
   * (which tracks any field edit). Optional only for legacy v0 sessions.
   */
  calculatedAt?: string;
  /**
   * How `calculatedAt` was obtained — `frozen` for sessions saved by P3.1+,
   * `inferred-from-*` for legacy v0 sessions back-filled at read time. UI
   * MUST surface non-`frozen` values as approximate (P3.4 EngineBadge).
   */
  calculatedAtSource?: CalculatedAtSource;
  /**
   * `true` when ANY metadata field on this session was inferred at read
   * time rather than frozen at save time (= legacy v0 sessions). Drives
   * the "Legacy v0" badge variant. Defaults to `false` on modern sessions.
   */
  metadataInferred?: boolean;
  /**
   * Snapshot of the engine config at calculation time. Frozen — never
   * mutated after the session is saved. Optional only for legacy v0.
   */
  engineMetadata?: SessionEngineMetadata;
  /**
   * When the session was produced by an explicit "Recalculate" action on a
   * pre-existing session, this points to the original. Used by the UI to
   * show the filiation in LinkedSessions and to offer a side-by-side diff.
   */
  derivedFromSessionId?: string;
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
  /**
   * User-configurable energy threshold (in Joules) used to flag muzzle/residual
   * energy in the projectile comparison view. `null` disables the highlight.
   * Common values: 7.5 J (France airgun limit), 16.27 J (UK FAC, ≈12 ft·lb).
   */
  energyThresholdJ?: number | null;
}
