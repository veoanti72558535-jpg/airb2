# AIRBALLISTIK — RUNBOOK VALIDATION RUNTIME DU DISPATCHER SUR SUPABASE CLOUD

> Précondition obligatoire avant BUILD-IA2f.
> Tranche PLAN uniquement — aucun code, aucune migration VM.

---

## 1. RÉSUMÉ EXÉCUTIF

Runbook opérateur pour valider en conditions réelles `ai-provider-dispatch` et `ai-providers-test` sur Supabase Cloud. Validation : auth, routing provider, fallback Google, quota, logging, gestion d'erreurs. Décision binaire à l'issue : dispatcher validé ou tranche corrective backend nécessaire.

---

## 2. SOCLE À PRÉSERVER

| Élément | Statut |
|---|---|
| `ai-extract-rows` | Inchangée, non testée, non appelée |
| `cross-validation-strelok-rows` (agent slug) | Lu mais jamais modifié |
| Flux screenshot IA-1 (`strelok-rows.ts`, `AIImportModal`) | Hors périmètre |
| Voie manuelle (paste/JSON) | Hors périmètre |
| `confidence = 'C'`, garde-fous humains | Intacts |
| Moteur balistique | Aucun impact |
| Migration VM / self-hosted | Volontairement reportée |
| Rôle de référence | `admin` (jamais `gerant`) |

---

## 3. PRÉREQUIS SUPABASE CLOUD

- [ ] **Projet Supabase Cloud** créé (plan Free ou Pro)
- [ ] **Migrations appliquées** dans l'ordre :
  1. `20260420000000_ia1_init.sql`
  2. `20260421000000_ia2_dispatch.sql`
- [ ] **Edge Functions déployées** (3) : `ai-extract-rows`, `ai-providers-test`, `ai-provider-dispatch`
- [ ] **Secrets configurés** (Settings > Edge Functions > Secrets) :
  - `QUATARLY_API_KEY` (optionnel si test Google seul)
  - `GOOGLE_AI_API_KEY`
  - Note : `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` injectés auto
- [ ] **User créé** (Authentication > Users > Add User)
- [ ] **Rôle admin attribué** via SQL Editor :
  ```sql
  INSERT INTO public.user_roles (user_id, role) VALUES ('<UUID>', 'admin');
  ```
- [ ] **JWT récupérable** via frontend ou `signInWithPassword()`

---

## 4. ORDRE DE VALIDATION

| Étape | Cible | Objectif |
|---|---|---|
| 1 | Auth admin | JWT + rôle `admin` passent |
| 2 | `ai-providers-test` | Lecture settings + visibilité providers |
| 3 | Dispatch texte-only Quatarly | Premier appel réel |
| 4 | Dispatch texte-only Google | Routing via override |
| 5 | Fallback Google | Échec Quatarly → fallback |
| 6 | Quota Google | Compteur dans `ai_usage_events` |
| 7 | Agent inexistant / disabled | Erreurs propres |
| 8 | Ollama (attendu en échec) | Comportement Cloud attendu |
| 9 | Vérification logs en base | Audit `ai_agent_runs` + `ai_usage_events` |

---

## 5. CAS DE TEST MANUELS

Appels via `curl` vers `https://<PROJECT_REF>.supabase.co/functions/v1/<function>` avec `Authorization: Bearer <JWT_ADMIN>`.

### 5.1 — Auth admin

- POST `ai-providers-test` avec JWT admin → HTTP 200
- Sans Authorization → HTTP 401 `no-auth`
- JWT sans rôle admin → HTTP 403 `not-admin`

### 5.2 — ai-providers-test complet

Vérifier : `quatarly.keyPresent`, `google.keyPresent`, `google.quota.*`, `ollama.enabled = false`, `ollama.reachable = false`, `primaryProvider = "quatarly"`.

### 5.3 — Dispatch texte-only Quatarly

```json
{
  "agent_slug": "cross-validation-strelok-rows",
  "prompt": "Ceci est un test. Réponds { \"test\": true } en JSON."
}
```

Attendu : HTTP 200, `provider: "quatarly"`, `fallback_used: false`, `run_id` non null.

### 5.4 — Dispatch texte-only Google (override)

