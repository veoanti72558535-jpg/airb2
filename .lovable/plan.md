# Golden cases request — document de demande dédié, sans IA

## Objectif

Créer un document de demande **autonome et envoyable tel quel** (au dev ChairGun, et réutilisable pour Strelok / MERO / un opérateur humain) pour obtenir des **golden cases** complets destinés à la cross-validation **sans IA**.

Différence avec `docs/handoff/chairgun-data-request.md` (qui existe déjà et couvre 4 priorités larges) :
- Mono-sujet : golden cases uniquement (pas de scope reticle, pas de Cd tables, pas d'UX)
- **Prêt à copier-coller** dans un mail / Discord / GitHub issue (FR + EN)
- Insiste sur le **canal humain ou export programmatique** : pas d'OCR, pas d'IA dans la boucle d'extraction
- Fournit un **template JSON pré-rempli** (squelette à remplir case par case)
- Référence le format pivot canonique `external-case-json.md` v1 sans le redupliquer

## Tranche unique — Documentation only

### Files

- **Created** : `docs/handoff/golden-cases-request.md` (~250–350 lignes)
- **Created** : `docs/handoff/templates/golden-case-template.json` (squelette JSON, tous champs requis présents)
- **Modified** : `docs/handoff/chairgun-data-request.md` — ajouter 1–2 lignes de renvoi en tête de §P1.1 vers le nouveau document dédié
- **Modified** : aucun fichier code, aucun test, aucune migration, aucune translation, aucune memory

### Document structure (`golden-cases-request.md`)

1. **Pourquoi cette demande** — moteur déterministe verrouillé par snapshots golden ; pour le confronter à une référence externe sans biaiser nos tests, il faut des cas **complets et traçables** ; ils iront dans `src/lib/__fixtures__/cross-validation/<case-id>/` et seront comparés par `runCaseComparison` (déterministe, **zéro IA**).

2. **Définition opérationnelle d'un "golden case"** :
   - 1 projectile identifié (marque + modèle + poids exact en grains + diamètre mm)
   - 1 tune (MV mesurée au chrono, idéalement avec ES/SD)
   - 1 atmosphère explicite (T °C, P hPa **absolus**, HR %, altitude m)
   - 1 réglage scope (sight height mm, zero range m)
   - 1 condition vent (vitesse + direction + convention angulaire)
   - N lignes de résultats (range, drop mm, velocity m/s ; optionnel : TOF, windDrift, energy)
   - Métadonnées de traçabilité : version app, méthode d'extraction, opérateur, date

3. **Couverture souhaitée (matrice 8 lignes)** :

   | Calibre | Type | MV cible | Zero | Atmosphère |
   |---|---|---|---|---|
   | .177 | pellet | 240 m/s | 25 m | ICAO |
   | .22  | pellet | 280 m/s | 30 m | ICAO |
   | .22  | pellet | 280 m/s | 30 m | -10 °C / 20 % HR |
   | .22  | pellet | 280 m/s | 30 m | 35 °C / 90 % HR |
   | .22  | slug   | 320 m/s | 50 m | ICAO |
   | .25  | pellet | 270 m/s | 40 m | altitude 1500 m |
   | .25  | slug   | 280 m/s | 50 m | altitude + vent 5 m/s travers |
   | .30  | slug   | 290 m/s | 100 m | ICAO |

   Cible : **8 cas minimum**, **20 idéal**. Livraison incrémentale OK.

4. **Format de livraison attendu** — pointeur strict vers :
   - `docs/validation/external-case-json.md` (schéma v1 canonique, single source of truth)
   - `docs/handoff/templates/golden-case-template.json` (squelette à remplir)

   Règles : 1 fichier JSON par cas ; nom = `caseId` slug (ex : `22-jsb-18gr-280-zero30.json`) ; pas de conversion d'unités côté contributeur (remplir `sourceUnitsNote`, conversion côté AirBallistik).

5. **Règles d'or (rappel court)** :
   - Aucune valeur inventée. Cellule vide = "on ne sait pas".
   - Atmosphère explicite, pas de défaut implicite.
   - Vent : convention angulaire documentée dans `assumptions[]`.
   - BC : préciser le modèle (G1 / G7 / custom Cd table).
   - Confiance auto-évaluée (A / B / C) selon la grille du schéma v1.

6. **Checklist qualité contributeur** (cases à cocher avant envoi) :
   - [ ] `caseId` unique et slug-safe
   - [ ] `meta.source/version/confidence/extractionMethod/extractedAt` renseignés
   - [ ] Atmosphère explicite ou explicitement marquée "ICAO"
   - [ ] Vent : speed + direction + convention dans `assumptions[]`
   - [ ] BC + modèle BC documentés
   - [ ] Au moins 5 lignes de résultats, range croissant
   - [ ] Drop signé (négatif = sous ligne de visée)
   - [ ] `sourceUnitsNote` rempli si unités non canoniques
   - [ ] JSON parser-validé

7. **Ce qu'on NE demande PAS** (transparence) :
   - Pas de code source ChairGun
   - Pas de captures d'écran (on évite explicitement le pipeline IA pour cette demande)
   - Pas d'engagement de support ou de maintenance
   - Pas d'exclusivité

8. **Où ça atterrit chez nous** :
   - `src/lib/__fixtures__/cross-validation/<case-id>/case.json` (cf. cas pilote `case-22-pellet-18gr-270-zero30`)
   - Exécution → `runCaseComparison` (déterministe, zéro IA)
   - Si convergence multi-cas : peut contribuer à débloquer un gate MERO (cf. `mem://constraints/mero-exposure-gates`)

9. **Messages prêts à envoyer** — deux blocs courts (FR + EN, ~150 mots) :
   - Présentent AirBallistik en 1 phrase
   - Pointent vers `golden-cases-request.md` + le template
   - Ouvrent par "qu'est-ce qui est facile pour toi à exporter ?" plutôt que tout demander d'un coup
   - Précisent explicitement : "pas d'OCR, pas d'IA, on consomme directement ton JSON"

10. **Workflow de réception côté AirBallistik** :
    - Valider le JSON contre le schéma (parser `user-case-schema.ts` déjà en place)
    - Déposer dans `src/lib/__fixtures__/cross-validation/<case-id>/`
    - Lancer `vitest run src/lib/cross-validation/`
    - Documenter le verdict (convergence / écart) dans les notes du cas
    - **Pas** de mise à jour automatique des golden snapshots — décision humaine explicite

### Template JSON (`golden-case-template.json`)

JSON strict (pas de commentaires inline) reprenant **tous** les champs requis du schéma v1 :
- valeurs `null` pour les obligatoires non encore remplis
- valeurs d'exemple courtes pour les structurants (ex : `"caliber": ".22"`)
- 3 `rows` squelettes (range = 10, 30, 50) pour donner le pattern
- 1 référence avec metadata complète (`source`, `version`, `confidence`, `extractionMethod`, `extractedAt`)
- `assumptions[]` non vide avec exemples ("BC G1 supposé", "vent convention 0°=12h")
- `schemaVersion: 1` explicite

Les explications de chaque champ vivent dans le markdown voisin, pas dans le JSON.

### Constraints respected

- ✅ `src/lib/ballistics/` intouchable
- ✅ `supabase/`, `src/components/cross-validation/`, `src/lib/ai/edge-client.ts` intouchables
- ✅ Pas de migration, pas de SQL, pas de test, pas de code, pas de translations
- ✅ Réutilise et référence le format pivot existant `external-case-json.md` (pas de duplication de schéma)
- ✅ Mention explicite "sans IA" alignée avec la demande utilisateur
- ✅ Cohérent avec `mem://core` : moteur balistique = déterministe, IA = assistance seulement
- ✅ Cohérent avec `mem://constraints/mero-exposure-gates` : ces cas peuvent contribuer à débloquer MERO

### Risques / régressions

Aucun. Documentation pure + 1 fichier JSON template, hors chaîne de build, hors runtime, hors tests. La modification de `chairgun-data-request.md` se limite à 1–2 lignes de renvoi en tête de §P1.1.

### Ce qui reste à faire après cette tranche

- Envoyer les messages FR/EN au(x) destinataire(s) (action utilisateur, hors Lovable)
- À réception d'un cas : appliquer le workflow §10 (créera ses propres tranches BUILD si divergence à investiguer)