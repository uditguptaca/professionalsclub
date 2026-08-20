'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/app-context';
import {
  getMyMatrimony, listInterests, respondToInterest, listShortlist,
  removeFromShortlist, swipeRight,
} from '@/app/actions/matrimony';
import type { MatrimonyProfile, MatrimonyProfileCard } from '@/types/matrimony';
import MatrimonyTabs from '@/components/portal/MatrimonyTabs';
import PortalLoading from '@/components/portal/PortalLoading';
import { useConfirm } from '@/components/portal/confirm';
import {
  Heart, X, Star, BadgeCheck, Clock, CheckCircle2, XCircle, AlertCircle,
  Check, MessageCircle, Inbox, Trash2, User, ChevronRight, Sparkles,
} from 'lucide-react';

/**
 * Likes — the other half of the deck. Three lanes:
 *   · Likes you   pending interests, photo-led, answerable in one tap
 *   · You liked   what you sent, and where it stands
 *   · Shortlist   saved for later, likeable from here
 *
 * A like back is respondToInterest(id, true), which accepts the interest AND
 * opens the conversation server-side, so the returned id is a real thread.
 */

type Lane = 'received' | 'sent' | 'shortlist';

interface PopulatedInterest {
  id: string;
  sender_profile_id: string;
  receiver_profile_id: string;
  status: string;
  created_at: string;
  profile: MatrimonyProfileCard;
}

function getAge(dob: string): number {
  const b = new Date(dob);
  const t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
  return age;
}

function displayName(name: string, pref: string): string {
  if (!name) return 'Member';
  if (pref === 'first_name') return name.split(' ')[0];
  if (pref === 'initials') return name.split(' ').map((w) => w[0]).join('.').toUpperCase();
  return name;
}

function initialsOf(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'PC';
}

function photoOf(card: MatrimonyProfileCard) {
  if (!card.primary_photo_url || card.photo_visibility === 'on_request') return null;
  return { url: card.primary_photo_url, blurred: card.photo_visibility === 'blurred' };
}

/** Chip fills are light; the text colour is the one that has to pass at 12px. */
const STATUS_CHIP: Record<string, { bg: string; color: string; icon: React.ElementType; text: string }> = {
  pending:  { bg: 'rgba(217,119,6,0.10)', color: 'var(--accent-700)',  icon: Clock,        text: 'Waiting' },
  accepted: { bg: 'rgba(0,168,107,0.10)', color: 'var(--success-600)', icon: CheckCircle2, text: 'Matched' },
  declined: { bg: 'var(--bg-secondary)',  color: 'var(--text-muted)',  icon: XCircle,      text: 'Declined' },
};

const pillStyle = (active: boolean): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 6,
  minHeight: 44, padding: '0 15px', border: 0, borderRadius: 999,
  font: 'inherit', fontSize: '0.85rem', whiteSpace: 'nowrap', cursor: 'pointer',
  background: active ? 'var(--green-950)' : 'none',
  color: active ? '#fff' : 'var(--text-secondary)',
  fontWeight: active ? 700 : 600,
});

