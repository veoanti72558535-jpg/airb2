# Cas pilote — `case-22-pellet-18gr-270-zero30`

## Intention

Premier cas inscrit au format pivot cross-validation (BUILD-A). Sert à
valider le pipeline complet :

- `inputs.json` typable comme `BallisticInput`
- `source-*.csv` parsable par le loader CSV
- `source-*.meta.json` typable comme `ReferenceMeta`
- Assemblage final → `CrossValidationCase`

## Source utilisée

`auxiliary` synthétique — **pas** une vraie référence externe. Confiance
`C`, méthode `manual-entry`. Les valeurs reproduisent grossièrement
l'allure d'un .22 pellet 18gr @ 270 m/s zero 30m mais ne sont pas
publiables comme oracle. À remplacer par ChairGun / Strelok / MERO en
BUILD-C.

## Conventions figées

| Param | Valeur |
|---|---|
| Drop | mm, négatif = sous ligne de visée |
| Velocity | m/s à la distance considérée |
| TOF | secondes depuis la bouche |
| Vent | absent (windSpeed = 0) |
| Atmosphère | ICAO standard (15 °C, 1013.25 hPa, 50 % RH, 0 m) |
| BC | 0.035 G1 (modèle G1 explicite) |
| Sight height | 50 mm |
| Zero | 30 m unique |

## Hors scope ici

- Pas de comparaison numérique vs moteur (BUILD-B).
- Pas de tolérance appliquée (BUILD-B).
- Pas de plusieurs sources concordantes (BUILD-C).
- Pas de génération de rapport (BUILD-D).