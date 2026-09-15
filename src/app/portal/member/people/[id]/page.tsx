'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { fetchMemberProfile, fetchMemberPosts } from '@/app/actions/people';
import { followMember, unfollowMember, openChat, unblockMember } from '@/app/actions/chat';
import type { MemberProfile } from '@/server/repos/people';
import type { CommunityPost } from '@/types';
import PortalLoading from '@/components/portal/PortalLoading';
import { PostCard } from '@/components/portal/community';
import { useConfirm } from '@/components/portal/confirm';
import {
  AlertCircle, ArrowLeft, Award, BadgeCheck, Briefcase, Building2, CalendarDays, Check,
  Clock, ExternalLink, GraduationCap, Heart, Lock, MapPin, MessageCircle, Newspaper,
  UserPlus, UserRoundCheck, Loader2,
} from 'lucide-react';

/**
 * One member's profile, as another member sees it.
 *
 * The shape every social app taught people: identity and numbers at the top,
 * two actions under it, then the person's own posts with their details one tab
 * over. A private profile (the default, 0051) shows the top and a lock where
 * the posts would be; the Follow button becomes Requested, and the rest
 * appears the moment they accept.
 *
 * What is shown is exactly what the 0041/0051 views publish. No contact
 * details: the club is admin-mediated, and Message is the way to reach someone.
 */

const initialsOf = (first: string, last: string) =>
  `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || '?';

/** "March 2026" - the join date needs no more precision than that. */
const monthYear = (iso: string) =>
  new Date(iso).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });

const eventDay = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

/** Comma or newline separated free text -> chips, capped so one member's
    forty-skill list does not become the whole page. */
function splitList(value: string | null, limit = 12): string[] {
  if (!value) return [];
  return value.split(/[,\n;]+/).map((s) => s.trim()).filter(Boolean).slice(0, limit);
}

const compact = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k` : String(n);

type Tab = 'posts' | 'about';

