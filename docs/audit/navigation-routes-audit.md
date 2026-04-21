# Audit Navigation / Routes — AirBallistik

> Date : 2026-04-21 — Tranche PLAN (aucun changement code)

## Tableau complet

| Route | Page | Dans la navigation ? | Condition d'accès | Statut | Recommandation |
|---|---|---|---|---|---|
| `/` | Dashboard | Oui (mainNav) | Aucune | ✅ OK | — |
| `/calc` | QuickCalc | Oui (mainNav) | Aucune | ✅ OK | — |
| `/library` | LibraryPage | Oui (mainNav) | Aucune | ✅ OK | — |
| `/library/airgun/:id` | AirgunDetailPage | Non (lien contextuel) | Aucune | ✅ Intentionnel | Détail via liste |
| `/library/projectile/:id` | ProjectileDetailPage | Non (lien contextuel) | Aucune | ✅ Intentionnel | Détail via liste |
| `/library/optic/:id` | OpticDetailPage | Non (lien contextuel) | Aucune | ✅ Intentionnel | Détail via liste |
| `/library/reticles` | ReticlesPage | Non (onglet LibraryPage) | Aucune | ✅ Intentionnel | Route directe aussi |
| `/library/reticles/:id` | ReticleDetailPage | Non (lien contextuel) | Aucune | ✅ Intentionnel | Détail via liste |
| `/sessions` | SessionsPage | Oui (mainNav) | Aucune | ✅ OK | — |
| `/compare` | ComparePage | **Non** | Aucune | ⚠️ Caché intentionnellement | Navigation programmatique (bouton Comparer) |
| `/conversions` | ConversionsPage | Oui (moreNav) | Aucune | ✅ OK | — |
| `/docs` | DocsPage | Oui (moreNav) | Aucune | ✅ OK | — |
| `/search` | SearchPage | Oui (moreNav) | Aucune | ✅ OK | — |
| `/cross-validation` | CrossValidationPage | Oui (moreNav) | Aucune | ✅ OK | Bouton IA conditionnel (Supabase) |
| `/settings` | SettingsPage | Oui (moreNav) | Aucune | ✅ OK | — |
| `/admin` | AdminPage | Oui (moreNav) | Aucune | ✅ OK | — |
| `/admin/ai` | AdminAiPage | **Non** | Supabase configuré | ❌ Probable oubli | Aucun lien ne pointe vers cette page |
| `/airguns` | LibraryPage (legacy) | Non | Aucune | ✅ Intentionnel | Redirect legacy |
| `/projectiles` | LibraryPage (legacy) | Non | Aucune | ✅ Intentionnel | Redirect legacy |
| `/optics` | LibraryPage (legacy) | Non | Aucune | ✅ Intentionnel | Redirect legacy |

## Cas confirmés

### `/admin/ai` — Probable oubli

- Route déclarée dans `App.tsx` ligne 55
- Page existante : `src/pages/AdminAiPage.tsx`
- Aucun lien dans `Layout.tsx` ni dans `AdminPage.tsx`
- Accessible uniquement par URL directe
- **Action requise** : ajouter un lien conditionnel dans AdminPage (tranche BUILD future)

### `/compare` — Caché intentionnellement

- Navigation programmatique avec paramètres URL (`?a=...&b=...`)
- Accessible via bouton "Comparer" dans SessionsPage et QuickCalc
- Pas de lien menu nécessaire

## Recommandations (tranches futures)

1. Ajouter un lien `/admin/ai` dans AdminPage, conditionnel à `isSupabaseConfigured()`
2. Aucune action pour `/compare`
3. Optionnel : indicateur visuel Supabase sur la page Admin