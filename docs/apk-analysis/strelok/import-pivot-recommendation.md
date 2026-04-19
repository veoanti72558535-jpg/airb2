# Recommandation — format pivot d'import Custom Drag Table AirBallistik

> **Statut** : spec markdown préparatoire. **Aucune décision d'implémentation
> prise.** Aucun fichier `src/` modifié dans cette tranche. Aucune extension
> de `import-schemas.ts`, aucun nouveau parser livré.
>
> Référence amont : `dragtable-xml-format.md` (grammaire Strelok Pro
> reconstruite).

## 1. État actuel AirBallistik

L'unique format pivot de courbes Cd/Mach déjà supporté par AirBallistik est
celui de `src/lib/drag-table.ts` :

- **Entrées acceptées** : CSV (`mach,cd` avec ou sans header, séparateurs
  `,`/`;`/`\t`) ou JSON.
- **Variantes JSON** : tableau plat `[{mach, cd}, …]`, ou objet enveloppé
  `{ table: [...] }` / `{ points: [...] }` / `{ drag: [...] }` / `{ data: [...] }`.
- **Modèle de données** : `DragTablePoint = { mach: number; cd: number }`
  (cf. `src/lib/types.ts`).
- **Sortie** : `{ table: DragTablePoint[]; warnings: string[] }`.
- **Validation** : minimum 2 points, mach ≥ 0, cd ≥ 0, bornes de sanité
  (`mach ≤ 10`, `cd ≤ 5`), tri ascendant, déduplication sur `mach`.
- **Métadonnées** : **aucune** — pas de `name`, `caliber`, `vendor`,
  `refVelocity`, `bcModel`, etc.

## 2. Champs Strelok `<DragTable>` vs AirBallistik

| Champ Strelok | Type | AirBallistik (actuel) | Présence |
|---|---|---|---|
| `<Mach>` | float | `mach` | ✅ équivalent direct |
| `<CD>` | float | `cd` | ✅ équivalent direct |
| `<Name>` | string | — | ❌ absent côté pivot |
| `<Vendor>` | string | — | ❌ absent |
| `<Caliber>` | string/float | — | ❌ absent |
| `<Weight>` | float (gr) | — | ❌ absent |
| `<RefVelocity>` | float (fps) | — | ❌ absent |
| `<DragFunction>` | enum | — | ❌ absent (le pivot actuel suppose une courbe Cd/Mach déjà résolue, sans préciser quel modèle de référence l'a inspirée) |
| `<Description>` | string | — | ❌ absent |
| `<Author>` | string | — | ❌ absent |
| `<Version>` | int | — | ❌ absent |

**Lecture** : la **physique** est intégralement compatible (paires Mach/Cd).
Seule la **couche métadonnées** manque. Aucune nouvelle physique n'est requise
pour ingérer du Strelok `<DragTable>`.

## 3. Recommandation de format pivot étendu (proposition uniquement)

Pour rester rétro-compatible avec `parseDragTable` et préparer un éventuel
import XML Strelok, on pourrait étendre le JSON pivot avec un champ
optionnel `metadata` :

```jsonc
{
  "version": 1,
  "metadata": {
    "name": "Example .22 LR Custom",   // optionnel
    "vendor": "Generic",               // optionnel
    "caliber": ".22",                  // optionnel — token AirBallistik
    "weight": 40,                      // optionnel — grains
    "refVelocity": 1080,               // optionnel — fps
    "dragFunction": "Custom",          // optionnel — G1 | G7 | Custom
    "source": "Strelok Pro 6.4.0 export" // optionnel — provenance
  },
  "points": [
    { "mach": 0.50, "cd": 0.235 },
    { "mach": 0.70, "cd": 0.245 },
    { "mach": 0.90, "cd": 0.300 }
  ]
}
```

### Garanties de rétro-compatibilité (si jamais implémenté)

1. `parseDragTable` continue d'accepter ses formats actuels (CSV, JSON tableau
   plat, objet `{ table | points | drag | data }`) — seul le **conteneur
   `points`** est ajouté à la liste reconnue (à vérifier : déjà accepté).
2. Le champ `metadata` est **strictement optionnel**. Un consommateur qui
   l'ignore reçoit le même `DragTablePoint[]` qu'aujourd'hui.
3. Les warnings existants (`Skipped header row.`, `Duplicate Mach …`) ne
   changent pas. Ajout possible de warnings `metadata` (ex. `refVelocity
   absent`), non bloquants.
4. Aucun champ `metadata` ne modifie la physique : pas de scaling de Cd, pas
   de réinjection de `RefVelocity` dans l'intégrateur. Ce sont des
   **étiquettes de provenance** affichées dans l'UI projectile.

