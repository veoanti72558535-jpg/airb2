# Spec — Format pivot universel Custom Drag Table AirBallistik (CDT-Pivot v1)

> **Statut** : spec markdown préparatoire. **Aucune décision d'implémentation
> prise.** Aucun fichier `src/` modifié dans cette tranche. Aucun parser, aucun
> schéma Zod, aucun adaptateur, aucune UI livrés.
>
> **Tranche** : APK.A5 — consolide les recommandations issues de APK.A1→A4.
> **Références amont** :
> - `docs/apk-analysis/strelok/dragtable-xml-format.md` (grammaire Strelok)
> - `docs/apk-analysis/strelok/import-pivot-recommendation.md` (recommandation A4)
> - `docs/apk-analysis/mero/drag-law-menu.md` (8 drag laws hard-codées)
> - `docs/apk-analysis/ballistic-mapping.md` (cartographie globale)

## 1. Motivation

### 1.1 Constat issu de APK.A1→A4

| Source analysée | Format custom drag table exposé | Intégrable AirBallistik ? |
|---|---|---|
| **Strelok Pro** (APK.A4) | XML `<DragTable>` avec `<Header>` + `<Points>` (Mach/CD) | ✅ via adaptateur XML → pivot |
| **MERO** (APK.A3) | 8 drag laws hard-codées, **pas d'import custom** | ❌ pas de surface d'import |
| **ChairGun Elite** (APK.A2) | Asset chiffré, format inconnu | ⚠️ hors périmètre tant que non déchiffré |
| **bullets4.db** (APK.A2) | BC G1/G7 scalaires + `bcZones`, **pas de Cd brut** | ❌ format différent (BC ≠ Cd table) |
| **AirBallistik actuel** (`drag-table.ts`) | CSV/JSON minimal `{mach, cd}` | ✅ format de base à étendre |

### 1.2 Problème

Le format actuel `parseDragTable` (`src/lib/drag-table.ts`) :
- accepte CSV et JSON minimal (3 conteneurs : `table`, `points`, `drag`, `data`)
- produit `DragTablePoint[] = { mach, cd }[]`
- **n'embarque aucune métadonnée** (nom, calibre, source, vélocité de référence)

Conséquence : tout import depuis Strelok ou tout export AirBallistik perd la
provenance. Impossible de :
- afficher honnêtement « Imported from Strelok 6.4.0 » sur un projectile
- distinguer deux drag tables `0.22 / 18 gr` venant de sources différentes
- effectuer un round-trip (export AirBallistik → re-import sans perte)

### 1.3 Objectif

Définir **un seul format pivot JSON** (CDT-Pivot v1) qui :
1. **Reste 100% rétrocompatible** avec les fichiers existants (`[{mach,cd}]`,
   `{table: [...]}`).
2. **Ajoute une couche metadata strictement optionnelle** pour la traçabilité.
3. **Sert de cible commune** pour tous les adaptateurs externes (CSV, JSON
   minimal, XML Strelok, exports AirBallistik).
4. **Est versionné** via `$schema` pour permettre une évolution v2 sans
   breaking change.

## 2. Schéma JSON formel (CDT-Pivot v1)

### 2.1 Structure

```jsonc
{
  "$schema": "airballistik/custom-drag-table/v1",   // optionnel mais recommandé
  "metadata": {                                      // entièrement optionnel
    "name": "string",                                // ex. "Example .22 LR Custom"
    "caliber": "string",                             // token AirBallistik (ex. ".22")
    "projectileWeight": {
      "value": 18.13,
      "unit": "gr"                                   // "gr" | "g"
    },
    "referenceVelocity": {
      "value": 280,
      "unit": "m/s"                                  // "m/s" | "fps"
    },
    "source": "strelok",                             // enum fermé (cf. §2.3)
    "sourceVersion": "6.4.0",                        // version de l'outil source
    "author": "string",
    "notes": "string",
    "createdAt": "2025-01-15T12:34:56Z"              // ISO-8601 UTC
  },
  "points": [                                        // SEUL champ requis
    { "mach": 0.50, "cd": 0.235 },
    { "mach": 0.70, "cd": 0.245 },
    { "mach": 0.90, "cd": 0.300 }
  ]
}
```

