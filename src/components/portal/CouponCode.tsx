'use client';
import React from 'react';
import { Copy, Clock, RefreshCw } from 'lucide-react';
import type { MyCouponCode } from '@/server/repos/offers';

/**
 * A claimed offer, as the member holds it up at the counter.
 *
 * The QR is the point of the screen, so it gets the room: big, high contrast,
 * and with the eight characters underneath, because a counter with a broken
 * camera still needs to be able to read it out.
 *
 * The countdown is honest rather than decorative. A code is held for thirty
 * minutes; when it lapses nothing is lost - claiming again hands the same
 * allowance back (0048) - so the expired state says exactly that instead of
 * looking like a failure.
 */

/** Ticks once a minute so the countdown does not lie while the phone is out. */
function useMinuteTick(active: boolean): void {
  const [, force] = React.useState(0);
  React.useEffect(() => {
    if (!active) return;
    const t = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, [active]);
}

const minutesLeft = (expiresAt: string | null): number | null => {
  if (!expiresAt) return null;
  const left = Date.parse(expiresAt) - Date.now();
  return Number.isFinite(left) ? Math.ceil(left / 60_000) : null;
};

export default function CouponCode({
  code,
  highlight = false,
  onRefresh,
}: {
  code: MyCouponCode;
  highlight?: boolean;
  /** Claim again once the hold has lapsed. Free: it does not spend an allowance. */
  onRefresh?: () => void;
}) {
  useMinuteTick(code.status === 'reserved');
  const [copied, setCopied] = React.useState(false);

  const online = code.redeemMode === 'online';
  const shown = online ? (code.promoCode ?? code.code) : code.code;
  const left = online ? null : minutesLeft(code.expiresAt);
  const lapsed = left !== null && left <= 0;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Blocked in some WebViews. The code is on screen either way.
    }
  };

  return (
    <div
      className="card"
      style={{
        padding: '1rem', marginBottom: 10, textAlign: online ? 'left' : 'center',
        border: highlight ? '1.5px solid var(--primary-600)' : undefined,
      }}
    >
      <small style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
        {code.couponTitle} · {code.businessName}
      </small>

      {!online && code.qr && !lapsed && (
        <img
          src={code.qr}
          alt={`QR code ${code.code}`}
          width={220}
          height={220}
          style={{
            width: 'min(220px, 62vw)', height: 'auto', display: 'block', margin: '0.75rem auto 0.5rem',
            borderRadius: 12, background: '#fff',
          }}
        />
      )}

      {lapsed ? (
        <div style={{ padding: '1.1rem 0 0.4rem' }}>
          <p style={{ margin: '0 0 0.7rem', fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            This code was held for 30 minutes and has lapsed. Showing it again costs
            you nothing.
          </p>
          {onRefresh && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onRefresh}
              style={{ minHeight: 46, justifyContent: 'center', gap: 8 }}
            >
              <RefreshCw size={15} aria-hidden="true" /> Show a fresh code
            </button>
          )}
        </div>
      ) : (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: online ? 'flex-start' : 'center',
            gap: 10, flexWrap: 'wrap', margin: online ? '0.6rem 0 0.5rem' : '0 0 0.5rem',
          }}>
            <strong style={{
              fontFamily: 'var(--font-mono)', fontSize: '1.5rem', letterSpacing: '0.16em',
              fontWeight: 800, color: 'var(--text-primary)',
            }}>
              {shown}
            </strong>
            <button type="button" className="bz-upload" onClick={() => void copy()} style={{ minHeight: 38 }}>
              <Copy size={13} aria-hidden="true" /> {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <p style={{
            margin: 0, fontSize: '0.82rem', lineHeight: 1.5, color: 'var(--text-secondary)',
          }}>
            {online
              ? 'Type this at their checkout.'
              : 'Show this at the counter. They scan it, and that is what marks it used.'}
            {left !== null && (
              <>
                {' '}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 750, color: 'var(--accent-700)' }}>
                  <Clock size={12} aria-hidden="true" /> {left} min left
                </span>
              </>
            )}
          </p>
        </>
      )}
    </div>
  );
}
