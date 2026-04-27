# AirBallistik — Système IA : référence technique complète

> Document destiné à être lu par une **autre IA** (Claude, GPT, Gemini…) pour
> comprendre l'architecture, les contrats, les garde-fous et les invariants
> non négociables du système IA d'AirBallistik **sans avoir à explorer le
> repo**.
> Sources lues : `supabase/functions/{ai-extract-rows,ai-provider-dispatch,_shared/*}`,
> `src/lib/ai/*`, `src/components/ai/**`, `supabase/migrations/2026042*`,
> `docs/ai/*`, `docs/handoff/claude-guardrails.md`.

---

## 0. TL;DR en 10 lignes

1. AirBallistik est une calculette balistique PCP **mobile-first FR/EN**.
2. Le **moteur balistique est 100 % déterministe** — l'IA n'y touche **jamais**.
3. Backend : **Supabase self-hosted (cible) / Supabase Cloud (temporaire)**.
   ❌ Pas de Lovable Cloud, ❌ pas de Lovable AI Gateway.
4. Deux Edge Functions IA : `ai-extract-rows` (figée, IA-1) et
   `ai-provider-dispatch` (générique, IA-2+).
5. Providers supportés : **Quatarly** (primaire, OpenAI-compatible),
   **Google Direct** (fallback, free tier rate-limité), **Ollama** (LAN,
   opt-in derrière flag).
6. Toute requête IA exige **JWT valide + rôle `admin`** côté Edge Function.
7. Configuration agents 100 % en base (`ai_agent_configs`) — jamais en dur
   côté client. Le client envoie un `agent_slug` + un `prompt`.
8. Toute sortie IA est marquée **`confidence = 'C'`** (revue humaine
   obligatoire avant persistance).
9. Cache lecture-écriture par `(user, agent, hash(prompt))` dans
   `ai_responses_cache` — silencieux en cas d'échec.
10. Audit complet dans `ai_agent_runs` + `ai_usage_events`, lisible
    uniquement par les admins.

---

## 1. Garde-fous non négociables (à respecter par toute IA qui modifie le repo)

Source : `docs/handoff/claude-guardrails.md`.

### Interdictions absolues
- ❌ Ne **jamais** modifier `ai-extract-rows` (figée IA-1).
- ❌ Ne **jamais** modifier `ai-providers-test` (sauf demande explicite).
- ❌ Ne **jamais** modifier `ai-provider-dispatch` sauf BUILD-IA2f explicite.
- ❌ Ne **pas migrer** `cross-validation-strelok-rows` vers le dispatcher.
- ❌ Ne **pas créer** de nouvelle Edge Function sans demande explicite.
- ❌ Ne **pas modifier** le moteur balistique (`src/lib/ballistics.ts` & co).
- ❌ Ne **pas introduire d'IA** dans les calculs balistiques.
- ❌ Ne **pas utiliser Lovable Cloud** ni Lovable AI Gateway.
- ❌ Ne **pas exposer** le profil MERO (prérequis non remplis).
- ❌ Ne **pas inventer** de précision scientifique ("fake data").
- ❌ Ne **pas supprimer** silencieusement de feature existante.

### Obligations
- ✅ Petites tranches incrémentales, scope strict.
- ✅ Données IA marquées `confidence = 'C'`.
- ✅ Traductions FR/EN pour tout nouveau texte UI.
- ✅ Préserver la voie manuelle (paste/JSON) à 100 %.
- ✅ Vérifier que `ai-extract-rows` n'est jamais affectée.

---

