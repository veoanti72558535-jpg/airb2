Le plan déjà présenté reste valide. Avant de l'approuver, je dois verrouiller 4 arbitrages. Voici la version condensée avec les questions intégrées.

# Restructuration AirBallistik — Moteur unifié + profils

## Architecture cible (3 couches)

```text
PRESENTATION  → React, QuickCalc, Sessions, SFP/FFP scaling, charts
   ↓ BallisticInput / BallisticResult
PROFILES      → Legacy | MERO | ChairGun | Strelok (presets, pas de physique propre)
   ↓ EngineConfig
CORE ENGINE   → drag tables 169pts × 8 lois, integrator, atmosphere,
                wind vector, zero solver, spin drift, PBR, BC tools
                (pur, déterministe, zéro React)
```

**Règle dure** : un profil = configuration du noyau, jamais un moteur séparé. Si deux profils n'ont pas de différence physique mesurable, l'un devient un preset UX.

## Roadmap (6 phases)

- **P1 — Fondation** *(BLOQUANT, démarre dès approbation)* : créer `src/lib/ballistics/`, importer table MERO 169pts, jeu de vérité 15 setups (MERO + JBM), tests ±5%, ancien `ballistics.ts` réexporte (zéro régression), champs `engineVersion` + `profileId` ajoutés à Session.
- **P2 — Profil MERO + trapézoïdale** : profil `mero` (Tetens, trapézoïdale), profil `legacy` figé, bench perf <60ms (target 35ms), tolérance ±2%.
- **P3 — Vent vectoriel + zero solver durci** : convention 0/90/180/270 horaire, bissection+Newton, rosace UI, MERO devient default.
- **P4 — Outputs + catalogues** : table balistique configurable (ChairGun-style), graphes étendus, MVP réticules, PBR, BC dual-chrono.
- **P5 — Post-processings avancés** : Cant, Slope, Coriolis, Moving target, activation lois RA4/GA2/SLG0/SLG1 derrière flag.
- **P6 — Migration & validation terrain** : bouton "Recalculer sessions legacy", badge legacy, rapport delta, changelog FR/EN.

## Décisions à verrouiller avant démarrage P1

Réponds simplement par les numéros (ex. "1a, 2a, 3a, 4a") :

**1. Lois Cd visibles en V1 profils**

- **a)** G1 / G7 / GA / GS uniquement (RA4/GA2/SLG en flag) — recommandé
- **b)** Les 8 lois MERO immédiatement
- **c)** G1 / G7 seulement (minimaliste)

**2. Profil par défaut au lancement de P1**

- **a)** Legacy — sécurise sessions existantes, MERO devient default en P3 après validation — recommandé
- **b)** MERO dès P2 — plus ambitieux, sessions existantes restent en Legacy via leur profileId

**3. Sélecteur de profil**

- **a)** Global dans Settings + override possible par session — recommandé
- **b)** Uniquement global dans Settings
- **c)** Toujours par session

**4. Coriolis / Cant / Slope / Moving target**

- **a)** Tous en P5, post-MERO validé — recommandé
- **b)** Cant + Slope avancés en P3, Coriolis + Moving target en P5
- **c)** Tout en P6 ou plus tard

Une fois ces 4 points verrouillés → approbation et démarrage immédiat de **P1** (création de `src/lib/ballistics/`, import table MERO, jeu de vérité, tests de non-régression, sans aucun changement visible utilisateur).

**Note sur les 3 APK uploadés** (ChairGun 1.3.7, Strelok Pro 6.4.0, ChairGun Elite) : conservés comme sources pour P3/P4 (extraction catalogue réticules, conventions UX, données projectiles), pas exploités dans P1. Si tu veux que j'extraie quelque chose de spécifique avant P1, dis-le.

**Statut : en attente des 4 arbitrages.**  
  
Important :

- aucun changement visible inutile côté UI
- ne pas commencer P2 tant que P1 n’est pas propre et stable
- &nbsp;
- garder la compatibilité avec QuickCalc, Sessions, Compare et les données existantes  
  
  
À la fin, ajoute obligatoirement :

1. Résumé détaillé de tout ce qui a été implémenté
2. Liste des fichiers modifiés
3. Liste des fichiers créés
4. Liste des fichiers supprimés
5. Pour chaque fichier, préciser brièvement le rôle du changement
6. Signaler les points sensibles, régressions possibles ou éléments à tester
7. Indiquer clairement ce qui est terminé et ce qui reste à faire  
