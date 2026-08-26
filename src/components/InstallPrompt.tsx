'use client';
import React from 'react';

/**
 * The in-app "Install" banner. Browsers almost never volunteer their own
 * install popup any more (Brave never does, Chrome only after engagement
 * heuristics), so the site offers its own:
 *
 * - Chromium: capture `beforeinstallprompt`, show the banner, and call
 *   prompt() from the button - a user gesture, as the API requires.
 * - iOS Safari: no such event exists; show the Share -> Add to Home Screen
 *   instructions instead.
 *
 * Never shown inside the Capacitor apps, in an already-installed window,
 * or for 14 days after the member dismisses it.
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'pc-install-dismissed-at';
const DISMISS_FOR_MS = 14 * 24 * 60 * 60 * 1000;

function dismissedRecently(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return !!at && Date.now() - at < DISMISS_FOR_MS;
  } catch { return false; }
}

function rememberDismissal() {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* fine */ }
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

function isNativeShell(): boolean {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return cap?.isNativePlatform?.() === true;
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua)
    || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1); // iPadOS lies
  return ios && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

export default function InstallPrompt() {
  const [mode, setMode] = React.useState<'hidden' | 'chromium' | 'ios'>('hidden');
  const promptRef = React.useRef<BeforeInstallPromptEvent | null>(null);
  // Phones show the portal tab bar along the bottom; sit above it.
  const [aboveTabbar, setAboveTabbar] = React.useState(false);

  React.useEffect(() => {
    if (isNativeShell() || isStandalone() || dismissedRecently()) return;

    let iosTimer: ReturnType<typeof setTimeout> | undefined;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      promptRef.current = e as BeforeInstallPromptEvent;
      setAboveTabbar(!!document.querySelector('.tabbar')?.clientHeight);
      setMode('chromium');
    };
    const onInstalled = () => setMode('hidden');

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    if (process.env.NODE_ENV === 'production' && isIosSafari()) {
      // Give the page a beat so the banner never competes with first paint.
      iosTimer = setTimeout(() => {
        setAboveTabbar(!!document.querySelector('.tabbar')?.clientHeight);
        setMode('ios');
      }, 4000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  if (mode === 'hidden') return null;

  const dismiss = () => { rememberDismissal(); setMode('hidden'); };

  const install = async () => {
    const ev = promptRef.current;
    if (!ev) return;
    promptRef.current = null;
    setMode('hidden');
    try {
      await ev.prompt();
      const { outcome } = await ev.userChoice;
      if (outcome === 'dismissed') rememberDismissal();
    } catch { rememberDismissal(); }
  };

  return (
    <div className={`install-banner ${aboveTabbar ? 'above-tabbar' : ''}`} role="region" aria-label="Install the app">
      <img src="/icons/pwa-192.png" alt="" width={40} height={40} className="install-banner-icon" />
      <div className="install-banner-copy">
        <strong>Get the app</strong>
        {mode === 'chromium' ? (
          <span>Install Professionals Club on this device.</span>
        ) : (
          <span>Tap the Share button, then &ldquo;Add to Home Screen&rdquo;.</span>
        )}
      </div>
      {mode === 'chromium' && (
        <button type="button" className="install-banner-cta" onClick={install}>Install</button>
      )}
      <button type="button" className="install-banner-close" onClick={dismiss} aria-label="Not now">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