## 2. Architecture haut niveau

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React/Vite)                        │
│                                                                      │
│  Pages          Composants IA "consommateurs"                        │
│  ─────          ──────────────────────────────                       │
│  CalcPage  ───▶ ShotLineExplainer, DeviationExplainer                │
│  Sessions  ───▶ SessionSummarizer, SessionReportButton,              │
│                 TargetPhotoAnalyzer, TrainingLogSummarizer           │
│  Library   ───▶ AirgunReview, ProjectileSearch, BcSearch,            │
│                 OpticSelectorAdvisor, TuneAdvice, CaliberAdvisor,    │
│                 EnergyAdvisor, PbrExplainer, ZeroAdvisor, …          │
│  CrossVal  ───▶ AIImportModal (Strelok screenshot OCR)               │
│  /admin/ai ───▶ AdminAiPage : settings, agents, logs, quotas         │
│                                                                      │
│        Tous passent par 1 des 3 entrypoints :                        │
│        • queryAIViaEdge()        (src/lib/ai/edge-client.ts)         │
│        • queryAIWithCache()      (src/lib/ai/agent-cache.ts)         │
│        • supabase.functions.invoke('ai-extract-rows')                │
└──────────────────────────┬───────────────────────────────────────────┘
                           │ HTTPS + JWT (rôle admin requis)
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  SUPABASE (self-hosted / Cloud temp)                 │
│                                                                      │
│  Edge Functions (Deno)                                               │
│  ─────────────────────                                               │
│  • ai-provider-dispatch  ← générique multi-agents (IA-2+)            │
│  • ai-extract-rows       ← FIGÉE — Strelok Pro OCR (IA-1)            │
│  • ai-providers-test     ← ping admin (figée)                        │
│                                                                      │
│  Modules partagés (_shared/)                                         │
│  ─────────────────────────────                                       │
│  auth.ts        → requireAdmin(req) : JWT + has_role('admin')        │
│  cors.ts        → corsHeaders + jsonResponse()                       │
│  settings.ts    → readAiSettings() + readAgentConfig(slug)           │
│  providers.ts   → callQuatarly() / callGoogleDirect() / callOllama() │
│  rate-limit.ts  → checkGoogleDailyQuota() (compte sur usage_events)  │
│  logging.ts     → insertRun / finishRun / logEvent / sha256Hex       │
│  quatarly-url.ts→ normalisation URL Quatarly                         │
│                                                                      │
│  Tables PostgreSQL (RLS strict)                                      │
│  ───────────────────────────────                                     │
│  user_roles            (user_id, role enum app_role)                 │
│  app_settings          (key text PK, value jsonb)                    │
│  ai_agent_configs      (slug PK, provider, model, prompt, schema…)   │
│  ai_agent_runs         (id, agent_slug, status, latency, fallback…)  │
│  ai_usage_events       (id, run_id, event_type, provider, success…)  │
│  ai_responses_cache    ((user_id, agent_slug, input_hash) → text)    │
│                                                                      │
│  Functions SQL                                                       │
│  ─────────────                                                       │
│  has_role(_user_id uuid, _role app_role) → boolean (SECURITY DEFINER)│
│  touch_updated_at()  trigger                                         │
└──────────────────────────┬───────────────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          PROVIDERS EXTERNES                          │
│                                                                      │
│  Quatarly         api.quatarly.ai/v1/chat/completions  (OpenAI-comp.)│
│  Google Direct    generativelanguage.googleapis.com    (free tier)   │
│  Ollama (LAN)     http://<host>:11434                  (opt-in)      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Contrats d'API des Edge Functions

### 3.1 `ai-provider-dispatch` (générique, IA-2c)

**Fichier** : `supabase/functions/ai-provider-dispatch/index.ts`

**Méthode** : `POST` — `OPTIONS` géré pour CORS.

**Auth** : `Authorization: Bearer <jwt>` ; rôle `admin` requis (via
`requireAdmin()` → `has_role(auth.uid(), 'admin')`).

**Request body** :
```ts
interface DispatchRequest {
  agent_slug: string;          // REQUIRED, doit exister dans ai_agent_configs
  prompt: string;              // REQUIRED, non vide
  system_prompt?: string;      // override optionnel du prompt système agent
  output_schema?: unknown;     // override optionnel du JSON Schema agent
  image_base64?: string;       // OCR / vision (base64 sans data:URI)
  image_mime?: string;         // requis si image_base64 présent
  max_tokens?: number;
  temperature?: number;
  provider_override?: string;  // 'quatarly' | 'google-direct' | 'ollama'
  model_override?: string;
}
```

