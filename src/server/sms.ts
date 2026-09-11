import 'server-only';
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

async function deliver(to: string, body: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const cfg = configured();
  if (!cfg) return { ok: false, error: 'SMS provider not configured' };

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
      return { ok: false, error: `Twilio ${res.status}: ${text.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Send failed' };
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

  return withElevated(async (db) => {
    const rows = (await db`
      select o.id, o.body, o.attempts, p.phone
        from public.sms_outbox o
        join public.profiles p on p.id = o.recipient_id
       where o.status = 'pending' and o.attempts < 3
       order by o.created_at
       limit ${limit}
    `) as unknown as { id: string; body: string; attempts: number; phone: string | null }[];

    let sent = 0, failed = 0, skipped = 0;

    for (const row of rows) {
      const to = toE164(row.phone);
      if (!to) {
        skipped += 1;
        await db`
          update public.sms_outbox
             set status = 'skipped', attempts = attempts + 1,
                 last_error = ${row.phone ? 'Phone number not recognised' : 'No phone on profile'}
           where id = ${row.id}::uuid
        `;
        continue;
      }

      const outcome = await deliver(to, row.body);
      if (outcome.ok) {
        sent += 1;
        await db`
          update public.sms_outbox
             set status = 'sent', sent_at = now(), attempts = attempts + 1, last_error = null
           where id = ${row.id}::uuid
        `;
      } else {
        failed += 1;
        const attempts = row.attempts + 1;
        await db`
          update public.sms_outbox
             set status = ${attempts >= 3 ? 'failed' : 'pending'},
                 attempts = ${attempts}, last_error = ${outcome.error}
           where id = ${row.id}::uuid
        `;
      }
    }

    return { sent, failed, skipped };
  });
}
