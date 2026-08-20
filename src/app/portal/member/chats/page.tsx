'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import {
  listPeople, followMember, unfollowMember, acceptFollowRequest, declineFollowRequest,
  listChats, openChat, pollThread, sendChatMessage, markChatRead, setTyping,
  respondReferral, publishMemberE2EKey, getMemberE2EKey,
} from '@/app/actions/chat';
import type { ChatPerson, ChatThread, ChatMessage, ThreadReferral } from '@/server/repos/chat';
import {
  e2eeAvailable, ensureLocalKeys, deriveConversationKey, encryptText, decryptText,
} from '@/lib/e2ee';
import { useApp } from '@/context/app-context';
import { useConfirm } from '@/components/portal/confirm';
import PortalLoading from '@/components/portal/PortalLoading';
import {
  ArrowLeft, AlertCircle, Building2, Check, CheckCheck, Heart, ImagePlus, Info,
  Loader2, Lock, LockOpen, MessageCircle, Plus, Send, ShieldCheck, UserX, X,
} from 'lucide-react';

/**
 * Member chat. On phones this is a native-feeling full-height messenger: the
 * thread bleeds past the content area's padding (the .pp-hero trick), its
 * header is the only chrome — and the only back control — and the composer sits
 * directly above the app tab bar. Above 768px the same thread lives in the
 * right column of a two-pane shell with no card of its own.
 *
 * Follows are REQUESTS. A chat unlocks on a mutual accepted follow, a matrimony
 * match, or a referral request; `open === false` means whatever unlocked it went
 * away, so the history stays readable and the composer is replaced by the
 * reason. RLS enforces all of that again — nothing here is access control.
 *
 * Encryption: the device keypair lives in localStorage, the public half is
 * published once per mount, and a conversation key is derived from the peer's
 * published key. With a key, text goes out as { cipher, iv } and the header says
 * so; without one it goes out as plaintext and the header says that instead.
 * Images are NOT encrypted — they go to Blob storage as files — and the composer
 * says so out loud rather than letting the lock icon imply otherwise.
 *
 * One poll (`pollThread`, 5s) carries messages, the open flag, the peer's typing
 * heartbeat and live referral status. Decrypted text is cached by message id so
 * a poll re-renders without re-decrypting.
 */

const HAIRLINE = '1px solid rgba(27,67,50,0.08)';
const GROUP_GAP_MS = 5 * 60 * 1000;
const MUTUAL_ERROR = 'You can only chat while you follow each other.';
const TYPING_EVERY_MS = 2500;
const TYPING_FRESH_MS = 6000;

/** .portal-content-area padding, to be negated — same bleed as .pp-hero. */
const PAD_X = 'clamp(1rem, 2.5vw, 2rem)';
const PAD_TOP = 'calc(clamp(1.25rem, 3vw, 2.5rem) + var(--sat))';
/** What the content area reserves for the fixed tab bar. */
const TABBAR = 'calc(4.5rem + var(--sab))';
const DESK_H = 'calc(100dvh - 13rem)';

type Lane = 'requests' | 'suggestions' | 'following' | 'followers';
type People = Record<Lane, ChatPerson[]>;
const NO_PEOPLE: People = { requests: [], suggestions: [], following: [], followers: [] };
const LANES: { id: Lane; label: string }[] = [
  { id: 'requests', label: 'Requests' },
  { id: 'suggestions', label: 'Suggestions' },
  { id: 'following', label: 'Following' },
  { id: 'followers', label: 'Followers' },
];

const EMPTY_LANE: Record<Lane, string> = {
  requests: 'No one is waiting on you. Requests to follow you show up here.',
  suggestions: 'No one new to suggest right now. Check back once more members join your city.',
  following: 'You are not following anyone yet. Start with Suggestions.',
  followers: 'Nobody follows you yet. Following people is how they find you.',
};

const fullName = (first: string, last: string) => `${first} ${last}`.trim() || 'Member';

const initialsOf = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';

const isMutual = (p: ChatPerson) => p.outgoing === 'accepted' && p.incoming === 'accepted';

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

/**
 * Image upload, byte-for-byte the community composer's route: straight to Blob
 * storage, with the dev-only local-disk endpoint as the fallback when no Blob
 * store is configured. The server refuses any URL from anywhere else.
 */
async function uploadImage(file: File): Promise<string> {
  try {
    const blob = await upload(file.name, file, {
      access: 'public',
      handleUploadUrl: '/api/community/upload',
      clientPayload: 'image',
    });
    return blob.url;
  } catch (error) {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/community/upload-dev', { method: 'POST', body: form });
    if (res.status === 404) throw error;
    if (!res.ok) throw new Error('Upload failed');
    const data = (await res.json()) as { url: string };
    return data.url;
  }
}

/** Initials only. No photos in chat — the member directory does not carry them. */
function Avatar({ name, size }: { name: string; size: number }) {
  return (
    <span
      className="hf-member-avatar"
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size < 40 ? '0.76rem' : '0.85rem' }}
    >
      {initialsOf(name)}
    </span>
  );
}