**Response 200** :
```ts
{
  text: unknown,         // objet JSON parsé (le modèle est forcé en JSON)
  provider: string,      // provider RÉELLEMENT utilisé (peut différer si fallback)
  model: string,
  fallback_used: boolean,
  latency_ms: number,
  run_id: string         // UUID inséré dans ai_agent_runs
}
```

**Erreurs typées** (HTTP) :
- `400 invalid-body` / `400 invalid-json` / `400 unknown-provider`
- `401 no-auth` / `401 invalid-jwt`
- `403 not-admin`
- `429 google-quota-exceeded` (avec `used`, `max`)
- `500 server-misconfigured` / `500 settings-read-failed`
- `502 provider-failed` (avec `error_code`, `message`, `latency_ms`)
- `503 agent-disabled` / `503 ollama-disabled`

**Pipeline interne (11 étapes, dans cet ordre)** :

1. CORS preflight + méthode = POST.
2. `requireAdmin(req)` → `{ user, service }`.
3. Validation body (`validateRequest()`).
4. `readAiSettings(service)` + `readAgentConfig(service, agent_slug)`.
5. Si agent absent ou `enabled=false` → `503 agent-disabled`.
6. Résolution **provider/model** : `override > agent.config > settings.global`.
7. Si `provider='ollama'` mais `settings.ollamaEnabled=false` → `503`.
8. `insertRun()` → `runId` inséré dans `ai_agent_runs` (status=`running`).
9. Si provider primaire = `google-direct` → `checkGoogleDailyQuota()` ; si KO → `429`.
10. **Appel primaire** via `callProvider(provider, ...)` + `logEvent('call', …)`.
11. **Fallback** vers Google si :
    - `!primary.ok && primary.retryable`
    - `provider !== 'google-direct' && provider !== 'ollama'`
    - `agent.allow_fallback === true`
    - `settings.allowGoogleFallback === true`
    - `settings.googleDirectEnabled === true`
    - quota Google encore disponible
    → re-appel + `logEvent('fallback', …)`.
12. `finishRun()` (status=`success` ou `error`) puis réponse.

### 3.2 `ai-extract-rows` (FIGÉE, IA-1)

**Fichier** : `supabase/functions/ai-extract-rows/index.ts` (~280 LOC).
**À NE JAMAIS MODIFIER.**

**Périmètre strict** :
- Source : screenshot **Strelok Pro** uniquement.
- Une seule image par appel, MIME ∈ {png, jpeg, webp}, ≤ 4 Mo.
- Extrait UNIQUEMENT les **rows** (range, drop, velocity, windDrift, tof, energy).
- **Aucun input balistique** (MV, BC, zéro, atmosphère) — interdit par prompt.
- Validation Zod côté serveur, brouillon obligatoirement relu côté UI.
- Hard-codé sur l'agent `cross-validation-strelok-rows`.
- Fallback Quatarly → Google Direct (mêmes critères que dispatcher).

### 3.3 `ai-providers-test` (FIGÉE)

Ping admin pour vérifier que les clés Quatarly/Google sont présentes.
Ne renvoie jamais les clés, seulement `keyPresent: boolean`.

---

## 4. Schéma de base de données IA

### 4.1 Migrations

| Fichier                                         | Contenu |
|------------------------------------------------|---------|
| `20260420000000_ia1_init.sql`                  | Socle : `app_role` enum, `user_roles`, `has_role()`, `app_settings`, `ai_agent_configs`, `ai_agent_runs`, `ai_usage_events`, RLS, seeds (settings + agent Strelok). |
| `20260421000000_ia2_dispatch.sql`              | **Additif** : settings rate-limit Google + Ollama, colonnes `budget_guardrails` / `allowed_job_types` sur agents, colonnes tokens/budget sur events. |
| `20260426195537_app_settings_admin_only_read.sql` | Restreint la lecture de `app_settings` aux admins (clés API non révélées aux users non-admin). |

