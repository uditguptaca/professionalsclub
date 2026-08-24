'use client';
import React from 'react';
import {
  notificationCountsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from '@/app/actions/notifications';
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
  markRead: (id: string) => Promise<void>;
  markAllRead: (category?: string) => Promise<void>;
}

const NotificationContext = React.createContext<NotificationContextType | undefined>(
  undefined
);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [counts, setCounts] = React.useState<NotificationCounts>(EMPTY);

  const refresh = React.useCallback(async () => {
    const r = await notificationCountsAction();
    if (r.ok) setCounts(r.data);
  }, []);

  React.useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer !== null) return;
      void refresh();
      timer = setInterval(() => void refresh(), POLL_MS);
    };
    const stop = () => {
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
    () => ({ counts, count, refresh, markRead, markAllRead }),
    [counts, count, refresh, markRead, markAllRead]
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
    markRead: async () => {},
    markAllRead: async () => {},
  };
}
