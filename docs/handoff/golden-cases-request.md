# Golden cases — Demande dédiée (cross-validation sans IA)

> Statut : **HANDOFF** — document autonome, prêt à être copié-collé dans
> un mail / Discord / GitHub issue. Destiné en premier lieu au dev de
> ChairGun Elite, mais réutilisable tel quel pour Strelok Pro, MERO, ou
> tout opérateur humain volontaire.
>
> Ce document **ne change rien** au moteur, à l'UI, à la base ou aux
> tests. C'est un artefact de communication.
>
> Voir aussi : `docs/handoff/chairgun-data-request.md` (catalogue large
> de demandes, P1→P4) — le présent document zoome uniquement sur **P1.1
> golden cases**, en mode mono-sujet.

---

## 1. Pourquoi cette demande

AirBallistik a un moteur balistique **déterministe** (`src/lib/ballistics/`)
verrouillé par des snapshots golden internes
(`src/lib/__fixtures__/sessions/golden/`). Pour le confronter à une
référence externe **sans biaiser nos propres tests**, il nous faut des
cas complets, traçables, et alimentés à la main ou par export
programmatique — **pas d'OCR, pas d'IA dans la boucle d'extraction**.

Les cas reçus atterrissent dans
`src/lib/__fixtures__/cross-validation/<case-id>/` et sont consommés par
notre harness `runCaseComparison` (`src/lib/cross-validation/`), qui est
lui aussi déterministe et n'appelle **aucun LLM**.

---

## 2. Définition opérationnelle d'un « golden case »

Un golden case = **un tir reproductible**, décrit de bout en bout :

| Bloc | Contenu attendu |
|---|---|
| **Projectile** | marque + modèle + poids exact en grains + diamètre mm + (idéal) BC mesuré |
| **Tune** | MV mesurée au chrono (m/s), idéalement avec ES/SD sur N tirs |
| **Atmosphère** | T (°C), P (hPa **absolus**, pas station), HR (%), altitude (m) |
| **Scope / setup** | sight height (mm), zero range (m) |
| **Vent** | vitesse (m/s) + direction (degrés) + **convention angulaire documentée** |
| **Résultats** | N lignes : `range, drop, velocity` (min) + optionnel `tof, windDrift, energy` |
| **Traçabilité** | version de l'app source, méthode d'extraction, opérateur, date |

Granularité minimale : **5 lignes de range croissant**. Granularité idéale :
pas de 5 ou 10 m de la sortie de canon jusqu'à `rangeMax`.

---

## 3. Couverture souhaitée

On cherche une matrice qui couvre les calibres usuels, pellet vs slug,
conditions atmosphériques contrastées, et au moins un cas avec vent
travers significatif.

| # | Calibre | Type | MV cible | Zero | Atmosphère |
|---|---|---|---|---|---|
| 1 | .177 | pellet | 240 m/s | 25 m | ICAO |
| 2 | .22  | pellet | 280 m/s | 30 m | ICAO |
| 3 | .22  | pellet | 280 m/s | 30 m | -10 °C / 20 % HR |
| 4 | .22  | pellet | 280 m/s | 30 m | 35 °C / 90 % HR |
| 5 | .22  | slug   | 320 m/s | 50 m | ICAO |
| 6 | .25  | pellet | 270 m/s | 40 m | altitude 1500 m |
| 7 | .25  | slug   | 280 m/s | 50 m | altitude 1500 m + vent travers 5 m/s |
| 8 | .30  | slug   | 290 m/s | 100 m | ICAO |

- Cible **minimum** : 8 cas (1 par ligne).
- Cible **idéale** : 20 cas (variantes MV / zero supplémentaires).
- **Livraison incrémentale OK** — 1 cas livré vaut mieux que 20 promis.

---

## 4. Format de livraison attendu

**Format pivot canonique** (single source of truth, ne pas dupliquer ici) :

- `docs/validation/external-case-json.md` — schéma v1 complet, exemple, règles d'unités
- `docs/handoff/templates/golden-case-template.json` — squelette à copier puis remplir

**Conventions** :

- 1 fichier JSON par cas
- Nom de fichier = `caseId` slug, ex : `22-jsb-18gr-280-zero30.json`
- **Pas de conversion d'unités côté contributeur** — fournir dans les
  unités natives de la source et remplir `inputs.sourceUnitsNote`. La
  conversion vers les unités canoniques AirBallistik (m, mm, m/s, hPa
  absolus, °C, secondes, joules, grains) est faite côté AirBallistik.
- Une seule référence par fichier dans `references[]` (le contributeur
  n'a qu'une source, on agrège côté nous si besoin).

---

## 5. Règles d'or

1. **Aucune valeur n'est inventée.** Si la métrique n'est pas mesurée
   ou pas exposée par l'app source, on laisse `null`. Côté AirBallistik,
   le harness marquera la métrique comme « non comparable » — c'est
   prévu, c'est honnête, c'est utile.
2. **Atmosphère explicite.** Pas de défaut implicite. Si la donnée vient
   d'un environnement ICAO standard, écris-le dans
   `meta.assumptions[]` (« atmosphère ICAO »).
3. **Vent** : `windSpeed` + `windDirection` + **convention angulaire
   documentée** dans `meta.assumptions[]` (ex : « 0° = headwind à 12h,
   sens horaire »). Sans convention, le drift n'est pas comparable.
4. **BC** : préciser le modèle (`G1` / `G7` / `custom`) dans
   `inputs.bcModel`. Si custom, indiquer la source de la table Cd
   utilisée dans `meta.notes`.
