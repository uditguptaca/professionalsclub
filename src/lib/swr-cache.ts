'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Session-level stale-while-revalidate for Server Action data.
 *
 * The database is remote, so every action costs real round-trip time. Pages
 * that already showed data once should never make the member stare at a
 * skeleton again: this cache keeps the last result in module memory (it
 * survives client-side navigation, dies with the tab), renders it instantly,
 * and refreshes in the background.
 *
 * No TTL on purpose — data is ALWAYS revalidated on mount; the cache only
 * decides what the member looks at while that happens.
 */

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const store = new Map<string, unknown>();

export function readCache<T>(key: string): T | undefined {
  return store.get(key) as T | undefined;
}

export function writeCache<T>(key: string, data: T): void {
  store.set(key, data);
}

export function dropCache(prefix: string): void {
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}

/**
 * data: cached instantly when available, then live after revalidation.
 * loading: true only when there is NOTHING to show (first ever visit).
 * refresh(): re-runs the fetcher and updates cache + state; mutation handlers
 * should call it instead of duplicating fetch logic.
 */
export function useCachedAction<T>(
  key: string,
  fetcher: () => Promise<Result<T>>,
): { data: T | undefined; loading: boolean; error: string; refresh: () => Promise<void> } {
  const cached = readCache<T>(key);
  const [data, setData] = useState<T | undefined>(cached);
  const [loading, setLoading] = useState(cached === undefined);
  const [error, setError] = useState('');
  // The latest fetcher without re-running the effect on every render.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refresh = useCallback(async () => {
    const r = await fetcherRef.current();
    if (r.ok) {
      writeCache(key, r.data);
      setData(r.data);
      setError('');
    } else {
      setError(r.error);
    }
    setLoading(false);
  }, [key]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
