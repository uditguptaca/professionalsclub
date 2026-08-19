'use client';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

/**
 * In-app confirmation for destructive actions.
 *
 * Replaces window.confirm(), which four call sites used for things like
 * suspending a member and deleting a post. Native confirm is wrong here for
 * three reasons: inside the Capacitor WebView it renders a system dialog
 * captioned with the origin ("localhost:3000 says…"), which reads as a broken
 * page rather than a considered warning; it cannot say which member or which
 * post in anything but plain text; and it blocks the JS thread.
 *
 * Built on <dialog> + showModal() rather than a hand-rolled overlay, so the
 * focus trap, Escape handling, inertness of the page behind, and aria-modal
 * semantics come from the platform instead of from code that has to remember
 * them. showModal() puts initial focus on Cancel, which is the right default
 * when the other button deletes something. The `tone` prop is the only styling
 * knob: destructive actions get the red confirm button, everything else gets
 * the normal primary.
 */

type Tone = 'danger' | 'primary';

export interface ConfirmOptions {
  title: string;
  /** One or two short sentences. Say what happens, and whether it can be undone. */
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
}

type Ask = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Ask | null>(null);

/**
 * Ask for confirmation. Resolves true if the user confirms, false on cancel,
 * Escape, or a backdrop click.
 *
 * Falls back to window.confirm if no provider is mounted, so a component used
 * outside the portal tree degrades instead of silently doing nothing.
 */
export function useConfirm(): Ask {
  const ctx = useContext(ConfirmContext);
  return useCallback(
    (options: ConfirmOptions) => {
      if (ctx) return ctx(options);
      return Promise.resolve(
        window.confirm([options.title, options.message].filter(Boolean).join('\n\n'))
      );
    },
    [ctx]
  );
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  const ask = useCallback<Ask>((next) => {
    setOptions(next);
    return new Promise<boolean>((resolve) => { resolveRef.current = resolve; });
  }, []);

  // showModal has to run after the dialog is in the DOM with the new content,
  // or the first open renders an empty box.
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (options && !el.open) el.showModal();
  }, [options]);

  const settle = useCallback((value: boolean) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    dialogRef.current?.close();
    setOptions(null);
  }, []);

  // Escape and the dialog's own close event both land here, so a dismissed
  // dialog always resolves rather than leaving the caller awaiting forever.
  const onClose = useCallback(() => {
    if (resolveRef.current) settle(false);
  }, [settle]);

  const tone: Tone = options?.tone ?? 'danger';

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      <dialog
        ref={dialogRef}
        className="confirm-dialog"
        onClose={onClose}
        onCancel={onClose}
        aria-labelledby="confirm-title"
        aria-describedby={options?.message ? 'confirm-message' : undefined}
        /* A click landing on the dialog element itself is a backdrop click:
           the panel inside stops propagation. */
        onClick={(e) => { if (e.target === dialogRef.current) settle(false); }}
      >
        {options && (
          <div className="confirm-panel" onClick={(e) => e.stopPropagation()}>
            <span className={`confirm-icon confirm-icon-${tone}`} aria-hidden="true">
              <AlertTriangle size={20} />
            </span>
            <h2 id="confirm-title">{options.title}</h2>
            {options.message && <p id="confirm-message">{options.message}</p>}
            <div className="confirm-actions">
              <button type="button" className="btn btn-ghost" onClick={() => settle(false)}>
                {options.cancelLabel ?? 'Cancel'}
              </button>
              <button
                type="button"
                className={tone === 'danger' ? 'btn btn-danger' : 'btn btn-primary'}
                onClick={() => settle(true)}
              >
                {options.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </ConfirmContext.Provider>
  );
}

/** Re-exported so a caller can show a spinner while the confirmed work runs. */
export { Loader2 as ConfirmSpinner };
