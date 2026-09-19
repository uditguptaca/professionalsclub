import 'server-only';
import { retryStatus } from '@/server/email';
import { withElevated } from '@/server/db';

/**
 * Outbound text messages, drained from sms_outbox (0049).
 *
 * Same shape as email for the same reasons: nothing is sent inline, the
 * recipient's number is resolved HERE under elevated rights rather than inside
 * the member's transaction (a member's session must never read another
 * member's phone), and an outage delays a text instead of losing it.
 *
 * Twilio, over plain HTTP - one endpoint, no SDK in the bundle. Three settings:
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM (an E.164 number or a
 *   Messaging Service SID). With any of them missing the queue is left
 *   untouched, not marked sent: a text that was never sent must not look sent.
 */

export interface SmsDrainResult { sent: number; failed: number; skipped: number }

/**
 * profiles.phone is free text typed by a person. Canada (and the US) is one
 * country code, so the honest normalisation is small: ten digits become
 * +1XXXXXXXXXX, eleven starting with 1 become +1..., anything already in +E.164
 * is kept. Everything else is refused with a reason rather than guessed at.
 */
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (/^\+[1-9]\d{7,14}$/.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

function configured(): { sid: string; token: string; from: string } | null {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  return sid && token && from ? { sid, token, from } : null;
}

export const smsConfigured = (): boolean => configured() !== null;

async function deliver(to: string, body: string): Promise<{ ok: true } | { ok: false; error: string; retry: boolean }> {
  const cfg = configured();
  if (!cfg) return { ok: false, error: 'SMS provider not configured', retry: true };

  const params = new URLSearchParams({ To: to, Body: body });
  // TWILIO_FROM may be a Messaging Service SID (MG...) or a number.
  params.set(cfg.from.startsWith('MG') ? 'MessagingServiceSid' : 'From', cfg.from);

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(cfg.sid)}/Messages.json`,
      {
        method: 'POST',
        headers: {
          authorization: `Basic ${Buffer.from(`${cfg.sid}:${cfg.token}`).toString('base64')}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
        signal: AbortSignal.timeout(15_000),
      }
    );
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Twilio ${res.status}: ${text.slice(0, 200)}`, retry: res.status === 429 || res.status >= 500 };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Send failed', retry: true };
  }
}

/**
 * Send what is queued. Elevated for the phone-number lookup, as explained
 * above. Rows with no usable number are parked as skipped with the reason,
 * so an operator can see "no phone" separately from "Twilio refused".
 */
export async function drainSms(limit = 50): Promise<SmsDrainResult> {
  if (!smsConfigured()) {
    // Not an error at all locally; on Vercel it is the one thing worth a line
    // in the logs, because the owner asked for texts and none are going out.
    if (process.env.VERCEL) console.warn('[sms] TWILIO_* not set; leaving sms_outbox queued.');
    return { sent: 0, failed: 0, skipped: 0 };
  }

  // Claim -> send with NOTHING held -> write back (see drainPush and the email drain).
  type Row = { id: string; body: string; attempts: number; phone: string | null };
  const rows = await withElevated(async (db) => (await db`
    with claimed as (
      select o.id from public.sms_outbox o
       where (o.status = 'pending'
              or (o.status = 'sending' and o.claimed_at < now() - interval '15 minutes'))
         and o.attempts < 4
         and coalesce(o.not_before, now()) <= now()
       order by o.created_at
       limit ${limit}
       for update skip locked
    )
    update public.sms_outbox o
       set status = 'sending', attempts = o.attempts + 1, claimed_at = now()
      from claimed
     where o.id = claimed.id
    returning o.id, o.body, o.attempts,
              (select p.phone from public.profiles p where p.id = o.recipient_id) as phone
  `) as unknown as Row[]);

  const results: { id: string; status: 'sent' | 'skipped' | 'failed' | 'pending'; error: string | null }[] = [];
  for (const row of rows) {
    const to = toE164(row.phone);
    if (!to) {
      results.push({ id: row.id, status: 'skipped', error: row.phone ? 'Phone number not recognised' : 'No phone on profile' });
      continue;
    }
    const outcome = await deliver(to, row.body);
    if (outcome.ok) results.push({ id: row.id, status: 'sent', error: null });
    else results.push({ id: row.id, status: retryStatus(outcome, row.attempts), error: outcome.error.slice(0, 500) });
  }

  if (results.length > 0) {
    await withElevated(async (db) => {
      await db`
        update public.sms_outbox o
           set status = r.status,
               sent_at = case when r.status = 'sent' then now() else o.sent_at end,
               not_before = case when r.status = 'pending' then now() + make_interval(mins => (5 * power(2, o.attempts - 1))::int) end,
               last_error = r.error
          from jsonb_to_recordset(${JSON.stringify(results)}::jsonb) as r(id uuid, status text, error text)
         where o.id = r.id
      `;
    });
  }

  return {
    sent: results.filter((r) => r.status === 'sent').length,
    failed: results.filter((r) => r.status === 'failed' || r.status === 'pending').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
  };
}
