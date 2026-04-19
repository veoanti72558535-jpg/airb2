
## Tranche APK.A3 — MERO localization + drag law menu

### Objectif strict
Extraire et documenter, à partir de l'APK MERO 1.2.5 déjà uploadé :
1. Les libellés UI contenus dans les fichiers `assets/localization_*.json` (≈18 fichiers — nombre exact à confirmer en mode default via `unzip -l`)
2. La liste exhaustive des entrées du menu drag law (handlers `lambda$showDragLawMenu$*` déjà repérés en APK.A2)

Aucun autre APK n'est touché. Aucune modification de `src/`.

### Étape 1 — Re-extraction MERO
- Vérifier la présence de `/tmp/apk-analysis/mero/` (résidu APK.A2). Si absent, re-copier `MERO_1.2.5_APKPure-2.xapk` depuis `user-uploads://` et décompresser le bundle xapk → APK base.
- `unzip -l mero-base.apk | grep -i localization` → liste exacte des fichiers localization (confirmer le compte de 18).

### Étape 2 — Extraction libellés localization
- `unzip` ciblé sur `assets/localization_*.json` vers `/tmp/apk-analysis/mero/loc/`
- Détection du format (JSON plat clé→valeur, ou imbriqué). Détection encodage / langue par fichier (suffixe `_fr`, `_en`, `_de` etc. ou clé interne `language`).
- Construction d'un index pivot : pour chaque clé, valeurs par langue (ou au minimum la langue de référence si une seule existe).
- Filtrage thématique balistique : drag law, BC, atmosphère, vent, zéro, PBR, réticule, unités, projectile, optique, inclinaison.

### Étape 3 — Enumération exhaustive du menu drag law
- `strings classes*.dex | grep -E "showDragLawMenu|DragLaw|drag.?law" -i` → handlers numérotés.
- Croisement avec les libellés localization (clés type `dragLaw.*`, `drag_law_*`, `_lab_drag*`).
- Reconstruction du menu : pour chaque entrée numérique (lambda$showDragLawMenu$0..N), associer le label trouvé. Marquer ❓ si correspondance non certaine.
- Sortie : tableau ordonné (index, identifiant, label FR/EN si dispo, famille — airgun/rimfire/slug/générique/sphérique).

### Étape 4 — Documentation (livrable)
Création de **2 fichiers** sous `docs/apk-analysis/mero/` :

1. `localization-extract.md`
   - Liste des fichiers localization détectés + format
   - Tableau pivot des libellés balistiques (clé → labels par langue)
   - Section non-balistique : résumé seulement (volume, langues, exemples), pas de dump exhaustif
   - Note légale : extraction structurelle pour analyse comparative interne, pas de redistribution
2. `drag-law-menu.md`
   - Tableau exhaustif des entrées du menu drag law
   - Cartographie famille / cas d'usage attendu (selon la phrase produit déjà observée en APK.A2)
   - Comparaison synthétique avec les drag laws AirBallistik (G1/G7/GA/GS publiques, RA4/GA2/SLG0/SLG1 internes)
   - Distinction certitudes ✅ / hypothèses 🟡 / incertitudes ❓

### Garanties de périmètre
- **Aucune** modification de `src/` (zéro impact code produit AirBallistik)
- **Aucun** changement moteur, EngineBadge, QuickCalc, Sessions, Compare, Routes, MERO exposure
- Tests AirBallistik restent à 786/786 (rien touché)
- Aucun autre APK analysé (ChairGun / Strelok Pro hors périmètre de cette tranche)
- Pas de déchiffrement, pas d'extraction de l'asset `HTRv1wt4YJgUR0H` de ChairGun Elite (hors scope)

### Points sensibles
1. **Légal** : MERO est propriétaire. L'extraction des libellés sert à documenter l'éventail fonctionnel pour comparaison interne. Mention explicite "analyse personnelle, pas de redistribution".
2. **Volume** : si les 18 fichiers contiennent des centaines de clés non-balistiques (UI générale), le livrable filtrera et résumera. Pas de dump intégral en markdown.
3. **Mapping menu ↔ labels** : si l'obfuscation a effacé la correspondance index→clé i18n, certaines entrées resteront marquées ❓ avec hypothèse motivée.
4. **Fichiers localization manquants** : si le compte réel diverge de 18, livrable adapté + signalement explicite.

### Livrable final
- 2 fichiers markdown créés sous `docs/apk-analysis/mero/`
- Compte rendu technique en fin de réponse avec confirmation explicite : aucun code produit modifié, 786/786 tests, aucun autre APK touché.
