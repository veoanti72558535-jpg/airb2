# AIRBALLISTIK — PLAN D'ALIGNEMENT COMPLET DU SYSTEME IA SUR LE MODELE BOUZIDI

---

Gerant (bouzidi ...) = admin (airballistik)

## 1. RESUME EXECUTIF

Ce plan detaille l'alignement progressif du systeme IA d'AirBallistik sur l'architecture Bouzidi Ceramic, en 6 phases independantes et approuvables. L'existant IA-1 (agent `cross-validation-strelok-rows`, edge function `ai-extract-rows`, auth admin, logging) reste integralement preserve. Chaque phase est une tranche BUILD autonome, livrable et testable sur la VM.

---

## 2. SOCLE EXISTANT A PRESERVER

Les elements suivants ne doivent subir aucune regression :


| Element                                                                                       | Fichier(s)                                      | Pourquoi                                          |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------- |
| Agent `cross-validation-strelok-rows`                                                         | Seed SQL + `ai_agent_configs`                   | Seul agent operationnel, utilise en production    |
| Edge function `ai-extract-rows`                                                               | `supabase/functions/ai-extract-rows/index.ts`   | Workflow screenshot Strelok rows-only fonctionnel |
| Providers `callQuatarly()` + `callGoogleDirect()`                                             | `_shared/providers.ts`                          | Appeles directement par `ai-extract-rows`         |
| Auth `requireAdmin()`                                                                         | `_shared/auth.ts`                               | Verification JWT + role admin                     |
| Logging `insertRun()`, `finishRun()`, `logEvent()`                                            | `_shared/logging.ts`                            | Trace d'audit existante                           |
| Settings `readAiSettings()` + `readAgentConfig()`                                             | `_shared/settings.ts`                           | Lecture config en base                            |
| Edge function `ai-providers-test`                                                             | `supabase/functions/ai-providers-test/index.ts` | Ping admin                                        |
| Migration `20260420000000_ia1_init.sql`                                                       | Deploye sur VM                                  | Schema en production                              |
| Tables : `app_settings`, `ai_agent_configs`, `ai_agent_runs`, `ai_usage_events`, `user_roles` | Base PostgreSQL VM                              | Donnees existantes                                |
| Page `/admin/ai`                                                                              | `src/pages/AdminAiPage.tsx`                     | UI admin fonctionnelle                            |
| Voie manuelle / fallback humain                                                               | Cross-validation paste/import                   | L'IA reste optionnelle                            |


**Regle absolue** : `ai-extract-rows` continue d'appeler directement `callQuatarly()` / `callGoogleDirect()`. Elle ne sera PAS migree vers le dispatcher tant que celui-ci n'est pas stable et teste.

---

## 3. CIBLE D'ALIGNEMENT IA

L'architecture cible reproduit le modele Bouzidi avec les adaptations AirBallistik :

```text
Frontend React/TS              Edge Functions (Deno)               Providers
┌──────────────────┐  POST   ┌────────────────────────┐         ┌──────────┐
│ queryAIViaEdge() │ ──────► │ ai-provider-dispatch   │ ──────► │ Quatarly │
│ (aucune cle API) │  JWT    │   requireAdmin()       │         │ Google   │
│                  │         │   readAgentConfig()     │   fb    │ Ollama   │
│ AdminAiPage      │         │   rate limit check      │ ──────► │ (LAN)   │
│  + model picker  │         │   call provider         │         └──────────┘
│  + quota display │         │   fallback if needed    │
└──────────────────┘         │   log run + events      │
                             └────────────────────────┘

ai-extract-rows reste INCHANGE (appels directs providers)
```

---

## 4. ECART ENTRE L'ETAT ACTUEL ET LA CIBLE


| Capacite                             | Etat actuel                                                  | Cible                                                                                               |
| ------------------------------------ | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Dispatcher generique                 | Absent — `ai-extract-rows` appelle directement les providers | `ai-provider-dispatch` generique multi-agents                                                       |
| Rate limiting Google                 | Aucun                                                        | Compteur quotidien configurable dans `app_settings`                                                 |
| Ollama                               | Absent                                                       | Provider LAN optionnel (health check + call)                                                        |
| Choix modele dans l'UI               | Champ texte libre                                            | Dropdown avec liste modeles Quatarly + Google                                                       |
| Quota Google visible                 | Non                                                          | Indicateur utilise/max dans `/admin/ai`                                                             |
| Budget guardrails                    | Absent                                                       | Colonnes `budget_guardrails` + `allowed_job_types` dans `ai_agent_configs`                          |
| Client frontend generique            | Absent — appel Supabase direct dans `CrossValidationPage`    | `queryAIViaEdge()` unifie                                                                           |
| Colonnes tokens/budget               | Absentes dans `ai_usage_events`                              | `estimated_input_tokens`, `estimated_output_tokens`, `blocked_by_budget`, `reason`, `request_count` |
| Helper URL Quatarly                  | Absent                                                       | `normalizeQuatarlyBaseUrl()` + `quatarlyChatUrl()`                                                  |
| Test Ollama dans `ai-providers-test` | Absent                                                       | Section Ollama dans la reponse                                                                      |


