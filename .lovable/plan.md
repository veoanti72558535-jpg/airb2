

# Plan suite P3.1 — Fiabiliser avant d'ouvrir

## 1. Résumé exécutif

P3.1 a posé l'audit trail. La suite n'est pas "ajouter du visible" mais **rendre vérifiable et lisible** ce qui existe déjà. Ordre imposé : **P3.2 fixtures métier** (contrat de non-régression) → **P3.4 EngineBadge** (transparence minimale) → **P3.5 recalcul explicite** (supprime le risque silencieux) → **P3.3 audit encapsulation** (étanchéité 8 lois) → **P3.6 zero-solver matrix** (validation tardive). MERO reste invisible. Toute metadata inférée doit être étiquetée comme telle. Le resolver de profil doit devenir explicite avant P3.5.

## 2. Ce que P3.1 a bien sécurisé

- Bundle metadata figé à la sauvegarde QuickCalc (5 champs immuables).
- Builder centralisé `buildSessionMetadata` — point unique de vérité.
- Normalize en lecture seule, zéro write-back sur legacy v0.
- Compare et Sessions héritent de la normalisation sans rien changer.
- 305 tests verts, QuickCalc visuellement intact.

## 3. Risques encore ouverts après P3.1

1. **Aucun garde-fou métier** : si un futur refactor change drop ou holdover de 2%, rien ne l'attrape.
2. **Metadata inférée présentée comme vérité** : `calculatedAt` d'une session legacy v0 = `updatedAt`, ce n'est pas la date réelle de calcul.
3. **Resolver profil fragile** : comparaison structurelle de `EngineConfig` — un futur profil ajouté peut matcher `legacy` par erreur.
4. **`requested` vs `effective`** : `dragLawEffective` capture l'effectif, mais on perd ce que l'utilisateur a demandé. Difficile de diagnostiquer "pourquoi G1 alors que j'ai mis G7 ?".
5. **Recalcul implicite QuickCalc** : `useEffect` peut recalculer à la volée sur changement d'input — pas de save auto, mais zone à neutraliser avant P3.5.
6. **8 lois exposables via import JSON projectile** : un fichier malicieux peut injecter `bcModel: 'SLG1'` aujourd'hui.
7. **UI ne signale rien** : utilisateur ne sait pas avec quel moteur ses sessions ont été calculées.

## 4. Ordre prioritaire recommandé

1. **P3.2 — Fixtures produit** (semaine 1-2). Contrat avant tout. Sans ça, tout le reste avance à l'aveugle.
2. **Durcissement resolver profil + sémantique inférée** (greffé dans P3.2, ~0.5 jour). Pré-requis pour badges honnêtes.
3. **P3.4 — EngineBadge** (semaine 2). Transparence minimale, ne ment pas grâce à l'étape précédente.
4. **P3.5 — Recalcul explicite + neutralisation recalcul implicite** (semaine 2-3). Supprime la dernière zone de risque silencieux.
5. **P3.3 — Audit encapsulation 8 lois** (semaine 3). Avant que l'écosystème import/export ne s'élargisse.
6. **P3.6 — Zero-solver matrix** (semaine 3-4). Reste tardif, validation, pas refonte.

**Rationale** : fixtures d'abord car elles deviennent le filet pour toutes les sous-phases suivantes. Badge avant recalcul car le dialog de recalcul a besoin d'afficher "ancien profil → nouveau profil" via le badge. Audit après badge car les enums UI sont touchés par le badge.

## 5. À lancer immédiatement

**P3.2 — Fixtures produit JSON + tests snapshot métier**, étendu pour inclure le **durcissement de la sémantique metadata** (champs `requested*` + flag `metadataInferred`) parce que les fixtures vont précisément exposer cette ambiguïté.

## 6. P3.2 — Fixtures produit (détaillé)

