'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { upload } from '@vercel/blob/client';
import { useApp } from '@/context/app-context';
import type { CommunityPost, CommunityComment, CommunityGroup, CommunityMedia } from '@/types';
import {
  fetchFeed, publishPost, removeOwnPost, likePost,
  fetchComments, publishComment, removeOwnComment,
  reportCommunityContent, blockCommunityMember, fetchGroups,
  joinCommunityGroup,
} from '@/app/actions/community';
import {
  Heart, MessageCircle, Send, Trash2, Flag, UserX, Loader2,
  MoreHorizontal, ImagePlus, Clapperboard, X, ChevronLeft, ChevronRight,
  Link2, Check, Plus, Users, ShieldCheck,
} from 'lucide-react';

/**
 * Community surfaces. The grammar is the familiar social one — byline,
 * media, action row, comment preview — executed in the portal's own voice:
 * hairline-separated white panels on the cream canvas, one interactive
 * accent (forest green), orange reserved for the primary action, red only
 * on an active like.
 *
 * Safety affordances (report with a written reason, block) live one tap
 * behind the ellipsis on every post — a store requirement treated as part
 * of the design, not an afterthought.
 */

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

const initials = (first: string, last: string) =>
  `${(first || '?')[0] ?? ''}${(last || '')[0] ?? ''}`.toUpperCase();

/** Deterministic avatar tone per author — quiet variety, no rainbow. */
const TONES = ['tone-moss', 'tone-clay', 'tone-pine', 'tone-fawn'];
const toneFor = (id: string) => TONES[(id.charCodeAt(0) + id.charCodeAt(id.length - 1)) % TONES.length];

// ============================================================ Upload

async function uploadMedia(file: File, kind: 'image' | 'video'): Promise<string> {
  try {
    const blob = await upload(file.name, file, {
      access: 'public',
      handleUploadUrl: '/api/community/upload',
      clientPayload: kind,
    });
    return blob.url;
  } catch (error) {
    // Blob failed — most commonly because no Blob store is configured in dev.
    // Try the dev-only local-disk endpoint; it 404s in production, in which
    // case the original Blob error is the truth worth surfacing.
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/community/upload-dev', { method: 'POST', body: form });
    if (res.status === 404) throw error;
    if (!res.ok) throw new Error('Upload failed');
    const data = (await res.json()) as { url: string };
    return data.url;
  }
}

type Draft = { media: CommunityMedia; previewUrl: string };

// ============================================================ Composer

