# ChairGun Elite — Demandes de données et de specs au développeur

> Statut : **HANDOFF** — document destiné à être envoyé (ou résumé) au
> développeur de ChairGun Elite. Il liste, par ordre d'impact décroissant
> sur AirBallistik, ce qu'on aimerait obtenir de lui, dans quel format,
> et où on rangerait chaque livrable dans le repo à réception.
>
> Ce document **ne change rien** au moteur, à l'UI, à la base ou aux
> tests. C'est un artefact de communication.

## Contexte

- AirBallistik est une PWA airgun-first (React + TS, Supabase
  self-hostable, déployable sur VM perso) avec un moteur balistique
  déterministe (`src/lib/ballistics/`) verrouillé par snapshots golden
  (`src/lib/__fixtures__/sessions/golden/`).
- On a déjà absorbé son catalogue de **1944 réticules ChairGun avec
  géométrie résolue** (table `chairgun_reticles_catalog`, repo
  `src/lib/chairgun-reticles-repo.ts`, viewer `ReticleViewer.tsx` mode A).
- On a un **format pivot ouvert** pour les cas de validation comparative
  (`docs/validation/external-case-json.md`, schema v1) qu'on aimerait
  qu'il puisse réutiliser tel quel pour partager des chiffres.
- On a un **clone Python de référence** déjà analysé côté Lovable. Cette
  demande sert à combler les zones où la lecture du code seul n'est pas
  suffisante (méthodologie, données mesurées, intentions design).

## Règles d'or de la demande

1. **Aucune valeur n'est inventée.** Si une métrique n'est pas mesurée,
   on préfère qu'elle soit absente plutôt qu'estimée.
2. **Taille raisonnable.** On ne demande pas le code source complet de
   ChairGun. On cible des modules isolés et des datasets.
3. **Format ouvert.** JSON / CSV / pseudocode / markdown. Pas de format
   propriétaire.
4. **Effort réaliste.** Chaque demande indique l'effort estimé pour lui,
   pour qu'il choisisse ce qui est facile à partager.
5. **Réciprocité.** AirBallistik est open-source côté code applicatif,
   il peut récupérer notre format pivot et nos golden fixtures.

---

## Priorités

### P1 — Validation numérique (impact max sur la confiance moteur)

#### 1.1 — Golden cases au format pivot

> 📎 **Document dédié** : voir `docs/handoff/golden-cases-request.md`
> (mono-sujet, prêt à envoyer FR + EN, template JSON joint, canal sans IA).
> La présente section reste comme résumé dans le catalogue P1→P4.

- **Quoi** : 10 à 20 cas complets « tir A → tir Z », chacun avec inputs
  exacts (projectile, MV, BC, sight height, zero, atmosphère, vent) et
  trajectoire mesurée ou calculée par ChairGun (drop, drift, velocity,
  TOF, energy par tranche de range).
- **Format attendu** : JSON `external-case-json.md` v1, un fichier par
  cas. Spec complète + exemple :
  - `docs/validation/external-case-json.md`
  - `src/lib/__fixtures__/cross-validation/case-22-pellet-18gr-270-zero30/`
- **Couverture souhaitée** : .177 / .22 / .25 / .30, pellet + slug, MV
  basse (200 m/s) à haute (340 m/s), zero court (15 m) à long (50 m),
  atmosphère ICAO + au moins un cas en altitude (≥1000 m).
- **Impact AirBallistik** : ces cas iront dans
  `src/lib/__fixtures__/cross-validation/<case-id>/` et seront exécutés
  par le harness `runCaseComparison` (`src/lib/cross-validation/`). Ils
  remplaceront le cas pilote synthétique actuel
  (`case-22-pellet-18gr-270-zero30`) qui est explicitement non-oracle.
- **Effort estimé pour lui** : faible si export automatisable, moyen
  sinon.
- **Cible repo** : `src/lib/__fixtures__/cross-validation/<case-id>/`

#### 1.2 — Tables Cd custom par projectile

- **Quoi** : tables `Cd vs Mach` (au moins 10 points par table) pour les
  projectiles airgun courants (JSB Exact, H&N FTT/Baracuda, FX Hybrid,
  NSA slugs, Patriot Javelin…), idéalement issues d'un radar Doppler.
