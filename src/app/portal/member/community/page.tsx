'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { CommunityGroup, CommunityPost } from '@/types';
import {
  fetchCommunityStart, fetchPersonalFeed, fetchGroupsExplore,
  startGroup, joinCommunityGroup, leaveCommunityGroup,
} from '@/app/actions/community';
import { useRouter } from 'next/navigation';
import { searchPeople, followMember, unfollowMember, openChat } from '@/app/actions/chat';
import type { ChatPerson, ChatPeople } from '@/server/repos/chat';
import { PostCard, PostComposer, CommunityAside } from '@/components/portal/community';
import PortalLoading from '@/components/portal/PortalLoading';
import { useConfirm } from '@/components/portal/confirm';
import { readCache, writeCache, CACHE_KEYS } from '@/lib/swr-cache';
import {
  Newspaper, UsersRound, Search, Plus, Users, Check, ChevronRight, X,
  AlertCircle, UserPlus, MessageCircle, Sparkles,
} from 'lucide-react';

/**
 * Community, three tabs deep:
 *
 *   Feed    my own posts, posts from people whose follow I accepted, posts in
 *           my groups, plus a sprinkle from groups worth joining — those carry
 *           a Join button inline. Suggestion rails are woven BETWEEN posts
 *           (every fourth), never pinned to the top, so scrolling keeps
 *           surfacing people and groups.
 *   Groups  searchable directory: mine, suggested (with the reason said out
 *           loud), then everything else.
 *   People  searchable member directory with follow state and a Message
 *           button on every row (0040: anyone can be messaged; the follow
 *           only decides whose inbox the chat starts in).
 *
 * The server decides relevance (listPersonalFeed / exploreGroups /
 * searchPeople); this file only decides how it reads.
 */

type Tab = 'feed' | 'groups' | 'people';
const TABS: { id: Tab; label: string; icon: typeof Newspaper }[] = [
  { id: 'feed', label: 'Feed', icon: Newspaper },
  { id: 'groups', label: 'Groups', icon: UsersRound },
  { id: 'people', label: 'People', icon: Search },
];

const PAGE = 20;

/**
 * Exactly what fetchCommunityStart returns. The portal shell warms this under
 * CACHE_KEYS.community while the member is on another tab, so arriving here
 * paints a full page with no round trip.
 */
type CommunityStart = {
  posts: CommunityPost[];
  /** One group list serving the Groups tab, the feed's Join cards and the aside. */
  groups: CommunityGroup[];
  people: ChatPeople;
};

/** How many Join cards the feed weaves in. */
const RAIL_GROUPS = 6;

/**
 * Keep the cached first paint in step with an optimistic change. Module scope,
 * not a closure: it touches only the cache, so every caller shares one stable
 * reference and the loaders below stay memoised.
 */
const patchStart = (patch: Partial<CommunityStart>) => {
  const cur = readCache<CommunityStart>(CACHE_KEYS.community);
  if (cur) writeCache<CommunityStart>(CACHE_KEYS.community, { ...cur, ...patch });
};
/** A suggestion rail lands after every Nth post. */
const RAIL_EVERY = 4;

