# Cross-validation protocol — Engine vs External References

> **Statut** : tranche BUILD-A livrée — socle technique en place, pas
> encore de comparaison numérique. Synthèse exécutable de la tranche
> PLAN précédente (`/.lovable/plan.md`).

## 1. Objectif

Confronter le moteur balistique AirBallistik à des références externes
reconnues du marché airgun (ChairGun, ChairGun Elite, Strelok, Strelok
Pro, MERO) sans :

- copier de code propriétaire,
- traiter une référence comme oracle absolu,
- modifier le moteur,
- exposer prématurément des profils non validés (cf.
  `mem://constraints/mero-exposure-gates`).

## 2. Format pivot

Tout cas est représenté par un dossier sous
`src/lib/__fixtures__/cross-validation/<case-id>/` contenant :

| Fichier | Rôle |
|---|---|
| `inputs.json` | `BallisticInput` strictement typé, identique aux fixtures `truth-set.ts` / `golden/fixtures.ts` |
| `case.json` | Index du cas : id, description, tags, fichiers de référence |
| `source-<src>.csv` | Lignes de sortie d'une référence externe (range obligatoire, autres colonnes optionnelles) |
| `source-<src>.meta.json` | Métadonnées : source, version, confiance A/B/C, méthode, hypothèses |
| `notes.md` | Hypothèses et conventions humaines, hors machine-readable |

Types canoniques exposés depuis `src/lib/cross-validation/index.ts` :
`CrossValidationCase`, `ExternalReference`, `ExternalReferenceRow`,
`ReferenceMeta`, `CrossValidationSource`, `CrossValidationConfidence`.

## 3. Unités canoniques (dans les CSV)

| Grandeur | Unité | Convention |
|---|---|---|
| `range` | m | obligatoire |
| `drop` | mm | négatif = sous ligne de visée |
| `velocity` | m/s | à la distance considérée |
| `tof` | s | depuis la bouche |
| `windDrift` | mm | positif = sous le vent |
| `energy` | J | optionnel |

**Règle stricte** : la conversion d'unités externes (pouces, ft/s, ft·lb)
est faite **avant** écriture du CSV. Le loader ne convertit pas et
n'invente jamais de valeur manquante.

## 4. Sources admises

| Code | Source | Confiance attendue |
|---|---|---|
| `chairgun` | ChairGun 1.3.7 (DEX clair) | C |
| `chairgun-elite` | ChairGun Elite (asset chiffré) | C |
| `strelok` | Strelok | B |
| `strelok-pro` | Strelok Pro APK | B |
| `mero` | MERO APK | B |
| `auxiliary` | Source neutre / bootstrap | A à C selon traçabilité |

`auxiliary` est utilisé pour le cas pilote BUILD-A car aucun export
propre ChairGun / Strelok / MERO n'est encore intégré au repo. À
remplacer dès BUILD-C par des sources réelles.

## 5. Loader CSV (`parseExternalReferenceCsv`)

- Séparateur `,` ou `;` auto-détecté
- Décimale `.` ou `,` acceptée
- Header obligatoire, alias usuels remappés (`distance`→`range`, `vel`→`velocity`, `time`→`tof`…)
- Lignes commençant par `#` ignorées (commentaires)
- `range` obligatoire dans le header → sinon `CsvLoaderError`
- Cellules non numériques → champ `undefined` + warning structuré
- Lignes sans `range` → ignorées + warning

## 6. Ce que ce socle ne fait PAS encore

- ❌ Pas de calcul moteur sur les cas (BUILD-B)
- ❌ Pas d'application de tolérances (BUILD-B)
- ❌ Pas de saisie de masse multi-cas (BUILD-C)
- ❌ Pas de génération `engine-cross-validation-report.md` (BUILD-D)
- ❌ Pas d'exposition UI (jamais — restera hors-UI)

## 7. Suite (BUILD-B)

- Runner test qui pour chaque cas exécute `calculateTrajectory(inputs)`,
  charge les `references[]`, calcule deltas par grandeur, applique les
  tolérances de `PROFILE_TOLERANCE`, classe PASS / INDICATIVE / FAIL.
- Sortie console structurée, pas encore de markdown.
- Aucun changement moteur.