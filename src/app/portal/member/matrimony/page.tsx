'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/app-context';
import { getMatrimonyDashboard, markNotificationRead } from '@/app/actions/matrimony';
import type { MatrimonyProfile, MatrimonyProfileCard, MatrimonyInterest, MatrimonyShortlist, MatrimonyProfileView, InAppNotification } from '@/types/matrimony';
import {
  Heart, User, Search, Star, MessageCircle, Settings, ArrowRight,
  Eye, Send, Inbox, UserCheck, ShieldCheck, AlertCircle, Clock,
  CheckCircle2, XCircle, PauseCircle, FileEdit, Plus, TrendingUp,
  Bookmark, Users, Activity, ChevronRight, Sparkles, Bell, BarChart3,
  CircleDot, HeartHandshake, UserPlus
} from 'lucide-react';

// The dashboard is the "My Profile" stop on this nav; every other entry is a
// real route of its own.
const navTabs: { href: string; label: string; icon: React.ElementType }[] = [
  { href: '/portal/member/matrimony', label: 'My Profile', icon: User },
  { href: '/portal/member/matrimony/browse', label: 'Browse', icon: Search },
  { href: '/portal/member/matrimony/matches', label: 'Matches', icon: HeartHandshake },
  { href: '/portal/member/matrimony/interests', label: 'Interests', icon: Heart },
  { href: '/portal/member/matrimony/shortlist', label: 'Shortlist', icon: Bookmark },
  { href: '/portal/member/matrimony/messages', label: 'Messages', icon: MessageCircle },
  { href: '/portal/member/matrimony/settings', label: 'Settings', icon: Settings },
];

const statusConfig: Record<string, { color: string; bg: string; icon: React.ElementType; label: string }> = {
  draft: { color: 'var(--text-secondary)', bg: 'rgba(100,116,139,0.1)', icon: FileEdit, label: 'Draft' },
  pending: { color: '#92400e', bg: 'rgba(245,158,11,0.1)', icon: Clock, label: 'Pending Review' },
  approved: { color: '#04724d', bg: 'rgba(0,168,107,0.1)', icon: CheckCircle2, label: 'Approved & Live' },
  rejected: { color: 'var(--error-600)', bg: 'rgba(240,73,35,0.1)', icon: XCircle, label: 'Rejected' },
  changes_requested: { color: 'var(--accent-700)', bg: 'rgba(217,119,6,0.1)', icon: AlertCircle, label: 'Changes Requested' },
  suspended: { color: 'var(--error-600)', bg: 'rgba(220,38,38,0.1)', icon: PauseCircle, label: 'Suspended' },
};

