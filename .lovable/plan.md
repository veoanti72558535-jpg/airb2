# PLAN IA2f — Migration progressive des agents vers le dispatcher

## Statut : PLAN APPROUVÉ — En attente de validation runtime

## Décision clé

`ai-extract-rows` ne sera PAS migrée vers le dispatcher. IA2f = nouveaux agents uniquement via `ai-provider-dispatch`.

## Prochaine étape

Déployer migrations + Edge Functions sur Supabase Cloud, tester manuellement le dispatcher, puis BUILD-IA2f (premier agent concret via `queryAIViaEdge()`).

## Socle intouchable

- `ai-extract-rows`, `strelok-rows.ts`, `AIImportModal.tsx`, voie manuelle, `confidence = 'C'`

## BUILD-IA2f (après validation runtime)

1. Définir premier agent (`contextual-help` ou `session-summary`)
2. Migration SQL additive (INSERT dans `ai_agent_configs`)
3. Composant UI minimal appelant `queryAIViaEdge()`
4. Traductions FR/EN
5. Ne pas toucher à `ai-extract-rows` ni au moteur

## Hors scope

- Pas de migration `ai-extract-rows`
- Pas de nouvelle source / multi-image / refonte UI
- Pas de changement moteur / tolérances
- Pas de migration VM dans cette tranche

