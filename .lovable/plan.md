## Objectif

Permettre l'import idempotent du fichier `chairgun_final_supabase_import.json` (~1944 réticules ChairGun) dans la table `public.chairgun_reticles_catalog` de votre Supabase self-hosted, via la `service_role` key (option 1, sans ouvrir Postgres au monde extérieur).

## Fichiers modifiés / créés

### 1. `docs/migrations/20260424-chairgun-reticles-catalog.sql` — modifié

Ajouter la colonne `vendor` au DDL existant (le JSON contient ce champ, absent du schéma actuel) :

```sql
CREATE TABLE IF NOT EXISTS public.chairgun_reticles_catalog (
  id              serial PRIMARY KEY,
  reticle_id      integer NOT NULL UNIQUE,
  name            text NOT NULL,
  vendor          text,                       -- ← NOUVEAU
  focal_plane     text CHECK (focal_plane IN ('FFP','SFP')),
  unit            text CHECK (unit IN ('MRAD','MIL','MOA','CM/100M')),
  true_magnification numeric,
  elements        jsonb NOT NULL DEFAULT '[]'::jsonb,
  element_count   integer GENERATED ALWAYS AS (jsonb_array_length(elements)) STORED,
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

Et — pour les VM où la migration a déjà été appliquée sans `vendor` — ajouter en bas du fichier un bloc idempotent :

```sql
ALTER TABLE public.chairgun_reticles_catalog
  ADD COLUMN IF NOT EXISTS vendor text;
CREATE INDEX IF NOT EXISTS idx_cg_reticles_vendor
  ON public.chairgun_reticles_catalog(vendor);
```

Aucun fichier verrouillé n'est touché. Cette migration vit hors de `supabase/migrations/` (volontairement, par contrainte BUILD existante) — vous l'exécuterez manuellement sur la VM.

### 2. `scripts/import-chairgun-reticles.ts` — nouveau

Script Node/Bun qui lit le JSON, valide chaque ligne avec Zod, et upsert par paquets de 200 via `@supabase/supabase-js` sur la clé `service_role`. Idempotent grâce à `onConflict: 'reticle_id'`.

Caractéristiques :
- **Variables d'env requises** : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (lues via `process.env`, jamais loggées).
- **Validation Zod** par item — une ligne invalide est skippée et reportée, le reste passe.
- **Chunking 200** pour éviter les payloads >5 MB sur PostgREST.
- **Mode `--dry-run`** : valide + parse + groupe sans écrire (pour tester).
- **Récap final** : `ok / skipped / failed` + temps total + nombre de réticules en base avant/après.
- **Exit code non-zéro** si au moins un chunk échoue (CI-friendly).

Squelette :

```ts
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const RowSchema = z.object({
  reticle_id: z.number().int().positive(),
  name: z.string().min(1),
  vendor: z.string().optional().nullable(),
  focal_plane: z.enum(['FFP', 'SFP']).optional().nullable(),
  unit: z.enum(['MRAD', 'MIL', 'MOA', 'CM/100M']).optional().nullable(),
  true_magnification: z.number().optional().nullable(),
  elements: z.array(z.unknown()),
});

// 1. Vérifier env vars (fail fast si absentes)
// 2. Lire et JSON.parse le fichier (chemin = argv[2] || défaut /tmp/...)
// 3. Compter avant: SELECT count(*) FROM chairgun_reticles_catalog
// 4. Boucle par chunks de 200 → upsert(onConflict:'reticle_id')
// 5. Compter après + récap stdout
```

### 3. `package.json` — modifié

Ajouter un script npm pour usage clair :

```json
"scripts": {
  "import:chairgun-reticles": "bun run scripts/import-chairgun-reticles.ts"
}
```

`@supabase/supabase-js` et `zod` sont déjà dans les dépendances du projet, pas d'installation supplémentaire.

## Procédure d'exécution (côté utilisateur, après merge)

```bash
# 1. Sur la VM, appliquer la migration (ou juste l'ALTER si table existante)
psql -U postgres -d postgres -f docs/migrations/20260424-chairgun-reticles-catalog.sql

# 2. Localement, exporter les credentials
export SUPABASE_URL="https://supabase.votre-domaine"
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."   # depuis Supabase Studio → Settings → API

# 3. Dry-run de validation
bun run scripts/import-chairgun-reticles.ts ./chairgun_final_supabase_import.json --dry-run

# 4. Import réel
bun run scripts/import-chairgun-reticles.ts ./chairgun_final_supabase_import.json
```

## Vérification post-import

```sql
SELECT count(*) FROM public.chairgun_reticles_catalog;             -- ~1944
SELECT focal_plane, unit, count(*) FROM public.chairgun_reticles_catalog
  GROUP BY 1,2 ORDER BY 1,2;
SELECT vendor, count(*) FROM public.chairgun_reticles_catalog
  GROUP BY 1 ORDER BY 2 DESC LIMIT 10;
```

## Hors scope (non touché)

- Aucune modif des modules verrouillés (`src/lib/ballistics/`, `ChairGunScopeView.tsx`, `auth-context.tsx`, `library-supabase-repo.ts`).
- Pas de copie du JSON dans le repo (852k lignes, ~50 MB) — il reste un artefact opérationnel à fournir à l'exécution du script.
- Pas de modification de `supabase/migrations/` (interdit par contrainte BUILD existante).
- Pas de UI admin pour déclencher l'import — opération one-shot CLI.

## Risques & mitigations

| Risque | Mitigation |
|---|---|
| Service_role leak | Variable d'env locale uniquement, jamais committée, jamais loggée par le script |
| Payload trop gros | Chunking 200 lignes (testé safe sur PostgREST) |
| Réimport accidentel = doublons | `upsert(onConflict:'reticle_id')` rend l'opération rejouable |
| Lignes JSON malformées | Validation Zod par item, skip + log, ne casse pas l'import global |
| Migration partiellement appliquée sur certaines VM | Bloc `ADD COLUMN IF NOT EXISTS` idempotent en bas du fichier |
