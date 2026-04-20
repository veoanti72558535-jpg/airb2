

# PLAN — IA-1 Strelok Pro screenshot → rows JSON (Supabase self-hosted, sans Lovable Cloud)

Tranche **PLAN uniquement**. Aucun code, aucune migration, aucune fonction. Plan approuvable avant BUILD.

---

## 1. Résumé exécutif

**Objectif IA-1** : permettre à un opérateur autorisé d'uploader **un** screenshot de table balistique Strelok Pro et de récupérer un brouillon de `references[].rows[]` (range/drop/velocity/windDrift/tof/energy si visibles), à relire et corriger manuellement, avant création/enrichissement d'une référence dans l'onglet Validation externe.

**Pourquoi cette architecture** : reproduire le pattern du document de référence (frontend sans clés → Edge Functions Supabase → providers Quatarly + Google Direct + logs + auth) garantit l'auto-hébergement complet, l'absence de dépendance Lovable Cloud, et la portabilité long-terme. C'est aussi le seul moyen honnête d'appeler un modèle multimodal sans exposer de clé.

**Pourquoi on ne build pas encore** : l'introduction de Supabase est la **première dépendance backend** du projet. Migration additive du schéma, settings DB, edge functions, auth, rôles, logs : il faut un plan validé avant d'écrire la première ligne pour éviter une régression sur la voie manuelle (qui doit rester intacte).

---

## 2. Ce qui doit être repris du système de référence

