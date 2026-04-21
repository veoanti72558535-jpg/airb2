-- =============================================================================
-- AirBallistik — IA-2a : extensions additives pour alignement Bouzidi
-- =============================================================================
--
-- Phase 1 du plan d'alignement IA. Migration strictement ADDITIVE :
--   * Nouveaux settings : rate limiting Google, Ollama
--   * Nouvelles colonnes sur ai_agent_configs : budget_guardrails, allowed_job_types
--   * Nouvelles colonnes sur ai_usage_events : tokens, budget tracking, request_count
--   * Index additionnel pour le rate limiter (provider + created_at)
--
-- Aucune suppression, aucun rename, aucune modification de colonne existante.
-- Safe à rejouer grâce aux IF NOT EXISTS / ON CONFLICT DO NOTHING.
-- =============================================================================

-- 1) Nouveaux settings — rate limiting Google free tier
INSERT INTO public.app_settings (key, value) VALUES
  ('ai.google_direct_max_requests_per_day', '20'::jsonb),
  ('ai.google_direct_max_pdf_jobs_per_day', '3'::jsonb),
  ('ai.google_direct_max_pages_per_job',    '5'::jsonb),
  ('ai.google_direct_max_concurrency',      '1'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2) Nouveaux settings — Ollama (LAN)
INSERT INTO public.app_settings (key, value) VALUES
  ('ai.ollama_enabled',       'false'::jsonb),
  ('ai.ollama_base_url',      '"http://localhost:11434"'::jsonb),
  ('ai.ollama_default_model', '"qwen3:14b"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 3) Colonnes additives sur ai_agent_configs (budget guardrails)
ALTER TABLE public.ai_agent_configs
  ADD COLUMN IF NOT EXISTS budget_guardrails jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.ai_agent_configs
  ADD COLUMN IF NOT EXISTS allowed_job_types jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 4) Colonnes additives sur ai_usage_events (tokens + budget tracking)
ALTER TABLE public.ai_usage_events
  ADD COLUMN IF NOT EXISTS estimated_input_tokens  int DEFAULT 0;

ALTER TABLE public.ai_usage_events
  ADD COLUMN IF NOT EXISTS estimated_output_tokens int DEFAULT 0;

ALTER TABLE public.ai_usage_events
  ADD COLUMN IF NOT EXISTS blocked_by_budget boolean NOT NULL DEFAULT false;

ALTER TABLE public.ai_usage_events
  ADD COLUMN IF NOT EXISTS reason text;

ALTER TABLE public.ai_usage_events
  ADD COLUMN IF NOT EXISTS request_count int NOT NULL DEFAULT 1;

-- 5) Index pour le rate limiter Google (comptage quotidien par provider)
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_provider_created
  ON public.ai_usage_events (provider, created_at DESC);

-- =============================================================================
-- Fin IA-2a — aucune donnée existante modifiée, aucune colonne supprimée.
-- =============================================================================