### 4.2 Tables

**`user_roles`** — rôles SÉPARÉS du profil pour empêcher l'escalade côté client.
```
id uuid PK, user_id uuid FK auth.users, role app_role, created_at
UNIQUE(user_id, role)
RLS : SELECT self+admin, INSERT/DELETE admin only
```

**`app_settings`** — clé/valeur jsonb versionnée.
```
key text PK, value jsonb, updated_at, updated_by
RLS : SELECT admin (depuis 26/04/2026), ALL admin
```
Clés IA seedées :
- `ai.provider_primary` = `"quatarly"`
- `ai.provider_model_primary` = `"claude-sonnet-4"`
- `ai.quatarly_api_url` = `"https://api.quatarly.ai/v1/chat/completions"`
- `ai.allow_google_fallback` = `true`
- `ai.google_direct_enabled` = `true`
- `ai.google_direct_model` = `"gemini-2.5-flash"`
- `ai.preferred_language` = `"fr"`
- `ai.max_image_bytes` = `4194304`
- `ai.google_direct_max_requests_per_day` = `20`
- `ai.google_direct_max_pdf_jobs_per_day` = `3`
- `ai.google_direct_max_pages_per_job` = `5`
- `ai.google_direct_max_concurrency` = `1`
- `ai.ollama_enabled` = `false`
- `ai.ollama_base_url` = `"http://localhost:11434"`
- `ai.ollama_default_model` = `"qwen3:14b"`

**`ai_agent_configs`** — catalogue d'agents.
```
slug text PK              ex: 'shot-line-explainer', 'cross-validation-strelok-rows'
display_name text
description text
provider text             'quatarly' | 'google-direct' | 'ollama'
model text                ex: 'claude-sonnet-4', 'gemini-2.5-flash'
allow_fallback boolean
system_prompt text        prompt système complet
output_schema jsonb       JSON Schema strict
prompt_version int
enabled boolean
budget_guardrails jsonb   (IA-2a) ex: { max_tokens, max_cost_usd }
allowed_job_types jsonb   (IA-2a) array
created_at, updated_at (trigger touch_updated_at)
RLS : ALL admin
```

**`ai_agent_runs`** — un run = une invocation de dispatcher.
```
id uuid PK, agent_slug, provider, model, status, started_at, finished_at,
latency_ms, error_code, fallback_used, output_jsonb, user_id, source_hash
RLS : SELECT admin (INSERT/UPDATE service-role only)
```

**`ai_usage_events`** — événements unitaires (call, fallback, …).
```
id, run_id FK, event_type, provider, model, success, error_code, latency_ms,
estimated_input_tokens, estimated_output_tokens, blocked_by_budget,
reason, request_count, created_at
RLS : SELECT admin
INDEX : (provider, created_at DESC)  ← pour rate limiter Google
```

**`ai_responses_cache`** — cache lecture/écriture des réponses IA.
```
PK composite : (user_id, agent_slug, input_hash)
Champs : response_text, provider, model, run_id, created_at
Hash : FNV-1a 32 bits sur agent_slug + prompt + (image_base64 optionnel)
```
> ⚠️ La table est utilisée par `src/lib/ai/agent-cache.ts` mais sa migration
> n'apparaît pas dans `supabase/migrations/` du dépôt — elle a été créée
> hors-repo (Studio direct ou migration future à formaliser).

### 4.3 Fonction `has_role`
```sql
CREATE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles
                     WHERE user_id = _user_id AND role = _role) $$;
```
SECURITY DEFINER → contourne la RLS de `user_roles` sans risque récursif.

---

## 5. Modules partagés Edge Function (`_shared/`)

