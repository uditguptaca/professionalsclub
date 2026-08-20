'use client';
import Link from 'next/link';
import { Flame, Heart, MessageCircle, UserCircle } from 'lucide-react';

/**
 * The matrimony module's own navigation, in the dating-app grammar:
 * Discover (the deck) · Likes · Chats · Profile. Rendered at the top of each
 * matrimony page — the app-wide tab bar keeps owning the bottom edge.
 */

const TABS = [
  { id: 'discover', label: 'Discover', href: '/portal/member/matrimony', icon: Flame },
  { id: 'likes', label: 'Likes', href: '/portal/member/matrimony/interests', icon: Heart },
  { id: 'chats', label: 'Chats', href: '/portal/member/chats', icon: MessageCircle },
  { id: 'profile', label: 'Profile', href: '/portal/member/matrimony/profile', icon: UserCircle },
] as const;

export type MatrimonyTabId = (typeof TABS)[number]['id'];

export default function MatrimonyTabs({ active }: { active: MatrimonyTabId }) {
  return (
    <nav
      aria-label="Matrimony"
      style={{
        display: 'flex', gap: 4, padding: 4, marginBottom: '1rem',
        background: 'var(--bg-primary)', borderRadius: 999,
        border: '1px solid rgba(27,67,50,0.08)', width: 'fit-content',
        maxWidth: '100%', overflowX: 'auto',
      }}
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              minHeight: 44, padding: '0 14px', borderRadius: 999,
              textDecoration: 'none', fontSize: '0.86rem', whiteSpace: 'nowrap',
              background: isActive ? 'var(--green-950)' : 'none',
              color: isActive ? '#fff' : 'var(--text-secondary)',
              fontWeight: isActive ? 700 : 600,
            }}
          >
            <Icon size={16} aria-hidden="true" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
