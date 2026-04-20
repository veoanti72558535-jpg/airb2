/**
 * Whitelist des marques de projectiles airgun (PCP, CO2, ressort).
 *
 * Utilisée par le nettoyage admin pour purger en masse les marques de
 * balles à poudre (Hornady, Nosler, Barnes, Speer, Sierra, Berger, Lapua,
 * Lehigh, Peregrine, Woodleigh, Cutting Edge, Swift, etc.) qui ont été
 * importées par erreur via bullets4-db avec un `projectileType` mal
 * renseigné (`slug` au lieu de `other`).
 *
 * Le matching est strict, **insensible à la casse**, et insensible aux
 * espaces de bordure. On NE fait PAS de matching partiel pour éviter de
 * supprimer accidentellement une marque légitime dont le nom contiendrait
 * un substring d'une marque powder.
 *
 * Toute évolution de cette liste doit être faite ici, avec un test unitaire
 * couvrant le nouveau cas.
 */

/**
 * Marques **conservées** lors d'un nettoyage par whitelist.
 * Tout projectile dont la marque (normalisée) ne figure pas ici est
 * considéré comme powder/firearm et candidat à la suppression.
 */
export const AIRGUN_BRANDS: readonly string[] = [
  'JSB',
  'H&N',
  'FX',
  'Air Arms',
  'Crosman',
  'Predator',
  'NSA',
  'Patriot',
  'Hasler',
  'Hatsan',
  'RWS',
  'Daystate',
  'Air Venturi',
  'ZAN',
  'Norma',
  'Rainier',
  'Sako',
  'Geco',
  // Variantes orthographiques fréquentes vues dans bullets4-db
  'H&N Sport',
  'JSB Match Diabolo',
  'Air Arms Diabolo',
] as const;

/** Forme normalisée pour comparaison (casse + espaces ignorés). */
function normaliseBrand(raw: string | undefined | null): string {
  if (!raw) return '';
  return raw.trim().toLowerCase();
}

const NORMALISED_AIRGUN_BRANDS: ReadonlySet<string> = new Set(
  AIRGUN_BRANDS.map(normaliseBrand),
);

/**
 * Indique si une marque appartient à la whitelist airgun.
 * Comparaison stricte insensible à la casse — pas de substring matching.
 */
export function isAirgunBrand(brand: string | undefined | null): boolean {
  return NORMALISED_AIRGUN_BRANDS.has(normaliseBrand(brand));
}