### `auth.ts` — `requireAdmin(req)`
1. Vérifie `Authorization: Bearer …`.
2. Crée un client Supabase **avec le JWT du caller** → `getUser()`.
3. Crée un client **service-role** → `rpc('has_role', {_user_id, _role:'admin'})`.
4. Retourne `{ ok:true, user, service, userClient }` ou `{ ok:false, status, code, message }`.

### `settings.ts`
- `readAiSettings(service)` : lit toutes les clés `ai.*` en une requête `IN`.
- `readAgentConfig(service, slug)` : lit la config d'un agent ou `null`.

### `providers.ts` — interface unifiée
```ts
type ProviderCallResult =
  | { ok: true;  data: unknown; latencyMs: number }
  | { ok: false; errorCode: string; errorMessage: string; latencyMs: number; retryable: boolean };
```
- `callQuatarly()` : POST OpenAI-compatible avec `response_format: json_object`,
  payload multimodal `{ type: 'text' | 'image_url' }`.
- `callGoogleDirect()` : `generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
  avec `response_mime_type: 'application/json'`.
- `callOllama()` : `${baseUrl}/api/chat`, support image base64.
- Tous parsent le JSON retour, strippent les fences ```json``` éventuels,
  classifient `retryable` (HTTP ≥500, 429, network, empty-content, invalid-json).

### `rate-limit.ts` — `checkGoogleDailyQuota(service, max?)`
Compte les events `provider='google-direct' AND success=true` depuis le début
de la journée UTC. Si erreur de lecture → **refuse par sécurité** (`allowed:false`).

### `logging.ts`
- `insertRun({ agentSlug, provider, model, userId })` → renvoie `runId`.
- `logEvent({ runId, eventType, provider, model, success, errorCode, latencyMs })`.
- `finishRun(runId, { status, latencyMs, errorCode?, fallbackUsed?, outputJsonb? })`.
- `sha256Hex(input)` pour `source_hash`.

### `cors.ts`
```ts
corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, …',
}
jsonResponse(payload, status=200)
```

---

## 6. Couche frontend

### 6.1 Client générique `src/lib/ai/edge-client.ts`
```ts
queryAIViaEdge(req: AIDispatchRequest): Promise<AIDispatchResult>
```
- Vérifie `isSupabaseConfigured()` ; sinon retourne `{ ok:false, code:'NO_SUPABASE' }`.
- `supabase.functions.invoke('ai-provider-dispatch', { body: req })`.
- Discriminated union explicite `{ ok:true, data } | { ok:false, error, code }`.

### 6.2 Cache `src/lib/ai/agent-cache.ts`
```ts
queryAIWithCache(req: CachedAIRequest, userId: string): Promise<CachedAIResponse>
```
Pipeline :
1. `buildCacheKey(slug, prompt, image?)` = FNV-1a sur `slug::prompt` (+ hash image séparé).
2. Si `!forceRefresh && userId` → `getCachedResponse()` ; hit = retour direct
   avec `fromCache: true, cachedAt: ISO`.
3. Sinon `queryAIViaEdge()`.
4. Succès + `!noCache` → `writeCache()` upsert.
5. Erreurs cache **toujours silencieuses** (jamais bloquantes).

API additionnelle : `invalidateCache(slug, userId, hash?)`,
`listCachedResponses(slug, userId)`.

### 6.3 Composant générique `src/components/ai/AgentButton.tsx`
- Props : `agentSlug`, `prompt`, `buttonLabel`, `testIdPrefix`.
- États visuels : `idle | loading | error | done`.
- En `done` : affiche le texte + badges **provider**, **model**,
  **`fromCache`/`fresh`**, **confidence (toujours C, ambre)**, et lien
  vers `/admin/ai?run_id=…`.
- Bouton refresh (force `forceRefresh: true` + invalidation préalable).

### 6.4 Web search base `src/components/ai/agents/WebSearchAgentBase.tsx`
- Pattern générique pour agents avec **input texte + parse JSON typé**.
- Props : `agentSlug`, `inputPlaceholder`, `searchLabel`, `renderResult`,
  `onResult`. Inclut tolérant `tryParseJson()` (strip fences, extraction
  `{...}`).

### 6.5 Liste des agents implémentés (33 composants côté UI)

**Calculatrice** : `ShotLineExplainer`, `DeviationExplainer`,
`PbrExplainerButton`, `TruingExplainerButton`, `WindCorrectionCoachButton`,
`CantSlopeAdvisorButton`.

**Sessions** : `SessionSummarizer`, `SessionReportButton`,
`TargetPhotoAnalyzer`, `TrainingLogSummarizerButton`,
`FieldDeltaAnalyzerButton`, `GroupingAnalyzerButton`,
`ChronoStatsInterpreterButton`.

**Library** : `AirgunReviewAgent`, `AirgunPairingAdvisorButton`,
`ProjectileSearchAgent`, `ProjectileCompareAdvisorButton`, `BcSearchAgent`,
`OpticSelectorAdvisorButton`, `TuneAdviceAgent`, `TuneStabilityCheckButton`,
`CaliberAdvisorButton`, `EnergyAdvisorButton`, `ZeroAdvisorButton`,
`CompetitionPrepAdvisorButton`, `VelocityForumAgent`.

**Environnement** : `WeatherSearchAgent` (intégré dans `EnvironmentSection`).

**Comparaison** : `CompareInsights`, `ProjectileSummary`.

**Cross-validation Strelok** : `AIImportModal` (utilise `ai-extract-rows`).

> Chaque "agent" UI = wrapper qui construit un `prompt` (souvent FR/EN selon
> `useI18n().locale`) + appelle `AgentButton` ou `WebSearchAgentBase` avec
> son `agent_slug`. **Aucun prompt système n'est en dur côté client** —
> tout vient de `ai_agent_configs.system_prompt`.

### 6.6 Page d'admin `/admin/ai` (`src/pages/AdminAiPage.tsx`)
- Vérifie `has_role('admin')` côté serveur via RPC (depuis fix sécurité 26/04).
- Sections :
  - **Settings** : édition des `ai.*` (providers, models, fallback, quotas).
  - **Quota Google** (`AiQuotaCard`) avec compteur du jour.
  - **Ollama** (`AiOllamaCard`) avec test de connexion.
  - **Agents** (`AgentsList`) : CRUD prompts/schemas/enabled.
  - **Logs** (`LogsViewer`) : historique runs/events.
  - **Stats journalières** (`AiDailyStats`).
  - **Runbook IA-2f** (`RunbookChecklist`, `RunbookPayloads`,
    `RunbookLogViewer`) : 13 critères de validation.

---

## 7. Flux end-to-end d'un appel IA standard

```
[User clique sur AgentButton dans la SessionSummarizer]
        │
        ▼
