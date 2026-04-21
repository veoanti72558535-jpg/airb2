# AIRBALLISTIK — GUARDRAILS POUR CLAUDE

> Contraintes **non négociables**. À relire avant chaque tranche.

---

## INTERDICTIONS ABSOLUES

### Code IA
- ❌ **Ne pas modifier `ai-extract-rows`** — sous aucun prétexte, jamais
- ❌ **Ne pas modifier `ai-providers-test`** — sauf demande explicite
- ❌ **Ne pas modifier `ai-provider-dispatch`** — sauf BUILD-IA2f explicite
- ❌ **Ne pas migrer `cross-validation-strelok-rows`** vers le dispatcher
- ❌ **Ne pas créer de nouvelle Edge Function** sans demande explicite
- ❌ **Ne pas lancer BUILD-IA2f** tant que la validation runtime n'est pas 13/13

### Moteur balistique
- ❌ **Ne pas modifier le moteur balistique** sauf demande explicite
- ❌ **Ne pas introduire d'IA dans les calculs** — le moteur est 100 % déterministe

### Architecture
- ❌ **Ne pas utiliser Lovable Cloud** — le projet utilise Supabase (self-hosted cible, Cloud temporaire)
- ❌ **Ne pas supposer que la VM self-hosted est prête** — migration reportée
- ❌ **Ne pas introduire de rôle `gerant`** — le rôle de référence est `admin`
- ❌ **Ne pas exposer le profil MERO** — prérequis non remplis
- ❌ **Ne pas proposer de big bang / refonte globale**

### Données
- ❌ **Ne pas supprimer de features existantes** silencieusement
- ❌ **Ne pas corrompre les données localStorage**
- ❌ **Ne pas inventer de précision scientifique** — pas de fake data

---

## OBLIGATIONS

- ✅ Petites tranches incrémentales, scope strict
- ✅ Données IA marquées `confidence = 'C'` (garde-fous humains)
- ✅ Traductions FR/EN pour tout nouveau texte UI
- ✅ Tests pour tout changement non trivial
- ✅ Compte rendu technique détaillé en fin de tranche
- ✅ Demander avant d'élargir le périmètre
- ✅ Vérifier que `ai-extract-rows` n'est pas affectée
- ✅ Préserver la voie manuelle (paste/JSON) à 100 %

---

## CONTEXTE SUPABASE

- **Cible finale** : self-hosted (VM Proxmox)
- **Temporaire accepté** : Supabase Cloud (pour validation runtime)
- Les secrets providers sont dans le dashboard Supabase (Edge Functions > Secrets)
- Les variables auto-injectées : `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Le frontend utilise `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (optionnels)

---

## PROCHAINE ÉTAPE

**Validation runtime du dispatcher sur Supabase Cloud** (runbook 13 critères).
Tant que ce n'est pas fait : pas de BUILD-IA2f, pas de nouvel agent, pas de migration.