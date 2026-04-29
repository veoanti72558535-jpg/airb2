-- AI staging profile — mirror of `ai.*` keys used by the /admin/ai/simulation
-- page to validate provider/runbook/guardrail probes BEFORE rotating prod
-- configuration. Admin-only via existing RLS on `app_settings`.

INSERT INTO public.app_settings (key, value) VALUES
  ('ai.provider_primary.staging',                    '"quatarly"'::jsonb),
  ('ai.provider_model_primary.staging',              '"claude-sonnet-4"'::jsonb),
  ('ai.quatarly_api_url.staging',                    '"https://api.quatarly.ai/v1/chat/completions"'::jsonb),
  ('ai.allow_google_fallback.staging',               'true'::jsonb),
  ('ai.google_direct_enabled.staging',               'true'::jsonb),
  ('ai.google_direct_model.staging',                 '"gemini-2.5-flash"'::jsonb),
  ('ai.google_direct_max_requests_per_day.staging',  '5'::jsonb),
  ('ai.max_image_bytes.staging',                     '4194304'::jsonb),
  ('ai.ollama_enabled.staging',                      'false'::jsonb),
  ('ai.ollama_base_url.staging',                     '"http://localhost:11434"'::jsonb),
  ('ai.ollama_default_model.staging',                '"qwen3:14b"'::jsonb)
ON CONFLICT (key) DO NOTHING;