SessionSummarizer.tsx construit prompt :
  "Arme: PCP-1 | Projectile: 18.2gr BC 0.026 | Zéro: 30m | … | Langue: fr"
        │
        ▼
AgentButton → queryAIWithCache({ agent_slug:'session-summarizer', prompt }, userId)
        │
        ├─ cache hit ? → retour { fromCache:true, … }
        │
        ▼ (miss)
queryAIViaEdge → supabase.functions.invoke('ai-provider-dispatch', { body })
        │
        ▼
[Edge] requireAdmin(req)  →  { user, service }
[Edge] readAiSettings + readAgentConfig('session-summarizer')
[Edge] insertRun → runId
[Edge] callProvider('quatarly', 'claude-sonnet-4', body, …)
        │  ↳ POST api.quatarly.ai/v1/chat/completions
        │     headers: Authorization Bearer QUATARLY_API_KEY
        │     body: { model, response_format:{type:json_object}, messages:[...] }
        │
        ├─ ok → finishRun(success), logEvent('call', success:true)
        │       return { text, provider, model, fallback_used:false, latency_ms, run_id }
        │
        └─ ko retryable → callProvider('google-direct', settings.googleDirectModel, …)
            ↳ logEvent('fallback', …), finishRun avec fallback_used=true
        │
        ▼
