

# AIRBALLISTIK — RUNBOOK VALIDATION RUNTIME DU DISPATCHER SUR SUPABASE CLOUD

---

## 1. RESUME EXECUTIF

Ce document est un runbook operateur pour valider en conditions reelles les Edge Functions `ai-provider-dispatch` et `ai-providers-test` sur un projet Supabase Cloud, avant toute implementation BUILD-IA2f. Aucun code n'est cree, aucune migration VM n'est lancee. La validation porte sur l'auth, le routing provider, le fallback Google, le quota, le logging, et la gestion d'erreurs. A l'issue de cette validation, une decision binaire sera prise : dispatcher valide ou tranche corrective backend necessaire.

---

## 2. SOCLE A PRESERVER PENDANT LA VALIDATION

Les elements suivants ne sont **jamais sollicites** par ce runbook :

| Element | Statut |
|---|---|
| `ai-extract-rows` | Inchangee, non testee, non appelee |
| `cross-validation-strelok-rows` (agent slug en base) | Lu mais jamais modifie |
| Flux screenshot IA-1 (`strelok-rows.ts`, `AIImportModal`) | Hors perimetre |
| Voie manuelle (paste/JSON cross-validation) | Hors perimetre |
| `confidence = 'C'`, garde-fous humains | Intacts |
| Moteur balistique | Aucun impact |
| Migration VM / self-hosted | Volontairement reportee |
| Role de reference | `admin` (jamais `gerant`) |

---

## 3. PREREQUIS SUPABASE CLOUD

Checklist a valider avant tout test :

- [ ] **Projet Supabase Cloud** cree (plan Free ou Pro)
- [ ] **Migrations appliquees** dans l'ordre :
  1. `20260420000000_ia1_init.sql` — cree `user_roles`, `app_settings`, `ai_agent_configs`, `ai_agent_runs`, `ai_usage_events`, `has_role()`, seeds settings + agent `cross-validation-strelok-rows`
  2. `20260421000000_ia2_dispatch.sql` — ajoute settings Ollama/rate-limit, colonnes additives
- [ ] **Edge Functions deployees** (3 fonctions) :
  - `ai-extract-rows`
  - `ai-providers-test`
  - `ai-provider-dispatch`
- [ ] **Secrets configures** dans le dashboard Supabase (Settings > Edge Functions > Secrets) :
  - `QUATARLY_API_KEY` — cle API Quatarly (optionnel si on teste Google seul)
  - `GOOGLE_AI_API_KEY` — cle API Google AI Studio
  - Note : `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` sont automatiquement injectes par Supabase Cloud
- [ ] **User cree** via le dashboard Supabase (Authentication > Users > Add User)
- [ ] **Role admin attribue** manuellement via SQL Editor :
  ```
  INSERT INTO public.user_roles (user_id, role)
  VALUES ('<UUID_DU_USER>', 'admin');
  ```
- [ ] **JWT recuperable** — se connecter via le frontend pointe vers ce projet Cloud, OU utiliser `supabase.auth.signInWithPassword()` et recuperer le `access_token`

---

## 4. ORDRE DE VALIDATION RUNTIME

Sequence recommandee (chaque etape depend de la precedente) :

| Etape | Cible | Objectif |
|---|---|---|
| 1 | Auth admin | Verifier que le JWT + role `admin` passent |
| 2 | `ai-providers-test` | Verifier la lecture des settings et la visibilite des providers |
| 3 | `ai-provider-dispatch` texte-only Quatarly | Premier appel reel via le dispatcher |
| 4 | `ai-provider-dispatch` texte-only Google | Appel direct Google pour verifier le routing |
| 5 | Fallback Google | Provoquer un echec Quatarly et observer le fallback |
| 6 | Quota Google | Verifier le compteur quotidien dans `ai_usage_events` |
| 7 | Agent inexistant / disabled | Verifier les erreurs propres |
| 8 | Ollama (attendu en echec) | Confirmer le comportement attendu en Cloud |
| 9 | Verification logs en base | Audit de `ai_agent_runs` et `ai_usage_events` |

---

## 5. CAS DE TEST MANUELS

Tous les appels se font via `curl` ou un client HTTP (Postman, Insomnia, HTTPie) vers `https://<PROJECT_REF>.supabase.co/functions/v1/<function>` avec le header `Authorization: Bearer <JWT_ADMIN>`.

