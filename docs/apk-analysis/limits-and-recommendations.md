# Limites, risques et recommandations de suite

## 1. Limites d'analyse assumées

### 1.1 Cadre légal et éthique

- ChairGun et ChairGun Elite sont édités par **Hawke Optics**.
- MERO est édité par **GPC** (`com.gpc.mero`).
- Strelok / Strelok Pro est édité par **Igor Borisov** (`com.borisov.strelokpro`).

L'analyse menée ici est **strictement structurelle** :
- ✅ extraction de noms de classes, libellés UI, schémas SQLite
- ✅ comptes statistiques (lignes en DB, MD5 de DEX)
- ✅ recherches de chaînes par expression régulière
- ❌ **aucun** code source décompilé reproduit
- ❌ **aucune** tentative de déchiffrement de l'asset chiffré CGE
- ❌ **aucune** extraction de la base bullets4 vers les seeds AirBallistik

### 1.2 Limites techniques rencontrées

| Limite | Impact |
|--------|--------|
| Manifeste binaire Android (`AndroidManifest.xml` AXML) non décodé | versions, minSdk, targetSdk, permissions et activités exactes non confirmées pour CG-1.3.7, CGE-JetLab, CGE-4.7.2 et Strelok Pro. Confirmation possible avec `aapt`/`apktool` si la décision le justifie. |
| Asset CGE chiffré `HTRv1wt4YJgUR0H` (entropie 7.9998 bits/byte) | Le contenu (probable DB pellets+optiques) n'est pas exploitable sans la clé Hawke. **N'est pas un objectif d'AirBallistik**. |
| Obfuscation R8 sur CGE | Cartographie A2 quasi vide pour CGE. Compensable partiellement via `localization_*.json` (35 fichiers, ~150 KB chacun). |
| Strelok Pro = version "mod" | Aucune garantie que le moteur est strictement identique à la build officielle. Toute observation doit être traitée comme **indicative**, pas comme spec officielle. |
| Pas de `lib/*.so` natifs | Bonne nouvelle (pas de C/C++ à reverser), mais signifie aussi que **toute** la balistique est en bytecode → analyse plus profonde nécessite un décompilateur Java — pas réalisé ici. |
| MERO `localization_*` non extraits | Les libellés exacts par langue n'ont pas été énumérés. |

### 1.3 Risques d'interprétation

- **Continuité ChairGun 1.3.7 → ChairGun Elite** : on l'a posée comme hypothèse
  étayée mais elle n'est **pas démontrée** (refonte Kotlin probable + chiffrement
  des assets).
- **Equivalence CGE-JetLab ≡ CGE-4.7.2** : démontrée pour le code (md5 DEX
  identiques) mais **les ressources et signatures diffèrent** (md5 APK différents).
  Cela n'invalide pas l'équivalence fonctionnelle moteur.
- **MERO "GA / GA2" = airgun diabolo** : cohérent avec la convention historique
  de la communauté airgun ballistique (tables Mero/Borisov), mais nous n'avons pas
  observé directement les **coefficients** de ces tables dans MERO (ils sont
  vraisemblablement compilés dans `classes.dex`).
- **Strelok Pro `pellets` = 584 lignes** : c'est la table source que la
  pipeline AirBallistik (`import-pipeline.bullets4.test.ts`) consomme déjà.

## 2. Risques métier / produit

| Risque | Mitigation |
|--------|-----------|
| Tentation de reprendre la nomenclature de drag laws MERO (GA/GA2/RA*/SLG*) sans validation moteur | Respect strict de `mem://constraints/mero-exposure-gates` — MERO reste sous flag jusqu'à session migration + product fixtures + zero-solver cross-tests. |
| Tentation d'importer le contenu de `bullets4.db` Strelok comme seed AirBallistik | `import-pipeline` est déjà la voie propre pour cela (import utilisateur), pas de seed silencieux. |
| Tentation d'extraire les libellés de `localization_*.json` CGE pour FR/EN AirBallistik | À éviter — propriété Hawke. Les traductions AirBallistik doivent rester originales. |
| Confusion catalogue Strelok vs catalogue propre AirBallistik | Pas d'action — déjà séparé : seeds propres (`seed-projectiles.ts`, `seed-optics.ts`, `seed-airguns.ts`) + pipeline d'import utilisateur. |

## 3. Recommandations de suite (toutes en option, aucune n'est engagée)

### APK.A3 — Extraction documentaire approfondie (au cas par cas)

| Cible candidate | Bénéfice attendu | Coût |
|-----------------|------------------|------|
| MERO — extraire les libellés `localization_*.json` ou décompiler `classes.dex` (jadx) pour cartographier le menu drag law complet | Liste exhaustive des drag laws MERO (utile pour valider AirBallistik MERO mode si jamais exposé) | **Moyen** — usage interne, pas de redistribution |
| Strelok Pro — décompiler les classes `Truing*` et `Coriolis*` pour comprendre la logique de recalage / latitude | Référence pour une éventuelle V2 AirBallistik (truing) | **Moyen-élevé** — code propriétaire Borisov, à n'envisager que pour inspiration architecturale, pas copie |
| ChairGun 1.3.7 — décompiler le moteur (DEX 716 KB, non obfusqué) | Comprendre la formule G1 + corrections atmo classique Hawke | **Faible techniquement, sensible juridiquement** |

### APK.A4 — Matrice comparative détaillée

À envisager si APK.A3 est validé : matrice cellule par cellule entre les
quatre apps + AirBallistik, avec **références écrites** (page, layout, classe)
pour chaque assertion. Plus utile en preuve d'alignement V2 que pour V1.

### APK.A5 — Normalisation potentielle

Si une décision produit voulait **un format pivot d'import** (drag tables custom
tirées d'exports Strelok `<DragTable>`, ou catalogues pellets MERO format
utilisateur), APK.A5 cadrerait :
- Spécifie le format pivot AirBallistik (extension du `import-schemas.ts` existant)
- Définit le mapping inverse vers chaque app
- Ne touche pas le moteur (ne fait qu'enrichir l'entrée)

### Arrêt légitime

Il est **parfaitement défendable** de s'arrêter à APK.A1+A2 (cette tranche) :
- Le besoin produit V1 AirBallistik est couvert.
- Les écarts majeurs (truing, Coriolis, multi-BC, inclinaison) sont **identifiés
  et conscients**.
- Aller plus loin engage du temps sur du code propriétaire.

## 4. Confirmations explicites de non-impact

- ✅ **Aucun fichier dans `src/` n'a été créé, modifié ou supprimé.**
- ✅ **Aucun changement** au moteur balistique (`src/lib/ballistics/**`).
- ✅ **Aucun changement** à `EngineBadge`, `QuickCalc`, `SessionsPage`, `ComparePage`,
  routes, ou exposition MERO.
- ✅ **Aucune dépendance npm** ajoutée ou retirée.
- ✅ **Aucun test** exécuté ou modifié — la suite reste à 786/786 verts comme
  avant la tranche.
- ✅ **Aucun déchiffrement** ni tentative de contournement de protection sur
  `assets/HTRv1wt4YJgUR0H` (CGE).
- ✅ **Aucune extraction** de données propriétaires vers les seeds AirBallistik.
- ✅ Tous les artefacts d'analyse vivent **uniquement** sous `docs/apk-analysis/`.
