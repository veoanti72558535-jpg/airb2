# Plan — ChairGun handoff document

## Goal
Create a single tracked markdown document that:
1. Lists every technical/data request we want to send to the ChairGun developer.
2. Includes the **Scope Reticle View** request (target placement on reticle SVG, SFP scaling, target catalog, click-coordinate mapping) based on the two screenshots provided.
3. Provides ready-to-send messages in **FR + EN**.
4. Includes a reception checklist mapping each deliverable to its target location in the repo.

No code, no engine change, no migration, no UI exposure. Pure documentation.

---

## Tranche unique — Documentation only

### Files

- **Created**: `docs/handoff/chairgun-data-request.md` (~300–400 lines)
- **Created**: `docs/handoff/assets/chairgun-scope-reticle-view-1.jpg` (copy of screenshot #1)
- **Created**: `docs/handoff/assets/chairgun-scope-reticle-view-2.jpg` (copy of screenshot #2)
- **Modified**: none
- **Deleted**: none

### Document structure

1. **Contexte & objectif** — why this exists, link to the Python clone analysis, link to existing `docs/validation/cross-validation-protocol.md` and `docs/validation/external-case-json.md` (so ChairGun dev can reuse our pivot format directly).

2. **Demandes priorisées** (P1 → P4). Each item has: *Quoi / Format attendu / Impact AirBallistik / Effort estimé pour lui / Où ranger dans le repo*.

   - **P1 — Validation numérique (impact max)**
     - 1.1 Golden cases (10–20 tirs complets, format `external-case-json.md`)
       → cible : `src/lib/__fixtures__/cross-validation/<case-id>/`
     - 1.2 Tables Cd custom par projectile (JSB, H&N, FX, NSA…)
       → cible : futur module `src/lib/ballistics/drag/chairgun-cd-tables.ts` (hors scope ici)

   - **P2 — Algorithmes airgun-specific**
     - 2.1 Modèle Cd(Mach) pour diabolos subsoniques (régime 0.3 < M < 0.9 + transition transsonique)
     - 2.2 Spin drift adapté pellets (Miller SG modifié, drift courte portée < 100 m)
     - 2.3 Effet Magnus / couplage spin × wind (drift vertical en vent latéral, drift en headwind/tailwind)
     - **2.4 Scope Reticle View — code & structure** (NOUVEAU, basé sur les screenshots)
       Demande explicite :
       - Algorithme de **placement de cible sur SVG réticule** (projection coordonnées balistiques → coordonnées angulaires réticule)
       - Système de coordonnées : conversion **clicks tourelle ↔ MIL/MOA ↔ pixels SVG**
       - Formule **SFP scaling** (ex. `subtension_apparent = subtension_nominal × magCal / magActuelle`)
       - Gestion **FFP** (pas de scaling) vs **SFP** (scaling actif)
       - Structure du **catalogue de cibles** (rond, rectangle, 3-GN, silhouettes…) avec dimensions physiques
       - Logique de **calcul du holdover/windage affiché** sur le réticule à partir de la sortie balistique (drop, drift, range courant)
       - Format de **sérialisation d'une vue** (réticule + cible + range + conditions) — utile pour reproduire un screenshot
       - Référence aux 2 screenshots dans `docs/handoff/assets/` pour contexte visuel

   - **P3 — Données structurelles**
     - 3.1 Catalogue projectiles avec BC mesurés (pas marketing) par marque/poids/diamètre
     - 3.2 Catalogue optiques avec magnification réelle calibrée (pour SFP scaling)
     - 3.3 Click value mesuré vs nominal par modèle d'optique
     - 3.4 Méthodologie PBR pour zones vitales petit gibier

   - **P4 — UX & calibration**
     - 4.1 Méthode back-calculation BC (truing)
     - 4.2 Formule compensation angle de tir airgun
     - 4.3 Workflow chrono (ES/SD threshold, nb tirs minimum)

3. **Hors scope / non demandé** — code source complet ChairGun, intégrateur numérique, zero-solver. Transparence pour ne pas surcharger.

4. **Messages prêt-à-envoyer** — deux blocs citables (FR + EN), courts, qui :
   - Présentent AirBallistik en 2 phrases
   - Pointent vers le format pivot `external-case-json.md`
   - Ouvrent par une question légère (« qu'est-ce qui est facile à partager pour toi ? ») plutôt que tout demander d'un coup
   - Mentionnent explicitement la demande **Scope Reticle View** avec les 2 screenshots en référence visuelle

5. **Checklist de réception** — pour chaque type de livrable :
   - Où le ranger
   - Quel test lancer pour valider
   - Quelle memory mettre à jour (notamment `mem://constraints/mero-exposure-gates` si les golden cases débloquent MERO)

### Constraints respected

- ✅ `src/lib/ballistics/` intouchable
- ✅ `supabase/`, `src/lib/ai/edge-client.ts`, `src/components/cross-validation/` intouchables
- ✅ Aucune exposition feature prématurée
- ✅ Réutilise conventions existantes (`docs/handoff/`, `docs/validation/external-case-json.md`)
- ✅ Pas de migration, pas de SQL, pas de test

### Risques / régressions

Aucun. Document pur + 2 fichiers image copiés depuis user-uploads. Hors chaîne de build, hors tests, hors runtime.

### Ce qui reste à faire après ce tranche

- Envoyer le message au dev ChairGun (action utilisateur, hors Lovable)
- À réception des données : exécuter la checklist (action future, créera ses propres tranches BUILD)
