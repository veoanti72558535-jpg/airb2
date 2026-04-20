# IA-1 — Audit de sécurité

Cet audit liste les **contrôles de sécurité** en place pour la tranche
IA-1 (Strelok Pro screenshot → rows JSON), avec pour chacun :

- l'objectif business / la menace couverte ;
- le pointeur exact dans le code (`fichier:ligne`) ;
- le ou les tests automatisés qui le verrouillent.

Périmètre : `supabase/migrations/20260420000000_ia1_init.sql`,
`supabase/functions/ai-extract-rows/`, `supabase/functions/ai-providers-test/`,
`supabase/functions/_shared/`, `src/integrations/supabase/client.ts`,
`src/lib/ai/strelok-rows.ts`, `src/components/cross-validation/AIImportModal.tsx`,
`src/pages/AdminAiPage.tsx`, `src/pages/CrossValidationPage.tsx`,
`src/lib/cross-validation/user-case-schema.ts`.

Hors scope : moteur balistique (inchangé), voie manuelle (inchangée),
ChairGun / MERO (non couverts par IA-1).

---

## C-1 — Rôles applicatifs séparés (`user_roles` + `has_role`)

**Menace couverte** : escalade de privilèges si le rôle est stocké
sur un profil éditable côté client. La table `user_roles` est isolée
de toute table métier ; le contrôle d'accès passe par une fonction
`SECURITY DEFINER` qui bypass RLS proprement, sans récursion.

- **Code** :
  - `supabase/migrations/20260420000000_ia1_init.sql:21-26` —
    `CREATE TYPE public.app_role AS ENUM ('admin', 'user')`.
  - `supabase/migrations/20260420000000_ia1_init.sql:30-37` —
    table `public.user_roles` **séparée** de `auth.users` /
    `profiles`, RLS activée.
  - `supabase/migrations/20260420000000_ia1_init.sql:40-51` —
    fonction `public.has_role(_user_id, _role)`, `STABLE`,
    `SECURITY DEFINER`, `SET search_path = public`.
  - `supabase/migrations/20260420000000_ia1_init.sql:53-66` —
    policies RLS sur `user_roles` : `select_self`, `admin_insert`,
    `admin_delete`. Aucune policy `update` (les rôles sont
    granted/revoked, pas mutés).
- **Garde-fou** : le `has_role()` est aussi utilisé côté Edge
  Function (cf. C-2) — un user authentifié sans rôle `admin` ne peut
  ni invoquer `ai-extract-rows`, ni invoquer `ai-providers-test`,
  ni écrire dans `app_settings` / `ai_agent_configs`.

**Test (manuel, déploiement self-hosted)** :
1. Créer un user `auth.users` standard.
2. Tenter `supabase.functions.invoke('ai-extract-rows', …)` → doit
   renvoyer `403 forbidden`.
3. Faire `INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin')`
   en service-role, retenter → doit passer.

Aucun test Vitest côté frontend ne couvre ce point (il dépend du
déploiement Postgres). Le contrat est documenté dans
`docs/ai/setup-supabase-self-hosted.md` (assignation du rôle admin).

---

## C-2 — Edge Functions : `requireAdmin()` obligatoire

**Menace couverte** : un user non-admin peut invoquer les fonctions
IA et soit consommer du quota provider, soit lire/modifier la
configuration IA.

- **Code** :
  - `supabase/functions/_shared/auth.ts:30-66` — `requireAdmin(req)` :
    1. exige un header `Authorization: Bearer <jwt>` ;
    2. construit un client supabase user-scoped pour `getUser()` ;
    3. appelle `service.rpc('has_role', { _user_id, _role: 'admin' })`
       avec une clé service-role (lecture only sur `user_roles`) ;
    4. renvoie `{ ok: false, status: 403, code: 'forbidden' }` si non
       admin, sans jamais leak la valeur du JWT.
  - `supabase/functions/ai-extract-rows/index.ts:73` —
    `await requireAdmin(req)` est la PREMIÈRE chose après CORS.
  - `supabase/functions/ai-providers-test/index.ts:22` — idem.

**Test** : le contrat 401 / 403 est validé côté déploiement (cf.
`docs/ai/setup-supabase-self-hosted.md` §"smoke tests"). Côté frontend,
aucun test ne simule un user non-admin (l'erreur est traduite
génériquement par `AIExtractionError('invoke-failed')`).

**Régression possible** : si quelqu'un retire le `await requireAdmin(req)`
ou laisse passer un fallback en cas d'erreur, l'endpoint devient
ouvert. À vérifier en revue de code à chaque modification d'edge
function IA.

---

## C-3 — Aucune clé provider côté client

