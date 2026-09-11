'use client';
import React from 'react';
import Link from 'next/link';
import {
  Calendar, Plus, Pencil, Trash2, AlertCircle, CheckCircle2, Users, Ticket, Eye,
} from 'lucide-react';
import PortalLoading from '@/components/portal/PortalLoading';
import EventEditor from '@/components/portal/EventEditor';
import { useConfirm } from '@/components/portal/confirm';
import { useApp } from '@/context/app-context';
import {
  fetchMyEventsAction, createClubEventAction, updateClubEventAction, deleteClubEventAction,
} from '@/app/actions/events';
import type { EventDetail } from '@/server/repos/events';

/**
 * Club events, posted by the people who run them: admins and approved
 * volunteers (0045).
 *
 * A volunteer sees and edits only what they posted - that is a database policy,
 * not a filter here, so this screen is free to just show what comes back. An
 * admin sees their own here too and moderates everyone else's from the admin
 * side, which keeps "the thing I am organising" and "the thing I am reviewing"
 * apart.
 */

const monthDay = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBA';

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency, minimumFractionDigits: 0 })
    .format(cents / 100);

export default function ManageEventsPage() {
  const { profile } = useApp();
  const confirm = useConfirm();
  const canCurate = profile?.role === 'admin' || Boolean(profile?.isVolunteer);

  const [events, setEvents] = React.useState<EventDetail[] | null>(null);
  const [editing, setEditing] = React.useState<EventDetail | 'new' | null>(null);
  const [error, setError] = React.useState('');
  const [toast, setToast] = React.useState('');

  React.useEffect(() => {
    if (!canCurate) return;
    (async () => {
      const r = await fetchMyEventsAction();
      if (r.ok) setEvents(r.data);
      else setError(r.error);
    })();
  }, [canCurate]);

  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const mutate = async (
    fn: () => Promise<{ ok: true; data: EventDetail[] } | { ok: false; error: string }>,
    done: string
  ) => {
    setError('');
    const r = await fn();
    if (r.ok) { setEvents(r.data); setToast(done); return true; }
    setError(r.error);
    return false;
  };

  if (!canCurate) {
    return (
      <div className="hf-page"><div className="hf-body" style={{ marginTop: 0 }}>
        <h1 style={{ fontSize: '1.35rem' }}>Post an event</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          Club events are posted by admins and approved volunteers. If you run a business
          in the directory, your events are posted from your business console.
        </p>
        <Link href="/portal/member/events" className="btn btn-outline" style={{ minHeight: 46 }}>
          Back to events
        </Link>
      </div></div>
    );
  }

  if (events === null && !error) return <PortalLoading label="Loading your events" />;

  if (editing) {
    const event = editing === 'new' ? null : editing;
    return (
      <div className="hf-page"><div className="hf-body" style={{ marginTop: 0 }}>
        <section className="hf-section">
          <div className="hf-section-head">
            <h1 style={{ fontSize: '1.3rem', margin: 0 }}>{event ? 'Edit event' : 'New club event'}</h1>
          </div>
          {error && <p className="community-error" role="alert"><AlertCircle size={14} aria-hidden="true" /> {error}</p>}
          <EventEditor
            event={event}
            uploadPrefix={`events/${event?.id ?? 'new'}`}
            saveLabel={event ? 'Save event' : 'Publish event'}
            onCancel={() => setEditing(null)}
            onSave={async (data) => {
              const ok = await mutate(
                () => (event ? updateClubEventAction(event.id, data) : createClubEventAction(data)),
                event ? 'Event saved' : 'Event published'
              );
              if (ok) setEditing(null);
            }}
          />
        </section>
      </div></div>
    );
  }

  return (
    <div className="hf-page">
      <div className="hf-body" style={{ marginTop: 0 }}>
        <section className="hf-section">
          <div className="hf-section-head">
            <h1 style={{ fontSize: '1.45rem', margin: 0 }}>Your events</h1>
          </div>
          <p style={{ margin: 0, fontSize: '0.86rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            Club events go live as soon as you publish them. You can edit or take down
            anything you posted.
          </p>

          {error && <p className="community-error" role="alert"><AlertCircle size={14} aria-hidden="true" /> {error}</p>}

          <button
            type="button"
            className="btn btn-primary"
            style={{ minHeight: 46, marginTop: 12 }}
            onClick={() => setEditing('new')}
          >
            <Plus size={15} aria-hidden="true" /> New event
          </button>

          {events?.length === 0 && (
            <p className="bz-muted" style={{ marginTop: 14 }}>
              You have not posted an event yet.
            </p>
          )}

          {events?.map((ev) => (
            <div key={ev.id} className="bz-card" style={{ marginTop: 12 }}>
              <div className="bz-card-head">
                <strong>{ev.title}</strong>
                <span className={`bz-status ${ev.isPublished && ev.moderationStatus === 'approved' ? 'verified' : 'pending'}`}>
                  {ev.moderationStatus === 'pending' ? 'Waiting for review'
                    : ev.moderationStatus === 'rejected' ? 'Not approved'
                    : ev.isPublished ? 'Live' : 'Draft'}
                </span>
              </div>
              <p className="bz-muted" style={{ margin: '0.4rem 0 0.6rem' }}>
                <Calendar size={12} aria-hidden="true" style={{ verticalAlign: '-2px' }} /> {monthDay(ev.date)}
                {ev.time ? ` · ${ev.time}` : ''}
                {ev.city ? ` · ${ev.city}` : ''}
                {' · '}<Users size={12} aria-hidden="true" style={{ verticalAlign: '-2px' }} /> {ev.attendees + ev.going} going
                {' · '}<Ticket size={12} aria-hidden="true" style={{ verticalAlign: '-2px' }} />{' '}
                {ev.admission === 'paid' ? money(ev.priceCents, ev.currency) : 'Free'}
              </p>
              {ev.moderationNote && (
                <p style={{
                  margin: '0 0 0.6rem', padding: '0.5rem 0.7rem', borderRadius: '0.6rem',
                  background: 'var(--bg-secondary)', fontSize: '0.82rem', lineHeight: 1.5,
                }}>
                  <strong>The club said:</strong> {ev.moderationNote}
                </p>
              )}
              <div className="bz-actions">
                <Link className="bz-upload" href={`/portal/member/events/${ev.id}`}>
                  <Eye size={13} aria-hidden="true" /> View
                </Link>
                <button type="button" className="bz-upload" onClick={() => setEditing(ev)}>
                  <Pencil size={13} aria-hidden="true" /> Edit
                </button>
                <button
                  type="button"
                  className="bz-upload"
                  onClick={() => void mutate(
                    () => updateClubEventAction(ev.id, { isPublished: !ev.isPublished }),
                    ev.isPublished ? 'Event hidden' : 'Event published'
                  )}
                >
                  {ev.isPublished ? 'Unpublish' : 'Publish'}
                </button>
                <button type="button" className="bz-upload" onClick={async () => {
                  if (await confirm({
                    title: 'Delete this event?',
                    message: `"${ev.title}" and its RSVPs are removed permanently.`,
                    confirmLabel: 'Delete',
                    tone: 'danger',
                  })) void mutate(() => deleteClubEventAction(ev.id), 'Event deleted');
                }}>
                  <Trash2 size={13} aria-hidden="true" /> Delete
                </button>
              </div>
            </div>
          ))}
        </section>
      </div>
      {toast && <div className="pp-toast" role="status"><CheckCircle2 size={15} aria-hidden="true" /> {toast}</div>}
    </div>
  );
}
