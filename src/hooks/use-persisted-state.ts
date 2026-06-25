"use client";

import { useEffect, useState } from "react";

/**
 * useState whose value is mirrored to localStorage. Reads the stored value
 * after mount (not during render) so server and client markup match.
 */
export function usePersistedState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) setValue(JSON.parse(raw) as T);
    } catch {
      // ignore malformed/blocked storage
    }
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore quota/blocked storage
    }
  }, [key, value, hydrated]);

  return [value, setValue] as const;
}
