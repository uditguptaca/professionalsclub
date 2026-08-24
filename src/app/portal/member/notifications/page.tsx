'use client';
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell, MessageCircle, UserPlus, Send, Heart, UsersRound, HelpCircle,
  HandHeart, Calendar, Shield, CheckCheck, Settings2, X, Inbox,
} from 'lucide-react';
import PortalLoading from '@/components/portal/PortalLoading';
import { useNotifications } from '@/context/notification-context';
import {
  notificationsStartAction,
  listNotificationsAction,
  updateNotificationPrefsAction,
} from '@/app/actions/notifications';
import type {
  AppNotification, NotificationCounts, NotificationPrefs,
} from '@/server/repos/notifications';
import { readCache, writeCache, CACHE_KEYS } from '@/lib/swr-cache';

/**
 * The notification inbox.
 *
 * One list, filterable by module, newest activity first. A row is a link to
 * wherever the thing happened; tapping it marks the row read and goes there,
 * which is the whole interaction — an inbox where you have to separately dismiss
 * things is an inbox people abandon.
 *
 * Rows arrive collapsed by the database (0031): one chat that received twelve
 * messages is one row saying 12, not twelve rows. So this list can be read top
 * to bottom without paging past a single noisy conversation.
 *
 * The gear opens per-module switches. They live here rather than in profile
 * settings because this is the screen someone is looking at when they decide
 * they want less of something.
 */

const MODULES: {
  key: string;
  label: string;
  icon: typeof Bell;
  /** Which pref switch governs it; null means it cannot be turned off. */
  pref: keyof NotificationPrefs | null;
  blurb: string;
}[] = [
  { key: 'chat', label: 'Messages', icon: MessageCircle, pref: 'chat', blurb: 'New messages in your chats' },
  { key: 'social', label: 'Follows', icon: UserPlus, pref: 'social', blurb: 'Follow requests and acceptances' },
  { key: 'referral', label: 'Referrals', icon: Send, pref: 'referral', blurb: 'Referral asks and answers' },
  { key: 'matrimony', label: 'Matrimony', icon: Heart, pref: 'matrimony', blurb: 'Interests, matches and profile reviews' },
  { key: 'community', label: 'Community', icon: UsersRound, pref: 'community', blurb: 'Likes, comments and group activity' },
  { key: 'help', label: 'Help desk', icon: HelpCircle, pref: 'help', blurb: 'Updates on your requests and admin replies' },
  { key: 'volunteer', label: 'Volunteering', icon: HandHeart, pref: null, blurb: 'Applications and case assignments' },
  { key: 'event', label: 'Events', icon: Calendar, pref: 'event', blurb: 'New events in your city' },
  { key: 'admin', label: 'Admin', icon: Shield, pref: null, blurb: 'Work waiting in the admin queues' },
];

const moduleFor = (category: string) =>
  MODULES.find((m) => m.key === category) ?? {
    key: category, label: 'Updates', icon: Bell, pref: null, blurb: '',
  };

/** "3m", "5h", "2d", then the date. Compact enough for the row's right edge. */
const ago = (iso: string): string => {
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  if (secs < 604800) return `${Math.floor(secs / 86400)}d`;
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
};

const initials = (first: string | null, last: string | null): string =>
  `${(first ?? '').charAt(0)}${(last ?? '').charAt(0)}`.toUpperCase() || '?';

/**
 * Exactly what notificationsStartAction returns for the unfiltered inbox. The
 * portal shell warms this under CACHE_KEYS.notifications, so the list is
 * already there when the member arrives.
 */
type NotificationsStart = {
  page: { items: AppNotification[]; hasMore: boolean };
  counts: NotificationCounts;
  prefs: NotificationPrefs;
};