**Menace couverte** : exfiltration d'une clé Quatarly / Google AI
depuis le bundle JavaScript navigateur (les clés provider donnent un
accès quasi illimité au quota payant).

- **Code** :
  - `src/integrations/supabase/client.ts:14-29` — seules les variables
    publishables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont
    lues côté client. Aucune référence à `QUATARLY_API_KEY` /
    `GOOGLE_AI_API_KEY` dans `src/`.
  - `src/lib/ai/strelok-rows.ts:91-128` — l'appel passe par
    `supabase.functions.invoke('ai-extract-rows', { body: { imageBase64, imageMime } })`.
    Le payload ne contient **aucune** clé. C'est l'edge function qui
    lit `QUATARLY_API_KEY` / `GOOGLE_AI_API_KEY` via
    `Deno.env.get(...)` (cf. `supabase/functions/_shared/providers.ts`).
  - `supabase/functions/_shared/settings.ts` (lecture `app_settings`) —
    les configs IA stockées en base ne contiennent **que** des
    paramètres non-sensibles (modèle, prompt version, allow-fallback…).
    Les clés API sont injectées via `supabase secrets set` (cf.
    `docs/ai/setup-supabase-self-hosted.md`).

**Test** :
- `src/lib/ai/strelok-rows.test.ts:1-…` — vérifie que le service ne
  lit jamais d'env autre que celles exposées par
  `import.meta.env.VITE_*`.
- Vérification manuelle : `grep -r "QUATARLY_API_KEY\|GOOGLE_AI_API_KEY" src/`
  doit retourner **zéro** résultat (run le grep en CI si besoin).

**Régression possible** : ajouter par mégarde une variable
`VITE_QUATARLY_API_KEY` exposerait la clé au bundle. Convention :
toute variable `VITE_*` est PUBLIQUE par construction Vite.

---

## C-4 — Plafond de confiance forcé à `'C'` pour `screenshot-ai`

**Menace couverte** : un brouillon IA pourrait être présenté avec une
confiance `A` ou `B` et fausser la lecture comparative
(règle "deux sources concordantes" du protocole de validation
externe). IA-1 traite explicitement les rows extraites comme une
source **indicative uniquement**.

- **Code** :
  - `src/components/cross-validation/AIImportModal.tsx:168` — la
    construction du `UserReference` à `onConfirm` fixe en dur
    `confidence: 'C'`, indépendamment de la confiance auto-rapportée
    par le modèle.
  - `src/lib/cross-validation/types.ts:62-69` — l'extraction method
    `'screenshot-ai'` est ajoutée *additivement* (jamais en
    remplacement) à l'enum `CrossValidationExtractionMethod`. Le
    commentaire fige la règle "confiance forcée à `'C'`".
  - `src/lib/cross-validation/user-case-schema.ts:60-70` — le tableau
    `EXTRACTION_VALUES` contient `'screenshot-ai'` ; la contrainte
    `'C'` est appliquée par l'UI (le schéma reste générique pour ne
    pas casser les fixtures historiques).

**Tests** :
- `src/components/cross-validation/AIImportModal.test.tsx:113-122`
  vérifie que `payload.reference.meta.confidence === 'C'` et
  `extractionMethod === 'screenshot-ai'` après confirmation.
- `src/pages/CrossValidationPage.ai-attach.test.tsx` — test
  d'intégration qui attache le brouillon à un cas existant et
  vérifie que `userCaseRepo` persiste bien `confidence === 'C'` et
  `extractionMethod === 'screenshot-ai'` (lecture API + lecture brute
  `localStorage`).
- `src/lib/cross-validation/screenshot-ai-additive.test.ts` — garantit
  que l'ajout de `'screenshot-ai'` est strictement additif vis-à-vis
  des méthodes historiques (`export-csv`, `export-json`,
  `screenshot-retyped`, `manual-entry`, `published-table`).

**Régression possible** : si quelqu'un rend la confiance "éditable"
dans la modale après extraction IA, le plafond saute. Le test
`AIImportModal.test.tsx:113-122` casse immédiatement.

---

## C-5 — Consentement explicite avant upload

**Menace couverte** : l'opérateur uploade un screenshot vers un
provider tiers (Quatarly / Google) sans en avoir conscience. Le RGPD
et la politique data-minimisation imposent un opt-in explicite par
upload.

- **Code** :
  - `src/components/cross-validation/AIImportModal.tsx:51` — la
    machine à états démarre sur `step = 'consent'`.
  - Bandeau de consentement permanent (non skippable) :
    `crossValidation.ai.consent.body` + 3 puces
    (`consent.bullet1/2/3`) — voir `src/lib/translations.ts`.
  - Tant que l'opérateur n'a pas cliqué "J'accepte, continuer"
    (`crossValidation.ai.consent.accept`), le formulaire d'upload est
    monté mais inaccessible (`step !== 'upload'`).
  - Bandeau permanent durant la revue : "Brouillon IA non vérifié"
    (`crossValidation.ai.banner.title` / `.body`) — l'opérateur reste
    averti du caractère non-validé jusqu'à confirmation explicite.

