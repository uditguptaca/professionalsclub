'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import {
  listPeople, followMember, unfollowMember, acceptFollowRequest, declineFollowRequest,
  listChats, openChat, pollThread, sendChatMessage, markChatRead, setTyping,
  respondReferral, publishMemberE2EKey, getMemberE2EKey,
  blockMember, unblockMember, listBlockedMembers, reportMember,
  muteChat, clearChat, getChatSettings, updateChatSettings, reactToMessage,
} from '@/app/actions/chat';
import type {
  ChatPerson, ChatThread, ChatMessage, ThreadReferral, BlockedMember, ChatSettings,
  MessageReaction,
} from '@/server/repos/chat';
import {
  e2eeAvailable, ensureLocalKeys, deriveConversationKey, encryptText, decryptText,
} from '@/lib/e2ee';
import { readCache, writeCache } from '@/lib/swr-cache';
import type { PDFDocumentLoadingTask } from 'pdfjs-dist';
import { useApp } from '@/context/app-context';
import { useConfirm } from '@/components/portal/confirm';
import PortalLoading from '@/components/portal/PortalLoading';
import {
  ArrowLeft, AlertCircle, Ban, Bell, BellOff, Building2, Check, CheckCheck, Copy, Eraser,
  FileText, Flag, Heart, ImagePlus, Info, Loader2, Lock, LockOpen, MessageCircle,
  MoreVertical, Paperclip, Plus, Reply, Send, Settings, Share2, ShieldCheck, UserX, Video, X,
  type LucideIcon,
  Download,
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
 * Attachments — photos, video, documents — are NOT encrypted; they go to Blob
 * storage as files, and the composer says so out loud rather than letting the
 * lock icon imply otherwise.
 *
 * One poll (`pollThread`, 5s) carries messages, the open flag, the peer's typing
 * heartbeat and live referral status. Decrypted text is cached by message id so
 * a poll re-renders without re-decrypting.
 *
 * Safety lives in two sheets: a per-chat menu (mute, clear for me, report,
 * block) off the thread header, and global chat settings (read receipts, typing
 * indicator, the blocked list) off the list header. Mute and clear-for-me are
 * one-sided prefs; a block is never announced, so a blocked thread arrives as
 * `open === false` and gets the SAME generic frozen notice as a broken follow.
 *
 * Per-message actions (react, reply, forward, copy) hang off a long-press — or a
 * right-click — on the bubble, in one sheet. Reactions ride the same 5s poll.
 * Replies quote by id and read the quoted text out of the SAME in-memory
 * plaintext cache the bubbles use, so nothing decrypted is ever stored; a quote
 * whose target was cleared degrades to "🔒 Message". Forwarding a locked message
 * re-encrypts it under the TARGET conversation's key rather than moving
 * ciphertext no one there can open.
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

/**
 * The three things you can attach. `payload` is the upload route's
 * clientPayload, which decides the allowed MIME types and the server-side size
 * cap; `maxMb` is the same cap checked HERE, before a 120 MB video is pushed up
 * a phone's uplink only to be refused at the far end.
 */
type AttachKind = 'photo' | 'video' | 'document';

const ATTACH: Record<AttachKind, {
  label: string;
  accept: string;
  payload?: string;
  kind: 'image' | 'video' | 'file';
  maxMb: number;
  tooBig: string;
  failed: string;
  Icon: LucideIcon;
}> = {
  photo: {
    label: 'Photo',
    accept: 'image/jpeg,image/png,image/webp,image/gif',
    payload: undefined,
    kind: 'image',
    maxMb: 8,
    tooBig: 'Photos can be up to 8 MB.',
    failed: 'That photo could not be uploaded. Please try again.',
    Icon: ImagePlus,
  },
  video: {
    label: 'Video',
    accept: 'video/mp4,video/webm,video/quicktime',
    payload: 'video',
    kind: 'video',
    maxMb: 120,
    tooBig: 'Videos can be up to 120 MB.',
    failed: 'That video could not be uploaded. Please try again.',
    Icon: Video,
  },
  document: {
    label: 'Document',
    accept: 'application/pdf,.doc,.docx',
    payload: 'document',
    kind: 'file',
    maxMb: 8,
    tooBig: 'Documents can be up to 8 MB.',
    failed: 'That document could not be uploaded. Please try again.',
    Icon: FileText,
  },
};
const ATTACH_ORDER: AttachKind[] = ['photo', 'video', 'document'];

const REPORT_REASONS = [
  'Harassment', 'Spam', 'Scam or fraud', 'Inappropriate content', 'Something else',
];

/** The six taps on the reaction bar. One reaction per person per message. */
const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

/** Long-press: how long, and how far a thumb may drift before it is a scroll. */
const PRESS_MS = 450;
const PRESS_SLOP = 10;

/** PDF preview: thumbnail width at send time, pages per batch in the viewer. */
const PDF_THUMB_W = 360;
const PDF_PAGE_BATCH = 10;

/**
 * pdfjs, loaded on demand — it is a large library and most chats never open a
 * PDF. The worker is resolved through the bundler so no CDN is involved.
 */
async function loadPdfjs() {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc =
    new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  return pdfjs;
}

/**
 * First page of a PDF as a small JPEG, WhatsApp-style, so the card in the thread
 * shows the document instead of a generic icon. Returns null on ANY failure —
 * a preview is a nicety and must never be the reason a send did not happen.
 */
async function pdfFirstPageJpeg(file: File): Promise<File | null> {
  try {
    const pdfjs = await loadPdfjs();
    const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    const doc = await task.promise;
    try {
      const page = await doc.getPage(1);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: PDF_THUMB_W / base.width });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      await page.render({ canvas, viewport }).promise;
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.8));
      if (!blob) return null;
      return new File([blob], 'pdf-preview.jpg', { type: 'image/jpeg' });
    } finally {
      // Destroying the loading task is what tears down the worker.
      void task.destroy();
    }
  } catch {
    return null;
  }
}

/**
 * PDF pages rendered into canvases inside a scrolling column. Canvases are
 * appended imperatively: React never owns them, so a re-render never repaints a
 * page pdfjs already drew.
 *
 * ponytail: pages come in batches of ten behind a button rather than an
 * IntersectionObserver. A 300-page deck would otherwise render 300 canvases into
 * one phone's memory. Swap in an observer if anyone complains about the button.
 */
function PdfPages({ url, onFail }: { url: string; onFail: () => void }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const taskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const doneRef = useRef(0);
  const failRef = useRef(onFail);
  failRef.current = onFail;

  const [limit, setLimit] = useState(PDF_PAGE_BATCH);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(true);

  // The document outlives every render; only the unmount tears the worker down.
  // The ref is cleared with it so React's development double-mount reopens the
  // file instead of awaiting a promise that was just destroyed.
  useEffect(() => () => {
    void taskRef.current?.destroy();
    taskRef.current = null;
  }, []);

  useEffect(() => {
    let alive = true;
    setBusy(true);
    (async () => {
      try {
        if (!taskRef.current || taskRef.current.destroyed) {
          const pdfjs = await loadPdfjs();
          if (!alive) return;
          taskRef.current = pdfjs.getDocument({ url: new URL(url, window.location.origin).href });
        }
        const doc = await taskRef.current.promise;
        if (!alive) return;
        setTotal(doc.numPages);
        const upto = Math.min(limit, doc.numPages);
        for (let n = doneRef.current + 1; n <= upto; n += 1) {
          const page = await doc.getPage(n);
          const host = hostRef.current;
          if (!alive || !host) return;
          // Device pixels, capped at 2x: crisp on a phone, not 40 MB of canvas.
          const css = Math.min(host.clientWidth || PDF_THUMB_W, 900);
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: (css / base.width) * dpr });
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(viewport.width);
          canvas.height = Math.round(viewport.height);
          canvas.setAttribute('role', 'img');
          canvas.setAttribute('aria-label', `Page ${n}`);
          canvas.style.cssText =
            'display:block;width:100%;height:auto;margin:0 0 10px;border-radius:8px;background:#fff';
          await page.render({ canvas, viewport }).promise;
          if (!alive) return;
          host.appendChild(canvas);
          doneRef.current = n;
        }
        if (alive) setBusy(false);
      } catch {
        if (alive) failRef.current();
      }
    })();
    return () => { alive = false; };
  }, [url, limit]);

  return (
    <>
      <div ref={hostRef} />
      {busy && (
        <p role="status" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          margin: '0.8rem 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)',
        }}>
          <Loader2 size={16} className="spin" aria-hidden="true" /> Rendering pages…
        </p>
      )}
      {!busy && total > limit && (
        <button
          type="button"
          onClick={() => setLimit((n) => n + PDF_PAGE_BATCH)}
          style={{
            display: 'block', width: '100%', minHeight: 44, margin: '0.2rem 0 0.6rem',
            border: '1px solid rgba(255,255,255,0.22)', borderRadius: 12,
            background: 'rgba(255,255,255,0.10)', color: '#fff',
            font: 'inherit', fontSize: '0.86rem', fontWeight: 700, cursor: 'pointer',
          }}
        >
          Show more pages ({total - limit} left)
        </button>
      )}
    </>
  );
}

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
 * Attachment upload, byte-for-byte the community composer's route: straight to
 * Blob storage, with the dev-only local-disk endpoint as the fallback when no
 * Blob store is configured. The server refuses any URL from anywhere else.
 *
 * clientPayload is what tells the route which MIME allowlist and size cap to
 * sign the token for ('video', 'document', or images by default). Progress only
 * exists on the Blob path; the dev fallback posts in one shot.
 */