### 5.1 — Auth admin (prealable)

**Appel** : POST vers `ai-providers-test` avec un JWT valide d'un user ayant le role `admin`.

**Resultat attendu** : HTTP 200 avec le JSON contenant les sections `quatarly`, `google`, `ollama`.

**Test negatif** : meme appel sans header Authorization → HTTP 401, `{ "error": "no-auth" }`.

**Test negatif** : JWT d'un user sans role admin → HTTP 403, `{ "error": "not-admin" }`.

### 5.2 — ai-providers-test complet

**Appel** : POST ou GET vers `ai-providers-test`.

**Observations attendues** :
- `quatarly.keyPresent` = `true` (si secret configure) ou `false`
- `quatarly.models` = liste de modeles (si cle valide et URL joignable) ou `quatarly.modelsError` present
- `google.keyPresent` = `true`
- `google.quota.used` = nombre >= 0
- `google.quota.max` = 20 (defaut)
- `google.quota.allowed` = `true` (si used < max)
- `ollama.enabled` = `false` (defaut Cloud)
- `ollama.reachable` = `false` (normal en Cloud)
- `primaryProvider` = `"quatarly"` (defaut)

### 5.3 — Dispatch texte-only Quatarly

**Appel** : POST vers `ai-provider-dispatch` avec body :
```
{
  "agent_slug": "cross-validation-strelok-rows",
  "prompt": "Ceci est un test de connectivity. Reponds { \"test\": true } en JSON."
}
```

**Resultat attendu** : HTTP 200 avec `provider: "quatarly"`, `model: "claude-sonnet-4"`, `fallback_used: false`, `run_id` non null.

**Note** : on utilise l'agent existant `cross-validation-strelok-rows` car c'est le seul en base. Le dispatcher le chargera et enverra le prompt texte-only (pas d'image). Le system_prompt Strelok sera utilise mais c'est sans importance pour un test de connectivite.

### 5.4 — Dispatch texte-only Google (override)

**Appel** : POST vers `ai-provider-dispatch` avec body :
```
{
  "agent_slug": "cross-validation-strelok-rows",
  "prompt": "Ceci est un test. Reponds { \"test\": true }.",
  "provider_override": "google-direct",
  "model_override": "gemini-2.5-flash"
}
```

**Resultat attendu** : HTTP 200, `provider: "google-direct"`, `model: "gemini-2.5-flash"`.

### 5.5 — Fallback Google

**Prerequis** : secret `QUATARLY_API_KEY` absent ou invalide (temporairement renomme dans le dashboard).

**Appel** : POST vers `ai-provider-dispatch` avec body identique au 5.3 (sans override).

**Resultat attendu** : HTTP 200, `provider: "google-direct"`, `fallback_used: true`. Le dispatcher a echoue sur Quatarly puis bascule sur Google.

**Apres le test** : remettre `QUATARLY_API_KEY` a sa valeur correcte.

### 5.6 — Quota Google

**Verification** : dans le SQL Editor Supabase, executer :
```
SELECT COUNT(*) FROM ai_usage_events
WHERE provider = 'google-direct'
  AND success = true
  AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC');
```

**Resultat attendu** : le compteur correspond au nombre d'appels Google reussis effectues lors des tests 5.4 et 5.5.

**Test de depassement** (optionnel) : modifier temporairement le setting :
```
UPDATE app_settings SET value = '0'::jsonb WHERE key = 'ai.google_direct_max_requests_per_day';
```
Puis appeler le dispatcher avec `provider_override: "google-direct"`. Resultat attendu : HTTP 429 avec `{ "error": "google-quota-exceeded" }`. Remettre la valeur a `'20'::jsonb` apres.

### 5.7 — Agent inexistant

**Appel** : POST vers `ai-provider-dispatch` avec `"agent_slug": "agent-qui-nexiste-pas"`.

**Resultat attendu** : HTTP 503, `{ "error": "agent-disabled" }`.

### 5.8 — Ollama en Cloud

**Appel** : POST vers `ai-provider-dispatch` avec `"provider_override": "ollama"`.

**Resultat attendu** : HTTP 503, `{ "error": "ollama-disabled" }` (car `ai.ollama_enabled` = `false` par defaut).

Si on active temporairement Ollama (`UPDATE app_settings SET value = 'true'::jsonb WHERE key = 'ai.ollama_enabled'`), l'appel retournera HTTP 502 avec une erreur reseau (Ollama n'est pas joignable en Cloud). C'est le comportement attendu. Remettre a `'false'` apres.

