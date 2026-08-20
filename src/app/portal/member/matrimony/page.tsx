'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/app-context';
import { getMatrimonyDashboard, markNotificationRead } from '@/app/actions/matrimony';
import type { MatrimonyProfile, MatrimonyProfileCard, InAppNotification } from '@/types/matrimony';
import {
  Heart, User, Search, MessageCircle, Settings, ArrowRight, Eye, Send, Inbox,
  ShieldCheck, AlertCircle, Clock, CheckCircle2, XCircle, PauseCircle, FileEdit,
  Plus, Bookmark, ChevronRight, Bell, HeartHandshake, Check, BadgeCheck,
  MapPin, Briefcase, Lock,
} from 'lucide-react';
import PortalLoading from '@/components/portal/PortalLoading';

/**
 * The matrimony hub, in the profile-hub grammar: an identity header with the
 * completeness ring, then grouped summary rows. Photo-led recommendation cards
 * are the one image block. Every other stop on the module is a row, so the page
 * reads at a glance instead of as a wall of stat panels.
 */

const STATUS: Record<
  string,
  { label: string; icon: React.ElementType; fix?: string }
> = {
  draft:             { label: 'Draft',             icon: FileEdit,     fix: 'Finish and submit your profile' },
  pending:           { label: 'In review',         icon: Clock },
  approved:          { label: 'Live',              icon: CheckCircle2 },
  rejected:          { label: 'Not approved',      icon: XCircle,      fix: 'Review the feedback and resubmit' },
  changes_requested: { label: 'Changes requested', icon: AlertCircle,  fix: 'Update your profile and resubmit' },
  suspended:         { label: 'Suspended',         icon: PauseCircle },
};

/** Completeness ring around the avatar: r=44 → circumference ≈ 276.5. */
const RING_C = 2 * Math.PI * 44;