**Tests** :
- `src/components/cross-validation/AIImportModal.test.tsx:58-66` —
  vérifie que la modale démarre sur l'étape "Étape 1 / 4 — Consentement"
  et qu'un abandon à ce stade n'appelle JAMAIS `onConfirm`.
- `src/components/cross-validation/AIImportModal.test.tsx:68-72` —
  vérifie que l'input de fichier n'est rendu qu'**après** acceptation
  du consentement.
- `src/components/cross-validation/AIImportModal.test.tsx:138-164` —
  vérifie qu'un abandon au stade revue (après upload + analyse) ne
  persiste rien non plus.

---

## C-6 — Aucune persistance avant confirmation explicite

**Menace couverte** : un brouillon IA bruité s'écrit en
`localStorage` (ou pire, est ajouté à un cas existant) sans accord
explicite de l'opérateur, polluant le store comparatif.

- **Code** :
  - `src/components/cross-validation/AIImportModal.tsx` — la modale
    n'écrit JAMAIS dans `userCaseRepo`. Elle propage seulement le
    payload via `onConfirm(payload)` au parent
    (`CrossValidationPage`).
  - `src/pages/CrossValidationPage.tsx:258-262` — `handleAiConfirm`
    se contente de stocker le payload en RAM (`setPendingAi`) et
    d'ouvrir l'`AttachAiDialog`. **Aucun `userCaseRepo.create/update`
    à ce stade**.
  - `src/pages/CrossValidationPage.tsx:264-302` — la persistance
    réelle n'a lieu QUE si l'opérateur clique :
    - "Attacher au cas sélectionné" → `userCaseRepo.update(...)`,
    - "Créer un nouveau cas" → ouvre l'éditeur, persistance
      uniquement après "Sauvegarder".
  - L'`AttachAiDialog` propose explicitement "Plus tard" (annulation),
    qui réinitialise `pendingAi` à `null` sans aucune écriture.

**Tests** :
- `src/pages/CrossValidationPage.ai-attach.test.tsx` — 2 cas :
  1. Attache à un cas existant → la nouvelle référence est ajoutée
     (pas remplacée), `localStorage` contient bien
     `"extractionMethod":"screenshot-ai"` + `"confidence":"C"` +
     `"source":"strelok-pro"`.
  2. Annulation via "Plus tard" → le cas seedé reste avec sa seule
     référence d'origine, AUCUNE écriture screenshot-ai en
     `localStorage`.
- Pré-écriture vérifiée explicitement dans le test 1 (étape 3) :
  juste après `onConfirm` IA, `userCaseRepo.getById(seeded.id)`
  retourne encore exactement 1 référence.

---

## C-7 — MIME / taille image plafonnés côté client ET serveur

**Menace couverte** : DoS / coût provider via upload d'images géantes
ou de fichiers non-image masqués en `.png`.

- **Code (client)** :
  - `src/lib/ai/strelok-rows.ts:66-67` — `ALLOWED_MIMES = ['image/png', 'image/jpeg', 'image/webp']`.
  - `src/lib/ai/strelok-rows.ts:67` — `DEFAULT_MAX_BYTES = 4 * 1024 * 1024` (4 Mo).
  - `src/lib/ai/strelok-rows.ts:103-115` — `extractStrelokRowsFromScreenshot`
    refuse `image-too-large` et `invalid-mime` AVANT le `fileToBase64`
    et AVANT l'invoke de l'edge function.
- **Code (serveur)** : l'edge function re-valide la taille du
  `imageBase64` reçu (cf. `supabase/functions/ai-extract-rows/index.ts`),
  conformément au principe "ne jamais faire confiance au client".

**Tests** :
- `src/lib/ai/strelok-rows.test.ts` — couvre MIME allow-list, image
  trop volumineuse, erreur typée si Supabase absent.
- `src/components/cross-validation/AIImportModal.test.tsx:124-136` —
  vérifie qu'une image > 4 Mo affiche le message d'erreur sans appeler
  l'extraction.

---

## C-8 — Bouton IA caché tant que Supabase self-hosted n'est pas configuré

**Menace couverte** : un déploiement sans Supabase configuré
afficherait un bouton qui mène vers une 404 réseau ou (pire) un
endpoint mock de dev.