---

## 5. DECOUPAGE EN PHASES

### Phase 1 — SQL additive + settings

- Migration additive (colonnes, settings, index)
- Aucune suppression, aucun rename

### Phase 2 — Helpers backend

- `quatarly-url.ts` (normalisation URL)
- `rate-limit.ts` (compteur Google quotidien)
- `callOllama()` dans `providers.ts`

### Phase 3 — Dispatcher generique

- `ai-provider-dispatch/index.ts`
- Route, auth, agent config, provider routing, fallback, rate limit, logging
- `ai-extract-rows` reste inchange

### Phase 4 — Extension `ai-providers-test`

- Ajout test Ollama (health check)
- Ajout compteur quota Google du jour
- Ajout liste modeles Quatarly (optionnel)

### Phase 5 — Client frontend + refonte admin

- `src/lib/ai/edge-client.ts` (queryAIViaEdge)
- Refonte `AdminAiPage` : selecteur provider, modele, quota, Ollama, agents

### Phase 6 — Migration progressive agents

- Nouveaux agents futurs passent par le dispatcher
- Migration optionnelle de `ai-extract-rows` vers le dispatcher (quand stable)

---

## 6. DEPENDANCES ET PREREQUIS


| Prerequis                                    | Phases concernees                           |
| -------------------------------------------- | ------------------------------------------- |
| Supabase self-hosted deploye et fonctionnel  | Toutes                                      |
| Migration `20260420` deja appliquee          | Phase 1                                     |
| `QUATARLY_API_KEY` en secret Edge Functions  | Phases 2-5                                  |
| `GOOGLE_AI_API_KEY` en secret Edge Functions | Phases 2-5                                  |
| Ollama installe sur le LAN de la VM          | Phase 2 (test), Phase 5 (UI) — optionnel    |
| User admin cree dans `user_roles`            | Toutes les phases avec auth                 |
| Phase 1 deployee avant Phase 2               | Oui (rate-limit lit les nouvelles colonnes) |
| Phase 2 deployee avant Phase 3               | Oui (dispatcher utilise les helpers)        |
| Phase 3 deployee avant Phase 4               | Non — independantes                         |
| Phase 3 deployee avant Phase 5               | Oui (client frontend appelle le dispatcher) |


---

## 7. STRATEGIE DE COMPATIBILITE / NON-REGRESSION

1. `**ai-extract-rows` reste intacte** : aucune modification de son code dans les phases 1 a 5. Elle continue d'appeler `callQuatarly()` et `callGoogleDirect()` directement. Les helpers qu'elle utilise (`providers.ts`, `auth.ts`, `logging.ts`, `settings.ts`) ne subissent que des ajouts (nouvelles fonctions exportees), jamais de modifications de signatures existantes.
2. **Migration SQL additive uniquement** : `ALTER TABLE ADD COLUMN IF NOT EXISTS`, `INSERT ON CONFLICT DO NOTHING`. Rejouable sans risque sur la VM.
3. **Dispatcher en parallele** : `ai-provider-dispatch` est une nouvelle edge function, pas un remplacement. Les deux coexistent.
4. **Strategie de migration d'agents** : Phase 6 (optionnelle). On ne migre `ai-extract-rows` vers le dispatcher que si :
  - le dispatcher est stable depuis au moins 2 semaines sur la VM
  - les tests de non-regression passent
  - l'operateur approuve explicitement
5. **Tests de non-regression** :
  - Avant chaque deploiement VM, verifier que `ai-extract-rows` repond toujours (POST avec une image test)
  - Verifier que `ai-providers-test` retourne les memes champs qu'avant + les nouveaux
  - Verifier que `/admin/ai` charge sans erreur console

---

## 8. STRATEGIE GOOGLE FREE TIER / QUOTAS

**Metriques comptees** :

- Nombre de requetes reussies (`success = true`) par jour UTC dans `ai_usage_events` ou `provider = 'google-direct'`

**Settings configurables** (dans `app_settings`) :

- `ai.google_direct_max_requests_per_day` : 20 (defaut)
- `ai.google_direct_max_pdf_jobs_per_day` : 3 (reserve pour usage futur)
- `ai.google_direct_max_pages_per_job` : 5 (reserve)
- `ai.google_direct_max_concurrency` : 1 (reserve)

**Comportement quand quota depasse** :

