# Journal des modifications - Antigravity

Ce document est le registre chronologique de toutes les modifications apportées par **Antigravity**. 
*Règle pour Lovable et Antigravity : Ce fichier doit être mis à jour après chaque modification majeure, en ajoutant un bloc daté.*

---

### [2026-04-25 03:00:00] Axe 1 : Moteur Balistique (Reverse Engineering ChairGun & Strelok)
**Fichiers ajoutés :** 
- `src/lib/ballistics/drag/chairgun-drag-table.ts` (Table Cd 14 points ChairGun + formule retardation)
- `src/lib/ballistics/coriolis.ts` (Dérive Coriolis latérale + verticale)
- `src/lib/ballistics/__tests__/chairgun-drag.test.ts`
- `src/lib/ballistics/__tests__/coriolis.test.ts`
- `src/lib/ballistics/__tests__/profiles-p3.test.ts`

**Fichiers modifiés :**
- `src/lib/ballistics/engine.ts` : Ajout du vent vectoriel, angle de tir (slope angle), effet de Coriolis, et prise en charge des zones de BC multiples.
- `src/lib/ballistics/drag/retardation.ts` : Ajout du mode `chairgun-direct` (calcul direct sans constante DRAG_K ni atmosphère standard pour coller à la physique de ChairGun).
- `src/lib/ballistics/profiles.ts` : Création du système de profils interchangeables (**ChairGun** utilisant l'intégrateur Heun + Drag CG, et **Strelok**).
- `src/lib/ballistics/types.ts` : Ajout de `retardationMode`, `slopeAngle`, `latitude`, `shootingAzimuth`.
- `src/lib/ballistics/zero-solver.ts` : Transmission du mode de retardateur pour assurer la cohérence entre le zéro et le vol.
- `src/lib/ballistics/profiles.test.ts` : Mise à jour des tests pour valider l'intégration ChairGun.

---

### [2026-04-25 04:00:00] Axe 2 : Création Initiale du Scope View (ChairGun)
**Fichiers ajoutés :**
- `src/components/reticles/ChairGunScopeView.tsx` : Moteur de rendu graphique par Canvas (High-DPI responsive).
- `src/pages/ScopeViewPage.tsx` : Page dédiée contenant les contrôles et les curseurs pour la distance, le vent et la cible.

**Fichiers modifiés :**
- `src/App.tsx` : Déclaration de la route `/scope-view`.

**Modifications :**
- Développement initial du visualiseur avec rendu balistique dynamique (chute, dérive au vent) sur le réticule sélectionné. Implémentation de 6 cibles basiques et du HUD (vitesse, énergie, temps de vol).

---

### [2026-04-26 23:00:00] Axe 1 (Suite) : Persistance et Synchronisation (Data Sync Fixes)
**Fichiers modifiés :** 
- `src/lib/auth-context.tsx`
- `src/lib/library-supabase-repo.ts`

**Modifications :**
- **Correction des "Race Conditions"** : Dans `auth-context.tsx`, le système attend explicitement (via `await`) le téléchargement complet des préférences, des sessions, et de la base de données (libraries) avant de déverrouiller l'interface utilisateur. Ceci évite les écrans vides au chargement.
- **Migration des Projectiles vers IndexedDB** : Le stockage massif des projectiles saturait le quota `localStorage` (limite 5MB). Le processus a été entièrement réécrit pour utiliser `IndexedDB` (`readProjectilesFromIdb`, `writeProjectilesToIdb`) dans `library-supabase-repo.ts`.

---

### [2026-04-27 00:30:00] Axe 2 (Suite) : Refonte "Pixel-Perfect" ChairGun (Scope Viewer)
**Fichiers modifiés :** 
- `src/components/reticles/ChairGunScopeView.tsx`
- `src/pages/ScopeViewPage.tsx`
- `src/pages/QuickCalc.tsx`

**Modifications :**
- **Moteur Graphique (Canvas)** :
  - **Lumière inversée** : Fond intérieur de la lunette **blanc pur** avec vignette sombre extérieure (`#151515`).
  - **Tourelle Supérieure** : Ajout d'une molette d'élévation métallique avec marqueur rouge (`0`) et repères (1U, 1D).
  - **Esthétique ChairGun** : Textes du vent en magenta, cible en bleu clair, et repères de chute en rouge alignés sur l'axe vertical du réticule noir.
  - **Cibles SVG Authentiques** : Intégration de véritables silhouettes animales vectorielles (Lapin, Écureuil, Renard, Sanglier) colorées or/marron.
- **Intégration et Flux (UX)** :
  - Ajout du bouton **"Scope View"** dans la barre flottante de `QuickCalc.tsx`.
  - Transmission directe de tous les états du formulaire (Vitesse, Poids, Météo, Zéro) via `location.state`.
  - Résolution automatique du réticule : `ScopeViewPage.tsx` extrait le `reticleId` directement de l'optique active du tireur pour afficher instantanément le bon réticule.

---

### [2026-04-27 01:25:00] Infrastructure : Scripts de Synchronisation (Git & VM)
**Fichiers ajoutés (sur la VM) :** 
- `/home/airadmin/ag-git.sh`
- `/home/airadmin/lov-VM.sh`

**Modifications :**
- Déploiement de deux scripts d'automatisation sur la machine virtuelle de production pour harmoniser la collaboration Antigravity ↔ Lovable.
- `ag-git.sh` : Capture et pousse le code généré par Antigravity sur GitHub (création automatique de commit daté).
- `lov-VM.sh` : Récupère le code généré par Lovable via GitHub (`git pull`), installe les paquets (`npm install`), recompile le projet (`npm run build`) et ajuste les permissions (`chmod 755 dist/`) via `sudo` de façon totalement transparente.

### [2026-04-27 03:55:00] Axe 3 : Agents IA (Migration Supabase)
**Fichiers ajoutés :**
- `supabase/migrations/20260427000000_ia3_agents.sql` : Insertion des 4 agents IA (`zero-advisor`, `wind-correction-coach`, `bc-database-search`, `energy-advisor`) dans `ai_agent_configs` avec leurs prompts système et schémas JSON.

### [2026-04-27 20:20:00] Batch Améliorations — Quick Wins (F1, E4, A5, A3)
**Fichiers modifiés :**
- `src/App.tsx` : **F1 — Lazy Loading**. Conversion de tous les imports de pages en `React.lazy()` + enveloppe `<Suspense>` pour le code-splitting. Réduction estimée du bundle initial de ~40%. Un spinner de chargement `PageLoader` est affiché pendant le téléchargement du chunk.
- `package.json` : **E4 — Versioning sémantique**. Passage de `"0.0.0"` à `"1.0.0"`.
- `src/components/Layout.tsx` : **A5 — Navigation mobile complète**. Ajout de 3 pages manquantes au menu mobile "Plus" : Scope View (Eye), Target Analysis (Camera), Competition Prep (Trophy). Import des icônes correspondantes.
- `src/pages/SettingsPage.tsx` : **A3 — Transitions fluides**. Suppression de **tous les `window.location.reload()`** (4 occurrences) pour les changements de thème, unités, mode avancé, météo et BC Truing. Les changements sont désormais appliqués instantanément via le state React sans rechargement brutal de la page.
