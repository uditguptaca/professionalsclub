import Link from 'next/link';
import { Calendar, Users, MapPin } from 'lucide-react';
import { requireProfile } from '@/server/auth';
import { listMemberEvents } from '@/server/repos/home';

export const dynamic = 'force-dynamic';

/**
 * The portal Events tab: every upcoming event, the member's city first, in the
 * same card language as the home feed. A server component — the list is
 * read-only and the member layout has already authenticated the request.
 */

const monthDay = (iso: string | null): string => {
  if (!iso) return 'Date TBA';
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
};

export default async function MemberEventsPage() {
  const profile = await requireProfile();
  const { city, events } = await listMemberEvents(profile.id);
  const inCity = events.filter((e) => e.inCity);
  const elsewhere = events.filter((e) => !e.inCity);

  const card = (e: (typeof events)[number]) => (
    <a
      key={e.id}
      href={e.rsvpUrl ?? undefined}
      className="hf-event card"
      target={e.rsvpUrl ? '_blank' : undefined}
      rel={e.rsvpUrl ? 'noopener noreferrer' : undefined}
    >
      <span className="hf-event-media">
        {e.image
          ? <img src={e.image} alt="" aria-hidden="true" />
          : <span className="hf-event-fallback" aria-hidden="true"><Calendar size={28} /></span>}
        {e.inCity && city && <span className="hf-chip">{city}</span>}
      </span>
      <span className="hf-event-body">
        <strong>{e.title}</strong>
        <small><Calendar size={12} aria-hidden="true" /> {monthDay(e.date)}{e.time ? ` · ${e.time}` : ''}</small>
        <small><Users size={12} aria-hidden="true" /> {e.attendees} attending{e.location ? ` · ${e.location}` : ''}</small>
      </span>
    </a>
  );

  return (
    <div className="hf-page">
      <div className="hf-body" style={{ marginTop: 0 }}>
        <section className="hf-section">
          <div className="hf-section-head">
            <h1 style={{ fontSize: '1.45rem', margin: 0 }}>Events</h1>
          </div>

          {events.length === 0 && (
            <div className="card" style={{ padding: '2rem 1.25rem', textAlign: 'center' }}>
              <Calendar size={28} aria-hidden="true" style={{ opacity: 0.4 }} />
              <p style={{ margin: '0.6rem 0 0', color: 'var(--text-secondary)' }}>
                No upcoming events yet. New ones land here as soon as they are announced.
              </p>
            </div>
          )}

          {inCity.length > 0 && (
            <>
              <div className="hf-section-head">
                <h2><MapPin size={16} aria-hidden="true" style={{ verticalAlign: '-2px' }} /> In {city}</h2>
              </div>
              <div className="hf-events">{inCity.map(card)}</div>
            </>
          )}

          {elsewhere.length > 0 && (
            <>
              <div className="hf-section-head">
                <h2>{inCity.length > 0 ? 'Everywhere else' : 'Upcoming events'}</h2>
                {!city && (
                  <Link href="/portal/member/dashboard">Set your city</Link>
                )}
              </div>
              <div className="hf-events">{elsewhere.map(card)}</div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