### 5.9 — Erreurs de validation body

**Appels** :
- Body vide → HTTP 400, `{ "error": "invalid-json" }`
- Body sans `agent_slug` → HTTP 400, `{ "error": "invalid-body" }`
- Body sans `prompt` → HTTP 400, `{ "error": "invalid-body" }`
- `image_base64` present sans `image_mime` → HTTP 400

---

## 6. VERIFICATIONS EN BASE

Apres avoir execute les tests 5.1 a 5.9, verifier dans le SQL Editor :

### 6.1 — ai_agent_runs

```
SELECT id, agent_slug, provider, model, status, latency_ms, error_code, fallback_used, started_at, finished_at
FROM ai_agent_runs
ORDER BY started_at DESC
LIMIT 20;
```

**Checklist** :
- [ ] Chaque appel reussi a `status = 'success'`, `finished_at` non null, `latency_ms` > 0
- [ ] Chaque appel echoue a `status = 'error'`, `error_code` non null
- [ ] Le test fallback a `fallback_used = true`
- [ ] `provider` et `model` refletent le provider/model effectivement utilise (pas celui demande si fallback)
- [ ] `agent_slug` correspond a chaque appel

### 6.2 — ai_usage_events

```
SELECT id, run_id, event_type, provider, model, success, error_code, latency_ms, created_at
FROM ai_usage_events
ORDER BY created_at DESC
LIMIT 40;
```

**Checklist** :
- [ ] Events de type `call` presents pour chaque appel primaire
- [ ] Events de type `fallback` presents pour le test 5.5
- [ ] `success = true` pour les appels reussis
- [ ] `success = false` avec `error_code` pour les echecs
- [ ] `run_id` relie chaque event au bon run
- [ ] `provider` et `model` corrects sur chaque event

### 6.3 — Quota coherent

```
SELECT COUNT(*) AS google_calls_today
FROM ai_usage_events
WHERE provider = 'google-direct' AND success = true
  AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC');
```

- [ ] Le nombre correspond aux appels Google reussis effectues

---

## 7. CRITERES D'ACCEPTATION

Le dispatcher est **valide** si et seulement si TOUS les criteres suivants sont remplis :

| Critere | Binaire |
|---|---|
| Auth admin acceptee avec JWT + role valide | OUI / NON |
| Auth refusee sans JWT | OUI / NON |
| Auth refusee sans role admin | OUI / NON |
| `ai-providers-test` retourne les 3 sections (quatarly, google, ollama) | OUI / NON |
| Appel texte-only Quatarly reussi (HTTP 200, `run_id` present) | OUI / NON |
| Appel texte-only Google reussi (via override) | OUI / NON |
| Fallback Google declenche quand Quatarly echoue | OUI / NON |
| Agent inexistant retourne HTTP 503 propre | OUI / NON |
| Ollama disabled retourne HTTP 503 propre | OUI / NON |
| Body invalide retourne HTTP 400 propre | OUI / NON |
| `ai_agent_runs` contient les runs avec status/latence/provider corrects | OUI / NON |
| `ai_usage_events` contient les events avec types/provider/success corrects | OUI / NON |
| Quota Google incremente correctement | OUI / NON |

**Seuil** : 13/13 = dispatcher valide. Tout echec = tranche corrective necessaire avant IA2f.

---

## 8. INCIDENTS PROBABLES ET DIAGNOSTIC

