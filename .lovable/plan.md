
# Audit complet des routes — accessibilité depuis l'UI

J'ai croisé les **30 routes déclarées** dans `src/App.tsx` avec **toute la navigation effective** (sidebar desktop, bottom nav mobile, menu "Plus", liens contextuels Dashboard / AdminPage / DashboardWidgets, navigation programmatique).

## Tableau de couverture

| Route | Page | Sidebar desktop | Bottom mobile | Menu "Plus" | Lien contextuel | Statut |
|---|---|:-:|:-:|:-:|:-:|---|
| `/` | Dashboard | ✅ | ✅ | — | — | OK |
| `/calc` | QuickCalc | ✅ | ✅ | — | Dashboard | OK |
| `/sessions` | SessionsPage | ✅ | ✅ | — | Dashboard | OK |
| `/sessions/:id` | SessionDetailPage | — | — | — | depuis liste | OK (détail) |
| `/library` | LibraryPage | ✅ | — | ✅ | — | OK (doublon) |
| `/library/airgun/:id` | AirgunDetailPage | — | — | — | depuis liste | OK (détail) |
| `/library/projectile/:id` | ProjectileDetailPage | — | — | — | depuis liste | OK (détail) |
| `/library/optic/:id` | OpticDetailPage | — | — | — | depuis liste | OK (détail) |
| `/library/reticles` | ReticlesPage | — | — | — | onglet Library | OK |
| `/library/reticles/:id` | ReticleDetailPage | — | — | — | depuis liste | OK (détail) |
| `/chrono` | ChronoPage | ✅ | — | ✅ | Dashboard | OK (doublon) |
| `/conversions` | ConversionsPage | ✅ | — | ✅ | — | OK (doublon) |
| `/compare` | ComparePage | ✅ | — | ✅ | bouton sessions | OK (doublon) |
| `/field-mode` | FieldModePage | — | — | ✅ | — | OK |
| `/range-simulator` | RangeSimulatorPage | — | — | ✅ | — | OK |
| `/chat` | BallisticChatPage | — | — | ✅ | — | OK |
| `/diary` | ShootingDiaryPage | — | — | ✅ | — | OK |
| `/ft-competition` | FieldTargetCompPage | — | — | ✅ | — | OK |
| `/scope-view` | ScopeViewPage | — | — | ✅ | — | OK ✓ (vous pensiez orpheline — elle est dans "Plus") |
| `/target-analysis` | TargetAnalysisPage | — | — | ✅ | — | OK |
| `/competition-prep` | CompetitionPrepPage | — | — | ✅ | — | OK ⚠ doublon fonctionnel avec `/ft-competition` |
| `/cross-validation` | CrossValidationPage | — | — | ✅ | — | OK |
| `/docs` | DocsPage | — | — | ✅ | — | OK |
| `/search` | SearchPage | — | — | ✅ | — | OK |
| `/settings` | SettingsPage | — | — | ✅ | icône thème sidebar | OK |
| `/admin` | AdminPage | — | — | ✅ | — | OK |
| `/admin/ai` | AdminAiPage | ✅ (icône Cpu) | — | — | bouton SettingsPage | OK |
| `/airguns` | LibraryPage (legacy) | — | — | — | — | Redirect legacy OK |
| `/projectiles` | LibraryPage (legacy) | — | — | — | — | Redirect legacy OK |
| `/optics` | LibraryPage (legacy) | — | — | — | — | Redirect legacy OK |

## Verdict : 0 route orpheline

**Aucune page n'est inaccessible.** L'audit confirme que `/scope-view` est bien dans le menu "Plus" (ligne 41 de `Layout.tsx`, label `nav.scopeView`, icône `Eye`). De même `/admin/ai` est exposé via `adminNav` (icône Cpu sous le séparateur de la sidebar desktop) ET via le bouton "Configurer IA" dans `SettingsPage`. L'audit `docs/audit/navigation-routes-audit.md` (daté du 2026-04-21) est **obsolète** — il listait `/admin/ai` comme orphelin alors que les liens ont été ajoutés depuis.

## Vrais problèmes détectés

