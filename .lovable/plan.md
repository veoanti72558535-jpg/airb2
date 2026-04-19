
## Tranche APK.A5 — Spec format pivot universel custom drag table

### Objectif strict
Produire **une spec markdown** sous `docs/` décrivant un format pivot universel JSON pour l'import/export de tables de drag custom dans AirBallistik. **Aucune modification de `src/`. Aucune implémentation.** La spec sert de contrat préparatoire pour une future tranche d'implémentation.

### Contexte acquis (APK.A1→A4)
- `src/lib/drag-table.ts` accepte aujourd'hui CSV/JSON minimal `{mach, cd}` → `DragTablePoint[]`
- Strelok Pro exporte XML `<DragTable>` avec `<Header>` (name, caliber, weight, refVelocity) + `<Points>` (APK.A4)
- MERO embarque 8 drag laws hard-codées, pas d'import custom (APK.A3)
- bullets4.db expose BC G1/G7 par projectile, pas de table Cd brute (APK.A2)

### Étape 1 — Lecture de l'existant
- `src/lib/drag-table.ts` (déjà vu) → contrat actuel
- `src/lib/import-schemas.ts` → conventions Zod en place
- `src/lib/types.ts` → type `DragTablePoint`, `DragModel`, `ImportSource`
- `docs/apk-analysis/strelok/import-pivot-recommendation.md` → recommandation A4 à consolider

### Étape 2 — Design du format pivot
Format JSON unique (pas de CSV ici — CSV reste un format d'entrée que l'adaptateur convertit vers le pivot) :

```json
{
  "$schema": "airballistik/custom-drag-table/v1",
  "metadata": { /* tout optionnel */
    "name": "string",
    "caliber": "string",
    "projectileWeight": { "value": number, "unit": "gr"|"g" },
    "referenceVelocity": { "value": number, "unit": "m/s"|"fps" },
    "source": "strelok"|"chairgun"|"mero"|"doppler"|"jbm"|"manual"|"other",
    "sourceVersion": "string",
    "author": "string",
    "notes": "string",
    "createdAt": "ISO-8601"
  },
  "points": [{ "mach": number, "cd": number }]
}
```

Règles :
- `points` = seul champ requis, ≥2 entrées, contrat identique à l'existant (rétrocompat 100%)
- `metadata` entièrement optionnel — un fichier sans metadata reste valide
- `metadata.source` = enum fermé pour traçabilité (réutilise la sémantique `ImportSource`)
- Pas de champ "drag model" : un fichier custom drag table EST une table Cd brute, indépendante de G1/G7 etc.
- Pas de champ unité pour mach/cd : sans dimension par contrat

### Étape 3 — Stratégie d'adaptateurs (spec uniquement)
Documenter sans implémenter :
- CSV plat → pivot (metadata vide)
- JSON minimal `[{mach,cd}]` ou `{table: [...]}` → pivot (metadata vide, rétrocompat A4)
- XML Strelok `<DragTable>` → pivot (metadata.source='strelok', mapping Header→metadata)
- Export AirBallistik → pivot complet (round-trip)

### Étape 4 — Livrable
**1 fichier** sous `docs/apk-analysis/` :

`custom-drag-table-pivot-spec.md`
- Motivation (résumé A1-A4)
- Schéma JSON formel + exemples (minimal, complet, Strelok-converti)
- Règles de validation (points ≥2, mach ∈ [0,10], cd ∈ [0,5], tri ascendant, dedup)
- Tableau de compatibilité avec format actuel `drag-table.ts` (rétrocompat ✅)
- Mapping adaptateurs externes → pivot (Strelok XML, ChairGun ?, JBM, Doppler)
- Stratégie d'évolution (`$schema` versionné — v1 → v2 sans breaking)
- Section "non-objectifs V1" : pas de drag model multi-BC, pas de zones de vélocité (déjà dans `Projectile.bcZones`), pas de température-dépendance
- Section "implémentation future" : étapes proposées (Zod schema, parser, UI import button) — **sans code**

### Garanties de périmètre
- **Aucune** modification de `src/`
- **Aucun** changement à `drag-table.ts`, `import-schemas.ts`, `types.ts`
- **Aucun** nouveau parser, adaptateur, UI
- Tests AirBallistik restent à 786/786
- Spec markdown pure — c'est un contrat, pas une livraison fonctionnelle

### Points sensibles
1. **Rétrocompat** : la spec doit garantir qu'un fichier valide aujourd'hui (`[{mach,cd}]`) reste valide demain — vérifié par contrat "metadata optionnel"
2. **Versioning** : `$schema` introduit pour anticiper v2 sans breaking — décision à figer dans la spec
3. **Pas de doublon avec `bcZones`** : clarifier que custom drag table ≠ BC zones (deux mécanismes orthogonaux)
4. **Source enum** : aligner sur `ImportSource` existant pour cohérence catalogue

### Livrable final
- 1 fichier markdown créé sous `docs/apk-analysis/`
- Compte rendu technique : aucun code modifié, 786/786 tests, aucune décision d'implémentation prise, spec prête pour future tranche d'implémentation
