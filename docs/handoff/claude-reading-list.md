# AIRBALLISTIK — READING LIST POUR CLAUDE

> Fichiers à lire en priorité pour reprendre le projet.
> Ordre recommandé : lire dans l'ordre numéroté.
> **SdV** = Source de Vérité, **Ctx** = Contexte secondaire.

---

## Tier 1 — Lire en premier (compréhension globale)

| # | Fichier | Pourquoi | Type |
|---|---------|----------|------|
| 1 | `docs/handoff/claude-handoff-airballistik.md` | Vue d'ensemble projet, état, plan | SdV |
| 2 | `docs/handoff/claude-guardrails.md` | Interdictions et contraintes | SdV |
| 3 | `docs/ai/ia2f-cloud-validation-runbook.md` | Runbook validation dispatcher — prochaine étape | SdV |
| 4 | `.lovable/plan.md` | Plan courant (peut être périmé, croiser avec handoff) | Ctx |

## Tier 2 — Backend IA (Edge Functions + migrations)

| # | Fichier | Pourquoi | Type |
|---|---------|----------|------|
| 5 | `supabase/migrations/20260420000000_ia1_init.sql` | Schéma DB : tables, RLS, seed agent | SdV |
| 6 | `supabase/migrations/20260421000000_ia2_dispatch.sql` | Extensions schéma pour dispatcher | SdV |
| 7 | `supabase/functions/ai-extract-rows/index.ts` | Edge Function IA-1 — **NE PAS MODIFIER** | SdV |
| 8 | `supabase/functions/ai-provider-dispatch/index.ts` | Dispatcher générique — code de référence | SdV |
| 9 | `supabase/functions/ai-providers-test/index.ts` | Diagnostic providers | SdV |
| 10 | `supabase/functions/_shared/auth.ts` | Auth JWT + rôle admin | SdV |
| 11 | `supabase/functions/_shared/providers.ts` | Appels Quatarly, Google, Ollama | SdV |
| 12 | `supabase/functions/_shared/settings.ts` | Lecture settings + config agents | SdV |
| 13 | `supabase/functions/_shared/logging.ts` | Logging runs + events | SdV |
| 14 | `supabase/functions/_shared/rate-limit.ts` | Quota daily Google | SdV |
| 15 | `supabase/functions/_shared/quatarly-url.ts` | Construction URL Quatarly | Ctx |
| 16 | `supabase/functions/_shared/cors.ts` | CORS + jsonResponse | Ctx |

## Tier 3 — Frontend IA

| # | Fichier | Pourquoi | Type |
|---|---------|----------|------|
| 17 | `src/lib/ai/edge-client.ts` | Client frontend → Edge Functions | SdV |
| 18 | `src/lib/ai/strelok-rows.ts` | Parsing réponse IA Strelok | SdV |
| 19 | `src/components/cross-validation/AIImportModal.tsx` | UI import screenshot IA | SdV |
| 20 | `src/pages/AdminAiPage.tsx` | Page admin IA (config + runbook) | SdV |

## Tier 4 — Contexte secondaire (lire si besoin)

| # | Fichier | Pourquoi | Type |
|---|---------|----------|------|
| — | `src/lib/types.ts` | Types métier (Airgun, Projectile, Session, etc.) | SdV |
| — | `src/lib/translations.ts` | Clés i18n FR/EN | Ctx |
| — | `src/App.tsx` | Routes de l'application | Ctx |
| — | `src/lib/ballistics/engine.ts` | Moteur balistique (hors scope IA) | Ctx |
| — | `docs/ai/ia-1-runbook.md` | Runbook déploiement IA-1 self-hosted | Ctx |
| — | `docs/ai/ia-1-audit.md` | Audit sécurité IA-1 | Ctx |
| — | `supabase/config.toml` | Config Supabase self-hosted | Ctx |
| — | `.lovable/memory/index.md` | Mémoire projet Lovable | Ctx |

---

## Règle de lecture

1. Lire Tier 1 intégralement
2. Lire Tier 2 si la tâche touche au backend IA
3. Lire Tier 3 si la tâche touche au frontend IA
4. Lire Tier 4 uniquement si nécessaire pour la tâche en cours
5. **Ne pas scanner le reste du repo** sauf demande explicite