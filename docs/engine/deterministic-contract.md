# Contrat déterministe du moteur balistique

> **Statut** : normatif — toute violation est un bug bloquant.
> **Audience** : développeurs front-end, intégrateurs edge functions, reviewers IA.
> **Voir aussi** : `supabase/functions/ballistic-compute/index.ts`,
> `src/lib/ballistic-compute-client.ts`,
> `src/lib/units-cross-surface.test.ts`,
> `src/lib/units-pages-no-hardcode.test.ts`,
> `src/lib/units-roundtrip.test.ts`.

## 1. Principe fondamental

Le moteur balistique d'AirBallistik est **strictement déterministe** et
**strictement SI**. Pour un même jeu d'entrées physiques, il produit
exactement la même trajectoire, indépendamment de :

- la langue de l'interface (FR / EN),
- le système d'unités préféré par l'utilisateur (Métrique / Imperial),
- le thème, la plateforme, le fuseau horaire, ou tout autre état UI,
- la session, l'utilisateur, ou l'instance de l'application.

Aucun appel au moteur ne consulte les préférences utilisateur. Aucun
composant UI n'est autorisé à injecter des valeurs converties dans le
moteur. Les conversions Métrique ↔ Imperial sont **exclusivement** une
affaire d'**affichage** et de **saisie**, jamais de calcul.

## 2. Vérité physique : le SI interne

Toutes les valeurs manipulées par le moteur — entrées, états
intermédiaires, sorties — sont exprimées dans les unités SI suivantes :

| Grandeur                  | Unité SI         | Symbole | Notes                                  |
|---------------------------|------------------|---------|----------------------------------------|
| Vitesse initiale (V0)     | mètre / seconde  | m/s     | Jamais fps en interne.                 |
| Distance, portée          | mètre            | m       | Jamais yards.                          |
| Chute, dérive, longueur   | mètre            | m       | Affichée en mm/cm/in selon préférence. |
| Masse projectile          | gramme           | g       | Jamais grains. (1 gr = 0,06479891 g)   |
| Énergie cinétique         | joule            | J       | Jamais ft·lb.                          |
| Diamètre / calibre        | millimètre       | mm      | Sous-multiple SI usuel.                |
| Vitesse de vent           | mètre / seconde  | m/s     | Jamais mph, jamais km/h en interne.    |
| Température               | degré Celsius    | °C      | Convertie en K si besoin par le moteur.|
| Pression atmosphérique    | hectopascal      | hPa     | Jamais inHg.                           |
| Humidité relative         | fraction [0..1]  | —       | Sans unité, bornée.                    |
| Twist / élévation         | cal/tour, rad    | —       | Twist exprimé en cal/tour côté API.    |

Toute structure traversant la frontière moteur (`BallisticInputSI`,
`BallisticOutputSI`) doit utiliser ces unités, et **uniquement
celles-ci**.

## 3. Conversions d'affichage : la couche cosmétique

Les préférences utilisateur (`useUnits()`) ne pilotent que **deux**
opérations, situées à la périphérie de l'application :

1. **Lecture** (SI → préférence) : juste avant le rendu, via
   `display(category, valueSI)` et `symbol(category)`.
2. **Écriture** (préférence → SI) : juste après la saisie utilisateur,
   via `parseToSI(category, valueDisplay)`, puis stockage en SI.

Entre ces deux instants, **aucune valeur convertie ne circule**. Tout
champ stocké, tout payload envoyé au moteur, toute persistance
localStorage est en SI.

### Règle d'or de la saisie

Quand l'utilisateur tape `12` avec préférence Imperial dans un champ
`windSpeed`, l'application doit :

1. interpréter `12` comme `12 mph` (préférence courante),
2. convertir en SI : `12 mph → 5,3645 m/s`,
3. **stocker `5.3645` en SI**, jamais `12`.

Re-stocker `12` comme s'il s'agissait de `12 m/s` est un bug critique
de type *unit confusion* — testé et bloqué par
`src/lib/units-roundtrip.test.ts` (ancrage : `4.4704 m/s ↔ 14.6667 fps`).

