# IA-1 — Runbook de mise en service réelle & recette E2E

> **Type** : runbook opérateur. Aucune nouvelle implémentation.
> **Pré-requis lecture** : `docs/ai/ia-1-strelok-rows.md`,
> `docs/ai/setup-supabase-self-hosted.md`.
> **Hors scope** : moteur balistique, ChairGun, MERO, IA-2.

---

## 1. Résumé exécutif

**État réel d'IA-1 (code)** :
- Migration SQL `supabase/migrations/20260420000000_ia1_init.sql` : prête
  (enum `app_role`, table `user_roles`, fonction `has_role`,
  `app_settings`, `ai_agent_configs`, `ai_agent_runs`, `ai_usage_events`,
  RLS + seed agent `cross-validation-strelok-rows`).
- Edge Functions Deno : `ai-extract-rows` + `ai-providers-test` prêtes,
  vérification JWT + rôle admin en code, fallback Quatarly → Google,
  validation Zod du draft, audit dans `ai_agent_runs`.
- Frontend : `supabase` client optionnel (`isSupabaseConfigured()`),
  `AIImportModal` (consent → upload → analyse → revue), bouton caché
  tant que `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` absents,
  page `/admin/ai`.
- Tests : suite Vitest verte (973 tests), incluant l'intégration
  attache d'un draft IA → `userCaseRepo` (confidence `C`,
  `extractionMethod = 'screenshot-ai'`).
- Voie manuelle (`PasteRowsModal`, JSON import, édition ligne par ligne)
  reste 100 % fonctionnelle, indépendante de Supabase.

**Ce qu'il reste à faire** :
1. Déployer la stack sur **votre** Supabase self-hosted.
2. Injecter les secrets providers (Quatarly + éventuel Google).
3. Promouvoir un utilisateur en `admin`.
4. Exécuter une **recette E2E réelle** avec un screenshot Strelok Pro.
5. Collecter les métriques d'extraction pour décider d'IA-2.

**Pourquoi opérationnel et non produit** : code, tests, sécurité et
documentation sont figés. Le seul risque restant est un risque
d'**exploitation** (config, secrets, qualité OCR réelle). Aucune
nouvelle décision produit ne peut être prise tant qu'on n'a pas vu
IA-1 fonctionner sur un screenshot réel.

---

## 2. Prérequis de déploiement

| #   | Prérequis | Vérification |
|-----|-----------|--------------|
| P1  | Instance Supabase self-hosted joignable depuis Internet (URL HTTPS publique). | `curl -I https://<inst>.supabase.co` → 200/401. |
| P2  | `supabase` CLI ≥ 1.180 installée localement. | `supabase --version`. |
| P3  | Accès SSH/console à l'instance (pour `supabase secrets set`). | — |
| P4  | Clé API **Quatarly** active (provider primaire). | Test manuel `curl` selon doc Quatarly. |
| P5  | (Optionnel) Clé Google Generative Language pour fallback. | Console Google AI Studio. |
| P6  | 1 compte utilisateur Supabase (email + mot de passe) destiné à devenir admin. | Auth → Users dans le dashboard. |
| P7  | Variables build frontend : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. | À injecter avant `vite build`. |
| P8  | **1 screenshot Strelok Pro réel** (table balistique pleine, lisible, PNG/JPEG/WEBP, ≤ 4 Mo). | Préparé sur le poste de recette. |
| P9  | Accès au repo (link CLI + déploiement frontend). | `supabase link` + pipeline build. |
| P10 | Note papier des MV/BC/zéro/atmosphère du screenshot (pour cross-check humain). | — |

**Stop-gates** : si P1, P4, P6 ou P8 manque, la recette E2E n'est pas
possible. P5 est facultatif (le fallback est désactivé par défaut).

---

## 3. Séquence de déploiement recommandée

Suivre l'ordre **strictement** : chaque étape rend la suivante
vérifiable.

### 3.1 — Lier le projet
```
supabase link --project-ref <REF>
```
✔ Vérif : `supabase status` retourne le bon `Project Ref`.

### 3.2 — Pousser les migrations
```
supabase db push
```
✔ Vérif (SQL editor) :
```sql
select table_name from information_schema.tables
 where table_schema = 'public'
   and table_name in ('user_roles','app_settings',
                      'ai_agent_configs','ai_agent_runs','ai_usage_events');
```
→ doit retourner **5 lignes**.
```sql
select slug, enabled, provider, model, prompt_version
  from public.ai_agent_configs;
```
→ doit contenir `cross-validation-strelok-rows` avec `enabled = true`.