### 2.2 Champs — table de référence

| Chemin | Type | Requis | Notes |
|---|---|---|---|
| `$schema` | string | ❌ | Recommandé. Format `airballistik/custom-drag-table/vN`. Absent ⇒ inféré v1. |
| `metadata` | object | ❌ | Si absent ou `{}`, équivaut à `null`. |
| `metadata.name` | string | ❌ | Libre. Affiché dans l'UI projectile. |
| `metadata.caliber` | string | ❌ | Token AirBallistik (cf. `caliber.ts`). |
| `metadata.projectileWeight.value` | number > 0 | ❌ | Avec `unit` obligatoire si `value` présent. |
| `metadata.projectileWeight.unit` | enum | ❌ | `"gr"` ou `"g"` (aligné `import-schemas.ts`). |
| `metadata.referenceVelocity.value` | number > 0 | ❌ | Idem. |
| `metadata.referenceVelocity.unit` | enum | ❌ | `"m/s"` ou `"fps"`. |
| `metadata.source` | enum | ❌ | Cf. §2.3. |
| `metadata.sourceVersion` | string | ❌ | Libre, ex. `"6.4.0"`, `"1.2.5"`. |
| `metadata.author` | string | ❌ | Libre. |
| `metadata.notes` | string | ❌ | Libre. |
| `metadata.createdAt` | string | ❌ | ISO-8601 UTC. |
| `points` | array | ✅ | ≥ 2 entrées. |
| `points[].mach` | number | ✅ | Sans dimension, ∈ [0, 10]. |
| `points[].cd` | number | ✅ | Sans dimension, ∈ [0, 5]. |

### 2.3 Enum `metadata.source`

Aligné sur `ImportSource` (`src/lib/types.ts:54-60`) **+ extensions futures
identifiées** :

| Valeur | Aligné sur | Origine typique |
|---|---|---|
| `"json-user"` | ✅ existant | Saisie/édition manuelle utilisateur |
| `"preset-internal"` | ✅ existant | Bundle AirBallistik livré (seed) |
| `"strelok"` | ✅ existant | Export XML Strelok Pro |
| `"chairgun"` | ✅ existant | Export ChairGun (à ce jour non documenté) |
| `"airballistik"` | ✅ existant | Export AirBallistik (round-trip) |
| `"bullets4-db"` | ✅ existant | Extraction `bullets4.db` Strelok |
| `"manual"` | 🟡 nouveau | Synonyme de `json-user` à éviter — préférer `json-user` |
| `"jbm"` | 🟡 nouveau (réservé) | jbmballistics.com (cible future) |
| `"doppler"` | 🟡 nouveau (réservé) | Mesure radar Doppler (cible future) |
| `"other"` | 🟡 nouveau (fallback) | Source non identifiée |

**Décision pour v1** : ne pas étendre `ImportSource` dans cette spec — réutiliser
strictement les 6 valeurs existantes. Si `"jbm"`, `"doppler"`, `"other"` sont un
jour requis, ils seront ajoutés à `ImportSource` dans une tranche dédiée
(impact catalogue + tests).

### 2.4 Pourquoi pas de champ `dragModel` ?

Une **custom drag table EST une courbe Cd/Mach brute**. Elle est
*indépendante* des modèles de référence G1/G7/GA/etc. Inclure un champ
`dragModel` créerait une ambiguïté :
- Soit la table EST le drag model (cas pivot) → champ inutile
- Soit la table est *exprimée par rapport à* un modèle (cas BC scalaire) →
  c'est le rôle de `Projectile.bcModel` + `Projectile.bc`, **hors scope CDT**

Voir §6 pour la séparation explicite avec `bcZones`.

