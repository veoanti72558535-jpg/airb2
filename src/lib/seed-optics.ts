import { Optic } from './types';

/**
 * Seed dataset for popular PCP airgun scopes.
 * Data sourced from manufacturer websites & retailers.
 * - `clickValue` / `clickUnit` reflect documented turret adjustments.
 * - `tubeDiameter` (mm) per manufacturer spec (25.4 / 30 / 34).
 * - `magCalibration` (x) is the magnification at which a SFP reticle's
 *   mil/MOA subtensions are accurate. FFP scopes are calibrated at any zoom
 *   so the field is left undefined.
 * - `mountHeight` is a typical low-mount value — adjust per setup.
 */
export type SeedOptic = Omit<Optic, 'id' | 'createdAt' | 'updatedAt'>;

export const SEED_OPTICS: SeedOptic[] = [
  // ============ FX AIRGUNS ============
  {
    name: 'FX 3-12×44 IR AO (1")',
    type: 'scope',
    clickUnit: 'MOA',
    clickValue: 0.25,
    mountHeight: 38,
    tubeDiameter: 25.4,
    magCalibration: 10,
    notes: 'SFP · Tube 25.4mm · Parallaxe 30yd-∞ · Réticule lumineux rouge',
  },
  {
    name: 'FX 6-18×44 SF IR (30mm)',
    type: 'scope',
    clickUnit: 'MOA',
    clickValue: 0.25,
    mountHeight: 40,
    tubeDiameter: 30,
    magCalibration: 12,
    notes: 'SFP · Tube 30mm · Side focus · Réticule lumineux',
  },

  // ============ ELEMENT OPTICS — HELIX ============
  { name: 'Element Helix 2-16×50 SFP (APR-1C MOA)', type: 'scope', clickUnit: 'MOA', clickValue: 0.25, mountHeight: 40, tubeDiameter: 30, magCalibration: 16, notes: 'SFP · Tube 30mm · MOA' },
  { name: 'Element Helix 2-16×50 SFP (APR-1C MRAD)', type: 'scope', clickUnit: 'MRAD', clickValue: 0.1, mountHeight: 40, tubeDiameter: 30, magCalibration: 16, notes: 'SFP · Tube 30mm · MRAD' },
  { name: 'Element Helix 4-16×44 FFP (APR-1C MOA)', type: 'scope', clickUnit: 'MOA', clickValue: 0.25, mountHeight: 40, tubeDiameter: 30, notes: 'FFP · Tube 30mm' },
  { name: 'Element Helix 4-16×44 FFP (APR-1C MRAD)', type: 'scope', clickUnit: 'MRAD', clickValue: 0.1, mountHeight: 40, tubeDiameter: 30, notes: 'FFP · Tube 30mm' },
  { name: 'Element Helix 6-24×50 SFP (APR-1C MOA)', type: 'scope', clickUnit: 'MOA', clickValue: 0.25, mountHeight: 42, tubeDiameter: 30, magCalibration: 24, notes: 'SFP · Tube 30mm · 1/4 MOA' },
  { name: 'Element Helix 6-24×50 SFP (EHR-1C MOA)', type: 'scope', clickUnit: 'MOA', clickValue: 0.25, mountHeight: 42, tubeDiameter: 30, magCalibration: 24, notes: 'SFP · Réticule EHR-1C airgun' },
  { name: 'Element Helix 6-24×50 FFP (APR-2D MOA)', type: 'scope', clickUnit: 'MOA', clickValue: 0.25, mountHeight: 42, tubeDiameter: 30, notes: 'FFP · Tube 30mm' },
  { name: 'Element Helix 6-24×50 FFP (APR-2D MRAD)', type: 'scope', clickUnit: 'MRAD', clickValue: 0.1, mountHeight: 42, tubeDiameter: 30, notes: 'FFP · Tube 30mm' },
  { name: 'Element Helix Gen 2 6-24×50 SFP', type: 'scope', clickUnit: 'MOA', clickValue: 0.25, mountHeight: 42, tubeDiameter: 30, magCalibration: 24, notes: 'Gen 2 · SFP · Zero stop · Tool-free turrets' },

  // ============ ELEMENT OPTICS — TITAN ============
  { name: 'Element Titan 5-25×56 FFP (APR-2D MOA)', type: 'scope', clickUnit: 'MOA', clickValue: 0.25, mountHeight: 45, tubeDiameter: 34, notes: 'FFP · Tube 34mm · Zero stop' },
  { name: 'Element Titan 5-25×56 FFP (APR-2D MRAD)', type: 'scope', clickUnit: 'MRAD', clickValue: 0.1, mountHeight: 45, tubeDiameter: 34, notes: 'FFP · Tube 34mm · Zero stop' },
  { name: 'Element Titan 3-18×50 FFP (MOA)', type: 'scope', clickUnit: 'MOA', clickValue: 0.25, mountHeight: 42, tubeDiameter: 34, notes: 'FFP · Tube 34mm' },
  { name: 'Element Titan 3-18×50 FFP (MRAD)', type: 'scope', clickUnit: 'MRAD', clickValue: 0.1, mountHeight: 42, tubeDiameter: 34, notes: 'FFP · Tube 34mm' },

  // ============ ELEMENT OPTICS — NEXUS ============
  { name: 'Element Nexus 5-20×50 FFP (APR-2D MOA)', type: 'scope', clickUnit: 'MOA', clickValue: 0.25, mountHeight: 42, tubeDiameter: 34, notes: 'FFP · Tube 34mm · Zero stop' },
  { name: 'Element Nexus 5-20×50 FFP (APR-2D MRAD)', type: 'scope', clickUnit: 'MRAD', clickValue: 0.1, mountHeight: 42, tubeDiameter: 34, notes: 'FFP · Tube 34mm · Zero stop' },
  { name: 'Element Nexus Gen 2 5-20×50 FFP', type: 'scope', clickUnit: 'MRAD', clickValue: 0.1, mountHeight: 42, tubeDiameter: 34, notes: 'Gen 2 · FFP · Tube 34mm' },

  // ============ DISCOVERY OPTICS ============
  { name: 'Discovery VT-1 4-16×44 AOE', type: 'scope', clickUnit: 'MOA', clickValue: 0.25, mountHeight: 38, tubeDiameter: 25.4, magCalibration: 16, notes: 'SFP · Tube 25.4mm · 1/4 MOA' },
  { name: 'Discovery VT-2 4-16×44 SFIR', type: 'scope', clickUnit: 'MOA', clickValue: 0.25, mountHeight: 40, tubeDiameter: 30, magCalibration: 16, notes: 'SFP · Tube 30mm · Side focus IR' },
  { name: 'Discovery VT-3 4-16×44 FFP', type: 'scope', clickUnit: 'MOA', clickValue: 0.25, mountHeight: 40, tubeDiameter: 30, notes: 'FFP · Tube 30mm' },
  { name: 'Discovery VT-3 4-16×50 SFAI', type: 'scope', clickUnit: 'MOA', clickValue: 0.25, mountHeight: 42, tubeDiameter: 30, magCalibration: 16, notes: 'SFP · Tube 30mm · IR' },
  { name: 'Discovery VT-3 6-24×50 SFIR', type: 'scope', clickUnit: 'MOA', clickValue: 0.25, mountHeight: 42, tubeDiameter: 30, magCalibration: 24, notes: 'SFP · Tube 30mm' },
  { name: 'Discovery VT-Z 5-30×56 SFIR', type: 'scope', clickUnit: 'MOA', clickValue: 0.125, mountHeight: 45, tubeDiameter: 30, magCalibration: 30, notes: 'SFP · Tube 30mm · 1/8 MOA' },
  { name: 'Discovery HD 5-30×56 SFIR FFP (MOA)', type: 'scope', clickUnit: 'MOA', clickValue: 0.25, mountHeight: 45, tubeDiameter: 30, notes: 'FFP · Tube 30mm · HD glass · Zero stop' },
  { name: 'Discovery HD 5-30×56 SFIR FFP (MRAD)', type: 'scope', clickUnit: 'MRAD', clickValue: 0.1, mountHeight: 45, tubeDiameter: 30, notes: 'FFP · Tube 30mm · HD glass · Zero stop' },
  { name: 'Discovery HD-GEN2 4-16×44 SFIR FFP', type: 'scope', clickUnit: 'MRAD', clickValue: 0.1, mountHeight: 40, tubeDiameter: 30, notes: 'FFP · Tube 30mm · HD GEN 2' },
  { name: 'Discovery ED 3-15×50 SFIR FFP', type: 'scope', clickUnit: 'MRAD', clickValue: 0.1, mountHeight: 42, tubeDiameter: 30, notes: 'FFP · Tube 30mm · ED glass · Zero stop' },
  { name: 'Discovery ED 4-20×50 SFIR FFP', type: 'scope', clickUnit: 'MRAD', clickValue: 0.1, mountHeight: 42, tubeDiameter: 30, notes: 'FFP · Tube 30mm · ED glass · Zero stop' },
  { name: 'Discovery ED 5-25×56 SFIR FFP', type: 'scope', clickUnit: 'MRAD', clickValue: 0.1, mountHeight: 45, tubeDiameter: 30, notes: 'FFP · Tube 30mm · ED glass' },
  { name: 'Discovery ED-PRS Gen II 5-25×56 SFIR FFP', type: 'scope', clickUnit: 'MRAD', clickValue: 0.1, mountHeight: 48, tubeDiameter: 34, notes: 'FFP · Tube 34mm · ED-PRS · Zero stop' },

  // ============ PARD ============
  {
    name: 'Pard NV-S 4K 470 (CL)',
    type: 'scope',
    clickUnit: 'MOA',
    clickValue: 1,
    mountHeight: 45,
    tubeDiameter: 30,
    notes: 'Vision nocturne digitale 4K · Réglage logiciel par pixel (1 MOA approx) · Réticule numérique',
  },
  {
    name: 'Pard NV008 SP3',
    type: 'scope',
    clickUnit: 'MOA',
    clickValue: 1,
    mountHeight: 45,
    tubeDiameter: 30,
    notes: 'Vision nocturne digitale · Day & Night · Réglage logiciel par pixel · Réticule numérique',
  },

  // ============ MTC OPTICS ============
  { name: 'MTC Viper Pro 5-30×50 FFP (SCB2)', type: 'scope', clickUnit: 'MRAD', clickValue: 0.1, mountHeight: 42, tubeDiameter: 30, notes: 'FFP · Tube 30mm · Réticule SCB2 illuminé' },
  { name: 'MTC Viper Pro Tactical 5-30×50 FFP', type: 'scope', clickUnit: 'MRAD', clickValue: 0.1, mountHeight: 42, tubeDiameter: 30, notes: 'FFP · Tube 30mm · Tactical turrets' },
  { name: 'MTC Viper Connect 3-12×32 (AMD)', type: 'scope', clickUnit: 'MOA', clickValue: 0.25, mountHeight: 30, tubeDiameter: 30, magCalibration: 10, notes: 'SFP · Tube 30mm · Eye-relief court · PA 10yd · AMD calibré 10×' },
  { name: 'MTC Viper Connect 4-16×32 (AMD2)', type: 'scope', clickUnit: 'MOA', clickValue: 0.25, mountHeight: 30, tubeDiameter: 30, magCalibration: 10, notes: 'SFP · Tube 30mm · Réticule AMD2 illuminé · Calibré 10×' },
  { name: 'MTC Cobra F1 4-16×50 FFP', type: 'scope', clickUnit: 'MOA', clickValue: 0.25, mountHeight: 40, tubeDiameter: 30, notes: 'FFP · Tube 30mm · Glass etched' },
  { name: 'MTC King Cobra F1 4-16×50 FFP', type: 'scope', clickUnit: 'MRAD', clickValue: 0.1, mountHeight: 42, tubeDiameter: 30, notes: 'FFP · Tube 30mm · Tactical turrets' },
  { name: 'MTC King Cobra F2 4-16×50 SFP', type: 'scope', clickUnit: 'MRAD', clickValue: 0.1, mountHeight: 42, tubeDiameter: 30, magCalibration: 10, notes: 'SFP · Tube 30mm · Réticule calibré 10×' },
  { name: 'MTC Copperhead F2 4-16×44 SFP', type: 'scope', clickUnit: 'MOA', clickValue: 0.25, mountHeight: 40, tubeDiameter: 30, magCalibration: 10, notes: 'SFP · Tube 30mm · AMD reticle calibré 10×' },
  { name: 'MTC Copperhead Safari F2 4-16×44 SFP', type: 'scope', clickUnit: 'MOA', clickValue: 0.25, mountHeight: 40, tubeDiameter: 30, magCalibration: 10, notes: 'SFP · Tube 30mm · Tan finish · Calibré 10×' },
  { name: 'MTC SWAT 30 Prismatic 12×50', type: 'scope', clickUnit: 'MRAD', clickValue: 0.1, mountHeight: 40, tubeDiameter: 30, magCalibration: 12, notes: 'Prismatic · Fixe 12× · Tube 30mm' },
  { name: 'MTC Mamba Lite 3-12×32', type: 'scope', clickUnit: 'MOA', clickValue: 0.25, mountHeight: 35, tubeDiameter: 25.4, magCalibration: 10, notes: 'Compact · SFP · Tube 25.4mm · Calibré 10×' },
];
