# External Case JSON — Format canonique

> Statut : **BUILD-C bis** — schéma versionné `v1`. Source de vérité de
> l'onglet « Validation externe » et **cible canonique de la future
> build IA "screenshots → JSON"**.

## Pourquoi ce format ?

- Permettre la saisie manuelle d'un cas de validation comparative
  (ChairGun Elite / Strelok Pro / MERO) sans toucher au code.
- Permettre l'import / export JSON via l'onglet **Validation externe**.
- Préparer la cible d'une future build IA capable de convertir des
  captures d'écran en ce format JSON, sans changer le contrat.

## Règles d'or

1. **Aucune valeur n'est inventée.** Si la source ne documente pas une
   métrique, on laisse la cellule vide. Le moteur, en aval, marquera
   simplement la métrique comme « non comparable ».
2. **Les sources externes sont fermées.** Les valeurs admises pour
   `references[].meta.source` sont :
   `chairgun`, `chairgun-elite`, `strelok`, `strelok-pro`, `mero`,
   `auxiliary`. Toute autre valeur est rejetée à la validation.
3. **Chaque référence porte sa propre confiance** (`A`, `B`, `C`) et sa
   propre méthode d'extraction. Une même app source peut apparaître
   plusieurs fois dans un cas si plusieurs versions sont comparées.
4. **Unités canoniques** alignées sur AirBallistik :
   - `range` : mètres
   - `drop`, `windDrift` : millimètres (drop négatif = sous la ligne de visée)
   - `velocity` : m/s
   - `tof` : secondes
   - `energy` : joules
   - `weightGrains` : grains
   - `pressureHpaAbsolute` : hPa absolus (PAS station)
   - `temperatureC` : °C
5. **`schemaVersion: 1`** est implicite si absent. Toute évolution
   non-rétrocompatible incrémente ce nombre.

## Champs requis vs optionnels

### Requis

- `caseId` (slug, kebab-case recommandé)
- `title`
- `inputs.projectileName`
- `inputs.caliber`
- `inputs.weightGrains`
- `inputs.bc`
- `inputs.muzzleVelocity`
- `inputs.sightHeight`
- `inputs.zeroDistance`
- `inputs.rangeMax`
- `inputs.rangeStep`
- `references[]` (au moins 1, max 8)
- pour chaque référence :
  - `meta.source`, `meta.version`, `meta.confidence`,
    `meta.extractionMethod`, `meta.extractedAt`
  - `rows[]` (au moins 1, max 500), chaque row avec `range`

### Optionnels (toujours)

- `description`, `tags`, `notes`
- `inputs.projectileType`, `inputs.diameterMm`, `inputs.bcModel`,
  `inputs.twistRate`
- `inputs.temperatureC`, `inputs.pressureHpaAbsolute`,
  `inputs.humidityPercent`, `inputs.altitudeM`
- `inputs.windSpeed`, `inputs.windDirection`, `inputs.windConvention`
- `inputs.rangeStart`, `inputs.sourceUnitsNote`, `inputs.comment`
- `references[].meta.operator`, `.sourceUri`, `.assumptions[]`, `.notes`
- `rows[].drop`, `.velocity`, `.tof`, `.windDrift`, `.energy`, `.note`

## Exemple complet

```json
{
  "caseId": "22-jsb-18gr-280-zero30",
  "title": ".22 JSB 18gr — 280 m/s — zero 30m",
  "description": "Test pellet courant en conditions ICAO standard, vent nul.",
  "tags": ["22", "pellet", "no-wind"],
  "inputs": {
    "projectileName": "JSB Exact Jumbo Heavy",
    "projectileType": "pellet",
    "caliber": ".22",
    "diameterMm": 5.52,
    "weightGrains": 18.13,
    "bc": 0.035,
    "bcModel": "G1",
    "muzzleVelocity": 280,
    "sightHeight": 50,
    "zeroDistance": 30,
    "temperatureC": 15,
    "pressureHpaAbsolute": 1013,
    "humidityPercent": 50,
    "altitudeM": 0,
    "windSpeed": 0,
    "windDirection": 0,
    "rangeMax": 100,
    "rangeStep": 10,
    "sourceUnitsNote": "m, mm, m/s, hPa absolu",
    "comment": "Cas pilote, ATM ICAO assumée."
  },
  "references": [
    {
      "meta": {
        "source": "strelok-pro",
        "version": "Strelok Pro 6.x APK",
        "confidence": "B",
        "extractionMethod": "screenshot-retyped",
        "extractedAt": "2025-04-12",
        "operator": "MB",
        "sourceUri": "local://strelok-screen-2025-04-12.png",
        "assumptions": ["BC G1 supposé", "atmosphère ICAO"],
        "notes": "Captures à zoom max, lecture pixel près."
      },
      "rows": [
        { "range": 10, "drop": 5,    "velocity": 275 },
        { "range": 20, "drop": 0,    "velocity": 270 },
        { "range": 30, "drop": 0,    "velocity": 264 },
        { "range": 40, "drop": -10,  "velocity": 258 },
        { "range": 50, "drop": -27,  "velocity": 252 }
      ]
    },
    {
      "meta": {
        "source": "chairgun-elite",
        "version": "ChairGun Elite 1.x",
        "confidence": "B",
        "extractionMethod": "screenshot-retyped",
        "extractedAt": "2025-04-12",
        "operator": "MB"
      },
      "rows": [
        { "range": 10, "drop": 6 },
        { "range": 20, "drop": 1 },
        { "range": 30, "drop": 0 },
        { "range": 40, "drop": -11 },
        { "range": 50, "drop": -28 }
      ]
    }
  ],
  "notes": "Comparaison multi-sources. ChairGun expose seulement le drop ; Strelok expose drop + velocity.",
  "schemaVersion": 1
}
```

## Mapping vers le harness BUILD-B

L'onglet « Validation externe » convertit chaque `UserCrossValidationCase`
en `CrossValidationCase` (cf. `mapUserCaseToCrossValidationCase`) puis
l'envoie à `runCaseComparison()`. Aucun nouveau contrat moteur n'est créé
pour cette tranche.

Les champs atmosphère manquants reçoivent les défauts ICAO standard
(15 °C, 1013.25 hPa, 50 % HR, alt 0 m, vent nul). C'est la même
convention que les fixtures historiques. Si une source documente une
atmosphère différente, **renseigne-la explicitement** plutôt que de
laisser le défaut s'appliquer en silence.

## Préparation IA (build future, hors scope BUILD-C bis)

- L'IA produira **exactement ce JSON**. Pas de format intermédiaire.
- L'IA documentera son extraction via les champs `assumptions[]` et
  `notes` plutôt qu'en silence.
- L'IA marquera systématiquement `extractionMethod: "screenshot-retyped"`
  ou un futur `screenshot-ai` ajouté à l'enum.
- Tant que l'IA n'est pas livrée, ce format reste alimenté à la main
  via l'onglet ou directement par fichier JSON.

## Versionnement

- v1 (avril 2025) : schéma initial, BUILD-C bis.
- prochaines versions : préfixer le changement par `BREAKING:` si non
  rétrocompatible, sinon ajouter des champs optionnels uniquement.