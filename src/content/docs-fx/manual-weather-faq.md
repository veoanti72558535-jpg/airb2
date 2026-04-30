# FAQ — Météo manuelle (Manual Weather FAQ)

> **FR :** Cette FAQ couvre l'utilisation du mode **météo manuelle** : ce qui se passe quand vous saisissez vous-même la pression, la température, l'humidité ou l'altitude au lieu de laisser le service météo faire la mesure.
>
> **EN :** This FAQ covers the **manual weather** mode: what happens when you enter pressure, temperature, humidity or altitude by hand instead of letting the weather service fetch them.

---

## 1. Qui prime, la météo manuelle ou la météo automatique ?

**FR :** Dès qu'au moins **un champ atmosphérique est édité manuellement**, AirBallistik passe en mode `manual` pour ce calcul. Les champs non édités sont laissés à leur dernière valeur connue (manuelle ou auto). Aucun appel réseau n'est effectué tant que vous restez dans cet écran : votre saisie est la source de vérité.

**EN :** As soon as **any atmospheric field is edited by hand**, AirBallistik switches to `manual` mode for that computation. Untouched fields keep their last known value (manual or auto). No network call is made while you stay on that screen — your input is the source of truth.

> ✅ **Bonne pratique / Best practice :** si vous corrigez juste la température, laissez la pression et l'humidité telles quelles ; le moteur balistique appliquera la nouvelle densité de l'air sans recalculer la station météo.

---

## 2. Comment l'unité d'affichage est-elle préservée ?

**FR :** Toutes les valeurs sont stockées en **unités SI** (Pa, K, m, m/s) en interne, mais ré-affichées dans l'unité que vous avez choisie (hPa/inHg, °C/°F, m/ft, m/s/km/h/mph). Le couple « affichage ↔ saisie » est garanti par les tests de **round-trip** `atmosphere-sync.test.ts` : convertir → stocker → reconvertir doit redonner exactement la valeur tapée (à la précision de l'unité).

**EN :** All values are stored in **SI units** (Pa, K, m, m/s) internally, then re-rendered in your chosen unit (hPa/inHg, °C/°F, m/ft, m/s/km/h/mph). The display ↔ input round-trip is guaranteed by `atmosphere-sync.test.ts`: convert → store → convert back must yield exactly the typed value (to the unit's precision).

> ⚠️ **Limite connue :** si vous changez d'unité **pendant** la saisie sans valider, le champ se ré-écrit avec la valeur arrondie. Tapez la valeur, validez, puis changez d'unité.

---

## 3. Quelles erreurs puis-je rencontrer en saisie manuelle ?

| Code | FR — Cause | EN — Cause | Action |
|------|------------|------------|--------|
| `out-of-si-range` | Valeur hors des bornes physiques validées (ex. pression < 30 000 Pa ou > 110 000 Pa) | Value outside the validated physical range (e.g. pressure below 30 000 Pa or above 110 000 Pa) | Vérifier l'unité affichée (hPa vs Pa, °C vs K) avant de retaper / Check the displayed unit before retyping |
| `unit-mismatch-hint` | Indice : la valeur ressemble à une autre unité (ex. « 29.92 » en hPa ≈ inHg) | Hint: the value looks like another unit (e.g. "29.92" in hPa ≈ inHg) | Confirmer le choix d'unité dans l'en-tête de section / Confirm the unit selector at the top of the section |
| `humidity-out-of-range` | Humidité hors `[0 ; 100]` % | Humidity outside `[0 ; 100]` % | Saisir un pourcentage entier ou décimal valide / Enter a valid integer or decimal percentage |
| `altitude-conflict` | Altitude saisie incohérente avec la pression saisie (> 500 m d'écart) | Altitude conflicts with entered pressure (> 500 m delta) | Privilégier la pression mesurée ; l'altitude n'est utilisée qu'en repli / Prefer measured pressure; altitude is only a fallback |

Le tableau exhaustif des codes vit dans la section **« Codes d'erreur de validation SI »** ci-dessus.

---

## 4. Que se passe-t-il si la météo automatique échoue ensuite ?

**FR :** Si vous quittez puis revenez sur la session avec la météo automatique réactivée, vos valeurs manuelles **ne sont pas écrasées tant que la requête réseau n'aboutit pas**. En cas d'échec (offline, quota, timeout) un toast vous propose de **conserver la valeur manuelle** ou de **réessayer**. Aucune valeur fantaisiste n'est injectée silencieusement.

**EN :** If you leave and come back with auto-weather re-enabled, your manual values **are not overwritten until the network request succeeds**. On failure (offline, quota, timeout) a toast lets you **keep the manual value** or **retry**. No fabricated value is ever injected silently.

---

## 5. Bonnes pratiques pour des résultats fiables

- **Privilégier la pression station** (ce que mesure votre baromètre) plutôt que la pression réduite au niveau de la mer (« QNH »). Le moteur attend une pression locale.
- **Saisir la température à hauteur du tireur**, pas celle annoncée par la station météo régionale.
- **Humidité** : un écart de 20 % a un impact balistique très faible (< 0.1 % sur la densité de l'air à 20 °C / 1013 hPa). Ne perdez pas de temps à mesurer au demi-pourcent près.
- **Altitude** : ne renseignez l'altitude que si vous **n'avez pas** de pression locale. Les deux ensemble sont redondants et déclenchent `altitude-conflict` au-delà de 500 m d'écart.
- **Vent** : la vitesse du vent suit le même round-trip SI ↔ affichage (`m/s` interne, affichage en `km/h` ou `mph`). Une saisie en mph est convertie au stockage et restituée à l'identique en lecture.

---

## 6. Comment réinitialiser une saisie manuelle ?

1. Ouvrez la section **Atmosphère** de votre session.
2. Cliquez sur le bouton **« Resynchroniser météo »** (icône de rotation) à côté du champ concerné.
3. La valeur est remplacée par la dernière mesure automatique (ou marquée « non disponible » si la météo auto est désactivée).

> 🔁 La réinitialisation se fait **champ par champ** : vous pouvez par exemple resynchroniser la pression tout en conservant votre température manuelle.

---

## 7. Où signaler un comportement inattendu ?

Cette section est **éditable par un administrateur** depuis `/docs/fx`. Si vous constatez :

- Une plage SI trop restrictive ou trop laxiste,
- Un message d'erreur peu clair,
- Un cas d'usage manquant,

ouvrez la section en mode édition et complétez-la, ou créez une nouvelle entrée de catégorie **FAQ** avec les tags `fx`, `météo`, `manuel`.