```json
{
  "agent_slug": "cross-validation-strelok-rows",
  "prompt": "Ceci est un test. Réponds { \"test\": true }.",
  "provider_override": "google-direct",
  "model_override": "gemini-2.5-flash"
}
```

Attendu : HTTP 200, `provider: "google-direct"`.

### 5.5 — Fallback Google

Retirer temporairement `QUATARLY_API_KEY`. Même appel que 5.3. Attendu : HTTP 200, `fallback_used: true`. **Remettre la clé après.**

### 5.6 — Quota Google

```sql
SELECT COUNT(*) FROM ai_usage_events
WHERE provider = 'google-direct' AND success = true
  AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC');
```

Test dépassement (optionnel) : `UPDATE app_settings SET value = '0'::jsonb WHERE key = 'ai.google_direct_max_requests_per_day';` → appel Google → HTTP 429. **Restaurer à `'20'`.**

### 5.7 — Agent inexistant

`"agent_slug": "agent-qui-nexiste-pas"` → HTTP 503 `agent-disabled`.

### 5.8 — Ollama en Cloud

`"provider_override": "ollama"` → HTTP 503 `ollama-disabled`.

### 5.9 — Erreurs body

- Body vide → 400 `invalid-json`
- Sans `agent_slug` → 400 `invalid-body`
- Sans `prompt` → 400 `invalid-body`
- `image_base64` sans `image_mime` → 400

---

## 6. VÉRIFICATIONS EN BASE

### 6.1 — ai_agent_runs

```sql
SELECT id, agent_slug, provider, model, status, latency_ms, error_code, fallback_used, started_at, finished_at
FROM ai_agent_runs ORDER BY started_at DESC LIMIT 20;
```

- [ ] Réussis : `status = 'success'`, `finished_at` non null, `latency_ms > 0`
- [ ] Échoués : `status = 'error'`, `error_code` non null
- [ ] Fallback : `fallback_used = true`
- [ ] `provider`/`model` = effectivement utilisé

### 6.2 — ai_usage_events

```sql
SELECT id, run_id, event_type, provider, model, success, error_code, latency_ms, created_at
FROM ai_usage_events ORDER BY created_at DESC LIMIT 40;
```

- [ ] Events `call` pour chaque appel primaire
- [ ] Events `fallback` pour le test 5.5
- [ ] `run_id` relié au bon run

---

## 7. CRITÈRES D'ACCEPTATION (13/13 requis)

| Critère | OUI/NON |
|---|---|
| Auth admin acceptée avec JWT + rôle valide | |
| Auth refusée sans JWT | |
| Auth refusée sans rôle admin | |
| `ai-providers-test` retourne 3 sections | |
| Appel Quatarly réussi (HTTP 200, `run_id`) | |
| Appel Google réussi (via override) | |
| Fallback Google déclenché | |
| Agent inexistant → HTTP 503 propre | |
| Ollama disabled → HTTP 503 propre | |
| Body invalide → HTTP 400 propre | |
| `ai_agent_runs` correct | |
| `ai_usage_events` correct | |
| Quota Google incrémenté | |

**13/13 = dispatcher validé. Tout échec = tranche corrective avant IA2f.**

---

## 8. INCIDENTS ET DIAGNOSTIC

| Symptôme | Cause | Résolution |
|---|---|---|
| 401 `no-auth` | Header absent | Vérifier `Bearer <token>` |
| 401 `invalid-jwt` | Token expiré / mauvais projet | Régénérer JWT |
| 403 `not-admin` | Rôle manquant | INSERT `user_roles` |
| 500 `settings-read-failed` | Migrations non appliquées | Appliquer migrations |
| 503 `agent-disabled` | `enabled = false` | UPDATE en base |
| Quatarly `no-key` | Secret manquant | Ajouter dans dashboard |
| Fallback ne part pas | `allow_google_fallback = false` | Vérifier settings |
| Logs absents | Crash avant `insertRun` | Consulter logs Edge Functions |

---

## 9. DÉCISION APRÈS VALIDATION

- **13/13** → BUILD-IA2f (premier agent texte-only non critique)
- **Échec** → tranche corrective backend (dispatcher/helpers uniquement)
- **`ai-extract-rows`** → reste inchangée quoi qu'il arrive

---

## 10. RECOMMANDATION

Exécution manuelle (curl + SQL Editor), aucun code nouveau, aucun fichier du repo modifié. Migration VM reportée.