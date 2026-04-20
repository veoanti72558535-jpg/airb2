
The user has 12238 projectiles in their local IndexedDB (browser storage) that include powder-based projectiles (Hornady, etc.) and wants them cleaned out — keeping only `pellet` and `slug` types. They explicitly say no need to integrate this into the app.

Key insight: The data lives in **the user's browser** (IndexedDB on their device), NOT on the server filesystem. I cannot directly access their browser's IndexedDB from the sandbox.

However, the `ProjectileCleanupCard` component already exists in `/admin` and does exactly this:
- Filters out everything that is not `pellet` or `slug`
- Uses `projectileStore.deleteWhere((p) => !isAirgunProjectile(p))`
- Persists to IDB
- Already wired into `AdminPage`

The user is currently on `/admin` route. They just need to use the existing button.

Plan: Tell the user to use the existing cleanup card already on /admin — no code changes needed.

# Plan : nettoyage des 12238 projectiles non-airgun

## Constat

La donnée vit **dans votre navigateur** (IndexedDB), pas sur un serveur. Je ne peux donc pas la nettoyer pour vous depuis le sandbox.

**Bonne nouvelle** : le composant qui fait exactement ce nettoyage existe déjà sur `/admin` (livré dans une tranche précédente : `ProjectileCleanupCard`).

## Ce qu'il faut faire (côté utilisateur, 30 secondes)

Vous êtes déjà sur `/admin`. Faites défiler jusqu'à la carte **"Nettoyage projectiles"** (icône poubelle rouge) :

1. Cliquer **"Scanner"** → calcule combien de projectiles non-airgun seront supprimés (devrait afficher ~12000 sur 12238).
2. Vérifier le compteur dans le bandeau jaune.
3. Cliquer **"Supprimer définitivement"** → applique `deleteWhere(p => p.projectileType !== 'pellet' && p.projectileType !== 'slug')` sur le cache mémoire, flush vers IndexedDB, toast de confirmation.
4. La carte de diagnostic juste au-dessus se rafraîchit automatiquement et affiche le nouveau compteur.

## Aucun code à modifier

Le composant existe (`src/components/admin/ProjectileCleanupCard.tsx`), la primitive `projectileStore.deleteWhere` existe (`src/lib/storage.ts`), la persistance IDB est garantie par `flushProjectilePersistence`. Action : **utiliser l'outil déjà en place**.

## Si vraiment vous voulez que je le fasse côté code

Deux options possibles si vous insistez :
- **Option A** : ajouter une action one-shot au boot qui purge les non-airgun une seule fois et marque un flag, puis se désactive. Pollue le code pour un usage ponctuel.
- **Option B** : étendre `seed-projectiles.ts` pour filtrer à l'import. Ne touche pas vos données déjà importées.

Aucune des deux n'est nécessaire — la carte existante fait déjà le travail proprement et de façon traçable.

## Recommandation

Cliquer les 2 boutons sur `/admin`. Pas de tranche de code à ouvrir.