### 3.3 — Injecter les secrets providers
```
supabase secrets set QUATARLY_API_KEY="sk-..."
supabase secrets set GOOGLE_AI_API_KEY="AIza..."   # optionnel
```
✔ Vérif : `supabase secrets list` montre les **noms** (jamais les
valeurs).

### 3.4 — Déployer les Edge Functions
```
supabase functions deploy ai-extract-rows
supabase functions deploy ai-providers-test
```
✔ Vérif : `supabase functions list` affiche les deux fonctions
`ACTIVE`. Tester l'OPTIONS preflight :
```
curl -i -X OPTIONS https://<inst>.functions.supabase.co/ai-providers-test
```
→ doit retourner `200` + headers CORS (`Access-Control-Allow-Origin`).

### 3.5 — Variables frontend + rebuild
Définir dans l'environnement de build :
```
VITE_SUPABASE_URL=https://<inst>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```
Puis rebuild + redéployer le frontend (Lovable Publish ou pipeline
self-hosted). ✔ Vérif : ouvrir l'app, devtools → `localStorage` ne
contient **aucune** clé provider, et `Network` montre des appels vers
le bon domaine Supabase.

### 3.6 — Créer un utilisateur admin
1. Dashboard Supabase → Authentication → Add user (email + mot de
   passe). Noter l'UUID.
2. SQL editor :
```sql
insert into public.user_roles (user_id, role)
values ('<UUID>', 'admin');
```
✔ Vérif :
```sql
select public.has_role('<UUID>', 'admin'::public.app_role);
```
→ doit retourner `true`.

### 3.7 — Vérifications intermédiaires
- Se connecter à l'app avec ce compte.
- Aller sur `/admin/ai` → la page se charge sans bandeau d'erreur.
- Cliquer **Tester providers** → `quatarly.keyPresent = true`.

---

## 4. Checklist de validation technique (avant E2E)

| ID | Contrôle | Attendu |
|----|----------|---------|
| V1 | Build frontend SANS `VITE_SUPABASE_*` (env staging vide). | `/cross-validation` n'affiche **pas** le bouton « Importer depuis screenshot ». `/admin/ai` affiche le bandeau « Supabase non configuré ». |
| V2 | Build frontend AVEC `VITE_SUPABASE_*`. | Bouton screenshot **visible** sur `/cross-validation`. `/admin/ai` chargeable. |
| V3 | Connexion avec compte **non-admin**. | `/admin/ai` ou edge functions → `403 not-admin`. |
| V4 | Connexion avec compte **admin**. | `Tester providers` → `quatarly.keyPresent: true`. |
| V5 | DevTools → Network → bundle JS. Recherche `QUATARLY` / `GOOGLE_AI`. | **Aucune** occurrence. Seule `VITE_SUPABASE_ANON_KEY` est exposée (normal, RLS protège). |
| V6 | Voie manuelle `PasteRowsModal` (sans Supabase). | Création de cas + références 100 % fonctionnelle. |
| V7 | Console navigateur sur `/cross-validation`. | Aucune erreur React, aucune 401/500. |
| V8 | `select count(*) from public.ai_agent_runs;` après V4. | `0` (le ping ne crée pas de run). |

**Bloquant si V1, V3, V5 ou V6 échoue.**

---

## 5. Protocole de recette E2E réel

### 5.1 — Choix du screenshot
- **Source** : Strelok Pro ≥ 6.x.
- **Contenu** : écran « Range card » / « Table » avec **au moins
  8 lignes** visibles, distance + drop + velocity affichés.