export function PostComposer({
  groupId,
  placeholder,
  onPosted,
}: {
  groupId: string | null;
  placeholder: string;
  onPosted: (post: CommunityPost) => void;
}) {
  const { profile } = useApp();
  const [body, setBody] = useState('');
  const [focused, setFocused] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [uploading, setUploading] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  const hasVideo = drafts.some((d) => d.media.type === 'video');
  const expanded = focused || body.length > 0 || drafts.length > 0 || uploading > 0;

  const attach = async (files: FileList | null, kind: 'image' | 'video') => {
    if (!files?.length) return;
    setError('');
    const room = kind === 'video' ? 1 - drafts.length : 4 - drafts.length;
    const chosen = Array.from(files).slice(0, Math.max(room, 0));
    if (chosen.length === 0) {
      setError('A post can carry up to four photos or one video.');
      return;
    }
    setUploading((n) => n + chosen.length);
    await Promise.all(
      chosen.map(async (file) => {
        try {
          const url = await uploadMedia(file, kind);
          setDrafts((d) => [...d, { media: { url, type: kind }, previewUrl: URL.createObjectURL(file) }]);
        } catch {
          setError('Upload failed — check the file size (8 MB photos, 120 MB video).');
        } finally {
          setUploading((n) => n - 1);
        }
      })
    );
  };

  const submit = async () => {
    if (busy || uploading > 0 || (!body.trim() && drafts.length === 0)) return;
    setBusy(true);
    setError('');
    const result = await publishPost({ body, groupId, media: drafts.map((d) => d.media) });
    if (result.ok) {
      setBody('');
      drafts.forEach((d) => URL.revokeObjectURL(d.previewUrl));
      setDrafts([]);
      setFocused(false);
      onPosted(result.data);
    } else {
      setError(result.error);
    }
    setBusy(false);
  };

  return (
    <div className={`community-panel community-composer ${expanded ? 'is-expanded' : ''}`}>
      <div className="community-composer-row">
        {profile && (
          <span className={`community-avatar ${toneFor(profile.id)}`} aria-hidden="true">
            {initials(profile.firstName, profile.lastName)}
          </span>
        )}
        <textarea
          className="community-field"
          rows={expanded ? 3 : 1}
          maxLength={5000}
          value={body}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>

      {(drafts.length > 0 || uploading > 0) && (
        <div className="community-drafts">
          {drafts.map((d, i) => (
            <div key={d.media.url} className="community-draft">
              {d.media.type === 'image'
                ? <img src={d.previewUrl} alt="" />
                : <video src={d.previewUrl} muted />}
              <button
                type="button"
                aria-label="Remove attachment"
                onClick={() => setDrafts((ds) => ds.filter((_, j) => j !== i))}
              >
                <X size={13} />
              </button>
            </div>
          ))}
          {uploading > 0 && (
            <div className="community-draft community-draft-loading" aria-label="Uploading">
              <Loader2 size={18} className="spin" />
            </div>
          )}
        </div>
      )}

      {error && <p role="alert" className="community-error">{error}</p>}

      <div className="community-composer-foot">
        <div className="community-attach">
          <input
            ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
            multiple hidden onChange={(e) => { attach(e.target.files, 'image'); e.target.value = ''; }}
          />
          <input
            ref={videoInput} type="file" accept="video/mp4,video/webm,video/quicktime"
            hidden onChange={(e) => { attach(e.target.files, 'video'); e.target.value = ''; }}
          />
          <button
            type="button" className="community-tool" title="Add photos"
            onClick={() => imageInput.current?.click()}
            disabled={hasVideo || drafts.length >= 4}
          >
            <ImagePlus size={18} /> <span>Photo</span>
          </button>
          <button
            type="button" className="community-tool" title="Add a video"
            onClick={() => videoInput.current?.click()}
            disabled={drafts.length > 0}
          >
            <Clapperboard size={18} /> <span>Video</span>
          </button>
          {body.length > 4500 && (
            <span className="community-count">{5000 - body.length} left</span>
          )}
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={submit}
          disabled={busy || uploading > 0 || (!body.trim() && drafts.length === 0)}
        >
          {busy || uploading > 0 ? <Loader2 size={15} className="spin" /> : null}
          {uploading > 0 ? 'Uploading…' : busy ? 'Posting…' : 'Post'}
        </button>
      </div>
    </div>
  );
}

// ============================================================ Lightbox

