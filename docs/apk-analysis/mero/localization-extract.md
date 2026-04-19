# MERO 1.2.5 — extraction des libellés UI (APK.A3)

> **Cadre légal et déontologique** — MERO est un logiciel propriétaire
> (GPC / Ballisticboy). Le présent document est une **analyse structurelle
> personnelle interne** réalisée à des fins de cadrage roadmap pour
> AirBallistik. **Aucun fichier MERO ne sera redistribué**, aucun extrait
> propriétaire ne sera intégré tel quel au produit AirBallistik. Tout
> recoupement avec une éventuelle V2 d'AirBallistik passera par une
> ré-écriture indépendante des libellés et concepts.

## 1. Réalité de l'architecture i18n MERO

### 1.1 Constat empirique

Le plan de tranche supposait l'existence de **18 fichiers
`assets/localization_*.json`**. Après extraction du bundle `.xapk` puis
inspection de l'APK base `com.gpc.mero.apk`, ce constat doit être corrigé :

- **Aucun fichier `assets/localization_*.json`** n'existe.
- L'APK base ne contient que `assets/dexopt/baseline.prof[m]` côté assets.
- La string-pool de `resources.arsc` du base APK ne contient que des chemins
  de ressources (`res/anim/abc_*.xml`, etc.) — aucune chaîne UI applicative.
- Les **18 splits de configuration** observés dans le bundle `.xapk` :
  ```
  config.ar.apk  config.de.apk  config.en.apk  config.es.apk
  config.fr.apk  config.hi.apk  config.in.apk  config.it.apk
  config.ja.apk  config.ko.apk  config.my.apk  config.pt.apk
  config.ru.apk  config.th.apk  config.tr.apk  config.vi.apk
  config.zh.apk  config.xxxhdpi.apk
  ```
  → **17 splits de langue + 1 split de densité écran**. Chacun ne contient
  qu'un `resources.arsc` (3,7 ko à 15 ko) — taille trop faible pour héberger
  l'intégralité des chaînes UI MERO. Vérification faite, ils ne contiennent
  que les **traductions du framework AndroidX** (`Navigate up`, `Search…`,
  `OFF`, `ON`, etc.) — pas les chaînes spécifiques MERO.

### 1.2 Conclusion architecturale

MERO est une application **Jetpack Compose / Kotlin** dont les chaînes UI
sont **hard-codées dans le bytecode `classes.dex` / `classes2.dex`**, en
anglais uniquement. Les 17 splits de langue ne couvrent que la couche
système Android, **pas le contenu balistique MERO**. Cela infirme
l'hypothèse "MERO supporte 18 langues" lue dans la fiche store : la liste
des langues correspond aux **traductions AndroidX disponibles** au moment
du build, pas à une i18n applicative propre.

→ **AirBallistik est en avance sur MERO sur ce point** : `src/lib/i18n.tsx`
et `src/lib/translations.ts` couvrent FR/EN intégralement pour le contenu
métier, alors que MERO est unilingue anglais sur les libellés balistiques.

## 2. Méthode d'extraction effective

Faute de JSON localization, l'extraction a porté sur :

1. `unzip` du bundle `.xapk` → 19 splits + manifest + icon.
2. `unzip` de `com.gpc.mero.apk` → `classes.dex` + `classes2.dex` + assets/.
3. `strings` sur les deux DEX → `dex-strings.txt` (91 939 lignes).
4. `aapt dump strings` sur `com.gpc.mero.apk` → 316 entrées (chemins de
   ressources uniquement, pas de UI strings).
5. Filtrage thématique balistique sur `dex-strings.txt`.

Le contenu suivant est issu **exclusivement** de cette inspection
structurelle, sans déchiffrement, sans dump intégral, sans copie de code.

## 3. Inventaire des libellés balistiques observés (anglais uniquement)

### 3.1 Famille « Atmosphère »

| Libellé observé | Concept équivalent AirBallistik |
|-----------------|---------------------------------|
| `Ambient Pressure` | `EnvironmentSection` — pression |
| `Ambient Relative Humidity` | `EnvironmentSection` — humidité |
| `Ambient Temperature` | `EnvironmentSection` — température |
| `Pressure at Sea Level` | non exposé V1 (calculé via altitude) |
| `PressureAtAlt` | non exposé V1 |
| `TemperatureAtAlt` | non exposé V1 |
| `Tap for the Atmospheric Options menu` | (UX hint — sans équivalent direct) |

### 3.2 Famille « Tir / Setup »

