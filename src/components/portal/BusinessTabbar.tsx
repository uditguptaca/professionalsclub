'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Home, Ticket, Calendar, MessageSquareText, ScanLine } from 'lucide-react';

/**
 * The business console's phone navigation: five destinations along the bottom,
 * thumb-reachable, always visible. Above 1024px the CSS hides it and the console
 * shows the same five as a row of pills.
 *
 * Tabs live in the URL (?tab=) so this bar, the console and the browser's back
 * button agree on where the owner is. The redeem page a member's QR opens is
 * the Scan destination by another route.
 */
const ITEMS: { key: string; label: string; Icon: typeof Home }[] = [
  { key: 'home', label: 'Home', Icon: Home },
  { key: 'offers', label: 'Offers', Icon: Ticket },
  { key: 'events', label: 'Events', Icon: Calendar },
  { key: 'posts', label: 'Posts', Icon: MessageSquareText },
  { key: 'scan', label: 'Scan', Icon: ScanLine },
];

export default function BusinessTabbar() {
  const pathname = usePathname();
  const params = useSearchParams();
  const onRedeem = pathname.startsWith('/portal/business/redeem');
  const raw = params.get('tab') ?? 'home';
  // The page editor is reached from Home, so Home stays lit while editing.
  const current = onRedeem ? 'scan' : raw === 'page' ? 'home' : raw;

  return (
    <nav className="tabbar" aria-label="Business console">
      {ITEMS.map(({ key, label, Icon }) => {
        const active = current === key;
        return (
          <Link
            key={key}
            href={key === 'home' ? '/portal/business' : `/portal/business?tab=${key}`}
            className={`tabbar-item ${active ? 'active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={21} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
