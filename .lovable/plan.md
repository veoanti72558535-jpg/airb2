

# AIRBALLISTIK — PLAN DE RESTRUCTURATION GLOBAL

---

## VISION CIBLE

App mobile-first monolithique légère. Supabase self-hosted = source de vérité. localStorage/IDB = cache offline synchronisé. 2 Edge Functions IA max en régime permanent : `ai-extract-rows` (figée) + `ai-provider-dispatch` (extensible par agents en base). Pas de RAG, streaming, multi-agent chaîné.

---

## ARCHITECTURE

```
Frontend (React/Vite)
  └─ storage-adapter.ts (IDB cache ↔ Supabase source de vérité)
  └─ AuthProvider (Supabase session, optionnel V1)
  └─ edge-client.ts → supabase.functions.invoke()

Edge Functions (2 permanentes) :
  ai-extract-rows       (IA-1, figée, INTOUCHABLE)
  ai-provider-dispatch   (multi-agents, extensible)
  ai-providers-test      (transitoire → absorbée dans IA2l)

PostgreSQL + RLS :
  Tables IA : user_roles, app_settings, ai_agent_configs, ai_agent_runs, ai_usage_events
  Tables métier : profiles, airguns, tunes, projectiles, optics, reticles, sessions,
                   cross_validation_cases, comparisons
```

---

## CONTRAINTES ABSOLUES

1. Ne jamais modifier `ai-extract-rows`
2. Ne jamais migrer `cross-validation-strelok-rows` vers le dispatcher
3. Ne jamais casser voie manuelle cross-validation
4. Ne jamais toucher au moteur balistique
5. Rôle = `admin` (jamais `gerant`)
6. Pas de Lovable Cloud
7. localStorage jamais supprimé avant validation Supabase complète
8. Profil MERO masqué (prérequis non remplis)
9. Pas de big bang — chaque tranche petite, scopée, testable, réversible

---

## TRANCHES ORDONNÉES

### TRANCHE 0 — Validation runtime Cloud (opérateur, pas de code)
- Exécuter runbook 13/13 sur Supabase Cloud (docs/ai/ia2f-cloud-validation-runbook.md)
- GO/NO-GO pour la suite
- Effort : S

### TRANCHE IA2f-1 — Premier agent `shot-line-explainer`
- Migration SQL additive (INSERT agent dans ai_agent_configs)
- Composant UI minimal avec badge confidence='C' + provider + modèle
- Traductions FR/EN, tests Vitest
- Dépendance : TRANCHE 0 validée 13/13
- Effort : M

### TRANCHE P-1 — Schéma DB métier (parallélisable avec IA2f-1)
- Migration SQL additive : profiles, airguns, tunes, projectiles, optics, reticles, sessions, cross_validation_cases, comparisons
- RLS `user_id = auth.uid()` sur chaque table, admin read-all via `has_role()`
- Indexes, trigger `on_auth_user_created` pour profil auto-créé
- Aucun changement frontend
- Effort : M

### TRANCHE P-2 — AuthProvider global optionnel
- `src/lib/auth-context.tsx` : provider React, `useAuth()`, auto-refresh
- Login/signup email minimal (modal ou page)
- App 100% fonctionnelle sans login
- Dépendance : P-1
- Effort : M

### TRANCHE P-3 — Storage adapter + dual-write sessions
- `storage-adapter.ts` : couche d'abstraction IDB ↔ Supabase
- Dual-write sessions : IDB + Supabase si connecté
- Sync au login (last-write-wins par `updated_at`)
- Queue offline (`pending_sync`)
- Dépendance : P-2
- Effort : L

### TRANCHE P-4 — Dual-write library
- Étend l'adapter à airguns, tunes, projectiles, optics, reticles
- Migration initiale données locales → Supabase au premier login (batch)
- Dépendance : P-3
- Effort : L

### TRANCHE IA2g — Admin AI CRUD agents
- Formulaire CRUD agents dans /admin/ai (slug, label, provider, modèle, prompt, fallback, quota, enabled)
- Lecture/écriture directe `ai_agent_configs`
- Dépendance : IA2f-1
- Effort : M

### TRANCHE IA2h — Admin AI logs détaillés
- Tableau paginé runs, drill-down events, filtres agent/provider/status/date
- Dépendance : IA2g
- Effort : M

### TRANCHE IA2i — Agents métier 2 à 5
- deviation-explainer, projectile-summary, session-summarizer, compare-insights
- 1 agent = 1 sous-tranche indépendante
- Dépendance : IA2g + P-3
- Effort : L (4 × M)

### TRANCHE IA2j — Modèles Quatarly dynamiques
- /v1/models → dropdown dynamique dans CRUD agents
- Dépendance : IA2g
- Effort : S

### TRANCHE P-5 — Cross-validation + comparisons en Supabase
- Dual-write cross_validation_cases, comparisons
- Dépendance : P-4
- Effort : M

### TRANCHE P-6 — Préférences utilisateur en Supabase
- Sync profiles (langue, thème, unités, energy_threshold)
- Dépendance : P-2
- Effort : S

### TRANCHE IA2k — Ollama (post-VM self-hosted)
- Routing Ollama fonctionnel dans dispatcher + UI admin
- Dépendance : VM self-hosted déployée
- Effort : M

### TRANCHE IA2l — Fusion endpoints (fin de roadmap)
- Absorber `ai-providers-test` dans `ai-provider-dispatch` via agent `system-diagnostic`
- Supprimer `ai-providers-test`
- Dépendance : tous agents stables + IA2k
- Effort : M

---

## ORDRE D'EXÉCUTION

```
TRANCHE 0 ──────────────────► (prérequis absolu)
     │
     ├──► IA2f-1          ├──► P-1 (schéma DB)
     │      │              │      │
     │      ▼              │      ▼
     │    IA2g (CRUD)      │    P-2 (auth)
     │      │              │      │
     │      ▼              │      ▼
     │    IA2h (logs)      │    P-3 (dual-write sessions)
     │      │              │      │
     │      ▼              │      ▼
     │    IA2i (agents)◄───┤    P-4 (dual-write library)
     │      │              │      │
     │      ▼              │      ▼
     │    IA2j (modèles)   │    P-5 (cross-val)
     │                     │      │
     │                     │      ▼
     │                     │    P-6 (prefs)
     │                     │
     └──► IA2k (Ollama, post-VM)
     └──► IA2l (fusion endpoints, fin)
```

---

## RÈGLES ANTI-DETTE TECHNIQUE

1. Pas de cache IA côté frontend
2. Pas de tool calling / function calling
3. Pas de RAG
4. Pas de streaming
5. Pas de workflows multi-agents chaînés
6. Pas d'A/B testing prompts
7. Pas de Supabase Realtime V1
8. Pas de multi-device sync actif V1
9. Pas de partage / collaboration V1
10. Migration localStorage → Supabase déclenchée explicitement au premier login

---

## QUESTIONS OUVERTES

1. Migration initiale bullets4 (~8700 projectiles) : batch au premier login ou fresh start ?
2. Sync silencieuse ou confirmation utilisateur avant push local → Supabase ?
3. Rétention logs IA : illimitée ou politique de purge (ex: 90 jours) ?
4. Images réticules : taille max base64 en colonne text ?
5. Trigger SQL `on_auth_user_created` vs création lazy côté frontend ?
6. Quota par agent (recommandé) vs global ?

---

## PROCHAINE ÉTAPE
TRANCHE 0 : exécuter le runbook de validation runtime Cloud (docs/ai/ia2f-cloud-validation-runbook.md). Score 13/13 → GO. Sinon → tranche corrective backend.

