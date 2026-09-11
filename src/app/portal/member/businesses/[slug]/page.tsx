'use client';
import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Building2, MapPin, Phone, Mail, Globe, Clock, Ticket, Calendar, Star,
  AlertCircle, Loader2, CalendarClock, Store, ExternalLink,
} from 'lucide-react';
import PortalLoading from '@/components/portal/PortalLoading';
import CouponCode from '@/components/portal/CouponCode';
import { fetchBusinessPageAction, claimCouponAction } from '@/app/actions/events';
import type { MemberBusinessPage, MemberCoupon } from '@/server/repos/offers';
import { parseDateOnly } from '@/lib/dates';

/**
 * A business, for a member standing in front of it.
 *
 * This is where the QR comes from: open the business, tap the offer, and the
 * code is on screen for the counter to scan. The member's live codes for THIS
 * business sit at the top, because the second visit is the one where they are
 * already holding one.
 *
 * The conditions are on the card before the claim, not buried in terms after
 * it: which days it runs, what the minimum spend is, how many are left. A
 * member should know they cannot use it today before they walk over.
 */

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const daysLabel = (days: number[]): string | null => {
  if (!days || days.length === 0 || days.length === 7) return null;
  const set = [...days].sort((a, b) => a - b);
  if (set.join() === '1,2,3,4,5') return 'Weekdays only';
  if (set.join() === '0,6') return 'Weekends only';
  return set.map((d) => DAY_NAMES[d]).join(', ') + ' only';
};

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency, minimumFractionDigits: 0 })
    .format(cents / 100);

const value = (c: MemberCoupon): string => {
  if (c.discountKind === 'percent') return `${c.percentOff ?? 0}% off`;
  if (c.discountKind === 'amount') return `${money(c.amountOffCents ?? 0, c.currency)} off`;
  return 'Free item';
};

const monthDay = (iso: string | null): string => {
  const d = parseDateOnly(iso);
  return d ? d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) : 'Date TBA';
};

const isImage = (logo: string | null) => Boolean(logo && /^(https?:\/\/|\/)/.test(logo));

const ROW: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, padding: '0.65rem 0',
  borderBottom: '1px solid var(--border-color)', textDecoration: 'none',
  color: 'var(--text-primary)', fontSize: '0.9rem',
};

