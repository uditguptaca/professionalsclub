'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { fetchJobDetail, setJobApplied, curatorUpdateRole } from '@/app/actions/referrals';
import type { JobDetail } from '@/server/repos/job-board';
import PortalLoading from '@/components/portal/PortalLoading';
import { useApp } from '@/context/app-context';
import { useConfirm } from '@/components/portal/confirm';
import {
  facetsOf, SENIORITY_LABELS, EMPLOYMENT_LABELS, ARRANGEMENT_LABELS, languageLabel,
} from '@/lib/job-taxonomy';
import {
  AlertCircle, BadgeCheck, Building2, CalendarDays, Check, ExternalLink,
  MapPin, Send, Star, Users, XCircle,
} from 'lucide-react';

/**
 * One role, and the two things a member can do about it.
 *
 * The whole screen exists to make that choice obvious and to make it the LAST
 * step: apply yourself, or ask someone inside to refer you. Everything else
 * here is only what is needed to make that decision - who the employer is,
 * where the role is, what level it is, and whether anyone at that company has
 * offered to refer. There is no third path and no deeper page.
 *
 * "Ask for a referral" hands straight back to the existing referral flow on
 * the jobs screen (company preselected, this role ticked, on the people step)
 * rather than reimplementing it: the weekly allowance, the named directory and
 * the request-opens-a-chat behaviour are all already there and tested.
 */

const HAIRLINE = '1px solid rgba(27, 67, 50, 0.08)';

const CHIP: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  padding: '0.25rem 0.65rem', borderRadius: 999,
  background: 'var(--green-50)', color: 'var(--green-800)',
  fontSize: '0.76rem', fontWeight: 700,
};

const relative = (iso: string | null): string | null => {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (!Number.isFinite(days) || days < 0) return null;
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? 'a month ago' : `${months} months ago`;
};

