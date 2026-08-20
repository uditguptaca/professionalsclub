'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/app-context';
import {
  getMyMatrimony, listDeck, swipeRight, passProfile, undoPass, addToShortlist,
} from '@/app/actions/matrimony';
import type { MatrimonyDeckCard, MatrimonyProfile } from '@/types/matrimony';
import MatrimonyTabs from '@/components/portal/MatrimonyTabs';
import PortalLoading from '@/components/portal/PortalLoading';
import {
  Heart, X, Star, RotateCcw, SlidersHorizontal, BadgeCheck, AlertCircle,
  Check, Sparkles, ShieldCheck, Lock, Plus, Info, Users, Search, MessageCircle,
} from 'lucide-react';

/**
 * Discover — the matrimony deck. This page used to be a dashboard of counters;
 * the counters said nothing a member could act on, so the module now opens on
 * the one thing it is for: the next person.
 *
 * The deck itself is dealt by listDeck(), which has already removed everyone
 * passed, liked, matched, the member themself and the same gender, and puts the
 * profiles that ALREADY like the member first — a right swipe on one of those
 * lands as an instant match, server-side, in a single call.
 */

const THRESHOLD = 90;   // px of horizontal travel that commits a swipe
const TAP_SLOP = 8;     // px below which a pointer-up is a tap, not a drag
const FLY_MS = 300;     // must match the fly-off transition below

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const prettify = (v: string) => v.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

/** Enum values that read badly when merely de-underscored. */
const WORDS: Record<string, string> = {
  pr: 'Permanent resident', citizen: 'Citizen', work_permit: 'Work permit',
  study_permit: 'Study permit', visitor: 'Visitor', other: 'Other',
  veg: 'Vegetarian', non_veg: 'Non-vegetarian', eggetarian: 'Eggetarian',
  vegan: 'Vegan', jain: 'Jain',
  never_married: 'Never married', divorced: 'Divorced', widowed: 'Widowed',
  awaiting_divorce: 'Awaiting divorce', separated: 'Separated',
};
const label = (v?: string | null) => (v ? WORDS[v] ?? prettify(v) : '');

function getAge(dob: string): number {
  const b = new Date(dob);
  const t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
  return age;
}

/**
 * Round to whole inches FIRST, then split. Rounding the remainder instead
 * printed 5'12" for 182cm and 4'12" for 152cm — both common heights.
 */