async function uploadAttachment(
  file: File,
  clientPayload: string | undefined,
  onPct: (pct: number) => void
): Promise<string> {
  try {
    const blob = await upload(file.name, file, {
      access: 'public',
      handleUploadUrl: '/api/community/upload',
      clientPayload,
      onUploadProgress: (e) => onPct(Math.min(99, Math.round(e.percentage))),
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

/** KB below a megabyte, one decimal MB above it. */
const humanSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

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

  /**
   * The list and the people sheet render from the last result this tab saw,
   * instantly, and refresh behind it — the database is remote and nobody should
   * meet a skeleton twice. The skeleton is therefore only for a first visit.
   */
  const [loading, setLoading] = useState(() => readCache<ChatThread[]>('chats') === undefined);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  /** Full-screen image preview; null = closed. */
  const [lightbox, setLightbox] = useState<string | null>(null);
  /** Full-screen in-app PDF reader; null = closed. */
  const [pdfView, setPdfView] = useState<{ url: string; name: string } | null>(null);

  const [threads, setThreads] = useState<ChatThread[]>(() => readCache<ChatThread[]>('chats') ?? []);

  const [openId, setOpenId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [pollOpen, setPollOpen] = useState<boolean | null>(null);
  const [peerTypingAt, setPeerTypingAt] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<ThreadReferral[]>([]);
  const [refBusy, setRefBusy] = useState<string | null>(null);
  /** Every reaction in the conversation, straight off the poll. */
  const [reactions, setReactions] = useState<MessageReaction[]>([]);

  // Per-message actions. The menu is opened by a long press or a right-click on
  // a bubble; reply and forward are its two follow-on states.
  const [msgMenu, setMsgMenu] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [forwardOf, setForwardOf] = useState<ChatMessage | null>(null);
  const [fwdBusy, setFwdBusy] = useState<string | null>(null);
  /** The message a tapped quote just jumped to, flashed for a beat. */
  const [flashId, setFlashId] = useState<string | null>(null);

  const [convKey, setConvKey] = useState<CryptoKey | null>(null);
  const convKeyRef = useRef<CryptoKey | null>(null);
  const [keyProbe, setKeyProbe] = useState(0);
  const [plain, setPlain] = useState<Record<string, string | null>>({});
  const [noteOpen, setNoteOpen] = useState(true);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [upPct, setUpPct] = useState<number | null>(null);
  const [attachMenu, setAttachMenu] = useState(false);
  const [attachNote, setAttachNote] = useState(false);

  // Per-chat menu: mute / clear / report / block.
  const [threadMenu, setThreadMenu] = useState(false);
  const [menuBusy, setMenuBusy] = useState(false);
  const [menuError, setMenuError] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');

  // Global chat settings + the blocked list.
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [chatSettings, setChatSettings] = useState<ChatSettings | null>(null);
  /**
   * Loaded with the first paint, not lazily: the settings sheet then opens with
   * its list already there, and a frozen thread can tell "I blocked them" from
   * "the follow broke" without offering a Follow-again button that would send a
   * request to someone I have blocked.
   */
  const [blocked, setBlocked] = useState<BlockedMember[]>([]);

  const [people, setPeople] = useState<People>(() => readCache<People>('people') ?? NO_PEOPLE);
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
  // mismatch if it reaches the first paint. Same for the motion preference.
  const [e2eeOk, setE2eeOk] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const publishedRef = useRef(false);
  const markingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const nearBottomRef = useRef(true);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  /** Which menu entry opened the shared file input. */
  const attachKindRef = useRef<AttachKind>('photo');
  const typingAtRef = useRef(0);
  /** The open thread's poll, so a referral answer can refresh without a reload. */
  const pollRef = useRef<(() => Promise<void>) | null>(null);
  /** Long-press bookkeeping: the timer, where the finger landed, whether it fired. */
  const pressRef = useRef<{ timer: number | null; x: number; y: number; fired: boolean }>({
    timer: null, x: 0, y: 0, fired: false,
  });

  const openThread = threads.find((t) => t.id === openId) ?? null;
  const peerId = openThread?.partnerId ?? null;
  const threadOpen = pollOpen ?? openThread?.open ?? false;
  // Needed by the thread pane AND by the menu sheets, which render outside it.
  const partnerName = openThread ? fullName(openThread.partnerFirstName, openThread.partnerLastName) : '';
  const partnerFirst = partnerName.split(' ')[0];

  // Both write through to the session cache: whatever the member last saw is
  // what the next visit paints before the network answers.
  const refreshChats = useCallback(async () => {
    const res = await listChats();
    if (res.ok) { setThreads(res.data); writeCache('chats', res.data); }
    return res.ok;
  }, []);

  const refreshPeople = useCallback(async () => {
    const res = await listPeople();
    if (res.ok) { setPeople(res.data); writeCache('people', res.data); }
    else setPeopleError(res.error);
  }, []);

  const refreshBlocked = useCallback(async () => {
    const res = await listBlockedMembers();
    if (res.ok) setBlocked(res.data);
  }, []);

  // ---- Load: chats, people, deep link ---------------------------------------
  // People come down with the first load, not lazily on sheet open: the sheet
  // then opens instantly, and a frozen thread can say WHO broke the follow.
  useEffect(() => {
    let alive = true;
    (async () => {
      const [chats, folk, blocks] = await Promise.all([
        listChats(), listPeople(), listBlockedMembers(),
      ]);
      if (!alive) return;
      if (!chats.ok) { setError(chats.error); setLoading(false); return; }
      if (folk.ok) {
        setPeople(folk.data);
        writeCache('people', folk.data);
        if (folk.data.requests.length > 0) setLane('requests');
      }
      if (blocks.ok) setBlocked(blocks.data);
      setThreads(chats.data);
      writeCache('chats', chats.data);
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
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
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
        // Server truth replaces the optimistic reaction outright — one tap is
        // never in flight long enough for the swap to be visible.
        setReactions(r.data.reactions);
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
    setReactions([]);
    setAttachNote(false);
    setAttachMenu(false);
    setThreadMenu(false);
    setReportOpen(false);
    setMsgMenu(null);
    setReplyTo(null);
    setForwardOf(null);
    setFlashId(null);
    setMenuError('');
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

  // ---- Any open sheet locks background scroll, same as every other sheet ----
  // Escape closes the TOP sheet only: report sits over the thread menu, so one
  // press steps back rather than dumping you out of both.
  const anySheet = sheetOpen || threadMenu || reportOpen || settingsOpen || msgMenu != null || forwardOf != null;
  useEffect(() => {
    if (!anySheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (msgMenu) setMsgMenu(null);
      else if (forwardOf) setForwardOf(null);
      else if (reportOpen) setReportOpen(false);
      else if (threadMenu) setThreadMenu(false);
      else if (settingsOpen) setSettingsOpen(false);
      else closeSheet();
    };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [anySheet, reportOpen, threadMenu, settingsOpen, msgMenu, forwardOf]);

  // ---- The attach menu: Escape closes it, like any popover ------------------
  useEffect(() => {
    if (!attachMenu) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAttachMenu(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [attachMenu]);

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

  // ---- Per-chat menu: mute, clear for me, report, block --------------------
  async function toggleMute() {
    if (!openThread) return;
    const id = openThread.id;
    const next = !openThread.muted;
    setMenuError('');
    // Optimistic, then the server is asked again — same contract as `mutate`.
    setThreads((ts) => ts.map((t) => (t.id === id ? { ...t, muted: next } : t)));
    const res = await muteChat(id, next);
    if (!res.ok) {
      setThreads((ts) => ts.map((t) => (t.id === id ? { ...t, muted: !next } : t)));
      setMenuError(res.error);
      return;
    }
    void refreshChats();
    setToast(next ? 'Chat muted' : 'Chat unmuted');
  }

  async function doClearChat() {
    if (!openThread) return;
    const ok = await confirm({
      title: 'Clear this chat?',
      message: `Clears this conversation on your side only — ${partnerName} keeps their copy.`,
      confirmLabel: 'Clear chat',
      tone: 'danger',
    });
    if (!ok) return;
    setMenuBusy(true);
    setMenuError('');
    const res = await clearChat(openThread.id);
    setMenuBusy(false);
    if (!res.ok) { setMenuError(res.error); return; }
    // The poll stops sending cleared messages, so the local wipe is what the
    // next poll will agree with. The decrypt cache goes with them.
    setMessages([]);
    setPlain({});
    setThreadMenu(false);
    void refreshChats();
    setToast('Chat cleared');
  }

  async function submitReport() {
    if (!openThread || !reportReason || menuBusy) return;
    setMenuBusy(true);
    setMenuError('');
    const res = await reportMember({
      reportedId: openThread.partnerId,
      conversationId: openThread.id,
      reason: reportReason,
      details: reportDetails.trim() || undefined,
    });
    setMenuBusy(false);
    if (!res.ok) { setMenuError(res.error); return; }
    setReportOpen(false);
    setThreadMenu(false);
    setReportReason('');
    setReportDetails('');
    setToast('Report sent to the admins');
  }

  async function doBlock() {
    if (!openThread) return;
    const ok = await confirm({
      title: `Block ${partnerFirst}?`,
      message: 'They won’t be able to message you, and this chat freezes. They are not notified.',
      confirmLabel: 'Block',
      tone: 'danger',
    });
    if (!ok) return;
    setMenuBusy(true);
    setMenuError('');
    const res = await blockMember(openThread.partnerId);
    if (!res.ok) { setMenuError(res.error); setMenuBusy(false); return; }
    setThreadMenu(false);
    setOpenId(null); // back to the list; the thread is frozen from here on
    await Promise.all([refreshChats(), refreshPeople(), refreshBlocked()]);
    setMenuBusy(false);
    setToast(`${partnerFirst} is blocked`);
  }

  // Documents and originals leave the WebView on purpose: the shell cannot
  // preview a PDF, and on iOS the system browser's share sheet is where
  // "Save to Files" lives. On the plain web this is just a new tab.
  const openAttachment = useCallback((url: string) => {
    const abs = new URL(url, window.location.origin).href;
    window.open(abs, '_blank', 'noopener,noreferrer');
  }, []);

  // Full-screen overlays (photo lightbox, PDF reader): Escape closes, background
  // scroll stays put.
  useEffect(() => {
    if (!lightbox && !pdfView) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (lightbox) setLightbox(null); else setPdfView(null);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [lightbox, pdfView]);

  // The thread OWNS the viewport on phones. Without this the page behind it
  // still scrolls: the pinned header slides under the status bar and a blank
  // band opens above the tab bar.
  useEffect(() => {
    if (isWide || !openId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isWide, openId]);

  // ---- Chat settings sheet -------------------------------------------------
  async function openSettings() {
    setSettingsOpen(true);
    setSettingsError('');
    setSettingsLoading(true);
    const [s, b] = await Promise.all([getChatSettings(), listBlockedMembers()]);
    if (s.ok) setChatSettings(s.data); else setSettingsError(s.error);
    if (b.ok) setBlocked(b.data);
    setSettingsLoading(false);
  }

  async function toggleSetting(key: keyof ChatSettings) {
    if (!chatSettings) return;
    const before = chatSettings;
    const next = { ...chatSettings, [key]: !chatSettings[key] };
    setChatSettings(next);
    setSettingsError('');
    const res = await updateChatSettings(
      key === 'readReceipts'
        ? { readReceipts: next.readReceipts }
        : { typingIndicator: next.typingIndicator }
    );
    if (!res.ok) { setChatSettings(before); setSettingsError(res.error); return; }
    setChatSettings(res.data);
  }

  async function doUnblock(m: BlockedMember) {
    setSettingsError('');
    setBusyId(m.id);
    const res = await unblockMember(m.id);
    if (!res.ok) { setSettingsError(res.error); setBusyId(null); return; }
    await Promise.all([refreshBlocked(), refreshPeople(), refreshChats()]);
    setBusyId(null);
    setToast(`${fullName(m.firstName, m.lastName)} is unblocked`);
  }

  // ---- Per-message actions: react, reply, forward, copy --------------------
  /**
   * One line standing in for a message, used by the reply strip, the quoted
   * block and nothing else. Text comes from the SAME in-memory cache the bubbles
   * read — a quote never carries stored plaintext, and a message that is gone
   * (cleared) or unreadable on this device degrades to the lock.
   */
  const snippetOf = (m: ChatMessage | undefined): string => {
    if (!m) return '🔒 Message';
    if (m.kind === 'image') return '📷 Photo';
    if (m.kind === 'video') return '🎬 Video';
    if (m.kind === 'referral') return 'Referral request';
    if (m.kind === 'file') {
      const name = (m.meta as { name?: string } | null)?.name;
      return typeof name === 'string' && name ? name : '📎 Document';
    }
    const text = m.body ?? plain[m.id];
    return typeof text === 'string' && text.trim() ? text : '🔒 Message';
  };

  /** Plaintext of a text message, or null when this device cannot read it. */
  const readableText = (m: ChatMessage): string | null => {
    if (m.kind !== 'text') return null;
    const text = m.body ?? plain[m.id];
    return typeof text === 'string' && text.trim() ? text : null;
  };

  const myReactionTo = (messageId: string) =>
    reactions.find((r) => r.messageId === messageId && r.memberId === currentUserId)?.emoji ?? null;

  /** Tapping the reaction you already left removes it — that is the null case. */
  async function react(messageId: string, emoji: string) {
    if (!currentUserId) return;
    const next = myReactionTo(messageId) === emoji ? null : emoji;
    setReactions((rs) => {
      const rest = rs.filter((r) => !(r.messageId === messageId && r.memberId === currentUserId));
      return next ? [...rest, { messageId, memberId: currentUserId, emoji: next }] : rest;
    });
    setMsgMenu(null);
    const res = await reactToMessage(messageId, next);
    // The poll is the authority; on failure ask it rather than guessing back.
    if (!res.ok) { setSendError(res.error); void pollRef.current?.(); }
  }

  async function copyMsg(m: ChatMessage) {
    const text = readableText(m);
    setMsgMenu(null);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setToast('Copied');
    } catch {
      setSendError('This device would not let the app copy to the clipboard.');
    }
  }

  /** Scroll a quoted original back into view and flash it, WhatsApp-style. */
  function jumpTo(messageId: string) {
    const el = document.getElementById(`msg-${messageId}`);
    if (!el) return;
    // Jumping upward is a deliberate scroll away from the bottom; do not let the
    // stay-pinned effect yank the thread back on the next poll.
    nearBottomRef.current = false;
    el.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    if (reduceMotion) return;
    setFlashId(messageId);
    window.setTimeout(() => setFlashId((v) => (v === messageId ? null : v)), 900);
  }

  /**
   * Forward a copy into another chat. Ciphertext is worthless over there — the
   * target conversation has its own key — so a locked message is re-encrypted
   * from the plaintext this device already holds, and only falls back to
   * plaintext when that peer has published no key at all.
   */
  async function doForward(target: ChatThread) {
    const m = forwardOf;
    if (!m || fwdBusy) return;
    setMenuError('');
    setFwdBusy(target.id);

    let payload: Parameters<typeof sendChatMessage>[1] | null = null;
    if (m.kind === 'text') {
      const text = readableText(m);
      if (!text) {
        setMenuError('This message cannot be forwarded — this device cannot read it.');
        setFwdBusy(null);
        return;
      }
      let sealed: { cipher: string; iv: string } | null = null;
      if (currentUserId && e2eeAvailable()) {
        const theirs = await getMemberE2EKey(target.partnerId);
        if (theirs.ok && theirs.data) {
          const key = await deriveConversationKey(currentUserId, target.partnerId, theirs.data);
          if (key) sealed = await encryptText(key, text);
        }
      }
      payload = { ...(sealed ?? { body: text }), forwarded: true };
    } else if (m.attachmentUrl && (m.kind === 'image' || m.kind === 'video' || m.kind === 'file')) {
      const meta = (m.meta ?? {}) as { name?: string; size?: number; mime?: string; thumb?: string };
      payload = {
        attachmentUrl: m.attachmentUrl,
        attachmentKind: m.kind,
        forwarded: true,
        ...(m.kind === 'file'
          ? { fileMeta: { name: meta.name, size: meta.size, mime: meta.mime } }
          : {}),
        ...(typeof meta.thumb === 'string' ? { thumbUrl: meta.thumb } : {}),
      };
    }
    if (!payload) { setFwdBusy(null); return; }

    const res = await sendChatMessage(target.id, payload);
    setFwdBusy(null);
    if (!res.ok) { setMenuError(res.error); return; }
    setForwardOf(null);
    void refreshChats();
    setToast(`Forwarded to ${fullName(target.partnerFirstName, target.partnerLastName)}`);
  }

  // ---- Long press (and right-click) on a bubble ----------------------------
  const cancelPress = () => {
    if (pressRef.current.timer != null) window.clearTimeout(pressRef.current.timer);
    pressRef.current.timer = null;
  };

  /**
   * Spread onto a bubble wrapper. A press that survives 450ms without drifting
   * more than 10px opens the menu; anything else is a tap or a scroll. The
   * capture-phase click guard is what stops the press that JUST opened the menu
   * from also firing the bubble's own click (the lightbox, a file, a quote).
   */
  // Swipe-right-to-reply: horizontal drag past 48px sets the reply target.
  // Kept per-gesture in a ref; the bubble translates with the finger (capped)
  // and springs back on release.
  const swipeRef = useRef<{ el: HTMLElement | null; dx: number; active: boolean }>({ el: null, dx: 0, active: false });

  const pressProps = (m: ChatMessage) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      cancelPress();
      pressRef.current.fired = false;
      pressRef.current.x = e.clientX;
      pressRef.current.y = e.clientY;
      swipeRef.current = { el: e.currentTarget as HTMLElement, dx: 0, active: false };
      try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* fine */ }
      pressRef.current.timer = window.setTimeout(() => {
        pressRef.current.timer = null;
        pressRef.current.fired = true;
        setMsgMenu(m.id);
      }, PRESS_MS);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const dx = e.clientX - pressRef.current.x;
      const dy = e.clientY - pressRef.current.y;
      if (pressRef.current.timer != null && Math.hypot(dx, dy) > PRESS_SLOP) cancelPress();
      const sw = swipeRef.current;
      if (!sw.active && dx > 12 && Math.abs(dy) < 24) { sw.active = true; cancelPress(); }
      if (sw.active && sw.el) {
        sw.dx = Math.max(0, Math.min(dx, 72));
        sw.el.style.transition = 'none';
        sw.el.style.transform = `translateX(${sw.dx}px)`;
      }
    },
    onPointerUp: () => {
      const sw = swipeRef.current;
      if (sw.active && sw.el) {
        const trigger = sw.dx >= 48;
        sw.el.style.transition = reduceMotion ? '' : 'transform 0.18s ease';
        sw.el.style.transform = '';
        if (trigger && pollOpen !== false) setReplyTo(m);
      }
      swipeRef.current = { el: null, dx: 0, active: false };
      cancelPress();
    },
    onPointerCancel: () => {
      const sw = swipeRef.current;
      if (sw.el) { sw.el.style.transform = ''; }
      swipeRef.current = { el: null, dx: 0, active: false };
      cancelPress();
    },
    onPointerLeave: cancelPress,
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      cancelPress();
      setMsgMenu(m.id);
    },
    onClickCapture: (e: React.MouseEvent) => {
      if (!pressRef.current.fired) return;
      pressRef.current.fired = false;
      e.preventDefault();
      e.stopPropagation();
    },
  });

  // ---- Composer ------------------------------------------------------------
  /** Heartbeat, never per keystroke: the peer polls every 5s anyway. */
  function pingTyping() {
    if (!openId) return;
    // The server no-ops when the indicator is off; not calling at all is the
    // honest version of "no one sees you typing".
    // ponytail: settings are only loaded once the settings sheet has been
    // opened, so before that this sends a heartbeat the server throws away.
    // Fetch them with the first load if that round trip ever matters.
    if (chatSettings && !chatSettings.typingIndicator) return;
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

    const res = await sendChatMessage(openId, {
      ...payload,
      ...(replyTo ? { replyTo: replyTo.id } : {}),
    });
    if (res.ok) {
      // Seed the cache with what we just typed: no decrypt round trip, no flash
      // of the placeholder on our own bubble.
      if (convKey) setPlain((p) => ({ ...p, [res.data.id]: text }));
      setReplyTo(null);
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

  /**
   * One hidden input serves all three kinds: `accept` is set on the node right
   * before the click, so the OS picker only offers what the upload route would
   * sign a token for.
   */
  function chooseAttachment(k: AttachKind) {
    setAttachMenu(false);
    const el = fileRef.current;
    if (!el) return;
    attachKindRef.current = k;
    el.accept = ATTACH[k].accept;
    el.value = '';
    el.click();
  }

  async function pickFile(file: File | undefined, k: AttachKind) {
    if (!file || !openId || uploading) return;
    const a = ATTACH[k];
    setSendError('');
    // Guard here, before a 120 MB video crawls up a phone's uplink only to be
    // refused at the far end.
    if (file.size > a.maxMb * 1024 * 1024) { setSendError(a.tooBig); return; }
    setAttachNote(true);
    setUploading(true);
    setUpPct(null);
    try {
      const url = await uploadAttachment(file, a.payload, setUpPct);
      // A PDF gets its first page rendered and uploaded as an ordinary image, so
      // the card in the thread shows the document. Best effort only: any failure
      // here sends the file exactly as it would have gone without a preview.
      let thumbUrl: string | undefined;
      if (a.kind === 'file' && file.type === 'application/pdf') {
        try {
          const thumb = await pdfFirstPageJpeg(file);
          if (thumb) thumbUrl = await uploadAttachment(thumb, undefined, () => {});
        } catch { thumbUrl = undefined; }
      }
      const res = await sendChatMessage(openId, {
        attachmentUrl: url,
        attachmentKind: a.kind,
        // Only a document needs a name and a size shown before it is opened.
        ...(a.kind === 'file'
          ? { fileMeta: { name: file.name, size: file.size, mime: file.type } }
          : {}),
        ...(thumbUrl ? { thumbUrl } : {}),
        ...(replyTo ? { replyTo: replyTo.id } : {}),
      });
      if (res.ok) {
        setReplyTo(null);
        nearBottomRef.current = true;
        setMessages((prev) => [...prev, res.data]);
        void refreshChats();
      } else {
        setSendError(res.error);
        if (res.error === MUTUAL_ERROR) void refreshChats();
      }
    } catch {
      setSendError(a.failed);
    }
    setUploading(false);
    setUpPct(null);
  }

  if (loading) return <PortalLoading label="Loading chats" />;

  // ---- Chat list -----------------------------------------------------------
  const listRows = threads.map((t) => {
    const name = fullName(t.partnerFirstName, t.partnerLastName);
    const active = t.id === openId;
    const preview = t.lastKind === 'image'
      ? '📷 Photo'
      : t.lastKind === 'video'
        ? '🎬 Video'
        : t.lastKind === 'file'
          ? '📎 Document'
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
            {t.muted && (
              <>
                <BellOff size={13} aria-hidden="true" style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
                <span className="sr-only">Muted</span>
              </>
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
    const name = partnerName;
    const partnerId = openThread.partnerId;
    const firstName = partnerFirst;
    // Frozen: if I am the one who stopped following, asking again fixes it. If
    // they dropped me, nothing I can press will reopen this, so nothing is
    // offered — a hopeful button would be a lie. A thread I froze by BLOCKING
    // them is the same lie in the other direction: following again would send a
    // request to someone I have blocked, so the notice stays generic and bare.
    const iBrokeIt = !threadOpen
      && openThread.context === 'follow'
      && !people.following.some((p) => p.id === partnerId)
      && !blocked.some((b) => b.id === partnerId);
    const peerTyping = peerTypingAt != null
      && Date.now() - new Date(peerTypingAt).getTime() < TYPING_FRESH_MS;

    // emoji -> count per message, with "did I leave this one" folded in.
    const reactionGroups = new Map<string, { emoji: string; count: number; mine: boolean }[]>();
    for (const r of reactions) {
      const list = reactionGroups.get(r.messageId) ?? [];
      const hit = list.find((x) => x.emoji === r.emoji);
      if (hit) {
        hit.count += 1;
        hit.mine = hit.mine || r.memberId === currentUserId;
      } else {
        list.push({ emoji: r.emoji, count: 1, mine: r.memberId === currentUserId });
      }
      reactionGroups.set(r.messageId, list);
    }

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
              // A FIXED overlay, not a negative-margin bleed. The bleed left
              // the document behind the thread taller than the viewport
              // (portal-main's min-height and stray padding), so a swipe that
              // started on the composer scrolled the WHOLE window - header
              // under the clock, blank band over the tab bar. Fixed detaches
              // the thread from the page: only the messages column scrolls.
              position: 'fixed' as const,
              top: 0, left: 0, right: 0,
              bottom: TABBAR,
              // Above the page, below the tab bar (--z-drawer: 200) and every
              // sheet (--z-modal-backdrop: 390).
              zIndex: 150,
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
          {openThread.muted && (
            <>
              <BellOff size={15} aria-hidden="true" style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
              <span className="sr-only">This chat is muted</span>
            </>
          )}
          {/* Mute, clear, report, block — available on a frozen thread too. */}
          <button
            type="button"
            onClick={() => { setMenuError(''); setThreadMenu(true); }}
            aria-label={`Options for this chat with ${name}`}
            aria-haspopup="dialog"
            style={{
              display: 'grid', placeItems: 'center', width: 44, height: 44, flexShrink: 0,
              border: 0, borderRadius: '50%', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
            }}
          >
            <MoreVertical size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
          }}
          style={{
            flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', background: 'var(--bg-secondary)',
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
                Professionals Club — can read them. Photos, videos and files are
                private, but not encrypted.
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
            const pills = reactionGroups.get(m.id) ?? [];

            // Forwarded label + quoted reply, both above the content and inside
            // the bubble. The quote resolves through the thread by id, so a
            // cleared original leaves the lock rather than stale text.
            const quoted = m.replyTo ? messages.find((x) => x.id === m.replyTo) : undefined;
            const forwarded = Boolean((m.meta as { forwarded?: boolean } | null)?.forwarded);
            const quoteName = quoted
              ? (quoted.senderId === currentUserId ? 'You' : firstName)
              : null;
            const head = (forwarded || m.replyTo) && m.kind !== 'referral' ? (
              <>
                {forwarded && (
                  <span style={{
                    display: 'block', marginBottom: 3,
                    fontSize: '0.7rem', fontStyle: 'italic',
                    color: mine ? 'rgba(255,255,255,0.72)' : 'var(--text-muted)',
                  }}>
                    ↪ Forwarded
                  </span>
                )}
                {m.replyTo && (
                  <button
                    type="button"
                    onClick={() => jumpTo(m.replyTo!)}
                    aria-label={`Go to the message this replies to${quoteName ? `, from ${quoteName}` : ''}`}
                    style={{
                      display: 'block', width: '100%', marginBottom: 5, padding: '0.3rem 0.5rem',
                      border: 0, borderLeft: '2.5px solid var(--primary-600)', borderRadius: '0.5rem',
                      background: mine ? 'rgba(255,255,255,0.13)' : 'var(--bg-secondary)',
                      font: 'inherit', textAlign: 'left', cursor: 'pointer',
                      color: mine ? '#fff' : 'var(--text-primary)',
                    }}
                  >
                    {quoteName && (
                      <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800 }}>
                        {quoteName}
                      </span>
                    )}
                    <span style={{
                      display: 'block', fontSize: '0.74rem', lineHeight: 1.35,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      color: mine ? 'rgba(255,255,255,0.78)' : 'var(--text-secondary)',
                    }}>
                      {snippetOf(quoted)}
                    </span>
                  </button>
                )}
              </>
            ) : null;

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
                  {head && <span style={{ display: 'block', padding: '2px 4px 0' }}>{head}</span>}
                  <button
                    type="button"
                    onClick={() => setLightbox(m.attachmentUrl)}
                    aria-label={mine ? 'View photo you sent' : `View photo from ${firstName}`}
                    style={{ display: 'block', padding: 0, border: 0, background: 'none', cursor: 'zoom-in' }}
                  >
                    <img
                      src={m.attachmentUrl}
                      alt={mine ? 'Photo you sent' : `Photo from ${firstName}`}
                      style={{ display: 'block', maxWidth: 240, width: '100%', height: 'auto', borderRadius: 14 }}
                    />
                  </button>
                  <span style={{ display: 'block', padding: '0 4px' }}>{metaLine}</span>
                </div>
              );
            } else if (m.kind === 'video' && m.attachmentUrl) {
              bubble = (
                <div style={{
                  padding: 4,
                  borderRadius: mine ? '1.1rem 1.1rem 0.3rem 1.1rem' : '1.1rem 1.1rem 1.1rem 0.3rem',
                  background: mine ? 'var(--green-950)' : 'var(--bg-primary)',
                  border: mine ? '1px solid transparent' : HAIRLINE,
                }}>
                  {head && <span style={{ display: 'block', padding: '2px 4px 0' }}>{head}</span>}
                  {/* preload="metadata": a poster frame and a duration, not the
                      whole file, on someone's mobile data. */}
                  <video
                    src={m.attachmentUrl}
                    controls
                    playsInline
                    preload="metadata"
                    aria-label={mine ? 'Video you sent' : `Video from ${firstName}`}
                    style={{ display: 'block', maxWidth: 260, width: '100%', height: 'auto', borderRadius: 14, background: '#000' }}
                  />
                  <span style={{ display: 'block', padding: '0 4px' }}>{metaLine}</span>
                </div>
              );
            } else if (m.kind === 'file' && m.attachmentUrl) {
              const fileMeta = (m.meta ?? {}) as { name?: string; size?: number; mime?: string; thumb?: string };
              const fileName = typeof fileMeta.name === 'string' && fileMeta.name ? fileMeta.name : 'Document';
              const fileSize = typeof fileMeta.size === 'number' && fileMeta.size > 0 ? humanSize(fileMeta.size) : 'Document';
              const thumb = typeof fileMeta.thumb === 'string' ? fileMeta.thumb : null;
              // A PDF opens in the app. Everything else still leaves for the
              // system browser, which is the only thing that can render it.
              const isPdf = fileMeta.mime === 'application/pdf' || /\.pdf$/i.test(fileName);
              bubble = (
                <div style={{
                  padding: '0.5rem 0.6rem',
                  borderRadius: mine ? '1.1rem 1.1rem 0.3rem 1.1rem' : '1.1rem 1.1rem 1.1rem 0.3rem',
                  background: mine ? 'var(--green-950)' : 'var(--bg-primary)',
                  border: mine ? '1px solid transparent' : HAIRLINE,
                }}>
                  {head}
                  <a
                    href={m.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.preventDefault();
                      if (isPdf) setPdfView({ url: m.attachmentUrl!, name: fileName });
                      else openAttachment(m.attachmentUrl!);
                    }}
                    style={{
                      display: 'block', maxWidth: 240,
                      textDecoration: 'none', color: mine ? '#fff' : 'var(--text-primary)',
                    }}
                  >
                    {thumb && (
                      <img
                        src={thumb}
                        alt={`First page of ${fileName}`}
                        style={{
                          display: 'block', maxWidth: 200, width: '100%', height: 'auto',
                          borderRadius: 10, marginBottom: 7,
                        }}
                      />
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        display: 'grid', placeItems: 'center', width: 38, height: 38, flexShrink: 0,
                        borderRadius: 11,
                        background: mine ? 'rgba(255,255,255,0.14)' : 'var(--green-50)',
                        color: mine ? '#fff' : 'var(--green-800)',
                      }}>
                        <FileText size={18} aria-hidden="true" />
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{
                          display: 'block', fontSize: '0.86rem', fontWeight: 700,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {fileName}
                        </span>
                        <span style={{
                          display: 'block', fontSize: '0.7rem', fontWeight: 650,
                          color: mine ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)',
                        }}>
                          {fileSize}
                        </span>
                      </span>
                    </span>
                  </a>
                  {metaLine}
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
                  {head}
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
                <div
                  id={`msg-${m.id}`}
                  // Referral cards are system objects: nothing to react to,
                  // reply to, forward or copy, so they get no long press.
                  {...(m.kind === 'referral' ? {} : pressProps(m))}
                  style={{
                    display: 'flex', flexDirection: 'column',
                    maxWidth: m.kind === 'referral' ? '90%' : '78%',
                    alignSelf: mine ? 'flex-end' : 'flex-start',
                    alignItems: mine ? 'flex-end' : 'flex-start',
                    marginBottom: (groupEnd ? 10 : 3) + (pills.length ? 14 : 0),
                    WebkitTouchCallout: 'none',
                    touchAction: 'pan-y',
                    borderRadius: '1.2rem',
                    transition: reduceMotion ? undefined : 'box-shadow 0.3s ease',
                    ...(flashId === m.id ? { boxShadow: '0 0 0 3px rgba(232,93,4,0.45)' } : {}),
                  }}
                >
                  {bubble}
                  {/* Reaction pills sit under the bubble and kiss its bottom
                      edge, clear of the clock and receipt inside it. */}
                  {pills.length > 0 && (
                    <span style={{
                      display: 'flex', gap: 4, position: 'relative', zIndex: 1,
                      marginTop: -6, padding: mine ? '0 8px 0 0' : '0 0 0 8px',
                    }}>
                      {pills.map((p) => (
                        <button
                          key={p.emoji}
                          type="button"
                          onClick={() => setMsgMenu(m.id)}
                          aria-label={`${p.count} reacted ${p.emoji}${p.mine ? ', including you' : ''} — change your reaction`}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            padding: '2px 7px', borderRadius: 999,
                            border: p.mine ? '1px solid rgba(0,168,107,0.35)' : HAIRLINE,
                            background: p.mine ? 'var(--green-50)' : 'var(--bg-primary)',
                            font: 'inherit', fontSize: '0.72rem', fontWeight: 750,
                            color: 'var(--text-secondary)', cursor: 'pointer',
                          }}
                        >
                          <span aria-hidden="true">{p.emoji}</span>
                          {p.count > 1 && p.count}
                        </button>
                      ))}
                    </span>
                  )}
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
              {replyTo && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  margin: '0.55rem 0.7rem 0', padding: '0.35rem 0.2rem 0.35rem 0.55rem',
                  borderLeft: '3px solid var(--primary-600)', borderRadius: '0.5rem',
                  background: 'var(--bg-secondary)',
                }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{
                      display: 'block', fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-accent)',
                    }}>
                      {replyTo.senderId === currentUserId ? 'You' : firstName}
                    </strong>
                    <small style={{
                      display: 'block', fontSize: '0.76rem', color: 'var(--text-secondary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {snippetOf(replyTo)}
                    </small>
                  </span>
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    aria-label="Cancel reply"
                    style={{
                      display: 'grid', placeItems: 'center', width: 44, height: 44, flexShrink: 0,
                      border: 0, borderRadius: '50%', background: 'none',
                      color: 'var(--text-muted)', cursor: 'pointer',
                    }}
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, padding: '0.6rem' }}>
                <input
                  ref={fileRef}
                  type="file"
                  accept={ATTACH.photo.accept}
                  aria-label="Choose a file to send"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    void pickFile(e.target.files?.[0], attachKindRef.current);
                    e.target.value = '';
                  }}
                />
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {attachMenu && (
                    <>
                      {/* Outside tap closes it, the way a popover should. */}
                      <div
                        onClick={() => setAttachMenu(false)}
                        style={{ position: 'fixed', inset: 0, zIndex: 30 }}
                      />
                      <div
                        role="menu"
                        aria-label="Attach"
                        style={{
                          position: 'absolute', bottom: 52, left: 0, zIndex: 31,
                          minWidth: '11rem', padding: 4, borderRadius: '0.9rem',
                          background: 'var(--bg-primary)', border: HAIRLINE,
                          boxShadow: '0 14px 34px -14px rgba(15,35,24,0.45)',
                        }}
                      >
                        {ATTACH_ORDER.map((k) => {
                          const { label, Icon } = ATTACH[k];
                          return (
                            <button
                              key={k}
                              type="button"
                              role="menuitem"
                              onClick={() => chooseAttachment(k)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                width: '100%', minHeight: 44, padding: '0 0.7rem',
                                border: 0, borderRadius: '0.7rem', background: 'none',
                                font: 'inherit', fontSize: '0.88rem', fontWeight: 700,
                                color: 'var(--text-primary)', textAlign: 'left', cursor: 'pointer',
                              }}
                            >
                              <Icon size={17} aria-hidden="true" style={{ color: 'var(--primary-600)', flexShrink: 0 }} />
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setAttachMenu((v) => !v)}
                    aria-label={uploading
                      ? `Uploading${upPct != null ? ` ${upPct} percent` : ''}`
                      : 'Attach a photo, video or document'}
                    aria-haspopup="menu"
                    aria-expanded={attachMenu}
                    disabled={uploading}
                    style={{
                      display: 'grid', placeItems: 'center',
                      width: 44, height: 44, border: 0, borderRadius: '50%',
                      background: attachMenu ? 'var(--green-50)' : 'var(--bg-secondary)',
                      color: 'var(--green-800)',
                      cursor: uploading ? 'default' : 'pointer',
                    }}
                  >
                    {uploading
                      ? (upPct != null
                        ? <span style={{ fontSize: '0.66rem', fontWeight: 800 }} aria-hidden="true">{upPct}%</span>
                        : <Loader2 size={18} className="spin" aria-hidden="true" />)
                      : <Paperclip size={18} aria-hidden="true" />}
                  </button>
                </div>
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
              {attachNote && (
                <p style={{
                  margin: 0, padding: '0 0.9rem 0.6rem', fontSize: '0.72rem',
                  color: 'var(--text-muted)', lineHeight: 1.4,
                }}>
                  Photos, videos and files are private but not end-to-end encrypted.
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

  // ---- Per-chat menu sheet -------------------------------------------------
  const menuErrorNode = menuError && (
    <div role="alert" className="community-error" style={{ marginBottom: 10 }}>
      <AlertCircle size={15} aria-hidden="true" /> {menuError}
    </div>
  );

  const threadMenuSheet = threadMenu && openThread && (
    <div
      className="hf-sheet-scrim"
      onClick={(e) => { if (e.target === e.currentTarget) setThreadMenu(false); }}
    >
      <div className="hf-sheet pp-sheet" role="dialog" aria-modal="true" aria-label={`Options for ${partnerName}`}>
        <div className="hf-sheet-head">
          <h2>{partnerName}</h2>
          <button type="button" className="portal-sheet-close" onClick={() => setThreadMenu(false)} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <p className="hf-sheet-sub">
          These choices are yours alone. {partnerFirst} is never told about any of them.
        </p>

        {!reportOpen && menuErrorNode}

        <div className="pp-group-card" style={{ marginBottom: '0.4rem' }}>
          <button type="button" className="pp-row" onClick={() => void toggleMute()} disabled={menuBusy}>
            <span className="pp-row-icon">
              {openThread.muted
                ? <Bell size={17} aria-hidden="true" />
                : <BellOff size={17} aria-hidden="true" />}
            </span>
            <span className="pp-row-body">
              <strong>{openThread.muted ? 'Unmute' : 'Mute'}</strong>
              <small style={{ whiteSpace: 'normal', lineHeight: 1.35 }}>
                {openThread.muted
                  ? 'Notifications from this chat are back on'
                  : 'Stop notifications from this chat'}
              </small>
            </span>
          </button>

          <button type="button" className="pp-row" onClick={() => void doClearChat()} disabled={menuBusy}>
            <span className="pp-row-icon"><Eraser size={17} aria-hidden="true" /></span>
            <span className="pp-row-body">
              <strong>Clear chat</strong>
              <small style={{ whiteSpace: 'normal', lineHeight: 1.35 }}>
                Empties it on your side only
              </small>
            </span>
          </button>

          <button
            type="button"
            className="pp-row"
            onClick={() => { setMenuError(''); setReportOpen(true); }}
            disabled={menuBusy}
          >
            <span className="pp-row-icon"><Flag size={17} aria-hidden="true" /></span>
            <span className="pp-row-body">
              <strong>Report {partnerFirst}</strong>
              <small style={{ whiteSpace: 'normal', lineHeight: 1.35 }}>
                Send the admins what happened
              </small>
            </span>
          </button>

          <button
            type="button"
            className="pp-row pp-row-danger"
            onClick={() => void doBlock()}
            disabled={menuBusy}
          >
            <span className="pp-row-icon"><Ban size={17} aria-hidden="true" /></span>
            <span className="pp-row-body">
              <strong>Block {partnerFirst}</strong>
              <small style={{ whiteSpace: 'normal', lineHeight: 1.35 }}>
                They can no longer message you
              </small>
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  // ---- Report sheet, over the menu ----------------------------------------
  const reportSheet = reportOpen && openThread && (
    <div
      className="hf-sheet-scrim"
      onClick={(e) => { if (e.target === e.currentTarget) setReportOpen(false); }}
    >
      <div className="hf-sheet pp-sheet" role="dialog" aria-modal="true" aria-label={`Report ${partnerFirst}`}>
        <div className="hf-sheet-head">
          <h2>Report {partnerFirst}</h2>
          <button type="button" className="portal-sheet-close" onClick={() => setReportOpen(false)} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <p className="hf-sheet-sub">
          Only the admins see this. {partnerFirst} is not notified.
        </p>

        <span
          id="report-reason-label"
          style={{ display: 'block', margin: '0 0 0.4rem 0.15rem', fontSize: '0.76rem', fontWeight: 750, color: 'var(--text-secondary)' }}
        >
          Reason
        </span>
        <div
          role="group"
          aria-labelledby="report-reason-label"
          style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '0.9rem' }}
        >
          {REPORT_REASONS.map((r) => {
            const on = reportReason === r;
            return (
              <button
                key={r}
                type="button"
                className="pp-chip"
                aria-pressed={on}
                onClick={() => setReportReason(r)}
                style={{
                  minHeight: 44, padding: '0 0.9rem',
                  border: on ? '1px solid transparent' : HAIRLINE,
                  background: on ? 'var(--green-950)' : 'var(--bg-secondary)',
                  color: on ? '#fff' : 'var(--text-secondary)',
                  font: 'inherit', fontSize: '0.78rem', fontWeight: 750, cursor: 'pointer',
                }}
              >
                {r}
              </button>
            );
          })}
        </div>

        <div className="pp-sheet-fields">
          <div className="pp-field">
            <label htmlFor="report-details">Details (optional)</label>
            <textarea
              id="report-details"
              rows={3}
              maxLength={2000}
              value={reportDetails}
              placeholder="What happened? Anything the admins should see."
              onChange={(e) => setReportDetails(e.target.value)}
            />
          </div>
        </div>

        {menuErrorNode}

        <button
          type="button"
          className="pp-sheet-save"
          onClick={() => void submitReport()}
          disabled={!reportReason || menuBusy}
        >
          {menuBusy ? <Loader2 size={16} className="spin" aria-hidden="true" /> : 'Submit report'}
        </button>
      </div>
    </div>
  );

  // ---- Message menu: react, reply, forward, copy ---------------------------
  // Held open by id, not by object: a poll landing mid-decision must not swap
  // the sheet's contents underneath the thumb.
  const menuMsg = msgMenu ? messages.find((m) => m.id === msgMenu) ?? null : null;
  const menuMine = menuMsg ? myReactionTo(menuMsg.id) : null;
  const menuCopyable = menuMsg ? readableText(menuMsg) : null;

  const msgMenuSheet = menuMsg && (
    <div
      className="hf-sheet-scrim"
      onClick={(e) => { if (e.target === e.currentTarget) setMsgMenu(null); }}
    >
      <div className="hf-sheet pp-sheet" role="dialog" aria-modal="true" aria-label="Message options">
        <div className="hf-sheet-head">
          <h2>Message</h2>
          <button type="button" className="portal-sheet-close" onClick={() => setMsgMenu(null)} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        {/* Which message this is about — the sheet covers the bubble itself. */}
        <p className="hf-sheet-sub" style={{
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {snippetOf(menuMsg)}
        </p>

        <div
          role="group"
          aria-label="React to this message"
          style={{
            display: 'flex', flexWrap: 'wrap', gap: 6,
            justifyContent: 'space-between', margin: '0.5rem 0 1rem',
          }}
        >
          {REACTIONS.map((emoji) => {
            const on = menuMine === emoji;
            return (
              <button
                key={emoji}
                type="button"
                aria-pressed={on}
                aria-label={on ? `Remove your ${emoji} reaction` : `React ${emoji}`}
                onClick={() => void react(menuMsg.id, emoji)}
                style={{
                  display: 'grid', placeItems: 'center', width: 44, height: 44,
                  borderRadius: '50%', fontSize: '1.35rem', lineHeight: 1, cursor: 'pointer',
                  background: on ? 'var(--green-50)' : 'var(--bg-secondary)',
                  border: on ? '2px solid var(--primary-600)' : '1px solid transparent',
                }}
              >
                <span aria-hidden="true">{emoji}</span>
              </button>
            );
          })}
        </div>

        <div className="pp-group-card" style={{ marginBottom: '0.4rem' }}>
          {threadOpen && (
            <button
              type="button"
              className="pp-row"
              onClick={() => {
                setReplyTo(menuMsg);
                setMsgMenu(null);
                window.setTimeout(() => taRef.current?.focus(), 0);
              }}
            >
              <span className="pp-row-icon"><Reply size={17} aria-hidden="true" /></span>
              <span className="pp-row-body"><strong>Reply</strong></span>
            </button>
          )}
          <button
            type="button"
            className="pp-row"
            onClick={() => { setMenuError(''); setForwardOf(menuMsg); setMsgMenu(null); }}
          >
            <span className="pp-row-icon"><Share2 size={17} aria-hidden="true" /></span>
            <span className="pp-row-body"><strong>Forward</strong></span>
          </button>
          {menuCopyable && (
            <button type="button" className="pp-row" onClick={() => void copyMsg(menuMsg)}>
              <span className="pp-row-icon"><Copy size={17} aria-hidden="true" /></span>
              <span className="pp-row-body"><strong>Copy text</strong></span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // ---- Forward picker ------------------------------------------------------
  // Only chats that can still take a message: not this one, and not frozen.
  const forwardTargets = threads.filter((t) => t.id !== openId && t.open);

  const forwardSheet = forwardOf && (
    <div
      className="hf-sheet-scrim"
      onClick={(e) => { if (e.target === e.currentTarget) setForwardOf(null); }}
    >
      <div className="hf-sheet pp-sheet" role="dialog" aria-modal="true" aria-label="Forward to">
        <div className="hf-sheet-head">
          <h2>Forward to</h2>
          <button type="button" className="portal-sheet-close" onClick={() => setForwardOf(null)} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <p className="hf-sheet-sub">
          Sends a copy, marked forwarded. This chat is left exactly as it is.
        </p>

        {menuErrorNode}

        {forwardTargets.length === 0 ? (
          <p style={{ margin: '1rem 0.2rem', fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            You have no other open chat to forward this to yet.
          </p>
        ) : (
          <div className="pp-group-card" style={{ marginBottom: '0.4rem' }}>
            {forwardTargets.map((t) => {
              const tname = fullName(t.partnerFirstName, t.partnerLastName);
              const busy = fwdBusy === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  className="pp-row"
                  onClick={() => void doForward(t)}
                  disabled={fwdBusy != null}
                  style={{ opacity: fwdBusy != null && !busy ? 0.55 : 1 }}
                >
                  <Avatar name={tname} size={40} />
                  <span className="pp-row-body">
                    <strong>{tname}</strong>
                    {t.partnerJobTitle && (
                      <small style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.partnerJobTitle}
                      </small>
                    )}
                  </span>
                  {busy && <Loader2 size={16} className="spin" aria-hidden="true" style={{ flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ---- Chat settings sheet -------------------------------------------------
  const settingsRow = (
    key: keyof ChatSettings,
    Icon: LucideIcon,
    title: string,
    sub: string
  ) => {
    const on = chatSettings?.[key] ?? true;
    return (
      <div className="pp-row pp-row-static">
        <span className="pp-row-icon"><Icon size={17} aria-hidden="true" /></span>
        <span className="pp-row-body">
          <strong>{title}</strong>
          <small style={{ whiteSpace: 'normal', lineHeight: 1.35 }}>{sub}</small>
        </span>
        <button
          type="button"
          className={`pp-toggle ${on ? 'is-on' : ''}`}
          onClick={() => void toggleSetting(key)}
          aria-pressed={on}
          aria-label={`${title}: ${on ? 'on' : 'off'}`}
          disabled={!chatSettings}
          style={{ minHeight: 44, opacity: chatSettings ? 1 : 0.6 }}
        >
          <span className="pp-toggle-dot" aria-hidden="true" />
          {on ? 'On' : 'Off'}
        </button>
      </div>
    );
  };

  const settingsSheet = settingsOpen && (
    <div
      className="hf-sheet-scrim"
      onClick={(e) => { if (e.target === e.currentTarget) setSettingsOpen(false); }}
    >
      <div className="hf-sheet pp-sheet" role="dialog" aria-modal="true" aria-label="Chat settings">
        <div className="hf-sheet-head">
          <h2>Chat settings</h2>
          <button type="button" className="portal-sheet-close" onClick={() => setSettingsOpen(false)} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <p className="hf-sheet-sub">These apply to every chat you have.</p>

        {settingsError && (
          <div role="alert" className="community-error" style={{ marginBottom: 10 }}>
            <AlertCircle size={15} aria-hidden="true" /> {settingsError}
          </div>
        )}

        <h3 style={{
          fontFamily: 'var(--font-display)', fontSize: '0.98rem', fontWeight: 800,
          margin: '0 0 0.45rem', paddingLeft: '0.15rem',
        }}>
          Privacy
        </h3>
        <div className="pp-group-card" style={{ marginBottom: '1rem' }}>
          {settingsRow('readReceipts', CheckCheck, 'Read receipts',
            'When off, you won’t send or see read receipts')}
          {settingsRow('typingIndicator', MessageCircle, 'Typing indicator',
            'When off, no one sees you typing — and you won’t see them')}
        </div>

        <h3 style={{
          fontFamily: 'var(--font-display)', fontSize: '0.98rem', fontWeight: 800,
          margin: '0 0 0.45rem', paddingLeft: '0.15rem',
        }}>
          Blocked
        </h3>
        {settingsLoading && blocked.length === 0 ? (
          <p style={{ margin: '0.2rem 0.2rem 1rem', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
            Loading…
          </p>
        ) : blocked.length === 0 ? (
          <p style={{ margin: '0.2rem 0.2rem 1rem', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
            You haven&apos;t blocked anyone.
          </p>
        ) : (
          <div className="pp-group-card" style={{ marginBottom: '1rem' }}>
            {blocked.map((b) => {
              const bname = fullName(b.firstName, b.lastName);
              return (
                <div key={b.id} className="pp-row pp-row-static">
                  <Avatar name={bname} size={40} />
                  <span className="pp-row-body"><strong>{bname}</strong></span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => void doUnblock(b)}
                    disabled={busyId === b.id}
                    style={{ flexShrink: 0, minHeight: 44 }}
                  >
                    Unblock
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <p style={{
          display: 'flex', alignItems: 'flex-start', gap: 8, margin: 0,
          fontSize: '0.74rem', lineHeight: 1.45, color: 'var(--text-muted)',
        }}>
          <ShieldCheck size={15} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1, color: 'var(--primary-600)' }} />
          Messages are end-to-end encrypted. Photos, videos and files are private but not encrypted.
        </p>
      </div>
    </div>
  );

  const lightboxNode = lightbox && (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo preview"
      onClick={(e) => { if (e.target === e.currentTarget) setLightbox(null); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 'var(--z-modal)' as unknown as number,
        background: 'rgba(8, 16, 12, 0.94)',
        display: 'grid', placeItems: 'center',
        padding: 'calc(1rem + var(--sat)) 1rem calc(1rem + var(--sab))',
      }}
    >
      <img
        src={lightbox}
        alt="Full-size preview"
        style={{ maxWidth: '100%', maxHeight: '82vh', borderRadius: 12, objectFit: 'contain' }}
      />
      <button
        type="button"
        onClick={() => setLightbox(null)}
        aria-label="Close preview"
        style={{
          position: 'absolute', top: 'calc(0.8rem + var(--sat))', right: '0.8rem',
          display: 'grid', placeItems: 'center', width: 44, height: 44,
          border: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.14)', color: '#fff', cursor: 'pointer',
        }}
      >
        <X size={20} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => openAttachment(lightbox)}
        style={{
          position: 'absolute', bottom: 'calc(1.2rem + var(--sab))', left: '50%', transform: 'translateX(-50%)',
          display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '0 1.2rem',
          border: 0, borderRadius: 999, background: 'rgba(255,255,255,0.14)', color: '#fff',
          font: 'inherit', fontSize: '0.86rem', fontWeight: 700, cursor: 'pointer',
        }}
      >
        <Download size={15} aria-hidden="true" /> Open original - save from there
      </button>
    </div>
  );

  // ---- In-app PDF reader ---------------------------------------------------
  // Same shape as the lightbox: dark backdrop, one close control, and the
  // "open original" escape hatch at the bottom for saving or sharing.
  const pdfNode = pdfView && (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={pdfView.name}
      style={{
        position: 'fixed', inset: 0, zIndex: 'var(--z-modal)' as unknown as number,
        background: 'rgba(8, 16, 12, 0.96)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        padding: 'calc(0.6rem + var(--sat)) 0.6rem 0.6rem',
      }}>
        <button
          type="button"
          onClick={() => setPdfView(null)}
          aria-label="Close document"
          style={{
            display: 'grid', placeItems: 'center', width: 44, height: 44, flexShrink: 0,
            border: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.14)', color: '#fff',
            cursor: 'pointer',
          }}
        >
          <X size={20} aria-hidden="true" />
        </button>
        <strong style={{
          flex: 1, minWidth: 0, color: '#fff', fontSize: '0.9rem', fontWeight: 700,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {pdfView.name}
        </strong>
      </div>
      <div style={{
        flex: 1, minHeight: 0, overflowY: 'auto',
        padding: '0 0.6rem calc(4.5rem + var(--sab))',
      }}>
        <PdfPages
          url={pdfView.url}
          // pdfjs cannot open it — hand the document to the system browser
          // rather than leaving a black screen behind.
          onFail={() => { const url = pdfView.url; setPdfView(null); openAttachment(url); }}
        />
      </div>
      <button
        type="button"
        onClick={() => openAttachment(pdfView.url)}
        style={{
          position: 'absolute', bottom: 'calc(1rem + var(--sab))', left: '50%', transform: 'translateX(-50%)',
          display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '0 1.2rem',
          border: 0, borderRadius: 999, background: 'rgba(255,255,255,0.16)', color: '#fff',
          font: 'inherit', fontSize: '0.86rem', fontWeight: 700, cursor: 'pointer',
        }}
      >
        <Download size={15} aria-hidden="true" /> Open original - save from there
      </button>
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
        {msgMenuSheet}
        {forwardSheet}
        {threadMenuSheet}
        {reportSheet}
        {settingsSheet}
        {lightboxNode}
        {pdfNode}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
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
          <button
            type="button"
            onClick={() => void openSettings()}
            aria-label="Chat settings"
            aria-haspopup="dialog"
            style={{
              display: 'grid', placeItems: 'center', flexShrink: 0,
              width: 44, height: 44, border: HAIRLINE, borderRadius: '50%',
              background: 'var(--bg-primary)', color: 'var(--text-secondary)', cursor: 'pointer',
            }}
          >
            <Settings size={18} aria-hidden="true" />
          </button>
        </div>
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
      {msgMenuSheet}
      {forwardSheet}
      {threadMenuSheet}
      {reportSheet}
      {settingsSheet}
      {lightboxNode}
      {pdfNode}
      {toastNode}
    </div>
  );
}
