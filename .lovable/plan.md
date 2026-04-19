

## Analyse de la demande

L'utilisateur a uploadé `chairgun-elite-2.apk` et demande d'extraire les bases de données projectiles, optiques et réticules au format JSON spécifié précédemment.

## Faisabilité technique

L'extraction APK nécessite :
1. Décompression ZIP de l'APK
2. Inspection de `assets/`, `res/raw/`, `databases/`
3. Lecture des bases SQLite (`sqlite3` CLI ou Python `sqlite3`)
4. Parsing JSON/XML embarqués
5. Normalisation vers les schémas définis (Tranche D — sanitisation `bcModel`)
6. Conversions d'unités (grains, mm, m/s)
7. Génération des fichiers JSON + rapport markdown

Tous ces outils sont disponibles dans le sandbox Lovable (`unzip`, `python3` avec `sqlite3`, `jq`). C'est exactement le cas d'usage "non-build task" couvert par `code--exec`.

## Mode actuel

Je suis en mode plan (read-only). Je ne peux pas exécuter `code--exec` ni `lov-copy`. Une fois ce plan approuvé, je bascule en mode default et j'exécute la chaîne d'extraction.

## Plan d'exécution

### Étape 1 — Copie & inspection structurelle
- `lov-copy user-uploads://chairgun-elite-2.apk /tmp/chairgun.apk`
- `unzip -l` pour lister le contenu
- `unzip -d /tmp/chairgun_extracted/` pour décompresser
- Lister `assets/`, `res/raw/`, `databases/`, identifier `.db`, `.json`, `.xml`, `.csv`

### Étape 2 — Analyse des bases de données
- Pour chaque `.db` / `.sqlite` trouvé : `sqlite3 file.db ".schema"` puis `.tables`
- Identifier les tables candidates : projectiles (pellets/slugs), optiques (scopes), réticules
- Compter les lignes par table
- Si fichiers JSON/XML : `head` + `jq`/`xmllint`

### Étape 3 — Extraction & normalisation (Python)
Script `/tmp/extract_chairgun.py` qui :
- Lit les tables identifiées via `sqlite3`
- Mappe les colonnes vers les schémas cibles (`Projectile`, `Optic`, `Reticle`)
- Convertit les unités (fps→m/s, inch→mm, gram→grain si nécessaire)
- Applique la politique Tranche D : `bcModel` non-whitelisté → remap `G1` + note
- Normalise les calibres au format `.NNN`
- Dédoublonne (brand+model+caliber+weight pour projectiles ; name pour optiques)
- Omet les champs vides (pas de `null`/`""`)

### Étape 4 — Génération des livrables
Écriture dans `/mnt/documents/chairgun-elite-2/` :
- `projectiles.json`
- `optics.json`
- `reticles.json` (si table réticules trouvée, sinon documenter l'absence dans le rapport)
- `extraction-report.md` (méthode, comptes, rejets, remappings, conversions, mentions copyright)

### Étape 5 — QA & livraison
- Validation JSON (`jq empty`)
- Comptage final par catégorie
- `<lov-artifact>` pour chaque fichier
- Compte rendu technique détaillé au format strict habituel

## Points sensibles à signaler

1. **Copyright** : la base de données ChairGun Elite est propriétaire (Hawke Optics). Les données extraites seront signalées dans le rapport comme "potentiellement protégées" — usage personnel uniquement.
2. **Réticules** : ChairGun stocke généralement les subtensions de réticules dans des tables dédiées. Si trouvées, livrées dans `reticles.json` (entité non encore créée dans AirBallistik V1).
3. **Chiffrement** : si l'APK utilise une base SQLCipher ou un format propriétaire, je le signalerai et n'inventerai aucune donnée.
4. **Aucun changement code AirBallistik** : extraction pure, zéro modification du repo.

## Périmètre strict

- Tâche de data extraction (`exec-non-build`), pas une tranche fonctionnelle
- Aucune modification de `src/`
- Aucun test ajouté
- Aucun changement UI, aucun sélecteur moteur, aucune refonte solver
- Tests verts restent à 430/430