[Front] writeCache(user_id, slug, hash, response)
        │
        ▼
AgentButton affiche : texte + badges [quatarly] [claude-sonnet-4]
                     [fresh|from-cache] [confidence C] + lien /admin/ai?run_id=…
```

---

## 8. Sécurité

### Authentification
- **JWT obligatoire** (`Authorization: Bearer`) sur toutes les Edge IA.
- **Rôle admin requis** côté Edge ET côté UI (`/admin/ai`).
- Rôles **séparés du profil** dans `user_roles` pour bloquer l'escalade.
- `has_role()` SECURITY DEFINER pour éviter récursion RLS.

### Secrets
- `QUATARLY_API_KEY`, `GOOGLE_AI_API_KEY` : **uniquement** comme secrets
  Edge Functions Supabase, jamais en `app_settings`, jamais côté client.
- `LOVABLE_API_KEY` : **non utilisé** (interdiction Lovable AI Gateway).
- Variables auto-injectées : `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Côté frontend : `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.

### CSP (depuis 26/04/2026, dans `index.html`)
```
default-src 'self';
script-src  'self' 'unsafe-inline' https://cdn.gpteng.co;
style-src   'self' 'unsafe-inline';
connect-src 'self'
            https://*.supabase.co wss://*.supabase.co
            https://api.quatarly.ai
            https://generativelanguage.googleapis.com
            https://gun.bouzidi.ovh
            https://*.lovable.app …;