**Structure** :
```
src/lib/__fixtures__/sessions/
  manifest.md                    ← lisible humain : id, description, intention
  golden/
    01-22-pellet-30m-std.json
    02-22-slug-100m-std.json
    03-25-heavy-75m-altitude.json
    04-30-long-range-150m.json
    05-177-fieldtarget-25m.json
    06-22-cold-dry.json
    07-22-hot-humid.json
    08-25-slug-altitude-1500.json
    09-177-pcp-target-50m.json
    10-22-pbr-zero-100m.json
    11-30-slug-200m-crosswind.json    [optionnel]
    12-25-pellet-100m-mixed.json      [optionnel]
```

**Manifest format** : par fixture, bloc YAML-like : id, intention métier, calibre, projectile type, distance max, conditions météo, profil de calcul, date de capture, ce qui doit rester stable.

**Distinction tests** :
- **Golden fixtures** (`*.golden.test.ts`) : snapshots stricts sur 5 distances par fixture × 6 métriques (zéro=drop@zeroRange, holdover MOA, holdover MRAD, vitesse, énergie, dérive, clicks elev/wind). Tolérance zéro — un changement = bug ou décision explicite.
- **Cross-profile delta log** (`*.cross-profile.test.ts`) : recalcule chaque fixture en MERO, écrit `__fixtures__/sessions/cross-profile-deltas.md` avec deltas par métrique. Pas de gate, **artefact informatif** committé pour audit visuel à chaque changement moteur.

**Couverture obligatoire** : .177 pellet court, .22 pellet standard, .22 slug long, .25 lourd, .30 longue distance, zéro court (10-15m), zéro long (50-100m), altitude >1000m, conditions extrêmes (cold-dry + hot-humid), un cas crosswind.

**Capture initiale** : script `scripts/capture-fixture.ts` (one-shot, non livré) qui prend un input minimal, exécute `calculateTrajectory`, sérialise au format Session complet avec metadata. Permet de régénérer si on change le format.

## 7. P3.4 — Transparence UI (détaillé)

**Composant `<EngineBadge>`** (`src/components/sessions/EngineBadge.tsx`) :
- Props : `session` (lit profileId, dragLawEffective, cdProvenance, calculatedAt, metadataInferred).
- Variantes visuelles :
  - `Legacy` : badge gris neutre, pas d'icône.
  - `MERO beta` : badge ambre + icône flask/beaker.
  - `Legacy v0` : badge gris hachuré + icône info, indique metadata partielle.
- Tooltip systématique : "Calculé le [date] · [profil] · table [provenance]" + si inféré : "Date approximée depuis dernière modification".
- Taille : `sm` par défaut, `xs` pour listes denses.

**Intégrations** :
- `SessionsPage` liste : badge en bas-droite de chaque carte session (sm).
- Détail session (`LibraryPage` ou page dédiée) : badge en header + bloc repliable "Métadonnées de calcul" listant chaque champ.
- `ComparePage` : badge sous chaque entête de colonne. Si profils différents entre colonnes → bandeau jaune au-dessus de la table : "Comparaison entre profils différents — résultats non strictement comparables."
- `QuickCalc` : **pas de badge** maintenant. Le calcul affiché n'est pas encore une session sauvegardée, ajouter un badge ouvrirait la question "quel moteur tourne ?" qu'on ne veut pas exposer.

**i18n FR/EN** : 8-10 clés ajoutées dans `translations.ts`. Vocabulaire simple : "Moteur", "Engine", "Calculé avec", "Calculated with", "Données partielles", "Partial data". Pas de "integrator", "atmosphere model", "Cd provenance" en surface — réservés au bloc détail repliable où le jargon est acceptable.

## 8. P3.5 — Recalcul explicite (détaillé)

**Composant `<RecalculateDialog>`** :
- Trigger : bouton "Recalculer (créer une copie)" sur la page détail session, sous une section "Actions avancées" repliée.
- Contenu :
  1. Bandeau d'info : "Le recalcul ne modifie jamais la session originale. Une nouvelle session sera créée et liée à celle-ci."
  2. Bloc "Avant" : profil + dragLaw + provenance + date.
  3. Bloc "Après" : profil actuel actif (legacy par défaut) + ce qui changera.
  4. **Si profils identiques** : message "Le recalcul produira les mêmes résultats. Voulez-vous quand même créer une copie ?" (utile si on a changé un input entre-temps).
  5. **Si profils différents** : message d'avertissement explicite, deltas estimés non calculés à l'ouverture (trop coûteux), juste mention "Les résultats peuvent différer significativement".
  6. Bouton primaire : "Créer une copie recalculée". Bouton secondaire : "Annuler".

