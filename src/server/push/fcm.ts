import 'server-only';
import { createSign } from 'node:crypto';

/**
 * Firebase Cloud Messaging, HTTP v1.
 *
 * Two jobs: mint an OAuth2 access token from the service-account key, and POST
 * one message to one device token.
 *
 * No firebase-admin. That package pulls a large dependency tree, opens gRPC
 * channels and expects a long-lived process, to give us one authenticated POST.
 * The whole auth flow is a signed JWT exchanged for a bearer token, which
 * node:crypto does in a few lines - the same call the email sender makes to
 * Resend, in the same shape.
 *
 * Nothing here reads the database or knows what a notification is. It takes a
 * token and a payload and reports what FCM said, so the caller can decide
 * whether a device is dead.
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

/** Notification channel on Android. Must match the manifest's default. */
export const CHANNEL_ID = 'pc_general';

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

/**
 * Base64 of the service-account JSON, because the raw JSON holds a PEM full of
 * newlines and every environment - .env.local, PowerShell, the Vercel form -
 * mangles that differently. Server-only: prefixing it NEXT_PUBLIC_ would put a
 * key that can push to every install into the browser bundle.
 */
function serviceAccount(): ServiceAccount | null {
  const raw = process.env.FCM_SERVICE_ACCOUNT_B64;
  if (!raw) return null;
  try {
    const json = JSON.parse(Buffer.from(raw, 'base64').toString('utf8')) as ServiceAccount;
    if (!json.project_id || !json.client_email || !json.private_key) return null;
    return json;
  } catch {
    return null;
  }
}

/** True when push can actually be sent. Used to report configuration honestly. */
export function pushConfigured(): boolean {
  return serviceAccount() !== null;
}

const b64url = (input: string | Buffer): string =>
  Buffer.from(input).toString('base64url');

// Access tokens last an hour. Cached across warm invocations, with a small
// safety margin so a token cannot expire mid-fan-out.
let cached: { token: string; expiresAt: number } | null = null;
// Failures are cached too, briefly. Without this a wrong key means every worker
// of every drain re-requests a token that will never be granted, forever.
let authFailedUntil = 0;

async function accessToken(sa: ServiceAccount): Promise<string | null> {
  const now = Date.now();
  if (cached && cached.expiresAt > now + 60_000) return cached.token;
  if (now < authFailedUntil) return null;

  const iat = Math.floor(now / 1000);
  const claims = {
    iss: sa.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat,
    exp: iat + 3600,
  };
  const signingInput = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(
    JSON.stringify(claims)
  )}`;

  let assertion: string;
  try {
    const signer = createSign('RSA-SHA256');
    signer.update(signingInput);
    assertion = `${signingInput}.${signer.sign(sa.private_key, 'base64url')}`;
  } catch (error) {
    // A malformed key is not transient; stop hammering Google over it.
    authFailedUntil = now + 60_000;
    console.error('[push] service-account key cannot sign:', error);
    return null;
  }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!res.ok) {
    authFailedUntil = now + 60_000;
    console.error(`[push] token request failed ${res.status}: ${await res.text()}`);
    return null;
  }

  const body = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) {
    authFailedUntil = now + 60_000;
    return null;
  }
  cached = {
    token: body.access_token,
    expiresAt: now + (body.expires_in ?? 3600) * 1000,
  };
  return cached.token;
}

/**
 * Mint the bearer token once for a batch. Callers fanning out to many devices
 * should do this before the loop rather than let every send race for it.
 */
export async function pushAuth(): Promise<{ token: string; projectId: string } | null> {
  const sa = serviceAccount();
  if (!sa) return null;
  const token = await accessToken(sa);
  return token ? { token, projectId: sa.project_id } : null;
}

export interface PushMessage {
  /** The device registration token. */
  to: string;
  title: string;
  /** Shown under the title. Must never carry private content. */
  body: string;
  /** In-app path to open when tapped. */
  link: string | null;
  /** Total unread, for the iOS app badge. */
  badge?: number;
  /** Collapse key, so a re-push about the same thing replaces the old one. */
  collapseKey?: string;
}

export type PushOutcome =
  /** Delivered to FCM. Not a delivery guarantee - the device may be off. */
  | { status: 'sent' }
  /** The token is dead. Delete it. */
  | { status: 'gone'; reason: string }
  /** Transient. Leave the token and let a later notification try again. */
  | { status: 'failed'; reason: string };

/**
 * FCM's error taxonomy, reduced to the only question that matters here: should
 * this device token be deleted?
 *
 * Deliberately narrow. Deleting a live token on a misread error means a member
 * silently stops receiving notifications with nothing to show why, so anything
 * ambiguous is treated as transient.
 */
function classify(status: number, payload: string): PushOutcome {
  let code = '';
  try {
    code = (JSON.parse(payload) as { error?: { status?: string } }).error?.status ?? '';
  } catch {
    /* not JSON; fall through to the status code */
  }

  // The app was uninstalled, or the token was replaced.
  if (status === 404 || code === 'NOT_FOUND' || code === 'UNREGISTERED') {
    return { status: 'gone', reason: code || `http ${status}` };
  }
  // A structurally invalid token. A malformed payload also lands on 400, but
  // that would fail for every device at once, which is visible in the logs.
  if (status === 400 && code === 'INVALID_ARGUMENT') {
    return { status: 'gone', reason: 'INVALID_ARGUMENT' };
  }
  // 401/403 mean our credentials are wrong, not the device's.
  return { status: 'failed', reason: code || `http ${status}` };
}

/**
 * Send one message. `auth` comes from pushAuth() so a batch mints one token.
 *
 * Data values must all be strings - FCM rejects the request otherwise, which is
 * why badge and unread are stringified here rather than at the call site.
 */
export async function sendPush(
  auth: { token: string; projectId: string },
  msg: PushMessage
): Promise<PushOutcome> {
  const url = `https://fcm.googleapis.com/v1/projects/${auth.projectId}/messages:send`;

  const message: Record<string, unknown> = {
    token: msg.to,
    notification: { title: msg.title, body: msg.body },
    // The tap handler reads this to route in-app. Strings only.
    data: { link: msg.link ?? '', title: msg.title },
    android: {
      priority: 'HIGH',
      ...(msg.collapseKey ? { collapse_key: msg.collapseKey } : {}),
      notification: {
        channel_id: CHANNEL_ID,
        // No click_action on purpose. FCM_PLUGIN_ACTIVITY is a Cordova-plugin
        // convention; under Capacitor it names an intent filter that does not
        // exist, and the tap then dismisses the notification without opening
        // anything. With the field absent, FCM launches the default activity and
        // the plugin replays the payload as pushNotificationActionPerformed.
      },
    },
    apns: {
      headers: {
        'apns-priority': '10',
        'apns-push-type': 'alert',
        ...(msg.collapseKey ? { 'apns-collapse-id': msg.collapseKey.slice(0, 64) } : {}),
      },
      payload: {
        aps: {
          alert: { title: msg.title, body: msg.body },
          sound: 'default',
          ...(typeof msg.badge === 'number' ? { badge: msg.badge } : {}),
        },
      },
    },
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${auth.token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });
  } catch (error) {
    return { status: 'failed', reason: error instanceof Error ? error.message : 'network' };
  }

  if (res.ok) return { status: 'sent' };
  return classify(res.status, await res.text().catch(() => ''));
}