- **Format attendu** : JSON ou CSV, deux colonnes `mach,cd`. Compatible
  direct avec notre `Projectile.customDragTable: DragTablePoint[]`
  (`src/lib/types.ts`).
- **Impact AirBallistik** : alimente le moteur via
  `Projectile.customDragTable` (déjà supporté, `cdFromTable`,
  `src/lib/cd-from-table.test.ts`). Permet de bypass G1/G7 pour les
  projectiles concernés sans toucher au moteur.
- **Effort estimé pour lui** : variable, dépend de l'accès aux mesures
  Doppler.
- **Cible repo** : `src/lib/__fixtures__/drag-tables/<brand>-<model>.json`
  (nouveau dossier, créé à réception).

---

### P2 — Algorithmes airgun-specific

#### 2.1 — Modèle Cd(Mach) pour diabolos subsoniques

- **Quoi** : courbe ou polynôme Cd(Mach) qu'il utilise pour les pellets
  dans la plage 0.3 < M < 0.9, avec gestion explicite de la zone
  transsonique (M ≈ 0.85–1.05 où les pellets s'instabilisent).
- **Format attendu** : pseudocode + tableau de référence. Pas de C/C++,
  on traduira nous-mêmes.
- **Impact AirBallistik** : possible nouvelle entrée dans
  `src/lib/ballistics/drag/` (sans modifier les profils legacy/MERO
  existants) — gated par feature flag tant que non validé contre golden
  cases P1.1.
- **Effort estimé** : moyen.

#### 2.2 — Spin drift adapté pellets

- **Quoi** : la formule qu'il applique pour la dérive gyroscopique sur
  pellets courte distance (< 100 m), si différente de Miller SG
  standard. Beaucoup de calculateurs surestiment ce drift sur diabolos.
- **Format attendu** : pseudocode + 2-3 exemples chiffrés.
- **Impact AirBallistik** : raffinement de la formule dans
  `src/lib/ballistics/spin-drift.ts`. **Aucune modification sans
  validation** contre golden cases.
- **Effort estimé** : faible si déjà documenté dans son code.

#### 2.3 — Effet Magnus / couplage spin × vent

- **Quoi** : est-ce qu'il modélise le drift vertical induit par un vent
  latéral (ou inversement) ? Si oui, comment ? Si non, c'est aussi une
  réponse utile.
- **Format attendu** : oui/non + référence ou formule.
- **Effort estimé** : faible.

#### 2.4 — Scope Reticle View (code & structure) — basé sur les screenshots fournis

> Captures de référence :
> - `docs/handoff/assets/chairgun-scope-reticle-view-1.jpg` — vue scope
>   live (réticule SCB 2 MTC Optics 5–30×, cible round à 70 m, vent
>   5 m/s, mag 30×, Scale 0.33, dérive affichée 2.3 cm).
> - `docs/handoff/assets/chairgun-scope-reticle-view-2.jpg` — sélecteur
>   de cibles (round, rectangle, red point, 3-GN dirty bird, Appleseed D,
>   Combat EIC, F-Class, Figure 11/14 NATO, IBS 1000y).

##### Ce qu'on observe et qui nous intéresse

1. Vue scope ronde rendant le **réticule à sa géométrie exacte** (déjà
   couverte côté AirBallistik via `chairgun_reticles_catalog` +
   `ReticleViewer.tsx` mode A).
2. **Cible standardisée placée dans le réticule** au point d'impact
   projeté pour la distance courante, pas au centre — décalée selon le
   drop et la dérive vent.
3. **Bandeau turret** « ← U / MOA / D → » en haut, qui semble afficher
   la correction d'élévation et windage actuelle en clicks.
4. **Slider magnification** (5×–30×) avec recalcul live de
   `Scale = magCal / magActuelle` (visible sur le screenshot : `30.0x` →
   `Scale = 0.33`, ce qui suggère `magCal ≈ 10`).
5. Indicateurs contextuels : `Wind 5.0 m/s at 70 meters`, `Target
   distance: 70`, `∠ 0°`, `R:10.0`.
6. **Catalogue de cibles** standardisées avec aperçu visuel + dimensions
   physiques implicites.

##### Ce qu'on lui demande précisément

- a) **Algorithme de placement de cible sur le SVG réticule** : étant
  donné `(distance, drop, windDrift, focalPlane, currentMag, magCal)`,
  quelle est la formule qui donne la position `(x, y)` de la cible en
  unités angulaires du réticule ?