export default function MatrimonyLikesPage() {
  const { currentUserId } = useApp();
  const confirm = useConfirm();

  const [lane, setLane] = useState<Lane>('received');
  const [loading, setLoading] = useState(true);
  const [mine, setMine] = useState<MatrimonyProfile | null>(null);
  const [received, setReceived] = useState<PopulatedInterest[]>([]);
  const [sent, setSent] = useState<PopulatedInterest[]>([]);
  const [shortlist, setShortlist] = useState<MatrimonyProfileCard[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [matched, setMatched] = useState<{ name: string; conversationId: string | null } | null>(null);

  const reload = useCallback(async () => {
    const [ints, saved] = [await listInterests(), await listShortlist()];
    if (ints.ok) {
      setReceived(ints.data.received as unknown as PopulatedInterest[]);
      setSent(ints.data.sent as unknown as PopulatedInterest[]);
    } else setError(ints.error);
    if (saved.ok) setShortlist(saved.data);
    else setError(saved.error);
  }, []);

  useEffect(() => {
    async function load() {
      if (!currentUserId) { setLoading(false); return; }
      const me = await getMyMatrimony();
      if (!me.ok) { setError(me.error); setLoading(false); return; }
      if (me.data.profile) {
        setMine(me.data.profile);
        await reload();
      }
      setLoading(false);
    }
    load();
  }, [currentUserId, reload]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const pendingReceived = useMemo(() => received.filter((r) => r.status === 'pending'), [received]);
  const answered = useMemo(() => received.filter((r) => r.status !== 'pending'), [received]);

  const likeBack = async (item: PopulatedInterest) => {
    if (busyId) return;
    setBusyId(item.id);
    setError('');
    const r = await respondToInterest(item.id, true);
    if (r.ok) {
      setMatched({ name: displayName(item.profile.full_name, item.profile.display_pref), conversationId: r.data });
      await reload();
    } else setError(r.error);
    setBusyId(null);
  };

  const passOn = async (item: PopulatedInterest) => {
    if (busyId) return;
    const ok = await confirm({
      title: 'Pass on this like?',
      message: 'They will not be able to message you, and this cannot be undone.',
      confirmLabel: 'Pass',
      tone: 'danger',
    });
    if (!ok) return;
    setBusyId(item.id);
    setError('');
    const r = await respondToInterest(item.id, false);
    if (r.ok) { setToast('Passed'); await reload(); }
    else setError(r.error);
    setBusyId(null);
  };

  const likeFromShortlist = async (card: MatrimonyProfileCard) => {
    if (busyId) return;
    setBusyId(card.id);
    setError('');
    const r = await swipeRight(card.id);
    if (!r.ok) setError(r.error);
    else if (r.data.matched) {
      setMatched({ name: displayName(card.full_name, card.display_pref), conversationId: r.data.conversation_id });
      await reload();
    } else { setToast('Like sent'); await reload(); }
    setBusyId(null);
  };

  const removeSaved = async (card: MatrimonyProfileCard) => {
    if (busyId) return;
    setBusyId(card.id);
    setError('');
    const r = await removeFromShortlist(card.id);
    if (r.ok) { setToast('Removed from shortlist'); await reload(); }
    else setError(r.error);
    setBusyId(null);
  };

  if (loading) return <PortalLoading label="Loading your likes" />;

  if (!mine) {
    return (
      <div className="pp2">
        <MatrimonyTabs active="likes" />
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
          <Heart size={28} aria-hidden="true" style={{ opacity: 0.35, marginBottom: 12 }} />
          <p style={{ margin: '0 0 1.1rem', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
            Create a matrimony profile to send and receive likes.
          </p>
          <Link href="/portal/member/matrimony/create" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Create profile
          </Link>
        </div>
      </div>
    );
  }

  /** A photo-led card: the grammar of the deck, at grid size. */
  const photoCard = (card: MatrimonyProfileCard, actions: React.ReactNode) => {
    const pic = photoOf(card);
    const name = displayName(card.full_name, card.display_pref);
    return (
      <div key={card.id} className="pp-group-card" style={{ display: 'flex', flexDirection: 'column' }}>
        <Link
          href={`/portal/member/matrimony/profile/${card.id}`}
          aria-label={`View ${name}`}
          style={{
            position: 'relative', display: 'block', aspectRatio: '3 / 4',
            background: 'var(--green-950)', overflow: 'hidden', textDecoration: 'none',
          }}
        >
          {pic ? (
            <img
              src={pic.url} alt="" aria-hidden="true"
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                ...(pic.blurred ? { filter: 'blur(18px)', transform: 'scale(1.14)' } : {}),
              }}
            />
          ) : (
            <span
              aria-hidden="true"
              style={{
                position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
                color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-display)',
                fontSize: '2.4rem', fontWeight: 800,
              }}
            >
              {initialsOf(card.full_name)}
            </span>
          )}
          <span
            aria-hidden="true"
            style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(180deg, rgba(15,35,24,0) 45%, rgba(15,35,24,0.85) 100%)',
            }}
          />
          <span
            style={{
              position: 'absolute', left: '0.6rem', right: '0.6rem', bottom: '0.55rem',
              color: '#fff', fontSize: '0.92rem', fontWeight: 750,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {name}, {getAge(card.dob)}
            </span>
            {card.is_verified_id && (
              <BadgeCheck size={14} aria-label="ID verified" style={{ color: 'var(--lime-300)', flexShrink: 0 }} />
            )}
          </span>
          {/* .hf-chip sits bottom-left by default, where the name line now is. */}
          <span className="hf-chip" style={{ top: '0.55rem', bottom: 'auto', left: '0.55rem' }}>
            {card.city || 'Canada'}
          </span>
        </Link>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0.55rem 0.55rem 0.65rem' }}>
          {actions}
        </div>
      </div>
    );
  };

  /** A one-line row with a status chip — how sent and answered likes read. */
  const statusRow = (item: PopulatedInterest) => {
    const card = item.profile;
    const name = displayName(card.full_name, card.display_pref);
    const chip = STATUS_CHIP[item.status] ?? STATUS_CHIP.pending;
    const ChipIcon = chip.icon;
    return (
      <div key={item.id} className="pp-group-card">
        <Link href={`/portal/member/matrimony/profile/${card.id}`} className="pp-row">
          <span className="pp-row-icon"><User size={17} aria-hidden="true" /></span>
          <span className="pp-row-body">
            <strong>{name}, {getAge(card.dob)}</strong>
            <small style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {[card.occupation, card.city].filter(Boolean).join(' · ') || 'Member'}
            </small>
          </span>
          <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
        </Link>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            padding: '0.6rem 0.9rem 0.8rem',
          }}
        >
          <span className="pp-chip" style={{ background: chip.bg, color: chip.color }}>
            <ChipIcon size={12} aria-hidden="true" /> {chip.text}
          </span>
          {item.status === 'accepted' && (
            <Link
              href="/portal/member/matrimony/messages"
              className="btn btn-sm btn-outline"
              style={{ marginLeft: 'auto', textDecoration: 'none' }}
            >
              <MessageCircle size={14} aria-hidden="true" /> Message
            </Link>
          )}
        </div>
      </div>
    );
  };

  const emptyLane = (icon: React.ReactNode, text: string, href: string, cta: string) => (
    <div className="pp-group-card" style={{ padding: '2.4rem 1.2rem', textAlign: 'center' }}>
      <span style={{ opacity: 0.38, display: 'block', marginBottom: 10 }}>{icon}</span>
      <p style={{ margin: '0 auto 16px', maxWidth: '22rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
        {text}
      </p>
      <Link href={href} className="btn btn-primary" style={{ minHeight: 44, textDecoration: 'none' }}>
        {cta}
      </Link>
    </div>
  );

  const grid: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10,
  };

  return (
    <div className="pp2">
      <MatrimonyTabs active="likes" />

      <header style={{ marginBottom: '0.9rem' }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(1.35rem, 4vw, 1.55rem)',
            fontWeight: 800, letterSpacing: '-0.01em', margin: '0 0 0.2rem',
          }}
        >
          Likes
        </h1>
        <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
          Liking someone back opens a private chat between the two of you.
        </p>
      </header>

      {/* ---- Lanes ---- */}
      <div
        role="tablist" aria-label="Likes"
        style={{
          display: 'flex', gap: 4, padding: 4, marginBottom: '1rem',
          background: 'var(--bg-primary)', borderRadius: 999,
          border: '1px solid rgba(27,67,50,0.08)',
          width: 'fit-content', maxWidth: '100%', overflowX: 'auto',
        }}
      >
        {([
          { key: 'received', label: `Likes you${pendingReceived.length ? ` (${pendingReceived.length})` : ''}`, icon: Heart },
          { key: 'sent', label: `You liked${sent.length ? ` (${sent.length})` : ''}`, icon: Inbox },
          { key: 'shortlist', label: 'Shortlist', icon: Star },
        ] as { key: Lane; label: string; icon: React.ElementType }[]).map((t) => {
          const Icon = t.icon;
          const active = lane === t.key;
          return (
            <button
              key={t.key} type="button" role="tab" aria-selected={active}
              onClick={() => setLane(t.key)} style={pillStyle(active)}
            >
              <Icon size={15} aria-hidden="true" /> {t.label}
            </button>
          );
        })}
      </div>

      {matched && (
        <div
          role="status"
          style={{
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            marginBottom: '1rem', padding: '0.85rem 1rem', borderRadius: '1rem',
            background: 'var(--green-950)', color: '#fff',
          }}
        >
          <Sparkles size={18} aria-hidden="true" style={{ color: 'var(--lime-300)', flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: '9rem', fontSize: '0.88rem', fontWeight: 700 }}>
            It&apos;s a match with {matched.name}
          </span>
          <Link
            href={matched.conversationId
              ? `/portal/member/matrimony/messages?c=${matched.conversationId}`
              : '/portal/member/matrimony/messages'}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 40,
              padding: '0 14px', borderRadius: 999, background: 'var(--lime-300)',
              color: 'var(--green-950)', textDecoration: 'none',
              fontSize: '0.84rem', fontWeight: 800,
            }}
          >
            <MessageCircle size={15} aria-hidden="true" /> Say hello
          </Link>
          <button
            type="button" onClick={() => setMatched(null)} aria-label="Dismiss"
            style={{
              display: 'grid', placeItems: 'center', width: 40, height: 40,
              border: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.12)',
              color: '#fff', cursor: 'pointer',
            }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {error && (
        <div role="alert" className="community-error" style={{ marginBottom: 12 }}>
          <AlertCircle size={15} aria-hidden="true" /> {error}
        </div>
      )}

      {/* ---- Likes you ---- */}
      {lane === 'received' && (
        pendingReceived.length === 0 && answered.length === 0 ? (
          emptyLane(
            <Heart size={30} aria-hidden="true" />,
            'Nobody has liked you yet. A complete listing with a photo gets seen far more often.',
            '/portal/member/matrimony/edit',
            'Complete your profile',
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {pendingReceived.length > 0 && (
              <div style={grid}>
                {pendingReceived.map((item) => photoCard(item.profile, (
                  <>
                    <button
                      type="button" className="pp-sheet-save"
                      style={{ minHeight: 44, fontSize: '0.85rem' }}
                      onClick={() => likeBack(item)}
                      disabled={busyId !== null}
                    >
                      {busyId === item.id
                        ? 'Liking…'
                        : <><Heart size={15} aria-hidden="true" /> Like back</>}
                    </button>
                    <button
                      type="button" className="btn btn-outline"
                      style={{ minHeight: 44, justifyContent: 'center', fontSize: '0.82rem', color: 'var(--error-600)', borderColor: 'rgba(240,73,35,0.35)' }}
                      onClick={() => passOn(item)}
                      disabled={busyId !== null}
                    >
                      <X size={15} aria-hidden="true" /> Pass
                    </button>
                  </>
                )))}
              </div>
            )}

            {answered.length > 0 && (
              <section>
                <h2 className="pp-group-sub" style={{ margin: '0 0 0.5rem', fontWeight: 750 }}>
                  Already answered
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {answered.map(statusRow)}
                </div>
              </section>
            )}
          </div>
        )
      )}

      {/* ---- You liked ---- */}
      {lane === 'sent' && (
        sent.length === 0 ? (
          emptyLane(
            <Inbox size={30} aria-hidden="true" />,
            'You have not liked anyone yet. Your deck is waiting.',
            '/portal/member/matrimony',
            'Open Discover',
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sent.map(statusRow)}
          </div>
        )
      )}

      {/* ---- Shortlist ---- */}
      {lane === 'shortlist' && (
        shortlist.length === 0 ? (
          emptyLane(
            <Star size={30} aria-hidden="true" />,
            'Nothing saved yet. Tap the star while swiping to keep someone here for later.',
            '/portal/member/matrimony',
            'Open Discover',
          )
        ) : (
          <div style={grid}>
            {shortlist.map((card) => photoCard(card, (
              <>
                <button
                  type="button" className="pp-sheet-save"
                  style={{ minHeight: 44, fontSize: '0.85rem' }}
                  onClick={() => likeFromShortlist(card)}
                  disabled={busyId !== null}
                >
                  {busyId === card.id
                    ? 'Liking…'
                    : <><Heart size={15} aria-hidden="true" /> Like</>}
                </button>
                <button
                  type="button" className="btn btn-outline"
                  style={{ minHeight: 44, justifyContent: 'center', fontSize: '0.82rem', color: 'var(--error-600)', borderColor: 'rgba(240,73,35,0.35)' }}
                  onClick={() => removeSaved(card)}
                  disabled={busyId !== null}
                  aria-label={`Remove ${displayName(card.full_name, card.display_pref)} from shortlist`}
                >
                  <Trash2 size={15} aria-hidden="true" /> Remove
                </button>
              </>
            )))}
          </div>
        )
      )}

      {/* Matches has no tab of its own; without this it is only reachable by URL. */}
      <div className="pp-group-card" style={{ marginTop: '1.2rem' }}>
        <Link href="/portal/member/matrimony/matches" className="pp-row">
          <span className="pp-row-icon"><Sparkles size={17} /></span>
          <span className="pp-row-body">
            <small>Another way in</small>
            <strong>Profiles ranked against your preferences</strong>
          </span>
          <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
        </Link>
      </div>

      {toast && (
        <div className="pp-toast" role="status">
          <Check size={15} aria-hidden="true" /> {toast}
        </div>
      )}
    </div>
  );
}
