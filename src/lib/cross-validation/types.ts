/**
 * Cross-validation — BUILD-A.
 *
 * Format pivot pour confronter le moteur AirBallistik à des références
 * externes (ChairGun / ChairGun Elite / Strelok / Strelok Pro / MERO,
 * + une source `auxiliary` neutre pour bootstrap).
 *
 * Cette tranche n'introduit AUCUNE comparaison numérique : elle pose
 * uniquement le contrat de données. Le runner comparatif (BUILD-B) et
 * la génération de rapport (BUILD-D) consommeront ces types tels quels.
 *
 * Règles d'or :
 *  - aucune référence externe n'est traitée comme oracle absolu ;
 *  - chaque ligne porte sa source + son niveau de confiance ;
 *  - aucune valeur n'est inventée à la lecture (le loader est honnête,
 *    pas magique) ;
 *  - rétro-compatible avec les inputs de `truth-set.ts` (réutilise
 *    `BallisticInput`, pas de duplication).
 */

import type { BallisticInput } from '@/lib/types';

/**
 * Sources externes admises. Liste fermée pour éviter les fautes de frappe
 * silencieuses dans les fixtures. `auxiliary` = source neutre (JBM web,
 * publication, table industrielle) utilisée principalement pour bootstrap
 * du pipeline tant qu'aucun export ChairGun/Strelok/MERO n'est disponible.
 */
export type CrossValidationSource =
  | 'chairgun'
  | 'chairgun-elite'
  | 'strelok'
  | 'strelok-pro'
  | 'mero'
  | 'auxiliary';

/**
 * Niveau de confiance global de la source pour le cas considéré.
 *
 * - `A` : extraction propre, traçable, version connue, données numériques
 *         non ambiguës (ex : export CSV officiel, table publiée).
 * - `B` : extraction sérieuse mais avec hypothèses (capture écran +
 *         re-saisie, version mod, conventions implicites).
 * - `C` : indicatif uniquement (UI obfusquée, valeurs lues à l'œil,
 *         version non identifiée). Ne doit jamais déclencher d'échec
 *         seul dans le futur runner.
 */
export type CrossValidationConfidence = 'A' | 'B' | 'C';

/**
 * Méthode d'extraction de la donnée. Documentaire — aide à juger
 * la reproductibilité plus tard.
 *
 * IA-1 (BUILD additif) : ajout `'screenshot-ai'` pour tracer une
 * extraction issue d'un brouillon IA RELU MANUELLEMENT par un opérateur
 * (pipeline `ai-extract-rows` Strelok Pro). Strictement additif :
 *  - aucune valeur existante n'est renommée ni supprimée ;
 *  - les fixtures sérialisés en `screenshot-retyped` / `manual-entry` /
 *    `export-csv` / `export-json` / `published-table` restent valides ;
 *  - l'UI doit afficher cette méthode comme « brouillon IA validé »,
 *    et la confiance associée est forcée à `'C'` côté schéma utilisateur.
 */
export type CrossValidationExtractionMethod =
  | 'export-csv'
  | 'export-json'
  | 'screenshot-retyped'
  | 'manual-entry'
  | 'published-table'
  | 'screenshot-ai';

/**
 * Une ligne de sortie d'une référence externe à une distance donnée.
 *
 * Toutes les grandeurs hors `range` sont OPTIONNELLES : une référence peut
 * n'exposer que `drop` + `velocity`, une autre n'exposer que `tof`. Le
 * loader ne fabrique JAMAIS de valeur manquante.
 *
 * Unités canoniques (alignées sur le moteur AirBallistik) :
 *  - range     : mètres
 *  - drop      : millimètres (négatif = en-dessous de la ligne de visée)
 *  - velocity  : m/s
 *  - tof       : secondes
 *  - windDrift : millimètres (positif = sous le vent)
 *  - energy    : joules
 *
 * La normalisation d'unités externes (pouces, ft/s, ft·lb…) doit se faire
 * AVANT écriture du CSV — le loader ne fait pas de conversion.
 */
export interface ExternalReferenceRow {
  range: number;
  drop?: number;
  velocity?: number;
  tof?: number;
  windDrift?: number;
  energy?: number;
}

/**
 * Métadonnées d'une feuille de référence externe (= un fichier CSV).
 * Toujours présentes : si la source ou la confiance manque, le cas n'a
 * pas de valeur comparative.
 */
export interface ReferenceMeta {
  source: CrossValidationSource;
  /** Version de l'app/publication (ex: "Strelok Pro 6.x APK", "JBM 2024-Q1"). */
  version: string;
  confidence: CrossValidationConfidence;
  extractionMethod: CrossValidationExtractionMethod;
  /** ISO date de la saisie/extraction. */
  extractedAt: string;
  /** Identifiant libre de l'opérateur (initiales, alias). */
  operator?: string;
  /** URL ou chemin local de la source brute (capture, page web). */
  sourceUri?: string;
  /**
   * Hypothèses faites pendant l'extraction (convention vent, BC modèle
   * supposé, atmosphère reconstituée…). Documentaire mais critique :
   * un écart inexpliqué sans hypothèse loggée = donnée à re-vérifier.
   */
  assumptions?: string[];
  /** Notes libres courtes. */
  notes?: string;
}

/**
 * Une source externe complète pour un cas : ses métadonnées + ses lignes.
 * Plusieurs sources peuvent coexister pour un même cas (cf. règle "deux
 * sources concordantes" du protocole).
 */
export interface ExternalReference {
  meta: ReferenceMeta;
  rows: ExternalReferenceRow[];
}

/**
 * Un cas de validation comparative complet.
 *
 * `inputs` est un `BallisticInput` standard, identique à ceux de
 * `truth-set.ts` ou `golden/fixtures.ts` — il sera passé tel quel au
 * moteur par le futur runner BUILD-B.
 *
 * `references` est un tableau (≥1) de sources externes. Aucune n'est
 * "la" vérité : le runner comparera moteur vs chaque source, et
 * appliquera la règle "deux sources concordantes" au niveau analyse.
 */
export interface CrossValidationCase {
  /** Id stable, slug-case (ex: "22-jsb-18gr-280-zero30"). */
  id: string;
  /** Description courte business. */
  description: string;
  /** Tags libres pour filtrage futur (caliber, profil cible, etc.). */
  tags?: string[];
  inputs: BallisticInput;
  references: ExternalReference[];
  /** Notes libres au niveau cas (différentes des notes par source). */
  notes?: string;
}

/**
 * Colonnes minimales acceptées par le loader CSV (cf. `loader.ts`).
 * Le header CSV est case-insensitive ; les alias usuels sont remappés
 * (ex: `distance` → `range`, `mv` → `velocity`).
 */
export const CSV_COLUMN_ALIASES: Record<string, keyof ExternalReferenceRow> = {
  range: 'range',
  distance: 'range',
  dist: 'range',
  drop: 'drop',
  'drop-mm': 'drop',
  velocity: 'velocity',
  vel: 'velocity',
  v: 'velocity',
  mv: 'velocity',
  tof: 'tof',
  time: 'tof',
  t: 'tof',
  wind: 'windDrift',
  'wind-drift': 'windDrift',
  drift: 'windDrift',
  energy: 'energy',
  ke: 'energy',
};

/** Colonnes obligatoires : sans `range` aucune ligne n'est lisible. */
export const CSV_REQUIRED_COLUMNS: Array<keyof ExternalReferenceRow> = ['range'];