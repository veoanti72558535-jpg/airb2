

# Plan P3 — Sécurisation produit avant ouverture MERO

## 1. Résumé exécutif

P3 n'est **pas** la phase d'ouverture MERO. C'est la phase qui rend cette ouverture **possible sans casse**. Le moteur est prêt techniquement (P2 acquis), le produit ne l'est pas. Trois chantiers bloquants doivent passer avant tout sélecteur UI : **traçabilité moteur dans les sessions**, **fixtures produit de non-régression**, **UX de transparence (badges + recalcul explicite)**. MERO reste strictement opt-in derrière un flag dev. Vent vectoriel, zero-solver Newton, catalogues réticules, PBR : tout cela glisse en P4+. Direction non négociable : **stabilité > nouveauté**.

## 2. Ce que P2 a bien préparé

- Moteur dispatché par `EngineConfig` (intégrateur, atmosphère, Cd source).
- 8 lois résolues, 4 exposées — encapsulation correcte côté types.
- Profil `mero` enregistré `beta:true`, jamais sélectionné par défaut.
- `Session.engineVersion` + `Session.profileId` déjà dans le type.
- Truth-set 15 entrées, tolérances par profil.
- `calculateTrajectory(input)` sans `engineConfig` = bit-exact legacy.

P2 a livré le **noyau** mais pas la **gouvernance produit**.

## 3. Risques critiques si on ouvre MERO trop tôt

1. **Sessions silencieusement divergentes** : un user qui change de profil global voit ses chiffres bouger sans comprendre pourquoi.
2. **Compare incohérent** : deux sessions calculées avec des moteurs différents comparées comme si c'était le même référentiel.
3. **Tables `derived-p2` perçues comme MERO officiel** : faux contrat scientifique.
4. **Exports (JSON, CSV) sans metadata moteur** : impossible de re-tracer un calcul a posteriori.
5. **Favoris / historique / clicks sauvegardés** invalidés sans avertissement.
6. **RA4/GA2/SLG fuitent** via import/export projectile ou enums sérialisés.
7. **Recalcul implicite au chargement d'une session** = perte de confiance définitive.

## 4. Priorité absolue de P3

Dans l'ordre, **non négociable** :

1. Versionnement effectif des sessions (engineVersion + profileId + provenance figés à la sauvegarde).
2. Fixtures produit JSON + tests de non-régression métier (zéro, holdover, vitesse, énergie, dérive, clicks).
3. Audit encapsulation 8 lois (API, import/export, sérialisation).
4. Badge UI "calculé avec X" sur sessions + Compare.
5. Recalcul **explicite uniquement** (jamais silencieux).
6. Flag dev pour tester MERO en interne, pas de sélecteur user-facing.

Tout le reste (vent vectoriel, Newton, réticules, PBR, dual-chrono) = **P4+**.

## 5. Arbitrages clés à imposer

| Sujet | Décision |
|---|---|
| Sélecteur profil UI Settings | **Reporté P4** — pas avant fixtures vertes |
| Override par session | **Reporté P4** |
| MERO devient default | **Reporté P5+** après tables officielles |
| Tables mero-official | **Reporté P4** — chantier scientifique séparé |
| Vent vectoriel | **Reporté P4** |
| Zero-solver Newton | **Reporté P4** — bisection actuelle suffit |
| Migration sessions legacy | **P3 — coexistence, pas migration** |
| Badge engineVersion | **P3 obligatoire** |
| Bouton "Recalculer avec MERO" | **P3 — opt-in explicite, dialog warning** |
| Catalogue réticules / PBR / Cant / Coriolis | **P5+** |

## 6. Avant toute exposition UI large de MERO

Conditions cumulatives :
- Tables `mero-official` digitalisées et croisées vs JBM/StrelokPro (≤1% sur 5 calibres tests).
- Fixtures produit ≥20 sessions réelles, snapshots stables.
- Migration sessions legacy testée sur ≥3 versions de schéma historique.
- Badge moteur visible partout où un résultat est affiché.
- Dialog "Vous changez de moteur, vos sessions existantes ne seront pas recalculées sauf action explicite" validée bilingue.
- Documentation utilisateur FR/EN écrite (1 page : "Que change MERO ?").
- Au moins 2 semaines d'utilisation interne sous flag dev sans incident.

## 7. Plan de versionnement des calculs

À ajouter sur chaque `Session` au moment de la sauvegarde :

- `engineVersion: number` (déjà typé, à figer effectivement)
- `profileId: ProfileId` (idem)
- `dragLawEffective: DragModel` (la loi réellement utilisée, pas celle demandée)
- `cdProvenance: 'legacy-piecewise' | 'derived-p2' | 'mero-official'`
- `calculatedAt: ISO string`
- `engineMetadata: { integrator, atmosphereModel, dt }` (snapshot config compilée)

**Règle dure** : ces champs sont **immutables** après création. Toute modification d'input → nouvelle session ou recalcul explicite avec mise à jour de tous ces champs en bloc.

## 8. Sessions et coexistence legacy/MERO

