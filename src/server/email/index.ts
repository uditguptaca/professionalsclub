import 'server-only';
import { SITE_URL } from '@/server/origin';
import { withElevated } from '@/server/db';

/**
 * Outbound email.
 *
 * Nothing here is sent inline. A caller queues a row in email_outbox and this
 * module drains it, for one security reason and two practical ones:
 *
 *   - the session that triggers a notification must never be able to read the
 *     recipient's address, so the address is resolved here, later, under
 *     elevated rights rather than inside the member's transaction;
 *   - a Resend outage delays mail instead of losing it;
 *   - with no RESEND_API_KEY the queue IS the dev log, so the whole referral
 *     flow is testable on a laptop with nothing configured.
 *
 * Adding a provider means one function. Nothing above this file knows which one
 * is in use.
 */

const FROM = process.env.EMAIL_FROM ?? 'Professionals Club <noreply@professionalsclub.ca>';
const SITE = SITE_URL;

export interface Message {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** `retry` is true for a provider or network fault (5xx, 429, timeout); false for a 4xx that will never succeed. */
export type SendOutcome = { ok: true } | { ok: false; error: string; retry: boolean };

/**
 * Resend when configured, otherwise a logged no-op. The console line is what a
 * developer needs to confirm the flow reached this point.
 */
async function deliver(message: Message): Promise<SendOutcome> {
  const key = process.env.RESEND_API_KEY;

  if (!key) {
    console.info(
      `[email:dev] would send "${message.subject}" to ${message.to}\n` +
      message.text.split('\n').map((l) => '           ' + l).join('\n')
    );
    return { ok: true };
  }

  try {
    // Called over HTTP rather than through the SDK: it is one endpoint, and it
    // keeps the dependency out of the bundle.
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 200)}`, retry: res.status === 429 || res.status >= 500 };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Send failed', retry: true };
  }
}

// ============================================================ Templates

const shell = (heading: string, body: string, cta?: { href: string; label: string }) => `
<div style="margin:0;padding:24px;background:#fff7ed;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e7e0d5;border-radius:14px;overflow:hidden">
    <div style="background:#0f2318;padding:20px 28px">
      <span style="color:#ffffff;font-weight:800;font-size:17px;letter-spacing:-0.01em">Professionals Club</span>
    </div>
    <div style="padding:28px">
      <h1 style="margin:0 0 14px;font-size:20px;line-height:1.3;color:#0c0c0e;font-weight:800">${heading}</h1>
      ${body}
      ${cta ? `<p style="margin:26px 0 0">
        <a href="${cta.href}" style="display:inline-block;background:#e85d04;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700;font-size:14px">${cta.label}</a>
      </p>` : ''}
    </div>
    <div style="padding:16px 28px;border-top:1px solid #e7e0d5;color:#6b6b6b;font-size:12px;line-height:1.6">
      Sent by Professionals Club because of something you did or asked for in the portal.
      Notification preferences are under your profile.
    </div>
  </div>
</div>`;

const p = (text: string) =>
  `<p style="margin:0 0 12px;font-size:14px;line-height:1.65;color:#3a3a3a">${text}</p>`;

const esc = (s: unknown): string =>
  String(s ?? '').replace(/[\r\n\t]+/g, ' ').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/** For a subject line: no HTML entities, no line breaks, bounded. */
const plain = (s: unknown): string => String(s ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 120);

type Payload = Record<string, unknown>;

/**
 * One entry per template. Each returns the subject and both bodies; the plain
 * text is not an afterthought, it is what the dev log prints and what a text
 * client shows.
 */
const TEMPLATES: Record<string, (payload: Payload) => Omit<Message, 'to'>> = {
  referral_request: (d) => {
    const company = esc(d.company);
    const seeker = esc(d.seeker ?? 'A member');
    const count = Number(d.jobCount ?? 0);
    const roles = count === 1 ? '1 open role' : `${count} open roles`;
    const link = `${SITE}/portal/member/chats`;
    return {
      subject: `${plain(d.seeker ?? 'A member')} asked you for a referral at ${plain(d.company)}`,
      html: shell(
        `${seeker} is asking about ${roles} at ${company}`,
        p(`<strong>${seeker}</strong> asked whether you can help with an application at ${company}, and picked you because you chose to be listed as open to referring there.`) +
        p('The request is waiting in your chat, with the roles and a note.') +
        p('Accept if you can help, or pass. Either is a complete answer, and the conversation stays yours.'),
        { href: link, label: 'Open the chat' }
      ),
      text:
        `${seeker} asked whether you can help with ${roles} at ${company}.\n\n` +
        `They picked you because you chose to be listed as open to referring there.\n` +
        `The request is in your chat, with the roles and a note.\n\n` +
        `Accept if you can help, or pass. Either is a complete answer.\n\n${link}\n`,
    };
  },

  referral_accepted: (d) => {
    const company = esc(d.company);
    const helper = esc(d.helper);
    const link = `${SITE}/portal/member/chats`;
    return {
      subject: `${plain(d.helper ?? 'A member')} can help with your referral at ${plain(d.company)}`,
      html: shell(
        `Good news — someone at ${company} can help`,
        p(`<strong>${helper}</strong> works at ${company} and has agreed to help with your request.`) +
        p('Carry on in the chat you already share. Keep it short, say which role, and send your resume if they ask for it.') +
        p('A referral is a favour, not a guarantee — but it is the single most effective way to get an application read.'),
        { href: link, label: 'Open the chat' }
      ),
      text:
        `${helper} works at ${company} and has agreed to help with your referral request.\n\n` +
        `Carry on in the chat you already share.\n\n${link}\n`,
    };
  },

  event_rsvp: (d) => {
    const title = esc(d.title);
    const when = esc(d.when);
    const where = esc(d.where);
    const id = String(d.eventId ?? '');
    const link = `${SITE}/portal/member/events/${id}`;
    const ics = `${SITE}/api/events/${id}/calendar.ics`;
    return {
      subject: `You are going to ${plain(d.title)}`,
      html: shell(
        `See you at ${title}`,
        p(`<strong>${when}</strong><br>${where}`) +
        p(`Your place is noted. If plans change, open the event and tap Going again to step back.`) +
        p(`<a href="${ics}" style="color:#e85d04;font-weight:700">Add it to your calendar</a> - the file opens in Apple Calendar, Outlook and Google.`),
        { href: link, label: 'Open the event' }
      ),
      text:
        `You are going to ${title}.
${when}
${where}

` +
        `Add it to your calendar: ${ics}
Event details: ${link}
`,
    };
  },

  business_invite: (d) => {
    const business = esc(d.business);
    const link = String(d.link ?? '');
    return {
      subject: `Your Professionals Club listing for ${plain(d.business)} is ready`,
      html: shell(
        `${business} is verified`,
        p(`The club has verified <strong>${business}</strong>, and this link sets up the login that manages it.`) +
        p('From there you can keep your page up to date, publish member offers and coupons, and post your events. Events are checked by the club before members see them.') +
        p('The link works once and expires in fourteen days. If it has gone stale, ask us for a new one.'),
        { href: link, label: 'Set up your login' }
      ),
      text:
        `The club has verified ${business}.

` +
        `Set up the login that manages your listing, offers, coupons and events:
${link}

` +
        `The link works once and expires in fourteen days.
`,
    };
  },
};

export function renderTemplate(template: string, payload: Payload): Omit<Message, 'to'> | null {
  const fn = TEMPLATES[template];
  return fn ? fn(payload) : null;
}

// ============================================================ The drain

export interface DrainResult { sent: number; failed: number; skipped: number }

const MAX_ATTEMPTS = 4;

/**
 * A provider fault (5xx, 429, network) is worth another go later; a 4xx is
 * the provider saying "never", and retrying it three times only delays the
 * operator seeing the reason.
 */
export function retryStatus(outcome: { retry: boolean }, attempts: number): 'failed' | 'pending' {
  return outcome.retry && attempts < MAX_ATTEMPTS ? 'pending' : 'failed';
}

/**
 * Send what is queued.
 *
 * Elevated because it resolves other members' addresses, which is exactly the
 * thing a member's own session must not be able to do. Called from the cron
 * route and immediately after a referral is created, so mail is prompt without
 * any user session ever holding an address.
 */
export async function drainOutbox(limit = 50): Promise<DrainResult> {
  // Locally, no key means "log it and call it sent" - the queue is the dev log.
  // On Vercel the same shortcut would mark real mail as delivered when nothing
  // left the building, and there is no getting those rows back. Leave them
  // pending: the moment RESEND_API_KEY is added, the next drain sends them.
  if (!process.env.RESEND_API_KEY && process.env.VERCEL) {
    console.warn('[email] RESEND_API_KEY is not set; leaving the outbox queued.');
    return { sent: 0, failed: 0, skipped: 0 };
  }

  // Claim -> send with NOTHING held -> write back. The provider calls take up
  // to 15s each; holding one of eight pooled connections across them stalled
  // every member request behind a slow mail server (see drainPush).
  //
  // A row is claimed by moving it to 'sending'. A drain that dies mid-flight
  // leaves it there, so the claim also takes back anything that has sat in
  // 'sending' for fifteen minutes - otherwise those rows were invisible to
  // every later drain and lost for good. not_before is the backoff a retry
  // set (0057).
  type Row = { id: string; template: string; payload: Payload; attempts: number; address: string | null };
  const rows = await withElevated(async (db) => (await db`
    with claimed as (
      select o.id from public.email_outbox o
       where (o.status = 'pending'
              or (o.status = 'sending' and o.claimed_at < now() - interval '15 minutes'))
         and o.attempts < ${MAX_ATTEMPTS}
         and coalesce(o.not_before, now()) <= now()
       order by o.created_at
       limit ${limit}
       for update skip locked
    )
    update public.email_outbox o
       set status = 'sending', attempts = o.attempts + 1, claimed_at = now()
      from claimed
     where o.id = claimed.id
    returning o.id, o.template, o.payload, o.attempts,
              coalesce(o.to_address, (select p.email from public.profiles p where p.id = o.recipient_id)) as address
  `) as unknown as Row[]);

  const results: { id: string; status: 'sent' | 'skipped' | 'failed' | 'pending'; error: string | null }[] = [];
  for (const row of rows) {
    const rendered = row.address ? renderTemplate(row.template, row.payload ?? {}) : null;
    if (!rendered) {
      // No address, or a template that no longer exists: not worth retrying.
      results.push({ id: row.id, status: 'skipped', error: row.address ? 'Unknown template' : 'No address for recipient' });
      continue;
    }
    const outcome = await deliver({ ...rendered, to: row.address! });
    if (outcome.ok) results.push({ id: row.id, status: 'sent', error: null });
    else results.push({ id: row.id, status: retryStatus(outcome, row.attempts), error: outcome.error.slice(0, 500) });
  }

  if (results.length > 0) {
    await withElevated(async (db) => {
      await db`
        update public.email_outbox o
           set status = r.status,
               sent_at = case when r.status = 'sent' then now() else o.sent_at end,
               -- Backoff on a retry: 5, 10, 20 minutes.
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

/** True when real mail can actually go out; shown to admins so it is not a mystery. */
export const emailConfigured = (): boolean => Boolean(process.env.RESEND_API_KEY);