5. **Drop signé** : convention AirBallistik **drop négatif = sous la
   ligne de visée**. Si la source utilise la convention inverse, **ne
   convertis pas toi-même** — note-le dans `meta.assumptions[]` et on
   inverse côté nous.
6. **Confiance auto-évaluée** (`A` / `B` / `C`), grille du schéma v1 :
   - `A` : export programmatique propre, version connue
   - `B` : saisie manuelle sérieuse depuis UI / capture
   - `C` : indicatif, lecture pixel près

---

## 6. Checklist qualité contributeur

À cocher avant envoi :

- [ ] `caseId` unique et slug-safe (kebab-case, ASCII)
- [ ] `meta.source`, `meta.version`, `meta.confidence`,
      `meta.extractionMethod`, `meta.extractedAt` renseignés
- [ ] Atmosphère renseignée explicitement OU marquée "ICAO" dans
      `meta.assumptions[]`
- [ ] Vent : `windSpeed` + `windDirection` + convention angulaire
      explicitée dans `meta.assumptions[]`
- [ ] BC fourni avec modèle (`G1` / `G7` / `custom`)
- [ ] Au moins 5 lignes de résultats, range croissant
- [ ] Drop signé selon la convention de la source ; convention notée
- [ ] `inputs.sourceUnitsNote` rempli si unités non canoniques
- [ ] JSON validé par un parser JSON (`jq . file.json` suffit)

---

## 7. Ce qu'on NE demande PAS (transparence)

- ❌ Pas de **code source** ChairGun (ou Strelok, ou MERO).
- ❌ Pas de **captures d'écran**. On évite explicitement le pipeline IA
      pour cette demande — l'objectif est un canal humain ou un export
      programmatique direct, traçable et reproductible.
- ❌ Pas d'engagement de **support** ou de maintenance des cas.
- ❌ Pas d'**exclusivité** — les mêmes cas peuvent être partagés à
      d'autres projets de cross-validation.

---

## 8. Où ça atterrit côté AirBallistik

- Fichiers reçus → `src/lib/__fixtures__/cross-validation/<case-id>/case.json`
  (cf. cas pilote existant `case-22-pellet-18gr-270-zero30/` qui est
  explicitement marqué non-oracle et sera remplacé par les premiers cas
  réels).
- Exécution → harness `runCaseComparison` (déterministe, **zéro IA**).
- Si convergence multi-cas robuste, ces données peuvent contribuer à la
  levée d'un gate du profil MERO (cf. `mem://constraints/mero-exposure-gates`).

---

## 9. Workflow de réception côté AirBallistik

1. Validation du JSON contre le schéma v1 (parser existant
   `user-case-schema.ts` — déjà en production sur l'onglet Validation
   externe).
2. Dépôt dans `src/lib/__fixtures__/cross-validation/<case-id>/`.
3. `vitest run src/lib/cross-validation/` pour exécuter le harness
   comparatif.
4. Verdict (convergence / écart) documenté dans les notes du cas.
5. **Aucune mise à jour automatique** des golden snapshots — toute
   modification du moteur résultant d'un écart est une décision humaine
   explicite, motivée par au moins 2 sources concordantes.

---

## 10. Messages prêts à envoyer

### 10.1 Version FR

> Salut,
>
> On développe **AirBallistik**, une PWA airgun-first avec un moteur
> balistique déterministe verrouillé par snapshots de non-régression.
> Pour le confronter honnêtement à une référence externe comme la tienne,
> on a posé un **format pivot JSON ouvert** (schéma v1 documenté) qui
> décrit un « golden case » complet : projectile + tune + atmosphère +
> vent + N lignes de résultats. Pas d'OCR, pas d'IA — on consomme
> directement ton JSON.
>
> Avant de te lister une matrice idéale, la vraie question est : **qu'est-ce
> qui est facile à exporter pour toi ?** Un seul cas bien documenté nous
> sert déjà. Si tu peux scripter un export, encore mieux ; sinon une
> saisie manuelle dans le template suffit.
>
> - Spec format : `docs/validation/external-case-json.md`
> - Template à remplir : `docs/handoff/templates/golden-case-template.json`
> - Détail de la demande : `docs/handoff/golden-cases-request.md`
>
> Aucune contrepartie attendue, aucun engagement de support, pas
> d'exclusivité. Notre code applicatif est ouvert, tu peux récupérer le
> format pivot et nos fixtures pour ton propre usage.
>
> Merci !

### 10.2 English version

> Hi,
>
> We're building **AirBallistik**, an airgun-first PWA with a
> deterministic ballistic engine locked by golden snapshots. To compare
> it honestly against an external reference like yours, we've defined an
> **open JSON pivot format** (documented schema v1) that describes a
> complete "golden case": projectile + tune + atmosphere + wind + N rows
> of results. No OCR, no AI in the loop — we consume your JSON directly.
>
> Before listing an ideal matrix, the real question is: **what's easy
> for you to export?** Even a single well-documented case is useful. A
> scripted export is great; manual entry into the template is fine too.
>
> - Format spec: `docs/validation/external-case-json.md`
> - Template to fill: `docs/handoff/templates/golden-case-template.json`
> - Full request: `docs/handoff/golden-cases-request.md`
>
> No expected reciprocity, no support commitment, no exclusivity. Our
> application code is open, you can reuse the pivot format and our
> fixtures for your own validation needs.
>
> Thanks!

---

## 11. Pour aller plus loin

Si la livraison golden cases converge bien, le document
`docs/handoff/chairgun-data-request.md` liste d'autres demandes (tables
Cd custom, algorithmes airgun-specific, scope reticle view, données
structurelles…). Mais **aucune de ces demandes n'est un prérequis** à la
livraison de cette première vague de golden cases — elles sont
strictement indépendantes.