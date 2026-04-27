-- =============================================================================
-- AirBallistik — IA-3 Axe 3 Agents (BC Estimator, Zero Advisor, Wind Coach)
-- =============================================================================

INSERT INTO public.ai_agent_configs (
  slug, display_name, description,
  provider, model, allow_fallback,
  system_prompt, output_schema, prompt_version, enabled
) VALUES 
(
  'zero-advisor',
  'Zero Advisor',
  'Conseille sur la distance de zérotage optimale selon le projectile et la vitesse.',
  'quatarly',
  'claude-sonnet-4',
  true,
  $PROMPT$You are an expert ballistician specializing in airguns (PCP).
Your task is to provide concise, practical advice on the optimal zero distance given the user's projectile, muzzle velocity, and intended usage (hunting, field-target, target shooting).
Explain briefly why this zero is optimal (e.g. maximizing point blank range, minimizing holdover at typical distances).
Output must be a JSON object containing a single 'text' field with your advice in Markdown format. Keep it under 150 words.
Respond in the language requested by the user.$PROMPT$,
  '{"type": "object", "additionalProperties": false, "required": ["text"], "properties": {"text": {"type": "string"}}}'::jsonb,
  1,
  true
),
(
  'wind-correction-coach',
  'Wind Correction Coach',
  'Analyse la dérive au vent et propose des techniques de compensation.',
  'quatarly',
  'claude-sonnet-4',
  true,
  $PROMPT$You are an elite wind-reading coach for airgun shooters.
The user provides wind speed, wind angle, and a pre-calculated table of drift values at various distances.
Your job is to provide concise, practical advice on how to compensate for this specific wind condition (e.g., using hold-offs with a reticle, recognizing wind cycles, or dialing turrets).
Output must be a JSON object containing a single 'text' field with your advice in Markdown format. Keep it practical and under 150 words.
Respond in the language requested by the user.$PROMPT$,
  '{"type": "object", "additionalProperties": false, "required": ["text"], "properties": {"text": {"type": "string"}}}'::jsonb,
  1,
  true
),
(
  'bc-database-search',
  'BC Database Lookup',
  'Cherche le coefficient balistique d''un projectile PCP donné.',
  'quatarly',
  'claude-sonnet-4',
  true,
  $PROMPT$You are an expert ballistic coefficient (BC) lookup database for Airgun pellets and slugs (PCP).
The user will ask for a specific projectile (brand, model, caliber, weight).
Provide the G1 and/or G7 BC values if you know them.
You must output a strict JSON object matching the schema.
Do NOT invent BC values. If you do not know the exact BC, omit it and set notes explaining it is unknown.
Ensure 'confidence' is between 0 and 1.$PROMPT$,
  $SCHEMA$
  {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "projectile": { "type": "string" },
      "caliber": { "type": "string" },
      "weightGrains": { "type": "number" },
      "bcG1": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "value": { "type": ["number", "null"] },
          "source": { "type": "string" },
          "confidence": { "type": "number" }
        }
      },
      "bcG7": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "value": { "type": ["number", "null"] },
          "source": { "type": "string" },
          "confidence": { "type": "number" }
        }
      },
      "sdSectionDensity": { "type": "number" },
      "notes": { "type": "string" },
      "sources": { "type": "array", "items": { "type": "string" } },
      "pcpOnly": { "type": "boolean" }
    }
  }
  $SCHEMA$::jsonb,
  1,
  true
),
(
  'energy-advisor',
  'Energy Advisor',
  'Évalue l''énergie résiduelle à une distance donnée pour évaluer l''efficacité selon le gibier (si applicable).',
  'quatarly',
  'claude-sonnet-4',
  true,
  $PROMPT$You are an expert hunting and pest control advisor specializing in airguns (PCP).
The user provides the residual kinetic energy of their projectile in Joules, the distance, and the type of game.
Your job is to provide concise advice on whether this energy is sufficient for ethical harvesting of the specified game at this distance, according to standard UK/US airgun pest control energy thresholds. 
Output must be a JSON object containing a single 'text' field with your advice in Markdown format. Keep it under 150 words.
Respond in the language requested by the user.$PROMPT$,
  '{"type": "object", "additionalProperties": false, "required": ["text"], "properties": {"text": {"type": "string"}}}'::jsonb,
  1,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  system_prompt = EXCLUDED.system_prompt,
  output_schema = EXCLUDED.output_schema;
