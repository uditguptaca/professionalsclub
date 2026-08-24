'use client';
import React from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/context/notification-context';

/**
 * The entry point to the inbox. Two skins, same count:
 *
 *   default — the desktop topbar, a bordered icon button.
 *   hero    — over the dashboard's city photograph, glass on dark. Phones have
 *             no topbar (deliberately removed), so this is the bell a phone
 *             member actually reaches for, in the same top-right corner every
 *             social app puts it.
 *
 * Counts stop reading at 9+. "23 things happened" is not more actionable than
 * "lots", and a three-digit badge stops fitting the dot.
 */
export default function NotificationBell({
  variant = 'default',
}: {
  variant?: 'default' | 'hero';
}) {
  const { counts } = useNotifications();
  const n = counts.total;
  const label = n === 0 ? 'Notifications' : `Notifications, ${n} unread`;

  return (
    <Link
      href="/portal/member/notifications"
      className={`nt-bell${variant === 'hero' ? ' is-hero' : ''}`}
      aria-label={label}
      title={label}
    >
      <Bell size={variant === 'hero' ? 19 : 17} aria-hidden="true" />
      {n > 0 && <span className="nt-bell-dot">{n > 9 ? '9+' : n}</span>}
    </Link>
  );
}
