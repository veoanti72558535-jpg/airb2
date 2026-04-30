# Documentation FX

Cette section regroupe la documentation utilisateur et technique de l'écosystème
**FX Airguns** intégré dans AirBallistik :

- [Profils airguns FX](./airguns-profiles.md) — modèles supportés, plages
  validées (calibres, vitesses, BC), erreurs utilisateur courantes et
  comportement du moteur balistique en cas de **correction météo manuelle**.
- [Chronographe FX Radar BLE](./radar-ble.md) — protocole Web Bluetooth,
  appairage, plages de vitesse acceptées par le parseur, codes d'erreur
  remontés à l'utilisateur, et fallback vers la saisie manuelle de la vitesse
  initiale.

## Périmètre

Tout calcul balistique reste **déterministe** (G1 + intégration Euler, voir
[`docs/engine/deterministic-contract.md`](../engine/deterministic-contract.md)).
Les bornes décrites ici proviennent du contrat SI partagé
(`SI_BOUNDS` dans `supabase/functions/_shared/si-guardrail.ts`) et du parseur
BLE (`src/lib/chrono/fx-radar-ble.ts`). Toute valeur hors plage est **rejetée
côté client** avant appel au moteur, et **re-rejetée côté backend** si le
payload atteint l'edge function.