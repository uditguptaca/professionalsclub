/**
 * A calendar date is not an instant.
 *
 * events.event_date is a Postgres DATE: "4 September", no clock, no zone. Read
 * through a JavaScript Date it becomes an instant at SOME midnight - the
 * server's - and every conversion after that can move it a day. On a UTC
 * server that midnight, shown in a Toronto browser, is 8pm the evening before,
 * so `new Date('2026-09-04')` renders as September 3 for every member in
 * Ontario. The repositories therefore return DATE columns as plain
 * 'YYYY-MM-DD' text, and this is the one place that text becomes a Date - a
 * LOCAL midnight, which formats as the day it names.
 *
 * Full ISO timestamps (with a time part) are instants and pass straight
 * through; they mean a moment, and a moment shifts with the viewer's zone as
 * it should.
 */
export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  if (!m) return null;
  // A bare date, or the date part of a midnight ISO string from an older row.
  if (value.length === 10 || /T00:00:00(\.0+)?(Z|[+-]00:?00)?$/.test(value)) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 'YYYY-MM-DD' for a date-only input, taken from the text, never from a clock. */
export function dateOnlyParts(value: string | null | undefined): { y: number; m: number; d: number } | null {
  const date = parseDateOnly(value);
  if (!date) return null;
  return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
}