## 4. Stratégie d'import Strelok (proposition)

Adaptateur **externe** au moteur, en deux étapes :

```
┌────────────────────┐    ┌─────────────────────────┐    ┌──────────────────┐
│ <DragTable> XML    │ →  │ Adaptateur strelokToPiv │ →  │ Pivot JSON étendu│
│ (Strelok export)   │    │ (parseur DOM minimal)   │    │ { metadata,      │
└────────────────────┘    └─────────────────────────┘    │   points }       │
                                                         └────────┬─────────┘
                                                                  ↓
                                                  parseDragTable (déjà existant)
                                                                  ↓
                                                          DragTablePoint[]
```

- Adaptateur : un module pur (~80 LoC) qui prend une string XML et renvoie le
  pivot JSON étendu. **Aucune dépendance** : `DOMParser` natif (web) suffit.
- Mapping suggéré :
  - `<Mach>`/`<CD>` → `points[].mach`/`points[].cd`
  - `<Name>` → `metadata.name`
  - `<Caliber>` (inch float) → `metadata.caliber` (token `.NNN`, avec
    réutilisation de `caliber-derive.ts` existant)
  - `<Weight>` (grains) → `metadata.weight`
  - `<RefVelocity>` (fps) → `metadata.refVelocity`
  - `<DragFunction>` → `metadata.dragFunction`
- **Politique BC model** : si `<DragFunction>` ∈ {`G1`, `G7`}, l'adaptateur
  **n'écrase pas** un éventuel BC connu côté projectile — il enregistre
  uniquement le label de provenance. La physique reste portée par la table
  Cd/Mach effectivement importée.

## 5. Points d'attention si jamais implémenté

1. **Honnêteté UI** : tout projectile dont la courbe vient d'un import Strelok
   doit être étiqueté visiblement (badge `Imported from Strelok`,
   `metadata.source` affiché). Cohérent avec la politique
   `imported-from.ts` existante.
2. **Pas de fusion silencieuse** : importer un `<DragTable>` ne doit jamais
   modifier un projectile existant. Création d'une nouvelle entité ou prompt
   utilisateur explicite.
3. **Validation stricte** : refuser tout XML sans au moins 2 `<Point>` valides
   (cohérent avec `parseDragTable` actuel).
4. **Pas de support des exports `.zip` Dropbox** dans une première itération :
   le périmètre se limite à un `<DragTable>` XML unique fourni par
   l'utilisateur (collé ou uploadé). Les bundles Dropbox contiennent en outre
   `bullets.db`, `pellets.db`, etc. — déjà couverts par `import-pipeline.ts`
   (bullets4) côté projectiles.
5. **Mod non officiel** : refuser tout XML qui ne respecte pas la grammaire
   stricte (cf. `dragtable-xml-format.md`). Pas de tolérance silencieuse aux
   variantes `mod-lenov.ru`.
6. **Aucune exposition MERO** : ce format pivot est **indépendant** des tables
   `mero-tables.ts` et ne lève aucun gate du verrou
   `mem://constraints/mero-exposure-gates`.

## 6. Effort estimé (si décidé un jour)

| Étape | Effort | Risque |
|---|---|---|
| Adaptateur XML → pivot étendu | ~80 LoC + tests | faible (pure transformation) |
| Extension `parseDragTable` (champ `metadata`) | ~30 LoC + tests rétro-compat | faible |
| UI : modal "Import Strelok DragTable" | ~150 LoC | moyen (UX, validation, preview) |
| Affichage badge provenance projectile | ~20 LoC (réutilise `imported-from.ts`) | faible |
| Tests golden d'import XML | ~5 fixtures | faible |

**Total indicatif** : ~300 LoC + 10 tests, **sans** toucher au moteur ni au
zero-solver.

## 7. Décisions à différer

- **Faut-il l'implémenter ?** Non décidé. Cette spec est uniquement
  préparatoire.
- **Quand ?** Après V1 (cf. `mem://features/v1-scope`). V1 = airgun, BC
  scalaire G1, pas de drag table custom user-facing.
- **Sous quel flag ?** Si jamais implémenté, derrière un flag dédié
  (`importStrelokDragTable`), désactivé par défaut.

## 8. Périmètre respecté (cette tranche)

- ✅ Aucun fichier `src/` modifié.
- ✅ Aucun moteur, parser ou schéma d'import existant touché.
- ✅ Aucun nouveau test ajouté ou retiré.
- ✅ `parseDragTable` et `import-schemas.ts` strictement inchangés.
- ✅ Aucun autre APK analysé dans cette tranche (MERO, ChairGun hors scope).
- ✅ Aucune nouvelle physique introduite.