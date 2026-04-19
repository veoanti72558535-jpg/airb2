import { useCallback, useEffect, useState } from 'react';

/**
 * Tranche Q — préférence UX locale pour la zone vitale du PBR.
 *
 * Stocke en localStorage **un seul nombre** : le diamètre de la zone vitale
 * en mètres (unité de référence stable, indépendamment des préférences
 * d'affichage `useUnits`). La valeur est purement UX :
 *
 *  - jamais lue par le moteur balistique
 *  - jamais exportée dans les sessions
 *  - jamais persistée par session/arme/projectile (hors scope V1)
 *
 * Robustesse :
 *  - JSON malformé / valeur non-finie / négative → fallback défaut
 *  - synchronisation multi-onglets via l'événement `storage`
 *  - écriture défensive (try/catch quota)
 */

const STORAGE_KEY = 'pbr-vital-zone-m-v1';

/** Diamètre par défaut : 50 mm = 0.05 m (cohérent avec l'ancien défaut UI). */
export const DEFAULT_PBR_VITAL_ZONE_M = 0.05;

function readValue(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return DEFAULT_PBR_VITAL_ZONE_M;
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'number' && Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
    return DEFAULT_PBR_VITAL_ZONE_M;
  } catch {
    return DEFAULT_PBR_VITAL_ZONE_M;
  }
}

function writeValue(meters: number) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meters));
  } catch {
    // ignore quota errors — purely UX, not critical
  }
}

/**
 * Hook donnant accès au diamètre de zone vitale PBR persisté localement.
 * Toujours en mètres (unité de référence). La conversion d'affichage est
 * de la responsabilité du consommateur via `useUnits`.
 */
export function usePbrPrefs() {
  const [vitalZoneM, setVitalZoneMState] = useState<number>(() => readValue());

  // Cross-tab sync — keeps multiple QuickCalc/Sessions tabs aligned.
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setVitalZoneMState(readValue());
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const setVitalZoneM = useCallback((meters: number) => {
    if (!Number.isFinite(meters) || meters <= 0) return;
    setVitalZoneMState(meters);
    writeValue(meters);
  }, []);

  const reset = useCallback(() => {
    setVitalZoneMState(DEFAULT_PBR_VITAL_ZONE_M);
    writeValue(DEFAULT_PBR_VITAL_ZONE_M);
  }, []);

  return { vitalZoneM, setVitalZoneM, reset };
}

/** Test-only export — clé exposée pour permettre clear/inspect dans les tests. */
export const __PBR_PREFS_KEY = STORAGE_KEY;