### 2.5 Pourquoi pas d'unité pour `mach` / `cd` ?

Les deux sont **sans dimension** par construction physique :
- Mach = vitesse / célérité du son local
- Cd = coefficient de traînée adimensionné

Ajouter `"unit"` introduirait une fausse flexibilité.

## 3. Exemples

### 3.1 Exemple minimal (rétrocompat absolue)

Aujourd'hui valide via `parseDragTable`, restera valide en CDT-Pivot v1 :

```json
[
  { "mach": 0.50, "cd": 0.235 },
  { "mach": 0.90, "cd": 0.300 },
  { "mach": 1.20, "cd": 0.380 }
]
```

Variantes acceptées (déjà supportées par `parseDragTable`) :

```json
{ "table":  [{ "mach": 0.5, "cd": 0.235 }, { "mach": 1.0, "cd": 0.59 }] }
{ "points": [{ "mach": 0.5, "cd": 0.235 }, { "mach": 1.0, "cd": 0.59 }] }
{ "drag":   [{ "mach": 0.5, "cd": 0.235 }, { "mach": 1.0, "cd": 0.59 }] }
{ "data":   [{ "mach": 0.5, "cd": 0.235 }, { "mach": 1.0, "cd": 0.59 }] }
```

### 3.2 Exemple complet (pivot canonique)

```json
{
  "$schema": "airballistik/custom-drag-table/v1",
  "metadata": {
    "name": "JSB Hades .22 18.13gr — Doppler bench 2024",
    "caliber": ".22",
    "projectileWeight": { "value": 18.13, "unit": "gr" },
    "referenceVelocity": { "value": 280, "unit": "m/s" },
    "source": "airballistik",
    "sourceVersion": "1.0.0",
    "author": "Jane Doe",
    "notes": "Bench Doppler, 12°C, sea level, 100 shots avg.",
    "createdAt": "2025-01-15T12:34:56Z"
  },
  "points": [
    { "mach": 0.40, "cd": 0.220 },
    { "mach": 0.60, "cd": 0.230 },
    { "mach": 0.80, "cd": 0.260 },
    { "mach": 0.95, "cd": 0.340 }
  ]
}
```

### 3.3 Exemple Strelok-converti (sortie attendue de l'adaptateur XML)

Entrée Strelok XML (cf. `dragtable-xml-format.md`) :

```xml
<DragTable>
  <Header>
    <Name>Example .22</Name>
    <Caliber>0.22</Caliber>
    <Weight>18.13</Weight>
    <RefVelocity>920</RefVelocity>
  </Header>
  <Points>
    <Point><Mach>0.50</Mach><CD>0.235</CD></Point>
    <Point><Mach>0.90</Mach><CD>0.300</CD></Point>
  </Points>
</DragTable>
```

Sortie pivot attendue :

```json
{
  "$schema": "airballistik/custom-drag-table/v1",
  "metadata": {
    "name": "Example .22",
    "caliber": ".22",
    "projectileWeight": { "value": 18.13, "unit": "gr" },
    "referenceVelocity": { "value": 920, "unit": "fps" },
    "source": "strelok",
    "sourceVersion": "6.4.0"
  },
  "points": [
    { "mach": 0.50, "cd": 0.235 },
    { "mach": 0.90, "cd": 0.300 }
  ]
}
```

Notes adaptateur :
- `Caliber` Strelok = float pouces → token AirBallistik via `caliber-derive.ts`
- `Weight` Strelok = grains par défaut → unit `"gr"`
- `RefVelocity` Strelok = fps par défaut → unit `"fps"`
- `sourceVersion` = version de l'app Strelok exportatrice (relevée APK.A1)

## 4. Règles de validation

Identiques au contrat actuel `parseDragTable` (réutilisation intégrale) :