| Symptome | Cause probable | Resolution |
|---|---|---|
| HTTP 401 `no-auth` sur tous les appels | Header `Authorization` absent ou mal formate | Verifier le format `Bearer <token>` |
| HTTP 401 `invalid-jwt` | Token expire ou projet Supabase different | Regenerer le JWT, verifier que le frontend pointe vers le bon projet |
| HTTP 403 `not-admin` | Role admin non attribue en base | Executer `INSERT INTO user_roles (user_id, role) VALUES ('<UUID>', 'admin')` |
| HTTP 500 `server-misconfigured` | `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` manquants | Ne devrait pas arriver en Supabase Cloud (injectes automatiquement). Verifier que les fonctions sont bien deployees |
| HTTP 500 `settings-read-failed` | Table `app_settings` absente | Migrations non appliquees. Appliquer `ia1_init.sql` puis `ia2_dispatch.sql` |
| HTTP 503 `agent-disabled` pour un agent existant | `enabled = false` en base | `UPDATE ai_agent_configs SET enabled = true WHERE slug = '...'` |
| Quatarly echoue avec `no-key` | `QUATARLY_API_KEY` non configure | Ajouter le secret dans Settings > Edge Functions > Secrets |
| Quatarly echoue avec `http-401` | Cle API invalide | Verifier la cle dans le dashboard Quatarly |
| Google echoue avec `no-key` | `GOOGLE_AI_API_KEY` non configure | Ajouter le secret |
| Fallback ne se declenche pas | `allow_google_fallback = false` en settings ou `allow_fallback = false` sur l'agent | Verifier `app_settings` cle `ai.allow_google_fallback` et `ai_agent_configs.allow_fallback` |
| Quota retourne `used: -1` | Erreur de lecture `ai_usage_events` | Verifier que la table existe et que les RLS permettent la lecture en service_role |
| Logs absents dans `ai_agent_runs` | Edge Function crashee avant `insertRun` | Consulter les logs Edge Function dans le dashboard Supabase (Logs > Edge Functions) |
| Ollama `ollama-disabled` meme apres activation | Setting `ai.ollama_enabled` encore a `false` | Mettre a jour en base |
| Difference entre dashboard et repo | Migrations non reappliquees apres un changement | Reappliquer la migration manquante |
| `queryAIViaEdge()` echoue cote frontend | Frontend pointe vers un autre projet Supabase, ou CORS | Verifier `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans le build frontend |

---

## 9. DECISION APRES VALIDATION

### Si le dispatcher passe 13/13

La plus petite BUILD sure ensuite est **BUILD-IA2f** :
1. Creer un nouvel agent texte-only non critique (ex: `contextual-help`) dans une migration SQL additive
2. Creer un composant UI minimal appelant `queryAIViaEdge()` avec cet agent
3. Ajouter les traductions FR/EN
4. Ne toucher ni a `ai-extract-rows`, ni au moteur, ni au flux screenshot

### Si le dispatcher echoue sur certains criteres

Une tranche corrective backend est necessaire avant IA2f. Les corrections porteront uniquement sur les Edge Functions `ai-provider-dispatch` et/ou `ai-providers-test`, et/ou sur les helpers `_shared/`. Aucune modification de `ai-extract-rows`.

### Faut-il toucher a `ai-extract-rows` ?

**Non.** Quelle que soit l'issue de cette validation, `ai-extract-rows` reste inchangee. Cette decision est confirmee par le plan IA2f approuve et n'est pas remise en question par ce runbook.

---

## 10. RECOMMANDATION FINALE

Ce runbook est la precondition obligatoire avant BUILD-IA2f. L'execution est entierement manuelle (curl + SQL Editor), ne necessite aucun code nouveau, et ne touche a aucun fichier du repo. La migration VM / self-hosted est volontairement reportee — ce runbook concerne uniquement Supabase Cloud.

---

## COMPTE RENDU TECHNIQUE

### 1. Resume
Tranche PLAN / RUNBOOK uniquement. Aucune implementation.

### 2. Fichiers modifies
Aucun.

### 3. Fichiers crees
Aucun.

### 4. Fichiers supprimes
Aucun.

### 5. Role des changements
Neant.

### 6. Points sensibles
- Le seul agent en base (`cross-validation-strelok-rows`) est utilise comme vehicule de test pour le dispatcher. Son system_prompt Strelok sera envoye mais c'est sans consequence pour un test texte-only — l'IA repondra du JSON generique.
- Le test de fallback 5.5 necessite de retirer temporairement `QUATARLY_API_KEY` — ne pas oublier de le remettre.
- Le test de quota 5.6 necessite de modifier temporairement `app_settings` — ne pas oublier de restaurer.

### 7. Ce qui est termine et ce qui reste
- **Termine** : runbook de validation complet avec 9 etapes, criteres binaires, diagnostic
- **Reste** : executer le runbook sur Supabase Cloud, puis decider si BUILD-IA2f peut demarrer

### 8. Migration / deploiement VM
La migration et le deploiement VM sont **volontairement reportes**. Ce runbook concerne exclusivement Supabase Cloud.

