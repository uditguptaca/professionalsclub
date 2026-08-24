'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import {
  notificationCountsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from '@/app/actions/notifications';
import { registerPushDeviceAction } from '@/app/actions/push';
import { startPush, isNativePush } from '@/lib/push';
import { onIdle } from '@/lib/swr-cache';
import type { NotificationCounts } from '@/server/repos/notifications';

/**
 * Unread counts, polled once for the whole portal.
 *
 * Three places want this number: the bell in the desktop topbar, the badge on
 * the phone More tab, and the Chats tab. Polling in each of them would mean
 * three round trips every interval and three answers that disagree by a few
 * seconds, so the provider owns the poll and everything else reads it.
 *
 * 45s, and only while the tab is visible. The badge is ambient information;
 * anything faster spends the member's battery to tell them something they will
 * see the moment they open the inbox anyway. Chat itself still polls at 5s
 * while a thread is open, which is where speed actually matters.
 */

const EMPTY: NotificationCounts = { total: 0, byCategory: {} };
const POLL_MS = 45_000;

interface NotificationContextType {
  counts: NotificationCounts;
  /** Unread in one module. */
  count: (category: string) => number;
  refresh: () => Promise<void>;
  /**
   * Publish counts a page already has. The inbox reads its list and its counts
   * in one action, so asking for them again here would be a second round trip
   * for a number already in hand.
   */
  applyCounts: (counts: NotificationCounts) => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: (category?: string) => Promise<void>;
}

const NotificationContext = React.createContext<NotificationContextType | undefined>(
  undefined
);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [counts, setCounts] = React.useState<NotificationCounts>(EMPTY);
  const router = useRouter();

  const refresh = React.useCallback(async () => {
    const r = await notificationCountsAction();
    if (r.ok) setCounts(r.data);
  }, []);

  /**
   * Push registration, native shells only.
   *
   * This lives here rather than in a dedicated component because the provider
   * is already mounted for the whole portal, is already the owner of the unread
   * count, and is only ever rendered for a signed-in member - which is exactly
   * the three things push registration needs. On a desktop browser isNativePush()
   * is false and none of it runs.
   */
  React.useEffect(() => {
    if (!isNativePush()) return;
    void startPush({
      onToken: async (token, platform) => {
        const r = await registerPushDeviceAction(token, platform);
        if (!r.ok) console.error('[push] could not register device:', r.error);
      },
      // A tapped notification carries the same in-app link the inbox row uses,
      // so this lands on the conversation or post that caused it. Works from a
      // cold start too: Capacitor replays the launch intent.
      onOpen: (link) => {
        void refresh();
        router.push(link);
      },
      // Arrived while the app was open, so the OS showed nothing. The badge is
      // the only cue the member gets.
      onForeground: () => void refresh(),
    });
  }, [refresh, router]);

  React.useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    // The FIRST count fetch waits for idle on purpose. Next runs a client's
    // Server Action calls one at a time, so firing this the instant the shell
    // mounts put a badge query in front of whatever the page itself needs -
    // the member then waited a whole extra round trip to see their own
    // content. The badge is ambient; it can be a moment late.
    let cancelIdle: (() => void) | null = null;
    const start = () => {
      if (timer !== null) return;
      cancelIdle?.();
      cancelIdle = onIdle(() => void refresh());
      timer = setInterval(() => void refresh(), POLL_MS);
    };
    const stop = () => {
      cancelIdle?.();
      cancelIdle = null;
      if (timer === null) return;
      clearInterval(timer);
      timer = null;
    };

    // A backgrounded tab has no one looking at the badge.
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVisibility);
    if (!document.hidden) start();

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  }, [refresh]);

  const applyCounts = React.useCallback((next: NotificationCounts) => setCounts(next), []);

  const markRead = React.useCallback(async (id: string) => {
    const r = await markNotificationReadAction(id);
    if (r.ok) setCounts(r.data);
  }, []);

  const markAllRead = React.useCallback(async (category?: string) => {
    const r = await markAllNotificationsReadAction(category);
    if (r.ok) setCounts(r.data);
  }, []);

  const count = React.useCallback(
    (category: string) => counts.byCategory[category] ?? 0,
    [counts]
  );

  const value = React.useMemo(
    () => ({ counts, count, refresh, applyCounts, markRead, markAllRead }),
    [counts, count, refresh, applyCounts, markRead, markAllRead]
  );

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}

/**
 * Never throws. A badge is decoration: if a component renders outside the
 * provider (or during the server pass, where there is no provider at all), it
 * should show nothing rather than take the page down with it. That lesson cost
 * a production render once already, via useApp.
 */
export function useNotifications(): NotificationContextType {
  const ctx = React.useContext(NotificationContext);
  if (ctx) return ctx;
  return {
    counts: EMPTY,
    count: () => 0,
    refresh: async () => {},
    applyCounts: () => {},
    markRead: async () => {},
    markAllRead: async () => {},
  };
}