| Règle | Détail | Action |
|---|---|---|
| `points.length ≥ 2` | Sinon parse error | ❌ rejet fatal |
| `mach ∈ [0, 10]` | Sanity bound (cohérent `drag-table.ts:137`) | drop ligne + warning |
| `cd ∈ [0, 5]` | Sanity bound | drop ligne + warning |
| `mach < 0` ou `cd < 0` | Valeur négative | drop ligne + warning |
| Tri ascendant par `mach` | Auto | warning si tri appliqué |
| Dedup sur `mach` | Garde la 1ʳᵉ occurrence | warning par doublon |
| `points.length ≥ 2` post-dedup | Sinon parse error | ❌ rejet fatal |
| `metadata.projectileWeight.value > 0` | Si présent | drop metadata + warning |
| `metadata.referenceVelocity.value > 0` | Si présent | drop metadata + warning |
| `metadata.source` ∈ enum | Si présent | drop champ + warning (non bloquant) |
| `metadata.createdAt` ISO-8601 valide | Si présent | drop champ + warning |

**Principe** : la validation `metadata` est **non bloquante**. Un fichier avec
metadata corrompue mais `points` valides reste utilisable — seules les
métadonnées invalides sont droppées avec warning.

## 5. Compatibilité avec `drag-table.ts` actuel

| Fichier source | Aujourd'hui | CDT-Pivot v1 | Régression ? |
|---|---|---|---|
| CSV `mach,cd` (header) | ✅ accepté | ✅ accepté (adaptateur CSV→pivot) | ❌ aucune |
| CSV `mach;cd` (semicolon) | ✅ accepté | ✅ accepté | ❌ aucune |
| CSV `mach\tcd` (tab) | ✅ accepté | ✅ accepté | ❌ aucune |
| JSON `[{mach,cd}]` | ✅ accepté | ✅ accepté | ❌ aucune |
| JSON `{table: [...]}` | ✅ accepté | ✅ accepté | ❌ aucune |
| JSON `{points: [...]}` | ✅ accepté | ✅ accepté (pivot canonique) | ❌ aucune |
| JSON `{drag: [...]}` | ✅ accepté | ✅ accepté (legacy) | ❌ aucune |
| JSON `{data: [...]}` | ✅ accepté | ✅ accepté (legacy) | ❌ aucune |
| JSON pivot complet (avec `metadata`) | ⚠️ `metadata` ignoré silencieusement | ✅ exploité | ❌ aucune (gain) |
| Clés alternatives `Mach`/`Cd`/`M` | ✅ accepté | ✅ accepté | ❌ aucune |

**Garantie de rétrocompat 100%** : tout fichier qui passe `parseDragTable`
aujourd'hui passera CDT-Pivot v1 demain. La spec ne retire aucun format ni
aucune clé alternative.

## 6. Séparation avec `Projectile.bcZones`

`Projectile.bcZones` (`src/lib/types.ts:172`) :
- Type : `{ bc: number; minVelocity: number }[]`
- Sémantique : **plusieurs BC scalaires** valides chacun au-delà d'une
  vélocité minimale (formalisme Litz / Berger)
- Indissociable d'un `bcModel` (G1, G7, …)

CDT-Pivot v1 :
- Type : `{ mach: number; cd: number }[]`
- Sémantique : **courbe Cd brute** mesurée ou reconstruite
- **Indépendant** de tout modèle de référence

| Aspect | `bcZones` | CDT-Pivot |
|---|---|---|
| Représentation physique | BC zonés sur référence G1/G7 | Courbe Cd directe |
| Champ projectile | `Projectile.bcZones` + `bcModel` | `Projectile.customDragTable` |
| Précision typique | ~1-3% (BC scalaire par zone) | ~0.5-1% (courbe) |
| Source typique | Vendor (JSB, Berger, Hornady) | Doppler bench, Strelok user-fit |
| Cumulable ? | Mutuellement exclusif avec `customDragTable` (déjà acquis : `customDragTable` prime) | Idem |

**Décision** : CDT-Pivot ne touche pas à `bcZones`. Les deux mécanismes
coexistent sans interférence dans `Projectile`. La précédence existante
(`customDragTable` > `bcZones` > `bc` scalaire) reste inchangée.

