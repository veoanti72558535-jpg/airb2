# Zero-solver validation matrix — Legacy vs MERO

_Auto-généré par `zero-solver-matrix.test.ts`. Audit de validation, **pas** une preuve physique absolue._

**But** : exercer le zero-solver sur une grille (zéro × altitude × température) et
mesurer le résidu de drop au point de zéro. Un résidu nul signifie que
l'angle de lancement trouvé met bien le projectile sur la ligne de visée à
la distance demandée.

**Tolérance** : |drop| > 5 mm = WARN (à surveiller, pas bloquant).
|drop| > 50 mm = FAIL (régression catastrophique, gate dur).

**Projectile de référence** : .22 pellet 18 gr @ 280 m/s, G1 BC 0.025,
sight height 40 mm. Conservé identique sur toutes les cellules pour que
la variation reflète uniquement (zéro, altitude, température).

**Total** : 72 cellules (36 legacy + 36 MERO).

## Profil Legacy

_36 cellules — 36 OK · 0 WARN · 0 FAIL · pire résidu absolu : 0 mm._

| zéro (m) | altitude (m) | température (°C) | résidu drop (mm) | statut |
|---|---|---|---|---|
| 10 | 0 | -10 | 0 | ✅ OK |
| 10 | 0 | 15 | 0 | ✅ OK |
| 10 | 0 | 35 | 0 | ✅ OK |
| 10 | 1000 | -10 | 0 | ✅ OK |
| 10 | 1000 | 15 | 0 | ✅ OK |
| 10 | 1000 | 35 | 0 | ✅ OK |
| 10 | 2000 | -10 | 0 | ✅ OK |
| 10 | 2000 | 15 | 0 | ✅ OK |
| 10 | 2000 | 35 | 0 | ✅ OK |
| 25 | 0 | -10 | 0 | ✅ OK |
| 25 | 0 | 15 | 0 | ✅ OK |
| 25 | 0 | 35 | 0 | ✅ OK |
| 25 | 1000 | -10 | 0 | ✅ OK |
| 25 | 1000 | 15 | 0 | ✅ OK |
| 25 | 1000 | 35 | 0 | ✅ OK |
| 25 | 2000 | -10 | 0 | ✅ OK |
| 25 | 2000 | 15 | 0 | ✅ OK |
| 25 | 2000 | 35 | 0 | ✅ OK |
| 50 | 0 | -10 | 0 | ✅ OK |
| 50 | 0 | 15 | 0 | ✅ OK |
| 50 | 0 | 35 | 0 | ✅ OK |
| 50 | 1000 | -10 | 0 | ✅ OK |
| 50 | 1000 | 15 | 0 | ✅ OK |
| 50 | 1000 | 35 | 0 | ✅ OK |
| 50 | 2000 | -10 | 0 | ✅ OK |
| 50 | 2000 | 15 | 0 | ✅ OK |
| 50 | 2000 | 35 | 0 | ✅ OK |
| 100 | 0 | -10 | 0 | ✅ OK |
| 100 | 0 | 15 | 0 | ✅ OK |
| 100 | 0 | 35 | 0 | ✅ OK |
| 100 | 1000 | -10 | 0 | ✅ OK |
| 100 | 1000 | 15 | 0 | ✅ OK |
| 100 | 1000 | 35 | 0 | ✅ OK |
| 100 | 2000 | -10 | 0 | ✅ OK |
| 100 | 2000 | 15 | 0 | ✅ OK |
| 100 | 2000 | 35 | 0 | ✅ OK |

## Profil MERO (beta)

_36 cellules — 36 OK · 0 WARN · 0 FAIL · pire résidu absolu : 0 mm._

| zéro (m) | altitude (m) | température (°C) | résidu drop (mm) | statut |
|---|---|---|---|---|
| 10 | 0 | -10 | 0 | ✅ OK |
| 10 | 0 | 15 | 0 | ✅ OK |
| 10 | 0 | 35 | 0 | ✅ OK |
| 10 | 1000 | -10 | 0 | ✅ OK |
| 10 | 1000 | 15 | 0 | ✅ OK |
| 10 | 1000 | 35 | 0 | ✅ OK |
| 10 | 2000 | -10 | 0 | ✅ OK |
| 10 | 2000 | 15 | 0 | ✅ OK |
| 10 | 2000 | 35 | 0 | ✅ OK |
| 25 | 0 | -10 | 0 | ✅ OK |
| 25 | 0 | 15 | 0 | ✅ OK |
| 25 | 0 | 35 | 0 | ✅ OK |
| 25 | 1000 | -10 | 0 | ✅ OK |
| 25 | 1000 | 15 | 0 | ✅ OK |
| 25 | 1000 | 35 | 0 | ✅ OK |
| 25 | 2000 | -10 | 0 | ✅ OK |
| 25 | 2000 | 15 | 0 | ✅ OK |
| 25 | 2000 | 35 | 0 | ✅ OK |
| 50 | 0 | -10 | 0 | ✅ OK |
| 50 | 0 | 15 | 0 | ✅ OK |
| 50 | 0 | 35 | 0 | ✅ OK |
| 50 | 1000 | -10 | 0 | ✅ OK |
| 50 | 1000 | 15 | 0 | ✅ OK |
| 50 | 1000 | 35 | 0 | ✅ OK |
| 50 | 2000 | -10 | 0 | ✅ OK |
| 50 | 2000 | 15 | 0 | ✅ OK |
| 50 | 2000 | 35 | 0 | ✅ OK |
| 100 | 0 | -10 | 0 | ✅ OK |
| 100 | 0 | 15 | 0 | ✅ OK |
| 100 | 0 | 35 | 0 | ✅ OK |
| 100 | 1000 | -10 | 0 | ✅ OK |
| 100 | 1000 | 15 | 0 | ✅ OK |
| 100 | 1000 | 35 | 0 | ✅ OK |
| 100 | 2000 | -10 | 0 | ✅ OK |
| 100 | 2000 | 15 | 0 | ✅ OK |
| 100 | 2000 | 35 | 0 | ✅ OK |

## Résumé

- Legacy : 36/36 OK · 0 WARN · 0 FAIL
- MERO   : 36/36 OK · 0 WARN · 0 FAIL

Les cellules WARN ne déclenchent pas d'échec de test. Elles sont
documentées ici pour qu'un reviewer humain puisse les inspecter avant
tout merge touchant au moteur.
