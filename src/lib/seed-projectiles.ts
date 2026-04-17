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
  { brand: 'JSB', model: 'Exact RS 7.33gr', weight: 7.33, bc: 0.017, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.52, material: 'lead', dataSource: JSB, notes: 'Springer / faible vélocité' },
  { brand: 'JSB', model: 'Exact Express 7.87gr', weight: 7.87, bc: 0.022, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.52, material: 'lead', dataSource: JSB, notes: 'Vélocités moyennes — springer/PCP léger' },
  { brand: 'JSB', model: 'Exact Heavy 10.34gr (4.52)', weight: 10.34, bc: 0.026, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.52, material: 'lead', dataSource: JSB, notes: 'Polyvalent FT/HFT — die 4.52' },
  { brand: 'JSB', model: 'Exact Heavy 10.34gr (4.53)', weight: 10.34, bc: 0.026, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.53, material: 'lead', dataSource: JSB, notes: 'Polyvalent FT/HFT — die 4.53' },
  { brand: 'JSB', model: 'Exact Beast 13.43gr', weight: 13.43, bc: 0.033, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.52, material: 'lead', dataSource: JSB, notes: 'Très lourd — PCP haut régime' },
  { brand: 'JSB', model: 'Exact Monster Redesigned 13.43gr', weight: 13.43, bc: 0.033, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.52, material: 'lead', dataSource: JSB, notes: 'Version remaniée du Monster .177' },
  { brand: 'JSB', model: 'Hades 10.34gr', weight: 10.34, bc: 0.03, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'hollow', diameter: 4.52, material: 'lead', dataSource: JSB, notes: 'Hunting hollow point — expansion' },
  { brand: 'JSB', model: 'Knock Out Slug 10.03gr', weight: 10.03, bc: 0.045, bcModel: 'G1', caliber: '.177', projectileType: 'slug', shape: 'slug', diameter: 4.50, material: 'lead', dataSource: JSB, notes: 'Slug léger JSB — barrel slug-ready' },
  { brand: 'JSB', model: 'Knock Out Slug 13.43gr', weight: 13.43, bc: 0.066, bcModel: 'G1', caliber: '.177', projectileType: 'slug', shape: 'slug', diameter: 4.50, material: 'lead', dataSource: JSB, notes: 'Slug standard JSB .177' },
  { brand: 'JSB', model: 'Match Diabolo S100 8.02gr', weight: 8.02, bc: 0.014, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'flat', diameter: 4.50, material: 'lead', dataSource: JSB, notes: 'Match wadcutter 10m' },
  { brand: 'JSB', model: 'Straton 8.44gr', weight: 8.44, bc: 0.016, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'pointed', diameter: 4.52, material: 'lead', dataSource: JSB, notes: 'Pointu — pénétration' },

  // ============================================================
  // .177 — H&N PELLETS
  // ============================================================
  { brand: 'H&N', model: 'Field Target Trophy 8.64gr (4.50)', weight: 8.64, bc: 0.020, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.50, material: 'lead', dataSource: HN, notes: 'FT classique — die 4.50' },
  { brand: 'H&N', model: 'Field Target Trophy 8.64gr (4.51)', weight: 8.64, bc: 0.020, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.51, material: 'lead', dataSource: HN, notes: 'FT classique — die 4.51' },
  { brand: 'H&N', model: 'Field Target Trophy 8.64gr (4.52)', weight: 8.64, bc: 0.020, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.52, material: 'lead', dataSource: HN, notes: 'FT classique — die 4.52' },
  { brand: 'H&N', model: 'Field Target Trophy Green 5.56gr', weight: 5.56, bc: 0.014, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.50, material: 'tin', dataSource: HN, notes: 'Plomb-free (étain) — vélocités élevées' },
  { brand: 'H&N', model: 'Baracuda Match 10.65gr (4.50)', weight: 10.65, bc: 0.027, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.50, material: 'lead', dataSource: HN, notes: 'Hunting / longues distances — die 4.50' },
  { brand: 'H&N', model: 'Baracuda Match 10.65gr (4.51)', weight: 10.65, bc: 0.027, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.51, material: 'lead', dataSource: HN, notes: 'Hunting / longues distances — die 4.51' },
  { brand: 'H&N', model: 'Baracuda Match 10.65gr (4.52)', weight: 10.65, bc: 0.027, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.52, material: 'lead', dataSource: HN, notes: 'Hunting / longues distances — die 4.52' },
  { brand: 'H&N', model: 'Baracuda Hunter 9.57gr', weight: 9.57, bc: 0.025, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'hollow', diameter: 4.50, material: 'lead', dataSource: HN, notes: 'Hollow hunting standard' },
  { brand: 'H&N', model: 'Baracuda Hunter Extreme 9.57gr', weight: 9.57, bc: 0.02, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'hollow', diameter: 4.50, material: 'lead', dataSource: HN, notes: 'Hollow extrême — expansion max' },
  { brand: 'H&N', model: 'Baracuda Power 10.65gr', weight: 10.65, bc: 0.024, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.50, material: 'lead', dataSource: HN, notes: 'Hunting puissance' },
  { brand: 'H&N', model: 'Baracuda Magnum 16.36gr', weight: 16.36, bc: 0.034, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.50, material: 'lead', dataSource: HN, notes: 'Très lourd .177 — PCP haut régime' },
  { brand: 'H&N', model: 'Sniper Light 8.50gr', weight: 8.50, bc: 0.021, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.50, material: 'lead', dataSource: HN, notes: 'Sport / précision' },
  { brand: 'H&N', model: 'Sniper Magnum 15.74gr', weight: 15.74, bc: 0.033, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.50, material: 'lead', dataSource: HN, notes: 'Sniper lourd' },
  { brand: 'H&N', model: 'Hornet 10.03gr', weight: 10.03, bc: 0.027, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'pointed', diameter: 4.50, material: 'lead', dataSource: HN, notes: 'Pointu pénétration' },
  { brand: 'H&N', model: 'Crow Magnum 10.65gr', weight: 10.65, bc: 0.017, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'hollow', diameter: 4.50, material: 'lead', dataSource: HN, notes: 'Hollow hunting expansion' },
  { brand: 'H&N', model: 'Match Pistol 7.56gr', weight: 7.56, bc: 0.014, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'flat', diameter: 4.50, material: 'lead', dataSource: HN, notes: 'Wadcutter pistolet 10m' },
  { brand: 'H&N', model: 'Excite Plinking 7.56gr', weight: 7.56, bc: 0.014, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'flat', diameter: 4.50, material: 'lead', dataSource: HN, notes: 'Plinking économique' },
  { brand: 'H&N', model: 'Terminator 8.64gr', weight: 8.64, bc: 0.018, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'hollow', diameter: 4.50, material: 'lead', dataSource: HN, notes: 'Hollow chasse — expansion violente' },
  { brand: 'H&N', model: 'Slug HP 16gr', weight: 16.0, bc: 0.058, bcModel: 'G1', caliber: '.177', projectileType: 'slug', shape: 'slug', diameter: 4.50, material: 'lead', dataSource: HN, notes: 'Slug .177 hollow point' },

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
  { brand: 'JSB', model: 'Exact Jumbo Express 14.35gr', weight: 14.35, bc: 0.029, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.50, material: 'lead', dataSource: JSB, notes: 'Vélocités modérées' },
  { brand: 'JSB', model: 'Exact Jumbo 14.35gr (5.51)', weight: 14.35, bc: 0.029, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.51, material: 'lead', dataSource: JSB, notes: 'Standard FT/HFT .22 — die 5.51' },
  { brand: 'JSB', model: 'Exact Jumbo 14.35gr (5.52)', weight: 14.35, bc: 0.029, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.52, material: 'lead', dataSource: JSB, notes: 'Standard FT/HFT .22 — die 5.52' },
  { brand: 'JSB', model: 'Exact RS 13.43gr', weight: 13.43, bc: 0.027, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.52, material: 'lead', dataSource: JSB, notes: 'Springer / faible vélocité' },
  { brand: 'JSB', model: 'Exact Jumbo Heavy 18.13gr (5.51)', weight: 18.13, bc: 0.041, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.51, material: 'lead', dataSource: JSB, notes: 'Référence longue distance .22 — die 5.51' },
  { brand: 'JSB', model: 'Exact Jumbo Heavy 18.13gr (5.52)', weight: 18.13, bc: 0.041, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.52, material: 'lead', dataSource: JSB, notes: 'Référence longue distance .22 — die 5.52' },
  { brand: 'JSB', model: 'Exact Jumbo Beast 16.20gr', weight: 16.20, bc: 0.034, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.52, material: 'lead', dataSource: JSB, notes: 'Lourd polyvalent' },
  { brand: 'JSB', model: 'Exact Jumbo Monster 25.39gr', weight: 25.39, bc: 0.043, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.52, material: 'lead', dataSource: JSB, notes: 'PCP haut régime — chasse' },
  { brand: 'JSB', model: 'Exact Jumbo Monster Redesigned 25.39gr', weight: 25.39, bc: 0.043, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.52, material: 'lead', dataSource: JSB, notes: 'Monster révisé — meilleure stabilité' },
  { brand: 'JSB', model: 'Exact Straton Jumbo 15.89gr', weight: 15.89, bc: 0.02, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'pointed', diameter: 5.52, material: 'lead', dataSource: JSB, notes: 'Pointu — pénétration' },
  { brand: 'JSB', model: 'Hades 15.89gr', weight: 15.89, bc: 0.03, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'hollow', diameter: 5.52, material: 'lead', dataSource: JSB, notes: 'Hollow point hunting' },
  { brand: 'JSB', model: 'Hades Monster 25.39gr', weight: 25.39, bc: 0.043, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'hollow', diameter: 5.52, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/hades/137-hades-monster-22-5-5.html', notes: 'Hollow point lourd — chasse PCP haut régime' },
  { brand: 'JSB', model: 'Knock Out Slug 20.20gr MKII', weight: 20.20, bc: 0.075, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.51, material: 'lead', dataSource: JSB, notes: 'Slug léger JSB MKII' },
  { brand: 'JSB', model: 'Knock Out Slug 22.66gr', weight: 22.66, bc: 0.078, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.51, material: 'lead', dataSource: JSB, notes: 'Slug standard JSB' },
  { brand: 'JSB', model: 'Knock Out Slug 25.39gr', weight: 25.39, bc: 0.086, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.51, material: 'lead', dataSource: JSB, notes: 'Slug lourd JSB' },
  { brand: 'JSB', model: 'Knock Out Slug 30.06gr', weight: 30.06, bc: 0.094, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.51, material: 'lead', dataSource: JSB, notes: 'Slug très lourd JSB' },
  { brand: 'JSB', model: 'Knock Out Slug 33.95gr MKII', weight: 33.95, bc: 0.1, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.51, material: 'lead', dataSource: JSB, notes: 'Slug ultra-lourd MKII — long range' },
  { brand: 'JSB', model: 'Hades 15.89gr (5.50)', weight: 15.89, bc: 0.03, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'hollow', diameter: 5.50, material: 'lead', dataSource: JSB, notes: 'Hollow point hunting — die 5.50' },
  { brand: 'JSB', model: 'Exact Jumbo Beast Redesigned 16.54gr', weight: 16.54, bc: 0.036, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.52, material: 'lead', dataSource: JSB, notes: 'Beast révisé — meilleure stabilité' },
  { brand: 'JSB', model: 'Exact Jumbo Diabolo 15.89gr', weight: 15.89, bc: 0.036, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.52, material: 'lead', dataSource: JSB, notes: 'Diabolo polyvalent FT' },
  { brand: 'JSB', model: 'Match Diabolo 13.43gr', weight: 13.43, bc: 0.017, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'wadcutter', diameter: 5.50, material: 'lead', dataSource: JSB, notes: 'Wadcutter match 10m' },

  // ============================================================
  // .22 — H&N PELLETS
  // ============================================================
  { brand: 'H&N', model: 'Field Target Trophy 14.66gr (5.50)', weight: 14.66, bc: 0.025, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.50, material: 'lead', dataSource: HN, notes: 'FT classique .22 — die 5.50' },
  { brand: 'H&N', model: 'Field Target Trophy 14.66gr (5.51)', weight: 14.66, bc: 0.025, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.51, material: 'lead', dataSource: HN, notes: 'FT classique .22 — die 5.51' },
  { brand: 'H&N', model: 'Field Target Trophy 14.66gr (5.52)', weight: 14.66, bc: 0.025, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.52, material: 'lead', dataSource: HN, notes: 'FT classique .22 — die 5.52' },
  { brand: 'H&N', model: 'Field Target Trophy Green 9.56gr', weight: 9.56, bc: 0.019, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.50, material: 'tin', dataSource: HN, notes: 'Plomb-free étain — léger rapide' },
  { brand: 'H&N', model: 'Baracuda Match 21.14gr (5.50)', weight: 21.14, bc: 0.039, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.50, material: 'lead', dataSource: HN, notes: 'Long range / hunting — die 5.50' },
  { brand: 'H&N', model: 'Baracuda Match 21.14gr (5.51)', weight: 21.14, bc: 0.039, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.51, material: 'lead', dataSource: HN, notes: 'Long range / hunting — die 5.51' },
  { brand: 'H&N', model: 'Baracuda Match 21.14gr (5.52)', weight: 21.14, bc: 0.039, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.52, material: 'lead', dataSource: HN, notes: 'Long range / hunting — die 5.52' },
  { brand: 'H&N', model: 'Baracuda Hunter 18.21gr', weight: 18.21, bc: 0.03, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'hollow', diameter: 5.50, material: 'lead', dataSource: HN, notes: 'Hollow hunting standard' },
  { brand: 'H&N', model: 'Baracuda Hunter Extreme 18.52gr', weight: 18.52, bc: 0.029, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'hollow', diameter: 5.50, material: 'lead', dataSource: HN, notes: 'Hollow extrême — expansion max' },
  { brand: 'H&N', model: 'Baracuda Power 21.14gr', weight: 21.14, bc: 0.04, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.50, material: 'lead', dataSource: HN, notes: 'Hunting puissance' },
  { brand: 'H&N', model: 'Baracuda Magnum 31.02gr', weight: 31.02, bc: 0.05, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.50, material: 'lead', dataSource: HN, notes: 'Très lourd .22 — high power' },
  { brand: 'H&N', model: 'Sniper Light 14.66gr', weight: 14.66, bc: 0.023, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.50, material: 'lead', dataSource: HN, notes: 'Sport / précision' },
  { brand: 'H&N', model: 'Sniper Medium 21.14gr', weight: 21.14, bc: 0.039, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.50, material: 'lead', dataSource: HN, notes: 'Sniper polyvalent' },
  { brand: 'H&N', model: 'Sniper Magnum 24.38gr', weight: 24.38, bc: 0.045, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.50, material: 'lead', dataSource: HN, notes: 'Pellet lourd magnum' },
  { brand: 'H&N', model: 'Hornet 14.66gr', weight: 14.66, bc: 0.027, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'pointed', diameter: 5.50, material: 'lead', dataSource: HN, notes: 'Pointu pénétration' },
  { brand: 'H&N', model: 'Crow Magnum 18.21gr', weight: 18.21, bc: 0.016, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'hollow', diameter: 5.50, material: 'lead', dataSource: HN, notes: 'Hollow hunting expansion' },
  { brand: 'H&N', model: 'Terminator 16.36gr', weight: 16.36, bc: 0.025, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'hollow', diameter: 5.50, material: 'lead', dataSource: HN, notes: 'Hollow chasse — expansion violente' },
  { brand: 'H&N', model: 'Excite Plinking 11.42gr', weight: 11.42, bc: 0.018, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'flat', diameter: 5.50, material: 'lead', dataSource: HN, notes: 'Plinking économique' },
  { brand: 'H&N', model: 'Slug HP 23gr', weight: 23.0, bc: 0.075, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.51, material: 'lead', dataSource: HN, notes: 'Slug .22 hollow point léger' },
  { brand: 'H&N', model: 'Slug HP 25gr', weight: 25.0, bc: 0.077, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.51, material: 'lead', dataSource: HN, notes: 'Slug .22 hollow point standard' },
  { brand: 'H&N', model: 'Slug HP 27gr', weight: 27.0, bc: 0.085, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.51, material: 'lead', dataSource: HN, notes: 'Slug .22 hollow point lourd' },
  { brand: 'H&N', model: 'Slug HP 30gr', weight: 30.0, bc: 0.091, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.51, material: 'lead', dataSource: HN, notes: 'Slug .22 hollow point très lourd' },
  { brand: 'H&N', model: 'Slug HP II 25gr', weight: 25.0, bc: 0.08, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.51, material: 'lead', dataSource: HN, notes: 'Slug HP II — profil amélioré' },
  { brand: 'H&N', model: 'Slug HP II 28gr', weight: 28.0, bc: 0.087, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.51, material: 'lead', dataSource: HN, notes: 'Slug HP II standard long range' },
  { brand: 'H&N', model: 'Slug HP II 31gr', weight: 31.0, bc: 0.094, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.51, material: 'lead', dataSource: HN, notes: 'Slug HP II lourd long range' },
  { brand: 'H&N', model: 'Field Target Trophy Power 21.14gr', weight: 21.14, bc: 0.039, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.50, material: 'lead', dataSource: HN, notes: 'FT Power — version lourde' },
  { brand: 'H&N', model: 'Baracuda Hunter Extreme 18.52gr (5.51)', weight: 18.52, bc: 0.029, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'hollow', diameter: 5.51, material: 'lead', dataSource: HN, notes: 'Hollow extrême — die 5.51' },
  { brand: 'H&N', model: 'Baracuda Green 12.35gr', weight: 12.35, bc: 0.028, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.50, material: 'tin', dataSource: HN, notes: 'Plomb-free étain — high velocity' },
  { brand: 'H&N', model: 'Baracuda FT 21.14gr', weight: 21.14, bc: 0.04, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.51, material: 'lead', dataSource: HN, notes: 'Field Target — die optimisée' },
  { brand: 'H&N', model: 'Coppa Match 14.66gr', weight: 14.66, bc: 0.023, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.50, material: 'copper-plated', dataSource: HN, notes: 'Plomb cuivré — anti-encrassement' },
  { brand: 'H&N', model: 'Match Pistol 14.66gr', weight: 14.66, bc: 0.014, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'wadcutter', diameter: 5.50, material: 'lead', dataSource: HN, notes: 'Wadcutter match 10m' },
  { brand: 'H&N', model: 'Excite Hammer 14.66gr', weight: 14.66, bc: 0.017, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'flat', diameter: 5.50, material: 'lead', dataSource: HN, notes: 'Plinking flat-nose économique' },
  { brand: 'H&N', model: 'Excite Spike 15.74gr', weight: 15.74, bc: 0.02, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'pointed', diameter: 5.50, material: 'lead', dataSource: HN, notes: 'Pointe — plinking économique' },
  { brand: 'H&N', model: 'Rabbit Magnum II 25.85gr', weight: 25.85, bc: 0.045, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.50, material: 'lead', dataSource: HN, notes: 'Hunting très lourd — high power PCP' },
  { brand: 'H&N', model: 'Piledriver 30.86gr', weight: 30.86, bc: 0.105, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.50, material: 'lead', dataSource: HN, notes: 'Pellet ultra-lourd — magnum hunting' },
  { brand: 'H&N', model: 'Crow Magnum II 18.21gr', weight: 18.21, bc: 0.016, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'hollow', diameter: 5.50, material: 'lead', dataSource: HN, notes: 'Hollow — version II expansion' },
  { brand: 'H&N', model: 'Silver Point 17.13gr', weight: 17.13, bc: 0.018, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'pointed', diameter: 5.50, material: 'lead', dataSource: HN, notes: 'Pointe argentée — pénétration' },

  // ============================================================
  // .22 — AUTRES MARQUES
  // ============================================================
  { brand: 'Air Arms', model: 'Diabolo Field 16gr', weight: 16.0, bc: 0.034, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.52, material: 'lead', dataSource: HAM, notes: 'Match — fabriqué par JSB' },
  { brand: 'Air Arms', model: 'Diabolo Field Heavy 18gr', weight: 18.0, bc: 0.039, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.52, material: 'lead', dataSource: HAM, notes: 'Lourd — fabriqué par JSB' },
  { brand: 'Crosman', model: 'Premier Hollow Point 14.3gr', weight: 14.3, bc: 0.028, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'hollow', diameter: 5.50, material: 'lead', dataSource: HAM, notes: 'Plinking & small game' },
  { brand: 'Crosman', model: 'Premier Domed 14.3gr', weight: 14.3, bc: 0.027, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.50, material: 'lead', dataSource: HAM, notes: 'CPHP boîte cardboard' },
  { brand: 'Predator', model: 'Polymag 16.0gr', weight: 16.0, bc: 0.034, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'pointed', diameter: 5.52, material: 'lead', dataSource: PRED, notes: 'Pointe polymère rouge' },
  { brand: 'Predator', model: 'Polymag Shorts 14.3gr', weight: 14.3, bc: 0.028, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'pointed', diameter: 5.52, material: 'lead', dataSource: PRED, notes: 'Polymag version courte' },
  { brand: 'RWS', model: 'Superdome 14.50gr', weight: 14.5, bc: 0.016, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.50, material: 'lead', dataSource: HAM, notes: 'Domed allemand classique' },

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
  { brand: 'JSB', model: 'Exact King 25.39gr (6.35)', weight: 25.39, bc: 0.045, bcModel: 'G1', caliber: '.25', projectileType: 'pellet', shape: 'domed', diameter: 6.35, material: 'lead', dataSource: JSB, notes: 'Référence FT/HFT .25 — die 6.35' },
  { brand: 'JSB', model: 'Exact King 25.39gr (6.36)', weight: 25.39, bc: 0.045, bcModel: 'G1', caliber: '.25', projectileType: 'pellet', shape: 'domed', diameter: 6.36, material: 'lead', dataSource: JSB, notes: 'Référence FT/HFT .25 — die 6.36' },
  { brand: 'JSB', model: 'Exact King MKII 25.39gr', weight: 25.39, bc: 0.045, bcModel: 'G1', caliber: '.25', projectileType: 'pellet', shape: 'domed', diameter: 6.35, material: 'lead', dataSource: JSB, notes: 'Version révisée — meilleure constance' },
  { brand: 'JSB', model: 'Exact King Heavy MKI 33.95gr', weight: 33.95, bc: 0.052, bcModel: 'G1', caliber: '.25', projectileType: 'pellet', shape: 'domed', diameter: 6.35, material: 'lead', dataSource: JSB, notes: 'Long range .25 — original' },
  { brand: 'JSB', model: 'Exact King Heavy MKII 33.95gr', weight: 33.95, bc: 0.055, bcModel: 'G1', caliber: '.25', projectileType: 'pellet', shape: 'domed', diameter: 6.35, material: 'lead', dataSource: JSB, notes: 'Heavy révisé — long range' },
  { brand: 'JSB', model: 'Exact King Beast 33.95gr', weight: 33.95, bc: 0.052, bcModel: 'G1', caliber: '.25', projectileType: 'pellet', shape: 'domed', diameter: 6.35, material: 'lead', dataSource: JSB, notes: 'Beast — équivalent Monster' },
  { brand: 'JSB', model: 'Exact King Monster 33.95gr', weight: 33.95, bc: 0.055, bcModel: 'G1', caliber: '.25', projectileType: 'pellet', shape: 'domed', diameter: 6.35, material: 'lead', dataSource: JSB, notes: 'PCP haut régime' },
  { brand: 'JSB', model: 'Hades 26.54gr', weight: 26.54, bc: 0.032, bcModel: 'G1', caliber: '.25', projectileType: 'pellet', shape: 'hollow', diameter: 6.35, material: 'lead', dataSource: JSB, notes: 'Hollow hunting' },
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
  // .30 — JSB PELLETS & SLUGS
  // ============================================================
  { brand: 'JSB', model: 'Exact .30 44.75gr', weight: 44.75, bc: 0.056, bcModel: 'G1', caliber: '.30', projectileType: 'pellet', shape: 'domed', diameter: 7.62, material: 'lead', dataSource: JSB, notes: 'Pellet lourd .30' },
  { brand: 'JSB', model: 'Exact .30 50.15gr', weight: 50.15, bc: 0.061, bcModel: 'G1', caliber: '.30', projectileType: 'pellet', shape: 'domed', diameter: 7.62, material: 'lead', dataSource: JSB, notes: 'Pellet très lourd .30' },
  { brand: 'JSB', model: 'Exact King .30 50.15gr', weight: 50.15, bc: 0.062, bcModel: 'G1', caliber: '.30', projectileType: 'pellet', shape: 'domed', diameter: 7.62, material: 'lead', dataSource: JSB, notes: 'Domed long range .30' },
  { brand: 'JSB', model: 'Hades .30 44.75gr', weight: 44.75, bc: 0.045, bcModel: 'G1', caliber: '.30', projectileType: 'pellet', shape: 'hollow', diameter: 7.62, material: 'lead', dataSource: JSB, notes: 'Hollow hunting .30' },
  { brand: 'JSB', model: 'Knock Out Slug 44.75gr', weight: 44.75, bc: 0.115, bcModel: 'G1', caliber: '.30', projectileType: 'slug', shape: 'slug', diameter: 7.62, material: 'lead', dataSource: JSB, notes: 'Slug léger JSB .30' },
  { brand: 'JSB', model: 'Knock Out Slug 54.50gr', weight: 54.50, bc: 0.140, bcModel: 'G1', caliber: '.30', projectileType: 'slug', shape: 'slug', diameter: 7.62, material: 'lead', dataSource: JSB, notes: 'Slug standard JSB .30' },

  // ============================================================
  // .30 — H&N PELLETS & SLUGS
  // ============================================================
  { brand: 'H&N', model: 'Baracuda Hunter Extreme .30 44.13gr', weight: 44.13, bc: 0.045, bcModel: 'G1', caliber: '.30', projectileType: 'pellet', shape: 'hollow', diameter: 7.62, material: 'lead', dataSource: HN, notes: 'Hollow expansion .30' },
  { brand: 'H&N', model: 'Piledriver .30 50.15gr', weight: 50.15, bc: 0.061, bcModel: 'G1', caliber: '.30', projectileType: 'pellet', shape: 'domed', diameter: 7.62, material: 'lead', dataSource: HN, notes: 'Pellet très lourd .30' },
  { brand: 'H&N', model: 'Slug HP II 44gr', weight: 44.0, bc: 0.118, bcModel: 'G1', caliber: '.30', projectileType: 'slug', shape: 'slug', diameter: 7.62, material: 'lead', dataSource: HN, notes: 'Slug .30 HP léger' },
  { brand: 'H&N', model: 'Slug HP II 50gr', weight: 50.0, bc: 0.130, bcModel: 'G1', caliber: '.30', projectileType: 'slug', shape: 'slug', diameter: 7.62, material: 'lead', dataSource: HN, notes: 'Slug .30 HP standard' },
  { brand: 'H&N', model: 'Slug HP II 56gr', weight: 56.0, bc: 0.143, bcModel: 'G1', caliber: '.30', projectileType: 'slug', shape: 'slug', diameter: 7.62, material: 'lead', dataSource: HN, notes: 'Slug .30 HP lourd' },

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

  // ============================================================
  // JSB SCHULZ DIABOLO — additional models
  // Source: https://www.schulzdiabolo.cz/en/pellets/
  // ============================================================

  // --- Premium series (hand-sorted, weight tolerance ±0.001g) ---
  { brand: 'JSB', model: 'Match Premium Light 7.56gr', weight: 7.56, bc: 0.018, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'wadcutter', diameter: 4.50, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/premium/77-match-premium-light.html', notes: 'Premium hand-sorted — match 10m indoor' },
  { brand: 'JSB', model: 'Match Premium Middle 8.02gr', weight: 8.02, bc: 0.019, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'wadcutter', diameter: 4.50, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/premium/78-match-premium-middle.html', notes: 'Premium hand-sorted — match 10m' },
  { brand: 'JSB', model: 'Match Premium Heavy 8.26gr', weight: 8.26, bc: 0.020, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'wadcutter', diameter: 4.50, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/premium/79-match-premium-heavy.html', notes: 'Premium hand-sorted — match 10m heavy' },
  { brand: 'JSB', model: 'Exact Premium 8.44gr', weight: 8.44, bc: 0.022, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.51, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/premium/80-exact-premium.html', notes: 'Premium hand-sorted — FT/HFT outdoor' },
  { brand: 'JSB', model: 'Exact Express Premium 7.87gr', weight: 7.87, bc: 0.020, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'domed', diameter: 4.51, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/premium/90-exact-express-premium.html', notes: 'Premium hand-sorted — vélocités modérées' },

  // --- Match series (.177 / 4.5mm) ---
  { brand: 'JSB', model: 'Match Light Weight 7.56gr', weight: 7.56, bc: 0.018, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'wadcutter', diameter: 4.50, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/match/10-match-light-weight.html', notes: 'Match ISSF 10m — léger' },
  { brand: 'JSB', model: 'Match Middle Weight 8.02gr', weight: 8.02, bc: 0.019, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'wadcutter', diameter: 4.50, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/match/11-match-middle-weight.html', notes: 'Match ISSF 10m — standard' },
  { brand: 'JSB', model: 'Match Heavy Weight 8.26gr', weight: 8.26, bc: 0.020, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'wadcutter', diameter: 4.50, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/match/12-match-heavy-weight.html', notes: 'Match ISSF 10m — lourd' },
  { brand: 'JSB', model: 'Schak 8.02gr', weight: 8.02, bc: 0.019, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'wadcutter', diameter: 4.50, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/match/32-schak.html', notes: 'Match — gamme entrée précision' },
  { brand: 'JSB', model: 'Simply 7.87gr', weight: 7.87, bc: 0.018, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'wadcutter', diameter: 4.50, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/match/108-simply.html', notes: 'Plinking / entraînement économique' },

  // --- Exact Jumbo .22 — variantes Monster manquantes ---
  { brand: 'JSB', model: 'Exact Jumbo Monster Light 22.06gr', weight: 22.06, bc: 0.036, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.52, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/exact-jumbo-22/140-exact-jumbo-monster-light.html', notes: 'Monster allégé — vélocités modérées' },
  { brand: 'JSB', model: 'Exact Jumbo Monster GRAND 5.52 25.39gr', weight: 25.39, bc: 0.041, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.52, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/exact-jumbo-22/136-exact-jumbo-monster-grand-5-52.html', notes: 'Monster GRAND — die 5.52 large' },
  { brand: 'JSB', model: 'Exact Jumbo Monster Redesigned DEEP 25.39gr', weight: 25.39, bc: 0.042, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.52, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/exact-jumbo-22/95-exact-jumbo-monster-redesigned-deep.html', notes: 'Monster Redesigned — jupe profonde' },
  { brand: 'JSB', model: 'Exact Jumbo Monster Redesigned SHALLOW 25.39gr', weight: 25.39, bc: 0.041, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.52, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/exact-jumbo-22/135-exact-jumbo-monster-redesigned-shallow.html', notes: 'Monster Redesigned — jupe peu profonde' },
  { brand: 'JSB', model: 'Exact Jumbo RS 13.43gr', weight: 13.43, bc: 0.022, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'domed', diameter: 5.52, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/exact-jumbo-22/21-exact-jumbo-rs.html', notes: 'Springer / faible vélocité' },

  // --- Exact .20 / .30 / .35 ---
  { brand: 'JSB', model: 'Exact .20 13.73gr', weight: 13.73, bc: 0.027, bcModel: 'G1', caliber: '.20', projectileType: 'pellet', shape: 'domed', diameter: 5.10, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/exact-30/25-exact-20.html', notes: 'Calibre .20 / 5.1mm — hunting' },
  { brand: 'JSB', model: 'Exact Heavy .20 16.05gr', weight: 16.05, bc: 0.031, bcModel: 'G1', caliber: '.20', projectileType: 'pellet', shape: 'domed', diameter: 5.10, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/exact-30/106-exact-heavy-20.html', notes: 'Calibre .20 lourd' },
  { brand: 'JSB', model: 'Exact .35 81.02gr', weight: 81.02, bc: 0.090, bcModel: 'G1', caliber: '.35', projectileType: 'pellet', shape: 'domed', diameter: 9.00, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/exact-30/63-exact-35.html', notes: 'Calibre .35 / 9mm — big bore' },

  // --- Hades (.35) ---
  { brand: 'JSB', model: 'Hades .35 81.02gr', weight: 81.02, bc: 0.085, bcModel: 'G1', caliber: '.35', projectileType: 'pellet', shape: 'hollow', diameter: 9.00, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/hades/123-hades-35.html', notes: 'Hollow point big bore' },

  // --- Predator (Polymag .20 / .35 / Metalmag) ---
  { brand: 'Predator', model: 'Polymag .20 11.42gr', weight: 11.42, bc: 0.024, bcModel: 'G1', caliber: '.20', projectileType: 'pellet', shape: 'pointed', diameter: 5.10, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/predator-polymag/37-predator-polymag-20.html', notes: 'Pointe polymère .20' },
  { brand: 'Predator', model: 'Polymag .35 81.02gr', weight: 81.02, bc: 0.085, bcModel: 'G1', caliber: '.35', projectileType: 'pellet', shape: 'pointed', diameter: 9.00, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/predator-polymag/103-predator-polymag-35.html', notes: 'Pointe polymère big bore .35' },
  { brand: 'Predator', model: 'Polymag Shorts .177 7.41gr', weight: 7.41, bc: 0.020, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'pointed', diameter: 4.50, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/predator-polymag/81-predator-polymag-shorts-177.html', notes: 'Polymag version courte .177' },
  { brand: 'Predator', model: 'Metalmag .177 8.49gr', weight: 8.49, bc: 0.022, bcModel: 'G1', caliber: '.177', projectileType: 'pellet', shape: 'pointed', diameter: 4.50, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/predator-polymag/66-predator-metalmag-177.html', notes: 'Pointe métal — pénétration' },
  { brand: 'Predator', model: 'Metalmag .22 16.54gr', weight: 16.54, bc: 0.030, bcModel: 'G1', caliber: '.22', projectileType: 'pellet', shape: 'pointed', diameter: 5.52, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/predator-polymag/67-predator-metalmag-22.html', notes: 'Pointe métal .22 — pénétration' },

  // --- KnockOut Slugs (gammes Schulz officielles) ---
  { brand: 'JSB', model: 'KnockOut Slug .177 (4.51) 10.03gr', weight: 10.03, bc: 0.045, bcModel: 'G1', caliber: '.177', projectileType: 'slug', shape: 'slug', diameter: 4.51, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/slugs/119-knockout-177-4-51-0-650g.html', notes: 'Slug .177 léger — 0.650g' },
  { brand: 'JSB', model: 'KnockOut Slug .177 (4.52) 13.43gr', weight: 13.43, bc: 0.066, bcModel: 'G1', caliber: '.177', projectileType: 'slug', shape: 'slug', diameter: 4.52, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/slugs/120-knockout-slugs-177-4-52-0-870g.html', notes: 'Slug .177 standard — 0.870g' },
  { brand: 'JSB', model: 'KnockOut Slug .177 MKII (4.51) 13.43gr', weight: 13.43, bc: 0.068, bcModel: 'G1', caliber: '.177', projectileType: 'slug', shape: 'slug', diameter: 4.51, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/slugs/127-knockout-slugs-177-mkii-4-51.html', notes: 'Slug .177 MKII — profil amélioré' },
  { brand: 'JSB', model: 'KnockOut Slug .177 MK3 (4.51) 13.43gr', weight: 13.43, bc: 0.07, bcModel: 'G1', caliber: '.177', projectileType: 'slug', shape: 'slug', diameter: 4.51, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/slugs/139-knockout-slugs-177-mk3-4-51.html', notes: 'Slug .177 MK3 — dernière révision' },
  { brand: 'JSB', model: 'KnockOut Slug .216 (5.5) 18.52gr', weight: 18.52, bc: 0.07, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.49, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/slugs/138-knockout-slugs-216-5-5.html', notes: 'Slug .216 (5.49mm) léger' },
  { brand: 'JSB', model: 'KnockOut Slug .216 (5.5) 20.83gr', weight: 20.83, bc: 0.075, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.49, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/slugs/141-knockout-slugs-216-5-5-1-350g.html', notes: 'Slug .216 — 1.350g' },
  { brand: 'JSB', model: 'KnockOut Slug .216 MKII (5.49) 22.66gr', weight: 22.66, bc: 0.08, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.49, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/slugs/117-knockout-slugs-216-mkii-5-49.html', notes: 'Slug .216 MKII (5.49) — profil amélioré' },
  { brand: 'JSB', model: 'KnockOut Slug .217 (5.5) 22.66gr', weight: 22.66, bc: 0.078, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.51, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/slugs/116-knockout-slugs-217-5-5.html', notes: 'Slug .217 (5.51mm) standard' },
  { brand: 'JSB', model: 'KnockOut Slug .217 (5.5) 28.55gr', weight: 28.55, bc: 0.092, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.51, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/slugs/142-knockout-slugs-217-5-5-1-850g.html', notes: 'Slug .217 — 1.850g lourd' },
  { brand: 'JSB', model: 'KnockOut Slug .218 (5.5) 25.39gr', weight: 25.39, bc: 0.086, bcModel: 'G1', caliber: '.22', projectileType: 'slug', shape: 'slug', diameter: 5.53, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/slugs/124-knockout-slugs-218-5-5.html', notes: 'Slug .218 (5.53mm) — die large' },
  { brand: 'JSB', model: 'KnockOut Slug .251 (6.37) 35.16gr', weight: 35.16, bc: 0.108, bcModel: 'G1', caliber: '.25', projectileType: 'slug', shape: 'slug', diameter: 6.37, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/slugs/112-knockout-slugs-251-6-37.html', notes: 'Slug .251 (6.37mm)' },
  { brand: 'JSB', model: 'KnockOut Slug .25 MKII (6.35) 33.95gr', weight: 33.95, bc: 0.105, bcModel: 'G1', caliber: '.25', projectileType: 'slug', shape: 'slug', diameter: 6.35, material: 'lead', dataSource: 'https://www.schulzdiabolo.cz/en/pellets/slugs/115-knockout-25-mkii-6-35.html', notes: 'Slug .25 MKII — profil amélioré' },
];

/** Stable identity key for duplicate detection. */
export function seedProjectileKey(p: Pick<SeedProjectile, 'brand' | 'model' | 'weight' | 'caliber'>): string {
  return `${p.brand}|${p.model}|${p.weight}|${p.caliber}`.toLowerCase();
}