- Si Google est le provider **primaire** : retour erreur `quota-exceeded` avec message explicite (`{ error: 'google-quota-exceeded', used: 20, max: 20 }`)
- Si Google est en **fallback** : le fallback est saute silencieusement, l'erreur du provider primaire est retournee (pas de blocage silencieux — le log `ai_usage_events` enregistre un event `quota_check_failed`)
- **UX** : l'UI `/admin/ai` affiche le compteur du jour (`12 / 20 requetes utilisees`), pas de surprise

**Distinction primaire vs fallback** :

- Le rate limiter est appele dans les deux cas (primaire ET fallback)
- Le log `event_type` distingue `call` vs `fallback` + un nouveau `quota_check_failed`

**Granularite des logs** :

- Chaque verification de quota est loguee (meme si reussie) via `logEvent` avec `event_type = 'quota_check'`
- Les champs `blocked_by_budget` et `reason` dans `ai_usage_events` enregistrent le motif

---

## 9. STRATEGIE OLLAMA

**Position : introduire Ollama en Phase 2 (helper) mais ne l'exposer dans l'UI qu'en Phase 5.**

Raison : le helper `callOllama()` est simple a ecrire et a tester. L'UI (toggle, URL, modele, test connexion) est plus lourde et merite d'etre groupee avec la refonte admin.

**Limites reseau/LAN** :

- Ollama tourne sur le LAN de la VM (ex: `http://192.168.1.x:11434`)
- L'edge function Deno doit pouvoir atteindre cette IP (pas de NAT/firewall entre containers)
- Timeout court : 10s pour le health check, 60s pour un appel chat
- Si Ollama est down : `{ ok: false, errorCode: 'ollama-unreachable', retryable: false }` — pas de fallback depuis Ollama (contrairement a Quatarly qui peut fallback vers Google)

**Securite** :

- Pas de cle API (LAN seulement)
- L'appel passe quand meme par l'edge function (auth admin requise) — jamais d'appel Ollama direct depuis le frontend

**Settings Ollama** (Phase 1 SQL) :

- `ai.ollama_enabled` : false (defaut)
- `ai.ollama_base_url` : `http://localhost:11434`
- `ai.ollama_default_model` : `qwen3:14b`

---

## 10. EVOLUTION RECOMMANDEE DE /admin/ai

**Phase 5 — sections a ajouter** :


| Section           | Contenu                                                                       | Premiere tranche ? |
| ----------------- | ----------------------------------------------------------------------------- | ------------------ |
| Provider primaire | Dropdown : `quatarly`, `google_direct`, `ollama`                              | Oui                |
| Modele primaire   | Champ texte (ou dropdown si liste `/v1/models` disponible)                    | Oui                |
| Google free tier  | Toggle enabled + toggle fallback + quota du jour (`12 / 20`) + input max/jour | Oui                |
| Ollama            | Toggle enabled + URL base + modele defaut + bouton "Tester connexion"         | Oui                |
| Liste agents      | Tableau lecture seule : slug, provider, modele, enabled, fallback             | Oui                |
| Edition agents    | Modification inline des agents                                                | Non (Phase 6+)     |
| Historique runs   | Tableau des derniers runs avec statut/latence                                 | Non (Phase 6+)     |
| Budget guardrails | Config par agent des limites de budget                                        | Non (Phase 6+)     |


**Ce qui reste inchange en Phase 5** :

- Sign-in Supabase (deja fonctionnel)
- Bouton "Tester providers" (etendu mais pas remplace)
- Bouton "Sauvegarder" (etendu aux nouveaux settings)

---

## 11. STRATEGIE DE TESTS


| Quoi                               | Comment                                                                                                 | Phase |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------- | ----- |
| Migration SQL additive             | Rejouer sur VM de test, verifier `\d ai_usage_events` montre les nouvelles colonnes                     | 1     |
| `normalizeQuatarlyBaseUrl()`       | Test unitaire Deno : URLs variantes → URL normalisee                                                    | 2     |
| `checkGoogleDailyQuota()`          | Test avec mock Supabase : 0/20, 19/20, 20/20                                                            | 2     |
| `callOllama()`                     | Test avec mock fetch : reponse OK, timeout, erreur                                                      | 2     |
| Dispatcher `ai-provider-dispatch`  | Test integration : agent valide, agent disabled, quota depasse, fallback, provider inconnu              | 3     |
| Non-regression `ai-extract-rows`   | Appel reel sur VM avec image test apres deploiement de chaque phase                                     | 1-5   |
| Non-regression `ai-providers-test` | Appel reel sur VM, verifier anciens champs presents + nouveaux                                          | 4     |
| `queryAIViaEdge()`                 | Test unitaire TS avec mock `supabase.functions.invoke`                                                  | 5     |
| Refonte `AdminAiPage`              | Test composant : sections visibles, quota affiche, toggle Ollama                                        | 5     |
| Validation VM complete             | Checklist : `/admin/ai` charge, tester providers OK, quota affiche, Ollama toggle, pas d'erreur console | 5     |


