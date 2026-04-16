import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'conversion-history-v1';
const MAX_ENTRIES = 10;

export interface ConversionHistoryEntry {
  id: string;
  categoryKey: string;
  from: string;
  to: string;
  value: string;
  result: number;
  timestamp: number;
}

function readStorage(): ConversionHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStorage(entries: ConversionHistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore quota errors
  }
}

/** Hook providing a localStorage-backed list of the last 10 conversions. */
export function useConversionHistory() {
  const [entries, setEntries] = useState<ConversionHistoryEntry[]>(() => readStorage());

  // Sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setEntries(readStorage());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const add = useCallback((entry: Omit<ConversionHistoryEntry, 'id' | 'timestamp'>) => {
    setEntries(prev => {
      // De-duplicate against the most recent identical entry
      const last = prev[0];
      if (
        last &&
        last.categoryKey === entry.categoryKey &&
        last.from === entry.from &&
        last.to === entry.to &&
        last.value === entry.value
      ) {
        return prev;
      }
      const next: ConversionHistoryEntry[] = [
        { ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, timestamp: Date.now() },
        ...prev,
      ].slice(0, MAX_ENTRIES);
      writeStorage(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    writeStorage([]);
    setEntries([]);
  }, []);

  const remove = useCallback((id: string) => {
    setEntries(prev => {
      const next = prev.filter(e => e.id !== id);
      writeStorage(next);
      return next;
    });
  }, []);

  return { entries, add, clear, remove };
}