- **Qualité** : capture native (pas une photo d'écran), texte net,
  contraste élevé, langue indifférente mais cohérente.
- **Format** : PNG ou JPEG, < 4 Mo.
- **Pré-requis humain** : noter à part les valeurs MV / BC / zéro /
  atmosphère utilisées dans Strelok pour ce screenshot (ne sera **pas**
  extrait par IA-1, sert uniquement au cross-check).

### 5.2 — Exécution pas à pas

| Étape | Action opérateur | Vérification visuelle |
|-------|------------------|------------------------|
| E1  | Se connecter avec le compte admin. | Header affiche l'email. |
| E2  | Aller sur `/cross-validation`. | Bouton « Importer depuis screenshot (Strelok Pro) » présent. |
| E3  | Cliquer le bouton. | Modale s'ouvre sur étape **Consentement**. |
| E4  | Lire le bandeau de consentement, cocher, **Continuer**. | Étape **Upload** affichée. |
| E5  | Glisser-déposer le screenshot. | Aperçu image + nom + taille. Bouton « Analyser » actif. |
| E6  | Cliquer **Analyser**. | Spinner ; après 5–30 s, étape **Revue** s'affiche avec un tableau de lignes + bandeau « Brouillon IA non vérifié ». |
| E7  | Comparer ligne par ligne avec le screenshot original. Corriger les valeurs erronées. | Les corrections sont locales à la modale. |
| E8  | Sélectionner « Attacher à un cas existant » OU « Créer un nouveau cas ». | Dialog `AttachAiDialog` ou éditeur cas. |
| E9  | **Confirmer**. | Toast succès. La référence apparaît avec : `source = strelok-pro`, `confidence = C`, `extractionMethod = screenshot-ai`. |
| E10 | **Abandonner** un second essai (fermer la modale après E6 sans confirmer). | Aucune référence créée. `userCaseRepo` inchangé. |

### 5.3 — Vérifications côté serveur
Après E9 :
```sql
select id, agent_slug, provider, model, status, fallback_used,
       latency_ms, error_code, created_at
  from public.ai_agent_runs
 order by created_at desc
 limit 5;
```
→ **1 ligne** `status = 'success'` pour `agent_slug =
'cross-validation-strelok-rows'`.

```sql
select event_type, provider, success, error_code, latency_ms
  from public.ai_usage_events
 where run_id = '<id ci-dessus>';
```
→ au moins 1 event `call`, et 1 event `fallback` **uniquement si**
Quatarly a échoué.

### 5.4 — Décision « test réussi »
Le test est **réussi** si **toutes** les conditions sont vraies :
- E5 → E9 se déroulent sans erreur 4xx/5xx en console.
- Au moins **70 %** des lignes affichées en revue (E7) correspondent
  au screenshot à ±1 unité près (drop / velocity).
- E10 ne crée **aucune** entrée dans `userCaseRepo` (clé localStorage
  `airballistik.user-cases`).
- La référence créée en E9 contient bien le triplet `strelok-pro` /
  `C` / `screenshot-ai`.
- `ai_agent_runs` contient bien la trace audit (5.3).

---

## 6. Critères d'acceptation réels

IA-1 est considérée **validée en production self-hosted** si :

| ID | Critère | Vérif |
|----|---------|-------|
| A1 | Upload d'un screenshot ≤ 4 Mo réussit. | E5 ok. |
| A2 | Extraction reçoit un `draft` non vide et conforme au schéma Zod. | E6 sans `invalid-draft`. |
| A3 | La revue humaine est obligatoire (pas de skip). | E7 affiché systématiquement. |
| A4 | Aucune persistance avant `Confirmer`. | E10 vérifié. |
| A5 | Référence créée porte `extractionMethod = 'screenshot-ai'`, `confidence = 'C'`, `source = 'strelok-pro'`. | E9 + inspection localStorage. |
| A6 | Run audit présent dans `ai_agent_runs` avec `status = 'success'`. | 5.3 ok. |
| A7 | Voie manuelle (`PasteRowsModal`) toujours fonctionnelle après déploiement. | V6 ok après E9. |
| A8 | Aucune régression UI : `/`, `/cross-validation`, `/admin/ai`, `/library`, `/quick-calc` chargent sans erreur console. | Smoke test manuel. |
| A9 | Aucune clé provider dans le bundle frontend ni dans la base. | V5 + `select * from app_settings;`. |

**Si A1 → A9 sont ✔, IA-1 est livrée.** Sinon, ouvrir un ticket
correctif **avant** d'envisager IA-2.

---

## 7. Incidents probables et diagnostic rapide

| Symptôme | Cause probable | Diagnostic rapide |
|----------|----------------|-------------------|
| Bouton screenshot absent malgré déploiement. | `VITE_SUPABASE_URL` / `ANON_KEY` non injectés au build. | DevTools → Console : `import.meta.env`. Rebuild avec env correct. |
| `/admin/ai` → bandeau « Supabase non configuré ». | Idem. | Idem. |
| `403 not-admin` au clic Tester providers. | Pas de ligne dans `user_roles` pour ce user. | `select * from user_roles where user_id = '<UUID>';`. Étape 3.6. |
| `401 invalid-jwt`. | Session expirée ou anon key incorrecte. | Re-login + vérifier `VITE_SUPABASE_ANON_KEY`. |
| `500 server-misconfigured`. | Edge Function ne voit pas `SUPABASE_SERVICE_ROLE_KEY`. | Normalement auto-injecté ; `supabase functions list` puis redeploy. |
| `503 agent-disabled`. | `ai_agent_configs.enabled = false`. | `update public.ai_agent_configs set enabled = true where slug = 'cross-validation-strelok-rows';`. |
| `413 image-too-large`. | Screenshot > 4 Mo. | Recompresser ou réduire la résolution. |
| `502 provider-failed` + errorCode Quatarly. | Clé absente, quota, modèle indispo. | `Tester providers` → `keyPresent`. Vérifier quota. |
| `502 provider-failed` même après fallback. | Fallback désactivé OU `GOOGLE_AI_API_KEY` absent. | `select * from app_settings;` → `allow_google_fallback`, `google_direct_enabled`. |
| `502 invalid-draft`. | Provider a renvoyé du JSON non conforme. | Inspecter `ai_agent_runs.output_jsonb` du run en erreur. |
| Lignes extraites toutes fausses / vides. | Screenshot illisible. | Reprendre une capture native nette ; ne pas modifier le code. |
| `404` sur l'edge function. | Function non déployée. | `supabase functions list`. Étape 3.4. |
| CORS error en console. | URL Supabase incorrecte côté frontend. | Vérifier `VITE_SUPABASE_URL` (pas de slash final). |

**Règle d'or de triage** : toujours commencer par
`/admin/ai → Tester providers` avant de soupçonner le code.

---

## 8. Quoi collecter après le premier test réel

Pour pouvoir décider d'IA-2 (autres apps : ChairGun, MERO) ou d'une
tranche corrective, noter dans un fichier `recette-ia1-<date>.md` :

1. **Métadonnées du screenshot** : app, version Strelok, résolution,
   poids, langue UI.
2. **Métriques d'extraction** :
   - nombre de lignes attendues vs extraites,
   - taux de bonnes valeurs `range`,
   - taux de bonnes valeurs `drop`,
   - taux de bonnes valeurs `velocity`,
   - lignes manquées (numéros + valeurs attendues),
   - hallucinations (lignes inventées).
3. **Erreurs serveur** : code, message, run id, fallbackUsed.
4. **Latence** : `latency_ms` du run (5.3).
5. **Provider effectif** : `providerUsed` + `modelUsed`.
6. **Écrans Strelok testés** : Range card / Table / autre — lesquels
   marchent, lesquels ne marchent pas.
7. **Cas qualitatifs à isoler** : cellules superposées, textes coupés,
   police italique, mode sombre Strelok, etc.
8. **Décisions opérateur pendant la revue** : combien de corrections
   manuelles avant confirmation.

Ce dossier devient l'**input N°1** pour décider :
- soit corriger le prompt seedé (`ai_agent_configs.system_prompt`,
  bump `prompt_version`),
- soit changer de provider primaire,
- soit ouvrir IA-2.

---

## 9. Recommandation finale

**Action immédiate** : exécuter ce runbook **dans l'ordre** sur
l'instance Supabase self-hosted cible, avec **1 seul screenshot
Strelok Pro réel** pour la première recette (pas une batterie de tests
en parallèle).

**Résultat à me faire remonter** :
- ✔ / ✘ pour chaque ligne de la checklist §4 (V1 → V8).
- ✔ / ✘ pour chaque ligne de §5.2 (E1 → E10).
- Le tableau §8 rempli pour le screenshot testé.
- Capture d'écran de la revue (E7) + capture du résultat SQL §5.3.

**Quand ouvrir IA-2** : uniquement si A1 → A9 (§6) sont tous ✔ ET si
les métriques §8 montrent un taux de bonnes valeurs ≥ 70 % sur 3
screenshots distincts. Sinon, ouvrir une tranche **corrective IA-1**
(prompt tuning, bump `prompt_version`, ajustement `app_settings`)
**avant** d'élargir le scope.

**Tranche corrective vs IA-2** :
- corrective IA-1 = même scope produit, on améliore l'extraction.
- IA-2 = nouveau scope produit (autre app), à n'ouvrir qu'après
  validation IA-1 stable et documentée.

---

## Annexe — Pointeurs code (lecture seule pour ce runbook)

- Migration : `supabase/migrations/20260420000000_ia1_init.sql`
- Edge Functions : `supabase/functions/ai-extract-rows/index.ts`,
  `supabase/functions/ai-providers-test/index.ts`
- Auth + secrets shared : `supabase/functions/_shared/{auth,settings,providers,logging,cors}.ts`
- Frontend gate : `src/integrations/supabase/client.ts`
  (`isSupabaseConfigured()`)
- Modale IA : `src/components/cross-validation/AIImportModal.tsx`
- Page admin : `src/pages/AdminAiPage.tsx`
- Service client : `src/lib/ai/strelok-rows.ts`
- Tests verts de référence : `npm test` (973 tests / 90 fichiers).