function cmToFtIn(cm?: number): string {
  if (!cm) return '';
  const inches = Math.round(cm / 2.54);
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
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

/** What the card may show: nothing, the photo, or the photo behind glass. */
function photoOf(card: { primary_photo_url?: string; photo_visibility: string }) {
  if (!card.primary_photo_url || card.photo_visibility === 'on_request') return null;
  return { url: card.primary_photo_url, blurred: card.photo_visibility === 'blurred' };
}

const roundBtn = (size: number, on: boolean): React.CSSProperties => ({
  display: 'grid', placeItems: 'center', flexShrink: 0,
  width: size, height: size, borderRadius: '50%',
  border: '1px solid rgba(27,67,50,0.10)', background: 'var(--bg-primary)',
  boxShadow: '0 8px 22px -14px rgba(15,35,24,0.45)',
  cursor: on ? 'pointer' : 'default', opacity: on ? 1 : 0.4,
  transition: 'transform 0.12s ease',
});

const stamp = (tone: 'like' | 'pass'): React.CSSProperties => ({
  position: 'absolute', top: '1.4rem',
  [tone === 'like' ? 'left' : 'right']: '1.1rem',
  padding: '0.3rem 0.8rem', borderRadius: '0.6rem',
  border: `3px solid ${tone === 'like' ? 'var(--lime-300, #bcdf6a)' : '#ff6b52'}`,
  background: tone === 'like' ? 'rgba(188,223,106,0.16)' : 'rgba(240,73,35,0.22)',
  color: tone === 'like' ? 'var(--lime-300, #bcdf6a)' : '#ffd6cd',
  font: 'inherit', fontSize: '1.15rem', fontWeight: 900, letterSpacing: '0.08em',
  transform: `rotate(${tone === 'like' ? -14 : 14}deg)`,
  pointerEvents: 'none',
} as React.CSSProperties);

export default function MatrimonyDiscoverPage() {
  const { currentUserId } = useApp();

  const [loading, setLoading] = useState(true);
  const [mine, setMine] = useState<MatrimonyProfile | null>(null);
  const [myPhoto, setMyPhoto] = useState<string | null>(null);
  const [deck, setDeck] = useState<MatrimonyDeckCard[]>([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [busy, setBusy] = useState(false);
  const [flying, setFlying] = useState<'like' | 'pass' | null>(null);
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const [lastPassed, setLastPassed] = useState<MatrimonyDeckCard | null>(null);
  const [detail, setDetail] = useState<MatrimonyDeckCard | null>(null);
  const [match, setMatch] = useState<{ card: MatrimonyDeckCard; conversationId: string | null } | null>(null);

  const startRef = useRef<{ x: number; y: number; id: number } | null>(null);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const loadDeck = useCallback(async () => {
    const d = await listDeck();
    if (d.ok) setDeck(d.data);
    else setError(d.error);
  }, []);

  useEffect(() => {
    async function load() {
      if (!currentUserId) { setLoading(false); return; }
      const me = await getMyMatrimony();
      if (!me.ok) { setError(me.error); setLoading(false); return; }
      if (me.data.profile) {
        setMine(me.data.profile);
        const pic = me.data.media.find((m) => m.type === 'photo' && m.is_primary && m.is_approved)
          ?? me.data.media.find((m) => m.type === 'photo' && m.is_approved);
        setMyPhoto(pic?.url ?? null);
        await loadDeck();
      }
      setLoading(false);
    }
    load();
  }, [currentUserId, loadDeck]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  // The detail sheet locks background scroll, same as every other sheet here.
  useEffect(() => {
    if (!detail) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDetail(null); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [detail]);

  const top = deck[0] ?? null;
  const visible = useMemo(() => deck.slice(0, 3), [deck]);
  const likesYou = useMemo(() => deck.filter((c) => c.incoming_interest_id).length, [deck]);

  /** One swipe, gesture or button. The card leaves, then the action runs. */
  const commit = useCallback(async (dir: 'like' | 'pass', card: MatrimonyDeckCard) => {
    if (busy || flying) return;
    setBusy(true);
    setError('');

    if (!reduced.current) { setFlying(dir); await wait(FLY_MS); }
    setDeck((d) => d.filter((c) => c.id !== card.id));
    setFlying(null);
    setDrag({ x: 0, y: 0, active: false });

    if (dir === 'pass') {
      const r = await passProfile(card.id);
      // A failed pass must not silently swallow the profile.
      if (r.ok) setLastPassed(card);
      else { setError(r.error); setDeck((d) => [card, ...d]); }
    } else {
      const r = await swipeRight(card.id);
      if (!r.ok) { setError(r.error); setDeck((d) => [card, ...d]); }
      else if (r.data.matched) setMatch({ card, conversationId: r.data.conversation_id });
      else setToast('Like sent');
    }

    setBusy(false);
  }, [busy, flying]);

  const handleUndo = useCallback(async () => {
    if (!lastPassed || busy) return;
    setBusy(true);
    setError('');
    const r = await undoPass(lastPassed.id);
    if (r.ok) { setDeck((d) => [lastPassed, ...d]); setLastPassed(null); setToast('Brought back'); }
    else setError(r.error);
    setBusy(false);
  }, [lastPassed, busy]);

  const handleShortlist = useCallback(async () => {
    if (!top || busy) return;
    setBusy(true);
    setError('');
    const r = await addToShortlist(top.id);
    if (r.ok) setToast('Saved to shortlist');
    else setError(r.error);
    setBusy(false);
  }, [top, busy]);

  // ---- Gestures on the top card -------------------------------------------
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!top || busy || flying) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    setDrag({ x: 0, y: 0, active: true });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = startRef.current;
    if (!s || s.id !== e.pointerId) return;
    setDrag({ x: e.clientX - s.x, y: e.clientY - s.y, active: true });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = startRef.current;
    if (!s || s.id !== e.pointerId || !top) return;
    startRef.current = null;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    setDrag({ x: 0, y: 0, active: false });
    if (Math.abs(dx) >= THRESHOLD) { commit(dx > 0 ? 'like' : 'pass', top); return; }
    if (Math.abs(dx) < TAP_SLOP && Math.abs(dy) < TAP_SLOP) setDetail(top);
  };

  // ---- Loading / no profile ------------------------------------------------
  if (loading) return <PortalLoading label="Dealing your deck" />;

  if (!mine) {
    return (
      <div className="pp2">
        <MatrimonyTabs active="discover" />
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
          <h1>Start meeting people</h1>
          <p>Create your listing and the deck opens up — one profile at a time, from a circle the club has already checked.</p>
          <div className="pp-hero-chips">
            <span className="pp-chip pp-chip-light"><ShieldCheck size={12} aria-hidden="true" /> Admin reviewed</span>
            <span className="pp-chip pp-chip-light"><Lock size={12} aria-hidden="true" /> Private by default</span>
          </div>
        </header>

        <Link
          href="/portal/member/matrimony/create"
          className="pp-sheet-save"
          style={{ width: '100%', textDecoration: 'none', marginBottom: '1.2rem' }}
        >
          <Plus size={18} aria-hidden="true" /> Create your profile
        </Link>

        <div className="pp-group-card">
          <Link href="/matrimony" className="pp-row">
            <span className="pp-row-icon"><Info size={17} /></span>
            <span className="pp-row-body">
              <small>Not sure yet?</small>
              <strong>Read how matrimony works</strong>
            </span>
          </Link>
        </div>

        {error && (
          <div role="alert" className="community-error" style={{ marginTop: 14 }}>
            <AlertCircle size={15} aria-hidden="true" /> {error}
          </div>
        )}
      </div>
    );
  }

  const pending = mine.status !== 'approved';

  return (
    <div className="pp2">
      <MatrimonyTabs active="discover" />

      {/* ---- Deck header: what is in the deck, and the way to filter it ---- */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 10, marginBottom: '0.85rem',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', minWidth: 0 }}>
          {deck.length === 0
            ? 'Deck empty'
            : likesYou > 0
              ? <><strong style={{ color: 'var(--text-accent)' }}>{likesYou} already like you</strong> · {deck.length} to see</>
              : `${deck.length} ${deck.length === 1 ? 'profile' : 'profiles'} to see`}
        </p>
        <Link
          href="/portal/member/matrimony/browse"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, flexShrink: 0,
            minHeight: 44, padding: '0 14px', borderRadius: 999,
            border: '1px solid rgba(27,67,50,0.08)', background: 'var(--bg-primary)',
            color: 'var(--text-primary)', textDecoration: 'none',
            fontSize: '0.84rem', fontWeight: 700,
          }}
        >
          <SlidersHorizontal size={15} aria-hidden="true" /> Filters
        </Link>
      </div>

      {pending && (
        <div className="pp-nudges">
          <Link href="/portal/member/matrimony/edit" className="pp-nudge">
            <AlertCircle size={13} aria-hidden="true" /> Your listing is {label(mine.status).toLowerCase()} - others cannot see you yet
          </Link>
        </div>
      )}

      {error && (
        <div role="alert" className="community-error" style={{ marginBottom: 12 }}>
          <AlertCircle size={15} aria-hidden="true" /> {error}
        </div>
      )}

      {/* ---- The stack ---- */}
      {deck.length === 0 ? (
        <div
          className="pp-group-card"
          style={{ padding: '2.6rem 1.2rem', textAlign: 'center' }}
        >
          <Sparkles size={30} aria-hidden="true" style={{ opacity: 0.4, marginBottom: 12 }} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800, margin: '0 0 6px' }}>
            You are all caught up
          </h2>
          <p style={{ margin: '0 auto 18px', maxWidth: '22rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            {pending
              ? 'New profiles land here as our team approves them — yours included.'
              : 'That is everyone new for now. Check back soon, or widen the net.'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: '18rem', margin: '0 auto' }}>
            {lastPassed && (
              <button type="button" className="btn btn-outline" style={{ minHeight: 44, justifyContent: 'center' }} onClick={handleUndo} disabled={busy}>
                <RotateCcw size={15} aria-hidden="true" /> Undo last pass
              </button>
            )}
            <Link href="/portal/member/matrimony/browse" className="btn btn-primary" style={{ minHeight: 44, justifyContent: 'center', textDecoration: 'none' }}>
              <Search size={15} aria-hidden="true" /> Browse everyone
            </Link>
            <Link href="/portal/member/matrimony/interests" className="btn btn-outline" style={{ minHeight: 44, justifyContent: 'center', textDecoration: 'none' }}>
              <Heart size={15} aria-hidden="true" /> See who likes you
            </Link>
            <button type="button" className="btn btn-outline" style={{ minHeight: 44, justifyContent: 'center' }} onClick={loadDeck} disabled={busy}>
              <Users size={15} aria-hidden="true" /> Check for new profiles
            </button>
          </div>
        </div>
      ) : (
        <div style={{ position: 'relative', height: 'clamp(21rem, 55vh, 29rem)', marginBottom: '1.2rem' }}>
          {visible.map((card, i) => {
            const isTop = i === 0;
            const pic = photoOf(card);
            const name = displayName(card.full_name, card.display_pref);
            const chips = [
              card.religion,
              card.mother_tongue,
              cmToFtIn(card.height_cm),
              label(card.marital_status),
            ].filter(Boolean) as string[];

            const likeOpacity = flying === 'like' ? 1 : Math.min(1, Math.max(0, drag.x / THRESHOLD));
            const passOpacity = flying === 'pass' ? 1 : Math.min(1, Math.max(0, -drag.x / THRESHOLD));

            const transform = isTop
              ? flying
                ? `translate(${flying === 'like' ? 130 : -130}%, ${drag.y}px) rotate(${flying === 'like' ? 18 : -18}deg)`
                : `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x / 18}deg)`
              : `scale(${1 - i * 0.045}) translateY(${i * 11}px)`;

            return (
              <div
                key={card.id}
                onPointerDown={isTop ? onPointerDown : undefined}
                onPointerMove={isTop ? onPointerMove : undefined}
                onPointerUp={isTop ? onPointerUp : undefined}
                onPointerCancel={isTop ? onPointerUp : undefined}
                style={{
                  position: 'absolute', inset: 0, zIndex: visible.length - i,
                  borderRadius: '1.25rem', overflow: 'hidden',
                  background: 'var(--green-950)',
                  boxShadow: '0 20px 48px -24px rgba(15,35,24,0.65)',
                  transform,
                  transition: drag.active && isTop ? 'none' : 'transform 0.3s cubic-bezier(0.22,1,0.36,1)',
                  touchAction: 'pan-y',
                  cursor: isTop ? 'grab' : 'default',
                  userSelect: 'none',
                }}
              >
                {pic ? (
                  <img
                    src={pic.url} alt="" aria-hidden="true" draggable={false}
                    style={{
                      position: 'absolute', inset: 0, width: '100%', height: '100%',
                      objectFit: 'cover', pointerEvents: 'none',
                      ...(pic.blurred ? { filter: 'blur(22px)', transform: 'scale(1.14)' } : {}),
                    }}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
                      color: 'rgba(255,255,255,0.28)',
                      fontFamily: 'var(--font-display)', fontSize: '5rem', fontWeight: 800,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {initialsOf(card.full_name)}
                  </span>
                )}

                {/* Bottom scrim so the copy stays readable on any photo */}
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    background: 'linear-gradient(180deg, rgba(15,35,24,0.06) 38%, rgba(15,35,24,0.72) 72%, rgba(15,35,24,0.94) 100%)',
                  }}
                />

                {card.incoming_interest_id && (
                  <span
                    style={{
                      position: 'absolute', top: '0.85rem', left: '0.85rem',
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '0.28rem 0.7rem', borderRadius: 999,
                      background: 'var(--lime-300, #bcdf6a)', color: 'var(--green-950)',
                      fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    <Heart size={11} aria-hidden="true" /> Likes you
                  </span>
                )}

                {isTop && likeOpacity > 0.02 && <span style={{ ...stamp('like'), opacity: likeOpacity }}>LIKE</span>}
                {isTop && passOpacity > 0.02 && <span style={{ ...stamp('pass'), opacity: passOpacity }}>PASS</span>}

                {/* Card copy */}
                <div
                  style={{
                    position: 'absolute', left: 0, right: 0, bottom: 0,
                    padding: '1rem 1.1rem 1.15rem', color: '#fff', pointerEvents: 'none',
                  }}
                >
                  <h2
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap',
                      color: '#fff', fontFamily: 'var(--font-display)',
                      fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.2rem',
                      textShadow: '0 2px 14px rgba(0,0,0,0.4)',
                    }}
                  >
                    {name} <span style={{ fontWeight: 600 }}>{getAge(card.dob)}</span>
                    {card.is_verified_id && (
                      <BadgeCheck size={18} aria-label="ID verified" style={{ color: 'var(--lime-300, #bcdf6a)' }} />
                    )}
                  </h2>
                  <p
                    style={{
                      margin: '0 0 0.6rem', fontSize: '0.88rem',
                      color: 'rgba(255,255,255,0.88)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >
                    {[card.occupation, card.city].filter(Boolean).join(' · ') || 'Member'}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {chips.slice(0, 4).map((c) => (
                      <span key={c} className="pp-chip pp-chip-light">{c}</span>
                    ))}
                  </div>
                </div>

                {/* The keyboard / screen-reader path to the same sheet a tap opens */}
                {isTop && (
                  <button
                    type="button"
                    onClick={() => setDetail(card)}
                    aria-label={`More about ${name}`}
                    style={{
                      position: 'absolute', right: '0.8rem', bottom: '0.9rem',
                      display: 'grid', placeItems: 'center', width: 44, height: 44,
                      borderRadius: '50%', border: '1px solid rgba(255,255,255,0.3)',
                      background: 'rgba(15,35,24,0.5)', color: '#fff', cursor: 'pointer',
                    }}
                  >
                    <Info size={18} aria-hidden="true" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ---- Action rail ---- */}
      {deck.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <button
            type="button" onClick={handleUndo} disabled={!lastPassed || busy}
            style={roundBtn(48, Boolean(lastPassed) && !busy)}
            aria-label="Undo last pass"
          >
            <RotateCcw size={19} aria-hidden="true" style={{ color: 'var(--text-secondary)' }} />
          </button>

          <button
            type="button" onClick={() => top && commit('pass', top)} disabled={busy || !top}
            style={{ ...roundBtn(64, !busy && Boolean(top)), border: '1px solid rgba(240,73,35,0.28)' }}
            aria-label="Pass"
          >
            <X size={28} aria-hidden="true" style={{ color: 'var(--error-600)' }} />
          </button>

          <button
            type="button" onClick={handleShortlist} disabled={busy || !top}
            style={roundBtn(48, !busy && Boolean(top))}
            aria-label="Save to shortlist"
          >
            <Star size={19} aria-hidden="true" style={{ color: 'var(--accent-700)' }} />
          </button>

          <button
            type="button" onClick={() => top && commit('like', top)} disabled={busy || !top}
            style={{
              ...roundBtn(64, !busy && Boolean(top)),
              background: 'var(--primary-700)', border: 0,
              boxShadow: '0 12px 26px -14px rgba(232,93,4,0.8)',
            }}
            aria-label="Like"
          >
            <Heart size={28} aria-hidden="true" style={{ color: '#fff' }} fill="#fff" />
          </button>
        </div>
      )}

      {/* ---- Detail sheet ---- */}
      {detail && (() => {
        const name = displayName(detail.full_name, detail.display_pref);
        const rows: [string, string][] = ([
          ['Age', `${getAge(detail.dob)}`],
          ['Height', cmToFtIn(detail.height_cm)],
          ['Lives in', [detail.city, detail.province].filter(Boolean).join(', ')],
          ['Work', detail.occupation],
          ['Education', detail.qualification],
          ['Religion', detail.religion],
          ['Mother tongue', detail.mother_tongue],
          ['Marital status', label(detail.marital_status)],
          ['Diet', label(detail.diet)],
          ['In Canada as', label(detail.residency_status)],
        ] as [string, string][]).filter(([, v]) => Boolean(v));

        return (
          <div className="hf-sheet-scrim" onClick={(e) => { if (e.target === e.currentTarget) setDetail(null); }}>
            <div className="hf-sheet pp-sheet" role="dialog" aria-modal="true" aria-label={`About ${name}`}>
              <div className="hf-sheet-head">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {name}, {getAge(detail.dob)}
                  {detail.is_verified_id && (
                    <BadgeCheck size={16} aria-label="ID verified" style={{ color: 'var(--primary-600)' }} />
                  )}
                </h2>
                <button type="button" className="portal-sheet-close" onClick={() => setDetail(null)} aria-label="Close">
                  <X size={18} />
                </button>
              </div>
              <p className="hf-sheet-sub">
                {[detail.occupation, [detail.city, detail.province].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
              </p>

              {detail.about_me && (
                <p style={{ margin: '0 0 0.9rem', fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                  {detail.about_me}
                </p>
              )}

              <div className="pp-group-card" style={{ marginBottom: '1rem' }}>
                {rows.map(([k, v]) => (
                  <div className="pp-row pp-row-static" key={k}>
                    <span className="pp-row-body">
                      <small>{k}</small>
                      <strong style={{ whiteSpace: 'normal' }}>{v}</strong>
                    </span>
                  </div>
                ))}
              </div>

              <Link
                href={`/portal/member/matrimony/profile/${detail.id}`}
                className="pp-sheet-save"
                style={{ textDecoration: 'none' }}
              >
                See the full profile
              </Link>
            </div>
          </div>
        );
      })()}

      {/* ---- Match overlay ---- */}
      {match && (
        <div
          role="dialog" aria-modal="true" aria-label="It is a match"
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '1.4rem', padding: '2rem 1.25rem calc(2rem + var(--sab))',
            background: 'radial-gradient(120% 70% at 50% 10%, rgba(188,223,106,0.16), transparent 60%), rgba(11,26,18,0.97)',
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {[{ url: myPhoto, name: mine.full_name }, { url: photoOf(match.card)?.url ?? null, name: match.card.full_name }].map((p, i) => (
              <span
                key={i}
                aria-hidden="true"
                style={{
                  display: 'grid', placeItems: 'center',
                  width: '5.5rem', height: '5.5rem', borderRadius: '50%',
                  marginLeft: i === 1 ? '-1.1rem' : 0,
                  border: '3px solid var(--lime-300, #bcdf6a)', overflow: 'hidden',
                  background: 'rgba(255,255,255,0.12)', color: '#fff',
                  fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800,
                }}
              >
                {p.url
                  ? <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : initialsOf(p.name)}
              </span>
            ))}
          </div>

          <div>
            <h2
              style={{
                color: '#fff', fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.9rem, 8vw, 2.5rem)', fontWeight: 800, margin: '0 0 0.4rem',
              }}
            >
              It&apos;s a match!
            </h2>
            <p style={{ margin: 0, fontSize: '0.95rem', color: 'rgba(255,255,255,0.8)' }}>
              You and {displayName(match.card.full_name, match.card.display_pref)} both said yes.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: '20rem' }}>
            {match.conversationId ? (
              <Link
                href={`/portal/member/chats?c=${match.conversationId}`}
                className="pp-sheet-save"
                style={{ textDecoration: 'none' }}
              >
                <MessageCircle size={17} aria-hidden="true" /> Say hello
              </Link>
            ) : (
              <Link href="/portal/member/chats" className="pp-sheet-save" style={{ textDecoration: 'none' }}>
                <MessageCircle size={17} aria-hidden="true" /> Open your chats
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMatch(null)}
              style={{
                minHeight: 44, border: 0, background: 'none',
                color: 'rgba(255,255,255,0.8)', font: 'inherit',
                fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer',
              }}
            >
              Keep swiping
            </button>
          </div>
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
