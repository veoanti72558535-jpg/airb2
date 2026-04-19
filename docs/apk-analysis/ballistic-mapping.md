# APK.A2 — Cartographie balistique par APK

> Convention : ✅ certitude observée · 🟡 hypothèse étayée par les chaînes ·
> ❓ incertitude non levée par cette tranche.

---

## 1. ChairGun 1.3.7 (legacy, non obfusqué) — `com.hawke.chairgun`

### Découpage logique observé

| Couche | Élément | Évidence |
|--------|---------|----------|
| UI / Activities | `PelletsActivity`, `EditPelletActivity`, `NewReticleActivity`, `WindageActivity`, `CalcCPMOAActivity`, `CalcMaxRangeActivity`, `CalibrateActivity`, `PPActivity` | ✅ class names |
| Layouts | `calcbc` (calcul BC depuis chrono), `calcozr` (Optimum Zero Range), `calcmaxrange` (Max Range / PBR), `calctruemd` (true Mil-Dot), `mdrf` (Mil-Dot rangefinder), `windage`, `calibrate`, `editpellet`, `pellets`, `reticles`, `cgmain`, `comparetable`, `graphs`, `table` | ✅ noms XML |
| Vues custom | `DrawGraph`, `DrawSplash`, `DrawView`, `MDRFDraw` | ✅ |
| Logique métier | classe `Global` (état partagé), méthodes `init()`, `readDB()`, `readPrefs()`, `writePrefs()`, `validateInput()`, `drawTable()`, `drawTable() - compare`, `backup()`, `checkStoragePermission()` | ✅ |

### Concepts balistiques observés

| Concept | Présent ? | Évidence (chaîne UI / code) |
|---------|-----------|-----------------------------|
| Loi de traînée G1 | ✅ implicite (BC unique en pellet_db) | "Projectile Ballistic Coefficient" |
| Loi G7 / autres | ❓ non observé dans les chaînes | — |
| Vélocité initiale (muzzle) | ✅ | "Velocity at muzzle", "Velocity of projectile at muzzle" |
| Sight height | ✅ | "Scope height (measured at muzzle)" |
| Zero (near / far / same) | ✅ | "Near Zero Range = ", "Far Zero Range = ", "Optimum Zero Range", "Same Zero Range", "Accept new far zero range" |
| **PBR / MPBR** | ✅ explicite | layout `calcmaxrange`, "Edit Target Size", "Mil-Dot FT Target Size = 10/15/25/30/35/40/45/50/108" |
| Atmosphère | ✅ | "Ambient Temperature", "Ambient Relative Humidity", "TemperatureAtAlt", `STD_HUMIDITY`, `HUMIDITY` |
| Vent | ✅ | `WindageActivity`, "Absolute Wind Speed", "Wind Angle relative to trajectory" |
| Spin drift / Coriolis | ❓ non observé | — |
| Réticule / Mil-Dot RF | ✅ | `MDRFDraw`, layout `mdrf`, "True Mil-Dot @ %1.1fx, Mag = %1.1fx", "Mil Dot 10x", "Mil Dot 20x" |
| Clicks / MoA cal | ✅ | layout `calccpmoa`, `CalcCPMOAActivity`, "Scope Clicks-per-MoA calibration", `mildot10x`, `mildot20x` |
| Unités | ✅ | colonnes lisibles : `(Yard) (cm) (clk) (moa)`, `(Yard) (in) (moa) (mil) (clk)`, `Pellets`, `Grain`, "Projectile Weight = %1.2f Grain" |
| Comparaison de profils | ✅ | layout `comparetable`, "Various Ballistic and Trajectory Graphs" |
| Réticules pré-câblés | ✅ | "Hawke FFP", "Hawke Mil-Dot", "Generic", "General Purpose", "Deer PASS & Slug" |

### Hypothèse de moteur balistique
Calcul ballistique entièrement en Java. **Modèle G1 unique** très probable
(pellets airgun bas Mach), avec corrections atmosphériques standard (température,
humidité, altitude implicite via `TemperatureAtAlt`). Pas d'évidence d'intégration
numérique avancée — vraisemblablement une formule fermée ou pas-à-pas simple. ❓

---

## 2. ChairGun Elite — JetLab ≡ 4.7.2 — `com.jetlab.chairgunelite`

> Build identique entre les deux APK (md5 DEX × 7 confirmés). Une seule
> cartographie pour les deux.

### Surface observable

- **Code obfusqué R8** : packages `com.jetlab.chairgunelite.c.{a..z}`,
  `com.jetlab.chairgunelite.g.{a..z, aa, oa, …}`. Les noms métier sont effacés.
