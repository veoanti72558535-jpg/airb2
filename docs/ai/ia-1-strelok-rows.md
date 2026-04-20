# IA-1 — Strelok Pro screenshot → rows JSON

## Scope strict

- **Source unique** : Strelok Pro (versions ≥ 6.x).
- **Un seul screenshot** par appel (PNG / JPEG / WEBP, ≤ 4 Mo).
- **Rows-only** : on n'extrait que les lignes de la table balistique
  (range / drop / velocity / windDrift / tof / energy).
- **Aucune extraction des inputs** (MV, BC, zéro, atmosphère) — IA-1
  ne touche pas à la configuration balistique.
- **Revue humaine obligatoire** avant toute persistance.
- **Confiance plafonnée à `C`** côté schéma utilisateur, indépendamment
  de la confiance auto-rapportée par le modèle.
- **Aucune comparaison automatique** au moteur après extraction.
- **Aucune persistance avant confirmation** explicite de l'opérateur.

## Hors scope IA-1 (ne sera PAS livré dans cette tranche)

- ChairGun / ChairGun Elite OCR.
- MERO OCR (gardé pour plus tard, derrière les MERO exposure gates).
- Multi-image / multi-page.
- Extraction d'inputs (MV, BC, atmosphère, zéro…).
- Comparaison automatique post-extraction.
- Pipeline batch / queue.

## Architecture

```
 Frontend (React)         Supabase self-hosted             Provider
┌──────────────┐  POST   ┌────────────────────────┐       ┌──────────┐
│ AIImportModal│ ──────▶ │ Edge: ai-extract-rows  │ ────▶ │ Quatarly │
│ (consent →   │  JWT    │   - requireAdmin()     │       │  (primary│
│  upload →    │         │   - readAgentConfig()  │  fb   │   model) │
│  analyze →   │         │   - call Quatarly      │ ────▶ │ Google   │
│  review →    │         │   - fallback Google    │       │ (Generative
│  CONFIRM)    │         │   - validate Zod draft │       │ Language)│
└──────────────┘         │   - log ai_agent_runs  │       └──────────┘
                         └────────────────────────┘
```

## Garde-fous

- **Bouton caché** tant que `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
  ne sont pas définis (`isSupabaseConfigured()` renvoie `false`).
- **Rôle `admin`** vérifié côté Edge Function via `has_role()`
  (security definer) — un user non-admin obtient `403`.
- **Bandeau permanent** « Brouillon IA non vérifié » durant la revue.
- **Mapping rows → UserReferenceRow** sans aucune conversion d'unité.
- **`buildAINotes()`** fige `runId`, `provider`, `model`, `promptVersion`,
  `fallbackUsed` dans `meta.notes` pour traçabilité.

## Fallback manuel

Si Supabase n'est pas configuré OU si le bouton IA est désactivé OU si
l'extraction échoue, l'opérateur conserve la voie manuelle :

1. « + Nouveau cas » → onglet Références.
2. « Coller TSV/CSV » (modale `PasteRowsModal`) ou édition ligne par
   ligne.
3. Choisir `extractionMethod = manual-entry` ou `screenshot-retyped`.

Cette voie reste 100% fonctionnelle indépendamment d'IA-1.

## Tests

- `src/lib/ai/strelok-rows.test.ts` — schéma Zod, MIME allow-list,
  mapping sans conversion, erreur typée si Supabase absent.
- `src/components/cross-validation/AIImportModal.test.tsx` — flux
  consent → review → confirm, image trop volumineuse, abandon =
  zéro persistance, plafond confiance `C`.
- `src/lib/cross-validation/screenshot-ai-additive.test.ts` —
  garantit que `'screenshot-ai'` est strictement additif vis-à-vis
  des méthodes historiques.

## Limites connues

- Si Quatarly retourne 429/402, on tente Google (si autorisé) puis on
  surface un toast utilisateur.
- Le modèle peut halluciner des lignes : c'est le rôle de la revue
  obligatoire de filtrer.
- Aucune cache : chaque screenshot est ré-envoyé.