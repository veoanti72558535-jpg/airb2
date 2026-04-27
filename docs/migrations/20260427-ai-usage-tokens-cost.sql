-- Adds optional token / cost tracking columns to ai_agent_runs.
-- Required by Admin → Usage & quotas panel for accurate per-agent
-- token and cost rollups. Until applied, the panel falls back to
-- displaying "—" with a clearly-marked "schema pending" alert.
--
-- Idempotent: safe to re-run.

ALTER TABLE public.ai_agent_runs
  ADD COLUMN IF NOT EXISTS tokens_in   integer,
  ADD COLUMN IF NOT EXISTS tokens_out  integer,
  ADD COLUMN IF NOT EXISTS cost_usd    numeric(10, 6);

COMMENT ON COLUMN public.ai_agent_runs.tokens_in
  IS 'Prompt tokens billed by the provider for this run.';
COMMENT ON COLUMN public.ai_agent_runs.tokens_out
  IS 'Completion tokens billed by the provider for this run.';
COMMENT ON COLUMN public.ai_agent_runs.cost_usd
  IS 'Estimated USD cost for this run (provider-billed, may be NULL).';

-- Light index on cost for cost-explorer queries (optional).
CREATE INDEX IF NOT EXISTS idx_ai_agent_runs_cost
  ON public.ai_agent_runs(cost_usd)
  WHERE cost_usd IS NOT NULL;
