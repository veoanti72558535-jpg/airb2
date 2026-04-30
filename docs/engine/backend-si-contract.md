# Contrat SI pour les endpoints balistiques (backend)

> **Statut** : normatif — bloquant pour tout endpoint dont le nom
> commence par `ballistic-` dans `supabase/functions/`.
> **Voir aussi** : `docs/engine/deterministic-contract.md`,
> `supabase/functions/_shared/si-guardrail.ts`,
> `src/lib/ballistic-endpoints-guardrail-coverage.test.ts`.

## 1. Règle d'or

> **Tout endpoint balistique applique le garde-fou SI partagé en
> PREMIER, avant toute autre validation, avant toute computation, avant
> toute écriture.**

Concrètement, dans `supabase/functions/ballistic-*/index.ts` :

```ts
import { applySiGuardrail } from '../_shared/si-guardrail.ts';
import { jsonResponse, corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const body = await req.json().catch(() => null);

  // ─── 1. GARDE-FOU SI — toujours en premier ───
  const guard = applySiGuardrail(body);
  if (!guard.ok) return jsonResponse(guard.error, guard.status);

  // À partir d'ici, `guard.payload` est garanti :
  //   • doté du sentinel `units: "SI"` au root
  //   • exempt de toute clé d'unité d'affichage à n'importe quelle profondeur
  const safeInput = guard.payload;

  // 2. Validation structurelle propre à l'endpoint (Zod, etc.)
  // 3. Bornes physiques SI optionnelles via findOutOfSiRange(...)
  // 4. Logique métier
});
```

## 2. Ce que le garde-fou refuse

| Cas | Code HTTP | Code réponse |
|---|---|---|
| Pas de sentinel `units: "SI"` au root | 400 | `missing-units-sentinel` |
| Clé suffixée d'unité (`*_fps`, `*_yd`, `*_gr`, `*_F`, `*_inHg`, `*_mph`, …) | 422 | `display-unit-detected` |
| Token interdit dans une clé camelCase (`muzzleVelocityFps`, `weightGrains`, …) | 422 | `display-unit-detected` |
| Valeur SI hors plage physique (ex. `muzzleVelocity: 2700` = manifestement des fps) | 422 | `out-of-si-range` |

Toutes les vérifications sont **récursives** : le garde-fou descend
dans les sous-objets et les tableaux. Il ignore uniquement la clé
`units` à la racine (le sentinel lui-même).

## 3. Tableau des bornes SI plausibles

Pour rappel, source unique de vérité dans
`supabase/functions/_shared/si-guardrail.ts → SI_BOUNDS` :

| Champ            | Min   | Max   | Unité SI       |
|------------------|-------|-------|----------------|
| muzzleVelocity   | 30    | 2000  | m/s            |
| bc               | 0.001 | 1.5   | sans dimension |
| projectileWeight | 0.05  | 100   | g              |
| sightHeight      | 0     | 200   | mm             |
| zeroRange        | 1     | 3000  | m              |
| maxRange         | 1     | 3000  | m              |
| rangeStep        | 0.1   | 500   | m              |
| temperature      | -60   | 60    | °C             |
| humidity         | 0     | 100   | %              |
| pressure         | 500   | 1100  | hPa            |
| altitude         | -500  | 9000  | m              |
| windSpeed        | 0     | 100   | m/s            |
| windAngle        | 0     | 360   | deg            |
| slopeAngle       | -90   | 90    | deg            |
| latitude         | -90   | 90    | deg            |
| shootingAzimuth  | 0     | 360   | deg            |

Toute extension du moteur qui ajoute un nouveau champ SI **doit
ajouter une entrée à ce tableau** ET le test de couverture
correspondant côté client (`ballistic-compute-guardrail.test.ts`).

## 4. Couverture automatique

Le test `src/lib/ballistic-endpoints-guardrail-coverage.test.ts`
scanne `supabase/functions/` et **fait échouer la suite** si un
endpoint dont le nom commence par `ballistic-` :

- ne déclare pas d'import depuis `_shared/si-guardrail.ts`,
- n'invoque pas `applySiGuardrail(...)` au moins une fois,
- ou redéclare en local des constantes (`FORBIDDEN_SUFFIXES`,
  `SI_BOUNDS`, …) qui doivent vivre dans le module partagé.

C'est un filet de sécurité automatique : ajouter un nouvel endpoint
balistique sans le garde-fou est impossible — la PR ne passe pas la CI.

## 5. Conséquences pour les contributeurs

- **Ne jamais** copier-coller la logique du garde-fou dans une nouvelle
  edge function : importer depuis `_shared/si-guardrail.ts`.
- **Ne jamais** appeler `inputSchema.parse()` ou `compute()` avant
  `applySiGuardrail()` — l'ordre est imposé.
- **Ne jamais** appliquer le garde-fou côté client comme substitut au
  serveur : c'est une *défense en profondeur*, pas une délégation. Le
  serveur reste la source de vérité du contrat.
- **Toujours** ajouter une entrée à `SI_BOUNDS` quand on étend le
  schéma SI, et un test côté client pour la borne.
