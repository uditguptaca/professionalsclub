import { NextResponse, type NextRequest } from 'next/server';
import { requireUserId } from '@/server/auth';
import { eventDetail } from '@/server/repos/events';
import { dateOnlyParts } from '@/lib/dates';

/**
 * One event as a calendar file.
 *
 * Signed-in members only, and through the same repository read the event page
 * uses - so RLS decides whether this member may see the event at all, and an
 * unapproved business event is a 404 here exactly as it is there. The join
 * link for an online event is included only if the member has RSVPd, for the
 * same reason the page hides it.
 *
 * Times are written in America/Toronto with a TZID rather than converted to
 * UTC: event_time is free text a person typed ("6:30 PM"), the club is in
 * Ontario, and a floating local time is what the organiser meant. A time we
 * cannot read becomes an all-day entry rather than a wrong hour.
 */

export const dynamic = 'force-dynamic';

const TZ = 'America/Toronto';

/** "6:30 PM", "18:30", "6pm" -> [18, 30]; anything else -> null. */
function parseTime(text: string | null): [number, number] | null {
  if (!text) return null;
  const m = text.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)?$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  const ampm = m[3]?.toLowerCase().replace(/\./g, '');
  if (ampm === 'pm' && h < 12) h += 12;
  if (ampm === 'am' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return [h, min];
}

const pad = (n: number) => String(n).padStart(2, '0');

/** RFC 5545 text escaping. */
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Lines longer than 75 octets are folded with CRLF + space. */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = ' ' + rest.slice(74);
  }
  out.push(rest);
  return out.join('\r\n');
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: 'Sign in to download this' }, { status: 401 });
  }

  const { id } = await params;
  if (typeof id !== 'string' || id.length !== 36) {
    return NextResponse.json({ error: 'Unknown event' }, { status: 404 });
  }

  const event = await eventDetail(userId, id);
  if (!event) return NextResponse.json({ error: 'Unknown event' }, { status: 404 });

  // From the text, never through a JavaScript Date: a DATE column has no
  // clock, and the server's timezone must not be allowed to move it a day.
  const parts = dateOnlyParts(event.date);
  if (!parts) {
    return NextResponse.json({ error: 'This event has no date yet' }, { status: 409 });
  }
  const { y, m: mo, d } = parts;
  const day = `${y}${pad(mo)}${pad(d)}`;
  const time = parseTime(event.time);

  // Two hours is the default block for a talk or a meetup. Organisers do not
  // record an end time and a calendar entry needs one.
  let start: string, end: string;
  if (time) {
    const [h, min] = time;
    const endH = (h + 2) % 24;
    const endDay = h + 2 >= 24 ? nextDay(y, mo, d) : day;
    start = `DTSTART;TZID=${TZ}:${day}T${pad(h)}${pad(min)}00`;
    end = `DTEND;TZID=${TZ}:${endDay}T${pad(endH)}${pad(min)}00`;
  } else {
    start = `DTSTART;VALUE=DATE:${day}`;
    end = `DTEND;VALUE=DATE:${nextDay(y, mo, d)}`;
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://professionalsclub.vercel.app';
  const url = `${site}/portal/member/events/${event.id}`;
  const location = event.eventType === 'virtual'
    ? (event.onlineUrl ?? 'Online')
    : [event.venueName, event.location, event.city].filter(Boolean).join(', ');
  const description = [
    event.description,
    event.onlineUrl ? `Join: ${event.onlineUrl}` : null,
    event.admission === 'paid'
      ? `Tickets: ${new Intl.NumberFormat('en-CA', { style: 'currency', currency: event.currency }).format(event.priceCents / 100)}`
      : 'Free to attend',
    `Details: ${url}`,
  ].filter(Boolean).join('\n\n');

  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Professionals Club//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@professionalsclub`,
    `DTSTAMP:${stamp}`,
    start,
    end,
    fold(`SUMMARY:${esc(event.title)}`),
    fold(`DESCRIPTION:${esc(description)}`),
    location ? fold(`LOCATION:${esc(location)}`) : null,
    fold(`URL:${url}`),
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter((l): l is string => Boolean(l));

  const safeName = event.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 60) || 'event';
  return new NextResponse(lines.join('\r\n') + '\r\n', {
    status: 200,
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': `attachment; filename="${safeName}.ics"`,
      'cache-control': 'private, no-store',
    },
  });
}

function nextDay(y: number, mo: number, d: number): string {
  const n = new Date(Date.UTC(y, mo - 1, d + 1));
  return `${n.getUTCFullYear()}${pad(n.getUTCMonth() + 1)}${pad(n.getUTCDate())}`;
}
