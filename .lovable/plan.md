# P2 — Validé avec garde-fous renforcés

Le plan P2 (moteur MERO + intégrateur trapézoïdal) est approuvé et déjà livré.
Cette révision ajoute **5 garde-fous bloquants** avant toute exposition UI de MERO
(donc avant le sélecteur de profil prévu en P3).

## Garde-fous bloquants (avant P3 UI)

### 1. Migration sessions legacy — promue de P6 à pré-P3
- Avant tout sélecteur UI de moteur.
- `engineVersion` + `profileId` figés à la sauvegarde (déjà en place P1).
- Recalcul explicite uniquement, jamais silencieux.
- Badge UI sur les sessions calculées avec un moteur différent du courant.

### 2. Fixtures produit (non-régression métier)
- Jeu de sessions réelles sauvegardées en JSON sous `src/lib/__fixtures__/sessions/`.
- Snapshots stables sur : **zéro, holdover (MOA + MRAD), vitesse, énergie, dérive vent, clicks elev/wind**.
- Distincts du truth-set (physique) — ce sont les contrats produit.
- Tournent à chaque `npm test`.

### 3. Zero-solver cross-profile
- Matrice legacy × MERO sur :
  - distances de zéro : 10, 25, 50, 100 m
  - altitude : 0, 500, 2000 m
  - température : -10, 15, 35 °C
  - humidité : 0, 50, 100 %
  - projectiles : pellet léger longue distance, slug lourd lent, régime transsonique
- Tolérances documentées par cellule, pas globales.

### 4. Encapsulation stricte des 8 lois
- G1/G7/GA/GS exposés UI.
- RA4/GA2/SLG0/SLG1 : moteur uniquement.
- **Aucune fuite** via : API publique, import/export projectiles, JSON sessions, enums visibles utilisateur.
- Tant que la doc utilisateur n'est pas écrite.

### 5. Benches = indicateur, pas contrat
- `performance.now()` reste informatif.
- Pas de gate CI sur seuils ms absolus.
- Mode benchmark manuel ok, pas de fail automatique.

## Conséquence sur la roadmap

**P3 redéfini** = livrer les 5 garde-fous ci-dessus AVANT le sélecteur UI.
Le sélecteur UI + vent vectoriel + Newton zero-solver glissent en P3-bis ou P4.

## État P2

- Moteur : ✅ livré
- Profil MERO : ✅ enregistré beta, non exposé
- 8 lois : ✅ dans le moteur, 4 visibles UI
- Truth-set : ✅ 15 entrées, tolérances par profil
- Bench : ✅ informatif

## Prochain pas

Attendre approbation pour démarrer **P3 garde-fous** (migration sessions + fixtures + cross-zero + encapsulation audit).