object-src 'none'; base-uri 'self'; upgrade-insecure-requests;
```
+ `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy` (camera/mic/geo restreints).

### RLS — synthèse
| Table                | SELECT      | INSERT/UPDATE/DELETE |
|----------------------|-------------|----------------------|
| `user_roles`         | self+admin  | admin only           |
| `app_settings`       | **admin**   | admin                |
| `ai_agent_configs`   | admin       | admin                |
| `ai_agent_runs`      | admin       | service_role only    |
| `ai_usage_events`    | admin       | service_role only    |
| `ai_responses_cache` | user owner  | user owner           |

---

## 9. Rate limiting & quotas

- **Google Direct** : `ai.google_direct_max_requests_per_day` (défaut 20).
  Compté via `ai_usage_events` (provider+success+date).
  Index dédié `(provider, created_at DESC)`.
  Vérifié AVANT call primaire google + AVANT fallback google.
  Dépassement → `429 google-quota-exceeded`.
- **Quatarly** : pas de rate limiter intégré (responsabilité provider).
- **Ollama** : opt-in seulement si `ai.ollama_enabled=true`.
- **Budgets par agent** : champ `budget_guardrails` (jsonb) prévu mais
  pas encore appliqué dans le dispatcher (BUILD-IA2f).

---

## 10. Gestion d'erreurs côté UI

- `queryAIViaEdge()` ne lève jamais — toujours `{ ok, … }`.
- `queryAIWithCache()` idem ; les erreurs cache sont **avalées**.
- `AgentButton` mappe `!ok` → état `error` (toast + texte i18n).
- `AIImportModal` (Strelok) : taille image validée client-side
  (`max_image_bytes`), abandon = zéro persistance, plafond `confidence='C'`.

---

## 11. Conventions à respecter pour ajouter un nouvel agent IA

> ⚠️ Sous BUILD-IA2f il est **interdit** de créer de nouvelle Edge ; on
> ne fait qu'ajouter un agent dans la table `ai_agent_configs` + un
> wrapper UI.

1. **Insérer l'agent en base** :
   ```sql
   INSERT INTO public.ai_agent_configs (
     slug, display_name, description,
     provider, model, allow_fallback,
     system_prompt, output_schema, prompt_version, enabled
   ) VALUES ('mon-nouvel-agent', …);
   ```
2. **Créer un composant React** dans `src/components/ai/agents/` qui
   construit le `prompt` (FR/EN via `useI18n`) et délègue à `AgentButton`
   ou `WebSearchAgentBase` :
   ```tsx
   <AgentButton
     agentSlug="mon-nouvel-agent"
     prompt={prompt}
     buttonLabel={t('monAgent.button')}
     testIdPrefix="monAgent"
   />
   ```
3. **Ajouter les clés i18n** dans `src/lib/translations.ts` (FR + EN).
4. **Ajouter un test** dans `*.test.tsx` (mock `queryAIViaEdge`).
5. **Ne JAMAIS** :
   - Mettre le prompt système ou le schéma côté client.
   - Appeler un provider directement.
   - Toucher à `ai-extract-rows` ou `ai-provider-dispatch`.
   - Persister automatiquement la sortie : toujours `confidence='C'` +
     revue humaine.

---

## 12. Tests existants (résumé)

- `src/lib/ai/edge-client.test.ts` — discriminated union, NO_SUPABASE.
- `src/lib/ai/agent-cache.test.ts` — hash, hit/miss, invalidate, silent fail.
- `src/lib/ai/strelok-rows.test.ts` — Zod, MIME allow-list, mapping sans conv.
- `src/lib/ai/quatarly-models-cache.test.ts`
- `src/components/ai/AgentButton.test.tsx`
- `src/components/ai/agents/{agents,analysis-agents,build2-agents}.test.tsx`
- `src/components/calc/ShotLineExplainer.test.tsx`
- `src/components/cross-validation/AIImportModal.test.tsx`

---

## 13. Roadmap IA actuelle (extraits guardrails)

- ✅ IA-1 : Strelok rows OCR (`ai-extract-rows`) — **figée**.
- ✅ IA-2a : migration additive (rate-limit, Ollama, budget cols).
- ✅ IA-2c : dispatcher générique (`ai-provider-dispatch`).
- ✅ IA-2e : client frontend `edge-client.ts` + cache `agent-cache.ts`.
- ✅ IA-2f1 : premier agent dispatcher (`shot-line-explainer`).
- 🔲 **IA-2f** : validation runtime 13/13 sur Supabase Cloud → **prérequis dur**.
- 🔲 IA-2g+ : nouveaux agents (gates : runbook OK, jamais migrer Strelok).
- 🔲 Migration self-hosted VM Proxmox (reportée).
- 🔲 MERO (gate spécifique non rempli — voir `mem://constraints/mero-exposure-gates`).

---

## 14. Points pièges connus pour une IA externe

1. **Ne pas confondre `ai-extract-rows` (figée) et `ai-provider-dispatch`
   (générique)** : ils coexistent volontairement.
2. **Ne pas remettre les clés API en `app_settings`** : seul `keyPresent`
   peut être exposé.
3. **`agent_slug` est la clé absolue** : si le client envoie un slug qui
   n'existe pas en base, le dispatcher renvoie `503 agent-disabled`.
4. **Le système est volontairement Supabase-only** ; aucune mention de
   Lovable AI Gateway n'est valide pour ce projet, même si la doc Lovable
   par défaut le recommande.
5. **Le moteur balistique reste 100 % JS local et déterministe.**
   Toute proposition d'IA "qui calcule la trajectoire" doit être refusée.
6. **Cache key inclut le hash image** → deux prompts identiques avec deux
   images différentes ne collisionnent pas.
7. **Fallback Google ignoré** si le primary est déjà Google ou Ollama, ou
   si l'erreur n'est pas `retryable`, ou si quota dépassé.
8. La table `ai_responses_cache` est consommée par le code mais sa
   migration n'est pas dans le repo : à formaliser si on régénère la base.

---

_Fin du document — version 1, généré le 2026-04-26._
