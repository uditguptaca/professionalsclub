'use client';
import { useEffect } from 'react';

/**
 * Registers the PWA service worker - on the WEB only.
 *
 * The Capacitor shells are excluded on purpose: they have their own offline
 * page and their own update lifecycle, and a service worker inside the WebView
 * would be a second cache layer to debug ("why don't I see my changes"
 * with extra steps). Dev is excluded too, for the same reason.
 */
export default function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (cap?.isNativePlatform?.()) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Installability degrades gracefully; the site works identically.
    });
  }, []);
  return null;
}
