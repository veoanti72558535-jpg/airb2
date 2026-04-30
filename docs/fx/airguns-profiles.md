# Profils airguns FX — limites et comportement

> Source de vérité des bornes : `SI_BOUNDS` dans
> `supabase/functions/_shared/si-guardrail.ts`. Toute valeur en dehors de ces
> plages est rejetée par `validateBallisticInputSI()` **avant** appel au
> moteur (voir `src/lib/ballistic-compute-client.ts`).

## 1. Modèles FX reconnus

La marque `FX` est listée dans `src/lib/airgun-brands.ts`. Aucun modèle
spécifique n'est codé en dur : un airgun FX est un airgun défini par
l'utilisateur dont la marque est `FX`. Les plages ci-dessous s'appliquent donc
à **tous** les modèles (Impact M3, Maverick, Crown, Dreamline, Wildcat, etc.).

## 2. Plages validées (entrées utilisateur)

| Champ | Min | Max | Unité SI | Note |
|---|---:|---:|---|---|
| Vitesse initiale (`muzzleVelocity`) | 30 | 2000 | m/s | Couvre les sub-sonic .177 jusqu'aux gros calibres tunés haute pression |
| Coefficient balistique (`bc`, G1) | 0.001 | 1.5 | — | BC G1 typiques FX slugs : 0.05–0.20 |
| Masse projectile (`projectileWeight`) | 0.05 | 100 | g | Diabolos .177 ≈ 0.5 g ; slugs .30 ≈ 3 g |
| Hauteur d'optique (`sightHeight`) | 0 | 200 | mm | Mesurée axe canon → axe optique |
| Distance de zéro (`zeroRange`) | 1 | 3000 | m | |
| Portée max (`maxRange`) | 1 | 3000 | m | |
| Pas de table (`rangeStep`) | 0.1 | 500 | m | |
| Angle de tir (`slopeAngle`) | -90 | +90 | ° | Négatif = tir descendant |
| Latitude (`latitude`) | -90 | +90 | ° | Pour Coriolis |
| Azimut (`shootingAzimuth`) | 0 | 360 | ° | 0 = Nord |

### Plages atmosphériques

| Champ | Min | Max | Unité SI |
|---|---:|---:|---|
| Température (`temperature`) | -60 | +60 | °C |
| Humidité (`humidity`) | 0 | 100 | % |
| Pression (`pressure`) | 500 | 1100 | hPa |
| Altitude (`altitude`) | -500 | 9000 | m |
| Vitesse vent (`windSpeed`) | 0 | 100 | m/s |
| Angle vent (`windAngle`) | 0 | 360 | ° |

## 3. Erreurs utilisateur courantes

Les codes ci-dessous sont retournés par le guardrail SI. Les codes marqués
**hard** (`HARD_REJECTION_CODES` dans `ballistic-compute-client.ts`) bloquent
systématiquement le calcul. Les autres permettent un repli local-only avec
badge `SI · local-only (unverified)`.

| Code | Type | Cause typique | Message UI (FR) |
|---|---|---|---|
| `display-unit-detected` | hard | Une valeur en unité d'affichage (fps, gr, yd, °F, inHg) a été passée au moteur sans conversion | « Unité d'affichage détectée — convertir en SI avant calcul. » |
| `out-of-si-range` | hard | Valeur hors `SI_BOUNDS` (ex. 350 m/s saisis comme 1150 → interprétés comme fps) | « Valeur hors plage SI pour <champ>. » |
| `missing-required-field` | hard | `muzzleVelocity`, `bc`, `projectileWeight` ou `zeroRange` absent | « Champ requis manquant : <champ>. » |
| `non-finite` | hard | NaN, Infinity ou string non parsable | « Valeur numérique invalide. » |
| `no-supabase` | soft | Lovable Cloud désactivé | calcul local autorisé |
| `no-auth` | soft | Utilisateur non connecté | calcul local autorisé |
| `network-error` | soft | Edge function injoignable | calcul local autorisé |

## 4. Comportement en cas de correction météo manuelle

L'utilisateur peut **surcharger** chacun des quatre champs atmosphériques
(`temperature`, `pressure`, `altitude`, `humidity`) depuis `EnvironmentSection`,
que la valeur initiale provienne d'un fetch Open-Meteo ou d'une saisie vierge.
Le contrat est le suivant :

1. **Round-trip SI ↔ display garanti** — la saisie utilisateur est convertie
   en SI au moment du blur via `toRef(category, value)` puis re-convertie en
   unité d'affichage via `display(category, value)` à l'affichage suivant.
   Couvert par `src/lib/atmosphere-sync.test.ts`.
2. **La correction manuelle gagne toujours** sur la valeur fetchée. Aucune
   re-synchronisation automatique n'écrase une valeur saisie manuellement
   tant que l'utilisateur n'appuie pas explicitement sur « Resynchroniser
   météo ».
3. **Validation identique** — qu'elle vienne d'un fetch ou d'une saisie
   manuelle, la valeur passe par `validateBallisticInputSI()` avec les mêmes
   bornes. Une pression de 980 saisie en `inHg` (au lieu de `hPa`) est
   rejetée pour `out-of-si-range` plutôt que silencieusement utilisée.
4. **Densité d'air recalculée** à chaque modification — la densité ISA
   utilisée par le moteur (`src/lib/ballistics/atmosphere.ts`) est dérivée
   exclusivement des quatre champs SI, jamais d'une valeur fetchée mise en
   cache.
5. **Désynchronisation visible** — si une seule des quatre valeurs diffère
   du dernier fetch, le badge « Météo modifiée » apparaît et le timestamp
   « Synchronisé à HH:MM » est masqué pour éviter toute ambiguïté.

## 5. Cas limites documentés

- **Slug très lourd hors BC G1** — pour les très gros slugs FX au-delà de
  Mach 0.7, le modèle G1 sous-estime la traînée. Documenté dans
  [`docs/apk-analysis/limits-and-recommendations.md`](../apk-analysis/limits-and-recommendations.md).
  Le calcul reste autorisé tant que le BC est dans `[0.001, 1.5]`.
- **Altitude négative** (Mer Morte, mines) — autorisée jusqu'à -500 m. Au-delà
  : `out-of-si-range`.
- **Vent > 100 m/s** — refusé (au-delà du domaine météo terrestre crédible).
- **Latitude polaire** — Coriolis calculé jusqu'à ±90°, mais l'effet devient
  négligeable vis-à-vis de l'incertitude vent/BC sous 300 m.