**Flux** :
- Crée nouvelle Session avec :
  - même `input` (sauf si user a édité)
  - nouveaux `results` via `calculateTrajectory`
  - nouveau bundle metadata via `buildSessionMetadata`
  - `derivedFromSessionId` = id originale
  - `name` = `originalName + " (recalculée)"`
- Originale **jamais modifiée**, jamais marquée.
- Affichée dans `LinkedSessions` sur les deux sessions (filiation bidirectionnelle).

**Neutralisation recalcul implicite QuickCalc** : audit du `useEffect` de QuickCalc. Recalcul à la volée pour preview = OK (pas sauvegardé). Mais s'assurer qu'aucun chemin ne réécrit silencieusement une session existante quand un input change. Probable refacto léger : séparer "preview live" de "session sauvegardée" — la preview ne porte jamais d'id de session.

## 9. Position sur P3.3 — Audit encapsulation

**À faire après P3.4, avant ouverture MERO future.** Pas urgent au sens "bug en prod", mais indispensable avant que l'écosystème import/export ne grossisse.

**Périmètre** :
- Grep `DragModel` : tous les `switch` doivent avoir `default` sûr (déjà partiellement fait en P2, à finaliser).
- `ImportPresetProjectilesModal` : valider que tout `bcModel` importé est dans `{G1, G7, GA, GS}`. Sinon → strip vers G1 + warning utilisateur.
- Export JSON projectile : si `bcModel` est MERO interne → strip à l'export OU export avec warning. Décision : **strip silencieux**, le projectile stocké en interne peut garder la loi MERO mais le JSON exposé reste public-safe.
- Sérialisation Session : metadata complet en interne, mais si export "partage" → version sans `engineMetadata` détaillé (préserve `profileId` et `cdProvenance` qui sont publics).
- Tests : import projectile avec `bcModel: 'SLG1'` → fallback G1 + message d'erreur clair.
- Audit dropdowns : `EntitySelect`, `DragTableEditor`, `ProjectileSection` — confirmer que `LEGACY_PROFILE.dragLawsAvailable` est la seule source des options.

**Pas de changement UI visible** au-delà des messages d'erreur d'import.

## 10. Position sur P3.6 — Zero-solver matrix

**Reste tardif, validation seulement, pas refonte.** Position confirmée.

**Intérêt produit immédiat** : faible. La bisection actuelle marche, P2 a corrigé la cohérence integrator/atmosphère.

**Risque de complexité** : élevé si on touche l'algo. Newton hybride = chantier P4.

**Utilité avant ouverture MERO** : nécessaire mais pas bloquante. Sert à documenter que MERO ne dégrade pas le zero sur des conditions limites.

**Périmètre P3.6 minimal** :
- Test matriciel : 4 distances zéro (10/25/50/100m) × 3 altitudes (0/1000/2000m) × 3 températures (-10/15/35°C) = 36 cellules par profil.
- Comparer drop@zeroRange entre legacy et MERO.
- Générer rapport `__fixtures__/sessions/zero-solver-matrix.md`.
- Tolérance large (±5mm), pas de gate strict — c'est un audit, pas un contrat.
- Si une cellule dépasse 5mm → flag rouge dans le rapport, ticket dédié.

**Pas avant** que P3.2-3.5 soient verts.

## 11. Métadonnées inférées / ambiguës

**Position : ajouter maintenant, pas plus tard.** Sinon les badges P3.4 vont mentir.

**À ajouter** :
- `Session.metadataInferred?: boolean` — `true` quand des champs metadata ont été back-fillés au lieu d'être figés à la création (= toute session legacy v0).
- `Session.calculatedAtSource?: 'frozen' | 'inferred-from-updatedAt' | 'inferred-from-createdAt'` — précise comment `calculatedAt` a été obtenu.

