

## Plan : Base de données de projectiles préconfigurés

Mise en miroir de ce qui existe déjà pour les optiques (`SEED_OPTICS` + `ImportPresetOpticsModal`), je vais créer un dataset de projectiles populaires (pellets + slugs) pour les 4 calibres airgun et un modal d'import dans la page Bibliothèque > Projectiles.

### Sources de données

Données BC publiées par fabricants et tests indépendants :
- **HardAir Magazine** ([ballistic-coefficients](https://hardairmagazine.com/ballistic-coefficients/)) — mesures G1 indépendantes
- **JSB / Predator (Polymag)** — fiches fabricant
- **H&N Sport** ([h-n-sport.de](https://www.h-n-sport.de/)) — BC publiés par calibre
- **Crosman / Benjamin** — fiches Domed/Hollow
- **FX Hybrid / Air Venturi / NSA / Patriot Javelin / ZAN slugs** — fiches slugs
- **Air Arms Diabolo Field** — pellet match

### Couverture cible (~80–100 entrées)

| Calibre | Pellets | Slugs |
|---|---|---|
| .177 (4.50 mm) | JSB Exact 8.44, Diabolo 10.34, Heavy 10.34, Hades 10.34, AA Diabolo Field 8.44, H&N FTT 8.64, H&N Baracuda 10.65, Crosman Premier 7.9 / 10.5… | NSA 13gr, FX Hybrid 13gr |
| .22 (5.50 / 5.52 mm) | JSB Exact 14.35 / 15.89 / 18.13 / Heavy 18.13 / Hades 15.89 / Monster 25.39, AA Diabolo Field 16, H&N FTT 14.66 / Baracuda 21.14 / Sniper Magnum 24.38, Predator Polymag 16.0… | NSA 23.4 / 25.5 / 28 / 30, FX Hybrid 22, Patriot Javelin 25, Air Venturi 23 / 25, ZAN 25 / 30 |
| .25 (6.35 mm) | JSB Exact King 25.39 / Heavy 33.95 / Monster 33.95 / Hades 26.54, H&N Baracuda 31.02 / Slug HP II 34, Predator Polymag 26.83… | NSA 36 / 41 / 44 / 47 / 50 / 53, FX Hybrid 36, Air Venturi 36, ZAN 33 / 36 / 41 / 47 |
| .30 (7.62 mm) | JSB Exact 44.75 / 50.15 (rare en pellet pur) | NSA 44 / 50 / 57 / 63 / 70.5, FX Hybrid 44.75, Patriot Javelin 50, Air Venturi 44 / 50 |

Chaque entrée inclut : `brand`, `model`, `weight` (gr), `bc` + `bcModel` (G1), `caliber`, `projectileType` ('pellet' | 'slug'), `shape` (domed/hollow/slug…), `diameter` (mm), `length` (mm si publié), `material` ('lead' / 'alloy'), `dataSource` (URL/source) et `notes` (FPE recommandée, usage cible).

### Implémentation

**Fichiers créés**
1. `src/lib/seed-projectiles.ts` — exporte `SEED_PROJECTILES: SeedProjectile[]` et `SeedProjectile = Omit<Projectile, 'id'|'createdAt'|'updatedAt'>`. Organisé par sections de commentaires (calibre + brand), avec `dataSource` pointant vers la source par entrée.
2. `src/components/projectiles/ImportPresetProjectilesModal.tsx` — copié/adapté depuis `ImportPresetOpticsModal` :
   - Filtres : marque (JSB, H&N, Air Arms, Crosman, Predator, NSA, FX, Air Venturi, Patriot, ZAN) + calibre (.177/.22/.25/.30) + type (pellet/slug)
   - Recherche texte sur `brand model`
   - Détection des doublons via clé `brand|model|weight|caliber`
   - Badges : calibre, poids, BC (G1), type
   - Bouton "Tout sélectionner / désélectionner"

**Fichiers modifiés**
3. `src/pages/ProjectilesPage.tsx` — ajout d'un bouton **"Importer projectiles"** à côté de **"Ajouter"**, ouvre le modal, refresh la liste après import.
4. `src/lib/translations.ts` — clés FR/EN :
   - `projectiles.importPreset`, `projectiles.importTitle`, `projectiles.importDesc`
   - `projectiles.importSelected`, `projectiles.importDone`, `projectiles.alreadyExists`
   - `projectiles.filterType`, `projectiles.typePellet`, `projectiles.typeSlug`

### Notes techniques

- Les BC seront marqués `bcModel: 'G1'` (par défaut, conforme au type `Projectile`).
- Les valeurs sont des moyennes publiées — un disclaimer dans `importDesc` invite à valider via chrony + tirs réels (cohérent avec le ton existant pour les optiques).
- Aucun changement aux types ni au store : `projectileStore.create()` accepte déjà ce shape.
- Le champ `dataSource` existe déjà sur `Projectile` (visible plus tard dans `ProjectileDetailPage` si tu veux l'afficher — non couvert ici).

### Diagramme d'architecture

```text
SEED_PROJECTILES (seed-projectiles.ts)
        │
        ▼
ImportPresetProjectilesModal ──► projectileStore.create(...)
        ▲                              │
        │                              ▼
ProjectilesPage  ◄──── refresh ──── localStorage
```

