import 'server-only';
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
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://professionalsclub.ca';

export interface Message {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export type SendOutcome = { ok: true } | { ok: false; error: string };

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
      return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Send failed' };
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
      You are receiving this because you offered to help members at your company.
      Turn it off under Where I work in your portal profile.
    </div>
  </div>
</div>`;

const p = (text: string) =>
  `<p style="margin:0 0 12px;font-size:14px;line-height:1.65;color:#3a3a3a">${text}</p>`;

const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

type Payload = Record<string, unknown>;

/**
 * One entry per template. Each returns the subject and both bodies; the plain
 * text is not an afterthought, it is what the dev log prints and what a text
 * client shows.
 */
const TEMPLATES: Record<string, (payload: Payload) => Omit<Message, 'to'>> = {
  referral_request: (d) => {
    const company = esc(d.company);
    const headline = esc(d.headline);
    const count = Number(d.jobCount ?? 0);
    const roles = count === 1 ? '1 open role' : `${count} open roles`;
    const link = `${SITE}/portal/member/referrals`;
    return {
      subject: `Someone needs a referral at ${company}`,
      html: shell(
        `A member is asking about ${roles} at ${company}`,
        p(`<strong>${headline}</strong> has asked whether anyone inside ${company} can help with their application.`) +
        p('You are being asked because you told us you work there and are open to helping. We have not shared your name, your email or anything else about you with them.') +
        p('If you can help, open the request and say so — only then do they see who you are, and only then do you see who they are.'),
        { href: link, label: 'Open the request' }
      ),
      text:
        `${headline} has asked whether anyone inside ${company} can help with ${roles}.\n\n` +
        `You are being asked because you told us you work there and are open to helping.\n` +
        `We have not shared your name or contact details with them.\n\n` +
        `If you can help, open the request and say so. Only then do you see each other's details.\n\n${link}\n`,
    };
  },

  referral_accepted: (d) => {
    const company = esc(d.company);
    const helper = esc(d.helper);
    const link = `${SITE}/portal/member/referrals`;
    return {
      subject: `${helper} can help with your referral at ${company}`,
      html: shell(
        `Good news — someone at ${company} can help`,
        p(`<strong>${helper}</strong> works at ${company} and has agreed to help with your request.`) +
        p('Their name and contact details are on your request now. Reach out, keep it short, and attach the role you are applying for.') +
        p('A referral is a favour, not a guarantee — but it is the single most effective way to get an application read.'),
        { href: link, label: 'See who can help' }
      ),
      text:
        `${helper} works at ${company} and has agreed to help with your referral request.\n\n` +
        `Their contact details are on your request now.\n\n${link}\n`,
    };
  },
};

export function renderTemplate(template: string, payload: Payload): Omit<Message, 'to'> | null {
  const fn = TEMPLATES[template];
  return fn ? fn(payload) : null;
}

// ============================================================ The drain

export interface DrainResult { sent: number; failed: number; skipped: number }

/**
 * Send what is queued.
 *
 * Elevated because it resolves other members' addresses, which is exactly the
 * thing a member's own session must not be able to do. Called from the cron
 * route and immediately after a referral is created, so mail is prompt without
 * any user session ever holding an address.
 */
export async function drainOutbox(limit = 50): Promise<DrainResult> {
  return withElevated(async (db) => {
    const rows = (await db`
      select o.id, o.template, o.payload, o.attempts,
             coalesce(o.to_address, p.email) as address
        from public.email_outbox o
        left join public.profiles p on p.id = o.recipient_id
       where o.status = 'pending' and o.attempts < 3
       order by o.created_at
       limit ${limit}
    `) as unknown as {
      id: string; template: string; payload: Payload; attempts: number; address: string | null;
    }[];

    let sent = 0, failed = 0, skipped = 0;

    for (const row of rows) {
      const rendered = row.address ? renderTemplate(row.template, row.payload ?? {}) : null;

      if (!rendered) {
        // No address, or a template that no longer exists. Neither is worth
        // retrying, so park it rather than spin.
        skipped += 1;
        await db`
          update public.email_outbox
             set status = 'skipped', attempts = attempts + 1,
                 last_error = ${row.address ? 'Unknown template' : 'No address for recipient'}
           where id = ${row.id}::uuid
        `;
        continue;
      }

      const outcome = await deliver({ ...rendered, to: row.address! });

      if (outcome.ok) {
        sent += 1;
        await db`
          update public.email_outbox
             set status = 'sent', sent_at = now(), attempts = attempts + 1, last_error = null
           where id = ${row.id}::uuid
        `;
      } else {
        failed += 1;
        const attempts = row.attempts + 1;
        await db`
          update public.email_outbox
             set status = ${attempts >= 3 ? 'failed' : 'pending'},
                 attempts = ${attempts},
                 last_error = ${outcome.error.slice(0, 500)}
           where id = ${row.id}::uuid
        `;
      }
    }

    return { sent, failed, skipped };
  });
}

/** True when real mail can actually go out; shown to admins so it is not a mystery. */
export const emailConfigured = (): boolean => Boolean(process.env.RESEND_API_KEY);