- b) **Système de coordonnées scope** : le centre du viewport représente
  la ligne de visée *avant* correction tourelle, *après* correction
  tourelle, ou la position d'impact à zero ? Comment il gère le
  basculement quand l'utilisateur tourne les tourelles ?
- c) **Formule SFP scaling** : confirmation explicite de
  `displayedSubtension = trueSubtension × (magCal / currentMag)` (et
  notation `Scale` visible dans l'UI). Cas FFP : aucun scaling appliqué,
  confirmation.
- d) **Structure du catalogue de cibles** : pour chaque cible (round,
  rectangle, 3-GN, Appleseed, Combat EIC, F-Class, Figure 11/14 NATO,
  IBS 1000y…) — dimensions physiques (mm), anneaux de score, masque
  visuel (SVG / bitmap), point de visée par défaut. Un JSON / XML de la
  bibliothèque suffit.
- e) **Calcul de la dérive affichée** (`2.3 cm` sur le screenshot) :
  formule, point de référence, projection 3D→2D utilisée pour cet
  affichage.
- f) **Couplage vue ↔ moteur balistique** : la vue scope est-elle une
  *lecture pure* d'un point de la trajectoire (range = `Target
  distance`) ou *interactive* (l'utilisateur déplace la cible et le
  moteur cherche la distance équivalente / la correction de tourelle
  équivalente) ?
- g) **Code source ou pseudocode** de la fonction de rendu principale
  (équivalent de notre `ReticleViewer.tsx` côté React). Même partiel.
  L'intention est de **réimplémenter proprement** côté React, pas de
  copier-coller.
- h) **Click turret simulation** : l'animation/affichage de la barre du
  haut « U/D MOA » — comment elle dérive de `clicksElevation × clickValue`
  et de `clicksWindage × clickValue` (déjà calculés côté AirBallistik
  dans `BallisticResult.clicksElevation/clicksWindage`).

##### Format souhaité

- Pseudocode + 1 cas exemple chiffré (idéalement celui du screenshot 1 :
  SCB 2, 30×, 70 m, vent 5 m/s ⇒ position cible attendue + valeur
  dérive affichée).
- Capture annotée bienvenue.

##### Impact AirBallistik

Permettrait de construire un futur composant `ScopeViewSimulator.tsx`
(ou panneau dans QuickCalc / SessionDetail), réutilisant **directement** :

- `ReticleViewer.tsx` mode A (géométrie exacte ChairGun) déjà importée,
- `BallisticResult[]` déjà produit par le moteur (drop, holdover,
  windDrift, clicksElevation/clicksWindage),
- `Optic.magCalibration` + `Optic.focalPlane` déjà persistés.

Ce serait un différenciateur visuel majeur vs Strelok/JBM, à coût
d'intégration faible si on a la spec.

##### Effort estimé pour lui

Moyen. Module isolé, trigonométrie standard, pas de propriété
intellectuelle critique sur la projection elle-même.

##### Cible repo

Quand reçu : nouveau dossier `docs/apk-analysis/chairgun-elite/scope-view-spec.md`
(spec) et `src/lib/__fixtures__/targets/chairgun-targets.json` (catalogue
de cibles). Le composant React viendra dans une tranche BUILD séparée,
gated par feature flag.

#### 2.4.bis — Système de coordonnées « clic cible sur réticule » (turret clicks + SFP scaling)

> Sous-demande **chirurgicale** dérivée de §2.4. Elle isole le seul point
> qui bloque une réimplémentation propre côté React : la **chaîne de
> conversion** entre un clic souris/tap dans le SVG du réticule et une
> commande balistique (correction tourelle ou ré-interrogation moteur).
>
> Tout le reste de §2.4 (catalogue cibles, dérive affichée, code de
> rendu) peut attendre — celui-ci est le minimum vital pour une vue
> scope interactive correcte.

##### a) Pourquoi on l'isole

Sans spec explicite de cette chaîne, deux pièges classiques :

1. **SFP non scalé** ou scalé du mauvais côté → la cible cliquée à 30×
   atterrit à la mauvaise distance angulaire à 10×.
2. **Convention turret floue** (UP positif vs DOWN positif, MOA réelle
   vs `IPHY` 1″/100yd, fraction de click hardware vs click logique) →
   le `clicks elevation` affiché diverge silencieusement de ce que
   l'utilisateur compose réellement sur la tourelle.

##### b) Chaîne canonique attendue (4 étapes)

On voudrait confirmation (ou correction) du pipeline suivant, exprimé en
pseudocode neutre. C'est la version qu'on implémenterait par défaut faute
de réponse — d'où l'intérêt d'un go/no-go explicite.

```text
// Étape 1 — clic SVG → coordonnées viewport normalisées
(px, py)              = mouseEventToSvgUserSpace(event)
(cx, cy)              = svgCenter()                       // centre optique du viewport
(dxPx, dyPx)          = (px - cx, py - cy)                // y vers le haut = positif

