# Tableau comparatif préliminaire — APKs vs AirBallistik

> Lecture comparative **uniquement à des fins de cadrage roadmap**. Aucune
> intégration n'est proposée à ce stade. AirBallistik V1 reste défini par
> `mem://features/v1-scope` et le moteur G1+Euler reste l'unique moteur
> exposé. MERO reste verrouillé derrière `mem://constraints/mero-exposure-gates`.

## Légende

- ✅ couvert
- 🟡 partiellement couvert / sous flag / différent
- ❌ non couvert
- N/A non applicable

---

## 1. Couverture moteur balistique

| Capacité | CG-1.3.7 | CGE | MERO | Strelok Pro | **AirBallistik (état actuel)** |
|----------|---------:|----:|-----:|------------:|-----------------------------|
| Modèle G1 | ✅ | 🟡 | ✅ | ✅ | ✅ (`ballistics/drag/standard-models.ts`) |
| Modèle G7 | ❓ | 🟡 | ❓ | ✅ | 🟡 (présent dans truth-set / table mero-tables, non exposé) |
| Drag laws airgun (GA, GA2) | ❓ | 🟡 | ✅ | ❓ | 🟡 sous flag MERO non exposé (tables mero, gating actif) |
| Drag laws rimfire (RA*) | ❓ | 🟡 | ✅ | ❓ | 🟡 idem |
| Drag laws slugs (SLG*) | ❓ | 🟡 | ✅ | ❓ | 🟡 idem |
| Modèle GS (sphérique) | ❓ | 🟡 | ✅ | ❓ | ❌ |
| BC multi-vélocités | ❓ | ❓ | ❓ | ✅ | ❌ (BC unique côté UI) |
| Custom drag table utilisateur | ❌ | ❓ | ✅ ("Choose a new drag function") | ✅ (export `<DragTable>`) | 🟡 (`DragTableEditor` côté composants projectiles existe) |
| Intégration numérique avancée | ❓ | ❓ | ❓ | ❓ | ✅ (Euler + Trapezoidal — `integrators/`) |
| Truing (recalage par tirs réels) | ❌ | ❓ | ❌ | ✅ | ❌ |
| Coriolis | ❌ | ❓ | ❌ | ✅ | ❌ |
| Spin drift | ❌ | ❓ | ❌ | 🟡 (twist en DB) | ✅ (`spin-drift.ts`) |

**Lecture** : AirBallistik est **dans la moyenne haute des airgun-spécifiques** sur
le moteur G1+spin-drift+intégration propre. Il **reste en retard** sur :
multi-BC (Strelok), drag laws airgun/slugs explicitement exposées (MERO), truing
(Strelok), Coriolis (Strelok). Ces écarts sont **conscients et hors V1**.

---

## 2. Couverture concepts terrain

| Capacité | CG-1.3.7 | CGE | MERO | Strelok Pro | **AirBallistik** |
|----------|----------|-----|------|-------------|------------------|
| Vélocité initiale (muzzle) | ✅ | ✅ | ✅ | ✅ | ✅ (`VelocitySection`) |
| Sight height | ✅ | ✅ | ✅ | ✅ | ✅ (`OpticSection`) |
| Zero (single) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Near / Far zero (double zero)** | ✅ | 🟡 | ✅ | ❓ | 🟡 (`ZeroIntersectionsCard` pour intersections) |
| **PBR / MPBR** | ✅ explicite (`calcmaxrange`) | 🟡 | ✅ explicite (`Cycle PBR Units`) | ❓ | ✅ (`PbrCard`, helper `pbr.ts`, persistance kill-zone) |
| Atmosphère (T, RH, P, Alt) | ✅ | 🟡 | ✅ | ✅ | ✅ (`EnvironmentSection`, `weather.ts`) |
| Vent (vitesse + angle) | ✅ | 🟡 | 🟡 | ✅ | ✅ (`wind.ts`) |
| Inclinaison de tir | ❌ | ✅ (`SlopeCamera`) | ✅ (`Inclinometer`) | ✅ (`Slope`) | ❌ V1 |
| Energie cinétique | ✅ | 🟡 | ✅ (graphFTLB / graphLBFS) | ✅ | ✅ (col table) |
| Réticule (mil-dot rangefinder) | ✅ (`MDRFDraw`) | 🟡 | ✅ (`Rangefinder`) | ✅ | ✅ (`ReticleAssistPanel`) |
| Clicks/MoA calibration | ✅ (`CalcCPMOAActivity`) | 🟡 | ✅ ("Clicks per MoA:") | ✅ (cols SQL) | 🟡 (`CalibrationSection` au sens click value) |
| Mil-Dot true (mag-corrected) | ✅ ("True Mil-Dot @ %1.1fx") | 🟡 | ❓ | ✅ (FFP/SFP cols) | 🟡 (gestion FFP/SFP visible côté optique) |
| Comparaison de profils | ✅ (`comparetable`) | 🟡 | ❓ | ❓ | ✅ (`ComparePage`) |
| Tables ballistiques configurables | ✅ | 🟡 | ✅ (`Table`) | ✅ (start/end/step + cols configurables) | ✅ (`BallisticTable`, sync `ReticleAssistPanel`) |
| Graphes trajectoire | ✅ (`DrawGraph`) | 🟡 | ✅ (`Graphs`) | ✅ | ✅ (`TrajectoryMiniChart`, bande PBR) |