### 1. Découvrabilité catastrophique — menu "Plus" surchargé
`moreNav` contient **16 entrées** affichées en liste verticale plate. Sans regroupement, l'utilisateur scrolle et ne trouve rien. Pages cachées en pratique : `/scope-view`, `/field-mode`, `/range-simulator`, `/diary`, `/ft-competition`, `/target-analysis`, `/competition-prep`, `/cross-validation`, `/chat`.

### 2. Doublons sidebar ↔ "Plus"
`/library`, `/chrono`, `/conversions`, `/compare` apparaissent **deux fois** (sidebar desktop + menu "Plus"). Sur mobile c'est OK (pas de sidebar) ; sur desktop ça brouille.

### 3. Doublon fonctionnel
`/competition-prep` (CompetitionPrepPage) et `/ft-competition` (FieldTargetCompPage) couvrent le même besoin "préparation compétition Field Target". L'un des deux est probablement une ancienne version oubliée.

### 4. Aucun accès desktop au menu "Plus"
Sur mobile, le bouton "Plus" ouvre un bottom sheet avec les 16 pages secondaires. **Sur desktop, ce bouton n'existe pas** — donc 9 pages secondaires (`/scope-view`, `/field-mode`, `/range-simulator`, `/diary`, `/chat`, `/ft-competition`, `/target-analysis`, `/competition-prep`, `/cross-validation`, `/docs`, `/search`) ne sont accessibles que par URL directe pour un utilisateur desktop. **C'est le vrai problème "scope-view"** que vous avez ressenti.

### 5. Redondance Settings ↔ Admin
Les deux pages contiennent des réglages utilisateur (le contenu de `AdminPage` est en réalité 100% paramètres système). Cf. plan UX précédent en discussion.

### 6. Sidebar desktop sans label
Les icônes sont nues (tooltip au hover seulement). Cumulé avec `/admin/ai` représenté par une icône `Cpu` opaque, c'est peu lisible.

## Plan d'action proposé (tranche BUILD)

**Sprint 1 — Découvrabilité desktop (prioritaire)**
1. Ajouter dans la sidebar desktop un bouton **"Plus"** (icône `MoreHorizontal`) qui ouvre un panel latéral réutilisant `moreNav` regroupé par sections :
   - **Outils terrain** : Field Mode, Range Sim, Scope View, Cible photo
   - **Compétition** : Field Target, Préparation
   - **Données & analyse** : Comparer, Conversions, Chrono, Cross-validation
   - **IA & docs** : Chat IA, Recherche, Docs
   - **Système** : Réglages, Admin
2. Retirer de `moreNav` les 4 entrées doublons (`/library`, `/chrono`, `/conversions`, `/compare`) — la sidebar suffit.
3. Mettre à jour `docs/audit/navigation-routes-audit.md` (dater 2026-04-29, marquer `/admin/ai` comme résolu).

**Sprint 2 — Désambiguïsation**
4. Fusionner `/competition-prep` et `/ft-competition` : choisir la page la plus complète, supprimer l'autre, conserver une redirection legacy.
5. Aligner avec le plan "Hub Réglages" précédent : faire de `/settings` un système d'onglets absorbant le contenu d'`/admin`.

**Sprint 3 — Lisibilité**
6. Sidebar desktop : élargir à `w-20` et afficher le label sous l'icône (comme la barre mobile).

## Fichiers impactés (résumé technique)

- `src/components/Layout.tsx` : ajouter bouton "Plus" desktop + composant `MorePanel` regroupé, nettoyer doublons.
- `src/App.tsx` : ajouter redirect `/competition-prep → /ft-competition` (ou inverse).
- `src/lib/translations.ts` : clés FR/EN pour les 5 sous-sections.
- `docs/audit/navigation-routes-audit.md` : refresh complet.
- Page supprimée : `CompetitionPrepPage.tsx` ou `FieldTargetCompPage.tsx` (à confirmer après revue rapide des deux).

## Question à confirmer

Quelle page garder entre `/competition-prep` et `/ft-competition` ? Je peux comparer le contenu des deux fichiers et vous proposer le choix le plus riche, ou vous tranchez directement.

Validez ce plan (et la question ci-dessus) — je passe en BUILD pour le Sprint 1 minimum (qui résout votre frustration "scope-view introuvable").
