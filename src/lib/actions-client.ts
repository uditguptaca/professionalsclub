/**
 * Server Actions, as the browser should call them.
 *
 * Every action returns a discriminated `{ ok, data | error }` result, and
 * every caller already handles `ok: false`. What no caller handled was the
 * one failure the action cannot report: the request never reaching the
 * server. A dropped connection REJECTS the call instead of resolving it, so
 * the `await` threw, the code after it (setBusy(false), the error line) never
 * ran, and the button stayed "Posting..." until a reload discarded the draft.
 * The audit reproduced that on publish, comment, chat send, RSVP and the
 * help-desk submit - 257 call sites in all.
 *
 * `guardActions(mod)` wraps a `'use server'` module's exports so a rejection
 * comes back as the same `{ ok: false, error }` shape, and the caller's
 * existing branch shows it inline. Files import their actions through it:
 *
 *   import * as actions from '@/app/actions/community';
 *   const { publishPost, likePost } = guardActions(actions);
 *
 * Only use it on modules whose exports return that shape. The handful that do
 * not (src/app/actions/auth.ts, business-invite.ts) keep their own try/catch.
 */

export const OFFLINE_ERROR = 'You seem to be offline. Nothing was sent - try again.';

type AnyAction = (...args: never[]) => Promise<unknown>;

export function guardActions<T extends object>(mod: T): T {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(mod)) {
    const value = (mod as Record<string, unknown>)[key];
    out[key] =
      typeof value === 'function'
        ? async (...args: unknown[]) => {
            try {
              return await (value as AnyAction)(...(args as never[]));
            } catch {
              return { ok: false, error: OFFLINE_ERROR };
            }
          }
        : value;
  }
  return out as T;
}
