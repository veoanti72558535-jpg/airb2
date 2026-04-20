# Cross-validation protocol — Engine vs External References

> **Statut** : BUILD-A + BUILD-B livrés. **BUILD-C reporté** : aucune
> donnée externe réelle (ChairGun / Strelok / MERO) n'a encore été
> fournie sous forme exploitable (capture, export ou relevé). Le socle
> technique est prêt à les accueillir dès qu'elles seront disponibles.
> Synthèse exécutable de la tranche PLAN (`/.lovable/plan.md`).

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

## 6. Ce que ce socle ne fait PAS encore

- ✅ Calcul moteur sur les cas (BUILD-B livré — `compare.ts`)
- ✅ Application de tolérances (BUILD-B livré — `tolerances.ts`)
- ✅ Découverte filesystem des fixtures (BUILD-C — `fixture-discovery.ts`)
- ❌ Saisie de cas réels avec sources externes A/B (BUILD-C — bloqué sur données utilisateur)
- ❌ Génération `engine-cross-validation-report.md` (BUILD-D)
- ❌ Exposition UI (jamais — restera hors-UI)

## 7. Statut BUILD-C (saisie réelle)

**Décision** : la saisie de cas réels n'est lancée que lorsque
l'utilisateur fournit des données externes traçables (capture,
screenshot, export). **Aucune valeur externe n'est inventée**, même pour
atteindre un quota de cas.

**Cas réels actuellement saisis** : 0.

**Cas bootstrap (synthétique, NON validation)** : 1 —
`case-22-pellet-18gr-270-zero30` (source `auxiliary`, confiance C).
Marqué INDICATIVE par construction via le harness ; un test garde-fou
(`fixture-discovery.test.ts`) empêche qu'il soit promu en validation
forte par mégarde.

**Pour débloquer BUILD-C** l'utilisateur doit fournir, par cas visé :

1. l'`inputs.json` (paramètres figés du tir),
2. ≥1 source externe avec : capture/export, version logicielle,
   méthode d'extraction, et confiance honnête (A/B/C).

**Pipeline d'intégration** une fois les données fournies :

1. Créer `src/lib/__fixtures__/cross-validation/<case-id>/`
2. Ajouter `case.json`, `inputs.json`, `source-<src>.csv`,
   `source-<src>.meta.json`, `notes.md`
3. Le test `fixture-discovery.test.ts` les comparera automatiquement
   via `loadAllCases()` + `runCaseComparison()` — aucun ajout de code.

## 8. Suite (BUILD-D)

- Générateur de rapport markdown + `summary.json` à partir des
  `CaseComparisonResult[]`.
- Section dédiée MERO-vs-MERO-APK pour le gate
  `mem://constraints/mero-exposure-gates`.
- Aucun changement moteur. Aucune exposition UI.