# APK.A1 — Inventaire par APK

> Légende : ✅ confirmé observation directe · 🟡 hypothèse étayée · ❌ non observable.

---

## 1. ChairGun 1.3.7 (`chairgun-1.3.7.apk`)

| Champ | Valeur | Source |
|-------|--------|--------|
| Format | APK simple | ✅ |
| Taille | 479 KB | ✅ |
| Package | `com.hawke.chairgun` | ✅ via class names `Lcom/hawke/chairgun/...` |
| Version | non lisible directement (manifeste binaire non décompilé) | ❌ — fichier nommé "1.3.7" par convention |
| minSdk / targetSdk | non décompilés (`AndroidManifest.xml` binaire conservé) | ❌ |
| ABIs supportées | aucune (pas de dossier `lib/`) | ✅ — Java only |
| Libs natives `.so` | **aucune** | ✅ |
| DEX | 1 fichier `classes.dex` (716 KB) | ✅ |
| Obfuscation | **Aucune** — noms de classes pleinement lisibles | ✅ |
| Assets balistiques | `assets/chairgun_about.html`, `assets/chairgun_help.html` (HTML doc) | ✅ |
| DB embarquée | aucune SQLite ; mention symbolique d'un `pellet_db` (logique en code) | 🟡 |
| Activités significatives | `PelletsActivity`, `EditPelletActivity`, `WindageActivity`, `CalcCPMOAActivity`, `CalibrateActivity`, `CalcMaxRangeActivity`, `NewReticleActivity`, `PPActivity` (PostProcessing/Plot) | ✅ |
| Layouts XML | `calcbc.xml` (calcul BC), `calcozr.xml` (Optimum Zero), `calcmaxrange.xml` (PBR / max range), `calctruemd.xml` (true Mil-Dot), `calibrate.xml`, `windage.xml`, `mdrf.xml` (Mil-Dot rangefinder), `editpellet.xml`, `pellets.xml`, `reticles.xml`, `cgmain.xml`, `comparetable.xml`, `graphs.xml`, `table.xml` | ✅ |
| Vues custom | `DrawGraph`, `DrawSplash`, `DrawView`, `MDRFDraw` (vues 2D balistiques) | ✅ |
| Réticules embarqués | "Hawke FFP", "Hawke Mil-Dot", "Generic", "General Purpose", "Deer PASS & Slug" (catégories nommées en chaînes) | ✅ |

**Difficulté d'analyse** : très faible. C'est l'APK le plus exploitable pour
comprendre l'architecture historique ChairGun.

---

## 2. ChairGun Elite — JetLab (`chairgun-elite-jetlab.apk`)

| Champ | Valeur | Source |
|-------|--------|--------|
| Format | APK simple | ✅ |
| Taille | 20 MB | ✅ |
| Package | `com.jetlab.chairgunelite` | ✅ via class names |
| Version | non décodée (manifeste binaire) | ❌ |
| minSdk / targetSdk | non décodés | ❌ |
| ABIs / libs natives | **aucune** | ✅ |
| DEX | 7 fichiers (`classes.dex` … `classes7.dex`, dont `classes5.dex` à 18 MB) | ✅ |
| Obfuscation | **Forte** (R8) — packages `com.jetlab.chairgunelite.c.a`, `.g.oa`, etc. | ✅ |
| Assets balistiques | `assets/HTRv1wt4YJgUR0H` (827 KB, entropie 7.9998 → **chiffré**) | ✅ |
| Localisation | 35 fichiers `assets/localization_<lang>.json` (FR, EN, RU, AR, ZH-CN/TW, etc.) — UI multilingue intégrée hors Android resources | ✅ |
| Build hint | `assets/dexopt/baseline.prof` (R8 baseline profile) | ✅ |
| Frameworks | androidx (compose probable vu la taille de classes5.dex), `okhttp`, Google Play Services AdId | 🟡 |

**Difficulté d'analyse** : moyenne. Code obfusqué + asset balistique chiffré
(probable DB pellets/optiques Hawke). Les chaînes UI restent partiellement lisibles
via les fichiers `localization_*.json`.

---

## 3. ChairGun Elite 4.7.2 (`Chairgun.Elite.v.4.7.2.b.172.minSDK23.orig_resigned.apks`)

| Champ | Valeur | Source |
|-------|--------|--------|
| Format | Bundle `.apks` (App Bundle output, resigné) | ✅ |
| Splits internes | `base.apk`, `split_config.arm64_v8a.apk`, `split_config.xxhdpi.apk` + `icon.png` | ✅ |
| Taille bundle / base | 21 MB / 20 MB | ✅ |
| Package | identique à JetLab : `com.jetlab.chairgunelite` (même chaîne de classes) | ✅ |
| Version | "4.7.2 build 172, minSDK 23" — **dérivé du nom du fichier**, non confirmé manifeste | 🟡 |
| split arm64 | présent (5.1 MB) — contient ressources natives ABI-spécifiques (mais aucun `.so` repéré dans la liste) | ✅ |
| **Identité avec JetLab** | **Tous les `classes.dex` à `classes7.dex` ont des md5 strictement identiques à CGE-JetLab** | ✅ critique |

**Conclusion forte** : CGE-JetLab et CGE-4.7.2 partagent **la même build de
moteur**. Cartographie A2 mutualisée.

---

## 4. MERO 1.2.5 (`MERO_1.2.5_APKPure-2.xapk`)

