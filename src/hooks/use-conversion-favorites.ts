import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'conversion-favorites-v1';

function readStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function writeStorage(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore quota errors
  }
}

/**
 * Hook providing a localStorage-backed list of favorite conversion category keys.
 * Order in the array reflects pin order (most recent first).
 */
export function useConversionFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => readStorage());

  // Sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setFavorites(readStorage());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const isFavorite = useCallback(
    (categoryKey: string) => favorites.includes(categoryKey),
    [favorites],
  );

  const toggle = useCallback((categoryKey: string) => {
    setFavorites(prev => {
      const next = prev.includes(categoryKey)
        ? prev.filter(k => k !== categoryKey)
        : [categoryKey, ...prev];
      writeStorage(next);
      return next;
    });
  }, []);

  return { favorites, isFavorite, toggle };
}
