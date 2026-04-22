

# Fix: Invalid integer syntax in shot-line-explainer migration

## Problem
The `prompt_version` column in `ai_agent_configs` is typed `integer`. The SQL INSERT for `shot-line-explainer` passes `'1.0'` — a decimal string that PostgreSQL cannot cast to integer.

## Fix
Change `'1.0'` to `1` in the migration file `supabase/migrations/20260422000001_ia2f1_shot_line_explainer.sql`.

**Before:** `'1.0',`
**After:** `1,`

## Scope
- Single value change in one migration file
- No other files affected

## After the fix
Re-run the INSERT in the Supabase Cloud SQL Editor with the corrected value.

