/**
 * Couverture du mode debug d'unités — voir
 * `docs/engine/deterministic-contract.md` §4.3.
 *
 * Règle : tout fichier UI qui appelle `useUnits().display(…)` ou
 * `useUnits().symbol(…)` (donc qui produit une conversion d'affichage
 * potentiellement réinjectable) DOIT exposer au moins un badge
 * SI/DSP, soit via `<UnitTag>`, soit via la primitive `<UnitValue>`.
 *
 * Sans ce badge, la valeur convertie circule "à nu" dans l'UI : le
 * mode debug ne peut pas alerter l'utilisateur ou un reviewer qu'elle
 * ne doit pas être renvoyée au moteur.
 *
 * Les fichiers de configuration de préférences (UnitsPanel,
 * PreferencesPanel) sont volontairement exemptés — ils gèrent les
 * unités elles-mêmes, sans afficher de mesure physique.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it, expect } from 'vitest';

const ROOT = join(process.cwd(), 'src');

const EXEMPT = new Set<string>([
  // Hooks/contextes : pas de rendu de valeur physique.
  'hooks/use-units.ts',
  // Mécanisme du mode debug lui-même : pas de rendu de valeur physique,
  // c'est le toggle qui pilote l'affichage des badges.
  'lib/unit-debug.ts',
  // Panneau de réglage des unités : règle les unités, n'affiche pas de mesure.
  'components/settings/panels/UnitsPanel.tsx',
  'components/settings/panels/PreferencesPanel.tsx',
  // Le composant UnitField intègre déjà UnitTag à la racine.
  'components/calc/UnitField.tsx',
  // La primitive UnitValue intègre UnitTag par construction.
  'components/devtools/UnitValue.tsx',
  // Le composant UnitTag est lui-même la source du badge.
  'components/devtools/UnitTag.tsx',
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(t|j)sx?$/.test(name) && !/\.test\.[tj]sx?$/.test(name)) out.push(p);
  }
  return out;
}

const FILES = walk(ROOT);

const consumers = FILES.filter((p) => {
  const src = readFileSync(p, 'utf8');
  // Heuristique : le fichier consomme useUnits ET produit une valeur
  // d'affichage. On reconnaît :
  //   - `useUnits()` (avec ou sans déstructuration)
  //   - un appel `.display(`/`.symbol(` OU une déstructuration
  //     `{ display, symbol }` directe.
  if (!/useUnits\s*\(/.test(src)) return false;
  if (/\.(display|symbol)\s*\(/.test(src)) return true;
  if (/\b(display|symbol)\s*\(/.test(src) && /useUnits\s*\(\)/.test(src)) {
    // Heuristique secondaire : déstructuration locale `{ display, symbol } = useUnits()`.
    return /\{[^}]*\b(display|symbol)\b[^}]*\}\s*=\s*useUnits\s*\(\)/.test(src);
  }
  return false;
}).map((p) => relative(ROOT, p).replace(/\\/g, '/'));

describe('Debug-mode coverage — every display surface carries a SI/DSP badge', () => {
  for (const rel of consumers) {
    if (EXEMPT.has(rel)) continue;
    it(`${rel} renders at least one <UnitTag> or <UnitValue>`, () => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      const hasBadge =
        /<UnitTag\b/.test(src) ||
        /<UnitValue\b/.test(src) ||
        /<UnitTagSurface\b/.test(src);
      expect(
        hasBadge,
        `${rel} consomme useUnits().display/symbol mais ne rend ni <UnitTag> ni <UnitValue>. ` +
          `Ajoute un badge (au moins un par carte/section) afin que le mode debug ` +
          `puisse signaler les conversions d'affichage. Voir ` +
          `docs/engine/deterministic-contract.md §4.3.`,
      ).toBe(true);
    });
  }

  it('detects at least one consumer (sanity)', () => {
    expect(consumers.length).toBeGreaterThan(5);
  });
});
