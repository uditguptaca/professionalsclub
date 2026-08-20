'use client';
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  listConversations, listMessages, sendMatrimonyMessage, publishE2EKey, getE2EKey,
} from '@/app/actions/matrimony';
import {
  e2eeAvailable, ensureLocalKeys, deriveConversationKey, encryptText, decryptText,
} from '@/lib/e2ee';
import type { MatrimonyConversation, MatrimonyMessage, MatrimonyProfileCard } from '@/types/matrimony';
import MatrimonyTabs from '@/components/portal/MatrimonyTabs';
import PortalLoading from '@/components/portal/PortalLoading';
import {
  ArrowLeft, AlertCircle, Heart, Info, Lock, LockOpen, MessageCircle,
  Send, ShieldCheck, UserCheck, X,
} from 'lucide-react';

/**
 * Matrimony chat: a two-pane messenger (list + thread) that collapses to
 * list-or-thread below 768px.
 *
 * Encryption is the point of the screen. The device keypair lives in
 * localStorage (src/lib/e2ee.ts), the public half is published once per mount,
 * and a conversation key is derived per thread from the peer's published key.
 * When that key exists the message goes out as { cipher, iv } and the header
 * says so in green; when it does not, the message goes out as plaintext and the
 * header says that instead. The UI never claims more privacy than it has.
 *
 * Still polling every 5s: Neon has no push channel, and a websocket layer for
 * one screen is not worth the moving parts. Decrypted text is cached by message
 * id, so a poll re-renders without re-decrypting anything.
 */

interface PopulatedConversation extends MatrimonyConversation {
  otherProfile: MatrimonyProfileCard;
}

const HAIRLINE = '1px solid rgba(27,67,50,0.08)';
const GROUP_GAP_MS = 5 * 60 * 1000;

/** The module's privacy convention: members choose how much of a name shows. */
function displayName(card: MatrimonyProfileCard): string {
  const name = card.full_name || 'Member';
  if (card.display_pref === 'first_name') return name.split(' ')[0];
  if (card.display_pref === 'initials') return name.split(' ').map((w) => w[0]).join('').toUpperCase();
  return name;
}

const initialsOf = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';

function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return d.toLocaleDateString('en-CA', {
    month: 'short', day: 'numeric',
    year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
}

const clockTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function Avatar({ card, name, size }: { card: MatrimonyProfileCard; name: string; size: number }) {
  return (
    <span
      className="hf-member-avatar"
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size < 40 ? '0.76rem' : '0.85rem', overflow: 'hidden' }}
    >
      {card.primary_photo_url
        ? <img src={card.primary_photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initialsOf(name)}
    </span>
  );
}

