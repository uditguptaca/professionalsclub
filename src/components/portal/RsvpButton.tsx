'use client';
import React from 'react';
import { Check, CalendarPlus } from 'lucide-react';
import { rsvpEventAction } from '@/app/actions/business';

/**
 * The RSVP toggle on an event card. Optimistic: the button flips and the count
 * moves immediately, and the server's answer (which includes the real live
 * count) settles it. On failure everything snaps back and the error shows
 * inline under the button - never an alert.
 */
export default function RsvpButton({
  eventId,
  initialGoing,
  initialMyRsvp,
  baseAttendees,
}: {
  eventId: string;
  /** Live RSVP count at render time. */
  initialGoing: number;
  initialMyRsvp: boolean;
  /** The admin-maintained offline count; display total = base + going. */
  baseAttendees: number;
}) {
  const [going, setGoing] = React.useState(initialGoing);
  const [mine, setMine] = React.useState(initialMyRsvp);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  const toggle = async (e: React.MouseEvent) => {
    // The card itself can be a link; the button must not navigate it.
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;

    const next = !mine;
    setBusy(true);
    setError('');
    setMine(next);
    setGoing((g) => Math.max(0, g + (next ? 1 : -1)));

    const r = await rsvpEventAction(eventId, next);
    if (r.ok) {
      setGoing(r.data.going);
      setMine(r.data.myRsvp);
    } else {
      setMine(!next);
      setGoing((g) => Math.max(0, g + (next ? -1 : 1)));
      setError(r.error);
    }
    setBusy(false);
  };

  return (
    <span className="rsvp-wrap">
      <button
        type="button"
        className={`rsvp-btn${mine ? ' is-going' : ''}`}
        onClick={toggle}
        disabled={busy}
        aria-pressed={mine}
      >
        {mine ? <Check size={14} aria-hidden="true" /> : <CalendarPlus size={14} aria-hidden="true" />}
        {mine ? 'Going' : 'RSVP'}
        <span className="rsvp-count">{baseAttendees + going}</span>
      </button>
      {error && <span className="community-error" role="alert">{error}</span>}
    </span>
  );
}
