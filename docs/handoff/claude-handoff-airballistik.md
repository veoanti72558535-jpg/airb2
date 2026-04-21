# AIRBALLISTIK — HANDOFF POUR CLAUDE

> **Date** : 2026-04-21
> **Objectif** : reprise rapide du projet sans scan exhaustif du repo.
> **Lire en premier**, puis consulter `claude-reading-list.md` et `claude-guardrails.md`.

---

## 1. RÉSUMÉ EXÉCUTIF

AirBallistik est un **calculateur balistique pour carabines PCP** (airgun à air comprimé). Application web mobile-first, bilingue FR/EN, thème sombre par défaut.

- **Stack** : React 18 + Vite 5 + TypeScript 5 + Tailwind CSS v3 + shadcn/ui
- **Persistance** : localStorage (pas de backend obligatoire en V1)
- **Backend optionnel** : Supabase (self-hosted cible, Cloud temporaire pour validation)
- **Moteur balistique** : 100 % déterministe, G1 drag model, intégration Euler, corrections atmosphériques — **jamais d'IA dans les calculs**
- **IA** : assistance uniquement (import de screenshots Strelok Pro → extraction de lignes de tir)
- **Tests** : suite Vitest, ~970+ tests verts

---

## 2. GRANDS MODULES FONCTIONNELS

| Module | Route(s) | Description |
|--------|----------|-------------|
| Dashboard | `/` | Vue d'accueil |
| Calculateur rapide | `/calc` | Saisie des paramètres, calcul balistique, table de tir |
| Bibliothèque | `/library` | Armes, projectiles, optiques, réticules |
| Sessions | `/sessions` | Configs de tir sauvegardées (on dit "SESSION", jamais "config") |
| Comparaison | `/compare` | Comparer deux sessions côte à côte |
| Cross-validation | `/cross-validation` | Import de données Strelok Pro (voie manuelle + voie IA) |
| Conversions | `/conversions` | Conversions d'unités balistiques |
| Admin | `/admin` | Diagnostic stockage, nettoyage |
| Admin IA | `/admin/ai` | Config providers IA, runbook validation dispatcher |
| Réglages | `/settings` | Langue, thème, unités |

---

## 3. ÉTAT D'AVANCEMENT GLOBAL

### Produit (V1)
- ✅ Moteur balistique complet (G1, Euler, atmosphère, PBR, zéro-solver)
- ✅ Bibliothèque (armes, projectiles, optiques, réticules)
- ✅ Sessions sauvegardées avec lignage
- ✅ Cross-validation manuelle (paste, JSON)
- ✅ Import/export JSON
- ✅ Comparaison de sessions
- ✅ Conversions d'unités
- ✅ i18n FR/EN complet
- ✅ Thème dark/light
- ⏳ Profil MERO : code présent mais **masqué** (prérequis non remplis — voir `mem://constraints/mero-exposure-gates`)

### IA
- ✅ **IA-1** : flux screenshot Strelok Pro → extraction JSON (Edge Function `ai-extract-rows`, frontend `AIImportModal`)
- ✅ **IA2a–IA2e** : dispatcher générique `ai-provider-dispatch` (multi-provider, fallback Google, quota, logging)
- ✅ **Runbook validation** : checklist opérateur dans `/admin/ai` + doc `ia2f-cloud-validation-runbook.md`
- ⏳ **Validation runtime Cloud** : le dispatcher doit être validé sur Supabase Cloud avant IA2f
- ⏳ **IA2f** : premier nouvel agent via dispatcher — **non commencé**, bloqué par validation runtime
- ❌ Migration VM : volontairement reportée

---

## 4. PLAN IA ACTUEL

### Historique des tranches

| Tranche | Contenu | Statut |
|---------|---------|--------|
| IA-1 | Edge Function `ai-extract-rows`, `ai-providers-test`, migration SQL, frontend AIImportModal, page `/admin/ai` | ✅ Code prêt |
| IA2a | Refactor helpers partagés (`_shared/`) | ✅ Fait |
| IA2b | Rate-limit Google, quota daily | ✅ Fait |
| IA2c | Dispatcher générique `ai-provider-dispatch` | ✅ Fait |
| IA2d | Support Ollama (self-hosted) | ✅ Fait |
| IA2e | Page admin enrichie (agents, quota, Ollama) | ✅ Fait |
| IA2f-plan | Runbook de validation runtime Cloud | ✅ Doc prête |
| IA2f-ui | UI runbook dans `/admin/ai` (checklist, payloads, log viewer) | ✅ Fait |
| **Validation runtime** | Exécuter le runbook sur Supabase Cloud | ⏳ **À faire** |
| **BUILD-IA2f** | Premier agent texte-only via dispatcher | ⏳ Bloqué par validation |