## 7. Adaptateurs externes → pivot (spec)

Tous les adaptateurs sont **modules purs externes au moteur**. Aucun ne touche
`engine.ts`, `integrators/*`, `zero-solver*`, `profiles.ts`.

### 7.1 CSV plat → pivot

- Réutilise la logique CSV de `parseDragTable`
- `metadata` = absent (pas de canal de métadonnées dans CSV)
- Output : `{ points: [...] }` (pas de `metadata`, `$schema` optionnel)

### 7.2 JSON minimal → pivot

- Wrap éventuel `[...]` ou `{table|points|drag|data: [...]}` → `points`
- `metadata` = absent
- Output : pivot v1 sans `metadata`

### 7.3 XML Strelok `<DragTable>` → pivot

- Adaptateur dédié (cf. `import-pivot-recommendation.md` §4)
- DOMParser natif, ~80 LoC
- Mapping `Header` → `metadata` (cf. §3.3)
- `metadata.source` = `"strelok"`
- `metadata.sourceVersion` = relevé en runtime ou hard-codé selon contexte
- Refus strict des variantes `mod-lenov.ru` non conformes

### 7.4 Export AirBallistik → pivot (round-trip)

- Sérialiseur `serializeDragTable(projectile) → CDT-Pivot v1 JSON`
- `metadata.source` = `"airballistik"`
- `metadata.sourceVersion` = version de l'app au moment de l'export
- `metadata.createdAt` = ISO-8601 UTC du moment de l'export
- Garantit `parse(serialize(x)) ≡ x` pour toutes les métadonnées préservables

### 7.5 Adaptateurs futurs (réservés, non spécifiés ici)

| Source | État | Bloqueur |
|---|---|---|
| ChairGun Elite | ❌ non spec | Asset chiffré (APK.A2) |
| MERO | ❌ jamais | Pas de surface d'export custom (APK.A3) |
| jbmballistics.com | 🟡 réservé | Choix UX (scraping vs paste) |
| Doppler radar | 🟡 réservé | Pas de format standard du marché |

## 8. Stratégie d'évolution (`$schema` versionné)

### 8.1 Règles de versioning

- `$schema = "airballistik/custom-drag-table/v1"` est la première version
  publique.
- **v1 → v1.x (mineur)** : ajout de champs **strictement optionnels** dans
  `metadata`. Pas de breaking. Lecteur v1 ignore les nouveaux champs.
- **v1 → v2 (majeur)** : breaking change autorisé (ex. nouveau format de
  `points` avec colonnes additionnelles). Lecteur multi-version requis.
- Absence de `$schema` ⇒ inféré v1 (rétrocompat avec fichiers actuels sans
  marqueur).

### 8.2 Cibles potentielles v2 (hors scope V1)

| Idée | Pourquoi v2 et pas v1 |
|---|---|
| `points[].temperature` | Drag température-dépendant — physique non implémentée |
| `points[].spinRate` | Drag spin-dépendant — physique non implémentée |
| `multiTable` (zones de vélocité) | Doublon partiel avec `bcZones`, ambigu |
| `metadata.uncertainty` (σ Cd) | Pas d'usage dans le moteur actuel |
| Support binaire (CBOR) | Aucun bénéfice tant que < 1 KB par table |

## 9. Non-objectifs V1

1. **Pas de drag model multi-BC** : c'est le rôle de `Projectile.bcZones`.
2. **Pas de zones de vélocité** dans `points` : une table CDT est une courbe
   continue Cd(Mach), pas un escalier de BC.
3. **Pas de température-dépendance** : le moteur AirBallistik V1 utilise une
   atmosphère unique par calcul (pas de Cd(T)).
4. **Pas de spin-dépendance** : la spin-drift (`spin-drift.ts`) est calculée
   séparément, pas via Cd.
5. **Pas d'auto-fit BC ↔ table** : importer une table ne recalcule pas le BC
   scalaire d'un projectile (et inversement).