export default function MemberBusinessPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';

  const [page, setPage] = React.useState<MemberBusinessPage | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [claiming, setClaiming] = React.useState('');
  const [justClaimed, setJustClaimed] = React.useState('');

  const load = React.useCallback(async () => {
    const r = await fetchBusinessPageAction(slug);
    if (r.ok) {
      if (r.data) setPage(r.data);
      else setError('That business is not listed.');
    } else setError(r.error);
    setLoading(false);
  }, [slug]);

  React.useEffect(() => { void load(); }, [load]);

  const claim = async (couponId: string) => {
    setError('');
    setClaiming(couponId);
    const r = await claimCouponAction(couponId);
    setClaiming('');
    if (!r.ok) { setError(r.error); return; }
    setJustClaimed(r.data.code);
    await load();
  };

  if (loading) return <PortalLoading label="Loading the business" />;

  if (error && !page) {
    return (
      <div>
        <div role="alert" className="community-error">
          <AlertCircle size={15} aria-hidden="true" /> {error}
        </div>
        <Link href="/portal/member/businesses" className="btn btn-outline" style={{ marginTop: 14 }}>
          Back to the directory
        </Link>
      </div>
    );
  }
  if (!page) return null;

  return (
    <div className="hf-page">
      <div className="hf-body" style={{ marginTop: 0 }}>
        {/* Identity */}
        <section className="hf-section">
          {page.coverImage && (
            <img
              src={page.coverImage}
              alt=""
              style={{
                width: '100%', aspectRatio: '16 / 7', objectFit: 'cover',
                borderRadius: 'var(--radius-lg)', marginBottom: 12, display: 'block',
              }}
            />
          )}
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            {isImage(page.logo) ? (
              <img
                src={page.logo as string}
                alt=""
                style={{ width: 52, height: 52, borderRadius: 12, objectFit: 'contain', background: '#fff', flexShrink: 0 }}
              />
            ) : (
              <span
                aria-hidden="true"
                style={{
                  display: 'grid', placeItems: 'center', width: 52, height: 52, flexShrink: 0,
                  borderRadius: 12, background: 'var(--green-950)', color: '#fff',
                  fontWeight: 800, fontSize: '1.05rem',
                }}
              >
                {page.logo?.trim() || page.name.charAt(0)}
              </span>
            )}
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontSize: '1.3rem', margin: '0 0 2px', lineHeight: 1.25 }}>{page.name}</h1>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {page.category}{page.city ? ` · ${page.city}` : ''}
                {page.isFeatured && (
                  <>
                    {' · '}
                    <Star size={12} aria-hidden="true" style={{ color: 'var(--primary-600)', verticalAlign: '-1px' }} />
                    {' '}Featured
                  </>
                )}
              </p>
            </div>
          </div>

          {page.descriptionShort && (
            <p style={{ margin: '0.8rem 0 0', fontSize: '0.92rem', lineHeight: 1.65, color: 'var(--text-secondary)' }}>
              {page.descriptionShort}
            </p>
          )}

          {error && (
            <p className="community-error" role="alert" style={{ marginTop: 10 }}>
              <AlertCircle size={14} aria-hidden="true" /> {error}
            </p>
          )}
        </section>

        {/* Codes this member is already holding here. */}
        {page.myCodes.length > 0 && (
          <section className="hf-section">
            <div className="hf-section-head"><h2>Ready to show</h2></div>
            {page.myCodes.map((code) => (
              <CouponCode
                key={code.id}
                code={code}
                highlight={code.code === justClaimed}
                onRefresh={() => void claim(code.couponId)}
              />
            ))}
          </section>
        )}

        {/* Offers */}
        {page.coupons.length > 0 && (
          <section className="hf-section">
            <div className="hf-section-head"><h2>Member offers</h2></div>
            {page.coupons.map((c) => {
              const exhausted = c.myClaims >= c.perMemberLimit;
              const soldOut = c.seatsLeft === 0;
              return (
                <article key={c.id} className="card" style={{ padding: '1rem', marginBottom: 12 }}>
                  <strong style={{ display: 'block', fontSize: '1rem', lineHeight: 1.3 }}>{c.title}</strong>
                  <p style={{ margin: '0.45rem 0 0.5rem', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-accent)' }}>
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

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
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
                    onClick={() => void claim(c.id)}
                    style={{ minHeight: 48, width: '100%', justifyContent: 'center', gap: 8 }}
                  >
                    {claiming === c.id
                      ? <><Loader2 size={15} className="spin" aria-hidden="true" /> Getting your code…</>
                      : exhausted ? 'Claimed'
                        : soldOut ? 'All claimed'
                          : <><Ticket size={15} aria-hidden="true" /> Get my code</>}
                  </button>
                </article>
              );
            })}
          </section>
        )}

        {page.announcements.length > 0 && (
          <section className="hf-section">
            <div className="hf-section-head"><h2>Also for members</h2></div>
            {page.announcements.map((a) => (
              <div key={a.id} className="card" style={{ padding: '0.9rem 1rem', marginBottom: 10 }}>
                <strong style={{ fontSize: '0.95rem' }}>{a.title}</strong>
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.86rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                  {a.description}
                </p>
              </div>
            ))}
          </section>
        )}

        {page.events.length > 0 && (
          <section className="hf-section">
            <div className="hf-section-head"><h2>Coming up</h2></div>
            {page.events.map((e) => (
              <Link key={e.id} href={`/portal/member/events/${e.id}`} className="pp-row" style={{ textDecoration: 'none' }}>
                <span className="pp-row-icon" aria-hidden="true"><Calendar size={17} /></span>
                <span className="pp-row-body">
                  <strong>{e.title}</strong>
                  <small>
                    {monthDay(e.date)}{e.time ? ` · ${e.time}` : ''}
                    {' · '}{e.admission === 'paid' ? money(e.priceCents, e.currency) : 'Free'}
                  </small>
                </span>
              </Link>
            ))}
          </section>
        )}

        {/* Getting hold of them */}
        <section className="hf-section">
          <div className="hf-section-head"><h2>Contact</h2></div>
          <div className="card" style={{ padding: '0 1rem' }}>
            {page.address && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent([page.address, page.city].filter(Boolean).join(', '))}`}
                target="_blank"
                rel="noopener noreferrer"
                style={ROW}
              >
                <MapPin size={16} aria-hidden="true" style={{ color: 'var(--primary-600)' }} />
                <span style={{ flex: 1 }}>{page.address}</span>
                <ExternalLink size={13} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />
              </a>
            )}
            {page.phone && (
              <a href={`tel:${page.phone}`} style={ROW}>
                <Phone size={16} aria-hidden="true" style={{ color: 'var(--primary-600)' }} />
                <span style={{ flex: 1 }}>{page.phone}</span>
              </a>
            )}
            {page.email && (
              <a href={`mailto:${page.email}`} style={ROW}>
                <Mail size={16} aria-hidden="true" style={{ color: 'var(--primary-600)' }} />
                <span style={{ flex: 1 }}>{page.email}</span>
              </a>
            )}
            {page.website && (
              <a href={page.website} target="_blank" rel="noopener noreferrer" style={ROW}>
                <Globe size={16} aria-hidden="true" style={{ color: 'var(--primary-600)' }} />
                <span style={{ flex: 1 }}>Website</span>
                <ExternalLink size={13} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />
              </a>
            )}
            {page.businessHours && (
              <div style={{ ...ROW, borderBottom: 0 }}>
                <Clock size={16} aria-hidden="true" style={{ color: 'var(--primary-600)' }} />
                <span style={{ flex: 1 }}>{page.businessHours}</span>
              </div>
            )}
          </div>

          {page.descriptionFull && (
            <p style={{ margin: '1rem 0 0', fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
              {page.descriptionFull}
            </p>
          )}

          <Link
            href={`/businesses/${page.slug}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, minHeight: 44, marginTop: 8,
              fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-accent)', textDecoration: 'none',
            }}
          >
            <Building2 size={14} aria-hidden="true" /> Their public page
          </Link>
        </section>
      </div>
    </div>
  );
}
