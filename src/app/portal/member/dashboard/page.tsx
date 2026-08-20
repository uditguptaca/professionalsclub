'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/app-context';
import { fetchHomeFeed, updateMyCity } from '@/app/actions/portal';
import { followMember, unfollowMember } from '@/app/actions/chat';
import type { HomeFeed } from '@/server/repos/home';
import { COMMUNITY_CITIES, cityInfo } from '@/lib/cities';
import { readCache, writeCache } from '@/lib/swr-cache';
import {
  MapPin, ChevronDown, Calendar, Users, ArrowRight, Briefcase, ShieldCheck,
  FileText, Send, Bookmark, Mail, Store, Check, Loader2, UsersRound, X,
  UserPlus,
} from 'lucide-react';

/**
 * The member home: a city feed, not a menu.
 *
 * Structure follows the reference the club chose (InterNations' start screen),
 * translated into this club's voice and rules:
 *
 *   city hero + switcher   →  skyline, greeting, "{City} Community" pill
 *   profile completeness   →  ring + one CTA (hidden at 100%)
 *   New in {city}          →  member_names view; say hello in the community,
 *                             never DMs — the club is admin-mediated
 *   Events for you         →  image cards, city-tagged, attendee counts
 *   Groups for you         →  horizontal rail, live member counts
 *   Don't forget           →  photo tiles with the member's own counters
 *   Jobs near you          →  employers with roles in this city + helper count
 *   Member offers          →  verified businesses, city first
 *
 * Everything arrives in one server round trip (fetchHomeFeed); switching city
 * writes the profile and refetches, so the whole feed follows the pill.
 */

const monthDay = (iso: string | null): string => {
  if (!iso) return 'Date TBA';
  const d = new Date(iso);
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
};

const joinedAgo = (iso: string): string => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return 'joined today';
  if (days < 7) return `joined ${days}d ago`;
  if (days < 60) return `joined ${Math.floor(days / 7)}w ago`;
  return `joined ${Math.floor(days / 30)}mo ago`;
};

const initials = (first: string, last: string) =>
  `${(first[0] ?? '').toUpperCase()}${(last[0] ?? '').toUpperCase()}` || 'M';