/** `companies.logo` is free text: usually initials, sometimes an image URL. */
const isImage = (logo: string) => /^(https?:\/\/|\/)/.test(logo);

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const jobId = params?.id ?? '';
  const { profile } = useApp();
  const confirm = useConfirm();
  /** Admins and approved volunteers curate the board (0044). */
  const canCurate = profile?.role === 'admin' || Boolean(profile?.isVolunteer);

  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetchJobDetail(jobId);
    if (res.ok) {
      if (res.data) setJob(res.data);
      else setError('That role could not be found. It may have been removed.');
    } else setError(res.error);
    setLoading(false);
  }, [jobId]);

  useEffect(() => { void load(); }, [load]);

  /**
   * Marking applied is fire-and-forget on purpose: it runs from the click that
   * also opens the posting in a new tab, and making the member wait for a round
   * trip before their tab opens would be a worse trade than a lost checkbox.
   */
  async function markApplied(applied: boolean) {
    if (!job) return;
    setJob({ ...job, applied });
    setBusy(true);
    const res = await setJobApplied(job.id, applied);
    if (!res.ok) { setError(res.error); setJob({ ...job, applied: !applied }); }
    setBusy(false);
  }

  /**
   * Curation, from the same screen a member sees. A volunteer can only change
   * a role they added themselves - the database says so and the error says so,
   * which is why the failure path puts the value back rather than hiding it.
   */
  async function curate(patch: { isFeatured?: boolean; isOpen?: boolean }) {
    if (!job) return;
    const before = job;
    setJob({ ...job, ...patch });
    setBusy(true);
    setError('');
    const res = await curatorUpdateRole(job.id, patch);
    if (!res.ok) { setError(res.error); setJob(before); }
    setBusy(false);
  }

  async function closeRole() {
    if (!job) return;
    const ok = await confirm({
      title: `Take down ${job.title}?`,
      message: 'Members stop seeing it on the board. Anyone holding a link is told the posting closed.',
      confirmLabel: 'Take it down',
      tone: 'danger',
    });
    if (ok) await curate({ isOpen: false });
  }

  if (loading) return <PortalLoading label="Loading this role" />;

  if (error || !job) {
    return (
      <div>
        <div role="alert" className="community-error">
          <AlertCircle size={15} aria-hidden="true" /> {error || 'That role could not be found.'}
        </div>
        <Link href="/portal/member/jobs" className="btn btn-outline" style={{ marginTop: 14 }}>
          Back to jobs
        </Link>
      </div>
    );
  }

  const facets = facetsOf(job.title, job.location);
  const posted = relative(job.postedAt);
  const logo = job.companyLogo?.trim() || '';

  return (
    <div style={{ maxWidth: '44rem' }}>
      {/* Identity */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
        <span
          aria-hidden="true"
          style={{
            display: 'grid', placeItems: 'center', flexShrink: 0,
            width: 52, height: 52, borderRadius: '0.8rem',
            background: 'var(--green-950)', color: '#fff',
            fontWeight: 800, fontSize: '1rem', overflow: 'hidden',
          }}
        >
          {isImage(logo)
            ? <img src={logo} alt="" width={52} height={52} style={{ objectFit: 'cover' }} />
            : (logo || job.companyName.slice(0, 2).toUpperCase())}
        </span>
        <div style={{ minWidth: 0 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 800,
            letterSpacing: '-0.01em', margin: '0 0 2px', lineHeight: 1.25,
          }}>
            {job.title}
          </h1>
          <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            {job.companyName}
          </p>
        </div>
      </div>

      {/* A few facts, not every derivable one. The first version printed six
          chips - two overlapping function labels, the department AND the
          posted date - and the screen read as a wall of tags. Only the
          notable ones earn a chip: an unusual contract, remote work, a
          language that is an advantage. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {job.isFeatured && (
          <span style={{ ...CHIP, background: 'rgba(232, 93, 4, 0.10)', color: 'var(--primary-800)' }}>
            <Star size={12} aria-hidden="true" fill="currentColor" /> Featured by the club
          </span>
        )}
        {job.location && (
          <span style={CHIP}><MapPin size={12} aria-hidden="true" /> {job.location}</span>
        )}
        <span style={CHIP}>{SENIORITY_LABELS[facets.seniority]}</span>
        {facets.employment !== 'permanent' && (
          <span style={CHIP}>{EMPLOYMENT_LABELS[facets.employment]}</span>
        )}
        {facets.arrangement !== 'onsite' && (
          <span style={CHIP}>{ARRANGEMENT_LABELS[facets.arrangement]}</span>
        )}
        {facets.languages.slice(0, 1).map((l) => (
          <span key={l} style={CHIP}>{languageLabel(l)}</span>
        ))}
        {posted && (
          <span style={CHIP}><CalendarDays size={12} aria-hidden="true" /> Posted {posted}</span>
        )}
      </div>

      {job.matchReasons.length > 0 && (
        <p style={{
          display: 'flex', alignItems: 'center', gap: 6,
          margin: '0 0 14px', fontSize: '0.86rem', fontWeight: 700,
          color: 'var(--success-600)',
        }}>
          <BadgeCheck size={15} aria-hidden="true" /> {job.matchReasons[0]}
        </p>
      )}

      {/* Closed roles get the reason instead of the two actions. */}
      {!job.isOpen ? (
        <div className="pp-group-card" style={{ padding: '1rem', marginBottom: 16 }}>
          <p style={{
            display: 'flex', alignItems: 'center', gap: 7, margin: '0 0 6px',
            fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)',
          }}>
            <XCircle size={17} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />
            This posting has closed
          </p>
          <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {job.companyName} no longer lists this role
            {relative(job.closedAt) ? `, as of ${relative(job.closedAt)}` : ''}.
            {job.careersUrl ? ' Their careers page may have something similar.' : ''}
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <Link href="/portal/member/jobs" className="btn btn-primary" style={{ minHeight: 44 }}>
              Browse open roles
            </Link>
            {job.careersUrl && (
              <a
                href={job.careersUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
                style={{ minHeight: 44 }}
              >
                {job.companyName} careers <ExternalLink size={14} aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* THE choice. Two actions, equal weight, nothing else competing. */}
          <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => { if (!job.applied) void markApplied(true); }}
              className="btn btn-primary"
              style={{
                minHeight: 52, justifyContent: 'center', gap: 8,
                fontSize: '0.95rem', fontWeight: 800,
              }}
            >
              <ExternalLink size={17} aria-hidden="true" /> Apply on your own
            </a>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => router.push(
                `/portal/member/jobs?company=${job.companyId}&role=${job.id}&ask=1`
              )}
              style={{
                minHeight: 52, justifyContent: 'center', gap: 8,
                fontSize: '0.95rem', fontWeight: 800,
              }}
            >
              <Send size={17} aria-hidden="true" /> Ask for a referral
            </button>
          </div>

          {job.helperCount === 0 && (
            <p style={{
              margin: '0 0 14px', fontSize: '0.8rem', lineHeight: 1.5,
              color: 'var(--text-secondary)',
            }}>
              Nobody at {job.companyName} has offered to refer yet, so applying
              yourself is the faster route today.
            </p>
          )}

          {job.applied && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
              marginBottom: 16, padding: '0.7rem 0.85rem',
              border: '1px solid rgba(45, 122, 79, 0.28)', borderRadius: 'var(--radius-lg)',
              background: 'var(--green-50)',
            }}>
              <Check size={16} aria-hidden="true" style={{ color: 'var(--success-600)', flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: '10rem', fontSize: '0.86rem', fontWeight: 700, color: 'var(--green-800)' }}>
                You marked this as applied
              </span>
              <button
                type="button"
                onClick={() => void markApplied(false)}
                disabled={busy}
                style={{
                  minHeight: 40, padding: '0 10px', border: 0, background: 'none',
                  color: 'var(--text-accent)', font: 'inherit', fontSize: '0.8rem',
                  fontWeight: 700, cursor: 'pointer',
                }}
              >
                Undo
              </button>
            </div>
          )}
        </>
      )}

      {job.descriptionSnippet && (
        <section style={{ marginBottom: 16 }}>
          <h2 style={{
            margin: '0 0 6px', fontSize: '0.78rem', fontWeight: 800,
            letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)',
          }}>
            From the posting
          </h2>
          <p style={{
            margin: 0, padding: '0.85rem', border: HAIRLINE,
            borderRadius: 'var(--radius-lg)', background: 'var(--bg-primary)',
            fontSize: '0.89rem', lineHeight: 1.6, color: 'var(--text-secondary)',
            whiteSpace: 'pre-wrap',
          }}>
            {job.descriptionSnippet}
          </p>
        </section>
      )}

      <section>
        <h2 style={{
          margin: '0 0 6px', fontSize: '0.78rem', fontWeight: 800,
          letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)',
        }}>
          The employer
        </h2>
        <div className="pp-group-card">
          <Link href={`/portal/member/jobs?company=${job.companyId}`} className="pp-row" style={{ textDecoration: 'none' }}>
            <span className="pp-row-icon" aria-hidden="true"><Building2 size={17} /></span>
            <span className="pp-row-body">
              <strong>All roles at {job.companyName}</strong>
              <small>{[job.companyIndustry, job.companyCity].filter(Boolean).join(' · ') || 'Employer'}</small>
            </span>
          </Link>
          {job.helperCount > 0 && (
            <div className="pp-row pp-row-static">
              <span className="pp-row-icon" aria-hidden="true"><Users size={17} /></span>
              <span className="pp-row-body">
                <strong>
                  {job.helperCount} member{job.helperCount === 1 ? '' : 's'} here can refer you
                </strong>
                <small>Listed by name once you choose to ask</small>
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Curation, on the same screen rather than a separate admin console: the
          person deciding whether a role is worth featuring is looking at it. */}
      {canCurate && (
        <section style={{ marginTop: 16 }}>
          <h2 style={{
            margin: '0 0 6px', fontSize: '0.78rem', fontWeight: 800,
            letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)',
          }}>
            Club team
          </h2>
          <div style={{
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10,
            padding: '0.85rem', border: HAIRLINE, borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-primary)',
          }}>
            <button
              type="button"
              className={`pp-toggle ${job.isFeatured ? 'is-on' : ''}`}
              aria-pressed={job.isFeatured}
              disabled={busy}
              onClick={() => void curate({ isFeatured: !job.isFeatured })}
              style={{ minHeight: 44, paddingRight: '0.85rem' }}
            >
              <span className="pp-toggle-dot" aria-hidden="true" />
              <Star size={14} aria-hidden="true" /> Featured
            </button>
            {job.isOpen && (
              <button
                type="button"
                onClick={() => void closeRole()}
                disabled={busy}
                style={{
                  minHeight: 44, padding: '0 0.9rem', borderRadius: 999,
                  border: '1px solid rgba(27,67,50,0.14)', background: 'none',
                  font: 'inherit', fontSize: '0.85rem', fontWeight: 700,
                  color: 'var(--text-secondary)', cursor: 'pointer',
                }}
              >
                Take it down
              </button>
            )}
            <p style={{
              flexBasis: '100%', margin: 0, fontSize: '0.78rem',
              lineHeight: 1.5, color: 'var(--text-muted)',
            }}>
              Featured roles rank ahead of the feed for members this role suits.
              Volunteers can change only the roles they added themselves.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
