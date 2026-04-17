import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Sync a single filter value with a URL search param.
 * - Reading: returns the param value (or null when absent).
 * - Writing: passing null/'' removes the param.
 * Other params on the URL are preserved.
 */
export function useUrlFilter(key: string): [string | null, (value: string | null) => void] {
  const [params, setParams] = useSearchParams();
  const value = params.get(key);

  const setValue = useCallback(
    (next: string | null) => {
      setParams(
        prev => {
          const merged = new URLSearchParams(prev);
          if (next == null || next === '') merged.delete(key);
          else merged.set(key, next);
          return merged;
        },
        { replace: true },
      );
    },
    [key, setParams],
  );

  return [value, setValue];
}