**Règle** :
- Sessions créées après P3.1 : `metadataInferred: false`, `calculatedAtSource: 'frozen'`.
- Sessions legacy v0 normalisées : `metadataInferred: true`, `calculatedAtSource: 'inferred-from-updatedAt'`.

**Conséquence UI** : badge "Legacy v0" affiche systématiquement l'icône info + tooltip "Métadonnées partielles, reconstituées depuis la dernière modification". Honnêteté maximale, pas de sur-promesse.

**À repousser** : versionnement plus fin (par champ), schéma migration formel, `metadataConfidence: number`. P5+.

## 12. Requested vs resolved/effective

**Position : ajouter `requestedDragModel` maintenant, `requestedProfileId` plus tard.**

- `dragLawEffective` (existant) capture ce que le moteur a réellement utilisé.
- Ajouter `dragLawRequested?: DragModel` : ce que l'input portait avant le `?? 'G1'` fallback. Permet de diagnostiquer "j'ai demandé G7 mais ça a tourné en G1 car projectile sans bcModel".
- Pour le profil : pas besoin de `requestedProfileId` séparé tant qu'il n'y a pas d'override par session (reporté P4). Le `profileId` figé suffit aujourd'hui.

**Affichage** : seulement dans le bloc détail repliable, pas dans le badge principal. "Demandé : G7 — Utilisé : G1 (BC sans modèle, fallback)".

## 13. Durcissement du resolver de profil

**Position : avant P3.5, indispensable.** Aujourd'hui `resolveProfileId` compare structurellement `EngineConfig` — fragile dès qu'un troisième profil arrivera.

**Trajectoire recommandée** :
1. **Maintenant (greffé P3.2)** : ajouter `EngineConfig.profileId?: ProfileId` optionnel. Quand présent, `resolveProfileId` le lit directement. Quand absent, retombe sur la comparaison structurelle (rétrocompat).
2. **`profiles.ts`** : chaque `BallisticProfile.config` porte son `profileId` en self-reference.
3. **Engine** : transmet le `profileId` reçu vers `buildSessionMetadata`. Plus de devinette.
4. **Tests** : profil fictif avec config identique à legacy mais `profileId: 'mero'` → metadata enregistre `mero`. Aujourd'hui ça enregistrerait `legacy` à tort.

**Ce qui reste pour plus tard** : centralisation du resolver dans un module dédié, registry de profils étendu, validation de cohérence config↔profileId au load. P4.

## 14. Impact sur surfaces existantes

| Surface | P3.2 | P3.4 | P3.5 | P3.3 |
|---|---|---|---|---|
| QuickCalc | aucun | aucun | neutralisation recalcul implicite (refacto interne) | aucun visible |
| Sessions liste | aucun | badge sm sur carte | aucun | aucun |
| Sessions détail | aucun | badge + bloc metadata | bouton "Recalculer" en zone avancée | aucun |
| Compare | aucun | badge par colonne + bandeau warning si mixte | aucun | aucun |
| Exports JSON | aucun | aucun | nouveau bloc metadata déjà inclus | strip lois MERO si export public |
| Imports | aucun | aucun | aucun | reject/strip lois MERO + warning |
| Favoris | aucun | aucun | aucun | aucun |

## 15. Risques de régression

- **P3.2** : capture initiale des fixtures fige aussi les bugs actuels. Mitigation : revue manuelle de chaque fixture avant commit, comparaison contre une calculatrice tierce sur 2-3 valeurs sentinelles.
- **P3.4** : ajout de tooltips peut alourdir le DOM des listes. Mitigation : badge léger, tooltip lazy.
- **P3.5** : refacto recalcul implicite QuickCalc = zone sensible. Mitigation : tests E2E manuels sur QuickCalc avant merge, fixtures golden vertes obligatoires.
- **Ajout `requestedDragModel`** : tous les builders metadata doivent être mis à jour. Centralisation déjà faite en P3.1 → un seul point.
- **Resolver durci** : profils existants doivent porter `profileId` en self-reference. Risque de duplication entre clé registry et champ — un test de cohérence suffit.

## 16. Roadmap d'exécution

