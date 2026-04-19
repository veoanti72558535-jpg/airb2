# APK Analysis — AirBallistik / Tranches APK.A1 + APK.A2

> **Périmètre** : analyse documentaire et structurelle d'APK Android tiers liés à la
> balistique petits calibres / airgun. **Aucune** modification du code produit
> AirBallistik n'a été introduite par cette analyse.
>
> **Cadre légal** : ChairGun (Hawke Optics), MERO (GPC) et Strelok Pro (Borisov) sont
> des logiciels propriétaires. Cette analyse est strictement structurelle (noms de
> classes, constantes, tables, libellés UI). **Aucun code décompilé** n'est reproduit
> et **aucune base de données propriétaire n'a été déchiffrée**.

## 1. Vue d'ensemble

| # | Artefact (alias court) | Format | Taille | Exploitable ? | Confiance analyse |
|---|------------------------|--------|--------|---------------|-------------------|
| 1 | `chairgun-1.3.7.apk` (CG-legacy) | APK | 479 KB | ✅ Oui — non obfusqué | **Élevée** |
| 2 | `chairgun-elite-jetlab.apk` (CGE-J) | APK | 20 MB | ⚠️ Partiel — obfusqué R8 | Moyenne |
| 3 | `chairgun-elite-4.7.2.apks` → `base.apk` (CGE-4.7.2) | Bundle .apks | 21 MB → 20 MB | ⚠️ Partiel — obfusqué R8 | Moyenne |
| 4 | `mero-1.2.5.xapk` → `com.gpc.mero.apk` (MERO) | Bundle .xapk | 3.5 MB → 3.0 MB | ✅ Oui — partiellement lisible | **Élevée** |
| 5 | `strelok-pro-6.8.8.apk` (StrelokPro) | APK (mod) | 10 MB | ✅ Oui — partiellement obfusqué | **Élevée** |

### Faits structurels marquants

- **CGE-J ≡ CGE-4.7.2** : les 7 fichiers `classes*.dex` sont **strictement identiques**
  (md5 identiques sur les 7). Les deux conditionnements (APK simple JetLab vs bundle
  AAB resigné) embarquent **la même build applicative**. → Une seule cartographie
  vaut pour les deux, ce qui simplifie l'analyse.
- **Aucune lib native (`.so`)** dans aucun des 5 APK. Toute la balistique est en
  **bytecode JVM (DEX)** — pas de couche C/C++ à reverser.
- **Strelok Pro embarque `assets/bullets4.db`** (839 KB) — c'est exactement le format
  reconnu par AirBallistik dans `src/lib/import-pipeline.ts` (cf.
  `import-pipeline.bullets4.test.ts`). La structure relevée ici **confirme**
  l'implémentation existante côté AirBallistik.
- **CGE (toutes versions) embarque un asset chiffré** `assets/HTRv1wt4YJgUR0H`
  (827 KB, entropie 7.9998 bits/byte) — vraisemblablement la base pellets/optiques
  Hawke chiffrée. **Aucune tentative de déchiffrement n'a été faite**.
- **MERO** : code Java/Kotlin **non obfusqué** au niveau des packages produit
  (`com.gpc.mero.*`). Modules métier directement nommés : `EasyBC`, `Environment`,
  `Inclinometer`, `Projectiles`, `EditProjectile`, `Table`, `Graphs`, `Rangefinder`.

### Niveau de confiance global

- **Élevé** sur : ChairGun 1.3.7 (legacy clair), MERO (peu obfusqué), Strelok Pro
  (DB SQLite ouverte + classes balistiques nommées).
- **Moyen** sur : ChairGun Elite (R8 + asset chiffré).
- **Limité** sur : Strelok Pro version "mod-lenov.ru" — version non officielle,
  potentiellement modifiée. Les noms de classes restent ceux de Borisov mais on ne
  peut **garantir** que le moteur est strictement identique à la version officielle.

## 2. Documents associés

- [`inventory.md`](./inventory.md) — APK.A1 — inventaire détaillé par APK
- [`ballistic-mapping.md`](./ballistic-mapping.md) — APK.A2 — cartographie des
  composants balistiques par APK
- [`comparison-airballistik.md`](./comparison-airballistik.md) — tableau comparatif
  préliminaire avec AirBallistik
- [`limits-and-recommendations.md`](./limits-and-recommendations.md) — limites,
  risques, suites APK.A3 / A4 envisageables

## 3. Méthodologie

Outils utilisés (tous opérés dans `/tmp/apk-analysis/`, hors `src/`) :

- `unzip` — extraction des conteneurs `.apks`, `.xapk`, et des APK eux-mêmes
- `strings` — extraction des chaînes ASCII des `classes*.dex` (filtrage par
  expressions régulières balistiques)
- `python3 sqlite3` — lecture de schémas et comptes de lignes de
  `bullets4.db` (Strelok)
- `python3` — calcul d'entropie sur l'asset chiffré CGE
- `md5sum` — comparaison binaire des DEX (déduplication CGE-J / CGE-4.7.2)

**Outils volontairement non utilisés** : `apktool`, `jadx`, `dex2jar`, `bytecode-viewer`,
décompilateurs Java. Ces outils auraient produit du code source dérivé d'œuvres
protégées ; l'analyse est restée à un niveau de chaînes / schémas / structure.

## 4. Statut

- ✅ **APK.A1** complet — inventaire pour les 5 artefacts
- ✅ **APK.A2** complet — cartographie balistique pour les 5 artefacts
- ⏸ **APK.A3 / A4** — non engagés (relèvent d'une décision produit ultérieure)