**Pas de migration automatique.** Stratégie de coexistence :

- Sessions sans `engineVersion` → traitées comme `legacy v0` (pré-P1).
- Sessions sans `profileId` → `'legacy'`.
- Sessions sans `cdProvenance` → `'legacy-piecewise'`.
- Aucun recalcul au chargement, jamais.
- Compare refuse (ou avertit fortement) la comparaison de sessions de profils différents.
- Exports JSON incluent toujours le bloc metadata complet.
- Imports JSON valident la présence des champs ou les remplissent en `legacy v0`.

`session-normalize.ts` est le point d'entrée unique : il **lit** les anciennes sessions, ne les **réécrit jamais** sans action utilisateur.

## 9. Stratégie de migration

**Non-migration assumée.** Une session = un instantané d'un calcul à un moment donné avec un moteur donné. Migrer = mentir sur l'historique.

Le seul flux de "migration" autorisé en P3 :
- Bouton explicite **"Recalculer cette session avec [profil actuel]"** sur la page détail.
- Dialog : ancien profil → nouveau profil, deltas attendus, confirmation.
- Crée une **nouvelle session** avec lien vers l'originale (`derivedFromSessionId`).
- L'originale n'est jamais modifiée.

## 10. UX de transparence et avertissement

À livrer en P3 :

- **Badge moteur** sur chaque carte session, header de QuickCalc, ligne Compare. Format : `Legacy` (neutre gris), `MERO beta` (ambre + icône), `Legacy v0` (gris striped — pré-P1).
- **Tooltip badge** : "Calculé le [date] avec moteur [X] — table Cd [provenance]".
- **Compare** : si deux profils différents → bandeau jaune "Comparaison entre profils différents — résultats non strictement comparables".
- **Dialog recalcul** : titre clair, deltas estimés, bouton "Créer une copie recalculée" (pas "remplacer").
- **Aucun changement de label dans QuickCalc** tant que MERO n'est pas exposé.
- **i18n FR/EN** complet sur tous ces éléments avant merge.

## 11. Tests de non-régression orientés produit

Au-delà du truth-set technique, créer `src/lib/__fixtures__/sessions/`:

- 8 à 12 sessions JSON réelles, capturées depuis l'app actuelle.
- Couverture : .177 pellet 50m, .22 slug 100m, .25 lourd 75m, .30 longue distance, conditions altitude/humidité non standard, zéro court (10m) et long (50m).
- Test : charger fixture → recalculer avec profil **identique à celui figé** → snapshot strict sur **zéro, holdover MOA+MRAD, vitesse, énergie, dérive, clicks elev/wind** à 5 distances.
- Test croisé legacy vs MERO sur les mêmes 8-12 fixtures → log des deltas, pas de gate, mais artefact lisible.
- Test : import/export round-trip → tous les champs metadata préservés, aucune fuite RA4/GA2/SLG.
- Test : Compare entre profils différents → warning rendu.

Ces tests tournent à chaque `npm test` — c'est le contrat produit.

## 12. Ouverture progressive de MERO beta

**P3** : flag dev uniquement (`localStorage.setItem('airballistik.devProfile', 'mero')`). Aucun bouton UI.

**P3-bis** (après fixtures vertes) : page `/admin` réservée → toggle "Activer MERO beta dans cette session navigateur". Pas persisté.

**P4** : sélecteur Settings derrière "Paramètres avancés" + dialog explicatif obligatoire à la première activation.

**P5+** : ouverture par défaut envisagée seulement après tables `mero-official`.

## 13. Caché ou admin-only en P3

- Sélecteur de profil global.
- Override profil par session.
- Bouton "Recalculer en masse".
- Affichage RA4/GA2/SLG dans tout dropdown projectile.
- Mention "MERO" dans toute UI hors `/admin` et hors flag dev.

## 14. Repoussé en P4+

- Vent vectoriel (rosace, conventions horaires).
- Zero-solver Newton hybride.
- Table balistique configurable (ChairGun-style).
- Catalogue réticules.
- PBR.
- BC dual-chrono.
- Cant / Slope / Coriolis / Moving target → P5+.
- Tables MERO officielles digitalisées → chantier dédié P4.

## 15. Recommandation zero-solver / vent / tables futures

- **Zero-solver** : la bisection actuelle est suffisante. La cohérence integrator/atmosphère a été corrigée en P2. Ajouter en P3 uniquement une **matrice de tests croisés** (10/25/50/100m × 0/500/2000m altitude × -10/15/35°C) — pas de refonte algorithmique.
- **Vent** : rester `lateral-only`. Le passage vectoriel introduit une convention (0/90/180/270 horaire vs trigonométrique) qui touche l'UI. À traiter proprement en P4 avec rosace dédiée.
- **Tables mero-official** : ne pas tenter en P3. Chantier scientifique distinct nécessitant sources documentées (Litz, JBM, papiers MERO). Préparer uniquement le champ `cdProvenance` pour permettre le flip plus tard sans changement de schéma.

## 16. Impact sur QuickCalc, Sessions, Compare, exports