6. **Pas de fusion silencieuse** : importer une CDT sur un projectile existant
   nécessite confirmation utilisateur (pattern déjà acquis sur les imports
   bullets4).
7. **Pas de support `.zip` Dropbox Strelok** : un seul fichier pivot ou un seul
   XML par import (cf. APK.A4 §5).
8. **Pas de drag laws MERO** (`SLG0`, `SLG1`, `RA4`, `GA2`) exposées via CDT :
   verrouillé par `mem://constraints/mero-exposure-gates`.

## 10. Implémentation future (étapes proposées, **sans code**)

Si une tranche d'implémentation est un jour ouverte :

| Étape | Module cible | Effort indicatif | Risque |
|---|---|---|---|
| 1. Schéma Zod CDT-Pivot v1 | `src/lib/import-schemas.ts` (extension) | ~60 LoC + tests | faible |
| 2. Extension `parseDragTable` | `src/lib/drag-table.ts` (extension) | ~40 LoC + tests rétro-compat | faible |
| 3. Sérialiseur `serializeDragTable` | `src/lib/drag-table.ts` (ajout) | ~30 LoC + tests round-trip | faible |
| 4. Adaptateur XML Strelok → pivot | `src/lib/adapters/strelok-dragtable.ts` (nouveau) | ~80 LoC + 5 fixtures golden | moyen |
| 5. UI bouton « Import custom drag table » | `src/components/projectiles/DragTableEditor.tsx` (extension) | ~150 LoC | moyen (UX, preview, confirmation) |
| 6. Affichage badge provenance | `src/lib/imported-from.ts` + UI projectile | ~20 LoC | faible |
| 7. Tests golden import/export | `src/lib/__fixtures__/drag-tables/` | ~10 fixtures | faible |

**Total indicatif** : ~400 LoC + 20 tests, **sans** toucher au moteur, à
`engine.ts`, à `zero-solver.ts`, ni aux profils MERO.

## 11. Décisions à différer

- **Faut-il l'implémenter ?** Non décidé. Cette spec est uniquement
  préparatoire.
- **Quand ?** Après V1 (cf. `mem://features/v1-scope`). V1 = airgun, BC
  scalaire G1, pas de drag table custom user-facing.
- **Sous quel flag ?** Si jamais implémenté, derrière un flag dédié
  (`importCustomDragTable`), désactivé par défaut.
- **Extension `ImportSource`** : la décision d'ajouter `"jbm"`, `"doppler"`,
  `"manual"`, `"other"` à l'enum existant est différée à la première tranche
  d'implémentation qui en a besoin.

## 12. Périmètre respecté (cette tranche APK.A5)

- ✅ Aucun fichier `src/` modifié.
- ✅ Aucun moteur, parser, schéma d'import, ou type touché.
- ✅ `parseDragTable`, `import-schemas.ts`, `types.ts` strictement inchangés.
- ✅ `Projectile.bcZones`, `Projectile.customDragTable` non altérés.
- ✅ Aucune nouvelle physique introduite.
- ✅ Aucun nouveau test ajouté ou retiré (786/786 inchangés).
- ✅ Aucun verrou MERO levé (`mem://constraints/mero-exposure-gates` respecté).
- ✅ Aucun autre APK ré-analysé dans cette tranche.
- ✅ Aucune décision d'implémentation prise — spec purement préparatoire.

---

## Compte rendu technique APK.A5

**Livrable** : 1 fichier markdown (`docs/apk-analysis/custom-drag-table-pivot-spec.md`).

**Modifications code produit** : aucune.

**Régressions possibles** : aucune (zéro changement `src/`).

**Statut tests** : 786/786 inchangés (rien touché).

**Suite logique possible** (non engagée) :
- Tranche d'implémentation CDT-Pivot v1 derrière flag `importCustomDragTable`
- Adaptateur XML Strelok → pivot (cf. `dragtable-xml-format.md`)
- UI d'import dans `DragTableEditor.tsx`