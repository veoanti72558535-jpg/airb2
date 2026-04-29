-- ChairGun Elite reticles catalog (1944 réticules avec géométrie résolue)
-- À exécuter manuellement sur l'instance Supabase self-hosted (rôle: postgres ou admin migration).
-- Ne PAS placer dans supabase/migrations/ (intouchable selon contraintes BUILD).

CREATE TABLE IF NOT EXISTS public.chairgun_reticles_catalog (
  id              serial PRIMARY KEY,
  reticle_id      integer NOT NULL UNIQUE,
  name            text NOT NULL,
  vendor          text,
  focal_plane     text CHECK (focal_plane IN ('FFP','SFP')),
  unit            text CHECK (unit IN ('MRAD','MIL','MOA','CM/100M')),
  true_magnification numeric,
  elements        jsonb NOT NULL DEFAULT '[]'::jsonb,
  element_count   integer GENERATED ALWAYS AS (jsonb_array_length(elements)) STORED,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cg_reticles_unit
  ON public.chairgun_reticles_catalog(unit);
CREATE INDEX IF NOT EXISTS idx_cg_reticles_focal
  ON public.chairgun_reticles_catalog(focal_plane);
CREATE INDEX IF NOT EXISTS idx_cg_reticles_elements
  ON public.chairgun_reticles_catalog USING GIN (elements);

ALTER TABLE public.chairgun_reticles_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cg_reticles_read_all"
  ON public.chairgun_reticles_catalog FOR SELECT TO authenticated USING (true);

CREATE POLICY "cg_reticles_admin_write"
  ON public.chairgun_reticles_catalog FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Colonne favorite sur les réticules user
ALTER TABLE public.reticles
  ADD COLUMN IF NOT EXISTS favorite boolean DEFAULT false;

-- ── Idempotent fix-up pour les VM où la migration a déjà été appliquée
-- avant l'ajout de `vendor` (présent dans le JSON ChairGun officiel).
ALTER TABLE public.chairgun_reticles_catalog
  ADD COLUMN IF NOT EXISTS vendor text;
CREATE INDEX IF NOT EXISTS idx_cg_reticles_vendor
  ON public.chairgun_reticles_catalog(vendor);