### Décision clé sur IA2f

`ai-extract-rows` **ne sera PAS migrée** vers le dispatcher. Elle reste en l'état. IA2f vise uniquement la création de **nouveaux** agents via `ai-provider-dispatch`.

---

## 5. DÉCISIONS DÉJÀ PRISES (À RESPECTER)

1. `ai-extract-rows` ne doit **jamais** être modifiée ni migrée
2. `cross-validation-strelok-rows` reste sur son flux dédié (`ai-extract-rows`)
3. IA2f = nouveaux agents uniquement, via `ai-provider-dispatch`
4. Validation runtime Cloud **obligatoire** avant tout BUILD-IA2f
5. Migration VM / self-hosted : **reportée**
6. Le rôle de référence est `admin` (jamais `gerant`)
7. Le moteur balistique est **hors scope IA** — 100 % déterministe
8. Données inférées par IA toujours marquées `confidence = 'C'`
9. Profil MERO reste masqué tant que les prérequis ne sont pas remplis
10. localStorage pour la persistance en V1 — pas de backend obligatoire

---

## 6. ARCHITECTURE BACKEND (SUPABASE)

### Migrations SQL (ordre obligatoire)
1. `20260420000000_ia1_init.sql` — tables `user_roles`, `app_settings`, `ai_agent_configs`, `ai_agent_runs`, `ai_usage_events`, fonction `has_role()`, RLS, seed agent
2. `20260421000000_ia2_dispatch.sql` — settings Ollama, rate-limit, colonnes additives

### Edge Functions (3)
- `ai-extract-rows` — extraction screenshot Strelok → JSON (IA-1, **ne pas toucher**)
- `ai-providers-test` — diagnostic providers pour `/admin/ai` (**ne pas toucher**)
- `ai-provider-dispatch` — dispatcher générique multi-agents (**ne pas toucher sauf IA2f explicite**)

### Helpers partagés (`_shared/`)
- `auth.ts` — vérification JWT + rôle admin
- `providers.ts` — appels Quatarly, Google, Ollama
- `settings.ts` — lecture `app_settings` + `ai_agent_configs`
- `logging.ts` — insertRun, finishRun, logEvent dans `ai_agent_runs` / `ai_usage_events`
- `rate-limit.ts` — quota daily Google
- `quatarly-url.ts` — construction URL API Quatarly
- `cors.ts` — headers CORS + jsonResponse

---

## 7. RISQUES PRINCIPAUX

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Dispatcher non validé en runtime | Bloque IA2f | Exécuter le runbook Cloud |
| Régression `ai-extract-rows` | Casse le seul flux IA fonctionnel | Ne jamais modifier ce fichier |
| Migration VM prématurée | Complexité sans bénéfice immédiat | Reportée explicitement |
| Exposition MERO prématurée | Sessions corrompues | Gates strictes en place |

---

## 8. PROCHAINES ÉTAPES RECOMMANDÉES

1. **Exécuter le runbook de validation runtime** sur Supabase Cloud (13 critères, doc `ia2f-cloud-validation-runbook.md`)
2. Si 13/13 → lancer **BUILD-IA2f** (nouvel agent texte-only non critique)
3. Si échecs → tranche corrective backend (dispatcher/helpers uniquement)
4. Migration VM : à planifier **après** IA2f validé

---

## 9. INSTRUCTIONS POUR CLAUDE

- **Ne pas scanner tout le repo.** Lire ce handoff d'abord, puis la reading list.
- **Ne pas proposer de big bang.** Petites tranches incrémentales uniquement.
- **Ne pas toucher à `ai-extract-rows`.** Sous aucun prétexte.
- **Demander avant d'élargir le scope.** Chaque tranche a un périmètre strict.
- **Consulter `claude-guardrails.md`** pour les interdictions explicites.
- **Consulter `claude-reading-list.md`** pour les fichiers à lire en priorité.