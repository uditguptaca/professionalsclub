'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/app-context';
import { getMyMatrimony, listInterests, respondToInterest } from '@/app/actions/matrimony';
import type { MatrimonyProfile, MatrimonyInterest, MatrimonyProfileCard } from '@/types/matrimony';
import {
  Heart, ArrowLeft, Send, Inbox, CheckCircle2, XCircle, Clock, User,
  Calendar, MapPin, Briefcase, ChevronRight, UserCheck, Smile
} from 'lucide-react';
import PortalLoading from '@/components/portal/PortalLoading';

type InterestTab = 'received' | 'sent';

interface PopulatedInterest extends Omit<MatrimonyInterest, 'sender_profile' | 'receiver_profile'> {
  profile: MatrimonyProfileCard;
}

export default function InterestsPage() {
  const { currentUserId } = useApp();

  const [activeTab, setActiveTab] = useState<InterestTab>('received');
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<MatrimonyProfile | null>(null);
  const [received, setReceived] = useState<PopulatedInterest[]>([]);
  const [sent, setSent] = useState<PopulatedInterest[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  /**
   * Interests carry only profile ids; the server joins the cards from
   * matrimony_visible_profiles. The base matrimony_profiles table exposes only
   * your own row, because a column list chosen by the client cannot keep
   * moderation notes out of a `select('*')`.
   */
  async function loadInterests() {
    const result = await listInterests();
    if (!result.ok) {
      console.error('Error fetching interests:', result.error);
      return;
    }
    setReceived(result.data.received as unknown as PopulatedInterest[]);
    setSent(result.data.sent as unknown as PopulatedInterest[]);
  }

  useEffect(() => {
    async function loadData() {
      if (!currentUserId) { setLoading(false); return; }
      setLoading(true);
      const mine = await getMyMatrimony();
      if (mine.ok && mine.data.profile) {
        setMyProfile(mine.data.profile);
        await loadInterests();
      }
      setLoading(false);
    }
    loadData();
  }, [currentUserId]);

  const handleAccept = async (interestId: string) => {
    if (!myProfile) return;
    setActionLoading(interestId);

    // Accepting also opens the conversation, server-side. Only the recipient
    // may do this — the guard_interest_response trigger enforces it, so a
    // sender cannot accept on the other party's behalf.
    const result = await respondToInterest(interestId, true);
    if (result.ok) { setActionError(null); await loadInterests(); }
    else setActionError(result.error);

    setActionLoading(null);
  };

  const handleDecline = async (interestId: string) => {
    if (!myProfile) return;
    if (!confirm('Are you sure you want to decline this interest?')) return;
    setActionLoading(interestId);

    const result = await respondToInterest(interestId, false);
    if (result.ok) { setActionError(null); await loadInterests(); }
    else setActionError(result.error);

    setActionLoading(null);
  };

  function getAge(dob: string): number {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  }

  function getDisplayName(name: string, pref: string) {
    if (!name) return 'Member';
    if (pref === 'first_name') return name.split(' ')[0];
    if (pref === 'initials') return name.split(' ').map(w => w[0]).join('').toUpperCase();
    return name;
  }

  if (loading) {
    return (
      <PortalLoading label="Loading interests" />
    );
  }

  if (!myProfile) {
    return (
      <div className="flex flex-col gap-6" style={{ maxWidth: 600, margin: '40px auto', textAlign: 'center' }}>
        <h2 style={{ fontWeight: 800 }}>Profile Required</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Please create a matrimony profile first to receive and send interests.
        </p>
        <Link href="/portal/member/matrimony/create" className="btn btn-primary" style={{ alignSelf: 'center', textDecoration: 'none' }}>
          Create Profile
        </Link>
      </div>
    );
  }

  const currentList = activeTab === 'received' ? received : sent;

  return (
    <div className="flex flex-col gap-6 animate-fade-in" style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header */}
      <div>
        <Link href="/portal/member/matrimony" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 6 }}>
          Manage Interests
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Accept or send connection requests to start matching.
        </p>
        {actionError && <p role="alert" className="community-error" style={{ marginTop: 12 }}>{actionError}</p>}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 8, borderBottom: '1px solid var(--border-color)',
        overflowX: 'auto', paddingBottom: 1
      }}>
        {[
          { key: 'received', label: `Received (${received.filter(r => r.status === 'pending').length})`, icon: Inbox },
          { key: 'sent', label: `Sent (${sent.length})`, icon: Send },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as InterestTab)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 20px', background: 'none', border: 'none',
                borderBottom: isActive ? '3px solid var(--primary-600)' : '3px solid transparent',
                color: isActive ? 'var(--primary-600)' : 'var(--text-muted)',
                fontWeight: isActive ? 700 : 500, fontSize: '0.85rem',
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s'
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* List */}
      {currentList.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Smile size={48} style={{ color: 'var(--text-muted)', marginBottom: 16, opacity: 0.4 }} />
          <h3 style={{ fontWeight: 700, marginBottom: 8 }}>No interests found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {activeTab === 'received'
              ? "You haven't received any interests yet. Make sure your profile is complete to attract views."
              : "You haven't sent any interests yet. Browse profiles to find someone compatible."}
          </p>
          {activeTab === 'sent' && (
            <Link href="/portal/member/matrimony/browse" className="btn btn-primary" style={{ display: 'inline-flex', alignSelf: 'center', marginTop: 20, textDecoration: 'none' }}>
              Browse Profiles
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {currentList.map((item) => (
            <div key={item.id} className="card animate-fade-in-up" style={{
              display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center', padding: 20
            }}>
              {/* Avatar placeholder */}
              <div style={{
                width: 56, height: 56, borderRadius: 14, flexShrink: 0,
                background: item.profile.gender?.toLowerCase() === 'female' ? 'linear-gradient(135deg, rgba(217,119,6,0.13), rgba(251,191,36,0.06))' : 'linear-gradient(135deg, rgba(232,93,4,0.13), rgba(249,115,22,0.06))',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <User size={26} style={{ color: item.profile.gender?.toLowerCase() === 'female' ? 'var(--accent-600)' : 'var(--primary-600)' }} />
              </div>

              {/* Info details */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 6px 0' }}>
                  {getDisplayName(item.profile.full_name, item.profile.display_pref)}
                  {item.profile.is_verified_id && <UserCheck size={14} style={{ color: 'var(--text-accent)' }} />}
                </h3>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                  <span>{getAge(item.profile.dob)} yrs</span>
                  <span>&bull;</span>
                  <span>{item.profile.city}, {item.profile.province}</span>
                  <span>&bull;</span>
                  <span>{item.profile.occupation}</span>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                {item.status === 'pending' && activeTab === 'received' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-sm"
                      onClick={() => handleAccept(item.id)}
                      disabled={actionLoading !== null}
                      style={{ background: 'var(--success-500)', color: 'white', border: 'none' }}
                    >
                      {actionLoading === item.id ? 'Accepting...' : 'Accept'}
                    </button>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => handleDecline(item.id)}
                      disabled={actionLoading !== null}
                      style={{ borderColor: 'var(--error-500)', color: 'var(--error-600)' }}
                    >
                      Decline
                    </button>
                  </div>
                )}

                {item.status === 'pending' && activeTab === 'sent' && (
                  <span style={{ fontSize: '0.8rem', color: '#92400e', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                    <Clock size={14} /> Pending Response
                  </span>
                )}

                {item.status === 'accepted' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '0.8rem', color: '#04724d', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                      <CheckCircle2 size={14} /> Mutual Match
                    </span>
                    <Link href="/portal/member/matrimony/messages" className="btn btn-sm btn-primary" style={{ background: 'var(--success-500)', borderColor: 'var(--success-500)', textDecoration: 'none' }}>
                      Chat
                    </Link>
                  </div>
                )}

                {item.status === 'declined' && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--error-600)', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                    <XCircle size={14} /> Declined
                  </span>
                )}

                <Link href={`/portal/member/matrimony/profile/${item.profile.id}`} className="btn btn-sm btn-ghost" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Profile <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
