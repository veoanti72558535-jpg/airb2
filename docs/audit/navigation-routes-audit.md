# Audit Navigation / Routes — AirBallistik

> Date : 2026-04-29 — Refresh post Sprint 1 restructuration UI/UX
> Précédent audit : 2026-04-21 (obsolète)

## Verdict global

**0 route orpheline.** Toutes les pages déclarées dans `src/App.tsx` sont
accessibles depuis l'UI (sidebar, bottom nav, panel "Plus" groupé, ou
liens contextuels).

## Changements depuis l'audit du 2026-04-21

1. `/admin/ai` n'est plus orphelin :
   - exposé en sidebar desktop (icône `Cpu` sous le séparateur)
   - bouton "Configurer IA" dans `SettingsPage` quand Supabase est configuré
2. Le menu "Plus" est désormais accessible **aussi sur desktop** via un bouton
   dédié dans la sidebar (icône `MoreHorizontal`). Auparavant il n'existait
   que sur mobile, ce qui rendait 9 pages inaccessibles aux utilisateurs
   desktop sans connaître l'URL.
3. Le menu "Plus" est désormais **groupé en 4 sections** (Outils terrain,
   Compétition, IA & Docs, Système) au lieu d'une liste plate de 16 entrées.
4. Suppression des doublons sidebar ↔ "Plus" pour `/library`, `/chrono`,
   `/conversions`, `/compare` (la sidebar suffit).
5. `/competition-prep` (ancienne page de 20 lignes contenant uniquement le
   bouton AI advisor) a été **fusionnée** dans `/ft-competition`. La route
   `/competition-prep` redirige désormais vers `/ft-competition` pour
   compatibilité legacy. Page `CompetitionPrepPage.tsx` supprimée.

## Tableau complet (post-restructuration)

| Route | Page | Sidebar | Bottom mobile | Panel "Plus" | Statut |
|---|---|:-:|:-:|:-:|---|
| `/` | Dashboard | ✅ | ✅ | — | OK |
| `/calc` | QuickCalc | ✅ | ✅ | — | OK |
| `/sessions` | SessionsPage | ✅ | ✅ | — | OK |
| `/sessions/:id` | SessionDetailPage | — | — | — | OK (détail) |
| `/library` | LibraryPage | ✅ | — | — | OK |
| `/library/airgun/:id` | AirgunDetailPage | — | — | — | OK (détail) |
| `/library/projectile/:id` | ProjectileDetailPage | — | — | — | OK (détail) |
| `/library/optic/:id` | OpticDetailPage | — | — | — | OK (détail) |
| `/library/reticles` | ReticlesPage | — | — | — | OK (onglet Library) |
| `/library/reticles/:id` | ReticleDetailPage | — | — | — | OK (détail) |
| `/chrono` | ChronoPage | ✅ | — | — | OK |
| `/conversions` | ConversionsPage | ✅ | — | — | OK |
| `/compare` | ComparePage | ✅ | — | — | OK |
| `/field-mode` | FieldModePage | — | — | ✅ Outils terrain | OK |
| `/range-simulator` | RangeSimulatorPage | — | — | ✅ Outils terrain | OK |
| `/scope-view` | ScopeViewPage | — | — | ✅ Outils terrain | OK |
| `/target-analysis` | TargetAnalysisPage | — | — | ✅ Outils terrain | OK |
| `/ft-competition` | FieldTargetCompPage | — | — | ✅ Compétition | OK (+ AI advisor intégré) |
| `/diary` | ShootingDiaryPage | — | — | ✅ Compétition | OK |
| `/chat` | BallisticChatPage | — | — | ✅ IA & Docs | OK |
| `/cross-validation` | CrossValidationPage | — | — | ✅ IA & Docs | OK |
| `/docs` | DocsPage | — | — | ✅ IA & Docs | OK |
| `/search` | SearchPage | — | — | ✅ IA & Docs | OK |
| `/settings` | SettingsPage | (icône thème) | — | ✅ Système | OK |
| `/admin` | AdminPage | — | — | ✅ Système | OK |
| `/admin/ai` | AdminAiPage | ✅ (icône Cpu) | — | — | OK (+ bouton SettingsPage) |
| `/competition-prep` | → redirect /ft-competition | — | — | — | Legacy redirect |
| `/airguns` | LibraryPage (legacy) | — | — | — | Legacy |
| `/projectiles` | LibraryPage (legacy) | — | — | — | Legacy |
| `/optics` | LibraryPage (legacy) | — | — | — | Legacy |

## Restant à faire (sprints suivants)

- **Sprint 2 hub Réglages** : faire de `/settings` un système d'onglets
  absorbant le contenu d'`/admin` (Données, IA, Avancé, etc.).
- **Sprint 3 lisibilité** : sidebar desktop avec labels sous les icônes
  (élargir à `w-20`).
