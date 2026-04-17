import { Projectile } from './types';

/**
 * Seed dataset for popular PCP airgun projectiles (pellets + slugs).
 *
 * Sources:
 * - HardAir Magazine (https://hardairmagazine.com/ballistic-coefficients/)
 * - JSB / Predator (Polymag) manufacturer specs
 * - H&N Sport (https://www.h-n-sport.de/)
 * - FX Airguns / Air Venturi / NSA / Patriot Javelin / ZAN slug specs
 * - Air Arms Diabolo Field
 *
 * All BC values are referenced against the G1 drag model (most common in
 * airgun publications). Verify against your own chrony + group testing.
 */
export type SeedProjectile = Omit<Projectile, 'id' | 'createdAt' | 'updatedAt'>;

const HAM = 'HardAir Magazine';
const HN = 'https://www.h-n-sport.de/';
const JSB = 'JSB Match Diabolo';
const NSA_SRC = 'Nielsen Specialty Ammo';
const FX_SRC = 'FX Airguns';
const AV = 'Air Venturi';
const PRED = 'Predator International';

export const SEED_PROJECTILES: SeedProjectile[] = [
  // ============================================================
  // .177 (4.50 mm) — JSB PELLETS
  // ============================================================
  { brand: 'JSB', model: 'Exact Diabolo 8.44gr (4.50)', weight: 8.44, bc: 0.022, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.50, material: 'lead', dataSource: JSB, notes: 'Match standard — die 4.50' },
  { brand: 'JSB', model: 'Exact Diabolo 8.44gr (4.51)', weight: 8.44, bc: 0.022, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.51, material: 'lead', dataSource: JSB, notes: 'Match standard — die 4.51' },
  { brand: 'JSB', model: 'Exact Diabolo 8.44gr (4.52)', weight: 8.44, bc: 0.022, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.52, material: 'lead', dataSource: JSB, notes: 'Match standard — die 4.52' },
  { brand: 'JSB', model: 'Exact Diabolo 8.44gr (4.53)', weight: 8.44, bc: 0.022, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.53, material: 'lead', dataSource: JSB, notes: 'Match standard — die 4.53' },
  { brand: 'JSB', model: 'Exact RS 7.33gr', weight: 7.33, bc: 0.018, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.52, material: 'lead', dataSource: JSB, notes: 'Springer / faible vélocité' },
  { brand: 'JSB', model: 'Exact Express 7.87gr', weight: 7.87, bc: 0.020, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.52, material: 'lead', dataSource: JSB, notes: 'Vélocités moyennes — springer/PCP léger' },
  { brand: 'JSB', model: 'Exact Heavy 10.34gr (4.52)', weight: 10.34, bc: 0.026, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.52, material: 'lead', dataSource: JSB, notes: 'Polyvalent FT/HFT — die 4.52' },
  { brand: 'JSB', model: 'Exact Heavy 10.34gr (4.53)', weight: 10.34, bc: 0.026, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.53, material: 'lead', dataSource: JSB, notes: 'Polyvalent FT/HFT — die 4.53' },
  { brand: 'JSB', model: 'Exact Beast 13.43gr', weight: 13.43, bc: 0.029, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.52, material: 'lead', dataSource: JSB, notes: 'Très lourd — PCP haut régime' },
  { brand: 'JSB', model: 'Exact Monster Redesigned 13.43gr', weight: 13.43, bc: 0.030, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.52, material: 'lead', dataSource: JSB, notes: 'Version remaniée du Monster .177' },
  { brand: 'JSB', model: 'Hades 10.34gr', weight: 10.34, bc: 0.020, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'hollow', diameter: 4.52, material: 'lead', dataSource: JSB, notes: 'Hunting hollow point — expansion' },
  { brand: 'JSB', model: 'Knock Out Slug 10.03gr', weight: 10.03, bc: 0.038, bcModel: 'G1', caliber: '.177', projectileType: 'slug', shape: 'slug', diameter: 4.50, material: 'lead', dataSource: JSB, notes: 'Slug léger JSB — barrel slug-ready' },
  { brand: 'JSB', model: 'Knock Out Slug 13.43gr', weight: 13.43, bc: 0.046, bcModel: 'G1', caliber: '.177', projectileType: 'slug', shape: 'slug', diameter: 4.50, material: 'lead', dataSource: JSB, notes: 'Slug standard JSB .177' },
  { brand: 'JSB', model: 'Match Diabolo S100 8.02gr', weight: 8.02, bc: 0.018, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'flat', diameter: 4.50, material: 'lead', dataSource: JSB, notes: 'Match wadcutter 10m' },
  { brand: 'JSB', model: 'Straton 8.44gr', weight: 8.44, bc: 0.021, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'pointed', diameter: 4.52, material: 'lead', dataSource: JSB, notes: 'Pointu — pénétration' },

  // ============================================================
  // .177 — H&N PELLETS
  // ============================================================
  { brand: 'H&N', model: 'Field Target Trophy 8.64gr (4.50)', weight: 8.64, bc: 0.020, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.50, material: 'lead', dataSource: HN, notes: 'FT classique — die 4.50' },
  { brand: 'H&N', model: 'Field Target Trophy 8.64gr (4.51)', weight: 8.64, bc: 0.020, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.51, material: 'lead', dataSource: HN, notes: 'FT classique — die 4.51' },
  { brand: 'H&N', model: 'Field Target Trophy 8.64gr (4.52)', weight: 8.64, bc: 0.020, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.52, material: 'lead', dataSource: HN, notes: 'FT classique — die 4.52' },
  { brand: 'H&N', model: 'Field Target Trophy Green 5.56gr', weight: 5.56, bc: 0.014, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.50, material: 'tin', dataSource: HN, notes: 'Plomb-free (étain) — vélocités élevées' },
  { brand: 'H&N', model: 'Baracuda Match 10.65gr (4.50)', weight: 10.65, bc: 0.025, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.50, material: 'lead', dataSource: HN, notes: 'Hunting / longues distances — die 4.50' },
  { brand: 'H&N', model: 'Baracuda Match 10.65gr (4.51)', weight: 10.65, bc: 0.025, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.51, material: 'lead', dataSource: HN, notes: 'Hunting / longues distances — die 4.51' },
  { brand: 'H&N', model: 'Baracuda Match 10.65gr (4.52)', weight: 10.65, bc: 0.025, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.52, material: 'lead', dataSource: HN, notes: 'Hunting / longues distances — die 4.52' },
  { brand: 'H&N', model: 'Baracuda Hunter 9.57gr', weight: 9.57, bc: 0.020, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'hollow', diameter: 4.50, material: 'lead', dataSource: HN, notes: 'Hollow hunting standard' },
  { brand: 'H&N', model: 'Baracuda Hunter Extreme 9.57gr', weight: 9.57, bc: 0.021, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'hollow', diameter: 4.50, material: 'lead', dataSource: HN, notes: 'Hollow extrême — expansion max' },
  { brand: 'H&N', model: 'Baracuda Power 10.65gr', weight: 10.65, bc: 0.024, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.50, material: 'lead', dataSource: HN, notes: 'Hunting puissance' },
  { brand: 'H&N', model: 'Baracuda Magnum 16.36gr', weight: 16.36, bc: 0.034, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.50, material: 'lead', dataSource: HN, notes: 'Très lourd .177 — PCP haut régime' },
  { brand: 'H&N', model: 'Sniper Light 8.50gr', weight: 8.50, bc: 0.021, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.50, material: 'lead', dataSource: HN, notes: 'Sport / précision' },
  { brand: 'H&N', model: 'Sniper Magnum 15.74gr', weight: 15.74, bc: 0.033, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.50, material: 'lead', dataSource: HN, notes: 'Sniper lourd' },
  { brand: 'H&N', model: 'Hornet 10.03gr', weight: 10.03, bc: 0.022, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'pointed', diameter: 4.50, material: 'lead', dataSource: HN, notes: 'Pointu pénétration' },
  { brand: 'H&N', model: 'Crow Magnum 10.65gr', weight: 10.65, bc: 0.020, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'hollow', diameter: 4.50, material: 'lead', dataSource: HN, notes: 'Hollow hunting expansion' },
  { brand: 'H&N', model: 'Match Pistol 7.56gr', weight: 7.56, bc: 0.014, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'flat', diameter: 4.50, material: 'lead', dataSource: HN, notes: 'Wadcutter pistolet 10m' },
  { brand: 'H&N', model: 'Excite Plinking 7.56gr', weight: 7.56, bc: 0.014, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'flat', diameter: 4.50, material: 'lead', dataSource: HN, notes: 'Plinking économique' },
  { brand: 'H&N', model: 'Terminator 8.64gr', weight: 8.64, bc: 0.018, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'hollow', diameter: 4.50, material: 'lead', dataSource: HN, notes: 'Hollow chasse — expansion violente' },
  { brand: 'H&N', model: 'Slug HP 16gr', weight: 16.0, bc: 0.060, bcModel: 'G1', caliber: '.177', projectileType: 'slug', shape: 'slug', diameter: 4.50, material: 'lead', dataSource: HN, notes: 'Slug .177 hollow point' },

  // ============================================================
  // .177 — AUTRES MARQUES
  // ============================================================
  { brand: 'Air Arms', model: 'Diabolo Field 8.44gr', weight: 8.44, bc: 0.021, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.52, material: 'lead', dataSource: HAM, notes: 'Match — fabriqué par JSB' },
  { brand: 'Air Arms', model: 'Diabolo Field Heavy 10.34gr', weight: 10.34, bc: 0.026, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.52, material: 'lead', dataSource: HAM, notes: 'FT lourd — fabriqué par JSB' },
  { brand: 'Air Arms', model: 'Hunter 10.34gr', weight: 10.34, bc: 0.025, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.52, material: 'lead', dataSource: HAM, notes: 'Hunting — fabriqué par JSB' },
  { brand: 'Crosman', model: 'Premier Hollow Point 7.9gr', weight: 7.9, bc: 0.014, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'hollow', diameter: 4.50, material: 'lead', dataSource: HAM, notes: 'Plinking économique' },
  { brand: 'Crosman', model: 'Premier Light 7.9gr', weight: 7.9, bc: 0.022, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.50, material: 'lead', dataSource: HAM, notes: 'CPL boîte cardboard' },
  { brand: 'Crosman', model: 'Premier Heavy 10.5gr', weight: 10.5, bc: 0.024, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.52, material: 'lead', dataSource: HAM, notes: 'CPHP boîte cardboard' },
  { brand: 'Predator', model: 'Polymag 8.02gr', weight: 8.02, bc: 0.022, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'pointed', diameter: 4.52, material: 'lead', dataSource: PRED, notes: 'Pointe polymère rouge — hunting' },
  { brand: 'RWS', model: 'Superdome 8.30gr', weight: 8.30, bc: 0.020, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.50, material: 'lead', dataSource: HAM, notes: 'Domed allemand classique' },
  { brand: 'RWS', model: 'Superpoint 8.20gr', weight: 8.20, bc: 0.019, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'pointed', diameter: 4.50, material: 'lead', dataSource: HAM, notes: 'Pointu hunting' },

  // ============================================================
  // .177 — SLUGS (autres)
  // ============================================================
  { brand: 'NSA', model: 'Slug 13gr HP', weight: 13.0, bc: 0.045, bcModel: 'G1', caliber: '.177', projectileType: 'slug', shape: 'slug', diameter: 4.50, material: 'lead', dataSource: NSA_SRC, notes: 'Hollow point — barrel slug-ready requis' },
  { brand: 'FX', model: 'Hybrid Slug 13gr', weight: 13.0, bc: 0.043, bcModel: 'G1', caliber: '.177', projectileType: 'slug', shape: 'slug', diameter: 4.51, material: 'lead', dataSource: FX_SRC, notes: 'Profil hybride domed/slug' },

  // ============================================================
  // .22 — JSB PELLETS
  // ============================================================
  { brand: 'JSB', model: 'Exact Jumbo Express 14.35gr', weight: 14.35, bc: 0.028, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.50, material: 'lead', dataSource: JSB, notes: 'Vélocités modérées' },
  { brand: 'JSB', model: 'Exact Jumbo 14.35gr (5.51)', weight: 14.35, bc: 0.030, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.51, material: 'lead', dataSource: JSB, notes: 'Standard FT/HFT .22 — die 5.51' },
  { brand: 'JSB', model: 'Exact Jumbo 14.35gr (5.52)', weight: 14.35, bc: 0.030, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.52, material: 'lead', dataSource: JSB, notes: 'Standard FT/HFT .22 — die 5.52' },
  { brand: 'JSB', model: 'Exact RS 13.43gr', weight: 13.43, bc: 0.022, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.52, material: 'lead', dataSource: JSB, notes: 'Springer / faible vélocité' },
  { brand: 'JSB', model: 'Exact Jumbo Heavy 18.13gr (5.51)', weight: 18.13, bc: 0.033, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.51, material: 'lead', dataSource: JSB, notes: 'Référence longue distance .22 — die 5.51' },
  { brand: 'JSB', model: 'Exact Jumbo Heavy 18.13gr (5.52)', weight: 18.13, bc: 0.033, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.52, material: 'lead', dataSource: JSB, notes: 'Référence longue distance .22 — die 5.52' },
  { brand: 'JSB', model: 'Exact Jumbo Beast 16.20gr', weight: 16.20, bc: 0.031, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.52, material: 'lead', dataSource: JSB, notes: 'Lourd polyvalent' },
  { brand: 'JSB', model: 'Exact Jumbo Monster 25.39gr', weight: 25.39, bc: 0.039, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.52, material: 'lead', dataSource: JSB, notes: 'PCP haut régime — chasse' },
  { brand: 'JSB', model: 'Exact Jumbo Monster Redesigned 25.39gr', weight: 25.39, bc: 0.041, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.52, material: 'lead', dataSource: JSB, notes: 'Monster révisé — meilleure stabilité' },
  { brand: 'JSB', model: 'Exact Straton Jumbo 15.89gr', weight: 15.89, bc: 0.027, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'pointed', diameter: 5.52, material: 'lead', dataSource: JSB, notes: 'Pointu — pénétration' },
  { brand: 'JSB', model: 'Hades 15.89gr', weight: 15.89, bc: 0.024, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'hollow', diameter: 5.52, material: 'lead', dataSource: JSB, notes: 'Hollow point hunting' },
  { brand: 'JSB', model: 'Knock Out Slug 20.20gr MKII', weight: 20.20, bc: 0.062, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.51, material: 'lead', dataSource: JSB, notes: 'Slug léger JSB MKII' },
  { brand: 'JSB', model: 'Knock Out Slug 22.66gr', weight: 22.66, bc: 0.068, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.51, material: 'lead', dataSource: JSB, notes: 'Slug standard JSB' },
  { brand: 'JSB', model: 'Knock Out Slug 25.39gr', weight: 25.39, bc: 0.073, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.51, material: 'lead', dataSource: JSB, notes: 'Slug lourd JSB' },
  { brand: 'JSB', model: 'Knock Out Slug 30.06gr', weight: 30.06, bc: 0.082, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.51, material: 'lead', dataSource: JSB, notes: 'Slug très lourd JSB' },

  // ============================================================
  // .22 — H&N PELLETS
  // ============================================================
  { brand: 'H&N', model: 'Field Target Trophy 14.66gr (5.50)', weight: 14.66, bc: 0.025, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.50, material: 'lead', dataSource: HN, notes: 'FT classique .22 — die 5.50' },
  { brand: 'H&N', model: 'Field Target Trophy 14.66gr (5.51)', weight: 14.66, bc: 0.025, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.51, material: 'lead', dataSource: HN, notes: 'FT classique .22 — die 5.51' },
  { brand: 'H&N', model: 'Field Target Trophy 14.66gr (5.52)', weight: 14.66, bc: 0.025, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.52, material: 'lead', dataSource: HN, notes: 'FT classique .22 — die 5.52' },
  { brand: 'H&N', model: 'Field Target Trophy Green 9.56gr', weight: 9.56, bc: 0.018, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.50, material: 'tin', dataSource: HN, notes: 'Plomb-free étain — léger rapide' },
  { brand: 'H&N', model: 'Baracuda Match 21.14gr (5.50)', weight: 21.14, bc: 0.036, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.50, material: 'lead', dataSource: HN, notes: 'Long range / hunting — die 5.50' },
  { brand: 'H&N', model: 'Baracuda Match 21.14gr (5.51)', weight: 21.14, bc: 0.036, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.51, material: 'lead', dataSource: HN, notes: 'Long range / hunting — die 5.51' },
  { brand: 'H&N', model: 'Baracuda Match 21.14gr (5.52)', weight: 21.14, bc: 0.036, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.52, material: 'lead', dataSource: HN, notes: 'Long range / hunting — die 5.52' },
  { brand: 'H&N', model: 'Baracuda Hunter 18.21gr', weight: 18.21, bc: 0.026, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'hollow', diameter: 5.50, material: 'lead', dataSource: HN, notes: 'Hollow hunting standard' },
  { brand: 'H&N', model: 'Baracuda Hunter Extreme 18.52gr', weight: 18.52, bc: 0.027, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'hollow', diameter: 5.50, material: 'lead', dataSource: HN, notes: 'Hollow extrême — expansion max' },
  { brand: 'H&N', model: 'Baracuda Power 21.14gr', weight: 21.14, bc: 0.034, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.50, material: 'lead', dataSource: HN, notes: 'Hunting puissance' },
  { brand: 'H&N', model: 'Baracuda Magnum 31.02gr', weight: 31.02, bc: 0.044, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.50, material: 'lead', dataSource: HN, notes: 'Très lourd .22 — high power' },
  { brand: 'H&N', model: 'Sniper Light 14.66gr', weight: 14.66, bc: 0.025, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.50, material: 'lead', dataSource: HN, notes: 'Sport / précision' },
  { brand: 'H&N', model: 'Sniper Medium 21.14gr', weight: 21.14, bc: 0.034, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.50, material: 'lead', dataSource: HN, notes: 'Sniper polyvalent' },
  { brand: 'H&N', model: 'Sniper Magnum 24.38gr', weight: 24.38, bc: 0.038, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.50, material: 'lead', dataSource: HN, notes: 'Pellet lourd magnum' },
  { brand: 'H&N', model: 'Hornet 14.66gr', weight: 14.66, bc: 0.024, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'pointed', diameter: 5.50, material: 'lead', dataSource: HN, notes: 'Pointu pénétration' },
  { brand: 'H&N', model: 'Crow Magnum 18.21gr', weight: 18.21, bc: 0.026, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'hollow', diameter: 5.50, material: 'lead', dataSource: HN, notes: 'Hollow hunting expansion' },
  { brand: 'H&N', model: 'Terminator 16.36gr', weight: 16.36, bc: 0.022, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'hollow', diameter: 5.50, material: 'lead', dataSource: HN, notes: 'Hollow chasse — expansion violente' },
  { brand: 'H&N', model: 'Excite Plinking 11.42gr', weight: 11.42, bc: 0.018, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'flat', diameter: 5.50, material: 'lead', dataSource: HN, notes: 'Plinking économique' },
  { brand: 'H&N', model: 'Slug HP 23gr', weight: 23.0, bc: 0.072, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.51, material: 'lead', dataSource: HN, notes: 'Slug .22 hollow point léger' },
  { brand: 'H&N', model: 'Slug HP 25gr', weight: 25.0, bc: 0.078, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.51, material: 'lead', dataSource: HN, notes: 'Slug .22 hollow point standard' },
  { brand: 'H&N', model: 'Slug HP 27gr', weight: 27.0, bc: 0.084, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.51, material: 'lead', dataSource: HN, notes: 'Slug .22 hollow point lourd' },

  // ============================================================
  // .22 — AUTRES MARQUES
  // ============================================================
  { brand: 'Air Arms', model: 'Diabolo Field 16gr', weight: 16.0, bc: 0.030, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.52, material: 'lead', dataSource: HAM, notes: 'Match — fabriqué par JSB' },
  { brand: 'Air Arms', model: 'Diabolo Field Heavy 18gr', weight: 18.0, bc: 0.033, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.52, material: 'lead', dataSource: HAM, notes: 'Lourd — fabriqué par JSB' },
  { brand: 'Crosman', model: 'Premier Hollow Point 14.3gr', weight: 14.3, bc: 0.021, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'hollow', diameter: 5.50, material: 'lead', dataSource: HAM, notes: 'Plinking & small game' },
  { brand: 'Crosman', model: 'Premier Domed 14.3gr', weight: 14.3, bc: 0.027, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.50, material: 'lead', dataSource: HAM, notes: 'CPHP boîte cardboard' },
  { brand: 'Predator', model: 'Polymag 16.0gr', weight: 16.0, bc: 0.030, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'pointed', diameter: 5.52, material: 'lead', dataSource: PRED, notes: 'Pointe polymère rouge' },
  { brand: 'Predator', model: 'Polymag Shorts 14.3gr', weight: 14.3, bc: 0.027, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'pointed', diameter: 5.52, material: 'lead', dataSource: PRED, notes: 'Polymag version courte' },
  { brand: 'RWS', model: 'Superdome 14.50gr', weight: 14.5, bc: 0.025, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.50, material: 'lead', dataSource: HAM, notes: 'Domed allemand classique' },

  // ============================================================
  // .22 — SLUGS (autres marques)
  // ============================================================
  { brand: 'NSA', model: 'Slug 23.4gr HP', weight: 23.4, bc: 0.069, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.51, material: 'lead', dataSource: NSA_SRC, notes: 'Slug léger — barrel slug-ready' },
  { brand: 'NSA', model: 'Slug 25.5gr HP', weight: 25.5, bc: 0.073, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.51, material: 'lead', dataSource: NSA_SRC, notes: 'Polyvalent .22 slug' },
  { brand: 'NSA', model: 'Slug 28gr HP', weight: 28.0, bc: 0.078, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.51, material: 'lead', dataSource: NSA_SRC, notes: 'PCP régulé haute pression' },
  { brand: 'NSA', model: 'Slug 30gr HP', weight: 30.0, bc: 0.082, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.51, material: 'lead', dataSource: NSA_SRC, notes: 'Long range / chasse' },
  { brand: 'FX', model: 'Hybrid Slug 22gr', weight: 22.0, bc: 0.063, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.51, material: 'lead', dataSource: FX_SRC, notes: 'Profil hybride FX' },
  { brand: 'Patriot', model: 'Javelin Slug 25gr', weight: 25.0, bc: 0.072, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.51, material: 'lead', dataSource: 'Patriot Javelin', notes: 'Slug économique' },
  { brand: 'Air Venturi', model: 'Slug 23gr HP', weight: 23.0, bc: 0.067, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.51, material: 'lead', dataSource: AV, notes: 'Slug léger Air Venturi' },
  { brand: 'Air Venturi', model: 'Slug 25gr HP', weight: 25.0, bc: 0.071, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.51, material: 'lead', dataSource: AV, notes: 'Slug standard Air Venturi' },
  { brand: 'ZAN', model: 'Slug 25gr', weight: 25.0, bc: 0.070, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.51, material: 'lead', dataSource: 'ZAN Projectiles', notes: 'Slug usiné' },
  { brand: 'ZAN', model: 'Slug 30gr', weight: 30.0, bc: 0.083, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.51, material: 'lead', dataSource: 'ZAN Projectiles', notes: 'Slug lourd usiné' },

  // ============================================================
  // .25 — JSB PELLETS
  // ============================================================
  { brand: 'JSB', model: 'Exact King 25.39gr (6.35)', weight: 25.39, bc: 0.040, bcModel: 'G1', caliber: '.25', projectileType: 'pellet', shape: 'domed', diameter: 6.35, material: 'lead', dataSource: JSB, notes: 'Référence FT/HFT .25 — die 6.35' },
  { brand: 'JSB', model: 'Exact King 25.39gr (6.36)', weight: 25.39, bc: 0.040, bcModel: 'G1', caliber: '.25', projectileType: 'pellet', shape: 'domed', diameter: 6.36, material: 'lead', dataSource: JSB, notes: 'Référence FT/HFT .25 — die 6.36' },
  { brand: 'JSB', model: 'Exact King MKII 25.39gr', weight: 25.39, bc: 0.041, bcModel: 'G1', caliber: '.25', projectileType: 'pellet', shape: 'domed', diameter: 6.35, material: 'lead', dataSource: JSB, notes: 'Version révisée — meilleure constance' },
  { brand: 'JSB', model: 'Exact King Heavy MKI 33.95gr', weight: 33.95, bc: 0.052, bcModel: 'G1', caliber: '.25', projectileType: 'pellet', shape: 'domed', diameter: 6.35, material: 'lead', dataSource: JSB, notes: 'Long range .25 — original' },
  { brand: 'JSB', model: 'Exact King Heavy MKII 33.95gr', weight: 33.95, bc: 0.054, bcModel: 'G1', caliber: '.25', projectileType: 'pellet', shape: 'domed', diameter: 6.35, material: 'lead', dataSource: JSB, notes: 'Heavy révisé — long range' },
  { brand: 'JSB', model: 'Exact King Beast 33.95gr', weight: 33.95, bc: 0.053, bcModel: 'G1', caliber: '.25', projectileType: 'pellet', shape: 'domed', diameter: 6.35, material: 'lead', dataSource: JSB, notes: 'Beast — équivalent Monster' },
  { brand: 'JSB', model: 'Exact King Monster 33.95gr', weight: 33.95, bc: 0.054, bcModel: 'G1', caliber: '.25', projectileType: 'pellet', shape: 'domed', diameter: 6.35, material: 'lead', dataSource: JSB, notes: 'PCP haut régime' },
  { brand: 'JSB', model: 'Hades 26.54gr', weight: 26.54, bc: 0.030, bcModel: 'G1', caliber: '.25', projectileType: 'pellet', shape: 'hollow', diameter: 6.35, material: 'lead', dataSource: JSB, notes: 'Hollow hunting' },
  { brand: 'JSB', model: 'Knock Out Slug 25.39gr', weight: 25.39, bc: 0.080, bcModel: 'G1', caliber: '.25', projectileType: 'slug', shape: 'slug', diameter: 6.35, material: 'lead', dataSource: JSB, notes: 'Slug léger JSB .25' },
  { brand: 'JSB', model: 'Knock Out Slug 33.95gr', weight: 33.95, bc: 0.098, bcModel: 'G1', caliber: '.25', projectileType: 'slug', shape: 'slug', diameter: 6.35, material: 'lead', dataSource: JSB, notes: 'Slug standard JSB .25' },
  { brand: 'JSB', model: 'Knock Out Slug 38.50gr', weight: 38.50, bc: 0.108, bcModel: 'G1', caliber: '.25', projectileType: 'slug', shape: 'slug', diameter: 6.35, material: 'lead', dataSource: JSB, notes: 'Slug lourd JSB .25' },

  // ============================================================
  // .25 — H&N PELLETS
  // ============================================================
  { brand: 'H&N', model: 'Field Target Trophy 19.91gr', weight: 19.91, bc: 0.029, bcModel: 'G1', caliber: '.25', projectileType: 'pellet', shape: 'domed', diameter: 6.35, material: 'lead', dataSource: HN, notes: 'FT classique .25' },
  { brand: 'H&N', model: 'Baracuda 31.02gr (6.35)', weight: 31.02, bc: 0.045, bcModel: 'G1', caliber: '.25', projectileType: 'pellet', shape: 'domed', diameter: 6.35, material: 'lead', dataSource: HN, notes: 'Hunting longue distance — die 6.35' },
  { brand: 'H&N', model: 'Baracuda 31.02gr (6.36)', weight: 31.02, bc: 0.045, bcModel: 'G1', caliber: '.25', projectileType: 'pellet', shape: 'domed', diameter: 6.36, material: 'lead', dataSource: HN, notes: 'Hunting longue distance — die 6.36' },
  { brand: 'H&N', model: 'Baracuda Hunter 26.85gr', weight: 26.85, bc: 0.034, bcModel: 'G1', caliber: '.25', projectileType: 'pellet', shape: 'hollow', diameter: 6.35, material: 'lead', dataSource: HN, notes: 'Hollow hunting' },
  { brand: 'H&N', model: 'Baracuda Hunter Extreme 26.23gr', weight: 26.23, bc: 0.033, bcModel: 'G1', caliber: '.25', projectileType: 'pellet', shape: 'hollow', diameter: 6.35, material: 'lead', dataSource: HN, notes: 'Hollow extrême — expansion max' },
  { brand: 'H&N', model: 'Baracuda Magnum 36.42gr', weight: 36.42, bc: 0.052, bcModel: 'G1', caliber: '.25', projectileType: 'pellet', shape: 'domed', diameter: 6.35, material: 'lead', dataSource: HN, notes: 'Très lourd .25 — high power' },
  { brand: 'H&N', model: 'Sniper Magnum 31.02gr', weight: 31.02, bc: 0.045, bcModel: 'G1', caliber: '.25', projectileType: 'pellet', shape: 'domed', diameter: 6.35, material: 'lead', dataSource: HN, notes: 'Sniper lourd' },
  { brand: 'H&N', model: 'Slug HP II 30gr', weight: 30.0, bc: 0.085, bcModel: 'G1', caliber: '.25', projectileType: 'slug', shape: 'slug', diameter: 6.35, material: 'lead', dataSource: HN, notes: 'Slug .25 HP léger' },
  { brand: 'H&N', model: 'Slug HP II 34gr', weight: 34.0, bc: 0.095, bcModel: 'G1', caliber: '.25', projectileType: 'slug', shape: 'slug', diameter: 6.35, material: 'lead', dataSource: HN, notes: 'Slug .25 HP standard' },
  { brand: 'H&N', model: 'Slug HP II 38gr', weight: 38.0, bc: 0.104, bcModel: 'G1', caliber: '.25', projectileType: 'slug', shape: 'slug', diameter: 6.35, material: 'lead', dataSource: HN, notes: 'Slug .25 HP lourd' },

  // ============================================================
  // .25 — AUTRES MARQUES
  // ============================================================
  { brand: 'Air Arms', model: 'Diabolo Field 25.39gr', weight: 25.39, bc: 0.040, bcModel: 'G1', caliber: '.25', projectileType: 'pellet', shape: 'domed', diameter: 6.35, material: 'lead', dataSource: HAM, notes: 'Match .25 — fabriqué par JSB' },
  { brand: 'Predator', model: 'Polymag 26.83gr', weight: 26.83, bc: 0.043, bcModel: 'G1', caliber: '.25', projectileType: 'pellet', shape: 'pointed', diameter: 6.35, material: 'lead', dataSource: PRED, notes: 'Pointe polymère rouge' },

  // ============================================================
  // .25 (6.35 mm) — SLUGS
  // ============================================================
  { brand: 'NSA', model: 'Slug 36gr HP', weight: 36.0, bc: 0.095, bcModel: 'G1', caliber: '.25', projectileType: 'slug', shape: 'slug', diameter: 6.35, material: 'lead', dataSource: NSA_SRC, notes: 'Slug .25 léger' },
  { brand: 'NSA', model: 'Slug 41gr HP', weight: 41.0, bc: 0.105, bcModel: 'G1', caliber: '.25', projectileType: 'slug', shape: 'slug', diameter: 6.35, material: 'lead', dataSource: NSA_SRC, notes: 'Polyvalent .25 slug' },
  { brand: 'NSA', model: 'Slug 44gr HP', weight: 44.0, bc: 0.112, bcModel: 'G1', caliber: '.25', projectileType: 'slug', shape: 'slug', diameter: 6.35, material: 'lead', dataSource: NSA_SRC, notes: 'PCP régulé haute pression' },
  { brand: 'NSA', model: 'Slug 47gr HP', weight: 47.0, bc: 0.118, bcModel: 'G1', caliber: '.25', projectileType: 'slug', shape: 'slug', diameter: 6.35, material: 'lead', dataSource: NSA_SRC, notes: 'Long range / chasse' },
  { brand: 'NSA', model: 'Slug 50gr HP', weight: 50.0, bc: 0.125, bcModel: 'G1', caliber: '.25', projectileType: 'slug', shape: 'slug', diameter: 6.35, material: 'lead', dataSource: NSA_SRC, notes: 'Lourd — high power PCP' },
  { brand: 'NSA', model: 'Slug 53gr HP', weight: 53.0, bc: 0.131, bcModel: 'G1', caliber: '.25', projectileType: 'slug', shape: 'slug', diameter: 6.35, material: 'lead', dataSource: NSA_SRC, notes: 'Très lourd — long range' },
  { brand: 'FX', model: 'Hybrid Slug 36gr', weight: 36.0, bc: 0.092, bcModel: 'G1', caliber: '.25', projectileType: 'slug', shape: 'slug', diameter: 6.35, material: 'lead', dataSource: FX_SRC, notes: 'Profil hybride FX' },
  { brand: 'Air Venturi', model: 'Slug 36gr HP', weight: 36.0, bc: 0.094, bcModel: 'G1', caliber: '.25', projectileType: 'slug', shape: 'slug', diameter: 6.35, material: 'lead', dataSource: AV, notes: 'Slug Air Venturi' },
  { brand: 'ZAN', model: 'Slug 33gr', weight: 33.0, bc: 0.087, bcModel: 'G1', caliber: '.25', projectileType: 'slug', shape: 'slug', diameter: 6.35, material: 'lead', dataSource: 'ZAN Projectiles', notes: 'Slug usiné léger' },
  { brand: 'ZAN', model: 'Slug 36gr', weight: 36.0, bc: 0.094, bcModel: 'G1', caliber: '.25', projectileType: 'slug', shape: 'slug', diameter: 6.35, material: 'lead', dataSource: 'ZAN Projectiles', notes: 'Slug usiné' },
  { brand: 'ZAN', model: 'Slug 41gr', weight: 41.0, bc: 0.106, bcModel: 'G1', caliber: '.25', projectileType: 'slug', shape: 'slug', diameter: 6.35, material: 'lead', dataSource: 'ZAN Projectiles', notes: 'Slug usiné polyvalent' },
  { brand: 'ZAN', model: 'Slug 47gr', weight: 47.0, bc: 0.119, bcModel: 'G1', caliber: '.25', projectileType: 'slug', shape: 'slug', diameter: 6.35, material: 'lead', dataSource: 'ZAN Projectiles', notes: 'Slug usiné lourd' },

  // ============================================================
  // .30 (7.62 mm) — PELLETS
  // ============================================================
  { brand: 'JSB', model: 'Exact .30 44.75gr', weight: 44.75, bc: 0.056, bcModel: 'G1', caliber: '.30', projectileType: 'pellet', shape: 'domed', diameter: 7.62, material: 'lead', dataSource: JSB, notes: 'Pellet lourd .30' },
  { brand: 'JSB', model: 'Exact .30 50.15gr', weight: 50.15, bc: 0.061, bcModel: 'G1', caliber: '.30', projectileType: 'pellet', shape: 'domed', diameter: 7.62, material: 'lead', dataSource: JSB, notes: 'Pellet très lourd .30' },

  // ============================================================
  // .30 (7.62 mm) — SLUGS
  // ============================================================
  { brand: 'NSA', model: 'Slug 44gr HP', weight: 44.0, bc: 0.118, bcModel: 'G1', caliber: '.30', projectileType: 'slug', shape: 'slug', diameter: 7.62, material: 'lead', dataSource: NSA_SRC, notes: 'Slug .30 léger' },
  { brand: 'NSA', model: 'Slug 50gr HP', weight: 50.0, bc: 0.130, bcModel: 'G1', caliber: '.30', projectileType: 'slug', shape: 'slug', diameter: 7.62, material: 'lead', dataSource: NSA_SRC, notes: 'Polyvalent .30 slug' },
  { brand: 'NSA', model: 'Slug 57gr HP', weight: 57.0, bc: 0.145, bcModel: 'G1', caliber: '.30', projectileType: 'slug', shape: 'slug', diameter: 7.62, material: 'lead', dataSource: NSA_SRC, notes: 'PCP régulé haute pression' },
  { brand: 'NSA', model: 'Slug 63gr HP', weight: 63.0, bc: 0.158, bcModel: 'G1', caliber: '.30', projectileType: 'slug', shape: 'slug', diameter: 7.62, material: 'lead', dataSource: NSA_SRC, notes: 'Long range / chasse' },
  { brand: 'NSA', model: 'Slug 70.5gr HP', weight: 70.5, bc: 0.175, bcModel: 'G1', caliber: '.30', projectileType: 'slug', shape: 'slug', diameter: 7.62, material: 'lead', dataSource: NSA_SRC, notes: 'Très lourd — high power' },
  { brand: 'FX', model: 'Hybrid Slug 44.75gr', weight: 44.75, bc: 0.115, bcModel: 'G1', caliber: '.30', projectileType: 'slug', shape: 'slug', diameter: 7.62, material: 'lead', dataSource: FX_SRC, notes: 'Profil hybride FX' },
  { brand: 'Patriot', model: 'Javelin Slug 50gr', weight: 50.0, bc: 0.128, bcModel: 'G1', caliber: '.30', projectileType: 'slug', shape: 'slug', diameter: 7.62, material: 'lead', dataSource: 'Patriot Javelin', notes: 'Slug économique' },
  { brand: 'Air Venturi', model: 'Slug 44gr HP', weight: 44.0, bc: 0.116, bcModel: 'G1', caliber: '.30', projectileType: 'slug', shape: 'slug', diameter: 7.62, material: 'lead', dataSource: AV, notes: 'Slug Air Venturi léger' },
  { brand: 'Air Venturi', model: 'Slug 50gr HP', weight: 50.0, bc: 0.129, bcModel: 'G1', caliber: '.30', projectileType: 'slug', shape: 'slug', diameter: 7.62, material: 'lead', dataSource: AV, notes: 'Slug Air Venturi standard' },
];

/** Stable identity key for duplicate detection. */
export function seedProjectileKey(p: Pick<SeedProjectile, 'brand' | 'model' | 'weight' | 'caliber'>): string {
  return `${p.brand}|${p.model}|${p.weight}|${p.caliber}`.toLowerCase();
}
