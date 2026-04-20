# Setup Supabase self-hosted pour IA-1

Ce document décrit pas à pas la mise en route d'IA-1 (Strelok Pro
screenshot → rows JSON) sur **votre propre instance Supabase**.
AirBallistik n'utilise **jamais** Lovable Cloud ni Lovable AI Gateway.
Tout passe par votre Supabase + vos clés providers.

> ⚠️ Sans ces étapes, le bouton « Importer depuis screenshot » reste
> caché côté UI et la voie manuelle (collage TSV/CSV) reste 100%
> fonctionnelle.

---

## 0. Prérequis

- Une instance Supabase self-hosted joignable depuis Internet
  (l'app frontend doit pouvoir l'atteindre depuis le navigateur).
- `supabase` CLI installé localement (`brew install supabase/tap/supabase`
  ou équivalent).
- Une clé API **Quatarly** (provider primaire) :
  `QUATARLY_API_KEY`.
- Une clé API **Google Generative Language** (fallback) :
  `GOOGLE_AI_API_KEY` (optionnelle si vous désactivez le fallback).
- Un compte utilisateur Supabase (email + mot de passe) auquel vous
  comptez assigner le rôle `admin`.

---

## 1. Lier le projet

```bash
cd <repo>
supabase link --project-ref <votre-ref>
```

## 2. Pousser les migrations

La migration `supabase/migrations/20260420000000_ia1_init.sql` crée :

- l'enum `app_role` (`admin` / `user`),
- la table `user_roles` + la fonction security definer `has_role()`,
- les tables de configuration `app_settings` + `ai_agent_configs`,
- les tables d'audit `ai_agent_runs` + `ai_usage_events`,
- les RLS et seeds minimaux pour l'agent `cross-validation-strelok-rows`.

```bash
supabase db push
```

## 3. Déployer les Edge Functions

```bash
supabase functions deploy ai-extract-rows
supabase functions deploy ai-providers-test
```

## 4. Injecter les secrets providers

**Aucune clé provider n'est jamais stockée côté frontend ni en base.**
Elles vivent uniquement comme secrets Supabase, lus au runtime par les
Edge Functions.

```bash
supabase secrets set QUATARLY_API_KEY="sk-..."
supabase secrets set GOOGLE_AI_API_KEY="AIza..."
```

(Les secrets `SUPABASE_URL` / `SUPABASE_ANON_KEY` /
`SUPABASE_SERVICE_ROLE_KEY` sont déjà fournis automatiquement par
Supabase aux Edge Functions.)

## 5. Variables frontend (build Vite)

Définissez dans votre environnement de build :

```
VITE_SUPABASE_URL=https://<votre-instance>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Sans ces variables, l'app reste fonctionnelle mais le bouton IA-1 et la
page `/admin/ai` affichent un bandeau « Supabase non configuré ».

## 6. Créer un utilisateur admin

1. Créez un utilisateur via l'UI Supabase Auth (Dashboard → Authentication
   → Add user) ou via `supabase auth users create`.
2. Assignez-lui le rôle `admin` dans `user_roles` :

```sql
insert into public.user_roles (user_id, role)
values ('<UUID-de-l-utilisateur>', 'admin');
```

3. Connectez-vous depuis l'app à `/admin/ai`. La page lit / édite
   `app_settings` et expose un bouton « Tester providers » qui appelle
   `ai-providers-test` (renvoie uniquement `keyPresent`, jamais la clé).

## 7. Vérification

- Sur `/admin/ai`, cliquez « Tester providers ». Vous devez voir au
  moins `Quatarly · keyPresent`.
- Sur `/cross-validation`, le bouton « Importer depuis screenshot
  (Strelok Pro) » doit apparaître.
- Importez une image de test : la modale guide l'opérateur sur 4 étapes
  (consentement → upload → analyse → revue manuelle obligatoire).

---

## Reset / désactivation

- Pour désactiver temporairement l'agent : passez `enabled = false` sur
  la ligne `cross-validation-strelok-rows` de `ai_agent_configs`.
- Pour bloquer le fallback Google : `ai.allow_google_fallback = false`
  dans `app_settings` (modifiable depuis `/admin/ai`).
- Pour révoquer un admin : `delete from public.user_roles where ...`.

## Sécurité

- L'anon key Supabase est publique par construction (RLS protège la
  base) — il est OK qu'elle apparaisse dans le bundle frontend.
- Les clés providers (`QUATARLY_API_KEY`, `GOOGLE_AI_API_KEY`) **ne
  doivent jamais** être committées : uniquement `supabase secrets set`.
- Les screenshots sont envoyés en base64 à votre Supabase puis au
  provider configuré. Aucun stockage permanent : les Edge Functions
  ne persistent que les **métadonnées** de run dans `ai_agent_runs`.