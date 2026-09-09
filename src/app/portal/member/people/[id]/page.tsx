'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { fetchMemberProfile } from '@/app/actions/people';
import { followMember, unfollowMember, openChat, unblockMember } from '@/app/actions/chat';
import type { MemberProfile } from '@/server/repos/people';
import PortalLoading from '@/components/portal/PortalLoading';
import { useConfirm } from '@/components/portal/confirm';
import {
  AlertCircle, ArrowLeft, Award, Briefcase, Building2, CalendarDays, Check,
  GraduationCap, Heart, ExternalLink, MapPin, MessageCircle, ShieldCheck, Sparkles,
  UserPlus, Users,
} from 'lucide-react';

/**
 * One member's profile, as another member sees it.
 *
 * What appears here is exactly what the 0041 views publish - the professional
 * half of a profile, club events they RSVPd to, a verified business they run,
 * and whatever of their posts RLS already lets me see. No contact details: the
 * club is admin-mediated, and Message is the way to reach someone.
 *
 * The whole page is ONE Server Action call. It was tempting to fetch the
 * profile, the events and the follow state separately; Next runs a client's
 * action calls one at a time, so that would have been three sequential round
 * trips to a remote database before anything appeared.
 */

const HAIRLINE = '1px solid rgba(27,67,50,0.08)';

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
  return value
    .split(/[,\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function Section({ title, icon: Icon, children }: {
  title: string;
  icon: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: '1.1rem' }}>
      <h2 style={{
        display: 'flex', alignItems: 'center', gap: 7,
        margin: '0 0 0.55rem', fontSize: '0.78rem', fontWeight: 800,
        letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)',
      }}>
        <Icon size={14} aria-hidden={true} /> {title}
      </h2>
      {children}
    </section>
  );
}