export default function NotificationsPage() {
  const router = useRouter();
  const { counts, applyCounts, markRead, markAllRead } = useNotifications();

  const cached = readCache<NotificationsStart>(CACHE_KEYS.notifications);
  const [filter, setFilter] = React.useState<string>('');
  const [items, setItems] = React.useState<AppNotification[]>(cached?.page.items ?? []);
  const [hasMore, setHasMore] = React.useState(cached?.page.hasMore ?? false);
  const [loading, setLoading] = React.useState(cached === undefined);
  const [paging, setPaging] = React.useState(false);
  const [error, setError] = React.useState('');

  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [prefs, setPrefs] = React.useState<NotificationPrefs | null>(cached?.prefs ?? null);
  const [savingPref, setSavingPref] = React.useState<string>('');

  /**
   * The list, the counts the pills need, and the preference switches behind
   * the gear - one round trip. It was the list and the counts as two actions
   * that Next ran back to back, plus a third when the gear was tapped.
   */
  const load = React.useCallback(async (category: string) => {
    const r = await notificationsStartAction({ category: category || undefined });
    if (r.ok) {
      setItems(r.data.page.items);
      setHasMore(r.data.page.hasMore);
      setPrefs(r.data.prefs);
      applyCounts(r.data.counts);
      // Only the unfiltered view is worth caching: it is what the shell warms
      // and what a member coming back to this tab sees first.
      if (!category) writeCache<NotificationsStart>(CACHE_KEYS.notifications, r.data);
      setError('');
    } else {
      setError(r.error);
    }
    setLoading(false);
  }, [applyCounts]);

  React.useEffect(() => {
    // A filter change swaps the whole list, so show the skeleton unless there
    // is something cached to keep looking at.
    if (filter) setLoading(true);
    void load(filter);
  }, [filter, load]);

  const loadMore = async () => {
    const last = items[items.length - 1];
    if (!last) return;
    setPaging(true);
    const r = await listNotificationsAction({
      category: filter || undefined,
      before: last.updatedAt,
    });
    if (r.ok) {
      setItems((prev) => [...prev, ...r.data.items]);
      setHasMore(r.data.hasMore);
    } else {
      setError(r.error);
    }
    setPaging(false);
  };

  /**
   * Open it. Marking read happens optimistically so the row settles before
   * navigation rather than after coming back, and the badge drops immediately.
   */
  /**
   * Keep the cached copy in step with an optimistic change. Without this,
   * coming back to this tab repainted a row as unread until the background
   * refresh landed.
   */
  const patchCache = (patch: Partial<NotificationsStart>) => {
    const cur = readCache<NotificationsStart>(CACHE_KEYS.notifications);
    if (cur) writeCache<NotificationsStart>(CACHE_KEYS.notifications, { ...cur, ...patch });
  };

  const open = (n: AppNotification) => {
    if (!n.isRead) {
      setItems((prev) => {
        const next = prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x));
        if (!filter) patchCache({ page: { items: next, hasMore } });
        return next;
      });
      void markRead(n.id);
    }
    if (n.link) router.push(n.link);
  };

  const clearAll = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    await markAllRead(filter || undefined);
    // An in-flight list load would land after this and restore the rows it
    // fetched before the clear, so re-read rather than trust the optimism.
    await load(filter);
  };

  // Preferences arrived with the list, so the gear opens filled in.
  const openSettings = () => setSettingsOpen(true);

  const togglePref = async (key: keyof NotificationPrefs) => {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);                              // optimistic; the switch must feel instant
    setSavingPref(key);
    const r = await updateNotificationPrefsAction({ [key]: next[key] });
    if (r.ok) { setPrefs(r.data); patchCache({ prefs: r.data }); }
    else {
      setPrefs(prefs);                           // put it back, say why
      setError(r.error);
    }
    setSavingPref('');
  };

  const unreadShown = items.some((x) => !x.isRead);
  const activeModules = MODULES.filter((m) => (counts.byCategory[m.key] ?? 0) > 0);

  return (
    <div className="hf-page">
      <div className="hf-body" style={{ marginTop: 0 }}>
        <section className="hf-section">
          <div className="hf-section-head">
            <h1 style={{ fontSize: '1.45rem', margin: 0 }}>Notifications</h1>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {unreadShown && (
                <button type="button" className="nt-action" onClick={clearAll}>
                  <CheckCheck size={15} aria-hidden="true" />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                type="button"
                className="nt-action"
                onClick={openSettings}
                aria-label="Notification settings"
              >
                <Settings2 size={15} aria-hidden="true" />
              </button>
            </div>
          </div>

          {error && (
            <p className="community-error" role="alert">{error}</p>
          )}

          {/* Module filter. Only modules that have unread news get a count. */}
          <div className="nt-filters" role="tablist" aria-label="Filter by module">
            <button
              type="button"
              role="tab"
              aria-selected={filter === ''}
              className={`nt-filter${filter === '' ? ' is-on' : ''}`}
              onClick={() => setFilter('')}
            >
              All
              {counts.total > 0 && <span className="nt-filter-n">{counts.total}</span>}
            </button>
            {MODULES.map((m) => {
              const n = counts.byCategory[m.key] ?? 0;
              const Icon = m.icon;
              return (
                <button
                  key={m.key}
                  type="button"
                  role="tab"
                  aria-selected={filter === m.key}
                  className={`nt-filter${filter === m.key ? ' is-on' : ''}`}
                  onClick={() => setFilter(m.key)}
                >
                  <Icon size={14} aria-hidden="true" />
                  {m.label}
                  {n > 0 && <span className="nt-filter-n">{n}</span>}
                </button>
              );
            })}
          </div>

          {loading ? (
            <PortalLoading label="Loading your notifications" />
          ) : items.length === 0 ? (
            <div className="nt-empty">
              <span className="nt-empty-icon" aria-hidden="true"><Inbox size={26} /></span>
              <strong>
                {filter
                  ? `Nothing from ${moduleFor(filter).label.toLowerCase()} yet`
                  : 'You are all caught up'}
              </strong>
              <p>
                {filter
                  ? 'When something happens here, it will show up on this screen.'
                  : 'Messages, follow requests, referral answers and community activity all land here.'}
              </p>
              {filter && (
                <button type="button" className="btn btn-secondary" onClick={() => setFilter('')}>
                  Show everything
                </button>
              )}
            </div>
          ) : (
            <>
              <ul className="nt-list">
                {items.map((n) => {
                  const mod = moduleFor(n.category);
                  const Icon = mod.icon;
                  const hasFace = Boolean(n.actorFirstName || n.actorLastName);
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        className={`nt-row${n.isRead ? '' : ' is-unread'}`}
                        onClick={() => open(n)}
                      >
                        <span className={`nt-avatar cat-${mod.key}`} aria-hidden="true">
                          {hasFace
                            ? initials(n.actorFirstName, n.actorLastName)
                            : <Icon size={17} />}
                          <span className="nt-avatar-badge"><Icon size={10} /></span>
                        </span>
                        <span className="nt-row-body">
                          <span className="nt-row-top">
                            <strong>{n.title}</strong>
                            <small>{ago(n.updatedAt)}</small>
                          </span>
                          {n.body && <span className="nt-row-sub">{n.body}</span>}
                          <span className="nt-row-meta">
                            {mod.label}
                            {n.eventCount > 1 && (
                              <span className="nt-count">{n.eventCount} updates</span>
                            )}
                          </span>
                        </span>
                        {!n.isRead && <span className="nt-dot" aria-label="Unread" />}
                      </button>
                    </li>
                  );
                })}
              </ul>

              {hasMore && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={loadMore}
                  disabled={paging}
                  style={{ alignSelf: 'center', marginTop: 4 }}
                >
                  {paging ? 'Loading…' : 'Load older'}
                </button>
              )}
            </>
          )}

          {/* Live modules, so the member can see at a glance where news is. */}
          {!loading && !filter && activeModules.length > 1 && (
            <p className="nt-foot">
              Unread in {activeModules.map((m) => m.label.toLowerCase()).join(', ')}.
            </p>
          )}
        </section>
      </div>

      {/* --- Settings sheet ---------------------------------------------------- */}
      {settingsOpen && (
        <div className="hf-sheet-scrim" onClick={() => setSettingsOpen(false)}>
          <div
            className="hf-sheet nt-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Notification settings"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="hf-sheet-head">
              <h2>Notification settings</h2>
              <button
                type="button"
                className="portal-sheet-close"
                onClick={() => setSettingsOpen(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <p className="hf-sheet-sub">
              Turn off what you do not want to hear about. Switching a module off stops
              new notifications from it; anything already here stays.
            </p>

            {prefs === null ? (
              <PortalLoading label="Loading your notification settings" />
            ) : (
              <ul className="nt-prefs">
                {MODULES.filter((m) => m.pref !== null).map((m) => {
                  const key = m.pref as keyof NotificationPrefs;
                  const Icon = m.icon;
                  const on = prefs[key];
                  return (
                    <li key={m.key}>
                      <span className="nt-pref-icon" aria-hidden="true"><Icon size={17} /></span>
                      <span className="nt-pref-copy">
                        <strong>{m.label}</strong>
                        <small>{m.blurb}</small>
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        aria-label={`${m.label} notifications`}
                        className={`nt-switch${on ? ' is-on' : ''}`}
                        onClick={() => void togglePref(key)}
                        disabled={savingPref === key}
                      >
                        <span className="nt-switch-knob" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="nt-prefs-note">
              Messages you are sent, help-desk decisions on your own requests and
              volunteering assignments always reach you here. Mute a single chat from
              inside that chat instead.
            </p>

            <Link
              href="/portal/member/chats"
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
              onClick={() => setSettingsOpen(false)}
            >
              Chat settings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