function Lightbox({
  media, index, onClose, onIndex,
}: {
  media: CommunityMedia[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onIndex(Math.min(index + 1, media.length - 1));
      if (e.key === 'ArrowLeft') onIndex(Math.max(index - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [index, media.length, onClose, onIndex]);

  const item = media[index];

  return (
    <div className="community-lightbox" role="dialog" aria-label="Media viewer" onClick={onClose}>
      <button className="community-lightbox-close" aria-label="Close" onClick={onClose}>
        <X size={22} />
      </button>
      {index > 0 && (
        <button
          className="community-lightbox-nav is-prev" aria-label="Previous"
          onClick={(e) => { e.stopPropagation(); onIndex(index - 1); }}
        >
          <ChevronLeft size={26} />
        </button>
      )}
      <div className="community-lightbox-stage" onClick={(e) => e.stopPropagation()}>
        {item.type === 'image'
          ? <img src={item.url} alt="" />
          : <video src={item.url} controls autoPlay playsInline />}
      </div>
      {index < media.length - 1 && (
        <button
          className="community-lightbox-nav is-next" aria-label="Next"
          onClick={(e) => { e.stopPropagation(); onIndex(index + 1); }}
        >
          <ChevronRight size={26} />
        </button>
      )}
      {media.length > 1 && (
        <div className="community-lightbox-dots" aria-hidden="true">
          {media.map((_, i) => <span key={i} className={i === index ? 'active' : ''} />)}
        </div>
      )}
    </div>
  );
}

// ============================================================ Media grid

function PostMedia({
  media, onLikeBurst,
}: {
  media: CommunityMedia[];
  onLikeBurst: () => void;
}) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [burst, setBurst] = useState(false);
  const lastTap = useRef(0);

  const tap = (i: number) => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      setBurst(true);
      setTimeout(() => setBurst(false), 900);
      onLikeBurst();
      lastTap.current = 0;
    } else {
      lastTap.current = now;
      setTimeout(() => {
        if (lastTap.current === now) setLightbox(i);
      }, 310);
    }
  };

  if (media.length === 0) return null;

  return (
    <>
      <div className={`community-media community-media-${Math.min(media.length, 4)}`}>
        {media.map((m, i) => (
          <button key={m.url} type="button" className="community-media-cell" onClick={() => tap(i)}>
            {m.type === 'image'
              ? <img src={m.url} alt="" loading="lazy" />
              : <video src={m.url} muted playsInline preload="metadata" />}
            {m.type === 'video' && (
              <span className="community-media-play" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>
              </span>
            )}
          </button>
        ))}
        {burst && <Heart className="community-heart-burst" aria-hidden="true" fill="currentColor" />}
      </div>
      {lightbox !== null && (
        <Lightbox media={media} index={lightbox} onClose={() => setLightbox(null)} onIndex={setLightbox} />
      )}
    </>
  );
}

// ============================================================ Comments

