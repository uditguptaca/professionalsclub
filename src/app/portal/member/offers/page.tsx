'use client';
import React from 'react';
import Link from 'next/link';
import {
  Ticket, Tag, AlertCircle, CheckCircle2, Clock, Store, Globe, Loader2, CalendarClock,
} from 'lucide-react';
import PortalLoading from '@/components/portal/PortalLoading';
import CouponCode from '@/components/portal/CouponCode';
import { readCache, writeCache } from '@/lib/swr-cache';
import { fetchOffersAction, claimCouponAction } from '@/app/actions/events';
import type { OffersHome, MemberCoupon } from '@/server/repos/offers';

/**
 * Member offers: what the club's businesses are giving members, and the codes
 * this member is holding.
 *
 * The codes come first on purpose. A member opens this screen standing at a
 * counter far more often than they open it to browse, and hunting for the code
 * you already claimed is the one thing that would make the feature useless.
 *
 * Claiming is a single tap and then a code on screen. Nothing here decides
 * whether it is allowed: claim_coupon() checks the caps, the window and the
 * business's standing under a lock, and its refusal is what the member reads.
 */

const CACHE_KEY = 'member-offers';

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency, minimumFractionDigits: 0 })
    .format(cents / 100);

const value = (c: MemberCoupon): string => {
  if (c.discountKind === 'percent') return `${c.percentOff ?? 0}% off`;
  if (c.discountKind === 'amount') return `${money(c.amountOffCents ?? 0, c.currency)} off`;
  return 'Free item';
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** The days condition, in the words a member would use before setting off. */
export const daysLabel = (days: number[]): string | null => {
  if (!days || days.length === 0 || days.length === 7) return null;
  const set = [...days].sort((a, b) => a - b);
  if (set.join() === '1,2,3,4,5') return 'Weekdays only';
  if (set.join() === '0,6') return 'Weekends only';
  return set.map((d) => DAY_NAMES[d]).join(', ') + ' only';
};

const endsIn = (iso: string | null): string | null => {
  if (!iso) return null;
  const days = Math.ceil((Date.parse(iso) - Date.now()) / 86_400_000);
  if (!Number.isFinite(days)) return null;
  if (days <= 0) return 'Ends today';
  if (days === 1) return 'Ends tomorrow';
  if (days <= 14) return `${days} days left`;
  return `Until ${new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}`;
};

export default function MemberOffersPage() {
  const cached = readCache<OffersHome>(CACHE_KEY);
  const [data, setData] = React.useState<OffersHome | undefined>(cached);
  const [loading, setLoading] = React.useState(cached === undefined);
  const [error, setError] = React.useState('');
  const [claiming, setClaiming] = React.useState('');
  const [justClaimed, setJustClaimed] = React.useState('');

  const load = React.useCallback(async () => {
    const r = await fetchOffersAction();
    if (r.ok) { setData(r.data); writeCache(CACHE_KEY, r.data); }
    else setError(r.error);
    setLoading(false);
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const claimById = async (couponId: string) => {
    setError('');
    setClaiming(couponId);
    const r = await claimCouponAction(couponId);
    setClaiming('');
    if (!r.ok) { setError(r.error); return; }
    setJustClaimed(r.data.code);
    await load();
  };

  const claim = (coupon: MemberCoupon) => claimById(coupon.id);

  if (loading) return <PortalLoading label="Loading member offers" />;

  // "Live" is anything the member can still act on: a held in-store code, or
  // an online claim whose promo code still works. Online claims are marked
  // redeemed the moment they are made (no till confirms them), so filtering on
  // status alone filed the promo code under "already used" - the one place a
  // member about to type it into a checkout would never look.
  const usable = (c: { status: string; redeemMode: string; expiresAt: string | null }) =>
    c.status === 'reserved'
    || (c.redeemMode === 'online' && (!c.expiresAt || Date.parse(c.expiresAt) > Date.now()));
  const live = (data?.myCodes ?? []).filter(usable);
  const used = (data?.myCodes ?? []).filter((c) => c.status === 'redeemed' && !usable(c));
  const coupons = data?.coupons ?? [];

  return (
    <div className="hf-page">
      <div className="hf-body" style={{ marginTop: 0 }}>
        <section className="hf-section">
          <div className="hf-section-head">
            <h1 style={{ fontSize: '1.45rem', margin: 0 }}>Member offers</h1>
          </div>
          <p style={{ margin: 0, fontSize: '0.86rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            Discounts from businesses in the club, for members only. Claim one, show the
            code at the counter, and they mark it used.
          </p>
          {error && (
            <p className="community-error" role="alert" style={{ marginTop: 10 }}>
              <AlertCircle size={14} aria-hidden="true" /> {error}
            </p>
          )}
        </section>

        {live.length > 0 && (
          <section className="hf-section">
            <div className="hf-section-head">
              <h2>Your codes</h2>
            </div>
            {live.map((code) => (
              <CouponCode
                key={code.id}
                code={code}
                highlight={code.code === justClaimed}
                onRefresh={() => void claimById(code.couponId)}
              />
            ))}
          </section>
        )}

        <section className="hf-section">
          <div className="hf-section-head">
            <h2>{coupons.length > 0 ? 'Available now' : 'Offers'}</h2>
          </div>

          {coupons.length === 0 && (
            <div className="card" style={{ padding: '2rem 1.25rem', textAlign: 'center' }}>
              <Ticket size={26} aria-hidden="true" style={{ opacity: 0.35 }} />
              <p style={{ margin: '0.7rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                No member offers running right now. New ones appear here as businesses add them.
              </p>
            </div>
          )}

          {coupons.map((c) => {
            const exhausted = c.myClaims >= c.perMemberLimit;
            const soldOut = c.seatsLeft === 0;
            return (
              <article key={c.id} className="card" style={{ padding: '1rem', marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  {c.businessLogo && /^(https?:\/\/|\/)/.test(c.businessLogo) ? (
                    <img
                      src={c.businessLogo}
                      alt=""
                      style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'contain', background: '#fff', flexShrink: 0 }}
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      style={{
                        display: 'grid', placeItems: 'center', width: 44, height: 44, flexShrink: 0,
                        borderRadius: 10, background: 'var(--green-950)', color: '#fff', fontWeight: 800,
                      }}
                    >
                      {c.businessName.charAt(0)}
                    </span>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <strong style={{ display: 'block', fontSize: '1rem', lineHeight: 1.3 }}>{c.title}</strong>
                    <Link
                      href={`/businesses/${c.businessSlug}`}
                      style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', textDecoration: 'none' }}
                    >
                      {c.businessName}{c.businessCity ? ` · ${c.businessCity}` : ''}
                    </Link>
                  </div>
                </div>

                <p style={{
                  margin: '0.7rem 0 0.5rem', fontSize: '1.05rem', fontWeight: 800,
                  color: 'var(--text-accent)',
                }}>
                  {value(c)}
                  {c.minSpendCents > 0 && (
                    <span style={{ fontSize: '0.82rem', fontWeight: 650, color: 'var(--text-secondary)' }}>
                      {' '}on {money(c.minSpendCents, c.currency)} or more
                    </span>
                  )}
                </p>

                {c.description && (
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                    {c.description}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                  <span className="pp-chip" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                    {c.redeemMode === 'online'
                      ? <><Globe size={12} aria-hidden="true" /> Online</>
                      : <><Store size={12} aria-hidden="true" /> In store</>}
                  </span>
                  {daysLabel(c.validDays) && (
                    <span className="pp-chip" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                      <CalendarClock size={12} aria-hidden="true" /> {daysLabel(c.validDays)}
                    </span>
                  )}
                  {endsIn(c.endsAt) && (
                    <span className="pp-chip" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                      <Clock size={12} aria-hidden="true" /> {endsIn(c.endsAt)}
                    </span>
                  )}
                  {c.seatsLeft !== null && c.seatsLeft <= 20 && (
                    <span className="pp-chip" style={{ background: 'rgba(232, 93, 4, 0.10)', color: 'var(--primary-800)' }}>
                      {c.seatsLeft === 0 ? 'All claimed' : `${c.seatsLeft} left`}
                    </span>
                  )}
                </div>

                {c.terms && (
                  <details style={{ marginBottom: 10 }}>
                    <summary style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      Conditions
                    </summary>
                    <p style={{ margin: '0.4rem 0 0', fontSize: '0.82rem', lineHeight: 1.6, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                      {c.terms}
                    </p>
                  </details>
                )}

                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={claiming === c.id || exhausted || soldOut}
                  onClick={() => void claim(c)}
                  style={{ minHeight: 46, width: '100%', justifyContent: 'center', gap: 8 }}
                >
                  {claiming === c.id
                    ? <><Loader2 size={15} className="spin" aria-hidden="true" /> Claiming…</>
                    : exhausted
                      ? <>Claimed</>
                      : soldOut
                        ? <>All claimed</>
                        : <><Ticket size={15} aria-hidden="true" /> Claim this offer</>}
                </button>
              </article>
            );
          })}
        </section>

        {(data?.announcements.length ?? 0) > 0 && (
          <section className="hf-section">
            <div className="hf-section-head">
              <h2>Also for members</h2>
            </div>
            {data!.announcements.map((a) => (
              <div key={a.id} className="card" style={{ padding: '0.9rem 1rem', marginBottom: 10 }}>
                <strong style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.95rem' }}>
                  <Tag size={14} aria-hidden="true" style={{ color: 'var(--primary-600)' }} /> {a.title}
                </strong>
                <p style={{ margin: '0.35rem 0 0.2rem', fontSize: '0.86rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                  {a.description}
                </p>
                <Link
                  href={`/businesses/${a.businessSlug}`}
                  style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-accent)', textDecoration: 'none' }}
                >
                  {a.businessName}
                </Link>
              </div>
            ))}
          </section>
        )}

        {used.length > 0 && (
          <section className="hf-section">
            <div className="hf-section-head">
              <h2>Already used</h2>
            </div>
            {used.slice(0, 10).map((c) => (
              <div key={c.id} className="card" style={{ padding: '0.7rem 0.9rem', marginBottom: 8, opacity: 0.75 }}>
                <small style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-secondary)' }}>
                  <CheckCircle2 size={13} aria-hidden="true" style={{ color: 'var(--success-600)' }} />
                  <span style={{ flex: 1 }}>{c.couponTitle} · {c.businessName}</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{c.code}</span>
                </small>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