const initials = (a: string, b: string) => `${a?.[0] ?? ''}${b?.[0] ?? ''}`.toUpperCase() || '?';
const fullName = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`.trim();

const HAIRLINE = '1px solid rgba(27, 67, 50, 0.08)';

/** One row of the feed: a post, or a rail of people/groups between posts. */
type FeedItem =
  | { kind: 'post'; post: CommunityPost }
  | { kind: 'people'; people: ChatPerson[] }
  | { kind: 'groups'; groups: CommunityGroup[] };

export default function CommunityPage() {
  const confirm = useConfirm();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('feed');
  const [toast, setToast] = useState('');

  // ---- Feed ---------------------------------------------------------------
  // The feed and both rails come from ONE cached payload now, because one
  // action fetches them.
  const cached = readCache<CommunityStart>(CACHE_KEYS.community);
  const [posts, setPosts] = useState<CommunityPost[] | null>(cached?.posts ?? null);
  const [feedError, setFeedError] = useState('');
  const [feedEnd, setFeedEnd] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [railPeople, setRailPeople] = useState<ChatPerson[]>(cached?.people.suggestions ?? []);
  const sentinel = useRef<HTMLDivElement | null>(null);

  // ---- Groups -------------------------------------------------------------
  const [groups, setGroups] = useState<CommunityGroup[] | null>(cached?.groups ?? null);
  const [groupQuery, setGroupQuery] = useState('');
  const [groupsError, setGroupsError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState('');

  // ---- People -------------------------------------------------------------
  const [people, setPeople] = useState<ChatPerson[] | null>(cached?.people.suggestions ?? null);
  const [peopleQuery, setPeopleQuery] = useState('');
  const [peopleError, setPeopleError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  // The tab comes from the URL once (the old /community/groups route redirects
  // here with ?tab=groups); afterwards the URL follows the tab.
  useEffect(() => {
    const asked = new URLSearchParams(window.location.search).get('tab');
    if (asked === 'groups' || asked === 'people') setTab(asked);
  }, []);

  const switchTab = (next: Tab) => {
    setTab(next);
    const url = next === 'feed' ? '/portal/member/community' : `/portal/member/community?tab=${next}`;
    window.history.replaceState(null, '', url);
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // ---- Loaders ------------------------------------------------------------
  /**
   * The feed AND both rails in one round trip. This used to be three actions
   * fired from one effect - and because Next runs a client's Server Action
   * calls one at a time, they ran back to back, which is why the page appeared
   * instantly and its content two seconds later.
   */
  const loadStart = useCallback(async () => {
    const r = await fetchCommunityStart();
    if (r.ok) {
      writeCache<CommunityStart>(CACHE_KEYS.community, r.data);
      setPosts(r.data.posts);
      setGroups(r.data.groups);
      setRailPeople(r.data.people.suggestions);
      setFeedEnd(r.data.posts.length < PAGE);
      setFeedError('');
    } else {
      setFeedError(r.error);
    }
  }, []);

  // The unfiltered list arrived with loadStart, so opening the tab paints
  // instantly and this only revalidates behind it.
  const loadGroups = useCallback(async (query: string) => {
    const r = await fetchGroupsExplore(query);
    if (r.ok) {
      setGroups(r.data);
      if (!query) patchStart({ groups: r.data });
      setGroupsError('');
    } else {
      setGroupsError(r.error);
    }
  }, []);

  // Incoming follow requests already arrived with loadStart, so this is one
  // call now rather than searchPeople + listPeople back to back.
  const loadPeople = useCallback(async (query: string) => {
    const sRes = await searchPeople(query);
    if (sRes.ok) {
      setPeople(sRes.data);
      setPeopleError('');
    } else {
      setPeopleError(sRes.error);
    }
  }, []);

  // First paint: the feed and its rails. The other tabs load when opened.
  useEffect(() => { void loadStart(); }, [loadStart]);

  useEffect(() => {
    if (tab !== 'groups') return;
    const t = setTimeout(() => void loadGroups(groupQuery.trim()), groupQuery ? 300 : 0);
    return () => clearTimeout(t);
  }, [tab, groupQuery, loadGroups]);

  useEffect(() => {
    if (tab !== 'people') return;
    const t = setTimeout(() => void loadPeople(peopleQuery.trim()), peopleQuery ? 300 : 0);
    return () => clearTimeout(t);
  }, [tab, peopleQuery, loadPeople]);

  // ---- Feed paging --------------------------------------------------------
  const loadMore = useCallback(async () => {
    if (loadingMore || feedEnd || !posts || posts.length === 0) return;
    setLoadingMore(true);
    const r = await fetchPersonalFeed({ before: posts[posts.length - 1].createdAt });
    if (r.ok) {
      setPosts((prev) => {
        const seen = new Set((prev ?? []).map((p) => p.id));
        const merged = [...(prev ?? []), ...r.data.filter((p) => !seen.has(p.id))];
        writeCache('community-feed', merged);
        return merged;
      });
      if (r.data.length < PAGE) setFeedEnd(true);
    } else {
      setFeedError(r.error);
    }
    setLoadingMore(false);
  }, [loadingMore, feedEnd, posts]);

  // Auto-load when the sentinel scrolls into view; the button below stays as
  // the visible, keyboard-reachable fallback.
  useEffect(() => {
    if (tab !== 'feed' || feedEnd) return;
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) void loadMore();
    }, { rootMargin: '400px' });
    io.observe(el);
    return () => io.disconnect();
  }, [tab, feedEnd, loadMore]);

  // ---- Mutations ----------------------------------------------------------
  // State and cache move TOGETHER. Updating only state left the cached copy
  // stale, so navigating away and back re-painted a Join button for a group
  // the member had already joined until the background refresh landed.
  const commitPosts = (fn: (prev: CommunityPost[]) => CommunityPost[]) =>
    setPosts((prev) => { const next = fn(prev ?? []); patchStart({ posts: next }); return next; });
  const commitGroups = (fn: (prev: CommunityGroup[]) => CommunityGroup[]) =>
    setGroups((prev) => { const next = fn(prev ?? []); patchStart({ groups: next }); return next; });
  const commitPeople = (fn: (prev: ChatPerson[]) => ChatPerson[]) =>
    setPeople((prev) => fn(prev ?? []));

  const joinGroupById = async (group: { id: string; name: string }) => {
    setBusyId(group.id);
    const r = await joinCommunityGroup(group.id);
    if (r.ok) {
      // Every post from that group is now "mine", so the Join CTA disappears
      // from all of them at once, not just the one that was tapped.
      commitPosts((ps) => ps.map((p) => (p.groupId === group.id ? { ...p, source: 'group' as const, inGroup: true } : p)));
      commitGroups((gs) => gs.map((g) => (
        g.id === group.id
          ? { ...g, isMember: true, memberCount: g.memberCount + 1, myRole: 'member' as const, suggestReason: null }
          : g
      )));
      setToast(`Joined ${group.name}`);
    } else {
      setGroupsError(r.error);
    }
    setBusyId(null);
  };

  const leaveGroupById = async (group: CommunityGroup) => {
    const ok = await confirm({
      title: `Leave ${group.name}?`,
      message: 'Their posts stop appearing in your feed. You can join again any time.',
      confirmLabel: 'Leave',
      tone: 'danger',
    });
    if (!ok) return;
    setBusyId(group.id);
    const r = await leaveCommunityGroup(group.id);
    if (r.ok) {
      commitGroups((gs) => gs.map((g) => (
        g.id === group.id
          ? { ...g, isMember: false, memberCount: Math.max(0, g.memberCount - 1), myRole: null }
          : g
      )));
      commitPosts((ps) => ps.filter((p) => p.groupId !== group.id));
      setToast(`Left ${group.name}`);
    } else {
      setGroupsError(r.error);
    }
    setBusyId(null);
  };

  const createGroup = async () => {
    if (formBusy) return;
    setFormBusy(true);
    setFormError('');
    const r = await startGroup(form);
    if (r.ok) {
      commitGroups((g) => [r.data, ...g]);
      setForm({ name: '', description: '' });
      setCreating(false);
      setToast('Group created');
    } else {
      setFormError(r.error);
    }
    setFormBusy(false);
  };

  /** Optimistic follow-state flip, shared by the People tab and the feed rail. */
  const setFollowState = (id: string, outgoing: ChatPerson['outgoing']) => {
    commitPeople((ps) => ps.map((p) => (p.id === id ? { ...p, outgoing } : p)));
    setRailPeople((ps) => ps.map((p) => (p.id === id ? { ...p, outgoing } : p)));
  };

  const follow = async (person: ChatPerson) => {
    setBusyId(person.id);
    // Instant since 0040 - no request, no acceptance.
    setFollowState(person.id, 'accepted');
    const r = await followMember(person.id);
    if (!r.ok) { setFollowState(person.id, 'none'); setPeopleError(r.error); }
    else setToast(`Following ${person.firstName}`);
    setBusyId(null);
  };

  const unfollow = async (person: ChatPerson) => {
    if (person.outgoing === 'accepted') {
      const ok = await confirm({
        title: `Unfollow ${fullName(person)}?`,
        message: 'Their posts leave your feed. Your chat with them is not affected.',
        confirmLabel: 'Unfollow',
        tone: 'danger',
      });
      if (!ok) return;
    }
    setBusyId(person.id);
    setFollowState(person.id, 'none');
    const r = await unfollowMember(person.id);
    if (!r.ok) { setFollowState(person.id, person.outgoing); setPeopleError(r.error); }
    setBusyId(null);
  };

  /** Open (or create) the DM and land in it. Works for anyone - if they don't
      follow you, the thread waits in their requests, and the chat page says so. */
  const message = async (person: ChatPerson) => {
    setBusyId(person.id);
    const r = await openChat(person.id);
    if (!r.ok) { setPeopleError(r.error); setBusyId(null); return; }
    router.push(`/portal/member/chats?c=${r.data}`);
  };

  /** The feed's inline Join cards: groups I am not in, best match first. */
  const railGroups = useMemo(
    () => (groups ?? []).filter((g) => !g.isMember).slice(0, RAIL_GROUPS),
    [groups]
  );

  // ---- Feed assembly: posts with rails woven in --------------------------
  const feedItems = useMemo<FeedItem[]>(() => {
    const out: FeedItem[] = [];
    let peopleAt = 0;
    let groupsAt = 0;
    let railNo = 0;
    (posts ?? []).forEach((post, i) => {
      out.push({ kind: 'post', post });
      if ((i + 1) % RAIL_EVERY !== 0) return;
      // Alternate people / groups, and fall through to whichever pool still
      // has unseen entries. Nobody appears in two rails.
      const wantPeople = railNo % 2 === 0;
      const takePeople = () => {
        const slice = railPeople.slice(peopleAt, peopleAt + 6);
        if (slice.length === 0) return false;
        peopleAt += slice.length;
        out.push({ kind: 'people', people: slice });
        return true;
      };
      const takeGroups = () => {
        const slice = railGroups.slice(groupsAt, groupsAt + 6);
        if (slice.length === 0) return false;
        groupsAt += slice.length;
        out.push({ kind: 'groups', groups: slice });
        return true;
      };
      const placed = wantPeople ? (takePeople() || takeGroups()) : (takeGroups() || takePeople());
      if (placed) railNo += 1;
    });
    return out;
  }, [posts, railPeople, railGroups]);

  // ---- Small shared bits --------------------------------------------------
  const tabBar = (
    <div
      role="tablist"
      aria-label="Community"
      style={{
        position: 'sticky', top: 'var(--sat)', zIndex: 'var(--z-sticky)' as unknown as number,
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, padding: 4,
        margin: '0 0 1rem', background: 'var(--bg-primary)', border: HAIRLINE,
        borderRadius: 999,
      }}
    >
      {TABS.map(({ id, label, icon: Icon }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => switchTab(id)}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              minHeight: 44, border: 0, borderRadius: 999, cursor: 'pointer',
              background: active ? 'var(--green-950)' : 'none',
              color: active ? '#fff' : 'var(--text-secondary)',
              font: 'inherit', fontSize: '0.88rem', fontWeight: active ? 700 : 600,
            }}
          >
            <Icon size={16} aria-hidden="true" /> {label}
          </button>
        );
      })}
    </div>
  );

  const groupBadge = (name: string, size = 44) => (
    <span
      aria-hidden="true"
      style={{
        display: 'grid', placeItems: 'center', flexShrink: 0,
        width: size, height: size, borderRadius: size / 3.6,
        background: 'var(--green-950)', color: '#fff',
        fontWeight: 800, fontSize: size > 40 ? '0.9rem' : '0.78rem',
      }}
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  );

  // Instant follows (0040): the only states left are on and off.
  const followButton = (person: ChatPerson) => {
    const on = person.outgoing === 'accepted';
    return (
      <button
        type="button"
        className={`pp-toggle ${on ? 'is-on' : ''}`}
        style={{ padding: '0.35rem 0.8rem', minHeight: 40 }}
        aria-pressed={on}
        disabled={busyId === person.id}
        onClick={() => (on ? unfollow(person) : follow(person))}
      >
        {on ? <Check size={13} aria-hidden="true" /> : <UserPlus size={13} aria-hidden="true" />}
        {on ? 'Following' : 'Follow'}
      </button>
    );
  };

  // ---- Rails inside the feed ---------------------------------------------
  const peopleRail = (list: ChatPerson[], key: string) => (
    <section key={key} className="pp-group" style={{ margin: '0.35rem 0 1rem' }}>
      <div className="hf-section-head" style={{ marginBottom: '0.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>
          <Sparkles size={14} aria-hidden="true" style={{ verticalAlign: '-2px', color: 'var(--primary-700)' }} /> People to follow
        </h2>
        <button
          type="button"
          onClick={() => switchTab('people')}
          style={{ border: 0, background: 'none', font: 'inherit', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-accent)', minHeight: 44, cursor: 'pointer' }}
        >
          See all
        </button>
      </div>
      <div className="hf-rail">
        {list.map((p) => (
          <div key={p.id} className="hf-group card" style={{ alignItems: 'flex-start' }}>
            <span className="hf-member-avatar" aria-hidden="true">{initials(p.firstName, p.lastName)}</span>
            <strong>{fullName(p)}</strong>
            <small>{[p.jobTitle, p.city].filter(Boolean).join(' · ') || 'Member'}</small>
            <div style={{ marginTop: 6 }}>{followButton(p)}</div>
          </div>
        ))}
      </div>
    </section>
  );

  const groupsRail = (list: CommunityGroup[], key: string) => (
    <section key={key} className="pp-group" style={{ margin: '0.35rem 0 1rem' }}>
      <div className="hf-section-head" style={{ marginBottom: '0.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>
          <UsersRound size={14} aria-hidden="true" style={{ verticalAlign: '-2px', color: 'var(--green-700)' }} /> Groups for you
        </h2>
        <button
          type="button"
          onClick={() => switchTab('groups')}
          style={{ border: 0, background: 'none', font: 'inherit', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-accent)', minHeight: 44, cursor: 'pointer' }}
        >
          See all
        </button>
      </div>
      <div className="hf-rail">
        {list.map((g) => (
          <div key={g.id} className="hf-group card" style={{ alignItems: 'flex-start' }}>
            {groupBadge(g.name, 38)}
            <strong>{g.name}</strong>
            <small><Users size={11} aria-hidden="true" /> {g.memberCount} member{g.memberCount === 1 ? '' : 's'}</small>
            {g.suggestReason && <span className="pp-chip" style={{ fontSize: '0.68rem' }}>{g.suggestReason}</span>}
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginTop: 6, minHeight: 40, padding: '0 0.9rem', fontSize: '0.8rem' }}
              disabled={busyId === g.id}
              onClick={() => joinGroupById(g)}
            >
              {busyId === g.id ? 'Joining…' : 'Join'}
            </button>
          </div>
        ))}
      </div>
    </section>
  );

  // ---- Tab: FEED ----------------------------------------------------------
  const feedTab = (
    <>
      <PostComposer
        groupId={null}
        placeholder="Share something with the club…"
        onPosted={(post) => commitPosts((ps) => [{ ...post, source: 'mine' as const }, ...ps])}
      />

      {feedError && (
        <div role="alert" className="community-error" style={{ marginTop: 12 }}>
          <AlertCircle size={15} aria-hidden="true" /> {feedError}
        </div>
      )}

      {posts === null ? (
        <div style={{ marginTop: 16 }}><PortalLoading label="Loading your feed" /></div>
      ) : posts.length === 0 ? (
        <div className="card" style={{ marginTop: 16, padding: '2.2rem 1.25rem', textAlign: 'center' }}>
          <Newspaper size={28} aria-hidden="true" style={{ opacity: 0.35 }} />
          <p style={{ margin: '0.7rem 0 1rem', color: 'var(--text-secondary)' }}>
            Your feed is quiet. Follow a few members or join a group, and their posts land here.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" onClick={() => switchTab('people')}>Find people</button>
            <button type="button" className="btn btn-outline" onClick={() => switchTab('groups')}>Browse groups</button>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 14 }}>
          {feedItems.map((item, idx) => {
            if (item.kind === 'people') return peopleRail(item.people, `rail-p-${idx}`);
            if (item.kind === 'groups') return groupsRail(item.groups, `rail-g-${idx}`);

            const post = item.post;
            const fromGroup = post.groupId != null;
            const suggested = post.source === 'suggested_group';
            return (
              <div key={post.id} style={{ marginBottom: 14 }}>
                {fromGroup && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <Link
                      href={`/portal/member/community/groups/${post.groupId}`}
                      className="pp-chip"
                      style={{ textDecoration: 'none', minHeight: 32 }}
                    >
                      <UsersRound size={12} aria-hidden="true" /> {post.groupName ?? 'Group'}
                    </Link>
                    {suggested && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ minHeight: 36, padding: '0 0.85rem', fontSize: '0.78rem' }}
                        disabled={busyId === post.groupId}
                        onClick={() => joinGroupById({ id: post.groupId!, name: post.groupName ?? 'this group' })}
                      >
                        {busyId === post.groupId ? 'Joining…' : 'Join group'}
                      </button>
                    )}
                  </div>
                )}
                <PostCard
                  post={post}
                  onDeleted={(id) => commitPosts((ps) => ps.filter((p) => p.id !== id))}
                  onAuthorBlocked={(authorId) => commitPosts((ps) => ps.filter((p) => p.authorId !== authorId))}
                />
              </div>
            );
          })}

          <div ref={sentinel} aria-hidden="true" />

          {!feedEnd && (
            <button
              type="button"
              className="btn btn-outline"
              style={{ width: '100%', minHeight: 48 }}
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? 'Loading…' : 'Show more posts'}
            </button>
          )}
          {feedEnd && posts.length > 0 && (
            <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>
              You are all caught up.
            </p>
          )}
        </div>
      )}
    </>
  );

  // ---- Tab: GROUPS --------------------------------------------------------
  const mine = (groups ?? []).filter((g) => g.isMember);
  const suggested = (groups ?? []).filter((g) => !g.isMember && g.suggestReason);
  const rest = (groups ?? []).filter((g) => !g.isMember && !g.suggestReason);

  const groupCard = (g: CommunityGroup) => (
    <div key={g.id} className="pp-row" style={{ cursor: 'default' }}>
      {groupBadge(g.name, 40)}
      <Link
        href={`/portal/member/community/groups/${g.id}`}
        className="pp-row-body"
        style={{ textDecoration: 'none', color: 'inherit', minWidth: 0 }}
      >
        <strong>{g.name}</strong>
        <small style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {g.memberCount} member{g.memberCount === 1 ? '' : 's'}{g.description ? ` · ${g.description}` : ''}
        </small>
        {g.suggestReason && (
          <span className="pp-chip" style={{ marginTop: 4, fontSize: '0.68rem' }}>{g.suggestReason}</span>
        )}
      </Link>
      {g.isMember ? (
        <button
          type="button"
          className="pp-toggle is-on"
          style={{ padding: '0.35rem 0.8rem', minHeight: 40 }}
          aria-pressed
          disabled={busyId === g.id}
          onClick={() => leaveGroupById(g)}
        >
          <Check size={13} aria-hidden="true" /> Joined
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-primary"
          style={{ minHeight: 40, padding: '0 0.9rem', fontSize: '0.82rem' }}
          disabled={busyId === g.id}
          onClick={() => joinGroupById(g)}
        >
          {busyId === g.id ? 'Joining…' : 'Join'}
        </button>
      )}
    </div>
  );

  const groupsTab = (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <Search
            size={16}
            aria-hidden="true"
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            aria-label="Search groups"
            placeholder="Search groups"
            value={groupQuery}
            onChange={(e) => setGroupQuery(e.target.value)}
            style={{
              width: '100%', minHeight: 48, padding: '0 1rem 0 2.6rem', fontSize: 16,
              border: HAIRLINE, borderRadius: 999, background: 'var(--bg-primary)', color: 'var(--text-primary)',
            }}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary"
          style={{ minHeight: 48, whiteSpace: 'nowrap' }}
          onClick={() => setCreating(true)}
        >
          <Plus size={15} aria-hidden="true" /> New
        </button>
      </div>

      {groupsError && (
        <div role="alert" className="community-error" style={{ marginBottom: 12 }}>
          <AlertCircle size={15} aria-hidden="true" /> {groupsError}
        </div>
      )}

      {groups === null ? (
        <PortalLoading label="Loading groups" />
      ) : groups.length === 0 ? (
        <div className="card" style={{ padding: '2rem 1.25rem', textAlign: 'center' }}>
          <UsersRound size={28} aria-hidden="true" style={{ opacity: 0.35 }} />
          <p style={{ margin: '0.7rem 0 1rem', color: 'var(--text-secondary)' }}>
            {groupQuery ? `No groups match “${groupQuery}”.` : 'No groups yet. Start the first one.'}
          </p>
          {groupQuery
            ? <button type="button" className="btn btn-outline" onClick={() => setGroupQuery('')}>Clear search</button>
            : <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>Start a group</button>}
        </div>
      ) : (
        <div className="pp-groups">
          {mine.length > 0 && (
            <section className="pp-group">
              <h2>Your groups</h2>
              <div className="pp-group-card">{mine.map(groupCard)}</div>
            </section>
          )}
          {suggested.length > 0 && (
            <section className="pp-group">
              <h2>Suggested for you</h2>
              <p className="pp-group-sub">Based on your city and what you do.</p>
              <div className="pp-group-card">{suggested.map(groupCard)}</div>
            </section>
          )}
          {rest.length > 0 && (
            <section className="pp-group">
              <h2>{mine.length || suggested.length ? 'All groups' : 'Groups'}</h2>
              <div className="pp-group-card">{rest.map(groupCard)}</div>
            </section>
          )}
        </div>
      )}
    </>
  );

  // ---- Tab: PEOPLE --------------------------------------------------------
  const personRow = (p: ChatPerson) => {
    return (
      <div key={p.id} className="pp-row" style={{ cursor: 'default' }}>
        {/* Name and avatar open the member's profile. */}
        <Link
          href={`/portal/member/people/${p.id}`}
          className="hf-member-avatar"
          aria-label={`${fullName(p)}'s profile`}
          style={{ textDecoration: 'none', flexShrink: 0 }}
        >
          {initials(p.firstName, p.lastName)}
        </Link>
        <div className="pp-row-body">
          <Link
            href={`/portal/member/people/${p.id}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <strong>{fullName(p)}</strong>
          </Link>
          <small>{[p.jobTitle, p.city].filter(Boolean).join(' · ') || 'Member'}</small>
          {p.incoming === 'accepted' && p.outgoing !== 'accepted' && (
            <span className="pp-chip" style={{ marginTop: 4, fontSize: '0.68rem' }}>Follows you</span>
          )}
        </div>
        {/* Anyone can be messaged; the chat lands in their requests if they
            don't follow you. The button opens the actual conversation. */}
        <button
          type="button"
          aria-label={`Message ${p.firstName}`}
          disabled={busyId === p.id}
          onClick={() => void message(p)}
          style={{
            display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: '50%',
            border: 0, cursor: 'pointer', opacity: busyId === p.id ? 0.6 : 1,
            background: 'var(--green-50)', color: 'var(--green-800)', flexShrink: 0,
          }}
        >
          <MessageCircle size={16} aria-hidden="true" />
        </button>
        {followButton(p)}
      </div>
    );
  };

  const peopleTab = (
    <>
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search
          size={16}
          aria-hidden="true"
          style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
        />
        <input
          aria-label="Search members"
          placeholder="Search by name, role or city"
          value={peopleQuery}
          onChange={(e) => setPeopleQuery(e.target.value)}
          style={{
            width: '100%', minHeight: 48, padding: '0 1rem 0 2.6rem', fontSize: 16,
            border: HAIRLINE, borderRadius: 999, background: 'var(--bg-primary)', color: 'var(--text-primary)',
          }}
        />
      </div>

      {peopleError && (
        <div role="alert" className="community-error" style={{ marginBottom: 12 }}>
          <AlertCircle size={15} aria-hidden="true" /> {peopleError}
        </div>
      )}

      <div className="pp-groups">
        {people === null ? (
          <PortalLoading label="Loading members" />
        ) : people.length === 0 ? (
          <div className="card" style={{ padding: '2rem 1.25rem', textAlign: 'center' }}>
            <Search size={28} aria-hidden="true" style={{ opacity: 0.35 }} />
            <p style={{ margin: '0.7rem 0 1rem', color: 'var(--text-secondary)' }}>
              {peopleQuery ? `No members match “${peopleQuery}”.` : 'No other members yet.'}
            </p>
            {peopleQuery && (
              <button type="button" className="btn btn-outline" onClick={() => setPeopleQuery('')}>Clear search</button>
            )}
          </div>
        ) : (
          <section className="pp-group">
            <h2>{peopleQuery ? `Results for “${peopleQuery}”` : 'Members'}</h2>
            <div className="pp-group-card">{people.map(personRow)}</div>
          </section>
        )}
      </div>
    </>
  );

  return (
    <div className="community-layout">
      <div>
        <div className="hf-section-head" style={{ marginBottom: '0.6rem' }}>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.01em', margin: 0 }}>
            Community
          </h1>
          {tab === 'feed' && (
            <Link href="/portal/member/community?tab=groups" onClick={(e) => { e.preventDefault(); switchTab('groups'); }}>
              All groups <ChevronRight size={14} aria-hidden="true" />
            </Link>
          )}
        </div>

        {tabBar}

        {tab === 'feed' && feedTab}
        {tab === 'groups' && groupsTab}
        {tab === 'people' && peopleTab}
      </div>

      <CommunityAside groups={groups ?? undefined} />

      {/* ---- Start a group ---- */}
      {creating && (
        <div className="hf-sheet-scrim" onClick={(e) => { if (e.target === e.currentTarget) setCreating(false); }}>
          <div className="hf-sheet pp-sheet" role="dialog" aria-modal="true" aria-label="Start a group">
            <div className="hf-sheet-head">
              <h2>Start a group</h2>
              <button type="button" className="portal-sheet-close" onClick={() => setCreating(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <p className="hf-sheet-sub">
              Give it a name members will recognise, and a line on what it is for.
            </p>

            <div className="pp-sheet-fields">
              <div className="pp-field">
                <label htmlFor="new-group-name">Group name</label>
                <input
                  id="new-group-name"
                  maxLength={80}
                  value={form.name}
                  placeholder="e.g. Nurses in Ontario, Calgary carpool"
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="pp-field">
                <label htmlFor="new-group-desc">What is it for?</label>
                <textarea
                  id="new-group-desc"
                  rows={3}
                  maxLength={500}
                  value={form.description}
                  placeholder="One or two lines so members know what to expect."
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>

            {formError && (
              <div role="alert" className="community-error" style={{ marginTop: 4 }}>
                <AlertCircle size={15} aria-hidden="true" /> {formError}
              </div>
            )}

            <button
              type="button"
              className="pp-sheet-save"
              onClick={createGroup}
              disabled={formBusy || form.name.trim().length < 3}
            >
              {formBusy ? 'Creating…' : <><Plus size={16} aria-hidden="true" /> Create group</>}
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