export default function MemberProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const confirm = useConfirm();
  const memberId = params?.id ?? '';

  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [tab, setTab] = useState<Tab>('posts');
  const [posts, setPosts] = useState<CommunityPost[] | null>(null);
  const [postsEnd, setPostsEnd] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    const res = await fetchMemberProfile(memberId);
    if (res.ok) { setProfile(res.data); setError(''); }
    else setError(res.error);
    setLoading(false);
  }, [memberId]);

  useEffect(() => { void load(); }, [load]);

  // Posts arrive after the header has painted, and only when allowed.
  const canView = profile?.canView ?? false;
  useEffect(() => {
    if (!profile || !canView) { setPosts(canView ? null : []); return; }
    let alive = true;
    fetchMemberPosts(profile.id).then((r) => {
      if (!alive) return;
      if (r.ok) { setPosts(r.data); setPostsEnd(r.data.length < 20); }
      else { setPosts([]); setActionError(r.error); }
    });
    return () => { alive = false; };
  }, [profile?.id, canView, profile]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const loadMore = async () => {
    if (!profile || !posts || posts.length === 0 || loadingMore || postsEnd) return;
    setLoadingMore(true);
    const r = await fetchMemberPosts(profile.id, posts[posts.length - 1].createdAt);
    if (r.ok) {
      setPosts((p) => [...(p ?? []), ...r.data]);
      if (r.data.length < 20) setPostsEnd(true);
    } else setActionError(r.error);
    setLoadingMore(false);
  };

  const outgoing = profile?.outgoing ?? 'none';

  async function follow() {
    if (!profile) return;
    setActionError('');
    setBusy(true);
    // Optimistic, in the direction the database will take: a private profile
    // makes it a request, a public one a follow.
    const next = profile.isPrivate ? 'pending' : 'accepted';
    setProfile((p) => p && {
      ...p,
      outgoing: next,
      followers: next === 'accepted' ? p.followers + 1 : p.followers,
    });
    const res = await followMember(profile.id);
    if (!res.ok) setActionError(res.error);
    else setToast(next === 'pending' ? `Request sent to ${profile.firstName}` : `Following ${profile.firstName}`);
    await load();
    setBusy(false);
  }

  async function unfollow() {
    if (!profile) return;
    setActionError('');
    if (outgoing === 'accepted') {
      const ok = await confirm({
        title: `Unfollow ${profile.firstName}?`,
        message: profile.isPrivate
          ? 'Their profile and posts become private to you again. Your chat is not affected.'
          : 'Their posts leave your feed. Your chat with them is not affected.',
        confirmLabel: 'Unfollow',
        tone: 'danger',
      });
      if (!ok) return;
    }
    setBusy(true);
    setProfile((p) => p && {
      ...p,
      outgoing: 'none',
      followers: outgoing === 'accepted' ? Math.max(0, p.followers - 1) : p.followers,
    });
    const res = await unfollowMember(profile.id);
    if (!res.ok) setActionError(res.error);
    else if (outgoing === 'pending') setToast('Request withdrawn');
    await load();
    setBusy(false);
  }

  async function message() {
    if (!profile) return;
    setActionError('');
    setBusy(true);
    const res = await openChat(profile.id);
    if (!res.ok) { setActionError(res.error); setBusy(false); return; }
    router.push(`/portal/member/chats?c=${res.data}`);
  }

  async function unblock() {
    if (!profile) return;
    setActionError('');
    setBusy(true);
    const res = await unblockMember(profile.id);
    if (!res.ok) setActionError(res.error);
    await load();
    setBusy(false);
  }

  if (loading) return <PortalLoading label="Loading profile" />;

  if (error || !profile) {
    return (
      <div>
        <button type="button" onClick={() => router.back()} className="cm-btn cm-btn--ghost" style={{ paddingLeft: 0 }}>
          <ArrowLeft size={16} aria-hidden="true" /> Back
        </button>
        <div role="alert" className="community-error" style={{ marginTop: 16 }}>
          <AlertCircle size={15} aria-hidden="true" /> {error || 'That member could not be found.'}
        </div>
      </div>
    );
  }

  const name = `${profile.firstName} ${profile.lastName}`.trim();
  const byline = [profile.jobTitle, profile.company, profile.city].filter(Boolean).join(' · ');
  const skills = splitList(profile.skills);
  const certs = splitList(profile.certifications, 8);

  const work: { label: string; value: string }[] = [];
  if (profile.company) work.push({ label: 'Company', value: profile.company });
  if (profile.jobTitle) work.push({ label: 'Role', value: profile.jobTitle });
  if (profile.industry) work.push({ label: 'Industry', value: profile.industry });
  if (profile.professionalCategory) work.push({ label: 'Field', value: profile.professionalCategory });
  if (profile.experienceRange) work.push({ label: 'Experience', value: profile.experienceRange });
  const study: { label: string; value: string }[] = [];
  if (profile.educationLevel) study.push({ label: 'Education', value: profile.educationLevel });
  if (profile.fieldOfStudy) study.push({ label: 'Field of study', value: profile.fieldOfStudy });

  const followButton = (() => {
    if (outgoing === 'accepted') {
      return (
        <button type="button" className="cm-btn cm-btn--secondary cm-btn--lg" onClick={() => void unfollow()} disabled={busy} aria-pressed="true">
          <UserRoundCheck size={17} aria-hidden="true" /> Following
        </button>
      );
    }
    if (outgoing === 'pending') {
      return (
        <button type="button" className="cm-btn cm-btn--secondary cm-btn--lg" onClick={() => void unfollow()} disabled={busy} aria-pressed="mixed" title="Tap to withdraw the request">
          <Clock size={17} aria-hidden="true" /> Requested
        </button>
      );
    }
    return (
      <button type="button" className="cm-btn cm-btn--primary cm-btn--lg" onClick={() => void follow()} disabled={busy}>
        {busy ? <Loader2 size={17} className="spin" aria-hidden="true" /> : <UserPlus size={17} aria-hidden="true" />}
        {profile.incoming === 'accepted' ? 'Follow back' : 'Follow'}
      </button>
    );
  })();

  return (
    <div className="mp">
      {/* ---- Identity: avatar beside the numbers, the way people expect ---- */}
      <header className="mp-head">
        <div className="mp-top">
          <span className="mp-avatar" aria-hidden="true">{initialsOf(profile.firstName, profile.lastName)}</span>
          <dl className="mp-stats" aria-label="Activity">
            <div><dt>Posts</dt><dd>{compact(profile.postCount)}</dd></div>
            <div><dt>Followers</dt><dd>{compact(profile.followers)}</dd></div>
            <div><dt>Following</dt><dd>{compact(profile.following)}</dd></div>
          </dl>
        </div>

        <div className="mp-identity">
          <h1>
            {name}
            {profile.verified && (
              <BadgeCheck size={18} aria-label="Verified member" className="mp-verified" />
            )}
            {profile.isPrivate && (
              <Lock size={14} aria-label="Private profile" className="mp-lock" />
            )}
          </h1>
          {byline && <p className="mp-byline">{byline}</p>}
          <p className="mp-meta">
            {profile.isVolunteer && <span><Heart size={12} aria-hidden="true" /> Volunteer</span>}
            {profile.province && <span><MapPin size={12} aria-hidden="true" /> {[profile.city, profile.province].filter(Boolean).join(', ')}</span>}
            <span><CalendarDays size={12} aria-hidden="true" /> Joined {monthYear(profile.memberSince)}</span>
            {profile.incoming === 'accepted' && <span className="mp-follows-you">Follows you</span>}
            {profile.incoming === 'pending' && (
              <Link href="/portal/member/people/requests" className="mp-follows-you">Wants to follow you</Link>
            )}
          </p>
          {profile.professionalSummary && (
            <p className="mp-bio">{profile.professionalSummary}</p>
          )}
        </div>

        {actionError && (
          <div role="alert" className="community-error" style={{ marginTop: 10 }}>
            <AlertCircle size={15} aria-hidden="true" /> {actionError}
          </div>
        )}

        {profile.blocked ? (
          <div className="mp-blocked">
            <p>You blocked {profile.firstName}. Unblock them to follow or message again.</p>
            <button type="button" className="cm-btn cm-btn--secondary" onClick={() => void unblock()} disabled={busy}>
              Unblock
            </button>
          </div>
        ) : (
          <div className="mp-actions">
            {followButton}
            <button type="button" className="cm-btn cm-btn--secondary cm-btn--lg" onClick={() => void message()} disabled={busy}>
              <MessageCircle size={17} aria-hidden="true" /> Message
            </button>
          </div>
        )}
      </header>

      {/* ---- The private half ---- */}
      {!profile.canView ? (
        <section className="mp-private" aria-live="polite">
          <span className="mp-private-icon" aria-hidden="true"><Lock size={22} /></span>
          <h2>This profile is private</h2>
          <p>
            {outgoing === 'pending'
              ? `Your request is with ${profile.firstName}. Their posts, work and skills appear here once they accept.`
              : `Follow ${profile.firstName} to see their posts, work history and skills. They will accept or decline your request.`}
          </p>
        </section>
      ) : (
        <>
          <div className="cm-tabs mp-tabs" role="tablist" aria-label="Profile sections">
            <button type="button" role="tab" aria-selected={tab === 'posts'} className={tab === 'posts' ? 'is-on' : ''} onClick={() => setTab('posts')}>
              <Newspaper size={15} aria-hidden="true" /> Posts
            </button>
            <button type="button" role="tab" aria-selected={tab === 'about'} className={tab === 'about' ? 'is-on' : ''} onClick={() => setTab('about')}>
              <Briefcase size={15} aria-hidden="true" /> About
            </button>
          </div>

          {tab === 'posts' && (
            <div className="mp-posts">
              {posts === null && <PortalLoading label="Loading posts" />}
              {posts?.length === 0 && (
                <div className="cm-empty">
                  <Newspaper size={24} aria-hidden="true" />
                  <p><strong>No posts yet.</strong></p>
                  <p>When {profile.firstName} shares something with the club, it shows up here.</p>
                </div>
              )}
              {posts?.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onDeleted={(id) => setPosts((p) => (p ?? []).filter((x) => x.id !== id))}
                  onAuthorBlocked={() => { void load(); }}
                />
              ))}
              {posts && posts.length > 0 && !postsEnd && (
                <button type="button" className="cm-btn cm-btn--secondary cm-btn--lg" style={{ width: '100%' }} onClick={() => void loadMore()} disabled={loadingMore}>
                  {loadingMore ? 'Loading…' : 'Show older posts'}
                </button>
              )}
            </div>
          )}

          {tab === 'about' && (
            <div className="mp-about">
              {work.length > 0 && (
                <section className="mp-section">
                  <h2><Briefcase size={14} aria-hidden="true" /> Work</h2>
                  <dl className="mp-rows">
                    {work.map((it) => <div key={it.label}><dt>{it.label}</dt><dd>{it.value}</dd></div>)}
                  </dl>
                </section>
              )}
              {skills.length > 0 && (
                <section className="mp-section">
                  <h2><Check size={14} aria-hidden="true" /> Skills</h2>
                  <div className="mp-chips">{skills.map((v) => <span key={v}>{v}</span>)}</div>
                </section>
              )}
              {study.length > 0 && (
                <section className="mp-section">
                  <h2><GraduationCap size={14} aria-hidden="true" /> Education</h2>
                  <dl className="mp-rows">
                    {study.map((it) => <div key={it.label}><dt>{it.label}</dt><dd>{it.value}</dd></div>)}
                  </dl>
                </section>
              )}
              {certs.length > 0 && (
                <section className="mp-section">
                  <h2><Award size={14} aria-hidden="true" /> Certifications</h2>
                  <div className="mp-chips">{certs.map((v) => <span key={v}>{v}</span>)}</div>
                </section>
              )}
              {profile.business && (
                <section className="mp-section">
                  <h2><Building2 size={14} aria-hidden="true" /> Business</h2>
                  <Link href={`/portal/member/businesses/${profile.business.slug}`} className="cm-person" style={{ textDecoration: 'none' }}>
                    {profile.business.logo && /^(https?:\/\/|\/)/.test(profile.business.logo)
                      ? <img src={profile.business.logo} alt="" className="cm-person-avatar" style={{ borderRadius: 12, objectFit: 'contain', background: '#fff' }} />
                      : <span className="cm-person-avatar" aria-hidden="true" style={{ borderRadius: 12 }}><Building2 size={18} /></span>}
                    <span className="cm-person-body">
                      <strong>{profile.business.name}</strong>
                      <small>{[profile.business.category, profile.business.city].filter(Boolean).join(' · ')}</small>
                    </span>
                    <ExternalLink size={15} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />
                  </Link>
                </section>
              )}
              {profile.events.length > 0 && (
                <section className="mp-section">
                  <h2><CalendarDays size={14} aria-hidden="true" /> Club events ({profile.events.length})</h2>
                  <div className="cm-list">
                    {profile.events.map((e) => (
                      <Link key={e.eventId} href={`/portal/member/events/${e.eventId}`} className="cm-person" style={{ textDecoration: 'none' }}>
                        <span className="cm-person-avatar" aria-hidden="true" style={{ borderRadius: 12 }}><CalendarDays size={17} /></span>
                        <span className="cm-person-body">
                          <strong>{e.title}</strong>
                          <small>{[eventDay(e.eventDate), e.eventTime, e.location].filter(Boolean).join(' · ')}</small>
                        </span>
                        {e.status === 'past' && <span className="cm-tag">Attended</span>}
                      </Link>
                    ))}
                  </div>
                </section>
              )}
              {profile.linkedinUrl && (
                <section className="mp-section">
                  <h2><ExternalLink size={14} aria-hidden="true" /> Elsewhere</h2>
                  <a className="cm-person" href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                    <span className="cm-person-avatar" aria-hidden="true" style={{ borderRadius: 12 }}><ExternalLink size={17} /></span>
                    <span className="cm-person-body">
                      <strong>LinkedIn</strong>
                      <small>{profile.linkedinUrl.replace(/^https?:\/\/(www\.)?/, '')}</small>
                    </span>
                  </a>
                </section>
              )}
              {work.length === 0 && skills.length === 0 && study.length === 0 && certs.length === 0 && !profile.business && profile.events.length === 0 && !profile.linkedinUrl && (
                <div className="cm-empty">
                  <Briefcase size={24} aria-hidden="true" />
                  <p><strong>Nothing here yet.</strong></p>
                  <p>{profile.firstName} has not filled in their work and education details.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <p className="mp-footnote">
        Members reach each other through chat. Phone numbers and email addresses are never shown.
      </p>

      {toast && <div className="pp-toast" role="status"><Check size={15} aria-hidden="true" /> {toast}</div>}
    </div>
  );
}