---

## 12. ROADMAP BUILD RECOMMANDEE

### Tranche BUILD-IA2a — SQL additive + settings

**Objectif** : Etendre le schema pour accueillir rate limiting, Ollama, budget guardrails
**Perimetre** : 1 fichier migration SQL
**Ne fait PAS** : modifier le code TypeScript, creer d'edge function, toucher l'UI
**Deploiement VM** : snapshot + migration SQL

### Tranche BUILD-IA2b — Helpers backend

**Objectif** : Creer les briques reutilisables (URL Quatarly, rate limiter, provider Ollama)
**Perimetre** : 3 fichiers dans `supabase/functions/_shared/`
**Ne fait PAS** : creer le dispatcher, modifier `ai-extract-rows`, toucher l'UI
**Deploiement VM** : copie `_shared/` + restart functions

### Tranche BUILD-IA2c — Dispatcher generique

**Objectif** : Creer `ai-provider-dispatch` fonctionnel
**Perimetre** : 1 edge function + config.toml
**Ne fait PAS** : modifier `ai-extract-rows`, modifier l'UI, migrer l'agent existant
**Deploiement VM** : copie function + restart + test manuel

### Tranche BUILD-IA2d — Extension ai-providers-test

**Objectif** : Ajouter test Ollama + quota Google dans la reponse
**Perimetre** : modification de `ai-providers-test/index.ts` + `_shared/settings.ts`
**Ne fait PAS** : toucher au dispatcher, toucher a `ai-extract-rows`
**Deploiement VM** : copie + restart

### Tranche BUILD-IA2e — Client frontend + refonte admin

**Objectif** : UI complete avec selecteur provider/modele, quota, Ollama, agents
**Perimetre** : `edge-client.ts`, `AdminAiPage.tsx`, `translations.ts`
**Ne fait PAS** : modifier le moteur balistique, toucher les sessions, toucher `ai-extract-rows`
**Deploiement VM** : rebuild front + copie dist

### Tranche BUILD-IA2f — Migration progressive (optionnelle)

**Objectif** : Migrer `ai-extract-rows` pour passer par le dispatcher
**Perimetre** : refonte de `ai-extract-rows` pour deleguer a `ai-provider-dispatch`
**Ne fait PAS** : changer le contrat de l'API (memes entrees/sorties)
**Prerequis** : dispatcher stable depuis 2+ semaines, tests de non-regression valides
**Deploiement VM** : snapshot obligatoire + copie + restart + test complet

**Ordre recommande** : IA2a → IA2b → IA2c → IA2d → IA2e → (pause stabilisation) → IA2f

---

## 13. RECOMMANDATION FINALE

**Pour vous** :

1. Approuver ce plan phase par phase
2. Commencer par BUILD-IA2a (SQL seul, risque minimal)
3. Deployer sur la VM apres chaque tranche et valider
4. Ne passer a la tranche suivante qu'apres validation VM
5. Ne jamais fusionner deux tranches — chaque deploiement doit etre reversible par snapshot

**Quand ouvrir une tranche corrective** :

- Si `ai-extract-rows` cesse de fonctionner apres un deploiement
- Si une migration SQL echoue a mi-chemin
- Si le dispatcher retourne des erreurs systematiques en production

**Ce qui peut attendre** :

- Edition inline des agents (Phase 6+)
- Historique des runs dans l'UI (Phase 6+)
- Budget guardrails appliques automatiquement (stockes en base des la Phase 1, mais non enforces avant Phase 6+)

---

## 14. COMPTE RENDU TECHNIQUE

### 1. Resume

Tranche de PLAN uniquement. Aucun code ecrit. Audit complet de l'ecart entre l'architecture IA-1 existante et le modele Bouzidi Ceramic. Production d'une roadmap en 6 phases BUILD independantes.

### 2. Fichiers modifies

Aucun.

### 3. Fichiers crees

Aucun.

### 4. Fichiers supprimes

Aucun.

### 5. Points sensibles

- La migration Phase 1 doit etre strictement additive (`ADD COLUMN IF NOT EXISTS`, `INSERT ON CONFLICT DO NOTHING`)
- `ai-extract-rows` ne doit JAMAIS etre modifiee avant Phase 6
- Le rate limiter Google compte par jour UTC — un operateur en fuseau FR verra le reset a 2h du matin
- Ollama necessite que le conteneur edge functions puisse atteindre l'IP LAN du serveur Ollama

### 6. Ce qui est termine

- Plan complet et phase

### 7. Ce qui reste a faire

- Approuver et executer les tranches BUILD-IA2a a BUILD-IA2f dans l'ordre