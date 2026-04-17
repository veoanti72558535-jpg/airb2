import { Airgun } from './types';

/**
 * Seed dataset for popular PCP airguns.
 *
 * Each entry represents a model variant (where applicable: Compact / Standard
 * / Sniper barrel options). Calibre availability is documented in `notes`.
 *
 * `notes` field convention:
 *   "<Calibres dispo> · Mag <N>sh · <Power info> · <Other features>"
 *
 * Sources: manufacturer websites (FX, Daystate, Air Arms, Brocock, Hatsan,
 * Kral, Reximex, Artemis/SPA, Benjamin/Crosman, AEA, Western Airguns,
 * Umarex, Snowpeak, Cricket/Kalibrgun) + community references (AGN, HAM).
 *
 * IMPORTANT: Specifications are indicative — verify against your specific
 * unit's serial-numbered docs.
 */
export type SeedAirgun = Omit<Airgun, 'id' | 'createdAt' | 'updatedAt'>;

export const SEED_AIRGUNS: SeedAirgun[] = [
  // ============================================================
  // FX AIRGUNS (Sweden)
  // ============================================================
  { brand: 'FX', model: 'Impact M3 Compact', caliber: '.22', barrelLength: 500, twistRate: 16, regPressure: 110, fillPressure: 250, powerSetting: 'Power wheel + macro/micro reg', defaultSightHeight: 45, defaultZeroRange: 30, notes: '.177/.22/.25/.30 · Mag 28/21/18/16 · Bottle 480cc · Réservoir 580cc · STX Superior Heavy Liner' },
  { brand: 'FX', model: 'Impact M3 Standard', caliber: '.25', barrelLength: 600, twistRate: 16, regPressure: 110, fillPressure: 250, powerSetting: 'Power wheel + dual regulator', defaultSightHeight: 45, defaultZeroRange: 35, notes: '.177/.22/.25/.30 · Mag 28/21/18/16 · Bottle 480cc · STX Superior Heavy Liner' },
  { brand: 'FX', model: 'Impact M3 Sniper', caliber: '.30', barrelLength: 700, twistRate: 18, regPressure: 110, fillPressure: 250, powerSetting: 'Power wheel + dual regulator', defaultSightHeight: 50, defaultZeroRange: 40, notes: '.22/.25/.30 · Mag 21/18/16 · Bottle 580cc · Canon long pour slugs' },
  { brand: 'FX', model: 'Maverick Compact', caliber: '.22', barrelLength: 500, twistRate: 16, regPressure: 110, fillPressure: 250, powerSetting: 'Dual regulator', defaultSightHeight: 45, defaultZeroRange: 30, notes: '.22/.25/.30 · Mag 21/18/16 · Bottle 500cc · Carbon shroud' },
  { brand: 'FX', model: 'Maverick Sniper', caliber: '.25', barrelLength: 700, twistRate: 18, regPressure: 110, fillPressure: 250, powerSetting: 'Dual regulator', defaultSightHeight: 50, defaultZeroRange: 40, notes: '.22/.25/.30 · Mag 21/18/16 · Bottle 580cc · Slug-ready' },
  { brand: 'FX', model: 'Crown MKII Standard', caliber: '.22', barrelLength: 600, twistRate: 16, regPressure: 110, fillPressure: 230, powerSetting: 'External regulator', defaultSightHeight: 42, defaultZeroRange: 35, notes: '.177/.22/.25/.30 · Mag 18/16/13/12 · Tube 480cc · Bois ou synthétique' },
  { brand: 'FX', model: 'Crown MKII Continuum', caliber: '.25', barrelLength: 700, twistRate: 18, regPressure: 110, fillPressure: 230, powerSetting: 'External regulator', defaultSightHeight: 45, defaultZeroRange: 40, notes: '.22/.25/.30 · Smooth Twist X · Slug-ready' },
  { brand: 'FX', model: 'Dreamline Lite', caliber: '.22', barrelLength: 500, twistRate: 16, regPressure: 110, fillPressure: 230, powerSetting: 'Power wheel', defaultSightHeight: 40, defaultZeroRange: 30, notes: '.177/.22/.25 · Mag 18/16/13 · Tube 480cc · Modulaire' },
  { brand: 'FX', model: 'Dreamline Classic', caliber: '.22', barrelLength: 600, twistRate: 16, regPressure: 110, fillPressure: 250, powerSetting: 'Power wheel + reg', defaultSightHeight: 42, defaultZeroRange: 35, notes: '.177/.22/.25/.30 · Crosse bois traditionnelle' },
  { brand: 'FX', model: 'Dreamline Tactical', caliber: '.22', barrelLength: 600, twistRate: 16, regPressure: 110, fillPressure: 250, powerSetting: 'Power wheel + reg', defaultSightHeight: 45, defaultZeroRange: 35, notes: '.177/.22/.25/.30 · Crosse AR-style ajustable' },
  { brand: 'FX', model: 'Wildcat MKIII Compact', caliber: '.22', barrelLength: 500, twistRate: 16, regPressure: 100, fillPressure: 230, powerSetting: 'Hammer spring adj.', defaultSightHeight: 40, defaultZeroRange: 30, notes: '.177/.22/.25 · Mag 18/16/13 · Bullpup · Tube 480cc' },
  { brand: 'FX', model: 'Wildcat MKIII Sniper', caliber: '.25', barrelLength: 700, twistRate: 18, regPressure: 100, fillPressure: 230, powerSetting: 'Hammer spring adj.', defaultSightHeight: 45, defaultZeroRange: 40, notes: '.22/.25 · Bullpup long range · Slug-ready' },
  { brand: 'FX', model: 'Panthera 500', caliber: '.22', barrelLength: 500, twistRate: 16, regPressure: 110, fillPressure: 250, powerSetting: 'Power wheel + dual reg', defaultSightHeight: 45, defaultZeroRange: 30, notes: '.22/.25/.30 · Mag 21/18/16 · Race-style · Bottle 580cc' },
  { brand: 'FX', model: 'Panthera 700', caliber: '.30', barrelLength: 700, twistRate: 18, regPressure: 110, fillPressure: 250, powerSetting: 'Power wheel + dual reg', defaultSightHeight: 50, defaultZeroRange: 40, notes: '.22/.25/.30 · Long range / EBR · Slug-ready' },

  // ============================================================
  // DAYSTATE (UK)
  // ============================================================
  { brand: 'Daystate', model: 'Red Wolf Hi-Lite', caliber: '.22', barrelLength: 600, twistRate: 16, regPressure: 100, fillPressure: 230, powerSetting: 'Electronic MCT', defaultSightHeight: 42, defaultZeroRange: 35, notes: '.177/.22/.25 · Mag 13/11/10 · Lothar Walther · Crosse laminée' },
  { brand: 'Daystate', model: 'Delta Wolf Standard', caliber: '.22', barrelLength: 600, twistRate: 16, regPressure: 100, fillPressure: 230, powerSetting: 'Electronic Adjustable Velocity', defaultSightHeight: 45, defaultZeroRange: 35, notes: '.177/.22/.25/.30 · Mag 13/11/10/9 · Bottle 480cc · MCT électronique' },
  { brand: 'Daystate', model: 'Delta Wolf Compact', caliber: '.22', barrelLength: 480, twistRate: 16, regPressure: 100, fillPressure: 230, powerSetting: 'Electronic AV', defaultSightHeight: 42, defaultZeroRange: 30, notes: '.177/.22/.25 · Mag 13/11/10 · Canon court' },
  { brand: 'Daystate', model: 'Pulsar Synthetic', caliber: '.22', barrelLength: 430, twistRate: 16, regPressure: 100, fillPressure: 230, powerSetting: 'Electronic MCT', defaultSightHeight: 45, defaultZeroRange: 30, notes: '.177/.22/.25 · Bullpup · Mag 13/11/10 · Tube 250cc' },
  { brand: 'Daystate', model: 'Renegade HP', caliber: '.25', barrelLength: 600, twistRate: 18, regPressure: 110, fillPressure: 250, powerSetting: 'Mechanical reg', defaultSightHeight: 45, defaultZeroRange: 40, notes: '.22/.25/.30 · Mag 11/10/8 · Bottle 480cc · High Power' },
  { brand: 'Daystate', model: 'Air Ranger', caliber: '.30', barrelLength: 600, twistRate: 18, regPressure: 110, fillPressure: 250, powerSetting: 'Mechanical reg', defaultSightHeight: 50, defaultZeroRange: 40, notes: '.25/.30/.303 · Hunting big bore · Bottle 480cc' },
  { brand: 'Daystate', model: 'Huntsman Revere', caliber: '.22', barrelLength: 430, twistRate: 16, regPressure: 100, fillPressure: 200, powerSetting: 'Mechanical reg', defaultSightHeight: 40, defaultZeroRange: 30, notes: '.177/.22/.25 · Mag 10/10/10 · Sporter classique bois' },
  { brand: 'Daystate', model: 'Wolverine R HiLite', caliber: '.25', barrelLength: 600, twistRate: 18, regPressure: 110, fillPressure: 250, powerSetting: 'Mechanical reg', defaultSightHeight: 45, defaultZeroRange: 40, notes: '.22/.25/.30 · Mag 11/10/8 · Bottle 480cc' },

  // ============================================================
  // AIR ARMS (UK)
  // ============================================================
  { brand: 'Air Arms', model: 'S510 Ultimate Sporter XS', caliber: '.22', barrelLength: 495, twistRate: 16, regPressure: 110, fillPressure: 232, powerSetting: 'Mechanical reg', defaultSightHeight: 40, defaultZeroRange: 30, notes: '.177/.22 · Mag 10 · Lothar Walther · Crosse laminée bleue' },
  { brand: 'Air Arms', model: 'S510 TC Carbine', caliber: '.22', barrelLength: 380, twistRate: 16, regPressure: 110, fillPressure: 232, powerSetting: 'Non-régulé', defaultSightHeight: 40, defaultZeroRange: 25, notes: '.177/.22 · Mag 10 · Compact bois noyer' },
  { brand: 'Air Arms', model: 'S400 MPR FT', caliber: '.177', barrelLength: 495, twistRate: 16, regPressure: 100, fillPressure: 200, powerSetting: 'Match FT', defaultSightHeight: 90, defaultZeroRange: 50, notes: '.177 · Single shot · Field Target dédié' },
  { brand: 'Air Arms', model: 'FTP 900', caliber: '.177', barrelLength: 600, twistRate: 16, regPressure: 100, fillPressure: 200, powerSetting: 'Match FT régulé', defaultSightHeight: 100, defaultZeroRange: 50, notes: '.177 · Single shot · Top tier FT compétition' },
  { brand: 'Air Arms', model: 'Galahad R Walnut', caliber: '.22', barrelLength: 460, twistRate: 16, regPressure: 110, fillPressure: 232, powerSetting: 'Mechanical reg', defaultSightHeight: 45, defaultZeroRange: 30, notes: '.177/.22/.25 · Bullpup · Mag 10 · Bois noyer' },
  { brand: 'Air Arms', model: 'S200', caliber: '.177', barrelLength: 350, twistRate: 16, regPressure: 100, fillPressure: 190, powerSetting: 'Non-régulé', defaultSightHeight: 38, defaultZeroRange: 25, notes: '.177/.22 · Mag 10 · Carabine compacte économique' },
  { brand: 'Air Arms', model: 'S510 XS Xtra FAC', caliber: '.25', barrelLength: 600, twistRate: 16, regPressure: 110, fillPressure: 232, powerSetting: 'Mechanical reg', defaultSightHeight: 42, defaultZeroRange: 35, notes: '.22/.25 · FAC version puissance UK · Mag 10/10' },

  // ============================================================
  // BROCOCK (UK)
  // ============================================================
  { brand: 'Brocock', model: 'Sniper XR Magnum', caliber: '.22', barrelLength: 600, twistRate: 16, regPressure: 110, fillPressure: 250, powerSetting: 'Mechanical reg', defaultSightHeight: 42, defaultZeroRange: 35, notes: '.177/.22/.25/.30 · Mag 13 · HuMa reg · Bottle 480cc' },
  { brand: 'Brocock', model: 'Sniper XR HR', caliber: '.25', barrelLength: 600, twistRate: 16, regPressure: 110, fillPressure: 250, powerSetting: 'Mechanical reg', defaultSightHeight: 45, defaultZeroRange: 40, notes: '.22/.25/.30 · High Range · Slug-ready · Bottle 480cc' },
  { brand: 'Brocock', model: 'Ghost Carbine', caliber: '.22', barrelLength: 380, twistRate: 16, regPressure: 100, fillPressure: 230, powerSetting: 'Mechanical reg', defaultSightHeight: 40, defaultZeroRange: 30, notes: '.177/.22 · Bullpup compact · Mag 10' },
  { brand: 'Brocock', model: 'Commander XR', caliber: '.22', barrelLength: 480, twistRate: 16, regPressure: 100, fillPressure: 230, powerSetting: 'Mechanical reg', defaultSightHeight: 42, defaultZeroRange: 30, notes: '.177/.22/.25 · Bullpup · Mag 10/10/10 · Bottle 250cc' },
  { brand: 'Brocock', model: 'Concept XR', caliber: '.22', barrelLength: 480, twistRate: 16, regPressure: 100, fillPressure: 230, powerSetting: 'Mechanical reg', defaultSightHeight: 42, defaultZeroRange: 30, notes: '.177/.22/.25 · Sporter classique · Mag 10' },
  { brand: 'Brocock', model: 'Bantam Sniper HR', caliber: '.22', barrelLength: 600, twistRate: 16, regPressure: 110, fillPressure: 250, powerSetting: 'Mechanical reg', defaultSightHeight: 45, defaultZeroRange: 35, notes: '.22/.25 · Mag 10 · Bottle 480cc · High Range' },

  // ============================================================
  // HATSAN (Turkey)
  // ============================================================
  { brand: 'Hatsan', model: 'Flash QE', caliber: '.22', barrelLength: 470, twistRate: 16, regPressure: 100, fillPressure: 200, powerSetting: 'Non-régulé', defaultSightHeight: 40, defaultZeroRange: 30, notes: '.177/.22/.25 · Mag 14/12/10 · Quiet Energy · Tube 250cc' },
  { brand: 'Hatsan', model: 'FlashPup QE', caliber: '.22', barrelLength: 320, twistRate: 16, regPressure: 100, fillPressure: 200, powerSetting: 'Non-régulé', defaultSightHeight: 40, defaultZeroRange: 25, notes: '.177/.22/.25 · Bullpup · Mag 14/12/10 · Compact' },
  { brand: 'Hatsan', model: 'Hercules', caliber: '.30', barrelLength: 685, twistRate: 18, regPressure: 110, fillPressure: 250, powerSetting: 'Non-régulé', defaultSightHeight: 50, defaultZeroRange: 40, notes: '.22/.25/.30/.35/.45 · Big bore · Tube 500cc · Hunting puissant' },
  { brand: 'Hatsan', model: 'Hercules Bully', caliber: '.30', barrelLength: 600, twistRate: 18, regPressure: 110, fillPressure: 250, powerSetting: 'Non-régulé', defaultSightHeight: 50, defaultZeroRange: 40, notes: '.25/.30/.35/.45 · Bullpup big bore · Tube 500cc' },
  { brand: 'Hatsan', model: 'Gladius Long', caliber: '.25', barrelLength: 580, twistRate: 16, regPressure: 100, fillPressure: 200, powerSetting: 'Non-régulé', defaultSightHeight: 45, defaultZeroRange: 35, notes: '.177/.22/.25 · Bullpup · Mag 14/12/10' },
  { brand: 'Hatsan', model: 'BT65 SB Elite', caliber: '.25', barrelLength: 590, twistRate: 16, regPressure: 100, fillPressure: 200, powerSetting: 'Non-régulé', defaultSightHeight: 45, defaultZeroRange: 35, notes: '.177/.22/.25/.30 · Mag 10 · Synthétique tactical' },
  { brand: 'Hatsan', model: 'Sortie Tact', caliber: '.22', barrelLength: 415, twistRate: 16, regPressure: 100, fillPressure: 200, powerSetting: 'Non-régulé', defaultSightHeight: 42, defaultZeroRange: 25, notes: '.177/.22/.25 · Bullpup tactique · Mag semi-auto' },
  { brand: 'Hatsan', model: 'Factor RC', caliber: '.30', barrelLength: 685, twistRate: 18, regPressure: 110, fillPressure: 250, powerSetting: 'Régulé', defaultSightHeight: 50, defaultZeroRange: 40, notes: '.22/.25/.30/.35 · Long range · Tube 500cc' },
  { brand: 'Hatsan', model: 'Hydra', caliber: '.22', barrelLength: 480, twistRate: 16, regPressure: 100, fillPressure: 200, powerSetting: 'Non-régulé', defaultSightHeight: 42, defaultZeroRange: 30, notes: '.177/.22/.25 · Modulaire interchangeable canon/calibre' },

  // ============================================================
  // KRAL ARMS (Turkey)
  // ============================================================
  { brand: 'Kral', model: 'Puncher Breaker Silent', caliber: '.22', barrelLength: 365, twistRate: 16, regPressure: 100, fillPressure: 200, powerSetting: 'Non-régulé', defaultSightHeight: 40, defaultZeroRange: 30, notes: '.177/.22/.25 · Bullpup · Mag 14/12/10 · Modérateur intégré' },
  { brand: 'Kral', model: 'Puncher Breaker W', caliber: '.22', barrelLength: 365, twistRate: 16, regPressure: 100, fillPressure: 200, powerSetting: 'Non-régulé', defaultSightHeight: 40, defaultZeroRange: 30, notes: '.177/.22/.25 · Bullpup bois noyer · Mag 14/12/10' },
  { brand: 'Kral', model: 'Puncher Jumbo', caliber: '.22', barrelLength: 470, twistRate: 16, regPressure: 100, fillPressure: 200, powerSetting: 'Non-régulé', defaultSightHeight: 40, defaultZeroRange: 30, notes: '.177/.22/.25 · Sporter · Mag 14/12/10 · Tube 280cc' },
  { brand: 'Kral', model: 'Puncher Jumbo NP-02', caliber: '.22', barrelLength: 470, twistRate: 16, regPressure: 110, fillPressure: 200, powerSetting: 'Régulé', defaultSightHeight: 40, defaultZeroRange: 30, notes: '.177/.22/.25 · Sporter régulé · Crosse synthétique' },
  { brand: 'Kral', model: 'Puncher Knight', caliber: '.22', barrelLength: 500, twistRate: 16, regPressure: 100, fillPressure: 200, powerSetting: 'Non-régulé', defaultSightHeight: 40, defaultZeroRange: 30, notes: '.177/.22/.25 · Sporter · Mag 14/12/10 · Crosse bois' },
  { brand: 'Kral', model: 'Puncher Maxi 3', caliber: '.25', barrelLength: 500, twistRate: 16, regPressure: 100, fillPressure: 200, powerSetting: 'Non-régulé', defaultSightHeight: 42, defaultZeroRange: 35, notes: '.177/.22/.25 · Sporter long · Mag 14/12/10' },
  { brand: 'Kral', model: 'Puncher Mega', caliber: '.25', barrelLength: 500, twistRate: 16, regPressure: 110, fillPressure: 200, powerSetting: 'Non-régulé', defaultSightHeight: 42, defaultZeroRange: 35, notes: '.22/.25/.30 · Tube 500cc · Big bore léger' },

  // ============================================================
  // REXIMEX (Turkey)
  // ============================================================
  { brand: 'Reximex', model: 'Throne 2', caliber: '.22', barrelLength: 500, twistRate: 16, regPressure: 100, fillPressure: 200, powerSetting: 'Régulé', defaultSightHeight: 40, defaultZeroRange: 30, notes: '.177/.22/.25 · Mag 14/12/9 · Sporter régulé · Tube 280cc' },
  { brand: 'Reximex', model: 'Tormenta', caliber: '.22', barrelLength: 510, twistRate: 16, regPressure: 100, fillPressure: 200, powerSetting: 'Non-régulé', defaultSightHeight: 40, defaultZeroRange: 30, notes: '.177/.22/.25/.30 · Mag 14/12/9/8 · Sporter polyvalent' },
  { brand: 'Reximex', model: 'Apex', caliber: '.22', barrelLength: 500, twistRate: 16, regPressure: 110, fillPressure: 250, powerSetting: 'Régulé', defaultSightHeight: 40, defaultZeroRange: 30, notes: '.22/.25/.30 · Régulé HuMa · Tube 480cc · Bois laminé' },
  { brand: 'Reximex', model: 'Mito', caliber: '.22', barrelLength: 380, twistRate: 16, regPressure: 100, fillPressure: 200, powerSetting: 'Non-régulé', defaultSightHeight: 40, defaultZeroRange: 25, notes: '.177/.22/.25 · Bullpup compact · Mag 14/12/9' },
  { brand: 'Reximex', model: 'RP Pistol', caliber: '.22', barrelLength: 250, twistRate: 16, regPressure: 100, fillPressure: 200, powerSetting: 'Non-régulé', defaultSightHeight: 30, defaultZeroRange: 15, notes: '.177/.22/.25 · Pistolet PCP · Mag 14/12/9' },
  { brand: 'Reximex', model: 'Daystar', caliber: '.25', barrelLength: 500, twistRate: 16, regPressure: 110, fillPressure: 250, powerSetting: 'Régulé', defaultSightHeight: 42, defaultZeroRange: 35, notes: '.22/.25/.30 · Régulé · Tube 500cc · Long range' },

  // ============================================================
  // ARTEMIS / SPA (China)
  // ============================================================
  { brand: 'Artemis', model: 'PR900W Gen2', caliber: '.22', barrelLength: 500, twistRate: 16, regPressure: 100, fillPressure: 200, powerSetting: 'Non-régulé', defaultSightHeight: 40, defaultZeroRange: 25, notes: '.177/.22 · Mag 9 · Sporter économique · Tube 200cc' },
  { brand: 'Artemis', model: 'P15', caliber: '.22', barrelLength: 360, twistRate: 16, regPressure: 100, fillPressure: 200, powerSetting: 'Non-régulé', defaultSightHeight: 40, defaultZeroRange: 25, notes: '.177/.22 · Bullpup compact · Mag 11/10' },
  { brand: 'Artemis', model: 'P35 Plus', caliber: '.22', barrelLength: 480, twistRate: 16, regPressure: 100, fillPressure: 200, powerSetting: 'Non-régulé', defaultSightHeight: 40, defaultZeroRange: 30, notes: '.177/.22/.25 · Bullpup · Mag 11/10/9 · Tube 350cc' },
  { brand: 'Artemis', model: 'M30', caliber: '.22', barrelLength: 480, twistRate: 16, regPressure: 100, fillPressure: 200, powerSetting: 'Non-régulé', defaultSightHeight: 40, defaultZeroRange: 30, notes: '.177/.22/.25 · Sporter · Mag 11/10/9' },
  { brand: 'Artemis', model: 'M16A', caliber: '.22', barrelLength: 380, twistRate: 16, regPressure: 100, fillPressure: 200, powerSetting: 'Non-régulé', defaultSightHeight: 45, defaultZeroRange: 25, notes: '.177/.22 · AR-style · Mag 10' },

  // ============================================================
  // BENJAMIN / CROSMAN (USA)
  // ============================================================
  { brand: 'Benjamin', model: 'Marauder Synthetic Gen2', caliber: '.22', barrelLength: 510, twistRate: 16, regPressure: 100, fillPressure: 207, powerSetting: 'Hammer/transfer adj.', defaultSightHeight: 40, defaultZeroRange: 30, notes: '.177/.22/.25 · Mag 10/10/8 · Choked barrel · Tube 215cc' },
  { brand: 'Benjamin', model: 'Marauder Wood Gen2', caliber: '.25', barrelLength: 510, twistRate: 16, regPressure: 100, fillPressure: 207, powerSetting: 'Hammer/transfer adj.', defaultSightHeight: 40, defaultZeroRange: 35, notes: '.177/.22/.25 · Mag 10/10/8 · Bois · Choked' },
  { brand: 'Benjamin', model: 'Marauder Pistol', caliber: '.22', barrelLength: 305, twistRate: 16, regPressure: 100, fillPressure: 207, powerSetting: 'Non-régulé', defaultSightHeight: 30, defaultZeroRange: 20, notes: '.22 · Pistolet/carbine kit · Mag 8' },
  { brand: 'Benjamin', model: 'Bulldog .357', caliber: '.357', barrelLength: 460, twistRate: 18, regPressure: 207, fillPressure: 207, powerSetting: 'Non-régulé', defaultSightHeight: 50, defaultZeroRange: 50, notes: '.357 (9mm) · Big bore bullpup · Mag 5 · Hunting gros gibier' },
  { brand: 'Benjamin', model: 'Akela', caliber: '.22', barrelLength: 510, twistRate: 16, regPressure: 100, fillPressure: 207, powerSetting: 'Hammer adj.', defaultSightHeight: 40, defaultZeroRange: 30, notes: '.22/.25 · Bullpup bois · Mag 10/8' },
  { brand: 'Crosman', model: 'Challenger PCP', caliber: '.177', barrelLength: 530, twistRate: 16, regPressure: 100, fillPressure: 207, powerSetting: 'Non-régulé', defaultSightHeight: 60, defaultZeroRange: 10, notes: '.177 · Single shot · 10m match air rifle' },

  // ============================================================
  // AEA (USA / China design)
  // ============================================================
  { brand: 'AEA', model: 'Challenger', caliber: '.25', barrelLength: 600, twistRate: 18, regPressure: 110, fillPressure: 250, powerSetting: 'Régulé HuMa', defaultSightHeight: 45, defaultZeroRange: 40, notes: '.22/.25/.30/.357 · Mag 7 · Bullpup high power · Tube 480cc · Slug-ready' },
  { brand: 'AEA', model: 'Challenger Carbine', caliber: '.25', barrelLength: 480, twistRate: 18, regPressure: 110, fillPressure: 250, powerSetting: 'Régulé HuMa', defaultSightHeight: 42, defaultZeroRange: 35, notes: '.22/.25/.30 · Bullpup compact · Mag 7' },
  { brand: 'AEA', model: 'HP SS', caliber: '.25', barrelLength: 685, twistRate: 18, regPressure: 110, fillPressure: 250, powerSetting: 'Régulé', defaultSightHeight: 45, defaultZeroRange: 40, notes: '.22/.25/.30/.357 · Sporter long range · Mag 9' },
  { brand: 'AEA', model: 'Zeus .72', caliber: '.72', barrelLength: 685, twistRate: 22, regPressure: 240, fillPressure: 300, powerSetting: 'Régulé', defaultSightHeight: 60, defaultZeroRange: 50, notes: '.72 (18mm) · Big bore · Mag 4 · Hunting très gros gibier' },
  { brand: 'AEA', model: 'Terminator', caliber: '.25', barrelLength: 685, twistRate: 18, regPressure: 110, fillPressure: 250, powerSetting: 'Régulé', defaultSightHeight: 50, defaultZeroRange: 45, notes: '.25/.30/.357 · Long range slug · Tube 580cc' },

  // ============================================================
  // WESTERN AIRGUNS (USA)
  // ============================================================
  { brand: 'Western Airguns', model: 'Rattler X .25', caliber: '.25', barrelLength: 600, twistRate: 18, regPressure: 110, fillPressure: 250, powerSetting: 'Régulé', defaultSightHeight: 45, defaultZeroRange: 40, notes: '.25/.30/.35/.45 · Lever action · Tube 580cc · Slug-ready' },
  { brand: 'Western Airguns', model: 'Sidewinder', caliber: '.25', barrelLength: 600, twistRate: 18, regPressure: 110, fillPressure: 250, powerSetting: 'Régulé', defaultSightHeight: 45, defaultZeroRange: 40, notes: '.25/.30 · Tactical bullpup' },

  // ============================================================
  // UMAREX (Germany / USA)
  // ============================================================
  { brand: 'Umarex', model: 'Gauntlet 2', caliber: '.22', barrelLength: 711, twistRate: 16, regPressure: 110, fillPressure: 250, powerSetting: 'Régulé', defaultSightHeight: 42, defaultZeroRange: 35, notes: '.177/.22/.25 · Mag 10 · Bottle 580cc · Régulé économique' },
  { brand: 'Umarex', model: 'Gauntlet SL30', caliber: '.30', barrelLength: 711, twistRate: 18, regPressure: 110, fillPressure: 250, powerSetting: 'Régulé', defaultSightHeight: 50, defaultZeroRange: 40, notes: '.30 · Slug-ready · Tube 580cc · Long range abordable' },
  { brand: 'Umarex', model: 'Origin', caliber: '.22', barrelLength: 600, twistRate: 16, regPressure: 100, fillPressure: 250, powerSetting: 'Non-régulé', defaultSightHeight: 40, defaultZeroRange: 30, notes: '.22 · Pompe HPP intégrable · Mag 10 · Tube 215cc' },
  { brand: 'Umarex', model: 'Hammer', caliber: '.50', barrelLength: 736, twistRate: 22, regPressure: 320, fillPressure: 320, powerSetting: 'Régulé', defaultSightHeight: 60, defaultZeroRange: 60, notes: '.50 · Big bore hunting · Mag 2 · 700+ FPE' },
  { brand: 'Umarex', model: 'Notos', caliber: '.22', barrelLength: 220, twistRate: 16, regPressure: 100, fillPressure: 250, powerSetting: 'Régulé', defaultSightHeight: 35, defaultZeroRange: 20, notes: '.22 · Carbine ultra-compact · Mag 7 · Tube 100cc' },

  // ============================================================
  // SNOWPEAK / ARTEMIS (China)
  // ============================================================
  { brand: 'Snowpeak', model: 'M25', caliber: '.22', barrelLength: 470, twistRate: 16, regPressure: 100, fillPressure: 200, powerSetting: 'Non-régulé', defaultSightHeight: 40, defaultZeroRange: 30, notes: '.177/.22/.25 · Mag 10 · Sporter compact · Tube 280cc' },
  { brand: 'Snowpeak', model: 'M30', caliber: '.22', barrelLength: 480, twistRate: 16, regPressure: 100, fillPressure: 200, powerSetting: 'Non-régulé', defaultSightHeight: 40, defaultZeroRange: 30, notes: '.177/.22/.25 · Mag 11/10/9 · Sporter polyvalent' },
  { brand: 'Snowpeak', model: 'M40', caliber: '.22', barrelLength: 535, twistRate: 16, regPressure: 110, fillPressure: 250, powerSetting: 'Régulé', defaultSightHeight: 42, defaultZeroRange: 35, notes: '.177/.22/.25 · Régulé · Tube 480cc · Long range entry' },
  { brand: 'Snowpeak', model: 'M50', caliber: '.25', barrelLength: 600, twistRate: 16, regPressure: 110, fillPressure: 250, powerSetting: 'Régulé', defaultSightHeight: 45, defaultZeroRange: 40, notes: '.22/.25/.30 · Régulé · Tube 580cc · Slug-capable' },
  { brand: 'Snowpeak', model: 'P35', caliber: '.22', barrelLength: 480, twistRate: 16, regPressure: 100, fillPressure: 200, powerSetting: 'Non-régulé', defaultSightHeight: 40, defaultZeroRange: 30, notes: '.177/.22/.25 · Bullpup · Mag 11/10/9 · Tube 350cc' },
  { brand: 'Snowpeak', model: 'P15', caliber: '.22', barrelLength: 360, twistRate: 16, regPressure: 100, fillPressure: 200, powerSetting: 'Non-régulé', defaultSightHeight: 40, defaultZeroRange: 25, notes: '.177/.22 · Bullpup compact · Mag 11/10' },

  // ============================================================
  // KALIBRGUN (Cricket — Czech Republic)
  // ============================================================
  { brand: 'Kalibrgun', model: 'Cricket II Standard', caliber: '.22', barrelLength: 470, twistRate: 16, regPressure: 110, fillPressure: 250, powerSetting: 'Régulé', defaultSightHeight: 42, defaultZeroRange: 30, notes: '.177/.22/.25/.30 · Bullpup · Mag 14/12/10/8 · Tube 480cc' },
  { brand: 'Kalibrgun', model: 'Cricket II Tactical WB', caliber: '.25', barrelLength: 600, twistRate: 16, regPressure: 110, fillPressure: 250, powerSetting: 'Régulé', defaultSightHeight: 45, defaultZeroRange: 40, notes: '.22/.25 · Bullpup tactique · Crosse bois · Mag 12/10' },
  { brand: 'Kalibrgun', model: 'Cricket II Compact', caliber: '.22', barrelLength: 380, twistRate: 16, regPressure: 110, fillPressure: 250, powerSetting: 'Régulé', defaultSightHeight: 42, defaultZeroRange: 25, notes: '.177/.22/.25 · Bullpup ultra-compact · Mag 14/12/10' },
  { brand: 'Kalibrgun', model: 'Argus 60W', caliber: '.22', barrelLength: 600, twistRate: 16, regPressure: 110, fillPressure: 250, powerSetting: 'Régulé', defaultSightHeight: 42, defaultZeroRange: 35, notes: '.177/.22/.25/.30 · Sporter · Lothar Walther · Tube 480cc' },
  { brand: 'Kalibrgun', model: 'Cricket II Marksman', caliber: '.25', barrelLength: 600, twistRate: 16, regPressure: 110, fillPressure: 250, powerSetting: 'Régulé', defaultSightHeight: 50, defaultZeroRange: 40, notes: '.22/.25 · Bullpup long range · Slug-ready' },
];

/** Stable identity key for duplicate detection. */
export function seedAirgunKey(a: Pick<SeedAirgun, 'brand' | 'model' | 'caliber'>): string {
  return `${a.brand}|${a.model}|${a.caliber}`.toLowerCase();
}
