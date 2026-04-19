
## Tranche APK.A4 — Strelok Pro DragTable export format

### Objectif strict
Documenter en détail le format XML `<DragTable>` observé dans Strelok Pro v6.8.8 (déjà uploadé et analysé en APK.A1/A2), en vue de servir de référence pour un futur format pivot d'import custom drag table dans AirBallistik. **Aucune modification de `src/`. Aucune implémentation produit.**

### Contexte (APK.A2 déjà acquis)
- Strelok Pro embarque `assets/bullets4.db` (SQLite, 584 entrées airgun, BC G1/G7).
- Mention de `<DragTable>` repérée dans les chaînes DEX et liée à un mécanisme d'export/import XML utilisateur (custom drag tables) distinct de la base bullets4.

### Étape 1 — Re-extraction Strelok Pro
- Vérifier `/tmp/apk-analysis/strelok/` (résidu APK.A1/A2). Si absent, re-copier `strelok-pro-v6.8.8-mod-lenov.ru.apk` depuis `user-uploads://` et décompresser.
- `unzip -l` → recenser tous les fichiers `*.xml`, `*.dtd`, `*.xsd` éventuels dans `assets/`, `res/raw/`, `res/xml/`.
- `strings classes*.dex | grep -E "DragTable|drag.?table|<Mach|<CD|<Drag" -i` → repérer les balises XML utilisées en sérialisation.

### Étape 2 — Reconstruction du schéma
- Chercher dans les chaînes DEX les noms de balises (`<DragTable>`, `<Point>`, `<Mach>`, `<CD>`, attributs `name`, `caliber`, `description`, etc.).
- Identifier les classes Java liées (parser SAX/DOM, sérialiseur). Repérer les méthodes `parseXml`, `writeXml`, `toXml`, `fromXml`.
- Si possible, localiser un fichier exemple embarqué dans les assets (ex : `default_drag_tables.xml`).
- Reconstruire la grammaire : éléments racine, enfants, attributs obligatoires/optionnels, types de données (float, int, string), unités implicites (Mach sans dimension, CD sans dimension).

### Étape 3 — Comparaison avec format pivot AirBallistik existant
- Lire `src/lib/drag-table.ts` et `src/lib/drag-table.test.ts` (déjà présents) → récupérer le contrat actuel CSV/JSON `{ mach, cd }`.
- Identifier les champs Strelok qui n'ont pas d'équivalent (métadonnées : nom, calibre, auteur, version, type projectile, vitesse de référence).
- Identifier les champs AirBallistik absents côté Strelok.
- Tableau de mapping bidirectionnel.

### Étape 4 — Documentation (livrable)
Création de **2 fichiers** sous `docs/apk-analysis/strelok/` :

1. `dragtable-xml-format.md`
   - Schéma XML observé (élément racine, enfants, attributs)
   - Grammaire en pseudo-DTD ou EBNF lisible
   - Exemple synthétique (reconstruit, **non extrait verbatim** d'un asset propriétaire)
   - Distinction certitudes ✅ (balises confirmées en strings DEX) / hypothèses 🟡 (structure inférée) / incertitudes ❓
   - Note légale : analyse structurelle interne, pas de redistribution
2. `import-pivot-recommendation.md`
   - Comparaison `drag-table.ts` (CSV/JSON actuel) ↔ XML Strelok
   - Tableau de mapping champ → champ
   - Recommandation pour un futur format pivot AirBallistik (extension JSON optionnelle : `metadata { name, caliber, source, refVelocity }` + `points: [{mach, cd}]`)
   - Stratégie d'import suggérée : adaptateur XML → format pivot interne, sans toucher au moteur
   - **Aucune décision d'implémentation prise** — c'est une spec préparatoire

### Garanties de périmètre
- **Aucune** modification de `src/` (zéro impact code produit AirBallistik)
- **Aucun** changement moteur, parsers, schémas d'import existants
- Tests AirBallistik restent à 786/786 (rien touché)
- Aucun autre APK analysé (MERO / ChairGun hors périmètre de cette tranche)
- Pas de déchiffrement, pas d'extraction de la base `bullets4.db` au-delà du schéma déjà documenté en APK.A2

### Points sensibles
1. **Légal** : Strelok Pro est propriétaire (Borisov). Reconstruction structurelle uniquement — pas de copie verbatim de fichiers d'exemple. Mention "analyse interne, pas de redistribution".
2. **Version mod** : la build analysée est `mod-lenov.ru` (non officielle). Le format peut différer de la version Borisov officielle — signalé explicitement dans le livrable.
3. **Obfuscation** : si R8 a effacé les noms de méthodes parser, certaines parties du schéma seront marquées 🟡 (inférence) ou ❓ (incertitude).
4. **Absence d'exemple embarqué** : si aucun `*.xml` exemple n'est trouvé dans les assets, le livrable se limite aux balises confirmées par strings DEX, sans exemple complet — signalé.
5. **Aucune implémentation** : la recommandation de format pivot reste une spec markdown. Pas d'extension de `import-schemas.ts`, pas de nouveau parser XML.

### Livrable final
- 2 fichiers markdown créés sous `docs/apk-analysis/strelok/`
- Compte rendu technique en fin de réponse avec confirmation explicite : aucun code produit modifié, 786/786 tests, aucun autre APK touché, aucune nouvelle physique ni schéma d'import introduit.
