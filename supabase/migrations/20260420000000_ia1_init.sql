-- =============================================================================
-- AirBallistik — IA-1 init (Supabase self-hosted)
-- =============================================================================
--
-- Tranche BUILD IA-1. Crée le socle minimal pour :
--   * rôles applicatifs (`app_role`, `user_roles`, `has_role()`)
--   * settings publics versionnés (`app_settings`)
--   * catalogue d'agents IA (`ai_agent_configs`)
--   * trace d'exécution + événements (`ai_agent_runs`, `ai_usage_events`)
--
-- Conformité plan IA-1 :
--   * provider primaire Quatarly + fallback Google Direct (configurables
--     en base, jamais en dur côté client) ;
--   * rôle minimal requis = 'admin' ;
--   * pas de Lovable Cloud, pas de Lovable AI Gateway ;
--   * uniquement extraction `rows[]` Strelok Pro (1 seul agent seedé).
--
-- À déployer avec `supabase db push` sur une instance self-hosted.
-- =============================================================================

-- 1) ENUM `app_role`
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
  END IF;
END$$;

-- 2) Table `user_roles` (rôles SÉPARÉS de profiles → pas d'escalade client)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3) `has_role()` SECURITY DEFINER (évite récursion RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

DROP POLICY IF EXISTS "user_roles_select_self" ON public.user_roles;
CREATE POLICY "user_roles_select_self" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "user_roles_admin_insert" ON public.user_roles;
CREATE POLICY "user_roles_admin_insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "user_roles_admin_delete" ON public.user_roles;
CREATE POLICY "user_roles_admin_delete" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4) `app_settings` — clé/valeur jsonb, lecture authentifiée, écriture admin
CREATE TABLE IF NOT EXISTS public.app_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings_read_auth" ON public.app_settings;
CREATE POLICY "app_settings_read_auth" ON public.app_settings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "app_settings_write_admin" ON public.app_settings;
CREATE POLICY "app_settings_write_admin" ON public.app_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5) `ai_agent_configs` — catalogue agents (admin only)
CREATE TABLE IF NOT EXISTS public.ai_agent_configs (
  slug              text PRIMARY KEY,
  display_name      text NOT NULL,
  description       text,
  provider          text NOT NULL,
  model             text NOT NULL,
  allow_fallback    boolean NOT NULL DEFAULT true,
  system_prompt     text NOT NULL,
  output_schema     jsonb NOT NULL,
  prompt_version    integer NOT NULL DEFAULT 1,
  enabled           boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_agent_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_agent_configs_admin_all" ON public.ai_agent_configs;
CREATE POLICY "ai_agent_configs_admin_all" ON public.ai_agent_configs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6) `ai_agent_runs` — audit trail
CREATE TABLE IF NOT EXISTS public.ai_agent_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_slug      text NOT NULL,
  provider        text NOT NULL,
  model           text NOT NULL,
  status          text NOT NULL,
  started_at      timestamptz NOT NULL DEFAULT now(),
  finished_at     timestamptz,
  latency_ms      integer,
  error_code      text,
  fallback_used   boolean NOT NULL DEFAULT false,
  output_jsonb    jsonb,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source_hash     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_agent_runs_user    ON public.ai_agent_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_runs_agent   ON public.ai_agent_runs(agent_slug);
CREATE INDEX IF NOT EXISTS idx_ai_agent_runs_started ON public.ai_agent_runs(started_at DESC);
ALTER TABLE public.ai_agent_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_agent_runs_admin_read" ON public.ai_agent_runs;
CREATE POLICY "ai_agent_runs_admin_read" ON public.ai_agent_runs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
-- Pas de policy INSERT/UPDATE pour authenticated → service_role uniquement.

