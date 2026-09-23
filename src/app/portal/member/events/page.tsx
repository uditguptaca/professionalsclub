import Link from 'next/link';
import type { CSSProperties } from 'react';
import { Calendar, Users, MapPin, Ticket, Plus, ChevronRight, Check } from 'lucide-react';
import { requireProfile } from '@/server/auth';
import { listMemberEvents } from '@/server/repos/home';
import { parseDateOnly } from '@/lib/dates';

export const dynamic = 'force-dynamic';

/**
 * The portal Events tab: every upcoming event, the member's city first.
 *
 * A card is now a door rather than a leaflet - it opens the event's own page,
 * where the pictures, the price, the venue and the RSVP live. The RSVP button
 * that used to sit on the card is gone with it: two tap targets per card made
 * the list feel busy, and the decision belongs next to the detail it depends on.
 *
 * A server component. The list is read-only and the member layout has already
 * authenticated the request.
 */

const monthDay = (iso: string | null): string => {
  const d = parseDateOnly(iso);
  if (!d) return 'Date TBA';
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
};

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency, minimumFractionDigits: 0 })
    .format(cents / 100);

export default async function MemberEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ going?: string }>;
}) {
  const profile = await requireProfile();
  // A URL param rather than client state: this is a server component, and a
  // bookmarkable "my events" is worth having anyway.
  const goingOnly = (await searchParams).going === '1';
  const { city, events: all } = await listMemberEvents(profile.id);
  const goingCount = all.filter((e) => e.myRsvp).length;
  const events = goingOnly ? all.filter((e) => e.myRsvp) : all;
  const inCity = events.filter((e) => e.inCity);
  const elsewhere = events.filter((e) => !e.inCity);
  const canCurate = profile.role === 'admin' || profile.isVolunteer;

  const pill = (on: boolean): CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 5, minHeight: 40, padding: '0 14px',
    borderRadius: 999, textDecoration: 'none', fontSize: '0.84rem', whiteSpace: 'nowrap',
    ...(on
      ? { background: 'var(--green-950)', color: '#fff', fontWeight: 700 }
      : { background: 'none', color: 'var(--text-secondary)', fontWeight: 600 }),
  });

  const card = (e: (typeof events)[number]) => (
    <Link key={e.id} href={`/portal/member/events/${e.id}`} className="hf-event card">
      <span className="hf-event-media">
        {e.image
          ? <img src={e.image} alt="" aria-hidden="true" loading="lazy" decoding="async" />
          : <span className="hf-event-fallback" aria-hidden="true"><Calendar size={28} /></span>}
        {e.inCity && city && <span className="hf-chip">{city}</span>}
        {/* The one thing the row never said: that you already RSVP'd. */}
        {e.myRsvp && (
          <span className="hf-chip" style={{ left: 'auto', right: '0.7rem', background: 'var(--green-950)', color: '#fff' }}>
            <Check size={11} aria-hidden="true" style={{ verticalAlign: '-1px' }} /> You&rsquo;re going
          </span>
        )}
      </span>
      <span className="hf-event-body">
        <strong>{e.title}</strong>
        {e.businessName && <small className="hf-event-host">Hosted by {e.businessName}</small>}
        <small><Calendar size={12} aria-hidden="true" /> {monthDay(e.date)}{e.time ? ` · ${e.time}` : ''}</small>
        <small>
          <Users size={12} aria-hidden="true" /> {e.attendees + e.going} going
          {e.venueName || e.location ? ` · ${e.venueName ?? e.location}` : ''}
        </small>
        <small style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 2, fontWeight: 750,
          color: e.admission === 'paid' ? 'var(--text-accent)' : 'var(--success-600)',
        }}>
          <Ticket size={12} aria-hidden="true" />
          {e.admission === 'paid' ? money(e.priceCents, e.currency) : 'Free'}
          {e.eventType === 'virtual' ? ' · Online' : e.eventType === 'hybrid' ? ' · Online or in person' : ''}
        </small>
      </span>
    </Link>
  );

  return (
    <div className="hf-page">
      <div className="hf-body" style={{ marginTop: 0 }}>
        <section className="hf-section">
          <div className="hf-section-head">
            <h1 style={{ fontSize: '1.45rem', margin: 0 }}>Events</h1>
            {events.length > 0 && (
              <span style={{ fontSize: '0.8rem', fontWeight: 650, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {events.length} upcoming
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
            {city ? `Everything coming up, ${city} first.` : 'Everything coming up across the club.'}
          </p>
          {(goingCount > 0 || goingOnly) && (
            <nav
              aria-label="Which events"
              style={{
                display: 'flex', gap: 4, padding: 4, marginTop: 8, background: 'var(--bg-primary)',
                borderRadius: 999, border: '1px solid rgba(27,67,50,0.08)', width: 'fit-content', maxWidth: '100%',
              }}
            >
              <Link href="/portal/member/events" style={pill(!goingOnly)} aria-current={!goingOnly ? 'page' : undefined}>
                Upcoming ({all.length})
              </Link>
              <Link href="/portal/member/events?going=1" style={pill(goingOnly)} aria-current={goingOnly ? 'page' : undefined}>
                <Check size={13} aria-hidden="true" /> Going ({goingCount})
              </Link>
            </nav>
          )}
          {canCurate && (
            <Link
              href="/portal/member/events/manage"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, minHeight: 44,
                fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-accent)', textDecoration: 'none',
              }}
            >
              <Plus size={14} aria-hidden="true" /> Post an event
            </Link>
          )}
        </section>

        {events.length === 0 && (
          <section className="hf-section">
            <div className="card" style={{ padding: '2.25rem 1.25rem', textAlign: 'center' }}>
              <Calendar size={28} aria-hidden="true" style={{ opacity: 0.35 }} />
              <p style={{ margin: '0.7rem 0 1rem', color: 'var(--text-secondary)' }}>
                {goingOnly
                  ? 'You have not said you are going to anything yet. Open an event and tap "I\u2019m going".'
                  : 'No upcoming events yet. New ones land here as soon as they are announced.'}
              </p>
              <Link href={goingOnly ? '/portal/member/events' : '/portal/member/community'} className="btn btn-outline">
                {goingOnly ? 'See all upcoming events' : 'Explore the community'}
              </Link>
            </div>
          </section>
        )}

        {inCity.length > 0 && (
          <section className="hf-section">
            <div className="hf-section-head">
              <h2><MapPin size={16} aria-hidden="true" style={{ verticalAlign: '-2px' }} /> In {city}</h2>
            </div>
            <div className="hf-events">{inCity.map(card)}</div>
          </section>
        )}

        {elsewhere.length > 0 && (
          <section className="hf-section">
            <div className="hf-section-head">
              <h2>{inCity.length > 0 ? 'Everywhere else' : 'Upcoming events'}</h2>
              {!city && <Link href="/portal/member/profile">Set your city <ChevronRight size={13} aria-hidden="true" /></Link>}
            </div>
            <div className="hf-events">{elsewhere.map(card)}</div>
          </section>
        )}
      </div>
    </div>
  );
}