| Libellé observé | Concept équivalent AirBallistik |
|-----------------|---------------------------------|
| `Muzzle Velocity:` | `VelocitySection` — V0 |
| `Velocity at Muzzle` | idem |
| `Velocity at Target` | colonne table balistique |
| `Sight Height` / `Sight height :` | `OpticSection` — sight height |
| `Zero` | `ZeroingSection` — zéro |
| `Target Range` / `Target Range:` | `DistanceSection` — distance cible |
| `Target Size` / `Target Size:` | `PbrCard` — kill-zone |
| `Inclination :` / `Inclination from Horizontal` | **non couvert V1** |
| `Inclinometer Display Options` | **non couvert V1** |
| `Set Inclination to zero for setup` | **non couvert V1** |

### 3.3 Famille « Vent »

| Libellé observé | Concept équivalent AirBallistik |
|-----------------|---------------------------------|
| `Wind` | (section vent) |
| `Wind Angle:` | (angle de vent — couvert) |
| `Wind Drift` / `Wind Drift :` | colonne table |
| `Wind Drift (%s)` | colonne table avec unité |
| `Wind Drift (%s) v. Range (%s)` | (libellé graphique) |
| `Wind: WS:%1.1f %s @ %1.0f` | format compact session |
| `Tap for Wind Angle menu` | (UX hint) |

### 3.4 Famille « Drag law / BC »

Détaillée intégralement dans `drag-law-menu.md`. Libellés-clés :

- `Drag Law (%s)` — affichage en-tête table.
- `Current Drag Law: ` — label statut.
- `Drag Law = ` — label de configuration.
- `Tap for Drag Law list` — UX hint sur le bouton menu.
- `Tap for Projectile Drag Law` — UX hint variante par projectile.
- `DragLaw=%d` — sérialisation persistance (entier ordinal).
- `Ballistic Coefficient` / `Ballistic Coefficient: %1.4f (%s)` — affichage BC.

### 3.5 Famille « Projectile / Pellet »