**Lecture** : sur les concepts terrain *airgun*, AirBallistik est **au niveau** de
ChairGun et MERO, et **dépasse** ChairGun sur la propreté de l'intégration
table↔assistant réticule (Tranche J). L'écart majeur restant est l'**inclinaison de tir**
(absente V1, présente partout ailleurs).

---

## 3. Couverture données / catalogue

| Capacité | CG-1.3.7 | CGE | MERO | Strelok Pro | **AirBallistik** |
|----------|----------|-----|------|-------------|------------------|
| DB pellets airgun embarquée | ✅ (codée) | 🟡 (chiffrée) | ❌ (utilisateur) | ✅ (584) | ✅ (seed-projectiles + import bullets4) |
| DB cartridges centerfire | ❌ | ❓ | ❌ | ✅ (4029) | ❌ (V1 = airgun) |
| DB optiques | ❓ | 🟡 | ❌ | ✅ (catalogue ≫200 réticules) | ✅ (seed-optics, lien réticule) |
| DB réticules | ✅ (catégories) | 🟡 | 🟡 | ✅ (massif) | ✅ (`ReticlesPage`) |
| DB carabines / "rifle profiles" | ❓ | ❓ | ❓ | ✅ (table `rifles`) | ✅ (Airguns, Tunes, Sessions) |
| Import format `bullets4.db` | N/A | N/A | N/A | source | ✅ (`import-pipeline.bullets4.test.ts`) |
| Import format CDT (`<DragTable>` XML) | N/A | N/A | N/A | format export | ❌ |
| Import présets propriétaires | N/A | N/A | N/A | N/A | ✅ (Import preset modals projectiles/optiques/airguns) |

**Lecture clé** : la pipeline AirBallistik d'import `bullets4.db` est **directement
alignée** avec le format Strelok Pro observé ici. L'analyse confirme que cette
intégration est cohérente avec la source. Le format **CDT** (Custom Drag Table XML)
est un candidat naturel pour APK.A4 si AirBallistik veut un jour ouvrir l'import
custom drag table à partir d'exports Strelok.

---

## 4. Couverture intégrations / écosystème

| Capacité | CG-1.3.7 | CGE | MERO | Strelok Pro | **AirBallistik** |
|----------|----------|-----|------|-------------|------------------|
| Intégration BLE Kestrel | ❌ | ❌ | ❌ | ✅ (4×00 + 5×00) | ❌ |
| Intégration WeatherFlow | ❌ | ❌ | ❌ | ✅ | ❌ |
| Sync Dropbox | ❌ | ❌ | ❌ | ✅ | ❌ |
| Météo en ligne (API) | ❌ | ❓ | ❌ | ❌ | ✅ (`use-weather.ts` sous flag) |
| i18n FR/EN (++) | ❌ EN only | ✅ 35 langues | ✅ 18 langues | ✅ multi | ✅ FR/EN |
| Persistance locale (offline first) | ✅ | ✅ | ✅ | ✅ | ✅ (`storage.ts` localStorage) |
| Mobile-first | ✅ Android natif | ✅ Android natif | ✅ Android natif | ✅ Android natif | ✅ web responsive mobile-first |

---

## 5. Verdict synthétique

| Axe | Position d'AirBallistik | Commentaire |
|-----|------------------------|-------------|
| Concepts terrain airgun | **fort** | Au niveau ChairGun/MERO, dépasse sur sync table/réticule |
| Moteur balistique base (G1 + atmo + spin) | **bon** | Comparable aux trois apps tierces sur le périmètre G1 |
| Moteur multi-drag-law airgun | **en retard** | MERO offre GA/GA2/GS/RA*/SLG* explicitement ; AirBallistik a les tables (mero-tables) mais **gating volontaire** (cf. `mero-exposure-gates`) |
| Truing / Coriolis / multi-BC | **non couvert** | Spécificités centerfire long range — hors scope V1 airgun |
| Catalogue données | **conforme** | Pipeline `bullets4.db` aligné Strelok ; seeds airguns/optics propres |
| Intégrations matériel | **non couvert** | Kestrel/WeatherFlow = scope long range / pro, hors V1 |
| Inclinaison de tir | **manque V1** | Présent dans 3 des 4 références — candidat naturel pour V2 |
| UX / lecture | **fort** | Sync table-assistant, bande PBR sur mini-graphe, gating honnête |

**Recommandation produit** : aucune action immédiate sur le code. Cette
cartographie servira d'entrée pour décider d'une éventuelle Tranche APK.A3
(extraction documentaire approfondie sur 1 ou 2 cibles : MERO et Strelok Pro
en priorité).
