'use client';

/**
 * Push notification registration, native only.
 *
 * The store apps are a WebView pointed at this very site, and Capacitor injects
 * its bridge into the hosted page, so this code runs in the same bundle a
 * desktop browser downloads. Everything here is therefore guarded on actually
 * being inside the native shell: on a laptop `isNativePush()` is false, nothing
 * is imported, nothing is asked, and the site behaves exactly as before.
 *
 * The plugin is imported dynamically so it lands in its own chunk rather than
 * the initial one every web visitor downloads. It must still be BUNDLED, not
 * externalised: a bare npm specifier is not resolvable in a browser at runtime,
 * and marking it webpackIgnore produces exactly that failure inside the app
 * ("Failed to resolve module specifier"). The package itself is a thin proxy
 * over the native bridge and ships a web fallback, so bundling it is safe.
 */

/** Channel id. Must match default_notification_channel_id in AndroidManifest. */
const CHANNEL_ID = 'pc_general';

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
}

function capacitor(): CapacitorGlobal | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor ?? null;
}

/** True only inside the Android or iOS shell. */
export function isNativePush(): boolean {
  const cap = capacitor();
  if (!cap?.isNativePlatform?.()) return false;
  const platform = cap.getPlatform?.();
  return platform === 'android' || platform === 'ios';
}

export function nativePlatform(): 'android' | 'ios' | null {
  if (!isNativePush()) return null;
  return capacitor()?.getPlatform?.() === 'ios' ? 'ios' : 'android';
}

/** The device token this session registered, so sign-out can remove it. */
let currentToken: string | null = null;
export const registeredToken = (): string | null => currentToken;

let started = false;

export interface PushCallbacks {
  /** Persist the token. Called on every app start; the server upserts. */
  onToken: (token: string, platform: 'android' | 'ios') => Promise<void>;
  /** Navigate. Fired when a notification is tapped, including from cold start. */
  onOpen: (link: string) => void;
  /** A push arrived while the app was in the foreground. */
  onForeground?: () => void;
}

/**
 * Ask permission, register with FCM, and wire up the listeners.
 *
 * Idempotent, and safe to call on every mount: the guard makes repeat calls
 * no-ops, because attaching the listeners twice would route one tap twice.
 *
 * Never throws. A member who declines notifications, or a device with no Play
 * Services, must get an app that works exactly as well as before — push is an
 * enhancement, not a dependency.
 */
export async function startPush(callbacks: PushCallbacks): Promise<void> {
  if (started || !isNativePush()) return;
  started = true;

  const platform = nativePlatform();
  if (!platform) return;

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    // ---- Permission ------------------------------------------------------
    // Android 13+ needs POST_NOTIFICATIONS at runtime (declared in the
    // manifest; the plugin requests it). iOS always prompts. If it is already
    // decided, this returns without showing anything.
    let status = await PushNotifications.checkPermissions();
    if (status.receive === 'prompt' || status.receive === 'prompt-with-rationale') {
      status = await PushNotifications.requestPermissions();
    }
    if (status.receive !== 'granted') return;

    // ---- Listeners, before register() -------------------------------------
    // register() can fire 'registration' immediately, so the listener has to
    // already be attached or the very first token is lost.
    await PushNotifications.addListener('registration', (token) => {
      currentToken = token.value;
      void callbacks.onToken(token.value, platform);
    });

    await PushNotifications.addListener('registrationError', (err) => {
      // Usually a missing google-services.json or no Play Services.
      console.error('[push] registration failed:', err.error);
    });

    await PushNotifications.addListener('pushNotificationReceived', () => {
      // Foreground arrival. The tray notification is suppressed by the OS in
      // this case, so the badge is the only signal; refresh it.
      callbacks.onForeground?.();
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const link = (action.notification.data as { link?: string } | undefined)?.link;
      if (link) callbacks.onOpen(link);
    });

    // ---- Android channel --------------------------------------------------
    // Created before register() so a notification that arrives while the app is
    // killed lands on a channel that exists. VISIBILITY_PRIVATE (0) is
    // deliberate: it keeps the notification's text off a LOCKED screen and
    // shows it only after unlock. The server already strips sensitive help-desk
    // titles from the payload, and this is the second layer.
    if (platform === 'android') {
      try {
        await PushNotifications.createChannel({
          id: CHANNEL_ID,
          name: 'Club updates',
          description: 'Messages, follow requests, referrals and community activity',
          importance: 4,
          visibility: 0,
          vibration: true,
        });
      } catch (error) {
        // Channels are unavailable below API 26 and unimplemented on iOS.
        console.warn('[push] channel not created:', error);
      }
    }

    await PushNotifications.register();
  } catch (error) {
    console.error('[push] could not start:', error);
  }
}

/**
 * Clear the tray and drop the token. Call on sign-out: the next person to use
 * this phone must not receive the previous member's notifications.
 */
export async function stopPush(): Promise<void> {
  if (!isNativePush()) return;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    await PushNotifications.removeAllDeliveredNotifications();
    await PushNotifications.unregister();
  } catch (error) {
    console.error('[push] could not stop:', error);
  }
  currentToken = null;
  started = false;
}