export default function MemberChatsPage() {
  const { currentUserId } = useApp();
  const confirm = useConfirm();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [threads, setThreads] = useState<ChatThread[]>([]);

  const [openId, setOpenId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [pollOpen, setPollOpen] = useState<boolean | null>(null);
  const [peerTypingAt, setPeerTypingAt] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<ThreadReferral[]>([]);
  const [refBusy, setRefBusy] = useState<string | null>(null);

  const [convKey, setConvKey] = useState<CryptoKey | null>(null);
  const convKeyRef = useRef<CryptoKey | null>(null);
  const [keyProbe, setKeyProbe] = useState(0);
  const [plain, setPlain] = useState<Record<string, string | null>>({});
  const [noteOpen, setNoteOpen] = useState(true);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [imageNote, setImageNote] = useState(false);

  const [people, setPeople] = useState<People>(NO_PEOPLE);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [lane, setLane] = useState<Lane>('suggestions');
  const [peopleError, setPeopleError] = useState('');
  /**
   * People who left Suggestions the moment their request was sent. The refetch
   * is authoritative, but a row that vanishes under your thumb reads as a
   * failure — these stay put, showing "Requested", until the sheet closes.
   */
  const [sticky, setSticky] = useState<ChatPerson[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [isWide, setIsWide] = useState(false);
  // Read after mount, never during render: e2eeAvailable() is false on the
  // server (no localStorage) and true in the browser, which is a hydration
  // mismatch if it reaches the first paint.
  const [e2eeOk, setE2eeOk] = useState(false);

  const publishedRef = useRef(false);
  const markingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const nearBottomRef = useRef(true);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const typingAtRef = useRef(0);
  /** The open thread's poll, so a referral answer can refresh without a reload. */
  const pollRef = useRef<(() => Promise<void>) | null>(null);

  const openThread = threads.find((t) => t.id === openId) ?? null;
  const peerId = openThread?.partnerId ?? null;
  const threadOpen = pollOpen ?? openThread?.open ?? false;

  const refreshChats = useCallback(async () => {
    const res = await listChats();
    if (res.ok) setThreads(res.data);
    return res.ok;
  }, []);

  const refreshPeople = useCallback(async () => {
    const res = await listPeople();
    if (res.ok) setPeople(res.data);
    else setPeopleError(res.error);
  }, []);

  // ---- Load: chats, people, deep link ---------------------------------------
  // People come down with the first load, not lazily on sheet open: the sheet
  // then opens instantly, and a frozen thread can say WHO broke the follow.
  useEffect(() => {
    let alive = true;
    (async () => {
      const [chats, folk] = await Promise.all([listChats(), listPeople()]);
      if (!alive) return;
      if (!chats.ok) { setError(chats.error); setLoading(false); return; }
      if (folk.ok) {
        setPeople(folk.data);
        if (folk.data.requests.length > 0) setLane('requests');
      }
      setThreads(chats.data);
      setLoading(false);

      // ?c={conversationId} deep link, honoured once the list is known.
      const want = new URLSearchParams(window.location.search).get('c');
      if (want && chats.data.some((t) => t.id === want)) setOpenId(want);
    })();
    return () => { alive = false; };
  }, []);

  // ---- Publish this device's public key, once -------------------------------
  useEffect(() => {
    if (!currentUserId || publishedRef.current) return;
    publishedRef.current = true;
    (async () => {
      const keys = await ensureLocalKeys(currentUserId);
      if (keys) void publishMemberE2EKey(keys.publicJwk); // fire and forget
    })();
  }, [currentUserId]);

  // ---- Client environment: two panes above 768px, crypto support ------------
  useEffect(() => {
    setE2eeOk(e2eeAvailable());
    const mq = window.matchMedia('(min-width: 768px)');
    const apply = () => setIsWide(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // ---- Chat list: keep previews and unread counts current -------------------
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void refreshChats();
    }, 10000);
    return () => clearInterval(timer);
  }, [refreshChats]);

  // ---- Thread: one poll for everything, every 5s ----------------------------
  useEffect(() => {
    if (!openId) { setMessages([]); pollRef.current = null; return; }
    let alive = true;
    setThreadLoading(true);
    setSendError('');
    nearBottomRef.current = true;

    const load = async () => {
      const r = await pollThread(openId);
      if (!alive) return;
      if (r.ok) {
        // A peer can publish their key MID-conversation (their first visit to
        // this page). If encrypted messages exist and we hold no key, poke the
        // derivation effect to look the key up again.
        if (!convKeyRef.current && r.data.messages.some((m) => m.body == null && m.cipher)) {
          setKeyProbe((n) => n + 1);
        }
        // Merge rather than replace: a just-sent message can be newer than the
        // poll that is already in flight.
        setMessages((prev) => {
          const ids = new Set(r.data.messages.map((m) => m.id));
          const extra = prev.filter((m) => !ids.has(m.id));
          return extra.length ? [...r.data.messages, ...extra] : r.data.messages;
        });
        setPollOpen(r.data.open);
        setPeerTypingAt(r.data.peerTypingAt);
        setReferrals(r.data.referrals);
      } else {
        setError(r.error);
      }
      setThreadLoading(false);
    };

    pollRef.current = load;
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 5000);
    return () => { alive = false; clearInterval(timer); };
  }, [openId]);

  // ---- Thread: reset per-thread state when switching threads ----------------
  useEffect(() => {
    setConvKey(null);
    convKeyRef.current = null;
    setNoteOpen(true);
    setPollOpen(null);
    setPeerTypingAt(null);
    setReferrals([]);
    setImageNote(false);
    typingAtRef.current = 0;
  }, [openId]);

  // ---- Thread: derive the conversation key ----------------------------------
  // keyProbe re-fires this when encrypted messages arrive while we hold no
  // key — the peer may have published theirs after this thread was opened.
  useEffect(() => {
    if (!openId || !peerId || !currentUserId || !e2eeAvailable()) return;
    if (convKeyRef.current) return;

    let alive = true;
    (async () => {
      const mine = await ensureLocalKeys(currentUserId);
      if (!mine || !alive) return;
      const theirs = await getMemberE2EKey(peerId);
      if (!alive || !theirs.ok || !theirs.data) return; // peer has no key yet
      const key = await deriveConversationKey(currentUserId, peerId, theirs.data);
      if (alive && key) { convKeyRef.current = key; setConvKey(key); }
    })();
    return () => { alive = false; };
  }, [openId, peerId, currentUserId, keyProbe]);

  // ---- Decrypt what is new, cached by message id ----------------------------
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

  // ---- Clear their unread while the thread is open --------------------------
  // Not "once per thread": messages that land WHILE you are reading are read
  // too, and a badge on the thread you are staring at is a lie. The refresh
  // zeroes the count, so this settles after one call per batch; markingRef only
  // stops a second poll from firing before that refresh lands.
  useEffect(() => {
    if (!openId || !openThread || openThread.unread === 0 || markingRef.current) return;
    markingRef.current = true;
    void markChatRead(openId)
      .then(() => refreshChats())
      .finally(() => { markingRef.current = false; });
  }, [openId, openThread, refreshChats]);

  // ---- Stay pinned to the bottom, but only if we were already there ---------
  useEffect(() => {
    if (!nearBottomRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
  }, [messages, plain, openId, peerTypingAt]);

  // ---- The open sheet locks background scroll, same as every other sheet ----
  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeSheet(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [sheetOpen]);

  function openConversation(id: string) {
    setOpenId(id);
    setDraft('');
    if (taRef.current) taRef.current.style.height = 'auto';
  }

  function closeSheet() {
    setSheetOpen(false);
    setSticky([]);
  }

  // ---- Follow graph --------------------------------------------------------
  /** Every mutation ends the same way: the server is asked again. */
  async function mutate(id: string, run: () => Promise<{ ok: boolean; error?: string }>, said: string) {
    setPeopleError('');
    setBusyId(id);
    const res = await run();
    if (!res.ok) {
      setPeopleError(res.error ?? 'That did not work. Please try again.');
      setBusyId(null);
      return false;
    }
    await Promise.all([refreshPeople(), refreshChats()]);
    setBusyId(null);
    setToast(said);
    return true;
  }

  async function sendRequest(p: ChatPerson) {
    const ok = await mutate(p.id, () => followMember(p.id), 'Request sent');
    // Keep them where they were, now reading "Requested".
    if (ok) setSticky((s) => [{ ...p, outgoing: 'pending' }, ...s.filter((x) => x.id !== p.id)]);
  }

  async function cancelRequest(p: ChatPerson) {
    await mutate(p.id, () => unfollowMember(p.id), 'Request withdrawn');
    setSticky((s) => s.filter((x) => x.id !== p.id));
  }

  async function stopFollowing(p: ChatPerson) {
    // Dropping a mutual freezes a live chat, which is worth one question.
    const ok = await confirm({
      title: `Unfollow ${fullName(p.firstName, p.lastName)}?`,
      message: 'Your chat stays readable but freezes until you follow each other again.',
      confirmLabel: 'Unfollow',
      tone: 'danger',
    });
    if (!ok) return;
    await mutate(p.id, () => unfollowMember(p.id), 'Unfollowed');
  }

  async function messagePerson(p: ChatPerson) {
    setPeopleError('');
    setBusyId(p.id);
    const res = await openChat(p.id);
    if (!res.ok) { setPeopleError(res.error); setBusyId(null); return; }
    // The list must know the conversation before the thread pane can find it.
    await refreshChats();
    setBusyId(null);
    closeSheet();
    openConversation(res.data);
  }

  async function followAgain(partnerId: string) {
    setSendError('');
    const res = await followMember(partnerId);
    if (!res.ok) { setSendError(res.error); return; }
    await Promise.all([refreshChats(), refreshPeople()]);
    setToast('Request sent');
  }

  // ---- Referral cards ------------------------------------------------------
  async function answerReferral(requestId: string, accept: boolean) {
    setSendError('');
    setRefBusy(requestId);
    const res = await respondReferral(requestId, accept);
    if (!res.ok) setSendError(res.error);
    else await Promise.all([pollRef.current?.() ?? Promise.resolve(), refreshChats()]);
    setRefBusy(null);
  }

  // ---- Composer ------------------------------------------------------------
  /** Heartbeat, never per keystroke: the peer polls every 5s anyway. */
  function pingTyping() {
    if (!openId) return;
    const now = Date.now();
    if (now - typingAtRef.current < TYPING_EVERY_MS) return;
    typingAtRef.current = now;
    void setTyping(openId);
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

    const res = await sendChatMessage(openId, payload);
    if (res.ok) {
      // Seed the cache with what we just typed: no decrypt round trip, no flash
      // of the placeholder on our own bubble.
      if (convKey) setPlain((p) => ({ ...p, [res.data.id]: text }));
      setDraft('');
      if (taRef.current) taRef.current.style.height = 'auto';
      nearBottomRef.current = true;
      setMessages((prev) => [...prev, res.data]);
      void refreshChats();
    } else {
      setSendError(res.error); // keep what they typed
      // The follow broke under us; the list will now show the thread frozen.
      if (res.error === MUTUAL_ERROR) void refreshChats();
    }
    setSending(false);
  }

  async function pickImage(file: File | undefined) {
    if (!file || !openId || uploading) return;
    setImageNote(true);
    setSendError('');
    setUploading(true);
    try {
      const url = await uploadImage(file);
      const res = await sendChatMessage(openId, { attachmentUrl: url });
      if (res.ok) {
        nearBottomRef.current = true;
        setMessages((prev) => [...prev, res.data]);
        void refreshChats();
      } else {
        setSendError(res.error);
        if (res.error === MUTUAL_ERROR) void refreshChats();
      }
    } catch {
      setSendError('That photo could not be uploaded. Please try again.');
    }
    setUploading(false);
  }

  if (loading) return <PortalLoading label="Loading chats" />;

  // ---- Chat list -----------------------------------------------------------
  const listRows = threads.map((t) => {
    const name = fullName(t.partnerFirstName, t.partnerLastName);
    const active = t.id === openId;
    const preview = t.lastKind === 'image'
      ? '📷 Photo'
      : t.lastKind === 'referral'
        ? 'Referral request'
        : t.lastCipher
          ? '🔒 Encrypted message'
          : t.lastBody ?? (t.open ? 'No messages yet — say hello' : null);
    const contextChip = t.context === 'referral' ? 'Referral' : t.context === 'matrimony' ? 'Match' : null;

    return (
      <button
        key={t.id}
        type="button"
        className="pp-row"
        onClick={() => openConversation(t.id)}
        aria-current={active ? 'true' : undefined}
        style={active ? { background: 'var(--bg-secondary)', boxShadow: 'inset 3px 0 0 var(--green-800)' } : undefined}
      >
        <Avatar name={name} size={42} />
        <span className="pp-row-body">
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <strong style={{ flex: 1, minWidth: 0 }}>{name}</strong>
            {contextChip && (
              <span className="pp-chip" style={{
                flexShrink: 0, background: 'var(--green-50)', color: 'var(--green-800)',
              }}>
                {contextChip}
              </span>
            )}
            {t.context === 'follow' && !t.open && (
              <span className="pp-chip" style={{
                flexShrink: 0, background: 'var(--bg-secondary)', border: HAIRLINE, color: 'var(--text-muted)',
              }}>
                Follow broke
              </span>
            )}
            <small style={{ flexShrink: 0, fontWeight: 650 }}>{timeAgo(t.lastMessageAt)}</small>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
            <small style={{
              flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontWeight: t.unread > 0 ? 750 : 500,
              color: t.unread > 0 ? 'var(--text-secondary)' : 'var(--text-muted)',
            }}>
              {t.lastFromMe && preview ? `You: ${preview}` : preview ?? t.partnerJobTitle}
            </small>
            {t.unread > 0 && (
              <span
                aria-label={`${t.unread} unread`}
                style={{
                  flexShrink: 0, minWidth: 20, padding: '1px 6px', borderRadius: 99,
                  background: 'var(--primary-700)', color: '#fff',
                  fontSize: '0.7rem', fontWeight: 800, textAlign: 'center',
                }}
              >
                {t.unread > 99 ? '99+' : t.unread}
              </span>
            )}
          </span>
        </span>
      </button>
    );
  });

  const emptyList = (
    <div className="pp-group-card" style={{ textAlign: 'center', padding: '2.5rem 1.25rem' }}>
      <MessageCircle size={28} aria-hidden="true" style={{ opacity: 0.35 }} />
      <p style={{ margin: '0.8rem 0 0.35rem', fontSize: '0.95rem', fontWeight: 700 }}>
        No chats yet
      </p>
      <p style={{ margin: '0 0 1.1rem', fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        Ask to follow anyone you like. The moment they accept and follow you back, a chat unlocks between you.
      </p>
      <button type="button" className="btn btn-primary" onClick={() => setSheetOpen(true)}>
        Find people
      </button>
    </div>
  );

  // ---- Thread --------------------------------------------------------------
  let threadPane: React.ReactNode = null;
  if (openThread) {
    const name = fullName(openThread.partnerFirstName, openThread.partnerLastName);
    const partnerId = openThread.partnerId;
    const firstName = name.split(' ')[0];
    // Frozen: if I am the one who stopped following, asking again fixes it. If
    // they dropped me, nothing I can press will reopen this, so nothing is
    // offered — a hopeful button would be a lie.
    const iBrokeIt = !threadOpen
      && openThread.context === 'follow'
      && !people.following.some((p) => p.id === partnerId);
    const peerTyping = peerTypingAt != null
      && Date.now() - new Date(peerTypingAt).getTime() < TYPING_FRESH_MS;

    const contextLine = !threadOpen
      ? <><UserX size={12} aria-hidden="true" /> Frozen — this chat is no longer open</>
      : openThread.context === 'referral'
        ? <><Building2 size={12} aria-hidden="true" /> Referral request</>
        : openThread.context === 'matrimony'
          ? <><Heart size={12} aria-hidden="true" /> Matrimony match</>
          : convKey
            ? <><ShieldCheck size={12} aria-hidden="true" /> End-to-end encrypted</>
            : <><LockOpen size={12} aria-hidden="true" /> Encrypting once {firstName} opens their chats</>;

    threadPane = (
      <div
        style={{
          display: 'flex', flexDirection: 'column', minWidth: 0,
          background: 'var(--bg-primary)',
          ...(isWide
            ? { height: '100%', minHeight: '22rem' }
            : {
              // Bleed past .portal-content-area's padding, the .pp-hero trick,
              // and reserve exactly what it reserves for the tab bar.
              margin: `calc(-1 * ${PAD_TOP}) calc(-1 * ${PAD_X}) 0`,
              height: `calc(100dvh - ${TABBAR})`,
            }),
        }}
      >
        {/* Header: the one back control, identity, then why this chat exists */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
          padding: isWide ? '0.6rem 0.9rem' : 'calc(0.5rem + var(--sat)) 0.6rem 0.5rem',
          borderBottom: HAIRLINE,
        }}>
          {!isWide && (
            <button
              type="button"
              onClick={() => setOpenId(null)}
              aria-label="Back to all chats"
              style={{
                display: 'grid', placeItems: 'center', width: 44, height: 44, flexShrink: 0,
                border: 0, borderRadius: '50%', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
              }}
            >
              <ArrowLeft size={20} aria-hidden="true" />
            </button>
          )}
          <Avatar name={name} size={38} />
          <span className="pp-row-body">
            <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</strong>
            <small style={{
              display: 'flex', alignItems: 'center', gap: 4, fontWeight: 750,
              color: threadOpen && convKey && openThread.context === 'follow'
                ? 'var(--success-600)'
                : 'var(--text-muted)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {contextLine}
            </small>
          </span>
          {openThread.partnerJobTitle && isWide && (
            <small style={{
              flexShrink: 0, maxWidth: '12rem', fontSize: '0.76rem', color: 'var(--text-muted)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {openThread.partnerJobTitle}
            </small>
          )}
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
                Messages you type are locked to your devices. No one else — not even
                Professionals Club — can read them. Photos are private, but not encrypted.
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
              <MessageCircle size={24} aria-hidden="true" style={{ opacity: 0.35 }} />
              <p style={{ margin: '0.6rem 0 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                This chat is open. Say what you are working on.
              </p>
            </div>
          )}

          {messages.map((m, i) => {
            const mine = m.senderId === currentUserId;
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const day = dayLabel(m.createdAt);
            const newDay = !prev || dayLabel(prev.createdAt) !== day;
            const groupEnd = !next
              || next.senderId !== m.senderId
              || dayLabel(next.createdAt) !== day
              || new Date(next.createdAt).getTime() - new Date(m.createdAt).getTime() > GROUP_GAP_MS;

            const encrypted = m.kind === 'text' && m.body == null;
            const decrypted = encrypted ? plain[m.id] : m.body;
            const pending = encrypted && convKey != null && !(m.id in plain);
            const readable = typeof decrypted === 'string';

            // Time + delivery state, on the bubble's own bottom-right line.
            const metaLine = (
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4,
                marginTop: 3, fontSize: '0.66rem', lineHeight: 1.1,
                color: mine ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)',
              }}>
                {encrypted && <Lock size={10} aria-hidden="true" style={{ opacity: 0.75 }} />}
                {clockTime(m.createdAt)}
                {mine && (m.readAt
                  ? <CheckCheck size={15} aria-hidden="true" style={{ color: 'var(--success-600)' }} />
                  : <Check size={15} aria-hidden="true" style={{ opacity: 0.8 }} />)}
                {mine && <span className="sr-only">{m.readAt ? 'Read' : 'Sent'}</span>}
              </span>
            );

            let bubble: React.ReactNode;
            if (m.kind === 'referral') {
              const meta = (m.meta ?? {}) as Record<string, unknown>;
              const requestId = typeof meta.request_id === 'string' ? meta.request_id : null;
              const live = referrals.find((r) => r.id === requestId) ?? null;
              const company = live?.companyName ?? (meta.company_name as string | undefined) ?? 'this company';
              const titles = live?.jobTitles ?? ((meta.job_titles as string[] | undefined) ?? []);
              const note = live?.note ?? (meta.note as string | null | undefined) ?? null;
              const iAmInsider = live != null && live.insiderId === currentUserId;
              const busy = requestId != null && refBusy === requestId;

              bubble = (
                <div style={{
                  padding: '0.7rem 0.8rem', borderRadius: '1rem',
                  background: 'var(--bg-primary)', border: HAIRLINE, maxWidth: '100%',
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Building2 size={15} aria-hidden="true" style={{ color: 'var(--primary-600)', flexShrink: 0 }} />
                    <strong style={{ fontSize: '0.9rem', fontWeight: 800, overflowWrap: 'anywhere' }}>{company}</strong>
                  </span>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {iAmInsider ? 'Asked you for a referral' : 'You asked for a referral'}
                  </p>
                  {titles.length > 0 && (
                    <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: '0.45rem' }}>
                      {titles.map((t) => (
                        <span key={t} className="pp-chip" style={{ background: 'var(--bg-secondary)', border: HAIRLINE, color: 'var(--text-secondary)' }}>
                          {t}
                        </span>
                      ))}
                    </span>
                  )}
                  {note && (
                    <p style={{
                      margin: '0.5rem 0 0', fontSize: '0.82rem', lineHeight: 1.45,
                      color: 'var(--text-secondary)', fontStyle: 'italic', overflowWrap: 'anywhere',
                    }}>
                      “{note}”
                    </p>
                  )}

                  {live?.status === 'pending' && requestId && (
                    iAmInsider ? (
                      <span style={{ display: 'flex', gap: 8, marginTop: '0.7rem' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          style={{ minHeight: 44 }}
                          disabled={busy}
                          onClick={() => void answerReferral(requestId, true)}
                        >
                          {busy ? <Loader2 size={14} className="spin" aria-hidden="true" /> : 'Accept'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          style={{ minHeight: 44 }}
                          disabled={busy}
                          onClick={() => void answerReferral(requestId, false)}
                        >
                          Decline
                        </button>
                      </span>
                    ) : (
                      <span className="pp-chip" style={{
                        marginTop: '0.6rem', background: 'var(--bg-secondary)', border: HAIRLINE, color: 'var(--text-muted)',
                      }}>
                        Waiting for a reply
                      </span>
                    )
                  )}
                  {live?.status === 'accepted' && (
                    <span className="pp-chip" style={{
                      marginTop: '0.6rem', background: 'rgba(0,168,107,0.10)', color: 'var(--success-600)',
                    }}>
                      <Check size={12} aria-hidden="true" /> Accepted — they&apos;ll help
                    </span>
                  )}
                  {live?.status === 'declined' && (
                    <span className="pp-chip" style={{
                      marginTop: '0.6rem', background: 'var(--bg-secondary)', border: HAIRLINE, color: 'var(--text-muted)',
                    }}>
                      Declined
                    </span>
                  )}
                  <span style={{
                    display: 'block', marginTop: 6, fontSize: '0.66rem', color: 'var(--text-muted)', textAlign: 'right',
                  }}>
                    {clockTime(m.createdAt)}
                  </span>
                </div>
              );
            } else if (m.kind === 'image' && m.attachmentUrl) {
              bubble = (
                <div style={{
                  padding: 4,
                  borderRadius: mine ? '1.1rem 1.1rem 0.3rem 1.1rem' : '1.1rem 1.1rem 1.1rem 0.3rem',
                  background: mine ? 'var(--green-950)' : 'var(--bg-primary)',
                  border: mine ? '1px solid transparent' : HAIRLINE,
                }}>
                  <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                    <img
                      src={m.attachmentUrl}
                      alt={mine ? 'Photo you sent' : `Photo from ${firstName}`}
                      style={{ display: 'block', maxWidth: 240, width: '100%', height: 'auto', borderRadius: 14 }}
                    />
                  </a>
                  <span style={{ display: 'block', padding: '0 4px' }}>{metaLine}</span>
                </div>
              );
            } else {
              bubble = (
                <div style={{
                  padding: '0.55rem 0.8rem',
                  borderRadius: mine ? '1.1rem 1.1rem 0.3rem 1.1rem' : '1.1rem 1.1rem 1.1rem 0.3rem',
                  background: mine ? 'var(--green-950)' : 'var(--bg-primary)',
                  color: mine ? '#fff' : 'var(--text-primary)',
                  border: mine ? '1px solid transparent' : HAIRLINE,
                  fontSize: '0.9rem', lineHeight: 1.45, overflowWrap: 'anywhere',
                }}>
                  {readable || !encrypted ? decrypted : (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5, fontStyle: 'italic',
                      color: mine ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)',
                    }}>
                      <Lock size={11} aria-hidden="true" style={{ opacity: 0.6, flexShrink: 0 }} />
                      {pending ? 'Decrypting…' : 'Encrypted message — sent before this device joined'}
                    </span>
                  )}
                  {metaLine}
                </div>
              );
            }

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
                  display: 'flex', flexDirection: 'column',
                  maxWidth: m.kind === 'referral' ? '90%' : '78%',
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                  alignItems: mine ? 'flex-end' : 'flex-start',
                  marginBottom: groupEnd ? 10 : 3,
                }}>
                  {bubble}
                </div>
              </React.Fragment>
            );
          })}

          {peerTyping && (
            <div style={{
              alignSelf: 'flex-start', marginBottom: 10,
              padding: '0.5rem 0.8rem', borderRadius: '1.1rem 1.1rem 1.1rem 0.3rem',
              background: 'var(--bg-primary)', border: HAIRLINE,
              fontSize: '0.84rem', fontStyle: 'italic', color: 'var(--text-muted)',
            }} role="status">
              {firstName} is typing…
            </div>
          )}
        </div>

        {/* Composer, or the reason there isn't one */}
        {/* The container's height already ends above the tab bar's reserved
            band (which carries --sab), so the composer needs no inset of its own. */}
        <div style={{ flexShrink: 0, borderTop: HAIRLINE, background: 'var(--bg-primary)' }}>
          {sendError && (
            <div role="alert" className="community-error" style={{ margin: '0.6rem 0.75rem 0' }}>
              <AlertCircle size={15} aria-hidden="true" /> {sendError}
            </div>
          )}
          {threadOpen ? (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, padding: '0.6rem' }}>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  aria-label="Choose a photo to send"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    void pickImage(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  aria-label="Send a photo"
                  disabled={uploading}
                  style={{
                    display: 'grid', placeItems: 'center', flexShrink: 0,
                    width: 44, height: 44, border: 0, borderRadius: '50%',
                    background: 'var(--bg-secondary)', color: 'var(--green-800)',
                    cursor: uploading ? 'default' : 'pointer',
                  }}
                >
                  {uploading
                    ? <Loader2 size={18} className="spin" aria-hidden="true" />
                    : <ImagePlus size={18} aria-hidden="true" />}
                </button>
                <label htmlFor="chat-composer" className="sr-only">Message {name}</label>
                <textarea
                  id="chat-composer"
                  ref={taRef}
                  rows={1}
                  value={draft}
                  placeholder={convKey ? 'Write an encrypted message' : 'Write a message'}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    if (e.target.value.trim()) pingTyping();
                    const el = e.currentTarget;
                    el.style.height = 'auto';
                    el.style.height = `${Math.min(el.scrollHeight, 112)}px`; // ~4 lines
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); }
                  }}
                  style={{
                    flex: 1, minWidth: 0, minHeight: 44, maxHeight: 112, resize: 'none',
                    padding: '0.65rem 1rem', border: '1.5px solid transparent', borderRadius: '1.4rem',
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
                    width: 44, height: 44, border: 0, borderRadius: '50%',
                    background: 'var(--primary-700)', color: '#fff',
                    cursor: !draft.trim() || sending ? 'default' : 'pointer',
                    opacity: !draft.trim() || sending ? 0.45 : 1,
                    transition: 'opacity 0.15s ease',
                  }}
                >
                  <Send size={18} aria-hidden="true" />
                </button>
              </div>
              {imageNote && (
                <p style={{
                  margin: 0, padding: '0 0.9rem 0.6rem', fontSize: '0.72rem',
                  color: 'var(--text-muted)', lineHeight: 1.4,
                }}>
                  Images are private but not end-to-end encrypted.
                </p>
              )}
            </>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              padding: '0.85rem 0.9rem',
            }}>
              <p style={{ margin: 0, flex: 1, minWidth: '12rem', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                This chat is frozen. It reopens when you follow each other again.
              </p>
              {iBrokeIt && (
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => void followAgain(partnerId)}
                  style={{ flexShrink: 0, minHeight: 44 }}
                >
                  Follow {firstName} again
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- People sheet --------------------------------------------------------
  const laneRows: ChatPerson[] = lane === 'suggestions'
    ? [...sticky.filter((s) => !people.suggestions.some((x) => x.id === s.id)), ...people.suggestions]
    : people[lane];

  const requestedPill = (p: ChatPerson, cancel: boolean) => (
    <button
      type="button"
      className="pp-toggle"
      onClick={cancel ? () => void cancelRequest(p) : undefined}
      disabled={!cancel || busyId === p.id}
      aria-label={cancel ? `Withdraw your follow request to ${fullName(p.firstName, p.lastName)}` : undefined}
      style={{ minHeight: 44, cursor: cancel ? 'pointer' : 'default', opacity: busyId === p.id ? 0.6 : 1 }}
    >
      <span className="pp-toggle-dot" aria-hidden="true" />
      Requested
    </button>
  );

  const sheet = sheetOpen && (
    <div className="hf-sheet-scrim" onClick={(e) => { if (e.target === e.currentTarget) closeSheet(); }}>
      <div className="hf-sheet pp-sheet" role="dialog" aria-modal="true" aria-label="People">
        <div className="hf-sheet-head">
          <h2>People</h2>
          <button type="button" className="portal-sheet-close" onClick={closeSheet} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <p className="hf-sheet-sub">
          Follows are requests. A chat unlocks once you have both accepted.
        </p>

        <div role="tablist" aria-label="People" style={{ display: 'flex', gap: 6, marginBottom: '0.6rem', flexWrap: 'wrap' }}>
          {LANES.map((l) => {
            const on = lane === l.id;
            const nudge = l.id === 'requests' && people.requests.length > 0 && !on;
            return (
              <button
                key={l.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setLane(l.id)}
                className="pp-chip"
                style={{
                  minHeight: 44, padding: '0 0.9rem',
                  border: on ? '1px solid transparent' : nudge ? '1px dashed rgba(232,93,4,0.45)' : HAIRLINE,
                  background: on ? 'var(--green-950)' : nudge ? 'rgba(232,93,4,0.08)' : 'var(--bg-secondary)',
                  color: on ? '#fff' : nudge ? 'var(--primary-800)' : 'var(--text-secondary)',
                  font: 'inherit', fontSize: '0.78rem', fontWeight: 750, cursor: 'pointer',
                }}
              >
                {l.label} ({people[l.id].length})
              </button>
            );
          })}
        </div>

        {peopleError && (
          <div role="alert" className="community-error" style={{ marginBottom: 10 }}>
            <AlertCircle size={15} aria-hidden="true" /> {peopleError}
          </div>
        )}

        {laneRows.length === 0 ? (
          <p style={{ margin: '1.2rem 0.2rem', fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {EMPTY_LANE[lane]}
          </p>
        ) : (
          <div className="pp-group-card" style={{ marginBottom: '0.4rem' }}>
            {laneRows.map((p) => {
              const pname = fullName(p.firstName, p.lastName);
              const busy = busyId === p.id;
              const meta = [p.jobTitle, p.city].filter(Boolean).join(' · ');
              const mutual = isMutual(p);

              return (
                <div key={p.id} className="pp-row pp-row-static">
                  <Avatar name={pname} size={40} />
                  <span className="pp-row-body">
                    <strong>{pname}</strong>
                    <small style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {meta || 'Member'}
                    </small>
                  </span>

                  {mutual && (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => void messagePerson(p)}
                      disabled={busy}
                      style={{ flexShrink: 0, minHeight: 44 }}
                    >
                      Message
                    </button>
                  )}

                  {lane === 'requests' && (
                    <>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => void mutate(p.id, () => acceptFollowRequest(p.id), 'Request accepted')}
                        disabled={busy}
                        style={{ flexShrink: 0, minHeight: 44 }}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-quiet"
                        onClick={() => void mutate(p.id, () => declineFollowRequest(p.id), 'Request declined')}
                        disabled={busy}
                        style={{ flexShrink: 0, minHeight: 44, paddingLeft: 8, paddingRight: 8 }}
                      >
                        Decline
                      </button>
                    </>
                  )}

                  {lane === 'suggestions' && (
                    p.outgoing === 'pending'
                      ? requestedPill(p, false)
                      : (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => void sendRequest(p)}
                          disabled={busy}
                          style={{ flexShrink: 0, minHeight: 44 }}
                        >
                          Follow
                        </button>
                      )
                  )}

                  {lane === 'following' && (
                    p.outgoing === 'pending' ? requestedPill(p, true) : (
                      <button
                        type="button"
                        className="pp-toggle is-on"
                        onClick={() => void stopFollowing(p)}
                        aria-pressed
                        aria-label={`Unfollow ${pname}`}
                        disabled={busy}
                        style={{ minHeight: 44, opacity: busy ? 0.6 : 1 }}
                      >
                        <span className="pp-toggle-dot" aria-hidden="true" />
                        Following
                      </button>
                    )
                  )}

                  {lane === 'followers' && (
                    p.outgoing === 'none' ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => void mutate(p.id, () => followMember(p.id), 'Request sent')}
                        disabled={busy}
                        style={{ flexShrink: 0, minHeight: 44 }}
                      >
                        Follow back
                      </button>
                    ) : p.outgoing === 'pending' ? requestedPill(p, true) : null
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const toastNode = toast && (
    <div className="pp-toast" role="status">
      <Check size={15} aria-hidden="true" /> {toast}
    </div>
  );

  // ---- Phones: the thread IS the screen, edge to edge ----------------------
  if (!isWide && openThread) {
    return (
      <>
        {threadPane}
        {sheet}
        {toastNode}
      </>
    );
  }

  return (
    <div className="pp2" style={isWide ? { maxWidth: '64rem' } : undefined}>
      <header style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800,
            letterSpacing: '-0.01em', margin: '0 0 0.2rem',
          }}>
            Chats
          </h1>
          <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            {e2eeOk
              ? 'Chat with people who follow you back — messages are end-to-end encrypted once both devices have keys.'
              : 'Chat with people who follow you back.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setSheetOpen(true); setPeopleError(''); if (people.requests.length > 0) setLane('requests'); }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
            minHeight: 44, padding: '0 1.05rem', border: 0, borderRadius: 99,
            background: 'var(--primary-700)', color: '#fff',
            font: 'inherit', fontSize: '0.86rem', fontWeight: 800, cursor: 'pointer',
          }}
        >
          <Plus size={16} aria-hidden="true" /> People
          {people.requests.length > 0 && (
            <span style={{
              minWidth: 18, padding: '0 5px', borderRadius: 99,
              background: '#fff', color: 'var(--primary-800)',
              fontSize: '0.7rem', fontWeight: 800,
            }}>
              {people.requests.length}
            </span>
          )}
        </button>
      </header>

      {error && (
        <div role="alert" className="community-error" style={{ marginBottom: 12 }}>
          <AlertCircle size={15} aria-hidden="true" /> {error}
        </div>
      )}

      {isWide ? (
        <div
          className="pp-group-card"
          style={{
            display: 'grid', gridTemplateColumns: 'minmax(0, 19rem) minmax(0, 1fr)',
            height: DESK_H, minHeight: '24rem',
          }}
        >
          <div style={{ minWidth: 0, overflowY: 'auto', borderRight: HAIRLINE }}>
            {threads.length === 0
              ? (
                <div style={{ padding: '2rem 1.1rem', textAlign: 'center' }}>
                  <MessageCircle size={24} aria-hidden="true" style={{ opacity: 0.35 }} />
                  <p style={{ margin: '0.7rem 0 1rem', fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    No chats yet. A chat unlocks once you and someone else have accepted each other.
                  </p>
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => setSheetOpen(true)} style={{ minHeight: 44 }}>
                    Find people
                  </button>
                </div>
              )
              : listRows}
          </div>
          {threadPane ?? (
            <div style={{ display: 'grid', placeItems: 'center', padding: '2rem', textAlign: 'center', background: 'var(--bg-secondary)' }}>
              <div>
                <MessageCircle size={26} aria-hidden="true" style={{ opacity: 0.35 }} />
                <p style={{ margin: '0.7rem 0 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  Pick a chat to read it here.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        threads.length === 0 ? emptyList : <div className="pp-group-card">{listRows}</div>
      )}

      {sheet}
      {toastNode}
    </div>
  );
}