function CommentThread({
  post, onCount,
}: {
  post: CommunityPost;
  onCount: (n: number) => void;
}) {
  const { profile } = useApp();
  const [comments, setComments] = useState<CommunityComment[] | null>(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    fetchComments(post.id).then((r) => {
      if (alive && r.ok) {
        setComments(r.data);
        onCount(r.data.length);
      }
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);

  const submit = async () => {
    if (!body.trim() || busy) return;
    setBusy(true);
    setError('');
    const result = await publishComment({ postId: post.id, body });
    if (result.ok) {
      setComments((c) => {
        const next = [...(c ?? []), result.data];
        onCount(next.length);
        return next;
      });
      setBody('');
    } else {
      setError(result.error);
    }
    setBusy(false);
  };

  const remove = async (id: string) => {
    const r = await removeOwnComment(id);
    if (r.ok) {
      setComments((c) => {
        const next = (c ?? []).filter((x) => x.id !== id);
        onCount(next.length);
        return next;
      });
    }
  };

  return (
    <div className="community-comments">
      {comments === null && (
        <div className="community-comment-skeleton" aria-hidden="true">
          <span /><span />
        </div>
      )}
      {comments?.map((c) => (
        <div key={c.id} className="community-comment">
          <span className={`community-avatar community-avatar-sm ${toneFor(c.authorId)}`} aria-hidden="true">
            {initials(c.authorFirstName, c.authorLastName)}
          </span>
          <p className="community-comment-text">
            <strong>{c.authorFirstName} {c.authorLastName}</strong>{' '}
            {c.body}
            <small>{timeAgo(c.createdAt)}</small>
          </p>
          {profile?.id === c.authorId && (
            <button className="community-tool community-tool-icon" onClick={() => remove(c.id)} aria-label="Delete comment">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ))}
      <div className="community-comment-compose">
        <input
          className="community-field"
          maxLength={2000}
          value={body}
          placeholder="Add a comment…"
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
        />
        <button
          className="community-comment-send"
          onClick={submit}
          disabled={busy || !body.trim()}
          aria-label="Send comment"
        >
          {busy ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
        </button>
      </div>
      {error && <p role="alert" className="community-error">{error}</p>}
    </div>
  );
}

// ============================================================ Post card

export function PostCard({
  post, onDeleted, onAuthorBlocked,
}: {
  post: CommunityPost;
  onDeleted: (id: string) => void;
  onAuthorBlocked: (authorId: string) => void;
}) {
  const { profile } = useApp();
  const [likeState, setLikeState] = useState({ liked: post.likedByMe, count: post.likeCount });
  const [likePop, setLikePop] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [notice, setNotice] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const mine = profile?.id === post.authorId;

  const toggleLike = async () => {
    setLikePop(true);
    setTimeout(() => setLikePop(false), 300);
    setLikeState((s) => ({ liked: !s.liked, count: s.count + (s.liked ? -1 : 1) }));
    const r = await likePost(post.id);
    if (r.ok) setLikeState({ liked: r.data.liked, count: r.data.likeCount });
  };

  /** Double-tap path: like if not liked yet; never unlike. */
  const ensureLiked = async () => {
    if (likeState.liked) return;
    await toggleLike();
  };

  const deletePost = async () => {
    if (!window.confirm('Delete this post permanently?')) return;
    const r = await removeOwnPost(post.id);
    if (r.ok) onDeleted(post.id);
  };

  const sendReport = async () => {
    if (reportReason.trim().length < 3) return;
    const r = await reportCommunityContent({
      targetType: 'post', targetId: post.id, reason: reportReason,
    });
    setNotice(r.ok ? 'Reported — our moderators will review it.' : r.error);
    setReporting(false);
    setReportReason('');
    setMenuOpen(false);
  };

  const block = async () => {
    if (!window.confirm(`Block ${post.authorFirstName}? You will no longer see each other's posts or comments.`)) return;
    const r = await blockCommunityMember(post.authorId);
    if (r.ok) onAuthorBlocked(post.authorId);
    setMenuOpen(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/portal/member/community#post-${post.id}`);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1600);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <article className="community-panel community-post" id={`post-${post.id}`}>
      <header className="community-post-head">
        <span className={`community-avatar ${toneFor(post.authorId)}`} aria-hidden="true">
          {initials(post.authorFirstName, post.authorLastName)}
        </span>
        <div className="community-post-meta">
          <strong>{post.authorFirstName} {post.authorLastName}</strong>
          <small>
            {post.authorCity ? `${post.authorCity} · ` : ''}{timeAgo(post.createdAt)}
            {post.groupName ? <> · <em>{post.groupName}</em></> : null}
          </small>
        </div>

        {mine ? (
          <button className="community-tool community-tool-icon" onClick={deletePost} aria-label="Delete post">
            <Trash2 size={16} />
          </button>
        ) : (
          <div className="community-menu-wrap">
            <button
              className="community-tool community-tool-icon"
              onClick={() => { setMenuOpen((v) => !v); setReporting(false); }}
              aria-expanded={menuOpen}
              aria-label="Post options"
            >
              <MoreHorizontal size={18} />
            </button>
            {menuOpen && (
              <div className="community-menu" role="menu">
                {reporting ? (
                  <div className="community-report-form">
                    <label htmlFor={`report-${post.id}`}>Why are you reporting this?</label>
                    <textarea
                      id={`report-${post.id}`}
                      rows={2}
                      maxLength={500}
                      autoFocus
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                    />
                    <div>
                      <button className="community-tool" onClick={() => setReporting(false)}>Cancel</button>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={sendReport}
                        disabled={reportReason.trim().length < 3}
                      >
                        Send report
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button onClick={() => setReporting(true)}><Flag size={14} /> Report post</button>
                    <button onClick={block}><UserX size={14} /> Block {post.authorFirstName}</button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </header>

      {post.body.trim() && <p className="community-post-body">{post.body}</p>}
      <PostMedia media={post.media ?? []} onLikeBurst={ensureLiked} />
      {notice && <p className="community-notice"><ShieldCheck size={13} /> {notice}</p>}

      <footer className="community-post-foot">
        <div className="community-action-row">
          <button
            className={`community-action ${likeState.liked ? 'is-liked' : ''} ${likePop ? 'is-pop' : ''}`}
            onClick={toggleLike}
            aria-pressed={likeState.liked}
            aria-label={likeState.liked ? 'Unlike' : 'Like'}
          >
            <Heart size={21} fill={likeState.liked ? 'currentColor' : 'none'} strokeWidth={1.8} />
          </button>
          <button
            className="community-action"
            onClick={() => setCommentsOpen((v) => !v)}
            aria-expanded={commentsOpen}
            aria-label="Comments"
          >
            <MessageCircle size={21} strokeWidth={1.8} />
          </button>
          <button className="community-action" onClick={copyLink} aria-label="Copy link">
            {linkCopied ? <Check size={21} strokeWidth={1.8} /> : <Link2 size={21} strokeWidth={1.8} />}
          </button>
        </div>

        {likeState.count > 0 && (
          <p className="community-likes-line">
            {likeState.count} {likeState.count === 1 ? 'like' : 'likes'}
          </p>
        )}
        {!commentsOpen && commentCount > 0 && (
          <button className="community-comments-line" onClick={() => setCommentsOpen(true)}>
            View {commentCount === 1 ? 'the comment' : `all ${commentCount} comments`}
          </button>
        )}
      </footer>

      {commentsOpen && <CommentThread post={post} onCount={setCommentCount} />}
    </article>
  );
}

// ============================================================ Groups rail

export function GroupsRail() {
  const [groups, setGroups] = useState<CommunityGroup[] | null>(null);

  useEffect(() => {
    fetchGroups().then((r) => { if (r.ok) setGroups(r.data); });
  }, []);

  return (
    <div className="community-rail" aria-label="Groups">
      <Link href="/portal/member/community/groups" className="community-rail-item">
        <span className="community-rail-circle community-rail-new"><Plus size={20} /></span>
        <small>Groups</small>
      </Link>
      {(groups ?? []).slice(0, 12).map((g) => (
        <Link
          key={g.id}
          href={`/portal/member/community/groups/${g.id}`}
          className="community-rail-item"
          title={g.name}
        >
          <span className={`community-rail-circle ${g.isMember ? 'is-member' : ''}`}>
            {g.name.slice(0, 2).toUpperCase()}
          </span>
          <small>{g.name}</small>
        </Link>
      ))}
      {groups === null && (
        <span className="community-rail-item" aria-hidden="true">
          <span className="community-rail-circle community-shimmer" />
          <small>&nbsp;</small>
        </span>
      )}
    </div>
  );
}

// ============================================================ Desktop aside

export function CommunityAside() {
  const [groups, setGroups] = useState<CommunityGroup[] | null>(null);

  useEffect(() => {
    fetchGroups().then((r) => { if (r.ok) setGroups(r.data); });
  }, []);

  const mine = (groups ?? []).filter((g) => g.isMember);
  const discover = (groups ?? []).filter((g) => !g.isMember).slice(0, 3);

  const join = async (id: string) => {
    const r = await joinCommunityGroup(id);
    if (r.ok) {
      setGroups((gs) =>
        (gs ?? []).map((g) =>
          g.id === id ? { ...g, isMember: true, memberCount: g.memberCount + 1, myRole: 'member' as const } : g
        )
      );
    }
  };

  return (
    <aside className="community-aside" aria-label="Community sidebar">
      <section>
        <header className="community-aside-head">
          <h2>Your groups</h2>
          <Link href="/portal/member/community/groups">See all</Link>
        </header>
        {groups === null && <div className="community-aside-shimmer community-shimmer" aria-hidden="true" />}
        {groups !== null && mine.length === 0 && (
          <p className="community-aside-empty">
            Groups are smaller rooms inside the club — join one and its posts
            appear in your feed.
          </p>
        )}
        <ul className="community-aside-list">
          {mine.slice(0, 6).map((g) => (
            <li key={g.id}>
              <Link href={`/portal/member/community/groups/${g.id}`}>
                <span className="community-rail-circle is-member">{g.name.slice(0, 2).toUpperCase()}</span>
                <span className="community-aside-name">
                  <strong>{g.name}</strong>
                  <small>{g.memberCount} member{g.memberCount === 1 ? '' : 's'}</small>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {discover.length > 0 && (
        <section>
          <header className="community-aside-head">
            <h2>Discover</h2>
          </header>
          <ul className="community-aside-list">
            {discover.map((g) => (
              <li key={g.id}>
                <Link href={`/portal/member/community/groups/${g.id}`}>
                  <span className="community-rail-circle">{g.name.slice(0, 2).toUpperCase()}</span>
                  <span className="community-aside-name">
                    <strong>{g.name}</strong>
                    <small>{g.memberCount} member{g.memberCount === 1 ? '' : 's'}</small>
                  </span>
                </Link>
                <button className="community-aside-join" onClick={() => join(g.id)}>Join</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="community-aside-note">
        <ShieldCheck size={13} aria-hidden="true" /> Be kind. Posts are moderated;
        report anything that does not belong.
      </p>
    </aside>
  );
}

// ============================================================ Feed

export function CommunityFeed({
  groupId,
  composerPlaceholder,
  readOnly = false,
  showRail = false,
}: {
  /** undefined = home feed (public + my groups); null = public only; id = one group */
  groupId?: string | null;
  composerPlaceholder: string;
  readOnly?: boolean;
  showRail?: boolean;
}) {
  const [posts, setPosts] = useState<CommunityPost[] | null>(null);
  const [error, setError] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(false);

  const load = useCallback(async () => {
    const r = await fetchFeed({ groupId });
    if (r.ok) {
      setPosts(r.data);
      setExhausted(r.data.length < 25);
    } else {
      setError(r.error);
    }
  }, [groupId]);

  useEffect(() => { load(); }, [load]);

  const loadMore = async () => {
    if (!posts?.length) return;
    setLoadingMore(true);
    const r = await fetchFeed({ groupId, before: posts[posts.length - 1].createdAt });
    if (r.ok) {
      setPosts((p) => [...(p ?? []), ...r.data]);
      if (r.data.length < 25) setExhausted(true);
    }
    setLoadingMore(false);
  };

  return (
    <div className="community-feed">
      {showRail && <GroupsRail />}

      {!readOnly && (
        <PostComposer
          groupId={groupId ?? null}
          placeholder={composerPlaceholder}
          onPosted={(post) => setPosts((p) => [post, ...(p ?? [])])}
        />
      )}

      {error && <p role="alert" className="community-error">{error}</p>}

      {posts === null && !error && (
        <div className="community-panel community-post" aria-hidden="true">
          <div className="community-post-head">
            <span className="community-avatar community-shimmer" />
            <div className="community-post-meta">
              <span className="community-line-shimmer community-shimmer" style={{ width: '9rem' }} />
              <span className="community-line-shimmer community-shimmer" style={{ width: '5.5rem' }} />
            </div>
          </div>
          <div className="community-block-shimmer community-shimmer" />
        </div>
      )}

      {posts?.length === 0 && (
        <div className="community-panel community-empty">
          <Users size={22} aria-hidden="true" />
          <p><strong>It&rsquo;s quiet in here.</strong></p>
          <p>Posts from members appear in this feed — share a win, ask a question, or post a photo from an event.</p>
        </div>
      )}

      {posts?.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onDeleted={(id) => setPosts((p) => (p ?? []).filter((x) => x.id !== id))}
          onAuthorBlocked={(authorId) =>
            setPosts((p) => (p ?? []).filter((x) => x.authorId !== authorId))
          }
        />
      ))}

      {posts && posts.length > 0 && !exhausted && (
        <button className="btn btn-outline community-more" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? 'Loading…' : 'Load older posts'}
        </button>
      )}
    </div>
  );
}