- **Une classe top-level lisible** : `SlopeCamera` → cohérent avec une fonctionnalité
  de mesure d'angle de tir (slope / inclination).
- **35 fichiers `localization_*.json`** côté `assets/` : ces fichiers contiennent
  vraisemblablement tous les libellés UI (drag laws, pellets, atmosphère, etc.).
  **Non extraits** dans cette tranche pour rester strictement structurel — extraction
  reportée à APK.A3 si la décision produit le justifie.
- **Asset chiffré** `assets/HTRv1wt4YJgUR0H` (827 KB, entropie 7.9998 bits/byte → 
  bruit blanc indissociable de chiffrement type AES). 🟡 **Hypothèse forte** :
  base de données pellets + optiques Hawke (substitution moderne du `pellet_db`
  observé dans la version 1.3.7 legacy, désormais protégée).

### Concepts balistiques

| Concept | Statut | Source |
|---------|--------|--------|
| Drag laws | ❓ non observable hors `localization_*.json` | obfusqué |
| PBR / MPBR | 🟡 probable (continuité fonctionnelle de CG legacy) | inférence |
| Réticules Hawke | 🟡 probable (Hawke est l'éditeur officiel) | inférence |
| Atmosphère | 🟡 probable | inférence |
| Slope / inclinaison | ✅ | classe `SlopeCamera` lisible |

### Hypothèse de moteur
Probablement une **réécriture Kotlin** (taille de classes5.dex, Compose probable,
androidx massif). La présence d'un asset chiffré suggère une **protection
commerciale** explicite des coefficients ballistiques (ce qui est standard
chez Hawke). ❓

---

## 3. MERO 1.2.5 — `com.gpc.mero`

### Découpage logique observé (très lisible)

| Module | Rôle inféré | Évidence |
|--------|-------------|----------|
| `MainActivity` | écran principal de calcul | ✅ |
| `Splash` | démarrage | ✅ |
| `Environment` | atmosphère (température, humidité, pression, altitude) | ✅ + "Tap for the Atmospheric Options menu" |
| `EasyBC` | **calculateur de BC depuis observation terrain** | ✅ — 48+ handlers `lambda$onCreate$N$com-gpc-mero-EasyBC` + 7 `lambda$showDragLawMenu$*` |
| `Inclinometer` | mesure d'inclinaison de tir | ✅ + "Set Inclination to zero for setup" |
| `Projectiles` / `EditProjectile` | bibliothèque de projectiles | ✅ + "'%s' exists in the MERO database." + "Copy current details as a new projectile" |
| `Table` | table balistique tabulaire | ✅ |
| `Graphs` / `DrawGraph` | rendu des courbes | ✅ + symboles `graphFTLB`, `graphMach`, `graphPOI0`, `graphRopt`, `graphTime`, `graphMaxR`, `graphYard`, `graphInch`, `graphFoot`, `graphLBFS`, `graphVopt` |
| `Rangefinder` | télémétrie réticule | ✅ |
| `UserFiles` | export/import utilisateur | ✅ |
| `Global` | état partagé inter-écrans | ✅ |

### Concepts balistiques observés

| Concept | Statut | Évidence directe |
|---------|--------|------------------|
| Drag laws **explicitement multi-modèles** | ✅ | `Tap for the Drag Law Options menu`, `Drag Law = `, `DragLaw=%d`, `Current Drag Law: ` |
| Modèles concrets cités | ✅ | **GA**, **GA2** (diabolo airgun), **RA3Z**, **RA4** (rimfire .22), **RA45**, **RA6** (?), **GS** (sphérique), **G1** (générique), **SLG0**, **SLG1** (slugs) |
| Phrase produit-clé observée | ✅ verbatim asset | *"Open MERO and enter the current environmental values, the Muzzle Velocity, Zeroed Range, Sight-Height and Target Range into the app and select a suitable drag law (GA or GA2 for diabolo Airgun pellets, RA4 for 0.22 Rimfire, GS for spherical projectiles and G1 for just about everything else)."* |
| Vélocité initiale | ✅ | "Muzzle Velocity" (cité dans la phrase ci-dessus) |
| Sight height | ✅ | "Sight Height" |
| Zero (near / far) | ✅ | "Tap to toggle between Near or Far Zero" |
| **PBR explicite** | ✅ | `Cycle PBR Units:`, symbole `_lab_pbr1`, `graphMaxR` |
| Cible / kill zone | 🟡 implicite via PBR | (pas de chaîne `killzone` directe) |
| Inclinaison | ✅ | classe `Inclinometer`, "Set Inclination to zero for setup" |
| Atmosphère | ✅ | classe `Environment`, "Tap for the Atmospheric Options menu", "Relative Humidity:" |
| Vent | 🟡 mention indirecte | — pas de classe `Wind` séparée |
| Réticule / clicks per MoA | ✅ | "Clicks per MoA:", "MoA per click:", `lab_CPMOA`, `showCPMOA` |
| Type de réticule | ✅ | "menu item for alternative reticle types and other display options or double tap for the inclinometer view" |
| Énergie cinétique | ✅ | symboles `graphFTLB`, `graphLBFS`, "; Ballistic Coefficient (Lbf/in" |
| Slugs (profils dédiés) | ✅ | "Added SLG0 slug profile", "added SLG1 drag law", "(Ballisticboy's experimental slug profile" |
| Ajout d'un drag law personnalisé | ✅ | "Choose a new drag function" |

### Hypothèse de moteur

MERO est sans ambiguïté un **moteur multi-drag-laws orienté airgun + slugs**, avec
les familles : G1 (générique), GA / GA2 (diabolo airgun), GS (sphérique),
RA3Z / RA4 / RA45 / RA6 (rimfire et variantes), SLG0 / SLG1 (slugs). Ce mapping
recoupe **précisément** la nomenclature de drag laws connue de la communauté airgun
(famille "RA" = Russian Airgun retardation tables type Mero/Borisov,
famille "SLG" = slugs). ❓ Le moteur d'intégration numérique reste à
caractériser (APK.A3).

---

## 4. Strelok Pro 6.8.8 — `com.borisov.strelokpro`

### Modules métier (classes top-level conservées)

| Classe | Rôle inféré | Évidence |
|--------|-------------|----------|
| `Rifle` / `RifleAtm` | profil arme + atmo associée | ✅ + schéma SQL "rifles" |
| `Atm` / `IWT_Atm` | atmosphère / atmosphère intégrée | ✅ |
| `IWT_Vane` / `Wind` | direction/force du vent | ✅ |
| `MultiBC` | **gestion BC multi-vélocités** | ✅ + DB cols `bc/bc2/bc3/bc4/bc5` × `speed1..5` |
| `DragFunc` / `DragList` / `DragShow` | tables de drag, liste, visualisation | ✅ + XML observé `<DragTable>`, `<DragFunctionName>`, `<DragFunctionNumber>`, `<DragFunctionCategory>`, `<DragTableRow>` (format d'export utilisateur) |
| `Coriolis` / `Coriolis_new` | corrections Coriolis | ✅ |
| `Slope` | inclinaison de tir | ✅ |
| `Truing` / `TruingTurret` / `Truing_multi` | recalibrage moteur d'après tirs réels | ✅ |
| `Table` | table balistique | ✅ |
| `Vector` | math vectoriel | ✅ |
| `Diod` | (probable) compensation diode laser télémètre | 🟡 |
| `Dropbox` | sync cloud | ✅ |
| `KestrelDrop` / `Kestrel4x00Atm` / `Kestrel4x00Vane` / `Kestrel5x00Atm` / `Kestrel5x00Vane` / `WindDrawKestrel` | intégration anémomètre **Kestrel** BLE | ✅ |
| `BoxCom` | (probable) communication BLE / box compagnon | 🟡 |
| `SFCalc` | side-focus / parallax calc ? | 🟡 |
| `About` | écran "à propos" | ✅ |

### Concepts balistiques observés

| Concept | Statut | Évidence |
|---------|--------|----------|
| Drag model multi-loi | ✅ | `<DragFunctionCategory>`, `<DragFunctionNumber>`, `DragModel` |
| Custom drag tables (.cdt-like) | ✅ | format export `<DragTable><DragTableRow>` |
| BC multi-vélocités | ✅ | DB `bullets`: `bc/speed1..bc5/speed5` (Berger / Litz convention) |
| **Pellets airgun** | ✅ | DB `pellets` (584 lignes, vendor + diameter + weight + bc + length) |
| G1 / G7 séparés | ✅ | DB `bullets_g7` (732), `cartridges.bc_g7` |
| Cartridges (centerfire) | ✅ | 4029 lignes |
| Calibers / Diameters / Vendors | ✅ | tables dédiées |
| Atmosphère + truing température poudre | ✅ | XML `<ZeroDensityAltitude>`, `<ZeroPowderTemperature>`, `<ZeroPressure>`, `<ZeroTemperature>`, `<ZeroHumidity>` |
| Zéro horizontal/vertical | ✅ | `<ShiftHorizontalMOA>`, `<ShiftVerticalMOA>` |
| Distance de zéro | ✅ | `<ZeroDistance>`, schéma rifles col `zero_distance` |
| **Truing** (recalage trajectoire) | ✅ | classes `Truing`, `TruingTurret`, `Truing_multi` |
| Coriolis | ✅ | classes dédiées |
| Spin drift | 🟡 implicite (twist + left_twist en colonne SQL) | inférence |
| Click value (vert/horiz) | ✅ | rifles cols `click_vert`, `click_hor`, `click_units` |
| FFP / SFP, magnification | ✅ | rifles cols `first_focal`, `min_magnification`, `max_magnification`, `true_magnification` |
| Réticules nommés (huge catalogue) | ✅ | exemples observés : "Mil Dot 10x Hawke", "Mil-Dot, SIII 10-50x60 Sightron", "MIL-R, NXS Nightforce", "FC-MIL/FC-MOA NX8 Nightforce", "LR MOA Cabela's", "Half Mil Sidewinder Hawke", "MOAR NX8 Nightforce", "MTC Rapier Ballistic Rangefinder", "Mil Dot 20x Hawke 6.0-24x / 6.5-20x / 8.0-32x / 8.5-25x", "MIL-R BEAST 5-25x56 Nightforce", "MP-8 Xtreme X1 IOR/Valdada", "EBR-556B (MOA) Spitfire Vortex", "MTAC 1-4x24 Burris", "RT-6 1-6x24 Burris", "Stealth MIL Atibal", "VHR Arken EPL4", "SHR Arken/Maven", … (catalogue ≫ 200) |
| Distance start/end/step (table) | ✅ | rifles cols `start_distance / end_distance / step_distance` |
| Colonnes table | ✅ | `show_speed/energy/time/drop/path_cm/path_moa/path_td/path_click/wind_cm/wind_moa/wind_td/wind_click` |

### Hypothèse de moteur

Strelok Pro est sans ambiguïté un **moteur balistique multi-drag-law (G1 + G7 +
custom tables) avec truing** (réétalonnage à partir de tirs réels), **corrections
Coriolis** (latitude + azimut), **support BLE Kestrel/WeatherFlow**. C'est le moteur
le plus mature du panel. La version "mod-lenov.ru" peut avoir débridé certaines
features payantes (Truing multi, KestrelDrop) — non vérifié.

---

## 5. ChairGun Elite — concepts balistiques (consolidation)

Vu que CGE est obfusqué + DB chiffrée, l'observation directe est limitée. La
**continuité produit** depuis CG-1.3.7 est vraisemblable :
- PBR / MPBR (héritage `calcmaxrange`) ✅ probable
- Réticules Hawke (catalogue propriétaire) ✅ probable
- Drag law principale G1 + extensions ❓
- Atmosphère standard ✅ probable

Pour confirmer, l'**unique chemin propre** serait :
1. Lire les fichiers `localization_*.json` (libellés UI) — APK.A3 envisageable
2. **NE PAS** déchiffrer `HTRv1wt4YJgUR0H` (asset propriétaire chiffré explicitement)

---

## Synthèse cartographie inter-APK

| Concept | CG-1.3.7 | CGE-J/4.7.2 | MERO | Strelok Pro |
|---------|----------|-------------|------|-------------|
| G1 | ✅ | 🟡 | ✅ | ✅ |
| G7 | ❓ | 🟡 | ❓ | ✅ |
| GA / GA2 (airgun diabolo) | ❓ | 🟡 | ✅ | ❓ (custom dragtable possible) |
| GS (sphérique) | ❓ | 🟡 | ✅ | ❓ |
| RA-family (rimfire) | ❓ | 🟡 | ✅ | ❓ |
| SLG (slugs) | ❓ | 🟡 | ✅ | ❓ |
| BC multi-vélocités | ❓ | 🟡 | ❓ | ✅ |
| PBR / MPBR | ✅ explicite | 🟡 | ✅ explicite | ❓ (non observé) |
| Truing | ❌ | 🟡 | ❌ | ✅ |
| Coriolis | ❌ | ❓ | ❌ | ✅ |
| Spin drift (twist) | ❌ | ❓ | ❌ | ✅ |
| Inclinaison | ❌ | ✅ (`SlopeCamera`) | ✅ (`Inclinometer`) | ✅ (`Slope`) |
| Réticule custom rich | ✅ | 🟡 | ✅ | ✅ (catalogue énorme) |
| Catalogue pellets airgun | ✅ (interne) | 🟡 (chiffré) | ✅ (utilisateur) | ✅ (584 pellets DB) |
| Intégration matériel BLE | ❌ | ❓ | ❌ | ✅ Kestrel/WeatherFlow |
| Sync cloud | ❌ | ❓ | ❌ | ✅ Dropbox |