export default function MemberMatrimonyDashboard() {
  const { currentUserId } = useApp();

  const [profile, setProfile] = useState<MatrimonyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [interestsReceived, setInterestsReceived] = useState(0);
  const [interestsSent, setInterestsSent] = useState(0);
  const [profileViews, setProfileViews] = useState(0);
  const [shortlistedBy, setShortlistedBy] = useState(0);
  const [recommendations, setRecommendations] = useState<MatrimonyProfileCard[]>([]);
  const [recentActivity, setRecentActivity] = useState<{ type: string; text: string; time: string; icon: React.ElementType }[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [notifBusyId, setNotifBusyId] = useState<string | null>(null);
  const [notifError, setNotifError] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    async function fetchData() {
      if (!currentUserId) { setLoading(false); return; }
      setLoading(true);
      // One action returns everything this page shows: the listing, the four
      // counters, recommendations, the activity feed and the notifications.
      // Two actions would not overlap — Next runs Server Action calls one at a
      // time per client — so the second call cost a whole round trip.
      const result = await getMatrimonyDashboard();

      if (!result.ok) {
        // A failed load must NOT fall through to the "create your profile"
        // onboarding: a member who already has a listing would read that as
        // their profile having been deleted.
        setLoadError(result.error);
        console.error('Error fetching matrimony data:', result.error);
        setLoading(false);
        return;
      }

      const data = result.data;

      if (data) {
        setNotifications(data.notifications);
        setProfile(data.profile);
        setInterestsReceived(data.counts.interestsReceived);
        setInterestsSent(data.counts.interestsSent);
        setProfileViews(data.counts.profileViews);
        setShortlistedBy(data.counts.shortlistedBy);
        setRecommendations(data.recommendations);

        const activities: typeof recentActivity = [];

        for (const i of data.recentInterests as Array<Record<string, string>>) {
          const sentByMe = i.sender_profile_id === data.profile.id;
          activities.push({
            type: sentByMe ? 'interest_sent' : 'interest_received',
            text: sentByMe ? 'You sent an interest' : 'You received an interest',
            time: i.created_at,
            icon: sentByMe ? Send : Inbox,
          });
        }

        for (const v of data.recentViews as Array<Record<string, string>>) {
          activities.push({
            type: 'view',
            text: 'Someone viewed your profile',
            time: v.created_at,
            icon: Eye,
          });
        }

        activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        setRecentActivity(activities.slice(0, 8));
      }

      setLoading(false);
    }
    fetchData();
  }, [currentUserId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // Read state is only ever changed by this explicit click: opening the
  // dashboard should not silently clear the notifications a member has not seen.
  async function handleMarkRead(id: string) {
    if (notifBusyId) return;
    setNotifBusyId(id);
    setNotifError(null);

    const result = await markNotificationRead(id);
    if (result.ok) {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setToast('Marked as read');
    } else {
      setNotifError(result.error);
    }

    setNotifBusyId(null);
  }

  function formatTimeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  }

  function getDisplayName(name: string, pref?: string) {
    if (!name) return 'Member';
    if (pref === 'first_name') return name.split(' ')[0];
    if (pref === 'initials') return name.split(' ').map(w => w[0]).join('').toUpperCase();
    return name;
  }

  function calculateAge(dob: string) {
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  }

  // Loading state
  if (loading) {
    return (
      <div className="pp2">
        <PortalLoading label="Loading your matrimony hub" />
      </div>
    );
  }

  // Failed load: say so and offer a retry. Distinct from "no profile yet".
  if (loadError && !profile) {
    return (
      <div className="pp2" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <AlertCircle size={28} aria-hidden="true" style={{ opacity: 0.35, marginBottom: 12 }} />
        <p role="alert" className="community-error" style={{ textAlign: 'center', marginBottom: 18 }}>
          {loadError}
        </p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    );
  }

  // ---- No profile yet: the onboarding hub ----
  if (!profile) {
    return (
      <div className="pp2">
        <header className="pp-hero">
          <span
            aria-hidden="true"
            style={{
              display: 'grid', placeItems: 'center', width: '4rem', height: '4rem',
              margin: '0 auto 0.9rem', borderRadius: '50%',
              background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.18)',
            }}
          >
            <Heart size={26} style={{ color: 'var(--lime-300)' }} />
          </span>
          <h1>Matrimony</h1>
          <p>Find a life partner inside a circle the club has already checked.</p>
          <div className="pp-hero-chips">
            <span className="pp-chip pp-chip-light"><ShieldCheck size={12} aria-hidden="true" /> Admin reviewed</span>
            <span className="pp-chip pp-chip-light"><Lock size={12} aria-hidden="true" /> Private by default</span>
          </div>
        </header>

        <Link
          href="/portal/member/matrimony/create"
          className="btn btn-primary"
          style={{ width: '100%', minHeight: 52, justifyContent: 'center', textDecoration: 'none', marginBottom: '1.4rem' }}
        >
          <Plus size={18} aria-hidden="true" /> Create your profile
        </Link>

        <div className="pp-groups">
          <section className="pp-group">
            <h2>How it works</h2>
            <p className="pp-group-sub">
              You stay in control of what other members see, at every step.
            </p>
            <div className="pp-group-card">
              <div className="pp-row pp-row-static">
                <span className="pp-row-icon"><ShieldCheck size={17} /></span>
                <span className="pp-row-body">
                  <small>Step one</small>
                  <strong>Our team reviews every profile</strong>
                </span>
              </div>
              <div className="pp-row pp-row-static">
                <span className="pp-row-icon"><Eye size={17} /></span>
                <span className="pp-row-body">
                  <small>Your privacy</small>
                  <strong>Contact details are never shared</strong>
                </span>
              </div>
              <div className="pp-row pp-row-static">
                <span className="pp-row-icon"><HeartHandshake size={17} /></span>
                <span className="pp-row-body">
                  <small>Matching</small>
                  <strong>Ranked on the preferences you set</strong>
                </span>
              </div>
            </div>
          </section>

          <section className="pp-group">
            <div className="pp-group-card">
              <Link href="/matrimony" className="pp-row">
                <span className="pp-row-icon"><Heart size={17} /></span>
                <span className="pp-row-body">
                  <small>Not sure yet?</small>
                  <strong>Read about the matrimony service</strong>
                </span>
                <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
              </Link>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // ---- Has a profile: the hub ----
  const status = STATUS[profile.status] || STATUS.draft;
  const StatusIcon = status.icon;
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const initials = profile.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'PC';
  const pct = profile.completeness_pct;

  /** One counter row. Interests have a page; views and shortlists do not. */
  const counterRow = (icon: React.ReactNode, label: string, value: number, unit: string, href?: string) => {
    const body = (
      <>
        <span className="pp-row-icon">{icon}</span>
        <span className="pp-row-body">
          <small>{label}</small>
          <strong>{value === 0 ? `No ${unit} yet` : `${value} ${value === 1 ? unit : `${unit}s`}`}</strong>
        </span>
        {href && <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />}
      </>
    );
    return href
      ? <Link key={label} href={href} className="pp-row">{body}</Link>
      : <div key={label} className="pp-row pp-row-static">{body}</div>;
  };

  /** One navigation row. */
  const navRow = (icon: React.ReactNode, label: string, value: string, href: string) => (
    <Link key={href + label} href={href} className="pp-row">
      <span className="pp-row-icon">{icon}</span>
      <span className="pp-row-body">
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
      <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
    </Link>
  );

  return (
    <div className="pp2">
      {/* ---- Identity header ---- */}
      <header className="pp-hero">
        <div className="pp-ring" aria-hidden="true">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" className="pp-ring-track" />
            <circle
              cx="50" cy="50" r="44" className="pp-ring-fill"
              strokeDasharray={`${(pct / 100) * RING_C} ${RING_C}`}
            />
          </svg>
          <div className="pp-avatar">{initials}</div>
          <span className="pp-ring-pct">{pct}%</span>
        </div>
        <h1>{profile.full_name}</h1>
        <p>{calculateAge(profile.dob)} · {[profile.city, profile.province].filter(Boolean).join(', ')}</p>
        <div className="pp-hero-chips">
          <span className="pp-chip pp-chip-light">
            <StatusIcon size={12} aria-hidden="true" /> {status.label}
          </span>
          {profile.is_verified_id && (
            <span className="pp-chip pp-chip-light"><BadgeCheck size={12} aria-hidden="true" /> ID verified</span>
          )}
        </div>
      </header>

      {/* ---- Finish-your-profile nudge ---- */}
      {pct < 100 && (
        <div className="pp-nudges">
          <Link href="/portal/member/matrimony/edit" className="pp-nudge">
            <Plus size={13} aria-hidden="true" /> Complete your profile
          </Link>
        </div>
      )}

      <div className="pp-groups">
        {/* ---- Something to fix ---- */}
        {status.fix && (
          <section className="pp-group">
            <h2>Needs your attention</h2>
            <div className="pp-group-card">
              <Link href="/portal/member/matrimony/edit" className="pp-row pp-row-add">
                <span className="pp-row-icon"><FileEdit size={17} /></span>
                <span className="pp-row-body">
                  <small>{status.label}</small>
                  <strong>{profile.rejection_reason || status.fix}</strong>
                </span>
                <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
              </Link>
            </div>
          </section>
        )}

        {/* ---- Counters ---- */}
        <section className="pp-group">
          <h2>Your activity</h2>
          <div className="pp-group-card">
            {counterRow(<Inbox size={17} />, 'Interests received', interestsReceived, 'interest', '/portal/member/matrimony/interests')}
            {counterRow(<Send size={17} />, 'Interests sent', interestsSent, 'interest', '/portal/member/matrimony/interests')}
            {counterRow(<Eye size={17} />, 'Profile views', profileViews, 'view')}
            {counterRow(<Bookmark size={17} />, 'Shortlisted by', shortlistedBy, 'member')}
          </div>
        </section>

        {/* ---- Recommendations: the one photo-led block ---- */}
        <section className="hf-section">
          <div className="hf-section-head">
            <h2>Recommended for you</h2>
            <Link href="/portal/member/matrimony/browse">Browse all <ArrowRight size={14} aria-hidden="true" /></Link>
          </div>
          {recommendations.length === 0 ? (
            <div className="pp-group-card" style={{ padding: '2.2rem 1.2rem', textAlign: 'center' }}>
              <Search size={28} aria-hidden="true" style={{ opacity: 0.35, marginBottom: 10 }} />
              <p style={{ margin: '0 0 14px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                {profile.status === 'approved'
                  ? 'Nothing to recommend just yet — new listings appear here as they are approved.'
                  : 'Recommendations start once our team approves your profile.'}
              </p>
              <Link href="/portal/member/matrimony/browse" className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>
                Browse profiles
              </Link>
            </div>
          ) : (
            <div className="hf-events">
              {recommendations.map((rec) => {
                const photo = rec.primary_photo_url;
                const open = rec.photo_visibility === 'all' && photo;
                const blurred = rec.photo_visibility === 'blurred' && photo;
                return (
                  <Link key={rec.id} href={`/portal/member/matrimony/profile/${rec.id}`} className="hf-event card">
                    <span className="hf-event-media">
                      {open || blurred ? (
                        <img
                          src={photo} alt="" aria-hidden="true"
                          style={blurred ? { filter: 'blur(18px)', transform: 'scale(1.12)' } : undefined}
                        />
                      ) : (
                        <span className="hf-event-fallback" aria-hidden="true"><User size={28} /></span>
                      )}
                      <span className="hf-chip">{calculateAge(rec.dob)} · {rec.city}</span>
                      {rec.is_verified_id && (
                        <span
                          role="img" aria-label="ID verified"
                          style={{
                            position: 'absolute', top: '0.7rem', right: '0.7rem',
                            display: 'grid', placeItems: 'center', width: 26, height: 26,
                            borderRadius: '50%', background: 'rgba(255,255,255,0.94)', color: 'var(--green-800)',
                          }}
                        >
                          <BadgeCheck size={14} />
                        </span>
                      )}
                    </span>
                    <span className="hf-event-body">
                      <strong>{getDisplayName(rec.full_name, rec.display_pref)}</strong>
                      <small>
                        <Briefcase size={12} aria-hidden="true" />
                        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {rec.occupation || 'Not stated'}
                        </span>
                      </small>
                      <small>
                        <MapPin size={12} aria-hidden="true" />
                        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {[rec.city, rec.province].filter(Boolean).join(', ')}
                        </span>
                      </small>
                      <span className="hf-join">View profile</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* ---- Where to go next ---- */}
        <section className="pp-group">
          <h2>Discover</h2>
          <div className="pp-group-card">
            {navRow(<Search size={17} />, 'Browse', 'Everyone you can see', '/portal/member/matrimony/browse')}
            {navRow(<HeartHandshake size={17} />, 'Matches', 'Scored on your preferences', '/portal/member/matrimony/matches')}
            {navRow(<Bookmark size={17} />, 'Shortlist', 'Profiles you saved', '/portal/member/matrimony/shortlist')}
            {navRow(<Heart size={17} />, 'Interests', 'Sent and received', '/portal/member/matrimony/interests')}
            {navRow(<MessageCircle size={17} />, 'Messages', 'Your conversations', '/portal/member/matrimony/messages')}
          </div>
        </section>

        <section className="pp-group">
          <h2>Your profile</h2>
          <div className="pp-group-card">
            {navRow(<User size={17} />, 'My listing', 'See it as others do', '/portal/member/matrimony/profile')}
            {navRow(<FileEdit size={17} />, 'Edit', 'Details and partner preferences', '/portal/member/matrimony/edit')}
            {navRow(<Settings size={17} />, 'Settings', 'Visibility and photo access', '/portal/member/matrimony/settings')}
          </div>
        </section>

        {/* ---- Notifications ---- */}
        <section className="pp-group">
          <h2>Notifications</h2>
          <p className="pp-group-sub">
            {unreadCount > 0
              ? `${unreadCount} unread. Interests, messages and review decisions land here.`
              : 'Interests, messages and review decisions land here.'}
          </p>
          {notifError && (
            <div role="alert" className="community-error" style={{ marginBottom: 8 }}>
              <AlertCircle size={15} aria-hidden="true" /> {notifError}
            </div>
          )}
          <div className="pp-group-card" style={{ maxHeight: 420, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div className="pp-row pp-row-static">
                <span className="pp-row-icon"><Bell size={17} /></span>
                <span className="pp-row-body"><strong style={{ color: 'var(--text-secondary)' }}>Nothing yet</strong></span>
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="pp-row pp-row-static">
                  <span
                    className="pp-row-icon"
                    style={n.is_read ? undefined : { background: 'rgba(232,93,4,0.09)', color: 'var(--primary-700)' }}
                  >
                    <Bell size={17} />
                  </span>
                  <span className="pp-row-body">
                    <strong>{n.title}</strong>
                    <small>{[n.body, formatTimeAgo(n.created_at)].filter(Boolean).join(' · ')}</small>
                  </span>
                  {n.link && (
                    <Link
                      href={n.link} className="pp-row-x" aria-label={`Open: ${n.title}`}
                      style={{ width: '2.75rem', height: '2.75rem' }}
                    >
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  )}
                  {!n.is_read && (
                    <button
                      type="button" className="pp-row-x"
                      style={{ width: '2.75rem', height: '2.75rem' }}
                      onClick={() => handleMarkRead(n.id)}
                      disabled={notifBusyId !== null}
                      aria-label={`Mark as read: ${n.title}`}
                    >
                      <Check size={16} aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* ---- Recent activity ---- */}
        <section className="pp-group">
          <h2>Recent activity</h2>
          <div className="pp-group-card">
            {recentActivity.length === 0 ? (
              <div className="pp-row pp-row-static">
                <span className="pp-row-icon"><Clock size={17} /></span>
                <span className="pp-row-body"><strong style={{ color: 'var(--text-secondary)' }}>Nothing yet</strong></span>
              </div>
            ) : (
              recentActivity.map((act, idx) => {
                const Icon = act.icon;
                return (
                  <div key={`${act.type}-${act.time}-${idx}`} className="pp-row pp-row-static">
                    <span className="pp-row-icon"><Icon size={17} /></span>
                    <span className="pp-row-body">
                      <strong>{act.text}</strong>
                      <small>{formatTimeAgo(act.time)}</small>
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {toast && (
        <div className="pp-toast" role="status">
          <Check size={15} aria-hidden="true" /> {toast}
        </div>
      )}
    </div>
  );
}