// Étape 2 — pixels → unité angulaire APPARENTE du réticule
// (pxPerUnitAtCalMag est mesuré une fois sur le SVG, à magCalibration)
(dxApparent, dyApparent) = (dxPx / pxPerUnitAtCalMag,
                            dyPx / pxPerUnitAtCalMag)

// Étape 3 — apparente → unité angulaire VRAIE (correction SFP)
if (focalPlane === 'SFP') {
  scale = currentMag / magCalibration                    // > 1 si zoom au-dessus du cal
  (dxTrue, dyTrue) = (dxApparent / scale,
                      dyApparent / scale)
} else { // FFP
  (dxTrue, dyTrue) = (dxApparent, dyApparent)            // pas de scaling
}

// Étape 4a — vraie subtension → clicks tourelle
clicksWindage   = round( dxTrue / clickValueWindage )    // sign convention: clic à droite = +
clicksElevation = round( -dyTrue / clickValueElevation ) // clic en HAUT du réticule = HOLDUP
                                                         // = besoin de DESCENDRE le POI
                                                         // = tourelle "DOWN" ou holdover positif ?
                                                         // ← CONVENTION À CONFIRMER

// Étape 4b — alternative : ré-interrogation moteur
// Si la cible est cliquée comme "POI souhaité", on cherche la distance R
// telle que (drop(R), windDrift(R)) ≈ (-dyTrue × R, dxTrue × R) en projection.
// → solver 1D sur R, borné par [rangeMin, rangeMax].
```

##### c) Questions précises (Yes / No / formule corrigée)

1. **Unité du réticule** : `pxPerUnitAtCalMag` est-il mesuré en
   **MIL** ou en **MOA** ? Le réticule SCB 2 du screenshot 1 est en
   `MTC Optics 5–30×`, qu'est-ce qui fait foi : la nomenclature du
   réticule, ou un toggle utilisateur ?
2. **Magnification de calibration** : `magCalibration` est-il un
   attribut **par modèle de réticule** (champ du catalogue) ou **par
   optique utilisateur** (réglage perso) ? Dans `Scale = 0.33` à 30×, on
   déduit `magCalibration ≈ 10` — c'est bien la mag « SFP true » du
   modèle SCB 2 ?
3. **Convention de signe Y** : un clic **au-dessus** du centre du
   réticule représente-t-il (a) un **holdover** (« je vise plus haut
   parce que la cible tombera ») ou (b) un **POI** plus haut que la
   ligne de visée ? Les deux conventions existent dans la nature et
   inversent le signe de `clicksElevation`.
4. **Convention de signe X** : clic **à droite** = **windage RIGHT**
   tourelle, ou windage tourelle pour **compenser un vent venant de
   droite** (donc tourelle gauche) ?
5. **Click value** : la valeur exposée à l'utilisateur (ex : `1/4 MOA`,
   `0.1 MIL`) correspond-elle à **1 click hardware** ou à **1 click
   logique** (parfois 1 logique = 2 hardware sur certaines optiques) ?
   Distingues-tu les deux ?
6. **Arrondi** : `round`, `floor` ou `nearest-even` pour la conversion
   subtension → clicks ? Important pour la reproductibilité numérique.
7. **Interaction effective** : le clic met-il à jour (a) la **tourelle
   simulée** (ré-affiche le réticule centré sur ce nouveau zero), ou
   (b) seulement un **marqueur POI** sans toucher au moteur, ou (c) il
   **résout la distance** pour laquelle ce point est le POI naturel
   (étape 4b ci-dessus) ?
8. **Bornes & saturation** : que se passe-t-il quand le clic tombe en
   dehors de la course tourelle disponible (`elevationTravelMOA`,
   `windageTravelMOA`) ? Affichage d'erreur, clamp silencieux, warning ?

##### d) Cas d'exemple chiffré demandé

Idéal : 1 trace numérique complète sur le scénario du screenshot 1.

```text
Inputs :
  réticule       = SCB 2 (MTC Optics)
  focalPlane     = SFP
  magCalibration = ?                          ← à fournir
  currentMag     = 30
  clickValue     = 1/4 MOA   (à confirmer)
  cible cliquée  = round target affichée à 70 m, vent 5 m/s
  drop(70m)      = ? mm                       ← à fournir
  windDrift(70m) = 23 mm                      (= 2.3 cm visible à l'écran)

Sorties attendues :
  (dxPx, dyPx)             = (?, ?)
  (dxApparent, dyApparent) = (?, ?)  en MIL ou MOA
  scale                    = 30 / magCal
  (dxTrue, dyTrue)         = (?, ?)
  clicksElevation          = ?  (signé)
  clicksWindage            = ?  (signé)
```

Ce qu'on cherche n'est **pas** la valeur exacte du drop ChairGun (déjà
couvert par les golden cases §1.1) — c'est la **chaîne de conversion**
et **les conventions de signe**. Avec ces 8 réponses + 1 trace, la
réimplémentation React est mécanique.

##### e) Format de réponse acceptable

- 8 lignes « Q1 → réponse, Q2 → réponse… » suffisent.
- Ou 1 paragraphe libre + 1 trace chiffrée.
- Ou un extrait de code commenté de la fonction
  `screenToTurretClicks(...)` (ou son équivalent).

Pas besoin de doc formelle — l'objectif est de **lever l'ambiguïté**, pas
de produire un livrable de qualité publication.

##### f) Impact côté AirBallistik

Sans cette spec, on documente la chaîne par défaut ci-dessus dans
`docs/apk-analysis/chairgun-elite/scope-view-spec.md` avec un
avertissement « conventions à valider ». Avec la spec, on gagne :

- Des **tests d'unité déterministes** sur `screenToTurretClicks()` (un
  jeu de fixtures par convention validée).
- Une **non-régression visuelle** entre la vue scope React et celle de
  ChairGun (au niveau du placement, pas du rendu artistique).
- Une **réutilisation immédiate** de `BallisticResult.clicksElevation` /
  `.clicksWindage` déjà calculés par le moteur, sans nouveau code de
  conversion.

##### g) Cible repo (quand reçu)

- Spec : `docs/apk-analysis/chairgun-elite/scope-view-spec.md` —
  section dédiée « Coordinate system & turret mapping ».
- Tests : futur module `src/lib/scope-coords.ts` + `src/lib/scope-coords.test.ts`
  (tranche BUILD séparée, hors `src/lib/ballistics/`).
- Pas d'impact sur le moteur, pas d'impact sur la base, pas d'impact
  sur les fixtures golden.

---

### P3 — Données structurelles

#### 3.1 — Catalogue projectiles avec BC mesurés

- **Quoi** : sa table interne brand/model/weight/diameter/BC
  (G1 et/ou G7), avec source (mesurée vs marketing), date, conditions.
- **Format attendu** : CSV ou JSON, une ligne par projectile.
- **Impact AirBallistik** : enrichit `seed-projectiles.ts` /
  `bullets4` import existant. Champs cibles déjà présents sur
  `Projectile` (`bcG1`, `bcG7`, `bcZones`, `weightGrains`, `diameterMm`,
  `dataSource`, `sourceTable`).
- **Effort estimé** : faible.
- **Cible repo** : `src/lib/seed-projectiles-chairgun.ts` ou table
  catalogue Supabase dédiée.

#### 3.2 — Catalogue optiques (magnification calibrée)

- **Quoi** : pour chaque modèle d'optique connu, la magnification réelle
  où le réticule SFP est calibré (≠ valeur marketing) et le click value
  mesuré (≠ valeur nominale).
- **Format attendu** : CSV.
- **Impact** : enrichit `seed-optics.ts`. Champs cibles présents :
  `Optic.magCalibration`, `Optic.clickValue`.
- **Effort estimé** : faible.

#### 3.3 — Click value mesuré vs nominal

- **Quoi** : delta mesuré sur banc / sur cible vs valeur fabricant, par
  modèle d'optique. Permettrait un correcteur multiplicatif côté UI.
- **Effort** : faible.

#### 3.4 — Catalogue de cibles standardisées (lié à 2.4)

- **Quoi** : la bibliothèque visible sur le screenshot 2.
- **Format attendu** : JSON, une entrée par cible :

```json
{
  "id": "round-target",
  "name": "round target",
  "shape": "circle",
  "physicalDiameterMm": 80,
  "scoringRings": [{ "radiusMm": 10, "score": 10 }, ...],
  "aimPoint": { "x": 0, "y": 0 },
  "previewSvg": "..."
}
```

- **Cible repo** : `src/lib/__fixtures__/targets/chairgun-targets.json`.

#### 3.5 — PBR pour zones vitales petit gibier

- **Quoi** : sa méthode de calcul du Point Blank Range pour des zones
  vitales typiques (lapin, pigeon, corbeau, écureuil) : diamètre vital,
  marge tolérée, hauteur de zero recommandée.
- **Impact** : alimenterait `src/lib/pbr.ts` (déjà existant) avec des
  presets crédibles.
- **Effort** : faible.

---

### P4 — UX & calibration

#### 4.1 — Méthode truing (back-calculation BC)

- **Quoi** : workflow exact qu'il propose à l'utilisateur pour ajuster
  le BC à partir d'un drop mesuré à une distance unique. Notre
  `src/lib/calibration.ts` existe déjà — on cherche à valider notre
  approche par croisement.
- **Effort** : faible.

#### 4.2 — Compensation angle de tir

- **Quoi** : la formule angle-fire compensation qu'il utilise (cosinus
  pur, Improved Rifleman's Rule, autre ?), avec ses limites en airgun.
- **Effort** : faible.

#### 4.3 — Workflow chrono

- **Quoi** : seuils ES/SD qu'il considère acceptables, nombre minimum
  de tirs, gestion des outliers.
- **Effort** : faible.

---

## Hors scope — ce qu'on ne demande PAS

- Le code source complet de ChairGun Elite.
- Son intégrateur numérique (Euler / RK4 / autre) — le nôtre est figé
  par 8 fixtures golden et ne sera pas remplacé.
- Son zero-solver — le nôtre est validé par la matrice 4×3×3
  (`zero-solver-matrix.md`).
- Tout dataset sous licence commerciale tierce.

## Annexe — Captures jointes

- `docs/handoff/assets/chairgun-scope-reticle-view-1.jpg` — vue scope
  live (référence pour P2.4).
- `docs/handoff/assets/chairgun-scope-reticle-view-2.jpg` — sélecteur
  de cibles (référence pour P2.4 et P3.4).

---

## Message prêt-à-envoyer — FR

> Salut [prénom],
>
> Je développe **AirBallistik**, une PWA balistique airgun-first
> open-source côté applicatif (React + TS, Supabase self-hostable).
> J'ai déjà intégré ton catalogue de **1944 réticules avec géométrie
> résolue** — chapeau pour le boulot, le rendu est bluffant.
>
> J'aimerais t'inviter à partager ce qui te paraît facile dans la liste
> ci-jointe (`chairgun-data-request.md`). Pas besoin de tout faire :
> chaque item a une priorité et un effort estimé.
>
> Trois choses qui m'aideraient le plus, par ordre :
>
> 1. **Quelques cas de validation numérique** au format pivot ouvert
>    (`docs/validation/external-case-json.md`) — même 5 cas suffiraient
>    à muscler considérablement notre suite de non-régression.
> 2. **La spec / pseudocode de ta vue "Scope reticle"** (cf. les 2
>    captures jointes) : placement de la cible dans le réticule, scaling
>    SFP, structure du catalogue de cibles. C'est la partie où le code
>    seul ne suffit pas à comprendre tes intentions.
> 3. **Tes BC mesurés** (vs marketing) sur les projectiles que tu as
>    chronographiés.
>
> En retour : tu peux récupérer notre format pivot, nos golden fixtures,
> et tout commit AirBallistik est traçable côté repo.
>
> Merci d'avance — même un « non, pas le temps » est une réponse utile.
>
> [signature]

## Message prêt-à-envoyer — EN

> Hi [first name],
>
> I'm building **AirBallistik**, an airgun-first ballistic PWA with an
> open-source application layer (React + TS, self-hostable Supabase).
> I've already integrated your **1944-reticle catalog with resolved
> geometry** — kudos, the rendering is stunning.
>
> I'd like to invite you to share whatever feels easy in the attached
> list (`chairgun-data-request.md`). No need to do it all: each item has
> a priority and an effort estimate.
>
> The three things that would help me most, in order:
>
> 1. **A handful of numeric validation cases** in the open pivot format
>    (`docs/validation/external-case-json.md`) — even 5 cases would
>    massively strengthen our non-regression suite.
> 2. **Spec / pseudocode for your "Scope reticle" view** (see the two
>    attached screenshots): target placement inside the reticle, SFP
>    scaling, target catalog structure. This is where reading code alone
>    doesn't reveal your design intent.
> 3. **Your measured BCs** (vs marketing) for the projectiles you've
>    chronographed.
>
> In return: you can grab our pivot format, our golden fixtures, and
> every AirBallistik change is traceable in the repo.
>
> Thanks in advance — even a "no, no time" is a useful answer.
>
> [signature]

---

## Checklist de réception

| Livrable | Cible repo | Test à lancer | Memory à mettre à jour |
|---|---|---|---|
| 1.1 Golden cases JSON | `src/lib/__fixtures__/cross-validation/<id>/` | `vitest run src/lib/cross-validation` | `mem://constraints/mero-exposure-gates` (peut débloquer un gate) |
| 1.2 Tables Cd custom | `src/lib/__fixtures__/drag-tables/` | `vitest run src/lib/cd-from-table` | — |
| 2.1 Cd(Mach) modèle | nouveau module dans `src/lib/ballistics/drag/` (gated) | golden fixtures | doc tranche dédiée |
| 2.2 Spin drift formule | `src/lib/ballistics/spin-drift.ts` (refactor gated) | golden fixtures | — |
| 2.3 Magnus oui/non | doc `docs/apk-analysis/chairgun-elite/` | — | — |
| 2.4 Scope view spec | `docs/apk-analysis/chairgun-elite/scope-view-spec.md` | — | nouvelle memory `mem://features/scope-view` |
| 3.1 Projectiles BC | `src/lib/seed-projectiles-chairgun.ts` | `vitest run src/lib/projectile-repo` | — |
| 3.2 Optiques mag calibrée | `src/lib/seed-optics.ts` | `vitest run src/lib/library-supabase-repo` | — |
| 3.3 Click delta | doc + champ `Optic.clickValueMeasured?` (futur) | — | — |
| 3.4 Catalogue cibles | `src/lib/__fixtures__/targets/chairgun-targets.json` | — | — |
| 3.5 PBR vital zones | `src/lib/pbr-presets.ts` | `vitest run src/lib/pbr` | — |
| 4.x UX/calib | `docs/apk-analysis/chairgun-elite/` | — | — |

## Notes de gouvernance

- **Aucune donnée reçue** ne sera importée dans le repo sans :
  1. relecture humaine,
  2. tranche BUILD dédiée,
  3. validation par les golden fixtures actuelles (pas de régression
     silencieuse autorisée).
- **MERO** : si les golden cases P1.1 contiennent des références MERO,
  ils peuvent contribuer à lever certains gates de
  `mem://constraints/mero-exposure-gates.md` — décision explicite à
  prendre à ce moment-là, pas avant.
- **Confidentialité** : si une partie des données est sous accord
  privé, ranger dans `docs/private/` (à créer) et `.gitignore` la
  pendant l'intégration.