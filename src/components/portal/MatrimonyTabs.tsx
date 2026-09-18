'use client';
import Link from 'next/link';
import { Flame, Heart, Search, UserCircle } from 'lucide-react';

/**
 * The matrimony module's own navigation, four equal tabs on a phone, a pill
 * row on wider screens: Discover (the deck) · Browse (everyone, with filters
 * and a "best match" order) · Likes · Profile. Chats already sits on the
 * app-wide tab bar, so it no longer takes a slot here. Matches and Shortlist
 * used to be pages of their own reachable only from inside other pages; they
 * are now an order in Browse and a lane in Likes.
 */

const TABS = [
  { id: 'discover', label: 'Discover', href: '/portal/member/matrimony', icon: Flame },
  { id: 'browse', label: 'Browse', href: '/portal/member/matrimony/browse', icon: Search },
  { id: 'likes', label: 'Likes', href: '/portal/member/matrimony/interests', icon: Heart },
  { id: 'profile', label: 'Profile', href: '/portal/member/matrimony/profile', icon: UserCircle },
] as const;

export type MatrimonyTabId = (typeof TABS)[number]['id'];

export default function MatrimonyTabs({ active, likes = 0 }: { active: MatrimonyTabId; likes?: number }) {
  return (
    <nav aria-label="Matrimony" className="mt-tabs">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === active;
        return (
          <Link key={tab.id} href={tab.href} aria-current={isActive ? 'page' : undefined}>
            <Icon size={16} aria-hidden="true" />
            {tab.label}
            {tab.id === 'likes' && likes > 0 && (
              <span className="mt-badge" aria-label={`${likes} waiting`}>{likes > 9 ? '9+' : likes}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