| Libellé observé | Concept équivalent AirBallistik |
|-----------------|---------------------------------|
| `Projectile` / `Projectile :` | `ProjectileSection` |
| `Projectile name` | nom |
| `Projectile weight` / `Projectile Weight:` / `Projectile Weight/Mass` | masse |
| `Projectile diameter` / `Projectile Diameter:` | calibre |
| `Projectile Reference Diameter` | (étendu, non exposé V1) |
| `nPellets` / `lab_npellets` | (compte d'inventaire) |
| `pelletInventory` / `getPelletInventory` | catalogue interne |

### 3.6 Famille « Optique / Réticule / Calibration »

| Libellé observé | Concept équivalent AirBallistik |
|-----------------|---------------------------------|
| `Calibration` / `Calibration Magnification` | `OpticSection` — calibration grossissement |
| `Clicks` / `Clicks: C/MOA:%1.4f` | clicks par MOA |
| `Tap for Click Size Options menu` | UX hint |
| `Mildot` | type réticule |
| `Reticle Display Options` | options affichage |
| `Reticle: %s @ %1.1fx/%1.1fx/%s` | format compact session (réticule + zoom calib + zoom utilisé + unité) |
| `Rangefinder Display Options` | (estimation distance par mil-dot) |

### 3.7 Famille « PBR / Énergie / Trajectoire »

| Libellé observé | Concept équivalent AirBallistik |
|-----------------|---------------------------------|
| `PBR  :` / `PBR (%s)` | `PbrCard` |
| `Cycle PBR Units:` | bascule unités PBR |
| `Setting Maximum PoI.` / `Setting Minimum PoI.` | bornes haut/bas |
| `Energy` / `Muzzle Energy` / `Muzzle Energy:` | colonne énergie |
| `Ballistics Envelope` | enveloppe PBR (mini-graphe ?) |
| `Ballistics Table` | table balistique |
| `Range, PoI, PoI, Drift, Drift` | en-têtes colonnes (PoI + drift) |
| `Range, Vel., Energy, Momentum, Time` | en-têtes colonnes alt. |
| `Velocity (%s) v. Range (%s)` | titre graphique |

### 3.8 Famille « Format de session compact (string templates) »

| Template | Lecture |
|----------|---------|
| `Ballistics: MV:%1.0f, ZR:%1.1f, SH:%1.2f, TR:%1.1f` | snapshot affiché en haut |
| `Wind: WS:%1.1f %s @ %1.0f` | snapshot vent |
| `Reticle: %s @ %1.1fx/%1.1fx/%s` | snapshot réticule |
| `Projectile: %s` | snapshot projectile |
| `Ballistic Coefficient: %1.4f (%s)` | snapshot BC + drag law |
| `Drag Law (%s)` | snapshot drag law sélectionnée |

→ **Ces templates confirment** que MERO sérialise/affiche les sessions
sous une forme texte unilingue. AirBallistik est plus structuré (objets
typés `Session`, métadata `CalculationMetadataBlock`).

## 4. Famille des « clés _lab_* / lab_* » repérées en bytecode

Ces préfixes sont utilisés en interne par MERO pour identifier des
éléments de UI (probablement reliés à des `findViewById` ou `Compose`
modifiers). Ils ne sont PAS des clés i18n — il n'existe pas de table
de correspondance multi-langue. Ils servent à documenter ici les
**concepts présents dans MERO**, pas à proposer des labels.

Liste exhaustive observée (sans valeur associée — ce ne sont que des
identifiants techniques) :

```
_lab_BC, _lab_CALMAG, _lab_INDMAG, _lab_POI, _lab_SH, _lab_TR, _lab_TS,
_lab_V0, _lab_V1, _lab_ZR, _lab_angle, _lab_bc, _lab_cal, _lab_calmag,
_lab_cpmoa, _lab_cw, _lab_description, _lab_details, _lab_details2,
_lab_elevation, _lab_explain, _lab_explain_buttons, _lab_ff,
_lab_filename, _lab_humidity, _lab_inc, _lab_indmag, _lab_ke, _lab_kz,
_lab_mag, _lab_mv, _lab_npellets, _lab_pbr, _lab_scopetype, _lab_sd,
_lab_sh, _lab_tellme, _lab_title, _lab_tmp, _lab_tr, _lab_trigger,
_lab_wt, _lab_zr
```

| Préfixe | Lecture probable | Couvert dans AirBallistik V1 ? |
|---------|------------------|-------------------------------|
| `_lab_V0`, `_lab_V1` | vélocité initiale / cible | ✅ V0 oui, V1 non exposé |
| `_lab_ZR` | zero range | ✅ |
| `_lab_SH` | sight height | ✅ |
| `_lab_TR` | target range | ✅ |
| `_lab_TS` | target size | ✅ (kill-zone PBR) |
| `_lab_BC` | ballistic coefficient | ✅ |
| `_lab_CALMAG` | calibration magnification | ✅ |
| `_lab_INDMAG` | indicated magnification (utilisée) | 🟡 partiel via FFP/SFP |
| `_lab_POI` | point of impact | ✅ (drop) |
| `_lab_KE` | énergie cinétique | ✅ |
| `_lab_KZ` | kill-zone | ✅ |
| `_lab_PBR` | PBR | ✅ |
| `_lab_inc` / `_lab_angle` | inclinaison | ❌ V1 |
| `_lab_cw` | cant / wind ? | 🟡 vent oui, cant non |
| `_lab_cpmoa` | clicks par MOA | 🟡 partiel (CalibrationSection) |
| `_lab_humidity` / `_lab_tmp` | humidité / température | ✅ |
| `_lab_ff` | form factor | ❌ V1 (BC unique exposé) |
| `_lab_sd` | sectional density | ❌ V1 |
| `_lab_npellets` | nombre de pellets en stock | N/A (hors scope V1) |
| `_lab_scopetype` | type de lunette | 🟡 (existe via OpticSection) |
| `_lab_trigger` | détente (poids/course) | ❌ V1 |

## 5. Section non-balistique — résumé synthétique

L'extraction `dex-strings.txt` contient ~92 000 lignes dont la grande
majorité est :

- **Bytecode AndroidX/Kotlin** (noms de classes, signatures JVM, packages)
  — non pertinent.
- **Messages d'erreur Android standards** (`Activity has been destroyed`,
  `Already attached`, etc.).
- **Éléments UI génériques** (`Save`, `Delete`, `Edit`, `Cancel`).

Aucune extraction exhaustive de cette couche n'est livrée — elle ne
présente pas d'intérêt comparatif pour AirBallistik.

## 6. Limites d'analyse

- ⚠️ MERO étant en `classes.dex` non-obfusqué partiellement, les noms de
  classes et de lambdas sont préservés mais le code interne (corps des
  méthodes) n'est PAS lu — seules les chaînes littérales le sont.
- ⚠️ Aucun outil de désassemblage DEX n'a été utilisé (pas de `baksmali`,
  pas de `jadx`). L'analyse reste à la frontière strings-only.
- ⚠️ Les libellés `lab_*` sont des **identifiants** sans valeur associée
  visible côté strings — leur rôle reste inféré.
- ⚠️ Les seules localisations effectives sont AndroidX (framework), pas
  MERO.

## 7. Bilan

Cette extraction confirme que :

1. **MERO est unilingue anglais** sur le contenu balistique. AirBallistik
   FR/EN est plus avancé sur l'i18n.
2. **Le scope conceptuel** de MERO recouvre largement V1 d'AirBallistik
   (atmosphère, vent, zéro, BC, PBR, réticule, calibration).
3. **Les écarts conceptuels** principaux : **inclinaison de tir**,
   **form factor explicite**, **inventaire pellets** (gestion stock),
   **trigger** — tous **hors V1 d'AirBallistik** par décision produit.
4. **L'extraction des entrées drag law** est consolidée dans
   `drag-law-menu.md` (livrable 2/2 de cette tranche).