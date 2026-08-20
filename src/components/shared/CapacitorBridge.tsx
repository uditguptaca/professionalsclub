'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * Glue between the hosted site and the native app shells.
 *
 * The store apps load this site in a Capacitor WebView, which injects a
 * `window.Capacitor` bridge into the page. On the plain web this component
 * does nothing at all.
 *
 * What it wires when running inside the app:
 *   - Android hardware back: navigate the in-app history; on the root screen,
 *     minimize the app instead of dead-ending (Play pre-launch reports flag
 *     apps where back does nothing).
 *   - Tags <html> with `capacitor-app` so CSS can adapt if ever needed
 *     (e.g. hiding "download the app" prompts inside the app itself).
 */

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  Plugins?: {
    App?: {
      addListener: (event: 'backButton', cb: (state: { canGoBack: boolean }) => void) => void;
      exitApp: () => void;
      minimizeApp?: () => void;
    };
  };
};

export default function CapacitorBridge() {
  const pathname = usePathname();
  const router = useRouter();

  // Inside the native shell, the app's home is the portal. If navigation ever
  // lands on the marketing homepage (old shortcut, brand-logo link, stray
  // back-swipe), send it to the portal entry: signed-out gets the sign-in
  // screen, signed-in gets bounced to their dashboard by the proxy. Watching
  // pathname matters - a client-side <Link> to '/' never remounts this
  // component, so a mount-only check misses it.
  useEffect(() => {
    const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
    if (!cap?.isNativePlatform?.()) return;
    if (pathname === '/') router.replace('/portal/auth');
  }, [pathname, router]);

  useEffect(() => {
    const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
    if (!cap?.isNativePlatform?.()) return;

    document.documentElement.classList.add('capacitor-app');

    cap.Plugins?.App?.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack || window.history.length > 1) {
        window.history.back();
      } else {
        (cap.Plugins?.App?.minimizeApp ?? cap.Plugins?.App?.exitApp)?.();
      }
    });
  }, []);

  return null;
}
