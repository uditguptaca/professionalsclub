'use client';
import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Calendar, Clock, MapPin, Users, Ticket, Video, Building2, Mail, ExternalLink,
  AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import PortalLoading from '@/components/portal/PortalLoading';
import RsvpButton from '@/components/portal/RsvpButton';
import { fetchEventAction } from '@/app/actions/events';
import type { EventDetail } from '@/server/repos/events';

/**
 * One event, everything about it.
 *
 * Members used to get a card and a link out; this is the screen they were
 * missing - the pictures, what it costs, where it is, who is hosting, and the
 * one decision the card could never carry properly, which is whether they are
 * coming.
 *
 * The join link for an online event appears only after RSVP, and it is the
 * server that enforces that (the repository drops the column for anyone who has
 * not said they are coming), not this file.
 */

const longDate = (iso: string | null): string => {
  if (!iso) return 'Date to be announced';
  return new Date(iso).toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
};

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency, minimumFractionDigits: 0 })
    .format(cents / 100);

const FORMAT: Record<string, string> = {
  in_person: 'In person',
  virtual: 'Online',
  hybrid: 'In person and online',
};

const FACT: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.7rem 0',
  borderBottom: '1px solid var(--border-color)',
};

const FACT_ICON: React.CSSProperties = { flexShrink: 0, marginTop: 2, color: 'var(--primary-600)' };