| Surface | Changement P3 |
|---|---|
| QuickCalc | Aucun visible. Calculs en legacy. Sauvegarde figeant les nouveaux champs metadata. |
| Sessions liste | Badge moteur sur chaque carte. Aucun autre changement. |
| Sessions détail | Bloc "Métadonnées de calcul" repliable. Bouton "Recalculer (créer copie)" sous Advanced. |
| Compare | Badge sur chaque colonne. Bandeau warning si profils mixtes. |
| Exports JSON | Bloc metadata systématique. Validation à l'import. |
| Exports CSV | Colonne `engine` ajoutée. |
| Favoris | Aucun impact — un favori reste un favori. |
| Historique | Aucun impact direct. |

## 17. Roadmap P3 découpée

**P3.1 — Versionnement effectif (semaine 1)**
- Étendre type `Session` avec les 5 nouveaux champs metadata.
- Modifier `sessionStore.create` et tout chemin de sauvegarde QuickCalc.
- Étendre `session-normalize.ts` pour combler legacy v0.
- Tests : round-trip storage, normalize idempotent.

**P3.2 — Fixtures produit (semaine 1-2)**
- Créer `src/lib/__fixtures__/sessions/` avec 8-12 JSON.
- Test suite snapshot par fixture (zéro, holdover, vitesse, énergie, dérive, clicks).
- Test cross-profile delta log (informatif).

**P3.3 — Audit encapsulation 8 lois (semaine 2)**
- Grep DragModel partout, vérifier `default` dans chaque switch.
- Audit imports/exports projectile : refuser ou stripper RA4/GA2/SLG.
- Audit sérialisation Session : metadata jamais exposée si projet open-source.
- Tests : import projectile MERO law → erreur explicite.

**P3.4 — UX transparence (semaine 2-3)**
- Composant `<EngineBadge>` réutilisable.
- Intégration : Sessions list, Sessions detail, Compare colonnes.
- Tooltip i18n FR/EN.
- Bandeau warning Compare profils mixtes.

**P3.5 — Recalcul explicite (semaine 3)**
- Dialog "Recalculer cette session".
- Création nouvelle session avec `derivedFromSessionId`.
- LinkedSessions affiche la filiation.

**P3.6 — Matrice zero-solver (semaine 3-4)**
- Tests croisés legacy × MERO sur grille distances/atmosphère.
- Rapport delta documenté, tolérances par cellule.

## 18. Première sous-phase à lancer maintenant

**P3.1 — Versionnement effectif des sessions.**

C'est la fondation de tout le reste. Sans champs metadata figés à la sauvegarde, ni les fixtures, ni les badges, ni le recalcul explicite n'ont de sens. Périmètre strict :

- Étendre `Session` type avec `dragLawEffective`, `cdProvenance`, `calculatedAt`, `engineMetadata`.
- Modifier le seul chemin de sauvegarde session (QuickCalc → `sessionStore.create`) pour figer ces champs.
- `session-normalize.ts` traite les anciennes sessions comme `legacy v0` sans réécriture.
- Tests : nouvelles sessions ont metadata complet, anciennes restent intactes mais lisibles.
- Aucun changement UI visible.

## 19. Checklist d'acceptation P3

- [ ] `Session` porte les 5 nouveaux champs metadata, figés à la création.
- [ ] Anciennes sessions chargées sans erreur, étiquetées `legacy v0`.
- [ ] 8-12 fixtures produit JSON committées, tests snapshot verts.
- [ ] Cross-profile delta log généré et lisible (pas de gate).
- [ ] Aucune fuite RA4/GA2/SLG via import/export ou enum UI.
- [ ] Badge moteur visible : Sessions list, detail, Compare.
- [ ] Bandeau Compare profils mixtes opérationnel.
- [ ] Dialog recalcul → crée copie liée, jamais ne remplace.
- [ ] Matrice zero-solver legacy × MERO documentée.
- [ ] i18n FR/EN complet sur tous les nouveaux éléments.
- [ ] QuickCalc visuellement inchangé.
- [ ] `npm test` vert (≥320 tests attendus).
- [ ] Aucun sélecteur de profil exposé en UI grand public.

## 20. Conditions minimales avant ouverture MERO grand public (post-P3)

1. Tables `cdProvenance: 'mero-official'` digitalisées et validées (≤1% vs JBM sur 5 calibres).
2. Fixtures produit ≥20 sessions, snapshots stables sur 2 cycles de release.
3. Page documentation utilisateur "Que change MERO ?" écrite FR + EN.
4. Dialog d'activation MERO testée en utilisabilité (au moins 3 utilisateurs non-techniques).
5. Recalcul explicite éprouvé en interne sur ≥50 sessions sans incident.
6. Compare cross-profile rendu lisible et compris.
7. Décision produit explicite et tracée : "MERO sort de beta le [date]".
8. Changelog FR/EN publié avec exemples de deltas typiques.

Tant qu'un seul de ces points manque, MERO reste derrière flag dev ou page admin. Pas de compromis.