/** Completeness ring, drawn with SVG stroke arithmetic — no chart library. */
function Ring({ pct }: { pct: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" role="img" aria-label={`Profile ${pct}% complete`}>
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--primary-100)" strokeWidth="6" />
      <circle
        cx="32" cy="32" r={r} fill="none"
        stroke="var(--primary-600)" strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * c} ${c}`}
        transform="rotate(-90 32 32)"
      />
      <text x="32" y="37" textAnchor="middle" fontSize="14" fontWeight="800" fill="var(--text-primary)">
        {pct}%
      </text>
    </svg>
  );
}

export default function MemberHomePage() {
  const { profile } = useApp();
  const [feed, setFeed] = useState<HomeFeed | null>(null);
  // Optimistic overrides for the follow buttons; server truth arrives on the
  // next feed load.
  const [followed, setFollowed] = useState<Record<string, 'none' | 'pending' | 'accepted'>>({});
  const [error, setError] = useState('');
  const [cityOpen, setCityOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const load = async () => {
    const r = await fetchHomeFeed();
    if (r.ok) { setFeed(r.data); writeCache('home-feed', r.data); setError(''); }
    else setError(r.error);
  };
  useEffect(() => {
    // Render whatever the member saw last INSTANTLY, then refresh behind it -
    // the database is remote, and nobody should stare at a skeleton twice.
    const cached = readCache<HomeFeed>('home-feed');
    if (cached) setFeed(cached);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const city = useMemo(() => cityInfo(feed?.city), [feed?.city]);

  const switchCity = async (name: string) => {
    if (switching) return;
    setSwitching(true);
    const r = await updateMyCity(name);
    if (r.ok) { setCityOpen(false); await load(); }
    else setError(r.error);
    setSwitching(false);
  };

  const firstName = profile?.firstName || 'there';

  if (error && !feed) {
    return (
      <div className="hf-page">
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <p role="alert" className="community-error" style={{ marginBottom: 16 }}>{error}</p>
          <button type="button" className="btn btn-primary" onClick={() => { setError(''); load(); }}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="hf-page">
      {/* ================= City hero ================= */}
      <header className="hf-hero">
        <img src={city.skyline} alt="" aria-hidden="true" className="hf-hero-img" />
        <div className="hf-hero-scrim" aria-hidden="true" />
        <div className="hf-hero-body">
          <span className="hf-avatar" aria-hidden="true">
            {initials(profile?.firstName ?? '', profile?.lastName ?? '')}
          </span>
          <h1>Hi {firstName}!</h1>
          <p>What would you like to do today?</p>
          <button type="button" className="hf-city-pill" onClick={() => setCityOpen(true)}>
            <MapPin size={14} aria-hidden="true" />
            {city.known ? `${city.name} Community` : city.name}
            <ChevronDown size={14} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* City switcher sheet */}
      {cityOpen && (
        <div className="hf-sheet-scrim" onClick={() => setCityOpen(false)}>
          <div className="hf-sheet" role="dialog" aria-modal="true" aria-label="Choose your community"
               onClick={(e) => e.stopPropagation()}>
            <div className="hf-sheet-head">
              <h2>Your community</h2>
              <button type="button" className="ref-icon-btn" aria-label="Close" onClick={() => setCityOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <p className="hf-sheet-sub">Events, groups, jobs and offers follow your city.</p>
            <ul className="hf-city-list">
              {COMMUNITY_CITIES.map((c) => {
                const active = c.name.toLowerCase() === (feed?.city ?? '').toLowerCase();
                return (
                  <li key={c.name}>
                    <button type="button" disabled={switching} onClick={() => switchCity(c.name)}
                            aria-current={active ? 'true' : undefined}>
                      <span>{c.name}<small>{c.province}</small></span>
                      {active ? <Check size={16} aria-hidden="true" />
                              : switching ? null : <ArrowRight size={14} aria-hidden="true" className="hf-city-go" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {error && <p role="alert" className="community-error">{error}</p>}

      {/* ================= Loading skeleton ================= */}
      {!feed && !error && (
        <div className="hf-body" aria-busy="true">
          <div className="community-shimmer" style={{ height: 92, borderRadius: 14 }} />
          <div className="community-shimmer" style={{ height: 200, borderRadius: 14 }} />
          <div className="community-shimmer" style={{ height: 160, borderRadius: 14 }} />
        </div>
      )}

      {feed && (
        <div className="hf-body">
          {/* ============ Profile completeness ============ */}
          {feed.completenessPct < 100 && (
            <section className="hf-complete card">
              <Ring pct={feed.completenessPct} />
              <div>
                <h2>Make your profile work for you</h2>
                <p>The more you share, the easier it is to match you with the right help.</p>
                <Link href="/portal/member/profile" className="btn btn-outline btn-sm">
                  Complete your profile
                </Link>
              </div>
            </section>
          )}

          {/* ============ New in {city} ============ */}
          {feed.newMembers.length > 0 && (
            <section className="hf-section">
              <div className="hf-section-head">
                <h2>New in {city.known ? city.name : 'the club'}</h2>
                <Link href="/portal/member/community">Community <ArrowRight size={14} aria-hidden="true" /></Link>
              </div>
              <div className="hf-members card">
                {feed.newMembers.slice(0, 4).map((m) => (
                  <div key={m.id} className="hf-member">
                    <span className="hf-member-avatar" aria-hidden="true">{initials(m.firstName, m.lastName)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong>{m.firstName} {m.lastName}</strong>
                      <small>
                        {[m.jobTitle, m.city].filter(Boolean).join(' · ') || 'Member'} · {joinedAgo(m.createdAt)}
                      </small>
                    </div>
                    {(() => {
                      // Follows are requests now: none -> Requested -> Following.
                      const state = followed[m.id] ?? m.followState;
                      const label = state === 'accepted' ? 'Following' : state === 'pending' ? 'Requested' : 'Follow';
                      return (
                        <button
                          type="button"
                          className={`pp-toggle ${state === 'accepted' ? 'is-on' : ''}`}
                          style={{ padding: '0.32rem 0.75rem', opacity: state === 'pending' ? 0.75 : 1 }}
                          aria-pressed={state !== 'none'}
                          onClick={() => {
                            const next = state === 'none' ? 'pending' : 'none';
                            setFollowed((f) => ({ ...f, [m.id]: next }));
                            void (state === 'none' ? followMember(m.id) : unfollowMember(m.id)).then((r) => {
                              if (!r.ok) setFollowed((f) => ({ ...f, [m.id]: state }));
                            });
                          }}
                        >
                          {state === 'accepted' ? <Check size={13} aria-hidden="true" /> : <UserPlus size={13} aria-hidden="true" />}
                          {label}
                        </button>
                      );
                    })()}
                  </div>
                ))}
                <Link href="/portal/member/community" className="btn btn-primary hf-members-cta">
                  <UsersRound size={15} aria-hidden="true" /> Say hello in the community
                </Link>
              </div>
            </section>
          )}

          {/* ============ Events for you ============ */}
          {feed.events.length > 0 && (
            <section className="hf-section">
              <div className="hf-section-head">
                <h2>Events for you</h2>
                <Link href="/portal/member/events">All events <ArrowRight size={14} aria-hidden="true" /></Link>
              </div>
              <div className="hf-events">
                {feed.events.map((e) => (
                  <a key={e.id} href={e.rsvpUrl ?? '/portal/member/events'} className="hf-event card"
                     target={e.rsvpUrl ? '_blank' : undefined} rel={e.rsvpUrl ? 'noopener noreferrer' : undefined}>
                    <span className="hf-event-media">
                      {e.image
                        ? <img src={e.image} alt="" aria-hidden="true" />
                        : <span className="hf-event-fallback" aria-hidden="true"><Calendar size={28} /></span>}
                      {e.inCity && <span className="hf-chip">{city.name}</span>}
                    </span>
                    <span className="hf-event-body">
                      <strong>{e.title}</strong>
                      <small><Calendar size={12} aria-hidden="true" /> {monthDay(e.date)}{e.time ? ` · ${e.time}` : ''}</small>
                      <small><Users size={12} aria-hidden="true" /> {e.attendees} attending{e.location ? ` · ${e.location}` : ''}</small>
                    </span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* ============ Groups for you ============ */}
          {feed.groups.length > 0 && (
            <section className="hf-section">
              <div className="hf-section-head">
                <h2>Groups for you</h2>
                <Link href="/portal/member/community/groups">All groups <ArrowRight size={14} aria-hidden="true" /></Link>
              </div>
              <div className="hf-rail">
                {feed.groups.map((g) => (
                  <Link key={g.id} href={`/portal/member/community/groups/${g.id}`} className="hf-group card">
                    <span className="hf-group-badge" aria-hidden="true">{g.name.slice(0, 2).toUpperCase()}</span>
                    <strong>{g.name}</strong>
                    <small><Users size={12} aria-hidden="true" /> {g.memberCount} member{g.memberCount === 1 ? '' : 's'}</small>
                    {g.isMember
                      ? <span className="hf-joined"><Check size={12} aria-hidden="true" /> Joined</span>
                      : <span className="hf-join">View group</span>}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ============ Don't forget ============ */}
          <section className="hf-section">
            <div className="hf-section-head"><h2>Don&rsquo;t forget</h2></div>
            <div className="hf-tiles">
              {[
                { n: feed.counters.openRequests, label: 'Open requests', href: '/portal/member/my-requests', img: '/img/mentoring-1.jpg', icon: <FileText size={14} /> },
                { n: feed.counters.pendingReferralAsks, label: 'Referral asks waiting', href: '/portal/member/referrals', img: '/img/resume-review.jpg', icon: <Send size={14} /> },
                { n: feed.counters.myUpcomingEvents, label: 'Upcoming events', href: '/portal/member/events', img: '/img/event-wide-1.jpg', icon: <Calendar size={14} /> },
                { n: feed.counters.savedBusinesses, label: 'Saved businesses', href: '/portal/member/businesses', img: '/img/community-hall-1.jpg', icon: <Bookmark size={14} /> },
              ].map((t) => (
                <Link key={t.label} href={t.href} className="hf-tile">
                  <img src={t.img} alt="" aria-hidden="true" />
                  <span className="hf-tile-scrim" aria-hidden="true" />
                  <span className="hf-tile-icon" aria-hidden="true">{t.icon}</span>
                  <span className="hf-tile-body"><strong>{t.n}</strong>{t.label}</span>
                </Link>
              ))}
            </div>
            {feed.counters.unreadMessages > 0 && (
              <Link href="/portal/member/messages" className="hf-unread card">
                <Mail size={16} aria-hidden="true" />
                {feed.counters.unreadMessages === 1
                  ? '1 unread message from the admin team'
                  : `${feed.counters.unreadMessages} unread messages from the admin team`}
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            )}
          </section>

          {/* ============ Jobs near you ============ */}
          {feed.jobs.length > 0 && (
            <section className="hf-section">
              <div className="hf-section-head">
                <h2>Jobs {city.known ? `in ${city.name}` : 'for you'}</h2>
                <Link href="/portal/member/jobs">All employers <ArrowRight size={14} aria-hidden="true" /></Link>
              </div>
              <div className="hf-jobs card">
                {feed.jobs.map((c) => (
                  <Link key={c.companyId} href="/portal/member/jobs" className="hf-job">
                    <span className="ref-logo" aria-hidden="true">{c.companyLogo || c.companyName.charAt(0)}</span>
                    <span className="hf-job-body">
                      <strong>{c.companyName}</strong>
                      <small>
                        {c.cityJobs > 0
                          ? `${c.cityJobs} open in ${city.name}`
                          : c.sample ?? 'Open roles'}
                      </small>
                      {c.helperCount > 0 && (
                        <span className="ref-helpers"><ShieldCheck size={12} aria-hidden="true" />
                          {c.helperCount === 1 ? '1 member can help' : `${c.helperCount} members can help`}
                        </span>
                      )}
                    </span>
                    <Briefcase size={16} aria-hidden="true" className="hf-job-go" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ============ Member offers ============ */}
          {feed.businesses.length > 0 && (
            <section className="hf-section">
              <div className="hf-section-head">
                <h2>Member offers {city.known ? `in ${city.name}` : ''}</h2>
                <Link href="/portal/member/businesses">Directory <ArrowRight size={14} aria-hidden="true" /></Link>
              </div>
              <div className="hf-rail">
                {feed.businesses.map((b) => (
                  <Link key={b.id} href="/portal/member/businesses" className="hf-biz card">
                    <span className="hf-group-badge hf-biz-badge" aria-hidden="true">{b.logo || b.name.charAt(0)}</span>
                    <strong>{b.name}</strong>
                    <small>{[b.category, b.city].filter(Boolean).join(' · ')}</small>
                    {b.memberRateText && (
                      <span className="hf-deal"><Store size={11} aria-hidden="true" /> {b.memberRateText}</span>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
      {switching && (
        <div className="hf-switching" role="status" aria-label="Switching city">
          <Loader2 size={18} className="spin" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
