'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/app-context';
import { getMyMatrimony, listInterests, respondToInterest } from '@/app/actions/matrimony';
import type { MatrimonyProfile, MatrimonyInterest, MatrimonyProfileCard } from '@/types/matrimony';
import {
  ArrowLeft, Send, Inbox, CheckCircle2, XCircle, Clock, User,
  ChevronRight, UserCheck, Check, AlertCircle, Heart,
} from 'lucide-react';
import PortalLoading from '@/components/portal/PortalLoading';
import { useConfirm } from '@/components/portal/confirm';

type InterestTab = 'received' | 'sent';

interface PopulatedInterest extends Omit<MatrimonyInterest, 'sender_profile' | 'receiver_profile'> {
  profile: MatrimonyProfileCard;
}

/** Status chips: light fill + a text colour that passes at chip sizes. */
const CHIPS: Record<string, { bg: string; color: string }> = {
  pending:  { bg: 'rgba(217,119,6,0.10)', color: 'var(--accent-700)' },
  accepted: { bg: 'rgba(0,168,107,0.10)', color: 'var(--success-600)' },
  declined: { bg: 'var(--error-50)',      color: 'var(--error-600)' },
};

export default function InterestsPage() {
  const { currentUserId } = useApp();
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState<InterestTab>('received');
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<MatrimonyProfile | null>(null);
  const [received, setReceived] = useState<PopulatedInterest[]>([]);
  const [sent, setSent] = useState<PopulatedInterest[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  /**
   * Interests carry only profile ids; the server joins the cards from
   * matrimony_visible_profiles. The base matrimony_profiles table exposes only
   * your own row, because a column list chosen by the client cannot keep
   * moderation notes out of a `select('*')`.
   */
  async function loadInterests() {
    const result = await listInterests();
    if (!result.ok) {
      setActionError(result.error);
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

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const handleAccept = async (interestId: string) => {
    if (!myProfile) return;
    setActionLoading(interestId);

    // Accepting also opens the conversation, server-side. Only the recipient
    // may do this — the guard_interest_response trigger enforces it, so a
    // sender cannot accept on the other party's behalf.
    const result = await respondToInterest(interestId, true);
    if (result.ok) { setActionError(null); setToast('Interest accepted'); await loadInterests(); }
    else setActionError(result.error);

    setActionLoading(null);
  };

  const handleDecline = async (interestId: string) => {
    if (!myProfile) return;
    const ok = await confirm({
      title: 'Decline this interest?',
      message: 'They will not be able to message you, and this cannot be undone.',
      confirmLabel: 'Decline',
      tone: 'danger',
    });
    if (!ok) return;
    setActionLoading(interestId);

    const result = await respondToInterest(interestId, false);
    if (result.ok) { setActionError(null); setToast('Interest declined'); await loadInterests(); }
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
      <div className="pp2" style={{ textAlign: 'center', padding: '2.5rem 0' }}>
        <Heart size={28} aria-hidden="true" style={{ opacity: 0.35, marginBottom: 12 }} />
        <p style={{ margin: '0 0 1.1rem', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
          Create a matrimony profile to send and receive interests.
        </p>
        <Link href="/portal/member/matrimony/create" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          Create profile
        </Link>
      </div>
    );
  }

  const currentList = activeTab === 'received' ? received : sent;
  const pendingCount = received.filter(r => r.status === 'pending').length;

  const tabs: { key: InterestTab; label: string }[] = [
    { key: 'received', label: `Received${pendingCount ? ` (${pendingCount})` : ''}` },
    { key: 'sent', label: `Sent${sent.length ? ` (${sent.length})` : ''}` },
  ];

  return (
    <div className="pp2">
      <Link
        href="/portal/member/matrimony"
        className="pp-chip"
        style={{
          background: 'var(--bg-primary)', border: '1px solid rgba(27,67,50,0.08)',
          color: 'var(--text-secondary)', textDecoration: 'none',
          minHeight: 40, padding: '0 0.9rem', marginBottom: '0.9rem',
        }}
      >
        <ArrowLeft size={14} aria-hidden="true" /> Matrimony
      </Link>

      <header style={{ marginBottom: '1.1rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.01em', margin: '0 0 0.25rem' }}>
          Interests
        </h1>
        <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
          Accepting an interest opens a private chat between the two of you.
        </p>
      </header>

      {/* Status filter */}
      <div
        role="tablist"
        aria-label="Interest direction"
        style={{
          display: 'flex', gap: 4, padding: 4, background: 'var(--bg-primary)',
          borderRadius: 999, border: '1px solid rgba(27,67,50,0.08)',
          width: 'fit-content', maxWidth: '100%', overflowX: 'auto', marginBottom: '1.1rem',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.key === 'received' ? Inbox : Send;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                minHeight: 44, padding: '0 16px', border: 0, borderRadius: 999,
                font: 'inherit', fontSize: '0.86rem', whiteSpace: 'nowrap', cursor: 'pointer',
                background: isActive ? 'var(--green-950)' : 'none',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 600,
              }}
            >
              <Icon size={15} aria-hidden="true" /> {tab.label}
            </button>
          );
        })}
      </div>

      {actionError && (
        <div role="alert" className="community-error" style={{ marginBottom: 12 }}>
          <AlertCircle size={15} aria-hidden="true" /> {actionError}
        </div>
      )}

      {currentList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
          {activeTab === 'received'
            ? <Inbox size={28} aria-hidden="true" style={{ opacity: 0.35 }} />
            : <Send size={28} aria-hidden="true" style={{ opacity: 0.35 }} />}
          <p style={{ margin: '0.8rem 0 1.1rem', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
            {activeTab === 'received'
              ? 'No one has sent you an interest yet. A complete profile gets seen more often.'
              : 'You have not sent an interest yet.'}
          </p>
          <Link
            href={activeTab === 'received' ? '/portal/member/matrimony/edit' : '/portal/member/matrimony/browse'}
            className="btn btn-primary"
            style={{ textDecoration: 'none' }}
          >
            {activeTab === 'received' ? 'Complete your profile' : 'Browse profiles'}
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {currentList.map((item) => {
            const name = getDisplayName(item.profile.full_name, item.profile.display_pref);
            const meta = [
              `${getAge(item.profile.dob)} yrs`,
              [item.profile.city, item.profile.province].filter(Boolean).join(', '),
              item.profile.occupation,
            ].filter(Boolean).join(' · ');
            const chip = CHIPS[item.status] ?? CHIPS.pending;
            const busy = actionLoading !== null;

            return (
              <div key={item.id} className="pp-group-card">
                <Link href={`/portal/member/matrimony/profile/${item.profile.id}`} className="pp-row">
                  <span className="pp-row-icon"><User size={17} aria-hidden="true" /></span>
                  <span className="pp-row-body">
                    <strong style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                      {item.profile.is_verified_id && (
                        <UserCheck size={13} aria-label="ID verified" style={{ color: 'var(--text-accent)', flexShrink: 0 }} />
                      )}
                    </strong>
                    <small style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta}</small>
                  </span>
                  <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
                </Link>

                {item.status === 'pending' && activeTab === 'received' ? (
                  <div style={{ display: 'flex', gap: 8, padding: '0.75rem 0.9rem 0.9rem' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleAccept(item.id)}
                      disabled={busy}
                      style={{ flex: 1, minHeight: 44 }}
                    >
                      {actionLoading === item.id
                        ? 'Accepting…'
                        : <><Check size={15} aria-hidden="true" /> Accept</>}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => handleDecline(item.id)}
                      disabled={busy}
                      style={{ flex: 1, minHeight: 44, color: 'var(--error-600)', borderColor: 'rgba(240,73,35,0.35)' }}
                    >
                      Decline
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '0.7rem 0.9rem 0.85rem' }}>
                    <span className="pp-chip" style={{ background: chip.bg, color: chip.color }}>
                      {item.status === 'accepted' && <><CheckCircle2 size={12} aria-hidden="true" /> Mutual match</>}
                      {item.status === 'declined' && <><XCircle size={12} aria-hidden="true" /> Declined</>}
                      {item.status === 'pending' && <><Clock size={12} aria-hidden="true" /> Awaiting their reply</>}
                    </span>
                    {item.status === 'accepted' && (
                      <Link
                        href="/portal/member/matrimony/messages"
                        className="btn btn-sm btn-outline"
                        style={{ marginLeft: 'auto', textDecoration: 'none' }}
                      >
                        Message
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {toast && (
        <div className="pp-toast" role="status">
          <Check size={15} aria-hidden="true" /> {toast}
        </div>
      )}
    </div>
  );
}
