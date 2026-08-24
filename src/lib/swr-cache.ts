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

/**
 * Keys shared between a page and the portal shell's idle prefetch.
 *
 * Each one holds the payload of that page's ONE combined "start" action,
 * stored exactly as the action returned it — the shell writes it, the page
 * reads it, and nothing in between reshapes it. Listing them here is what
 * stops the prefetcher warming a key no page ever looks at.
 */
export const CACHE_KEYS = {
  dashboard: 'home-feed',
  community: 'community-start',
  jobs: 'companies',
  chats: 'chat-start',
  notifications: 'notifications-start',
  matrimony: 'matrimony-start',
  referrals: 'referrals-start',
} as const;

export function readCache<T>(key: string): T | undefined {
  return store.get(key) as T | undefined;
}

export function writeCache<T>(key: string, data: T): void {
  store.set(key, data);
}

/**
 * Run `fn` once the browser is idle, or shortly after on browsers with no
 * requestIdleCallback (Safari). Returns a cancel function.
 *
 * Used by anything that wants the network AFTER the page the member is looking
 * at has finished loading: Next runs a client's Server Action calls one at a
 * time, so a background fetch started too eagerly delays the foreground one.
 */
export function onIdle(fn: () => void, timeout = 2000): () => void {
  const w = window as typeof window & {
    requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
    cancelIdleCallback?: (h: number) => void;
  };
  if (typeof w.requestIdleCallback === 'function') {
    const h = w.requestIdleCallback(fn, { timeout });
    return () => w.cancelIdleCallback?.(h);
  }
  const t = setTimeout(fn, Math.min(timeout, 500));
  return () => clearTimeout(t);
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
