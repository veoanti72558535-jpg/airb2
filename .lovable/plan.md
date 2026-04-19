
L'utilisateur a fourni le 5ème APK manquant : `Chairgun.Elite.v.4.7.2.b.172.minSDK23.orig_resigned.apks`. Le périmètre APK.A1 + APK.A2 est désormais complet avec les 5 artefacts.

## Plan d'exécution Tranche APK.A1 + APK.A2

### Artefacts (5 APK / bundles)
1. `Chairgun.Elite.v.4.7.2.b.172.minSDK23.orig_resigned.apks` (nouveau — bundle .apks)
2. `ChairGun-1.3.7-2.apk`
3. `com.jetlab.chairgunelite.apk`
4. `MERO_1.2.5_APKPure-2.xapk`
5. `strelok-pro-v6.8.8-mod-lenov.ru.apk`

### Étape 1 — Extraction & préparation
- `lov-copy` les 5 fichiers vers `/tmp/apk-analysis/`
- Décompresser `.apks` (split bundle) et `.xapk` (zip multi-APK + OBB) → identifier APK base
- `unzip -l` sur chaque APK pour vue d'ensemble structurelle

### Étape 2 — Inventaire APK.A1
Pour chaque APK :
- `aapt2 dump badging` (via `nix run nixpkgs#aapt`) → package, version, versionCode, minSdk, targetSdk, permissions, ABIs
- `aapt2 dump xmltree` sur AndroidManifest.xml → activités, services, providers significatifs
- Liste `lib/<abi>/*.so` + `strings` ciblés balistique
- Identification assets/raw (`.db`, `.json`, `.csv`, `.xml`)
- Détection obfuscation (R8/ProGuard via classes `a.class`, `b.class`)

### Étape 3 — Cartographie APK.A2
Pour chaque APK :
- `strings classes*.dex | grep -iE "ballist|drag|bc|G1|G7|zero|PBR|wind|atmos|reticle|click|MOA|MIL|mrad|projectile|scope|turret"`
- Identification SQLite embarquées (schemas via `sqlite3 .schema`, sans dump propriétaire)
- Distinction certitudes / hypothèses / incertitudes
- Découpage logique : UI / métier / tables / natif

### Étape 4 — Lecture comparative AirBallistik
Tableau markdown synthétique des écarts.

### Étape 5 — Documentation
Création dans `docs/apk-analysis/` :
- `README.md` — vue d'ensemble, niveau de confiance global
- `inventory.md` — APK.A1 par APK
- `ballistic-mapping.md` — APK.A2 par APK
- `comparison-airballistik.md` — tableau comparatif
- `limits-and-recommendations.md` — limites, risques, suites APK.A3/A4

### Garanties de périmètre
- **Aucune** modification de `src/` (code produit AirBallistik)
- **Aucun** changement moteur, EngineBadge, QuickCalc, Sessions, Compare, Routes, MERO
- Tests AirBallistik restent à 786/786
- Tous artefacts dans `docs/apk-analysis/` uniquement

### Points sensibles
1. **Légal** : ChairGun (Hawke), MERO, Strelok Pro = propriétaires. Cartographie structurelle seulement, pas d'extraction massive de code/données protégées. Mention "analyse interne, usage personnel".
2. **Strelok Pro modé** : version non officielle — fiabilité d'analyse réduite, signalée explicitement.
3. **Obfuscation** : ChairGun Elite et Strelok Pro probablement obfusqués (R8). Cartographie partielle attendue.
4. **Bundle .apks** : peut contenir plusieurs splits (base + config + locale). Analyse focalisée sur le split base.
5. **Fichiers chiffrés / SQLCipher** : signalés sans tentative de déchiffrement.

### Livrable final
5 fichiers markdown dans `docs/apk-analysis/` + compte rendu technique détaillé en fin de réponse, avec confirmation explicite qu'aucun code produit n'a été modifié et que les tests restent à 786/786.
