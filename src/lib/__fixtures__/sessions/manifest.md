# Golden Fixtures — P3.2

Ces fixtures sont le **contrat métier de non-régression** du moteur balistique.
Chaque snapshot est produit par `calculateTrajectory(input)` en mode legacy
(profil par défaut, intégrateur Euler, atmosphère ICAO-simple). Toute
modification du moteur qui change un seul nombre ici déclenche un test
rouge — par construction, c'est soit un bug, soit une décision explicite
qui doit être documentée et le snapshot regénéré (`vitest -u`).

Les inputs vivent dans `fixtures.ts` (TypeScript) plutôt que JSON, pour
bénéficier du type-checking contre `BallisticInput` à chaque refactor.

## Couverture

| ID | Calibre | Type | MV (m/s) | Poids (gr) | Zero (m) | Max (m) | Conditions |
|---|---|---|---|---|---|---|---|
| 01-22-pellet-30m-std | .22 | pellet | 280 | 18 | 30 | 60 | ICAO standard |
| 02-22-slug-100m-std | .22 | slug | 320 | 25 | 50 | 100 | ICAO standard |
| 03-25-heavy-75m-altitude | .25 | pellet | 270 | 33 | 40 | 80 | Altitude 1500m |
| 04-30-long-range-150m | .30 | slug | 290 | 50 | 100 | 150 | Longue distance |
| 05-177-fieldtarget-25m | .177 | pellet | 240 | 8.4 | 25 | 50 | Field target |
| 06-22-cold-dry | .22 | pellet | 280 | 18 | 30 | 60 | -10°C / 20% RH |
| 07-22-hot-humid | .22 | pellet | 280 | 18 | 30 | 60 | 35°C / 90% RH |
| 08-25-slug-altitude-1500 | .25 | slug | 280 | 38 | 50 | 100 | Altitude + crosswind 5 m/s |

## Métriques verrouillées (par fixture × 5 distances)

- `drop` (mm)
- `holdover` (MOA)
- `holdoverMRAD`
- `velocity` (m/s)
- `energy` (J)
- `windDrift` (mm)

## Profil utilisé

Toutes les fixtures sont calculées en **legacy** (Euler dt=5e-4,
ICAO-simple, Cd piecewise). Le profil MERO est testé séparément par
`cross-profile.test.ts` qui produit un rapport de deltas informatif sans
gate.

## Quand regénérer ?

Si une décision moteur change volontairement un calcul (correction de bug
physique, par exemple), regénérer les snapshots avec :

```
npx vitest run src/lib/__fixtures__/sessions/golden -u
```

Et **documenter le diff dans le commit message** — c'est le contrat
d'audit du produit.

## Cross-profile delta log

Le fichier `cross-profile-deltas.md` est régénéré à chaque exécution de la
suite de tests par `cross-profile.test.ts`. Il liste, pour chaque fixture,
les deltas legacy → MERO sur les mêmes 6 métriques. Pas de gate, juste un
artefact d'audit visuel committable.