-- 7) `ai_usage_events` — événements unitaires
CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id      uuid REFERENCES public.ai_agent_runs(id) ON DELETE CASCADE,
  event_type  text NOT NULL,
  provider    text,
  model       text,
  success     boolean,
  error_code  text,
  latency_ms  integer,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_run     ON public.ai_usage_events(run_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_created ON public.ai_usage_events(created_at DESC);
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_usage_events_admin_read" ON public.ai_usage_events;
CREATE POLICY "ai_usage_events_admin_read" ON public.ai_usage_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 8) Trigger updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_app_settings_touch ON public.app_settings;
CREATE TRIGGER trg_app_settings_touch BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_ai_agent_configs_touch ON public.ai_agent_configs;
CREATE TRIGGER trg_ai_agent_configs_touch BEFORE UPDATE ON public.ai_agent_configs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =============================================================================
-- 9) SEEDS — settings + 1 agent IA-1
-- =============================================================================
INSERT INTO public.app_settings (key, value) VALUES
  ('ai.provider_primary',        '"quatarly"'::jsonb),
  ('ai.provider_model_primary',  '"claude-sonnet-4"'::jsonb),
  ('ai.quatarly_api_url',        '"https://api.quatarly.ai/v1/chat/completions"'::jsonb),
  ('ai.allow_google_fallback',   'true'::jsonb),
  ('ai.google_direct_enabled',   'true'::jsonb),
  ('ai.google_direct_model',     '"gemini-2.5-flash"'::jsonb),
  ('ai.preferred_language',      '"fr"'::jsonb),
  ('ai.max_image_bytes',         '4194304'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.ai_agent_configs (
  slug, display_name, description,
  provider, model, allow_fallback,
  system_prompt, output_schema, prompt_version, enabled
) VALUES (
  'cross-validation-strelok-rows',
  'Strelok Pro — extraction lignes (IA-1)',
  'Extrait UNIQUEMENT les lignes de table balistique (range/drop/velocity/windDrift/tof/energy) depuis un screenshot Strelok Pro. JAMAIS d''inputs (MV/BC/zero/atmosphère). Brouillon obligatoirement relu.',
  'quatarly',
  'claude-sonnet-4',
  true,
  $PROMPT$You are an OCR + structuring assistant for ONE Strelok Pro ballistic table screenshot.

Your ONLY job:
- Read the visible table rows.
- Return a strict JSON object matching the provided schema.
- Extract per-row: range (REQUIRED), drop, velocity, windDrift, tof, energy.

Hard rules — violation = invalid output:
- NEVER invent a value. If a cell is unreadable, partially hidden, blurred, or you are not sure, OMIT the field on that row AND add a string entry to "unreadable" describing it (e.g. "rows[3].velocity: blurred digit").
- NEVER extract ballistic INPUTS (muzzle velocity, BC, sight height, zero, weight, atmosphere, wind). Even if visible. Inputs are out of scope for IA-1.
- NEVER guess column meaning. Only emit a field if you can identify the column header on screen with high confidence.
- Convention: drop in millimetres, range in metres, velocity in m/s, tof in seconds, windDrift in millimetres, energy in joules. If the screenshot uses other units (yards, ft/s, inches, MOA, mils...), DO NOT convert — instead OMIT and add an entry to "assumptions" describing the on-screen unit so the human reviewer can convert manually.
- "fieldConfidence" is mandatory for EVERY emitted field, in [0,1]. Use >=0.85 only when you are visually certain.
- Output ONLY the JSON object. No markdown, no commentary.

Output is a draft — a human will review every row before persistence.$PROMPT$,
  $SCHEMA$
  {
    "type": "object",
    "additionalProperties": false,
    "required": ["rows", "fieldConfidence", "unreadable", "assumptions"],
    "properties": {
      "rows": {
        "type": "array",
        "maxItems": 200,
        "items": {
          "type": "object",
          "additionalProperties": false,
          "required": ["range"],
          "properties": {
            "range":     { "type": "number", "minimum": 0 },
            "drop":      { "type": "number" },
            "velocity":  { "type": "number", "minimum": 0 },
            "windDrift": { "type": "number" },
            "tof":       { "type": "number", "minimum": 0 },
            "energy":    { "type": "number", "minimum": 0 }
          }
        }
      },
      "fieldConfidence": {
        "type": "object",
        "additionalProperties": { "type": "number", "minimum": 0, "maximum": 1 }
      },
      "unreadable": {
        "type": "array",
        "items": { "type": "string", "maxLength": 300 },
        "maxItems": 100
      },
      "assumptions": {
        "type": "array",
        "items": { "type": "string", "maxLength": 300 },
        "maxItems": 30
      }
    }
  }
  $SCHEMA$::jsonb,
  1,
  true
) ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- Bootstrap admin (à exécuter manuellement dans Studio après création user) :
--   INSERT INTO public.user_roles (user_id, role)
--   VALUES ('<UUID_DE_L_USER>', 'admin');
-- =============================================================================
