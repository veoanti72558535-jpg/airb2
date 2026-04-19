import { useCallback, useEffect, useState } from 'react';

/**
 * Tranche N — préférences UX locales pour les projectiles.
 *
 * Stocke en localStorage :
 *  - la liste des IDs favoris (pinnés par l'utilisateur)
 *  - la liste des IDs récents (mis à jour à chaque sélection dans QuickCalc)
 *
 * Volontairement **hors du modèle métier `Projectile`** : ces données sont
 * purement UX, jamais lues par le moteur balistique, jamais exportées dans
 * les sessions. Elles peuvent être effacées sans aucun impact métier.
 *
 * Les IDs sont conservés tels quels — si un projectile est supprimé de la
 * bibliothèque, l'UI consommatrice est responsable de filtrer les IDs
 * orphelins (la résolution se fait par lookup dans la liste fournie).
 */

const FAVORITES_KEY = 'projectile-favorites-v1';
const RECENTS_KEY = 'projectile-recents-v1';

/** Limite haute des récents — empêche la liste de gonfler indéfiniment. */
export const RECENTS_MAX = 15;

function readIds(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === 'string' && v.length > 0)
      : [];
  } catch {
    return [];
  }
}

function writeIds(key: string, ids: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // ignore quota errors — purely UX, not critical
  }
}

/**
 * Hook donnant accès aux favoris + récents projectile, persistés localement
 * et synchronisés entre onglets via l'événement `storage`.
 */
export function useProjectilePrefs() {
  const [favorites, setFavorites] = useState<string[]>(() => readIds(FAVORITES_KEY));
  const [recents, setRecents] = useState<string[]>(() => readIds(RECENTS_KEY));

  // Cross-tab sync — keeps multiple QuickCalc tabs aligned.
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === FAVORITES_KEY) setFavorites(readIds(FAVORITES_KEY));
      else if (e.key === RECENTS_KEY) setRecents(readIds(RECENTS_KEY));
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const isFavorite = useCallback(
    (id: string) => !!id && favorites.includes(id),
    [favorites],
  );

  const toggleFavorite = useCallback((id: string) => {
    if (!id) return;
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [id, ...prev];
      writeIds(FAVORITES_KEY, next);
      return next;
    });
  }, []);

  /**
   * Ajoute un projectile aux récents. Pas de doublon ; le plus récent est
   * toujours en tête. La liste est bornée par `RECENTS_MAX`.
   * Les IDs vides (saisie manuelle) sont ignorés.
   */
  const pushRecent = useCallback((id: string) => {
    if (!id) return;
    setRecents(prev => {
      const next = [id, ...prev.filter(x => x !== id)].slice(0, RECENTS_MAX);
      writeIds(RECENTS_KEY, next);
      return next;
    });
  }, []);

  const clearRecents = useCallback(() => {
    writeIds(RECENTS_KEY, []);
    setRecents([]);
  }, []);

  return {
    favorites,
    recents,
    isFavorite,
    toggleFavorite,
    pushRecent,
    clearRecents,
  };
}

/** Test-only export — keys exposed so tests can clear/inspect storage. */
export const __PROJECTILE_PREFS_KEYS = {
  FAVORITES_KEY,
  RECENTS_KEY,
};