export default function MatrimonyMessagesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [myProfileId, setMyProfileId] = useState<string | null>(null);

  const [conversations, setConversations] = useState<PopulatedConversation[]>([]);
  const [previews, setPreviews] = useState<Record<string, MatrimonyMessage | undefined>>({});
  const [previewsReady, setPreviewsReady] = useState(false);
  const [openedIds, setOpenedIds] = useState<string[]>([]);

  const [openId, setOpenId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MatrimonyMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);

  const [convKey, setConvKey] = useState<CryptoKey | null>(null);
  const convKeyRef = useRef<CryptoKey | null>(null);
  const [keyProbe, setKeyProbe] = useState(0);
  const [plain, setPlain] = useState<Record<string, string | null>>({});
  const [noteOpen, setNoteOpen] = useState(true);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const [isWide, setIsWide] = useState(false);
  // Read after mount, never during render: e2eeAvailable() is false on the
  // server (no localStorage) and true in the browser, which is a hydration
  // mismatch if it reaches the first paint.
  const [e2eeOk, setE2eeOk] = useState(false);

  const publishedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const nearBottomRef = useRef(true);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const openConv = conversations.find((c) => c.id === openId) ?? null;
  const peerId = openConv?.otherProfile.id ?? null;

  // ---- Load: conversations, deep link, previews -----------------------------
  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await listConversations();
      if (!alive) return;
      if (!res.ok) { setError(res.error); setLoading(false); return; }

      const convos = res.data.conversations as unknown as PopulatedConversation[];
      setMyProfileId(res.data.myProfileId);
      setConversations(convos);
      setLoading(false);

      // ?c={conversationId} deep link, honoured once the list is known.
      const want = new URLSearchParams(window.location.search).get('c');
      if (want && convos.some((c) => c.id === want)) {
        setOpenId(want);
        setOpenedIds([want]);
      }

      // ponytail: one listMessages per conversation for the previews, because
      // listConversations does not carry last_message. A match needs mutual
      // acceptance so N stays small; if the list ever paginates, join the last
      // message in the list query instead.
      const entries = await Promise.all(convos.map(async (c) => {
        const r = await listMessages(c.id);
        return [c.id, r.ok ? r.data[r.data.length - 1] : undefined] as const;
      }));
      if (!alive) return;
      setPreviews(Object.fromEntries(entries));
      setPreviewsReady(true);
    })();
    return () => { alive = false; };
  }, []);

  // ---- Publish this device's public key, once ------------------------------
  useEffect(() => {
    if (!myProfileId || publishedRef.current) return;
    publishedRef.current = true;
    (async () => {
      const keys = await ensureLocalKeys(myProfileId);
      if (keys) void publishE2EKey(keys.publicJwk); // fire and forget
    })();
  }, [myProfileId]);

  // ---- Client environment: two panes above 768px, crypto support -----------
  useEffect(() => {
    setE2eeOk(e2eeAvailable());
    const mq = window.matchMedia('(min-width: 768px)');
    const apply = () => setIsWide(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // ---- Thread: load + poll -------------------------------------------------
  useEffect(() => {
    if (!openId) { setMessages([]); return; }
    let alive = true;
    setThreadLoading(true);
    setSendError('');
    nearBottomRef.current = true;

    const load = async () => {
      const r = await listMessages(openId);
      if (!alive) return;
      if (r.ok) {
        // A peer can publish their key MID-conversation (their first visit to
        // this page). If encrypted messages exist and we hold no key, poke the
        // derivation effect to look the key up again.
        if (!convKeyRef.current && r.data.some((m) => m.body == null && m.cipher)) {
          setKeyProbe((n) => n + 1);
        }
        // Merge rather than replace: a just-sent message can be newer than the
        // poll that is already in flight.
        setMessages((prev) => {
          const ids = new Set(r.data.map((m) => m.id));
          const extra = prev.filter((m) => !ids.has(m.id));
          return extra.length ? [...r.data, ...extra] : r.data;
        });
        setPreviews((p) => ({ ...p, [openId]: r.data[r.data.length - 1] }));
      } else {
        setError(r.error);
      }
      setThreadLoading(false);
    };

    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 5000);
    return () => { alive = false; clearInterval(timer); };
  }, [openId]);

  // ---- Thread: reset the lock state when switching threads -----------------
  useEffect(() => {
    setConvKey(null);
    convKeyRef.current = null;
    setNoteOpen(true);
  }, [openId]);

  // ---- Thread: derive the conversation key ---------------------------------
  // keyProbe re-fires this when encrypted messages arrive while we hold no
  // key — the peer may have published theirs after this thread was opened.
  useEffect(() => {
    if (!openId || !peerId || !myProfileId || !e2eeAvailable()) return;
    if (convKeyRef.current) return;

    let alive = true;
    (async () => {
      const mine = await ensureLocalKeys(myProfileId);
      if (!mine || !alive) return;
      const theirs = await getE2EKey(peerId);
      if (!alive || !theirs.ok || !theirs.data) return; // peer has no key yet
      const key = await deriveConversationKey(myProfileId, peerId, theirs.data);
      if (alive && key) { convKeyRef.current = key; setConvKey(key); }
    })();
    return () => { alive = false; };
  }, [openId, peerId, myProfileId, keyProbe]);

  // ---- Decrypt what is new, cached by message id ---------------------------
  useEffect(() => {
    if (!convKey) return;
    const todo = messages.filter((m) => m.body == null && m.cipher && m.iv && !(m.id in plain));
    if (todo.length === 0) return;

    let alive = true;
    (async () => {
      const out: Record<string, string | null> = {};
      for (const m of todo) out[m.id] = await decryptText(convKey, m.cipher!, m.iv!);
      if (alive) setPlain((p) => ({ ...p, ...out }));
    })();
    return () => { alive = false; };
  }, [messages, convKey, plain]);

  // ---- Stay pinned to the bottom, but only if we were already there --------
  useEffect(() => {
    if (!nearBottomRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
  }, [messages, plain, openId]);

  function openConversation(id: string) {
    setOpenId(id);
    setOpenedIds((o) => (o.includes(id) ? o : [...o, id]));
    setDraft('');
    if (taRef.current) taRef.current.style.height = 'auto';
  }

  async function send() {
    const text = draft.trim();
    if (!text || !openId || sending) return;
    setSending(true);
    setSendError('');

    let payload: { body: string } | { cipher: string; iv: string };
    if (convKey) {
      const enc = await encryptText(convKey, text);
      if (!enc) {
        // Never silently downgrade to plaintext after promising a locked thread.
        setSendError('This device could not encrypt the message, so nothing was sent. Reload and try again.');
        setSending(false);
        return;
      }
      payload = enc;
    } else {
      payload = { body: text };
    }

    const res = await sendMatrimonyMessage(openId, payload);
    if (res.ok) {
      // Seed the cache with what we just typed: no decrypt round trip, no flash
      // of the placeholder on our own bubble.
      if (convKey) setPlain((p) => ({ ...p, [res.data.id]: text }));
      setDraft('');
      if (taRef.current) taRef.current.style.height = 'auto';
      nearBottomRef.current = true;
      setMessages((prev) => [...prev, res.data]);
      setPreviews((p) => ({ ...p, [openId]: res.data }));
    } else {
      setSendError(res.error); // keep what they typed
    }
    setSending(false);
  }

  if (loading) return <PortalLoading label="Loading chats" />;

  if (!myProfileId) {
    return (
      <div className="pp2">
        <MatrimonyTabs active="chats" />
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
          <Heart size={28} aria-hidden="true" style={{ opacity: 0.35, marginBottom: 12 }} />
          <p style={{ margin: '0 0 1.1rem', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
            Create a matrimony profile to message your matches.
          </p>
          <Link href="/portal/member/matrimony/create" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Create profile
          </Link>
        </div>
      </div>
    );
  }

  const threadHeight = isWide ? 'calc(100dvh - 14rem)' : 'calc(100dvh - 13rem)';

  // ---- Conversation list ---------------------------------------------------
  const listPane = conversations.length === 0 ? (
    <div className="pp-group-card" style={{ textAlign: 'center', padding: '2.5rem 1.25rem' }}>
      <MessageCircle size={28} aria-hidden="true" style={{ opacity: 0.35 }} />
      <p style={{ margin: '0.8rem 0 0.35rem', fontSize: '0.95rem', fontWeight: 700 }}>
        No chats yet
      </p>
      <p style={{ margin: '0 0 1.1rem', fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        A chat opens the moment you and someone else both say yes. Keep going through Discover and the first one will land here.
      </p>
      <Link href="/portal/member/matrimony" className="btn btn-primary" style={{ textDecoration: 'none' }}>
        Go to Discover
      </Link>
    </div>
  ) : (
    <div className="pp-group-card" style={isWide ? { maxHeight: threadHeight, overflowY: 'auto' } : undefined}>
      {conversations.map((c) => {
        const name = displayName(c.otherProfile);
        const last = previews[c.id];
        const active = c.id === openId;
        const fromPeer = last != null && last.sender_profile_id !== myProfileId;
        // ponytail: read_at is never stamped server-side, so "unread" means the
        // last word is theirs and this session has not opened the thread.
        const unread = fromPeer && !openedIds.includes(c.id);
        const body = last
          ? `${last.sender_profile_id === myProfileId ? 'You: ' : ''}${last.body ?? '🔒 Encrypted message'}`
          : previewsReady ? 'No messages yet — say hello' : c.otherProfile.occupation;

        return (
          <button
            key={c.id}
            type="button"
            className="pp-row"
            onClick={() => openConversation(c.id)}
            aria-current={active ? 'true' : undefined}
            style={active ? { background: 'var(--bg-secondary)', boxShadow: 'inset 3px 0 0 var(--green-800)' } : undefined}
          >
            <Avatar card={c.otherProfile} name={name} size={42} />
            <span className="pp-row-body">
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <strong style={{ flex: 1, minWidth: 0 }}>{name}</strong>
                {c.otherProfile.is_verified_id && (
                  <UserCheck size={13} aria-label="ID verified" style={{ color: 'var(--text-accent)', flexShrink: 0 }} />
                )}
                <small style={{ flexShrink: 0, fontWeight: 650 }}>{timeAgo(c.last_message_at)}</small>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                <small style={{
                  flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontWeight: unread ? 750 : 500, color: unread ? 'var(--text-secondary)' : 'var(--text-muted)',
                }}>
                  {body}
                </small>
                {unread && (
                  <span
                    role="img"
                    aria-label="Unread"
                    style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary-700)', flexShrink: 0 }}
                  />
                )}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );

  // ---- Thread ---------------------------------------------------------------
  let threadPane: React.ReactNode = null;
  if (openConv) {
    const name = displayName(openConv.otherProfile);

    threadPane = (
      <div className="pp-group-card" style={{ display: 'flex', flexDirection: 'column', height: threadHeight, minHeight: '22rem' }}>
        {/* Header: identity, then the honest encryption state */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, padding: '0.6rem 0.8rem', borderBottom: HAIRLINE }}>
          {isWide ? null : (
            <button
              type="button"
              onClick={() => setOpenId(null)}
              aria-label="Back to all chats"
              style={{
                display: 'grid', placeItems: 'center', width: 44, height: 44, flexShrink: 0,
                border: 0, borderRadius: '50%', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
              }}
            >
              <ArrowLeft size={18} aria-hidden="true" />
            </button>
          )}
          <Avatar card={openConv.otherProfile} name={name} size={38} />
          <span className="pp-row-body">
            <strong style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
              {openConv.otherProfile.is_verified_id && (
                <UserCheck size={13} aria-label="ID verified" style={{ color: 'var(--text-accent)', flexShrink: 0 }} />
              )}
            </strong>
            <small style={{
              display: 'flex', alignItems: 'center', gap: 4, fontWeight: 750,
              color: convKey ? 'var(--success-600)' : 'var(--text-muted)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {convKey
                ? <><ShieldCheck size={12} aria-hidden="true" /> End-to-end encrypted</>
                : <><LockOpen size={12} aria-hidden="true" /> Encrypting once {name} opens their chat</>}
            </small>
          </span>
          <Link
            href={`/portal/member/matrimony/profile/${openConv.otherProfile.id}`}
            className="btn btn-sm btn-outline"
            style={{ textDecoration: 'none', flexShrink: 0 }}
          >
            Profile
          </Link>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
          }}
          style={{
            flex: 1, minHeight: 0, overflowY: 'auto', background: 'var(--bg-secondary)',
            padding: '0.9rem 0.8rem', display: 'flex', flexDirection: 'column',
          }}
        >
          {convKey && noteOpen && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: '0.7rem',
              padding: '0.6rem 0.7rem', borderRadius: '0.85rem',
              background: 'rgba(0,168,107,0.08)', border: '1px solid rgba(0,168,107,0.20)',
            }}>
              <Info size={14} aria-hidden="true" style={{ color: 'var(--success-600)', flexShrink: 0, marginTop: 2 }} />
              <p style={{ margin: 0, flex: 1, fontSize: '0.76rem', lineHeight: 1.45, color: 'var(--text-secondary)' }}>
                Messages are locked to your devices. No one else — not even Professionals Club — can read them.
              </p>
              <button
                type="button"
                onClick={() => setNoteOpen(false)}
                aria-label="Dismiss encryption note"
                style={{
                  display: 'grid', placeItems: 'center', width: 32, height: 32, flexShrink: 0,
                  border: 0, borderRadius: '50%', background: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                }}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          )}

          {messages.length === 0 && !threadLoading && (
            <div style={{ margin: 'auto', textAlign: 'center', padding: '1.5rem 1rem' }}>
              <Heart size={24} aria-hidden="true" style={{ opacity: 0.35 }} />
              <p style={{ margin: '0.6rem 0 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                You both said yes. Open with a question about something on {name}&rsquo;s profile.
              </p>
            </div>
          )}

          {messages.map((m, i) => {
            const mine = m.sender_profile_id === myProfileId;
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const day = dayLabel(m.created_at);
            const newDay = !prev || dayLabel(prev.created_at) !== day;
            const groupEnd = !next
              || next.sender_profile_id !== m.sender_profile_id
              || dayLabel(next.created_at) !== day
              || new Date(next.created_at).getTime() - new Date(m.created_at).getTime() > GROUP_GAP_MS;

            const encrypted = m.body == null;
            const decrypted = encrypted ? plain[m.id] : m.body;
            const pending = encrypted && convKey != null && !(m.id in plain);
            const readable = typeof decrypted === 'string';

            return (
              <React.Fragment key={m.id}>
                {newDay && (
                  <span
                    className="pp-chip"
                    style={{
                      alignSelf: 'center', margin: '0.35rem 0 0.65rem', background: 'var(--bg-primary)',
                      border: HAIRLINE, color: 'var(--text-muted)',
                    }}
                  >
                    {day}
                  </span>
                )}
                <div style={{
                  display: 'flex', flexDirection: 'column', maxWidth: '78%',
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                  alignItems: mine ? 'flex-end' : 'flex-start',
                  marginBottom: groupEnd ? 10 : 3,
                }}>
                  <div style={{
                    padding: '0.55rem 0.8rem',
                    borderRadius: mine ? '1.1rem 1.1rem 0.3rem 1.1rem' : '1.1rem 1.1rem 1.1rem 0.3rem',
                    background: mine ? 'var(--green-950)' : 'var(--bg-primary)',
                    color: mine ? '#fff' : 'var(--text-primary)',
                    border: mine ? '1px solid transparent' : HAIRLINE,
                    fontSize: '0.9rem', lineHeight: 1.45, overflowWrap: 'anywhere',
                  }}>
                    {readable || !encrypted ? (
                      <>
                        {decrypted}
                        {encrypted && (
                          <Lock size={11} aria-hidden="true" style={{ opacity: 0.6, marginLeft: 5, verticalAlign: '-1px' }} />
                        )}
                      </>
                    ) : (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5, fontStyle: 'italic',
                        color: mine ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)',
                      }}>
                        <Lock size={11} aria-hidden="true" style={{ opacity: 0.6, flexShrink: 0 }} />
                        {pending ? 'Decrypting…' : 'Encrypted message — sent before this device joined'}
                      </span>
                    )}
                  </div>
                  {groupEnd && (
                    <span style={{ margin: '2px 5px 0', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {clockTime(m.created_at)}
                    </span>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Composer */}
        <div style={{ flexShrink: 0, borderTop: HAIRLINE, background: 'var(--bg-primary)' }}>
          {sendError && (
            <div role="alert" className="community-error" style={{ margin: '0.6rem 0.75rem 0' }}>
              <AlertCircle size={15} aria-hidden="true" /> {sendError}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '0.65rem 0.7rem' }}>
            <label htmlFor="matrimony-composer" className="sr-only">Message {name}</label>
            <textarea
              id="matrimony-composer"
              ref={taRef}
              rows={1}
              value={draft}
              placeholder={convKey ? 'Write an encrypted message' : 'Write a message'}
              onChange={(e) => {
                setDraft(e.target.value);
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = `${Math.min(el.scrollHeight, 112)}px`; // ~4 lines
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); }
              }}
              style={{
                flex: 1, minWidth: 0, minHeight: 46, maxHeight: 112, resize: 'none',
                padding: '0.7rem 1rem', border: '1.5px solid transparent', borderRadius: '1.4rem',
                background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                fontFamily: 'inherit', lineHeight: 1.4,
                /* 16px, or iOS zooms the page when the composer takes focus. */
                fontSize: '16px',
              }}
            />
            <button
              type="button"
              onClick={() => void send()}
              aria-label="Send message"
              disabled={!draft.trim() || sending}
              style={{
                display: 'grid', placeItems: 'center', flexShrink: 0,
                width: 46, height: 46, border: 0, borderRadius: '50%',
                background: 'var(--primary-700)', color: '#fff',
                cursor: !draft.trim() || sending ? 'default' : 'pointer',
                opacity: !draft.trim() || sending ? 0.45 : 1,
                transition: 'opacity 0.15s ease',
              }}
            >
              <Send size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Mobile: thread replaces the list -----------------------------------
  if (!isWide && openConv) {
    return (
      <div className="pp2">
        <button
          type="button"
          className="pp-chip"
          onClick={() => setOpenId(null)}
          style={{
            background: 'var(--bg-primary)', border: HAIRLINE, color: 'var(--text-secondary)',
            minHeight: 44, padding: '0 0.95rem', marginBottom: '0.9rem', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <ArrowLeft size={14} aria-hidden="true" /> All chats
        </button>
        {threadPane}
      </div>
    );
  }

  return (
    <div className="pp2" style={isWide ? { maxWidth: '62rem' } : undefined}>
      <MatrimonyTabs active="chats" />

      <header style={{ marginBottom: '1rem' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800,
          letterSpacing: '-0.01em', margin: '0 0 0.2rem',
        }}>
          Chats
        </h1>
        <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
          {e2eeOk
            ? 'Every chat is end-to-end encrypted once both devices have exchanged keys.'
            : 'A chat opens once you and someone else have both said yes.'}
        </p>
      </header>

      {error && (
        <div role="alert" className="community-error" style={{ marginBottom: 12 }}>
          <AlertCircle size={15} aria-hidden="true" /> {error}
        </div>
      )}

      {isWide ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 20rem) minmax(0, 1fr)', gap: '1rem', alignItems: 'start' }}>
          {listPane}
          {threadPane ?? (
            <div className="pp-group-card" style={{ display: 'grid', placeItems: 'center', height: threadHeight, padding: '2rem', textAlign: 'center' }}>
              <div>
                <MessageCircle size={26} aria-hidden="true" style={{ opacity: 0.35 }} />
                <p style={{ margin: '0.7rem 0 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  Pick a chat to read it here.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : listPane}
    </div>
  );
}
