# FX Radar — Chronographe Web Bluetooth

> Source : `src/lib/chrono/fx-radar-ble.ts` et
> `src/lib/chrono/fx-radar-ble.validator.test.ts`.

## 1. Pré-requis

- Navigateur Chromium (Chrome, Edge, Brave) sur **desktop** ou **Android**.
  iOS n'expose pas Web Bluetooth.
- Contexte sécurisé : HTTPS ou `localhost`. Vérifié par
  `isWebBluetoothSupported()`.
- Permission Bluetooth accordée à l'origine.

## 2. Appairage et reconnexion

- Premier appairage : sélecteur natif via `connectFxRadar()`. L'identifiant
  et le nom sont persistés dans `localStorage`
  (`fx_radar_device_id`, `fx_radar_device_name`).
- Reconnexion silencieuse : `tryReconnectSavedFxRadar()` utilise
  `navigator.bluetooth.getDevices()` (Chromium uniquement). Si l'appareil
  est hors portée ou que l'API est indisponible, on retombe sur le sélecteur.
- Oubli : `forgetSavedFxRadarDevice()` (bouton « Oublier l'appareil »).

## 3. Validation d'un appareil candidat

`validateFxRadarCandidate(snapshot)` calcule un score et un verdict `ok` :

| Critère | Points | Détails |
|---|---:|---|
| Service UUID FX connu | +3 | `0000fff0-...` ou `00001523-...-785feabcd123` |
| Nom contient `fx` / `radar` / `pocket` | +2 | Insensible à la casse |
| Au moins une caractéristique `notify` | +1 | Requis pour le streaming |

**Verdict `ok = true`** si : un service FX connu est exposé, **OU** (nom
correspondant **ET** caractéristique notifiable). Sinon l'appareil peut être
forcé manuellement, mais avec un avertissement explicite.

## 4. Plages de vitesse acceptées par le parseur

`parseVelocityValue(value, config)` rejette toute trame produisant une
vitesse hors `]0, 500[ m/s`. Les valeurs ≤ 0 ou ≥ 500 m/s sont
considérées comme du bruit ou un mauvais format et **ne sont pas
propagées au callback** (un warning console est émis avec les octets bruts).

| Format BLE | Taille min | Lecture | Notes |
|---|---:|---|---|
| `float32` little-endian | 4 octets | `getFloat32(0, true)` | Format nominal supposé |
| `uint16` little-endian | 2 octets | `getUint16(0, true) / 10` | Dixièmes de m/s |
| `uint8` | 1 octet | `getUint8(0)` | Fallback grossier |
| `auto` | — | Choisit selon `byteLength` | Mode par défaut |

Le diviseur (`config.divisor`) n'est appliqué qu'aux formats explicites
(`uint16` / `uint8`), jamais en mode `auto` ni `float32` — éviter le double
division.

## 5. Erreurs utilisateur et messages

| Situation | Source | Comportement |
|---|---|---|
| Web Bluetooth indisponible (iOS, HTTP, vieux Firefox) | `isWebBluetoothSupported()` | UI désactive le bouton « Connecter », affiche « Web Bluetooth non supporté » |
| Annulation du sélecteur par l'utilisateur | `requestDevice()` rejette `NotFoundError` | UI silencieuse, pas d'erreur rouge |
| GATT indisponible | `gatt` null | Erreur « GATT server unavailable » |
| Aucun service / caractéristique notifiable | `startVelocityStream` throw | Erreur « No notifiable characteristic found on FX Radar » |
| Déconnexion en cours de stream | `gattserverdisconnected` | Erreur « FX Radar disconnected », arrêt propre |
| Trame hors `]0, 500[ m/s` | `parseVelocityValue` retourne `null` | Trame ignorée, log console (pas d'erreur UI pour ne pas spammer) |
| Énumération échouée | `snapshot.error` | Surface dans le panneau diagnostic, validation pénalisée |

## 6. Comportement en saisie manuelle (fallback chronographe)

Lorsque le radar est indisponible, hors portée, ou que l'utilisateur préfère
saisir lui-même la vitesse :

1. La vitesse manuelle est saisie en unité d'affichage (m/s ou fps selon
   préférence utilisateur) puis convertie en SI via `toRef('velocity', v)`.
2. Elle passe par le **même** garde-fou `SI_BOUNDS.muzzleVelocity`
   (`[30, 2000] m/s`). Une saisie de 1150 (interprétée comme fps) sera
   rejetée avec `out-of-si-range` si l'unité d'affichage est m/s.
3. La saisie manuelle **n'écrase pas** la dernière mesure radar persistée
   tant que l'utilisateur ne l'a pas explicitement validée — un badge
   « Vitesse modifiée manuellement » apparaît à côté du champ.
4. Le statut radar (`connected`, `last reading at HH:MM:SS`) reste affiché
   pour indiquer que la valeur courante n'en provient pas.
5. Aucun mélange : la moyenne / écart-type calculés à partir d'un train de
   mesures radar est invalidé dès qu'une valeur manuelle est introduite, pour
   éviter une statistique mixte trompeuse.

## 7. Limites connues

- **RSSI indisponible** — l'API Web Bluetooth n'expose pas le RSSI pour les
  appareils déjà connectés. Aucun indicateur de qualité de signal n'est donc
  affiché ; cette limitation est documentée verbatim plutôt que masquée par
  une valeur fictive.
- **UUIDs FX non publics** — les UUIDs candidats viennent du reverse-
  engineering communautaire. Si la découverte trouve un UUID inconnu, il
  est journalisé en console pour identification (« Using discovered
  characteristic … from service … »).
- **Pas de scan passif** — Chromium ne fournit qu'un sélecteur explicite ;
  l'utilisateur doit appuyer sur « Connecter » à chaque session non
  reconnectée silencieusement.