**À reprendre tel quel** :
- table `app_settings` (clé/valeur jsonb, RLS lecture authentifiée / écriture admin),
- table `ai_agent_configs` (catalogue d'agents avec `system_prompt`, `output_schema`, `provider`, `model`, `allow_fallback`, `prompt_version`),
- tables `ai_agent_runs` + `ai_usage_events` (traçabilité),
- enum `app_role` + table `user_roles` + fonction security definer `has_role()`,
- pattern Edge Function de dispatch (auth JWT → check rôle → lecture config → appel provider → fallback → log → renvoi structuré),
- séparation stricte secrets serveur (`QUATARLY_API_KEY`, `GOOGLE_AI_API_KEY`) / config publique en base,
- frontend appelle uniquement `supabase.functions.invoke()`, jamais le provider directement.

**À simplifier pour IA-1** :
- un seul agent (`cross-validation-strelok-rows`), pas de catalogue large,
- pas de quotas applicatifs (colonnes présentes en DB pour usage futur, pas évaluées),
- pas de page admin complète : un settings editor minimal suffit,
- pas de support Ollama, pas de provider local (différable),
- `ai_usage_events` minimal : `event_type`, `provider`, `model`, `latency_ms`, `success`, `error_code`, pas de comptage tokens fin.

**À laisser hors scope IA-1** :
- multi-agents, multi-source (ChairGun, MERO),
- extraction des inputs balistiques,
- multi-images / fusion multi-screens,
- détection auto de source,
- comparaison automatique post-extraction,
- budget tracking.

---

## 3. Scope exact de IA-1

**Fait** :
- 1 source : `strelok-pro` (forcé)
- 1 image (max ~4 Mo)
- extraction de `rows[]` uniquement : `range` (obligatoire), `drop`, `velocity`, `windDrift`, `tof`, `energy` (optionnels, jamais inventés)
- panneau de revue ligne par ligne (édition + suppression)
- confirmation explicite obligatoire
- création OU enrichissement (append) d'une référence Strelok Pro dans le cas courant
- `extractionMethod: 'screenshot-ai'`, `confidence: 'C'` plafonnée
- log complet du run (provider/model/latency/fallback)
- fallback manuel (saisie + collage TSV/CSV) reste intact et accessible

**Ne fait pas** :
- inputs balistiques (MV, BC, sight height, zero, atmosphère)
- ChairGun / MERO
- multi-images
- comparaison auto
- promotion de confiance au-dessus de C
- aucune persistance avant clic « Confirmer »
- aucun changement moteur, aucun changement harness, aucune modification des tolérances

---

## 4. Architecture cible recommandée

```text
┌──────────────────────────────────────────────────────────────┐
│  FRONTEND (React, AUCUN secret provider)                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ CrossValidationPage → AIImportModal (Strelok Pro only) │  │
│  │   1. Consentement                                      │  │
│  │   2. Upload 1 image                                    │  │
│  │   3. supabase.functions.invoke('ai-extract-rows', ...) │  │
│  │   4. Panneau revue (édition obligatoire)               │  │
│  │   5. Confirm → repo localStorage existant              │  │
│  │ Bouton CACHÉ si VITE_SUPABASE_URL absent               │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                            │ JWT
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  SUPABASE SELF-HOSTED                                        │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Edge Function: ai-extract-rows                         │  │
│  │  - vérifie JWT + has_role('admin')                     │  │
│  │  - lit ai_agent_configs[slug=...-strelok-rows]         │  │
│  │  - lit app_settings (provider, fallback flag)          │  │
│  │  - appelle Quatarly (multimodal)                       │  │
│  │  - si échec ET allow_google_fallback → Google Direct   │  │
│  │  - valide output Zod (schema rows-only strict)         │  │
│  │  - insert ai_agent_runs + ai_usage_events              │  │
│  │  - retourne draft + run_id                             │  │
│  └────────────────────────────────────────────────────────┘  │
│  Edge Function: ai-providers-test (ping providers, admin)    │
│                                                               │
│  Tables: app_settings, ai_agent_configs,                     │
│          ai_agent_runs, ai_usage_events,                     │
│          user_roles, fn has_role()                           │
│  Secrets: QUATARLY_API_KEY, GOOGLE_AI_API_KEY                │
└──────────────────────────────────────────────────────────────┘
                            │ HTTPS
                            ▼
                  ┌─────────────────────┐
                  │ Quatarly (primaire) │
                  │ Google AI (fallback)│
                  └─────────────────────┘
```

**Frontières** :
- **Côté client** : UI, validation Zod du draft reçu, édition, confirmation, persistance localStorage (repo existant inchangé).
- **Côté Supabase** : auth, dispatch IA, secrets, logs, config.
- **Hors moteur** : la sortie IA n'atteint **jamais** le moteur balistique sans passer par confirmation humaine + repo existant + harness existant.

---

## 5. Configuration et tables minimales recommandées

### `app_settings` (clés à seeder)
- `ai.provider_primary` = `"quatarly"`
- `ai.provider_model_primary` = `"claude-sonnet-4"` ou équivalent multimodal
- `ai.quatarly_api_url` = URL Quatarly
- `ai.allow_google_fallback` = `true`
- `ai.google_direct_enabled` = `true`
- `ai.google_direct_model` = `"gemini-2.5-flash"` (vision)
- `ai.preferred_language` = `"fr"`

### `ai_agent_configs` (1 seed)
- `slug` : `cross-validation-strelok-rows`
- `provider`, `model`, `allow_fallback`
- `system_prompt` : strict, rows-only, refus d'extraire inputs, refus d'inventer
- `output_schema` : JSON Schema rows-only (range obligatoire, autres optionnels, pas de inputs)
- `prompt_version` : `1`

### `ai_agent_runs` (colonnes minimales)
`id, agent_slug, provider, model, status, started_at, finished_at, latency_ms, error_code, fallback_used, output_jsonb, user_id`

### `ai_usage_events` (colonnes minimales)
`id, run_id, event_type, provider, model, success, error_code, created_at`
(`event_type` ∈ `call`, `fallback`, `validation_error`, `auth_denied`)

### Secrets Supabase
- `QUATARLY_API_KEY`
- `GOOGLE_AI_API_KEY`

### Auth
- enum `app_role` (`admin`, `user`)
- table `user_roles`
- fonction `has_role(_user_id, _role) returns boolean SECURITY DEFINER`

---

## 6. Stratégie provider et fallback

| Aspect | Décision |
|---|---|
| Provider primaire | **Quatarly** (gateway multi-modèles, conforme au doc de référence) |
| Modèle primaire | Modèle multimodal vision (ex. `claude-sonnet-4` ou équivalent disponible) |
| Fallback | **Google Direct** (`gemini-2.5-flash` vision) |
| Déclenchement fallback | Erreur réseau Quatarly OU 5xx OU 429 OU validation output Zod échouée OU `allow_google_fallback=true` ET `GOOGLE_AI_API_KEY` présent |
| Logs obligatoires | `event_type=call` (primaire), `event_type=fallback` (si déclenché), `event_type=validation_error` (si JSON invalide), latence par appel |
| Portabilité | Provider configurable en base (un opérateur peut basculer Google primaire sans rebuild) |
| Pourquoi pas Lovable Cloud | Mémoire projet : "self-hosted deployments must remain possible without Lovable Cloud, Lovable AI, or any mandatory paid service" |

---

## 7. UX recommandée

**Flow** :
1. Onglet Validation externe → bouton **« Importer depuis screenshot (Strelok Pro) »** (caché si Supabase non configuré).
2. Modale étape 1 : bannière consentement (« L'image sera envoyée à un provider IA tiers configuré par l'admin »). Bouton « Continuer ».
3. Étape 2 : upload (drag/drop ou input file, 1 image, max 4 Mo, types autorisés png/jpg/webp).
4. Étape 3 : spinner « Analyse en cours… » + bouton Annuler.
5. Étape 4 : **panneau de revue obligatoire**
   - bannière permanente jaune « Brouillon IA non vérifié — à valider manuellement »,
   - tableau éditable ligne par ligne, badge confiance par ligne (vert ≥ 0.85, jaune 0.6–0.85, rouge < 0.6 ou unreadable),
   - icône suppression par ligne,
   - liste séparée des `unreadable[]` annoncés par l'IA,
   - liste des `assumptions[]` affichée en collapsible.
6. Étape 5 : bouton **« Confirmer et créer/enrichir la référence »** désactivé tant que 0 ligne exploitable. Bouton **« Abandonner »** toujours visible (retour mode manuel sans persistance).
7. Étape 6 : à la confirmation → ajout à la référence Strelok Pro du cas courant (création si absente), `extractionMethod=screenshot-ai`, `confidence=C` (forcée, non éditable depuis l'import IA), notes mentionnent provider/model/run_id.

**Garanties anti-persistance silencieuse** :
- Aucun écrit avant clic Confirmer.
- Aucune comparaison auto déclenchée.
- Fermer la modale = abandon, draft perdu.
- Confiance plafonnée à C au niveau schéma : aucune promotion silencieuse possible.

---

## 8. Contrats de données recommandés

### Extension additive `UserCrossValidationCase`
- `extractionMethodSchema` : ajouter `'screenshot-ai'` à l'enum existant. **Additif, rétro-compat totale**, aucun cas existant cassé.
- Optionnel : champ `aiMetadata?: { runId, provider, model, promptVersion, extractedAt }` au niveau `references[].meta`. Ajouté optionnel.

### Wrapper draft IA (interne, jamais persisté tel quel)
```text
AIDraftRows {
  rows: [{ range, drop?, velocity?, windDrift?, tof?, energy? }],
  fieldConfidence: { "rows[0].drop": 0.92, ... },
  unreadable: ["rows[3].velocity", ...],
  assumptions: ["unités lues en mm pour drop", ...],
  modelMetadata: { provider, model, promptVersion, runId, extractedAt },
  sourceImageHash: "sha256:..."
}
```

**Règles** :
- Validé Zod côté Edge Function avant retour ET côté client avant affichage.
- Champ non visible → `undefined` + entrée dans `unreadable[]`. Jamais d'invention.
- À la confirmation : conversion client vers `UserCrossValidationCase` standard, le wrapper est jeté (seules les métadonnées résumées vont dans `meta.notes` + `meta.assumptions`).

---

## 9. Auth / rôles / self-hosted

| Aspect | Décision |
|---|---|
| Rôle minimal pour appeler IA | `admin` (cohérent avec la stack de référence et les choix utilisateur précédents) |
| Vérification | JWT obligatoire côté Edge Function + `has_role(auth.uid(), 'admin')` via fonction security definer |
| Mode dégradé Supabase absent | Si `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY` non définis : client Supabase = `null`, bouton « Importer depuis screenshot » **caché**, le reste de l'app fonctionne 100% client-side |
| Self-hosted first | Aucune dépendance Lovable Cloud. Tout le pipeline est reproductible sur n'importe quel Supabase self-hosted |
| Voie manuelle | Saisie + templates + collage TSV/CSV restent intacts et indépendants de Supabase |

---

## 10. Risques et garde-fous

| Risque | Garde-fou | Bloquant ou warning ? |
|---|---|---|
| Hallucination valeurs | Output schema Zod strict + tool-calling (pas de free-text), confidence < 0.6 → ligne marquée rouge | Warning visuel obligatoire, édition forcée |
| OCR faible / image floue | `unreadable[]` peuplé honnêtement, confidence basse | Warning, pas bloquant si ≥ 1 ligne exploitable |
| Tableaux partiels | Lignes manquantes laissées hors `rows[]`, jamais devinées | Warning |
| Unités mal lues (mm vs cm vs MOA) | System prompt force détection unités, ambiguïté → `unreadable` | Bloquant pour la ligne ambiguë |
| Erreur provider | Fallback Google si autorisé, sinon erreur honnête + toast | Bloquant si fallback échoue aussi |
| Quotas (429 / 402) | Surface en toast utilisateur ET log `ai_usage_events` | Bloquant pour ce run |
| Coût image (envoi base64) | Bannière consentement, taille max 4 Mo client-side | Bloquant en upload |
| Données sensibles | SHA256 image dans logs (pas l'image), bannière consentement | Bloquant tant que pas de consentement |
| Versions modées Strelok | `meta.version` toujours saisi manuellement par l'utilisateur, jamais deviné | Bloquant à la confirmation |
| Confusion colonnes (drop / hold / clicks) | Prompt force la convention drop = mm sous ligne de visée. Refus si label colonne non trouvé | Bloquant pour la ligne |
| Promotion silencieuse confiance | `confidence` plafonnée à `C` au niveau schéma + UI | Bloquant définitif (pas d'override) |
| Cas existants cassés | Extension `extractionMethod` additive uniquement | Bloquant si non additif |

---

## 11. Roadmap BUILD recommandée

### BUILD IA-1 (prochaine tranche, à approuver après ce plan)

**Doit faire exactement** :
- migration SQL : `app_role`, `user_roles`, `has_role()`, `app_settings`, `ai_agent_configs`, `ai_agent_runs`, `ai_usage_events` + seeds (1 agent + settings),
- edge function `ai-extract-rows` (auth + dispatch Quatarly→Google + logs + validation Zod),
- edge function `ai-providers-test` (ping admin),
- extension additive `extractionMethodSchema` (`screenshot-ai`),
- client Supabase optionnel (`null` si non configuré),
- service `extractStrelokRowsFromScreenshot()` côté client,
- modale `AIImportModal` (consentement + upload + revue + confirmation),
- intégration bouton dans `CrossValidationPage` (caché si Supabase absent),
- page admin minimale `/admin/ai` pour éditer settings + tester providers,
- i18n FR/EN (~30 clés),
- tests : schéma additif, parsing draft, états UI (loading/error/review/confirm-disabled/abandon), absence persistance avant confirm, voie manuelle intacte sans Supabase,
- doc `docs/ai/setup-supabase-self-hosted.md` + `docs/ai/ia-1-strelok-rows.md`.

**Ne doit pas faire** :
- inputs balistiques, ChairGun, MERO, multi-image, multi-screen fusion, comparaison auto, page admin complète, quotas applicatifs, provider Ollama, modification moteur, modification harness, modification tolérances.

### IA-2 (plus tard)
Extraction inputs (MV, BC, sight height, zero) avec confiance par champ + UX confirmation par champ.

### IA-3 (plus tard)
Multi-screens fusion + ChairGun + MERO (rappel : MERO reste hors UI utilisateur normale, `mem://constraints/mero-exposure-gates`).

---

## Compte rendu technique

1. **Implémenté** : aucun code. Tranche PLAN uniquement.
2. **Fichiers modifiés** : aucun.
3. **Fichiers créés** : aucun.
4. **Fichiers supprimés** : aucun.
5. **Rôle des changements** : N/A.
6. **Points sensibles à anticiper pour BUILD IA-1** :
   - extension `extractionMethodSchema` doit être strictement additive (ajout `'screenshot-ai'` en queue), sinon casse les fixtures existants,
   - le client Supabase doit gracieusement retourner `null` si env vars absents : la voie manuelle ne doit jamais dépendre de Supabase,
   - les secrets `QUATARLY_API_KEY` / `GOOGLE_AI_API_KEY` ne doivent **jamais** apparaître dans le bundle frontend (vérifier au build),
   - la confiance `C` doit être forcée côté schéma Zod, pas seulement côté UI,
   - les screenshots envoyés en base64 sont sensibles : consentement explicite obligatoire avant chaque upload,
   - rate limit Google (429/402) doit surfacer en toast utilisateur, pas seulement console.
7. **Terminé** : cadrage architectural complet, liste de tables/secrets/edge functions définie, scope IA-1 verrouillé, garde-fous identifiés.
   **Reste à faire** : approbation de ce plan, puis BUILD IA-1 selon la roadmap section 11.

