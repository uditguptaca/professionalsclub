'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/app-context';
import { createClient } from '@/utils/supabase/client';
import type { MatrimonyProfile, MatrimonyProfileCard, MatrimonyInterest, MatrimonyShortlist, MatrimonyProfileView } from '@/types/matrimony';
import {
  Heart, User, Search, Star, MessageCircle, Settings, ArrowRight,
  Eye, Send, Inbox, UserCheck, ShieldCheck, AlertCircle, Clock,
  CheckCircle2, XCircle, PauseCircle, FileEdit, Plus, TrendingUp,
  Bookmark, Users, Activity, ChevronRight, Sparkles, Bell, BarChart3,
  CircleDot, HeartHandshake, UserPlus
} from 'lucide-react';

type DashboardTab = 'overview' | 'browse' | 'matches' | 'interests' | 'shortlist' | 'messages' | 'settings';

const navTabs: { key: DashboardTab; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'My Profile', icon: User },
  { key: 'browse', label: 'Browse', icon: Search },
  { key: 'matches', label: 'Matches', icon: HeartHandshake },
  { key: 'interests', label: 'Interests', icon: Heart },
  { key: 'shortlist', label: 'Shortlist', icon: Bookmark },
  { key: 'messages', label: 'Messages', icon: MessageCircle },
  { key: 'settings', label: 'Settings', icon: Settings },
];

const statusConfig: Record<string, { color: string; bg: string; icon: React.ElementType; label: string }> = {
  draft: { color: 'var(--text-secondary)', bg: 'rgba(100,116,139,0.1)', icon: FileEdit, label: 'Draft' },
  pending: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: Clock, label: 'Pending Review' },
  approved: { color: '#00A86B', bg: 'rgba(0,168,107,0.1)', icon: CheckCircle2, label: 'Approved & Live' },
  rejected: { color: '#F04923', bg: 'rgba(240,73,35,0.1)', icon: XCircle, label: 'Rejected' },
  changes_requested: { color: '#d97706', bg: 'rgba(217,119,6,0.1)', icon: AlertCircle, label: 'Changes Requested' },
  suspended: { color: '#dc2626', bg: 'rgba(220,38,38,0.1)', icon: PauseCircle, label: 'Suspended' },
};