export default function MemberMatrimonyDashboard() {
  const { currentUserId, isAuthenticated } = useApp();

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

  // Read state is only ever changed by this explicit click: opening the
  // dashboard should not silently clear the notifications a member has not seen.
  async function handleMarkRead(id: string) {
    if (notifBusyId) return;
    setNotifBusyId(id);
    setNotifError(null);

    const result = await markNotificationRead(id);
    if (result.ok) {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
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
      <div className="flex flex-col gap-8 animate-fade-in" style={{ padding: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
          <div style={{
            width: 48, height: 48, border: '3px solid var(--border-color)',
            borderTopColor: 'var(--primary-600)', borderRadius: '50%', animation: 'spin 1s linear infinite',
          }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading your matrimony dashboard...</p>
        </div>
      </div>
    );
  }

  // Failed load: say so and offer a retry. Distinct from "no profile yet".
  if (loadError && !profile) {
    return (
      <div className="flex flex-col gap-8 animate-fade-in">
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <AlertCircle size={40} style={{ color: 'var(--error-600)', margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 8 }}>Could not load your matrimony dashboard</h2>
          <p role="alert" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>{loadError}</p>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  // No profile state
  if (!profile) {
    return (
      <div className="flex flex-col gap-8 animate-fade-in">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 8 }}>
            Matrimony
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Find your life partner through our trusted, admin-verified platform.</p>
        </div>

        {/* Create Profile CTA */}
        <div style={{
          background: 'linear-gradient(145deg, var(--gray-900), var(--gray-700))',
          borderRadius: 24, padding: 48, textAlign: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '-30%', right: '-10%', width: 300, height: 300,
            borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,191,0,0.1), transparent 70%)',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: 'rgba(255,191,0,0.15)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
            }}>
              <Heart size={36} style={{ color: 'var(--accent-400)' }} />
            </div>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: '1.5rem',
              fontWeight: 800, color: 'white', marginBottom: 12,
            }}>
              Create Your Matrimony Profile
            </h2>
            <p style={{
              color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem',
              maxWidth: 500, margin: '0 auto 32px', lineHeight: 1.7,
            }}>
              Get started by creating a detailed profile. Our admin team will review and verify it,
              then you can browse and connect with other verified profiles.
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/portal/member/matrimony/create" className="btn btn-lg" style={{
                background: 'linear-gradient(135deg, var(--accent-400), #ffc424)', color: 'var(--text-primary)',
                fontWeight: 700, padding: '14px 32px', borderRadius: 14,
                boxShadow: '0 8px 30px rgba(255,191,0,0.3)', border: 'none', textDecoration: 'none',
              }}>
                <Plus size={20} /> Create Profile
              </Link>
              <Link href="/matrimony" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 28px', borderRadius: 14,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                color: 'white', fontWeight: 600, textDecoration: 'none', fontSize: '0.95rem',
              }}>
                Learn More <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>

        {/* Info cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {[
            { icon: ShieldCheck, title: 'Admin Verified', desc: 'Every profile is manually reviewed for authenticity.', color: 'var(--text-accent)' },
            { icon: Eye, title: 'Privacy First', desc: 'Your contact info is never shared without your consent.', color: '#04724d' },
            { icon: HeartHandshake, title: 'Meaningful Matches', desc: 'Smart matching based on preferences, values, and lifestyle.', color: 'var(--accent-400)' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="card" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: `${item.color}18`, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={22} style={{ color: item.color }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 4 }}>{item.title}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ═══════ HAS PROFILE — Full Dashboard ═══════
  const status = statusConfig[profile.status] || statusConfig.draft;
  const StatusIcon = status.icon;
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Interests have a page of their own. Nothing lists who viewed or shortlisted
  // you, so those two are counters rather than links to a route that does not
  // exist.
  const statCards: { label: string; value: number; icon: React.ElementType; color: string; link?: string }[] = [
    { label: 'Interests Received', value: interestsReceived, icon: Inbox, color: 'var(--error-600)', link: '/portal/member/matrimony/interests' },
    { label: 'Interests Sent', value: interestsSent, icon: Send, color: 'var(--text-accent)', link: '/portal/member/matrimony/interests' },
    { label: 'Profile Views', value: profileViews, icon: Eye, color: '#04724d' },
    { label: 'Shortlisted By', value: shortlistedBy, icon: Bookmark, color: 'var(--accent-400)' },
  ];

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 4 }}>
            Matrimony Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Manage your profile, browse matches, and track interests.
          </p>
        </div>
        <Link href="/portal/member/matrimony/profile" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          <User size={16} /> View My Profile
        </Link>
      </div>

      {/* Status Banner */}
      <div style={{
        background: status.bg, border: `1px solid ${status.color}30`,
        borderRadius: 16, padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <StatusIcon size={22} style={{ color: status.color }} />
          <div>
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Profile Status: </span>
            <span style={{ color: status.color, fontWeight: 700 }}>{status.label}</span>
          </div>
        </div>
        {profile.status === 'rejected' && profile.rejection_reason && (
          <div style={{ fontSize: '0.8rem', color: 'var(--error-600)' }}>
            Reason: {profile.rejection_reason}
          </div>
        )}
        {profile.status === 'changes_requested' && (
          <Link href="/portal/member/matrimony/edit" className="btn btn-sm btn-outline" style={{ textDecoration: 'none' }}>
            <FileEdit size={14} /> Edit Profile
          </Link>
        )}
      </div>

      {/* Profile Completeness */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={18} style={{ color: 'var(--text-accent)' }} />
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Profile Completeness</span>
          </div>
          <span style={{
            fontWeight: 800, fontSize: '1rem',
            color: profile.completeness_pct >= 80 ? 'var(--success-500)' : profile.completeness_pct >= 50 ? 'var(--warning-500)' : 'var(--error-500)',
          }}>
            {profile.completeness_pct}%
          </span>
        </div>
        <div style={{
          height: 8, borderRadius: 999, background: 'var(--bg-secondary)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 999,
            width: `${profile.completeness_pct}%`,
            background: profile.completeness_pct >= 80
              ? 'linear-gradient(90deg, var(--success-500), var(--success-400))'
              : profile.completeness_pct >= 50
                ? 'linear-gradient(90deg, var(--warning-500), #fbbf24)'
                : 'linear-gradient(90deg, var(--error-500), var(--error-400))',
            transition: 'width 0.6s ease',
          }} />
        </div>
        {profile.completeness_pct < 100 && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
            Complete your profile to improve your visibility and match quality.{' '}
            <Link href="/portal/member/matrimony/edit" style={{ color: 'var(--text-accent)', fontWeight: 600 }}>
              Complete Now →
            </Link>
          </p>
        )}
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex', gap: 4, overflowX: 'auto',
        background: 'var(--bg-secondary)', borderRadius: 14, padding: 4,
        border: '1px solid var(--border-color)',
      }}>
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          // This page is the "My Profile" stop; every other entry navigates to
          // its real route instead of driving a local tab state that only ever
          // rendered "go to the real page" placeholder cards.
          const isActive = tab.href === '/portal/member/matrimony';
          return (
            <Link key={tab.href} href={tab.href} aria-current={isActive ? 'page' : undefined} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 16px', borderRadius: 10,
              background: isActive ? 'white' : 'transparent',
              boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              color: isActive ? 'var(--text-accent)' : 'var(--text-muted)',
              fontWeight: isActive ? 700 : 500, fontSize: '0.8rem',
              textDecoration: 'none', whiteSpace: 'nowrap', transition: 'all 0.15s',
            }}>
              <Icon size={16} />
              {tab.label}
            </Link>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {statCards.map((stat) => {
              const Icon = stat.icon;
              const card = (
                <div className="card-stat" style={stat.link ? { cursor: 'pointer', transition: 'transform 0.2s' } : undefined}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: `${stat.color}14`, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={20} style={{ color: stat.color }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {stat.value}
                      </div>
                      <div style={{
                        fontSize: '0.7rem', color: 'var(--text-muted)',
                        fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}>
                        {stat.label}
                      </div>
                    </div>
                  </div>
                </div>
              );

              return stat.link
                ? <Link key={stat.label} href={stat.link} style={{ textDecoration: 'none' }}>{card}</Link>
                : <div key={stat.label}>{card}</div>;
            })}
          </div>

          {/* Two column: Recommendations + Activity */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24, alignItems: 'start' }}>
            {/* Recommendations */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{
                padding: '20px 24px', borderBottom: '1px solid var(--border-color)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={18} style={{ color: 'var(--accent-400)' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Recommended for You</span>
                </div>
                <Link href="/portal/member/matrimony/browse" style={{
                  fontSize: '0.8rem', color: 'var(--text-accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  Browse All <ChevronRight size={14} />
                </Link>
              </div>

              {recommendations.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                  <Users size={40} style={{ color: 'var(--text-muted)', marginBottom: 12, opacity: 0.4 }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {profile.status === 'approved'
                      ? 'No recommendations yet.'
                      : 'Recommendations will appear once your profile is approved.'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {recommendations.map((rec, idx) => (
                    <Link key={rec.id} href={`/portal/member/matrimony/profile/${rec.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div style={{
                        padding: '16px 24px',
                        borderBottom: idx < recommendations.length - 1 ? '1px solid var(--border-color)' : 'none',
                        display: 'flex', alignItems: 'center', gap: 16,
                        transition: 'background 0.15s', cursor: 'pointer',
                      }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* Avatar placeholder */}
                        <div style={{
                          width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                          background: rec.gender?.toLowerCase() === 'female' ? 'linear-gradient(135deg, rgba(217,119,6,0.13), rgba(251,191,36,0.06))' : 'linear-gradient(135deg, rgba(232,93,4,0.13), rgba(249,115,22,0.06))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <User size={22} style={{ color: rec.gender?.toLowerCase() === 'female' ? 'var(--accent-600)' : 'var(--primary-600)' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                              {getDisplayName(rec.full_name, rec.display_pref)}
                            </span>
                            {rec.is_verified_id && <UserCheck size={14} style={{ color: 'var(--text-accent)' }} />}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {calculateAge(rec.dob)} yrs • {rec.city}, {rec.province} • {rec.occupation}
                          </div>
                        </div>
                        <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{
                padding: '20px 24px', borderBottom: '1px solid var(--border-color)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Activity size={18} style={{ color: '#04724d' }} />
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Recent Activity</span>
              </div>

              {recentActivity.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                  <Bell size={36} style={{ color: 'var(--text-muted)', marginBottom: 12, opacity: 0.4 }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No recent activity yet.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {recentActivity.map((act, idx) => {
                    const Icon = act.icon;
                    return (
                      <div key={idx} style={{
                        padding: '14px 24px',
                        borderBottom: idx < recentActivity.length - 1 ? '1px solid var(--border-color)' : 'none',
                        display: 'flex', alignItems: 'center', gap: 12,
                      }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                          background: act.type === 'interest_received' ? 'rgba(240,73,35,0.1)' : act.type === 'interest_sent' ? 'rgba(232, 93, 4, 0.1)' : 'rgba(0,168,107,0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Icon size={16} style={{
                            color: act.type === 'interest_received' ? 'var(--error-500)' : act.type === 'interest_sent' ? 'var(--primary-600)' : 'var(--success-500)',
                          }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                            {act.text}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {formatTimeAgo(act.time)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Notifications */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid var(--border-color)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={18} style={{ color: 'var(--text-accent)' }} />
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Notifications</span>
              </div>
              {unreadCount > 0 && (
                <span className="badge badge-primary">{unreadCount} unread</span>
              )}
            </div>

            {notifError && (
              <p role="alert" className="community-error" style={{ margin: '16px 24px 0' }}>{notifError}</p>
            )}

            {notifications.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <Bell size={36} style={{ color: 'var(--text-muted)', marginBottom: 12, opacity: 0.4 }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  You have no notifications. Interests, messages and review decisions will appear here.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 340, overflowY: 'auto' }}>
                {notifications.map((n, idx) => (
                  <div key={n.id} style={{
                    padding: '14px 24px',
                    borderBottom: idx < notifications.length - 1 ? '1px solid var(--border-color)' : 'none',
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    background: n.is_read ? 'transparent' : 'rgba(232, 93, 4, 0.04)',
                  }}>
                    <CircleDot size={14} style={{
                      marginTop: 4, flexShrink: 0,
                      color: n.is_read ? 'var(--text-muted)' : 'var(--primary-600)',
                      opacity: n.is_read ? 0.4 : 1,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: n.is_read ? 500 : 700 }}>{n.title}</div>
                      {n.body && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.5 }}>
                          {n.body}
                        </div>
                      )}
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        {formatTimeAgo(n.created_at)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {n.link && (
                        <Link href={n.link} className="btn btn-sm btn-ghost" style={{ textDecoration: 'none', fontSize: '0.72rem' }}>
                          Open
                        </Link>
                      )}
                      {!n.is_read && (
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => handleMarkRead(n.id)}
                          disabled={notifBusyId !== null}
                          style={{ fontSize: '0.72rem' }}
                        >
                          {notifBusyId === n.id ? 'Saving...' : 'Mark read'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { href: '/portal/member/matrimony/browse', icon: Search, label: 'Browse Profiles', desc: 'Find compatible matches', color: 'var(--text-accent)' },
              // Partner preferences are the last step of the profile wizard, which
              // /edit reuses. There is no separate preferences route.
              { href: '/portal/member/matrimony/edit', icon: FileEdit, label: 'Edit Profile', desc: 'Update your details and partner preferences', color: '#04724d' },
              { href: '/portal/member/matrimony/matches', icon: HeartHandshake, label: 'My Matches', desc: 'Profiles scored against your preferences', color: 'var(--accent-400)' },
              { href: '/portal/member/matrimony/shortlist', icon: Bookmark, label: 'My Shortlist', desc: 'View saved profiles', color: 'var(--primary-700)' },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.label} href={action.href} style={{ textDecoration: 'none' }}>
                  <div className="card card-clickable" style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: 20,
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: `${action.color}14`, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={20} style={{ color: action.color }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{action.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{action.desc}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      
    </div>
  );
}
