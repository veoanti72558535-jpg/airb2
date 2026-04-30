-- Cross-device sync of fine-grained unit preferences.
--
-- Until now `profiles` only persisted `unit_system` (metric|imperial). The
-- Préférences panel exposes per-category fine-tuning (velocity, distance,
-- length, energy, weight, pressure, temperature…) and number-formatting
-- options (decimals, scientific, grouping). Both are jsonb blobs that mirror
-- their TypeScript shape (`UnitPreferences`, `NumberFormatPrefs`) so we can
-- evolve the schema without an extra migration each time a category is added.
--
-- Idempotent: safe to re-run; uses IF NOT EXISTS.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS unit_preferences jsonb,
  ADD COLUMN IF NOT EXISTS number_format    jsonb;

COMMENT ON COLUMN public.profiles.unit_preferences IS
  'Per-category unit overrides ({ velocity: "fps", energy: "ftlbs", ... }). Display-only — never feeds the ballistic engine.';
COMMENT ON COLUMN public.profiles.number_format IS
  'Number formatting prefs ({ decimals, scientific, groupThousands }). Display-only.';