- **Code** :
  - `src/integrations/supabase/client.ts:20-29` —
    `isSupabaseConfigured()` renvoie `true` ⇔ `VITE_SUPABASE_URL` et
    `VITE_SUPABASE_ANON_KEY` sont tous deux non vides.
  - `src/pages/CrossValidationPage.tsx:101,343-450` — le bouton
    `cv-ai-import-btn` n'est rendu que si `aiAvailable` est vrai
    (`onAiImportClick` undefined → bouton non monté).
  - `src/pages/AdminAiPage.tsx` — affiche un bandeau d'indisponibilité
    "Supabase non configuré dans ce build" si
    `!isSupabaseConfigured()` ; aucune édition de settings exposée.

**Vérifications manuelles** : exécutées dans la session preview
(viewport 470×672) — le bouton est absent de `/cross-validation` et
le bandeau rouge est présent sur `/admin/ai` quand
`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` sont vides.

**Régression possible** : exposer un mock Supabase de dev en prod
rendrait le bouton visible mais inopérant.

---

## C-9 — Voie manuelle 100 % indépendante

**Menace couverte** : si IA-1 tombe (provider down, RLS mal
configurée, edge function en panne), l'opérateur doit pouvoir
continuer à saisir des cas comparatifs manuellement.

- **Code** : aucun chemin métier (`PasteRowsModal`, "+ Nouveau cas",
  "Importer JSON", éditeur de référence) ne dépend de
  `isSupabaseConfigured()`. Les méthodes d'extraction historiques
  (`export-csv`, `export-json`, `screenshot-retyped`, `manual-entry`,
  `published-table`) restent acceptées par
  `src/lib/cross-validation/user-case-schema.ts`.
- **Tests** :
  - `src/lib/cross-validation/screenshot-ai-additive.test.ts` —
    garantit que l'ajout de `'screenshot-ai'` n'a cassé aucune
    méthode existante.
  - Toute la suite `src/lib/cross-validation/*.test.ts` (loader,
    paste-import, templates, case-loader, tolerances, compare) reste
    verte sans Supabase.

---

## Récapitulatif

| ID  | Contrôle                                | Code                                                                 | Tests                                                                                              |
|-----|-----------------------------------------|----------------------------------------------------------------------|----------------------------------------------------------------------------------------------------|
| C-1 | RLS `user_roles` + `has_role`           | `supabase/migrations/20260420000000_ia1_init.sql:21-66`              | Manuel (déploiement)                                                                               |
| C-2 | `requireAdmin()` sur Edge Functions     | `supabase/functions/_shared/auth.ts:30-66`                           | Manuel (smoke tests CLI)                                                                           |
| C-3 | Aucune clé provider côté client         | `src/integrations/supabase/client.ts:14-29`, `src/lib/ai/strelok-rows.ts:91-128` | `src/lib/ai/strelok-rows.test.ts`                                                                  |
| C-4 | Confiance plafonnée à `'C'`             | `src/components/cross-validation/AIImportModal.tsx:168`              | `AIImportModal.test.tsx:113-122`, `CrossValidationPage.ai-attach.test.tsx`, `screenshot-ai-additive.test.ts` |
| C-5 | Consentement explicite                  | `AIImportModal.tsx:51` (step `consent`)                              | `AIImportModal.test.tsx:58-72,138-164`                                                             |
| C-6 | Persistance après confirmation seulement | `CrossValidationPage.tsx:258-302`                                    | `CrossValidationPage.ai-attach.test.tsx` (2 cas)                                                   |
| C-7 | MIME + taille plafonnés                 | `src/lib/ai/strelok-rows.ts:66-115`                                  | `strelok-rows.test.ts`, `AIImportModal.test.tsx:124-136`                                           |
| C-8 | Bouton IA gated par `isSupabaseConfigured()` | `CrossValidationPage.tsx:101,343-450`, `AdminAiPage.tsx`        | Vérification manuelle preview                                                                      |
| C-9 | Voie manuelle indépendante              | Toute la pipeline `cross-validation/*` hors `ai/`                    | Suite `cross-validation/*.test.ts` (≈80 tests)                                                     |

**Statut global** : 9 contrôles en place, 5 couverts par tests Vitest
automatisés, 4 dépendant du déploiement self-hosted (et documentés
dans `docs/ai/setup-supabase-self-hosted.md`).

**À surveiller** :
- la migration SQL ne doit jamais être éditée en place — toute
  modification passe par une nouvelle migration timestampée ;
- ne jamais ajouter une variable `VITE_*` qui contiendrait une clé
  provider — toutes les `VITE_*` finissent dans le bundle navigateur ;
- ne jamais retirer `await requireAdmin(req)` des edge functions IA ;
- ne jamais rendre la confiance éditable dans `AIImportModal` après
  extraction.