**Tranche A — P3.2 + durcissement (semaine 1)**
- A.1 : ajouter `metadataInferred`, `calculatedAtSource`, `dragLawRequested` au type `Session`.
- A.2 : ajouter `profileId` optionnel à `EngineConfig`, propager dans `profiles.ts`.
- A.3 : refactor `buildSessionMetadata` pour utiliser `profileId` explicite + capturer requested.
- A.4 : refactor `session-normalize` pour étiqueter inferred.
- A.5 : créer `__fixtures__/sessions/golden/` + 8 fixtures + manifest.
- A.6 : tests snapshot golden.
- A.7 : tests cross-profile delta log.

**Tranche B — P3.4 (semaine 2)**
- B.1 : composant `EngineBadge` + variantes + tooltip.
- B.2 : i18n FR/EN.
- B.3 : intégration Sessions liste.
- B.4 : intégration détail session + bloc metadata repliable.
- B.5 : intégration Compare + bandeau warning profils mixtes.

**Tranche C — P3.5 (semaine 2-3)**
- C.1 : audit + neutralisation recalcul implicite QuickCalc.
- C.2 : composant `RecalculateDialog`.
- C.3 : flux création copie + `derivedFromSessionId`.
- C.4 : intégration `LinkedSessions` filiation bidirectionnelle.

**Tranche D — P3.3 (semaine 3)**
- D.1 : audit grep DragModel.
- D.2 : validation import projectile (strip MERO laws).
- D.3 : sanitisation export public.
- D.4 : tests.

**Tranche E — P3.6 (semaine 3-4)**
- E.1 : test matriciel zero-solver legacy × MERO.
- E.2 : génération rapport markdown.

## 17. Première sous-phase à exécuter maintenant

**Tranche A complète (P3.2 + durcissement metadata)** — exécutée en un bloc cohérent car le durcissement metadata change la forme des fixtures qu'on va capturer. Capturer des fixtures d'abord puis ajouter les champs ensuite = double travail.

Périmètre exact :
- Étendre `Session` avec `metadataInferred`, `calculatedAtSource`, `dragLawRequested`.
- Ajouter `profileId` à `EngineConfig`, self-référencer dans `LEGACY_PROFILE` et `MERO_PROFILE`.
- Mettre à jour `buildSessionMetadata` et `session-normalize`.
- Créer 8 fixtures golden + manifest.
- Tests snapshot par fixture sur 6 métriques × 5 distances.
- Test cross-profile delta log informatif.
- Aucun changement UI.

## 18. Checklist d'acceptation tranche A

- [ ] `Session` étendu : 3 nouveaux champs typés.
- [ ] `EngineConfig.profileId` propagé depuis les profils.
- [ ] `buildSessionMetadata` utilise `profileId` explicite, plus de comparaison structurelle.
- [ ] Sessions normalisées portent `metadataInferred: true` et `calculatedAtSource` correct.
- [ ] 8 fixtures golden committées avec manifest lisible.
- [ ] Tests snapshot verts (≥240 nouveaux assertions = 8 × 5 distances × 6 métriques).
- [ ] Rapport `cross-profile-deltas.md` généré et committé.
- [ ] `npm test` vert (≥350 tests attendus).
- [ ] QuickCalc, Sessions, Compare visuellement intacts.
- [ ] Aucun nouveau composant UI.
- [ ] Aucune fuite RA4/GA2/SLG.

## 19. À ne surtout pas faire maintenant

- **Sélecteur de profil UI** sous quelque forme que ce soit, même "caché derrière advanced".
- **Recalcul en masse** des sessions legacy v0, même opt-in.
- **Migration automatique** d'aucune sorte.
- **Modification du label "MERO"** dans aucune surface utilisateur.
- **Vent vectoriel** — tentation forte mais rosace = chantier UI dédié P4.
- **Zero-solver Newton** — la bisection suffit, refonte = piège.
- **Tables mero-official** — chantier scientifique séparé, pas pendant P3.
- **Catalogues réticules / PBR / dual-chrono / Cant / Coriolis** — P5+, non négociable.
- **Modifier `src/lib/ballistics.ts`** — reste pure ré-export.
- **Toucher au format de `localStorage` Session** sans path de lecture compatible legacy.

