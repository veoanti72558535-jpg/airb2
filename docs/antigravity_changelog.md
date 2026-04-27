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

### [2026-04-27 21:55:00] Batch Améliorations — Priorités Critiques & Hautes

**Fichiers ajoutés :**
- `public/manifest.json` : **A4 — PWA**. Manifeste d'application web progressive (installable sur mobile).
- `public/sw.js` : Service Worker avec stratégie cache-first pour assets, network-first pour pages. Support offline.
- `public/icons/icon-192.png`, `icon-512.png` : Icônes PWA (réticule vert sur fond carbone).
- `.github/workflows/ci.yml` : **E1 — CI/CD GitHub Actions**. Pipeline type check → tests → build → deploy SSH sur la VM.
- `scripts/backup-supabase.sh` : **E3 — Backup automatique**. pg_dump compressé avec rotation 7 jours, déployable via crontab.
- `src/lib/dope-card-pdf.ts` : **G7 — Dope Card PDF**. Générateur PDF A5 paysage avec thème tactique dark, tableau trajectoire, conditions météo, metadata.
- `src/lib/bc-estimator.ts` : **D1 — BC Estimator inversé**. Méthode de la sécante (Newton-Raphson) itérant sur le moteur balistique pour estimer le BC depuis une chute mesurée.
- `src/components/ai/agents/BcEstimatorButton.tsx` : Composant UI pour le BC Estimator (entrée distance + chute → BC estimé).
- `src/pages/FieldModePage.tsx` : **G1 — Mode Terrain**. Interface plein écran ultra-simplifiée : sélecteur de distance tactile, corrections en clics (affichées en grand), journal de tir avec statistiques (touché/manqué).
- `src/components/OnboardingWizard.tsx` : **A2 — Onboarding**. Assistant 4 étapes au premier lancement (Welcome → Arme → Projectile → Premier Calcul). Progression animée, skip possible.

**Fichiers modifiés :**
- `index.html` : Métadonnées PWA, balises Apple, Service Worker registration, titre/description corrigés ("AirBallistiK" au lieu de "Bouzidi").
- `src/App.tsx` : Ajout route `/field-mode` (lazy-loaded).
- `src/components/Layout.tsx` : Ajout "Mode Terrain" en tête du menu mobile "Plus".
- `src/pages/Dashboard.tsx` : Intégration du OnboardingWizard au premier lancement.
- `src/pages/SessionDetailPage.tsx` : Ajout bouton "Dope Card" pour export PDF A5 professionnel à côté du bouton print existant.

**Notes techniques :**
- B1 (Heun zero-solver) : Déjà implémenté — le zero-solver délègue à `getIntegrator(config?.integrator)`.
- B3 (Multi-BC zones) : Déjà implémenté — `resolveBC()` dans engine.ts + `bcZones` dans le type Projectile.

### [2026-04-27 22:30:00] Batch 3 — Améliorations avancées (⭐⭐⭐⭐ → ⭐)

**Fichiers ajoutés (pages) :**
- `src/pages/RangeSimulatorPage.tsx` : **G3 — Simulateur de portée interactif (⭐⭐⭐⭐)**. Canvas HTML5 avec cible Field Target, kill zones variables par distance, flèche de vent oscillante, tir au clic, calcul d'impact via le moteur balistique, erreur humaine gaussienne, statistiques de précision.
- `src/pages/BallisticChatPage.tsx` : **D5 — Chat balistique interactif (⭐⭐⭐⭐)**. Interface conversationnelle avec historique persistant (localStorage, 100 messages). Comprend les requêtes sur les sessions, armes, projectiles, simulations "Et si..." (MV, vent), favoris. Bulles animées, suggestions de prompts, rendu markdown inline.
- `src/pages/FieldTargetCompPage.tsx` : **G4 — Mode compétition Field Target (⭐⭐⭐)**. Constructeur de parcours : lanes éditables (distance, taille kill zone), calcul automatique des corrections (clics, MRAD/MOA, chute, énergie) par lane, résumé du parcours.
- `src/pages/ShootingDiaryPage.tsx` : **G2 — Carnet de tir numérique (⭐⭐⭐)**. Vue calendrier avec jours d'activité marqués, stats 30/90 jours, liste des sessions récentes, navigation par mois.

**Fichiers ajoutés (composants & lib) :**
- `src/components/DashboardWidgets.tsx` : **A1 — Dashboard enrichi (⭐⭐⭐)**. 7 widgets drag-and-drop (@dnd-kit) : Quick Actions, Dernière Session, Stats bibliothèque, Favoris, Conditions météo, Progression activité, Statut IA. Ordre persisté dans localStorage.
- `src/lib/session-share.ts` : **G5 — Partage de sessions (⭐⭐⭐)**. Encodage Base64 des données de session, URL partageable, import depuis token.
- `src/lib/csv-import.ts` : **C2 — Import CSV/Excel (⭐⭐)**. Parser CSV avec détection automatique du séparateur et du header, mapping de colonnes flexible.
- `src/lib/tts.ts` : **D4 — Text-to-Speech (⭐)**. Module TTS utilisant SpeechSynthesis du navigateur, FR/EN.
- `src/lib/trajectory-cache.ts` : **F3 — Cache moteur balistique (⭐)**. Cache LRU (50 entrées) avec hash djb2 des inputs pour éviter les recalculs redondants.

**Fichiers modifiés :**
- `src/App.tsx` : Ajout de 4 routes lazy-loaded (`/range-simulator`, `/chat`, `/ft-competition`, `/diary`).
- `src/components/Layout.tsx` : Ajout de 4 entrées navigation mobile (Simulateur, Chat, Carnet, FT Competition).
- `src/pages/Dashboard.tsx` : Intégration du système de widgets DnD.