| Champ | Valeur | Source |
|-------|--------|--------|
| Format | Bundle `.xapk` (XAPK Pure) | ✅ |
| Splits | `com.gpc.mero.apk` (base, 3 MB) + 18 splits langue (`config.<lang>`) + 1 split densité (`config.xxxhdpi`) + `manifest.json` + `icon.png` | ✅ |
| Package | `com.gpc.mero` | ✅ manifest.json + class names |
| Version (versionName) | **1.2.5** | ✅ manifest.json |
| versionCode | **23** | ✅ manifest.json |
| minSdk | **22** (Android 5.1 Lollipop) | ✅ manifest.json |
| targetSdk | **34** (Android 14) | ✅ manifest.json |
| Permissions déclarées | `CAMERA`, `WRITE_EXTERNAL_STORAGE`, `READ_EXTERNAL_STORAGE` | ✅ manifest.json |
| Langues UI | ar, de, en, es, fr, hi, in, it, ja, ko, my, pt, ru, th, tr, vi, zh | ✅ split_configs |
| ABIs / libs natives | **aucune** | ✅ |
| DEX | 2 (`classes.dex` 6.6 MB, `classes2.dex` 2 KB) | ✅ |
| Obfuscation | **Légère** — packages `com.gpc.mero.*` lisibles, classes principales nommées | ✅ |
| DB embarquée | **aucune SQLite repérée** dans les assets — DB utilisateur construite en runtime ("`'%s' exists in the MERO database.`") | 🟡 |
| Build hint | `assets/dexopt/baseline.prof` (Android Baseline Profiles) | ✅ |
| Composants principaux | `MainActivity`, `Splash`, `EasyBC`, `EditProjectile`, `Environment`, `Graphs`, `Inclinometer`, `Projectiles`, `Rangefinder`, `Screenshot`, `Table`, `UserFiles`, `DrawGraph`, `Global` | ✅ |

**Difficulté d'analyse** : faible à moyenne. C'est l'APK qui révèle le plus
explicitement les **concepts produit** (PBR, drag laws, projectile editor).

---

## 5. Strelok Pro 6.8.8 (mod) (`strelok-pro-v6.8.8-mod-lenov.ru.apk`)

| Champ | Valeur | Source |
|-------|--------|--------|
| Format | APK simple | ✅ |
| Taille | 10 MB | ✅ |
| Package | `com.borisov.strelokpro` | ✅ via class names |
| Version (annoncée nom de fichier) | 6.8.8 — version non officielle ("mod-lenov.ru") | 🟡 |
| ABIs / libs natives | **aucune** | ✅ |
| DEX | 2 (`classes.dex` 11.8 MB, `classes2.dex` 5.6 MB) | ✅ |
| Obfuscation | **Partielle** — classes métier restent nommées (`Rifle`, `Atm`, `MultiBC`, `Coriolis`, `DragFunc`, `Truing`, etc.) ; classes internes `$a $b ...` minifiées | ✅ |
| Assets balistiques | **`assets/bullets4.db` (839 KB) — SQLite ouvert** | ✅ |
| Autres assets | `m16k60s.wav` (son de tir), `offline.html` / `offlinepng.png` (page hors-ligne) | ✅ |
| DB schema (bullets4.db) | 9 tables : `cartridges` (4029 lignes, BC G1 + bc_g7), `bullets` (3387, jusqu'à 5 BC/vélocités), `bullets_g7` (732), `pellets` (584, **airgun**), `vendors` (203), `calibers` (208), `diameters` (182) | ✅ via PRAGMA |
| Composants nommés (cf. A2) | `Rifle`, `Atm`, `IWT_Atm`, `IWT_Vane`, `Wind`, `Slope`, `Truing`, `TruingTurret`, `Truing_multi`, `Coriolis`, `Coriolis_new`, `MultiBC`, `DragFunc`, `DragList`, `DragShow`, `KestrelDrop`, `Kestrel4x00Atm/Vane`, `Kestrel5x00Atm/Vane`, `WindDrawKestrel`, `Table`, `Vector`, `Diod`, `Dropbox` | ✅ |
| Intégrations matériel | **Kestrel 4×00 / 5×00** (anémomètres BLE), **WeatherFlow**, **Dropbox** (sync) | ✅ |

**Difficulté d'analyse** : faible sur la DB et la nomenclature, **moyenne** sur la
fiabilité fonctionnelle (version mod). La correspondance avec la build officielle
Borisov n'est pas garantie.

---

## Synthèse — densité fonctionnelle observée

| APK | Activities/écrans visibles | Concepts balistiques distincts | DB embarquée |
|-----|----------------------------|--------------------------------|--------------|
| ChairGun 1.3.7 | ~12 (calcbc, calcozr, calcmaxrange, calctruemd, calibrate, windage, mdrf, pellets, reticles, …) | ~10 | ❌ (en code) |
| CGE-JetLab / 4.7.2 | non énumérables (R8) | non énumérables hors UI strings | ⚠ chiffrée |
| MERO 1.2.5 | ~12 classes top-level | ~12 (EasyBC, Inclinometer, drag laws, PBR, …) | ❌ (runtime) |
| Strelok Pro 6.8.8 | ~30+ classes top-level | ~20 (Truing, MultiBC, Kestrel, Coriolis, …) | ✅ `bullets4.db` |
