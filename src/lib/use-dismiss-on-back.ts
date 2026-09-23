'use client';
import { useEffect, useRef } from 'react';

/**
 * Make the Back button close an overlay instead of leaving the page.
 *
 * On Android (and in the WebView the store app is), Back is how people close
 * things. A sheet that ignores it sends them off the page and throws away
 * where they were and the filters they had set. So: when `open` turns true,
 * push one history entry; if Back pops it, call `close()`; if the overlay is
 * closed by its own controls first, pop the entry ourselves so a later Back
 * does not land on a phantom step.
 *
 * Nested overlays work because each pushes its own token and only the
 * overlay whose token just vanished from history.state closes - the topmost.
 *
 * Next's app router patches pushState and copies its own state onto the entry,
 * so popping back to it restores the same URL and tree with no visible change.
 *
 * ponytail: navigating away WHILE an overlay is open (a link inside the More
 * sheet) leaves the pushed entry behind, so one extra Back press is needed
 * later to leave that page. Closing the overlay before navigating would fix
 * it at the cost of a race with router.push; not worth it today.
 */
export function useDismissOnBack(open: boolean, close: () => void): void {
  // Always the latest close(), without re-running the effect on every render.
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!open || typeof window === 'undefined') return;

    const token = `overlay-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const state = window.history.state;
    window.history.pushState(
      { ...(state && typeof state === 'object' ? state : {}), overlay: token },
      '',
    );

    let poppedByBack = false;
    const onPop = () => {
      const current = window.history.state as { overlay?: string } | null;
      if (current?.overlay === token) return; // something above us was popped
      poppedByBack = true;
      closeRef.current();
    };
    window.addEventListener('popstate', onPop);

    return () => {
      window.removeEventListener('popstate', onPop);
      const current = window.history.state as { overlay?: string } | null;
      // Closed by a tap, not by Back, and our entry is still the top one:
      // remove it. If the page navigated meanwhile, the top is someone
      // else's entry and going back would be wrong, so leave it.
      if (!poppedByBack && current?.overlay === token) window.history.back();
    };
  }, [open]);
}
