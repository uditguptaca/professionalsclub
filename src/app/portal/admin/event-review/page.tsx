'use client';
import React from 'react';
import Link from 'next/link';
import {
  CalendarCheck, Check, X, AlertCircle, Building2, MapPin, Ticket, Clock, ExternalLink,
} from 'lucide-react';
import PortalLoading from '@/components/portal/PortalLoading';
import { fetchModerationQueueAction, moderateEventAction } from '@/app/actions/events';
import type { PendingEvent } from '@/server/repos/events';

/**
 * Business events, before members see them.
 *
 * This queue is the whole reason 0045 exists: a verified business could publish
 * straight into every member's Events tab, which is a publishing channel into a
 * newcomers' community owned by an outside party. Events posted by the club
 * itself (admins and volunteers) never appear here - they are the club.
 *
 * An event that comes back for a second look has had its CONTENT changed after
 * approval; the trigger sends it back rather than trusting that the thing that
 * was approved is still the thing being shown.
 */

const longDate = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString('en-CA', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
      : 'Date to be announced';

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency, minimumFractionDigits: 0 }).format(cents / 100);

export default function EventReviewPage() {
  const [queue, setQueue] = React.useState<PendingEvent[] | null>(null);
  const [error, setError] = React.useState('');
  const [busyId, setBusyId] = React.useState('');
  const [notes, setNotes] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    (async () => {
      const r = await fetchModerationQueueAction();
      if (r.ok) setQueue(r.data);
      else setError(r.error);
    })();
  }, []);

  const decide = async (id: string, status: 'approved' | 'rejected') => {
    setError('');
    setBusyId(id);
    const r = await moderateEventAction(id, status, notes[id] ?? '');
    setBusyId('');
    if (r.ok) setQueue(r.data);
    else setError(r.error);
  };

  if (queue === null && !error) return <PortalLoading label="Loading the queue" />;

  return (
    <div className="hf-page">
      <div className="hf-body" style={{ marginTop: 0 }}>
        <section className="hf-section">
          <div className="hf-section-head">
            <h1 style={{ fontSize: '1.45rem', margin: 0 }}>Event review</h1>
            {queue && queue.length > 0 && (
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                {queue.length} waiting
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: '0.86rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            Events posted by businesses. Members cannot see them until you approve them,
            and an event whose wording changes after approval comes back here.
          </p>

          {error && (
            <p className="community-error" role="alert" style={{ marginTop: 10 }}>
              <AlertCircle size={14} aria-hidden="true" /> {error}
            </p>
          )}

          {queue?.length === 0 && (
            <div className="card" style={{ padding: '2rem 1.25rem', textAlign: 'center', marginTop: 14 }}>
              <CalendarCheck size={26} aria-hidden="true" style={{ opacity: 0.35 }} />
              <p style={{ margin: '0.7rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Nothing waiting. Business events land here as they are posted.
              </p>
            </div>
          )}

          {queue?.map((ev) => (
            <article key={ev.id} className="bz-card" style={{ marginTop: 14 }}>
              {ev.image && (
                <img
                  src={ev.image}
                  alt=""
                  style={{ width: '100%', aspectRatio: '16 / 7', objectFit: 'cover', borderRadius: 10, marginBottom: 10 }}
                />
              )}
              <div className="bz-card-head">
                <strong style={{ fontSize: '1rem' }}>{ev.title}</strong>
                <span className="bz-status pending"><Clock size={12} aria-hidden="true" /> Waiting</span>
              </div>

              <p className="bz-muted" style={{ margin: '0.5rem 0' }}>
                <Building2 size={12} aria-hidden="true" style={{ verticalAlign: '-2px' }} />{' '}
                {ev.businessName ?? 'Unknown business'}
                {ev.businessSlug && (
                  <>
                    {' · '}
                    <Link href={`/businesses/${ev.businessSlug}`} target="_blank" style={{ color: 'var(--text-accent)' }}>
                      their page <ExternalLink size={11} aria-hidden="true" />
                    </Link>
                  </>
                )}
              </p>

              <p className="bz-muted" style={{ margin: '0 0 0.5rem' }}>
                {longDate(ev.date)}{ev.time ? ` · ${ev.time}` : ''}
                {' · '}
                {ev.eventType === 'virtual' ? 'Online' : ev.eventType === 'hybrid' ? 'Online and in person' : 'In person'}
                {' · '}
                <Ticket size={12} aria-hidden="true" style={{ verticalAlign: '-2px' }} />{' '}
                {ev.admission === 'paid' ? money(ev.priceCents, ev.currency) : 'Free'}
              </p>

              {(ev.venueName || ev.location) && (
                <p className="bz-muted" style={{ margin: '0 0 0.5rem' }}>
                  <MapPin size={12} aria-hidden="true" style={{ verticalAlign: '-2px' }} />{' '}
                  {[ev.venueName, ev.location, ev.city].filter(Boolean).join(', ')}
                </p>
              )}

              {ev.description && (
                <p style={{
                  margin: '0 0 0.6rem', padding: '0.6rem 0.8rem', borderRadius: '0.7rem',
                  background: 'var(--bg-secondary)', fontSize: '0.86rem', lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}>
                  {ev.description}
                </p>
              )}

              {ev.gallery.length > 0 && (
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 10 }}>
                  {ev.gallery.map((url) => (
                    <img key={url} src={url} alt=""
                      style={{ width: 96, height: 70, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                  ))}
                </div>
              )}

              {ev.onlineUrl && (
                <p className="bz-muted" style={{ margin: '0 0 0.6rem', wordBreak: 'break-all', fontSize: '0.8rem' }}>
                  Join link: {ev.onlineUrl}
                </p>
              )}

              <div className="bz-field">
                <label htmlFor={`note-${ev.id}`}>Note to the business</label>
                <input
                  id={`note-${ev.id}`}
                  value={notes[ev.id] ?? ''}
                  onChange={(e) => setNotes((n) => ({ ...n, [ev.id]: e.target.value }))}
                  placeholder="Required when you turn one down"
                  maxLength={400}
                />
              </div>

              <div className="bz-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busyId === ev.id}
                  onClick={() => void decide(ev.id, 'approved')}
                  style={{ minHeight: 46 }}
                >
                  <Check size={15} aria-hidden="true" /> Approve
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busyId === ev.id}
                  onClick={() => void decide(ev.id, 'rejected')}
                  style={{ minHeight: 46 }}
                >
                  <X size={15} aria-hidden="true" /> Turn down
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