function Rows({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="pp-group-card">
      {items.map((it) => (
        <div
          key={it.label}
          style={{
            display: 'flex', gap: 12, padding: '0.7rem 0.85rem',
            borderBottom: HAIRLINE, alignItems: 'baseline',
          }}
        >
          <span style={{
            flex: '0 0 7.5rem', fontSize: '0.78rem', fontWeight: 700,
            color: 'var(--text-muted)',
          }}>
            {it.label}
          </span>
          <span style={{ flex: 1, minWidth: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            {it.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function Chips({ values }: { values: string[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {values.map((v) => (
        <span
          key={v}
          className="pp-chip"
          style={{ background: 'var(--green-50)', color: 'var(--green-800)', fontSize: '0.76rem' }}
        >
          {v}
        </span>
      ))}
    </div>
  );
}

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

  const load = useCallback(async () => {
    const res = await fetchMemberProfile(memberId);
    if (res.ok) { setProfile(res.data); setError(''); }
    else setError(res.error);
    setLoading(false);
  }, [memberId]);

  useEffect(() => { void load(); }, [load]);

  const iFollow = profile?.outgoing === 'accepted';

  async function toggleFollow() {
    if (!profile) return;
    setActionError('');
    if (iFollow) {
      const ok = await confirm({
        title: `Unfollow ${profile.firstName}?`,
        message: 'Their posts leave your feed. Your chat with them is not affected.',
        confirmLabel: 'Unfollow',
        tone: 'danger',
      });
      if (!ok) return;
    }
    setBusy(true);
    // Optimistic: the counts and the button flip together, then the server
    // result replaces both.
    setProfile((p) => p && {
      ...p,
      outgoing: iFollow ? 'none' : 'accepted',
      followers: Math.max(0, p.followers + (iFollow ? -1 : 1)),
    });
    const res = iFollow ? await unfollowMember(profile.id) : await followMember(profile.id);
    if (!res.ok) setActionError(res.error);
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
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 44,
            border: 0, background: 'none', color: 'var(--text-secondary)',
            font: 'inherit', fontWeight: 700, cursor: 'pointer', padding: 0,
          }}
        >
          <ArrowLeft size={16} aria-hidden="true" /> Back
        </button>
        <div role="alert" className="community-error" style={{ marginTop: 16 }}>
          <AlertCircle size={15} aria-hidden="true" /> {error || 'That member could not be found.'}
        </div>
      </div>
    );
  }

  const name = `${profile.firstName} ${profile.lastName}`.trim();
  const place = [profile.city, profile.province].filter(Boolean).join(', ');
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

  return (
    <div>
      {/* Hero: the same forest band the member's own profile uses. The back
          control lives in the portal shell now, so there is none here. */}
      <div className="pp-hero">
        <span
          aria-hidden="true"
          style={{
            display: 'grid', placeItems: 'center',
            width: '5rem', height: '5rem', margin: '0 auto 0.7rem',
            borderRadius: '50%', background: 'rgba(255,255,255,0.94)',
            color: 'var(--green-950)', fontWeight: 800, fontSize: '1.4rem',
          }}
        >
          {initialsOf(profile.firstName, profile.lastName)}
        </span>

        <h1>{name}</h1>
        {(profile.jobTitle || profile.company) && (
          <p>
            {[profile.jobTitle, profile.company].filter(Boolean).join(' at ')}
          </p>
        )}

        <div className="pp-hero-chips">
          {profile.verified && (
            <span className="pp-chip pp-chip-light">
              <ShieldCheck size={12} aria-hidden="true" /> Verified
            </span>
          )}
          {profile.isVolunteer && (
            <span className="pp-chip pp-chip-light">
              <Heart size={12} aria-hidden="true" /> Volunteer
            </span>
          )}
          {place && (
            <span className="pp-chip pp-chip-light">
              <MapPin size={12} aria-hidden="true" /> {place}
            </span>
          )}
          <span className="pp-chip pp-chip-light">
            <CalendarDays size={12} aria-hidden="true" /> Member since {monthYear(profile.memberSince)}
          </span>
        </div>

        <div style={{
          display: 'flex', justifyContent: 'center', gap: 18, marginTop: '0.9rem',
          fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)',
        }}>
          <span><strong style={{ color: '#fff' }}>{profile.followers}</strong> followers</span>
          <span><strong style={{ color: '#fff' }}>{profile.following}</strong> following</span>
        </div>

        {profile.incoming === 'accepted' && !iFollow && (
          <p style={{ marginTop: '0.6rem', fontSize: '0.76rem', color: 'rgba(255,255,255,0.8)' }}>
            Follows you
          </p>
        )}
      </div>

      {actionError && (
        <div role="alert" className="community-error" style={{ marginBottom: 12 }}>
          <AlertCircle size={15} aria-hidden="true" /> {actionError}
        </div>
      )}

      {/* Actions */}
      {profile.blocked ? (
        <div className="pp-group-card" style={{ padding: '0.9rem', marginBottom: '1.2rem' }}>
          <p style={{ margin: '0 0 0.7rem', fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            You blocked {profile.firstName}. Unblock them to message again.
          </p>
          <button
            type="button"
            className="btn btn-sm btn-quiet"
            onClick={() => void unblock()}
            disabled={busy}
            style={{ minHeight: 44 }}
          >
            Unblock
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10, marginBottom: '1.3rem' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void message()}
            disabled={busy}
            style={{ flex: 1, minHeight: 46, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
          >
            <MessageCircle size={17} aria-hidden="true" /> Message
          </button>
          <button
            type="button"
            className={`pp-toggle ${iFollow ? 'is-on' : ''}`}
            onClick={() => void toggleFollow()}
            aria-pressed={iFollow}
            disabled={busy}
            style={{ flex: 1, minHeight: 46, justifyContent: 'center' }}
          >
            {iFollow
              ? <><Check size={15} aria-hidden="true" /> Following</>
              : <><UserPlus size={15} aria-hidden="true" /> Follow</>}
          </button>
        </div>
      )}

      {profile.professionalSummary && (
        <Section title="About" icon={Sparkles}>
          <p style={{
            margin: 0, padding: '0.85rem', borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-primary)', border: HAIRLINE,
            fontSize: '0.9rem', lineHeight: 1.55, color: 'var(--text-secondary)',
            whiteSpace: 'pre-wrap',
          }}>
            {profile.professionalSummary}
          </p>
        </Section>
      )}

      {work.length > 0 && (
        <Section title="Work" icon={Briefcase}>
          <Rows items={work} />
        </Section>
      )}

      {skills.length > 0 && (
        <Section title="Skills" icon={Sparkles}>
          <Chips values={skills} />
        </Section>
      )}

      {study.length > 0 && (
        <Section title="Education" icon={GraduationCap}>
          <Rows items={study} />
        </Section>
      )}

      {certs.length > 0 && (
        <Section title="Certifications" icon={Award}>
          <Chips values={certs} />
        </Section>
      )}

      {profile.business && (
        <Section title="Business" icon={Building2}>
          <Link
            href={`/businesses/${profile.business.slug}`}
            className="pp-row"
            style={{ textDecoration: 'none' }}
          >
            {profile.business.logo
              ? <img src={profile.business.logo} alt="" width={42} height={42}
                  style={{ borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
              : (
                <span aria-hidden="true" style={{
                  display: 'grid', placeItems: 'center', width: 42, height: 42, flexShrink: 0,
                  borderRadius: 10, background: 'var(--green-50)', color: 'var(--green-800)',
                }}>
                  <Building2 size={18} />
                </span>
              )}
            <span className="pp-row-body">
              <strong>{profile.business.name}</strong>
              <small>{[profile.business.category, profile.business.city].filter(Boolean).join(' · ')}</small>
            </span>
          </Link>
        </Section>
      )}

      {profile.events.length > 0 && (
        <Section title={`Club events (${profile.events.length})`} icon={CalendarDays}>
          <div className="pp-group-card">
            {profile.events.map((e) => (
              <div key={e.eventId} className="pp-row pp-row-static">
                <span aria-hidden="true" style={{
                  display: 'grid', placeItems: 'center', width: 40, height: 40, flexShrink: 0,
                  borderRadius: 10, background: 'var(--green-50)', color: 'var(--green-800)',
                }}>
                  <CalendarDays size={17} />
                </span>
                <span className="pp-row-body">
                  <strong>{e.title}</strong>
                  <small>
                    {[eventDay(e.eventDate), e.eventTime, e.location].filter(Boolean).join(' · ')}
                  </small>
                </span>
                {e.status === 'past' && (
                  <span className="pp-chip" style={{
                    flexShrink: 0, background: 'var(--bg-secondary)',
                    border: HAIRLINE, color: 'var(--text-muted)',
                  }}>
                    Attended
                  </span>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {profile.posts.length > 0 && (
        <Section title="Recent posts" icon={Users}>
          <div className="pp-group-card">
            {profile.posts.map((p) => (
              <div key={p.id} className="pp-row pp-row-static" style={{ alignItems: 'flex-start' }}>
                <span className="pp-row-body">
                  <small style={{ color: 'var(--text-muted)' }}>
                    {new Date(p.createdAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                  </small>
                  <span style={{
                    fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5,
                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {p.body}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {profile.linkedinUrl && (
        <Section title="Elsewhere" icon={ExternalLink}>
          <a
            className="pp-row"
            href={profile.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none' }}
          >
            <span aria-hidden="true" style={{
              display: 'grid', placeItems: 'center', width: 40, height: 40, flexShrink: 0,
              borderRadius: 10, background: 'var(--green-50)', color: 'var(--green-800)',
            }}>
              <ExternalLink size={17} />
            </span>
            <span className="pp-row-body">
              <strong>LinkedIn</strong>
              <small style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile.linkedinUrl.replace(/^https?:\/\/(www\.)?/, '')}
              </small>
            </span>
          </a>
        </Section>
      )}

      <p style={{
        margin: '1.4rem 0 0', fontSize: '0.74rem', color: 'var(--text-muted)',
        lineHeight: 1.5, textAlign: 'center',
      }}>
        Members reach each other through chat. Phone numbers and email addresses
        are never shown.
      </p>
    </div>
  );
}