## 4. Garde-fous en place

### 4.1. Côté types

- `BallisticInputSI` exige un littéral `units: "SI"` au niveau racine.
- Les noms de propriétés ne contiennent jamais de suffixe d'unité
  d'affichage (`_fps`, `_gr`, `_yd`, `_mph`, `_inHg`, `_F`, …).
- `validateBallisticInputSI()` refuse tout objet n'ayant pas le sentinel
  `units: "SI"`.

### 4.2. Côté edge function (`ballistic-compute`)

Trois couches de défense, dans l'ordre :

1. **Sentinel SI** : payload sans `units: "SI"` → `400`.
2. **Audit récursif des clés** : toute clé contenant un token interdit
   (`fps`, `grains`, `mph`, `inhg`, `yd`, …) → `400`.
3. **Bornes physiques SI** : valeurs hors plages plausibles SI → `400`.
   Exemple : `muzzleVelocity = 950` accepté (m/s plausible),
   `muzzleVelocity = 2950` refusé (probablement des fps mal étiquetés).

| Champ              | Plage SI acceptée |
|--------------------|-------------------|
| muzzleVelocity     | 30 – 2000 m/s     |
| projectileWeight   | 0,05 – 100 g      |
| temperature        | -60 – 60 °C       |
| pressure           | 500 – 1100 hPa    |
| windSpeed          | 0 – 100 m/s       |

### 4.3. Côté UI

- Aucun composant n'affiche d'unité en dur. Test de fidélité :
  `src/lib/units-pages-no-hardcode.test.ts`.
- Tout champ saisi transite par `<UnitField>` ou un équivalent
  utilisant `useUnits()`.
- Le mode debug d'unités (`UnitDebugOverlay` + `<UnitTag>`) marque
  visuellement chaque champ « SI (vérité physique) » vs « conversion
  d'affichage », pour prévenir toute réinjection accidentelle.
- Les surfaces partagées (Dashboard, Sessions, QuickCalc, FieldMode)
  sont verrouillées par `units-cross-surface.test.ts` : pour un même
  couple `(catégorie, variable)`, l'arrondi et le formatage doivent
  être strictement identiques d'une page à l'autre.

## 5. Conséquences pour les contributeurs

- **Ne jamais** lire `useUnits()` à l'intérieur d'une fonction de calcul.
- **Ne jamais** stocker une valeur en `localStorage` ou en base sans
  l'avoir préalablement convertie en SI.
- **Ne jamais** envoyer à l'edge function un objet construit à partir
  d'une valeur affichée non re-convertie.
- **Toujours** ajouter un test de round-trip lorsqu'on introduit une
  nouvelle catégorie d'unité.
- **Toujours** étendre `units-cross-surface.test.ts` lorsqu'on expose
  une variable physique sur une nouvelle surface.

## 6. Justification

Le déterminisme strict du moteur est ce qui rend possible :

- la **reproductibilité** des sessions de tir entre deux utilisateurs
  qui n'ont pas les mêmes préférences d'unités ;
- la **comparaison cross-validation** avec Strelok, Chairgun, MERO ;
- la **mise en cache** des résultats de calcul par hash des entrées SI ;
- la **portabilité** future (mode hors-ligne, edge function, worker).

Le jour où une conversion d'affichage influence un résultat, ces quatre
propriétés tombent. C'est pourquoi le contrat décrit ici n'a aucune
exception.

## 7. Checklist de revue (PR)

À cocher avant tout merge touchant au moteur, aux unités, ou à un
champ physique :

- [ ] Aucune chaîne d'unité en dur (`m/s`, `mm`, `J`, `fps`, `gr`, …)
      dans le JSX modifié.
- [ ] Toute saisie utilisateur passe par `parseToSI()` avant stockage.
- [ ] Tout payload sortant vers `ballistic-compute` porte `units: "SI"`.
- [ ] Les nouveaux champs SI ont une plage déclarée dans la edge
      function et un test de bornes.
- [ ] Les tests `units-roundtrip`, `units-cross-surface`,
      `units-pages-no-hardcode` et `ballistic-compute-guardrail`
      passent en local.