export default function MemberMatrimonyDashboard() {
  const { currentUserId, isAuthenticated } = useApp();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [profile, setProfile] = useState<MatrimonyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [interestsReceived, setInterestsReceived] = useState(0);
  const [interestsSent, setInterestsSent] = useState(0);
  const [profileViews, setProfileViews] = useState(0);
  const [shortlistedBy, setShortlistedBy] = useState(0);
  const [recommendations, setRecommendations] = useState<MatrimonyProfileCard[]>([]);
  const [recentActivity, setRecentActivity] = useState<{ type: string; text: string; time: string; icon: React.ElementType }[]>([]);

  useEffect(() => {
    async function fetchData() {
      if (!currentUserId) { setLoading(false); return; }
      setLoading(true);
      try {
        // Fetch profile
        const { data: profileData } = await supabase
          .from('matrimony_profiles')
          .select('*')
          .eq('user_id', currentUserId)
          .single();

        if (profileData) {
          setProfile(profileData as MatrimonyProfile);

          // Fetch stats
          const [intRecv, intSent, views, shortBy] = await Promise.all([
            supabase.from('matrimony_interests').select('id', { count: 'exact', head: true }).eq('receiver_profile_id', profileData.id),
            supabase.from('matrimony_interests').select('id', { count: 'exact', head: true }).eq('sender_profile_id', profileData.id),
            supabase.from('matrimony_profile_views').select('id', { count: 'exact', head: true }).eq('viewed_profile_id', profileData.id),
            supabase.from('matrimony_shortlists').select('id', { count: 'exact', head: true }).eq('target_profile_id', profileData.id),
          ]);

          setInterestsReceived(intRecv.count ?? 0);
          setInterestsSent(intSent.count ?? 0);
          setProfileViews(views.count ?? 0);
          setShortlistedBy(shortBy.count ?? 0);

          // Fetch recommendations (other approved profiles, opposite gender)
          const { data: recData } = await supabase
            .from('matrimony_profiles')
            .select('id, user_id, full_name, display_pref, gender, dob, height_cm, city, province, country, religion, mother_tongue, occupation, qualification, residency_status, diet, marital_status, is_verified_id, is_verified_photo, is_verified_profession, photo_visibility, last_active_at, about_me, completeness_pct, status')
            .eq('status', 'approved')
            .neq('user_id', currentUserId)
            .neq('gender', profileData.gender)
            .limit(4);

          if (recData) setRecommendations(recData as MatrimonyProfileCard[]);

          // Build recent activity from interests/views
          const { data: recentInterests } = await supabase
            .from('matrimony_interests')
            .select('id, status, created_at, sender_profile_id, receiver_profile_id')
            .or(`sender_profile_id.eq.${profileData.id},receiver_profile_id.eq.${profileData.id}`)
            .order('created_at', { ascending: false })
            .limit(5);

          const activities: typeof recentActivity = [];
          if (recentInterests) {
            recentInterests.forEach((i: { sender_profile_id: string; receiver_profile_id: string; status: string; created_at: string }) => {
              if (i.sender_profile_id === profileData.id) {
                activities.push({
                  type: 'interest_sent',
                  text: `You sent an interest`,
                  time: i.created_at,
                  icon: Send,
                });
              } else {
                activities.push({
                  type: 'interest_received',
                  text: `You received an interest`,
                  time: i.created_at,
                  icon: Inbox,
                });
              }
            });
          }

          const { data: recentViews } = await supabase
            .from('matrimony_profile_views')
            .select('id, created_at')
            .eq('viewed_profile_id', profileData.id)
            .order('created_at', { ascending: false })
            .limit(3);

          if (recentViews) {
            recentViews.forEach((v: { created_at: string }) => {
              activities.push({
                type: 'view',
                text: 'Someone viewed your profile',
                time: v.created_at,
                icon: Eye,
              });
            });
          }

          activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
          setRecentActivity(activities.slice(0, 8));
        }
      } catch (err) {
        console.error('Error fetching matrimony data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [currentUserId]);

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
            borderTopColor: '#0067A5', borderRadius: '50%', animation: 'spin 1s linear infinite',
          }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading your matrimony dashboard...</p>
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
          background: 'linear-gradient(145deg, #0f172a, #1e293b)',
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
              <Heart size={36} style={{ color: '#FFBF00' }} />
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
                background: 'linear-gradient(135deg, #FFBF00, #ffc424)', color: 'var(--text-primary)',
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
            { icon: ShieldCheck, title: 'Admin Verified', desc: 'Every profile is manually reviewed for authenticity.', color: '#0067A5' },
            { icon: Eye, title: 'Privacy First', desc: 'Your contact info is never shared without your consent.', color: '#00A86B' },
            { icon: HeartHandshake, title: 'Meaningful Matches', desc: 'Smart matching based on preferences, values, and lifestyle.', color: '#FFBF00' },
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
          <div style={{ fontSize: '0.8rem', color: '#F04923' }}>
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
            <BarChart3 size={18} style={{ color: '#0067A5' }} />
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Profile Completeness</span>
          </div>
          <span style={{
            fontWeight: 800, fontSize: '1rem',
            color: profile.completeness_pct >= 80 ? '#00A86B' : profile.completeness_pct >= 50 ? '#f59e0b' : '#F04923',
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
              ? 'linear-gradient(90deg, #00A86B, #34d399)'
              : profile.completeness_pct >= 50
                ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                : 'linear-gradient(90deg, #F04923, #f87171)',
            transition: 'width 0.6s ease',
          }} />
        </div>
        {profile.completeness_pct < 100 && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
            Complete your profile to improve your visibility and match quality.{' '}
            <Link href="/portal/member/matrimony/edit" style={{ color: '#0067A5', fontWeight: 600 }}>
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
          const isActive = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 16px', borderRadius: 10, border: 'none',
              background: isActive ? 'white' : 'transparent',
              boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              color: isActive ? '#0067A5' : 'var(--text-muted)',
              fontWeight: isActive ? 700 : 500, fontSize: '0.8rem',
              cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
            }}>
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ═══════ TAB: Overview ═══════ */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { label: 'Interests Received', value: interestsReceived, icon: Inbox, color: '#F04923', link: '/portal/member/matrimony/interests' },
              { label: 'Interests Sent', value: interestsSent, icon: Send, color: '#0067A5', link: '/portal/member/matrimony/interests' },
              { label: 'Profile Views', value: profileViews, icon: Eye, color: '#00A86B', link: '#' },
              { label: 'Shortlisted By', value: shortlistedBy, icon: Bookmark, color: '#FFBF00', link: '#' },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <Link key={stat.label} href={stat.link} style={{ textDecoration: 'none' }}>
                  <div className="card-stat" style={{ cursor: 'pointer', transition: 'transform 0.2s' }}>
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
                </Link>
              );
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
                  <Sparkles size={18} style={{ color: '#FFBF00' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Recommended for You</span>
                </div>
                <Link href="/portal/member/matrimony/browse" style={{
                  fontSize: '0.8rem', color: '#0067A5', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  Browse All <ChevronRight size={14} />
                </Link>
              </div>

              {recommendations.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                  <Users size={40} style={{ color: 'var(--text-muted)', marginBottom: 12, opacity: 0.4 }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {profile.status === 'approved'
                      ? 'No recommendations yet. Check back soon!'
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
                          background: `linear-gradient(135deg, ${rec.gender === 'female' ? '#ec4899' : '#0067A5'}20, ${rec.gender === 'female' ? '#f472b6' : '#0091d5'}10)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <User size={22} style={{ color: rec.gender === 'female' ? '#ec4899' : '#0067A5' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                              {getDisplayName(rec.full_name, rec.display_pref)}
                            </span>
                            {rec.is_verified_id && <UserCheck size={14} style={{ color: '#0067A5' }} />}
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
                <Activity size={18} style={{ color: '#00A86B' }} />
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
                          background: act.type === 'interest_received' ? 'rgba(240,73,35,0.1)' : act.type === 'interest_sent' ? 'rgba(0,103,165,0.1)' : 'rgba(0,168,107,0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Icon size={16} style={{
                            color: act.type === 'interest_received' ? '#F04923' : act.type === 'interest_sent' ? '#0067A5' : '#00A86B',
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

          {/* Quick Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { href: '/portal/member/matrimony/browse', icon: Search, label: 'Browse Profiles', desc: 'Find compatible matches', color: '#0067A5' },
              { href: '/portal/member/matrimony/edit', icon: FileEdit, label: 'Edit Profile', desc: 'Update your details', color: '#00A86B' },
              { href: '/portal/member/matrimony/preferences', icon: Settings, label: 'Partner Preferences', desc: 'Set your criteria', color: '#FFBF00' },
              { href: '/portal/member/matrimony/shortlist', icon: Bookmark, label: 'My Shortlist', desc: 'View saved profiles', color: '#7c3aed' },
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
      )}

      {/* ═══════ TAB: Browse ═══════ */}
      {activeTab === 'browse' && (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <Search size={48} style={{ color: 'var(--text-muted)', marginBottom: 16, opacity: 0.4 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>Browse Profiles</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>
            Search and filter through verified profiles to find your ideal match.
          </p>
          <Link href="/portal/member/matrimony/browse" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            <Search size={16} /> Start Browsing
          </Link>
        </div>
      )}

      {/* ═══════ TAB: Matches ═══════ */}
      {activeTab === 'matches' && (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <HeartHandshake size={48} style={{ color: 'var(--text-muted)', marginBottom: 16, opacity: 0.4 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>Your Matches</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>
            Profiles that match your preferences will appear here.
          </p>
          <Link href="/portal/member/matrimony/matches" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            <HeartHandshake size={16} /> View Matches
          </Link>
        </div>
      )}

      {/* ═══════ TAB: Interests ═══════ */}
      {activeTab === 'interests' && (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <Heart size={48} style={{ color: 'var(--text-muted)', marginBottom: 16, opacity: 0.4 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>Interests</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>
            View interests you&apos;ve sent and received.
          </p>
          <Link href="/portal/member/matrimony/interests" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            <Heart size={16} /> Manage Interests
          </Link>
        </div>
      )}

      {/* ═══════ TAB: Shortlist ═══════ */}
      {activeTab === 'shortlist' && (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <Bookmark size={48} style={{ color: 'var(--text-muted)', marginBottom: 16, opacity: 0.4 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>Your Shortlist</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>
            Profiles you&apos;ve saved for later.
          </p>
          <Link href="/portal/member/matrimony/shortlist" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            <Bookmark size={16} /> View Shortlist
          </Link>
        </div>
      )}

      {/* ═══════ TAB: Messages ═══════ */}
      {activeTab === 'messages' && (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <MessageCircle size={48} style={{ color: 'var(--text-muted)', marginBottom: 16, opacity: 0.4 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>Messages</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>
            Your conversations with other members.
          </p>
          <Link href="/portal/member/matrimony/messages" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            <MessageCircle size={16} /> Open Messages
          </Link>
        </div>
      )}

      {/* ═══════ TAB: Settings ═══════ */}
      {activeTab === 'settings' && (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <Settings size={48} style={{ color: 'var(--text-muted)', marginBottom: 16, opacity: 0.4 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>Matrimony Settings</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>
            Manage privacy, notifications, and profile visibility.
          </p>
          <Link href="/portal/member/matrimony/settings" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            <Settings size={16} /> Open Settings
          </Link>
        </div>
      )}
    </div>
  );
}