export default function MemberEventPage() {
  const params = useParams<{ id: string }>();
  const eventId = params?.id ?? '';

  const [event, setEvent] = React.useState<EventDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [lightbox, setLightbox] = React.useState<number | null>(null);

  React.useEffect(() => {
    (async () => {
      const r = await fetchEventAction(eventId);
      if (r.ok) {
        if (r.data) setEvent(r.data);
        else setError('That event could not be found. It may have been taken down.');
      } else setError(r.error);
      setLoading(false);
    })();
  }, [eventId]);

  if (loading) return <PortalLoading label="Loading this event" />;

  if (error || !event) {
    return (
      <div>
        <div role="alert" className="community-error">
          <AlertCircle size={15} aria-hidden="true" /> {error || 'That event could not be found.'}
        </div>
        <Link href="/portal/member/events" className="btn btn-outline" style={{ marginTop: 14 }}>
          Back to events
        </Link>
      </div>
    );
  }

  const photos = [event.image, ...event.gallery].filter((u): u is string => Boolean(u));
  const host = event.organiser || event.businessName;
  const past = event.status === 'past';

  return (
    <div style={{ maxWidth: '46rem' }}>
      {/* The cover, and the rest of the pictures under it. */}
      {photos.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <button
            type="button"
            onClick={() => setLightbox(0)}
            aria-label="View pictures"
            style={{ display: 'block', width: '100%', padding: 0, border: 0, background: 'none', cursor: 'zoom-in' }}
          >
            <img
              src={photos[0]}
              alt=""
              style={{
                width: '100%', aspectRatio: '16 / 9', objectFit: 'cover',
                borderRadius: 'var(--radius-lg)', display: 'block',
              }}
            />
          </button>
          {photos.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {photos.slice(1).map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setLightbox(i + 1)}
                  aria-label={`View picture ${i + 2}`}
                  style={{ padding: 0, border: 0, background: 'none', cursor: 'zoom-in', flexShrink: 0 }}
                >
                  <img
                    src={url}
                    alt=""
                    style={{ width: 104, height: 72, objectFit: 'cover', borderRadius: 10, display: 'block' }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <h1 style={{
        fontFamily: 'var(--font-display)', fontSize: 'clamp(1.35rem, 5vw, 1.75rem)',
        fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 6px', lineHeight: 1.2,
      }}>
        {event.title}
      </h1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        <span className="pp-chip" style={{ background: 'var(--green-50)', color: 'var(--green-800)' }}>
          {FORMAT[event.eventType] ?? 'In person'}
        </span>
        <span
          className="pp-chip"
          style={event.admission === 'paid'
            ? { background: 'rgba(232, 93, 4, 0.10)', color: 'var(--primary-800)' }
            : { background: 'var(--green-50)', color: 'var(--green-800)' }}
        >
          <Ticket size={12} aria-hidden="true" />{' '}
          {event.admission === 'paid' ? money(event.priceCents, event.currency) : 'Free to attend'}
        </span>
        {past && <span className="pp-chip" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>Finished</span>}
      </div>

      {/* The facts, in the order somebody deciding whether to go asks for them. */}
      <div style={{ marginBottom: 16 }}>
        <div style={FACT}>
          <Calendar size={16} aria-hidden="true" style={FACT_ICON} />
          <span>
            <strong style={{ display: 'block', fontSize: '0.92rem' }}>{longDate(event.date)}</strong>
            {event.time && (
              <small style={{ color: 'var(--text-secondary)' }}>
                <Clock size={11} aria-hidden="true" style={{ verticalAlign: '-1px' }} /> {event.time}
              </small>
            )}
          </span>
        </div>

        {(event.venueName || event.location || event.city) && (
          <div style={FACT}>
            <MapPin size={16} aria-hidden="true" style={FACT_ICON} />
            <span>
              <strong style={{ display: 'block', fontSize: '0.92rem' }}>
                {event.venueName || event.location}
              </strong>
              <small style={{ display: 'block', color: 'var(--text-secondary)' }}>
                {[event.venueName ? event.location : null, event.city].filter(Boolean).join(', ')}
              </small>
              {event.location && (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent([event.venueName, event.location, event.city].filter(Boolean).join(', '))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4,
                    fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-accent)', textDecoration: 'none',
                  }}
                >
                  Open in maps <ExternalLink size={12} aria-hidden="true" />
                </a>
              )}
            </span>
          </div>
        )}

        <div style={FACT}>
          <Users size={16} aria-hidden="true" style={FACT_ICON} />
          <span>
            <strong style={{ display: 'block', fontSize: '0.92rem' }}>
              {event.attendees + event.going} going
            </strong>
            {event.seatsLeft !== null && (
              <small style={{ color: event.seatsLeft === 0 ? 'var(--text-muted)' : 'var(--text-secondary)' }}>
                {event.seatsLeft === 0 ? 'Full' : `${event.seatsLeft} of ${event.capacity} places left`}
              </small>
            )}
          </span>
        </div>

        {host && (
          <div style={FACT}>
            <Building2 size={16} aria-hidden="true" style={FACT_ICON} />
            <span>
              <strong style={{ display: 'block', fontSize: '0.92rem' }}>Hosted by {host}</strong>
              {event.businessSlug && (
                <Link
                  href={`/businesses/${event.businessSlug}`}
                  style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-accent)', textDecoration: 'none' }}
                >
                  See their page
                </Link>
              )}
            </span>
          </div>
        )}

        {event.contactEmail && (
          <div style={{ ...FACT, borderBottom: 0 }}>
            <Mail size={16} aria-hidden="true" style={FACT_ICON} />
            <a href={`mailto:${event.contactEmail}`} style={{ fontSize: '0.9rem', color: 'var(--text-accent)', fontWeight: 700 }}>
              {event.contactEmail}
            </a>
          </div>
        )}
      </div>

      {/* Coming or not. The only decision on the page. */}
      {!past && (
        <div className="pp-group-card" style={{ padding: '0.9rem 1rem', marginBottom: 16 }}>
          <RsvpButton
            eventId={event.id}
            initialGoing={event.going}
            initialMyRsvp={event.myRsvp}
            baseAttendees={event.attendees}
          />
          {event.admission === 'paid' && (
            <p style={{ margin: '0.6rem 0 0', fontSize: '0.82rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              Saying you are coming holds your place with the organiser. Payment is
              handled by {host || 'the organiser'}
              {event.rsvpUrl ? ' through the link below' : ''}.
            </p>
          )}
          {event.rsvpUrl && (
            <a
              href={event.rsvpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
              style={{ minHeight: 46, marginTop: 10, width: '100%', justifyContent: 'center', gap: 8 }}
            >
              {event.admission === 'paid' ? 'Get tickets' : 'Register with the organiser'}
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          )}
        </div>
      )}

      {/* The join link, for people who said they are coming. */}
      {event.eventType !== 'in_person' && (
        <div className="pp-group-card" style={{ padding: '0.9rem 1rem', marginBottom: 16 }}>
          <strong style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.92rem' }}>
            <Video size={16} aria-hidden="true" style={{ color: 'var(--primary-600)' }} /> Joining online
          </strong>
          {event.onlineUrl ? (
            <a
              href={event.onlineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ minHeight: 46, marginTop: 10, width: '100%', justifyContent: 'center', gap: 8 }}
            >
              Open the meeting link <ExternalLink size={14} aria-hidden="true" />
            </a>
          ) : (
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.86rem', lineHeight: 1.55, color: 'var(--text-secondary)' }}>
              {event.myRsvp
                ? 'The organiser has not added the joining link yet. It appears here as soon as they do.'
                : 'Say you are coming and the joining link appears here.'}
            </p>
          )}
        </div>
      )}

      {event.description && (
        <section style={{ marginBottom: 16 }}>
          <h2 style={{
            margin: '0 0 6px', fontSize: '0.78rem', fontWeight: 800,
            letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)',
          }}>
            About this event
          </h2>
          <p style={{
            margin: 0, fontSize: '0.95rem', lineHeight: 1.7,
            color: 'var(--text-secondary)', whiteSpace: 'pre-wrap',
          }}>
            {event.description}
          </p>
        </section>
      )}

      {event.myRsvp && !past && (
        <p style={{
          display: 'flex', alignItems: 'center', gap: 7, margin: 0,
          padding: '0.7rem 0.9rem', borderRadius: '0.85rem',
          background: 'var(--green-50)', color: 'var(--green-800)',
          fontSize: '0.85rem', fontWeight: 700,
        }}>
          <CheckCircle2 size={15} aria-hidden="true" /> You are on the list. See you there.
        </p>
      )}

      {/* Pictures, full size. */}
      {lightbox !== null && photos[lightbox] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Event pictures"
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(12, 12, 14, 0.92)',
            display: 'grid', placeItems: 'center', padding: '1rem',
          }}
        >
          <img
            src={photos[lightbox]}
            alt=""
            style={{ maxWidth: '100%', maxHeight: '80dvh', objectFit: 'contain', borderRadius: 8 }}
          />
          <button
            type="button"
            aria-label="Close"
            onClick={() => setLightbox(null)}
            style={{
              position: 'absolute', top: 'calc(1rem + var(--sat, 0px))', right: '1rem',
              width: 40, height: 40, borderRadius: '50%', border: 0,
              background: 'rgba(255,255,255,0.16)', color: '#fff', cursor: 'pointer',
              display: 'grid', placeItems: 'center',
            }}
          >
            <X size={20} aria-hidden="true" />
          </button>
          {photos.length > 1 && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute', bottom: 'calc(1.25rem + var(--sab, 0px))',
                display: 'flex', alignItems: 'center', gap: 16, color: '#fff',
              }}
            >
              <button
                type="button" aria-label="Previous picture"
                onClick={() => setLightbox((i) => ((i ?? 0) - 1 + photos.length) % photos.length)}
                style={{ border: 0, background: 'rgba(255,255,255,0.16)', color: '#fff', width: 40, height: 40, borderRadius: '50%', cursor: 'pointer' }}
              >
                <ChevronLeft size={20} aria-hidden="true" />
              </button>
              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{lightbox + 1} / {photos.length}</span>
              <button
                type="button" aria-label="Next picture"
                onClick={() => setLightbox((i) => ((i ?? 0) + 1) % photos.length)}
                style={{ border: 0, background: 'rgba(255,255,255,0.16)', color: '#fff', width: 40, height: 40, borderRadius: '50%', cursor: 'pointer' }}
              >
                <ChevronRight size={20} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
