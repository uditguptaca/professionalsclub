'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/app-context';
import {
  fetchCompanies, fetchCompanyJobs, requestReferral,
} from '@/app/actions/referrals';
import type { Company, CompanyJob } from '@/types';
import {
  Search, Building2, Users, Briefcase, ArrowLeft, ArrowRight, ExternalLink,
  Check, Loader2, ShieldCheck, Send, MapPin, Clock, AlertCircle,
} from 'lucide-react';

/**
 * Jobs, by company.
 *
 * Three steps: pick an employer, pick the roles, ask. The thing that makes it
 * worth using is the helper count on each company card — "3 members here can
 * help" — and the club's whole promise is that the count is all anyone ever
 * sees. No insider is named on this screen, because the server never sends one.
 */

const relative = (iso: string | null): string | null => {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (!Number.isFinite(days) || days < 0) return null;
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
};

function HelperBadge({ count }: { count: number }) {
  if (count === 0) {
    return (
      <span className="ref-helpers ref-helpers-none">
        <Users size={13} aria-hidden="true" /> No members here yet
      </span>
    );
  }
  return (
    <span className="ref-helpers">
      <ShieldCheck size={13} aria-hidden="true" />
      {count === 1 ? '1 member here can help' : `${count} members here can help`}
    </span>
  );
}

export default function MemberJobsPage() {
  const { currentUserId } = useApp();

  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('all');

  const [selected, setSelected] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<CompanyJob[] | null>(null);
  const [jobsError, setJobsError] = useState('');
  const [jobSearch, setJobSearch] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ notified: number } | null>(null);

  useEffect(() => {
    if (!currentUserId) return;
    fetchCompanies().then((r) => {
      if (r.ok) setCompanies(r.data);
      else setError(r.error);
    });
  }, [currentUserId]);

  const industries = useMemo(
    () => ['all', ...[...new Set((companies ?? []).map((c) => c.industry).filter(Boolean))].sort()] as string[],
    [companies]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (companies ?? []).filter((c) => {
      const matchQ = !q || c.name.toLowerCase().includes(q)
        || (c.industry ?? '').toLowerCase().includes(q)
        || (c.city ?? '').toLowerCase().includes(q);
      const matchI = industry === 'all' || c.industry === industry;
      return matchQ && matchI;
    });
  }, [companies, search, industry]);

  const openCompany = async (company: Company) => {
    setSelected(company);
    setJobs(null);
    setJobsError('');
    setPicked(new Set());
    setNote('');
    setSent(null);
    const r = await fetchCompanyJobs(company.id);
    if (r.ok) setJobs(r.data);
    else setJobsError(r.error);
  };

  const visibleJobs = useMemo(() => {
    const q = jobSearch.trim().toLowerCase();
    return (jobs ?? []).filter((j) =>
      !q || j.title.toLowerCase().includes(q) || (j.location ?? '').toLowerCase().includes(q));
  }, [jobs, jobSearch]);

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const send = async () => {
    if (!selected || picked.size === 0 || sending) return;
    setSending(true);
    setJobsError('');
    const r = await requestReferral({
      companyId: selected.id,
      jobIds: [...picked],
      note: note.trim() || undefined,
    });
    if (r.ok) setSent({ notified: r.data.notified });
    else setJobsError(r.error);
    setSending(false);
  };

  // ------------------------------------------------------------ company list
  if (!selected) {
    return (
      <div className="ref-page">
        <header className="ref-head">
          <div>
            <h1>Jobs by company</h1>
            <p>
              Pick an employer to see their open roles. Where a club member works there and has
              offered to help, we will pass your request along — without giving them your details
              or you theirs, until they agree.
            </p>
          </div>
          <Link href="/portal/member/referrals" className="btn btn-outline btn-sm">
            My referral requests
          </Link>
        </header>

        <div className="ref-filters">
          <div className="ref-search">
            <Search size={17} aria-hidden="true" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employers"
              aria-label="Search employers"
            />
          </div>
          <select value={industry} onChange={(e) => setIndustry(e.target.value)} aria-label="Industry">
            {industries.map((i) => (
              <option key={i} value={i}>{i === 'all' ? 'All industries' : i}</option>
            ))}
          </select>
        </div>

        {error && <p role="alert" className="community-error">{error}</p>}

        {companies === null && !error && (
          <div className="ref-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="ref-card ref-card-skeleton" aria-hidden="true">
                <span className="community-shimmer ref-logo" />
                <span className="community-line-shimmer community-shimmer" style={{ width: '60%' }} />
                <span className="community-line-shimmer community-shimmer" style={{ width: '40%' }} />
              </div>
            ))}
          </div>
        )}

        {companies?.length === 0 && (
          <div className="community-panel community-empty">
            <Building2 size={22} aria-hidden="true" />
            <p><strong>No employers listed yet.</strong></p>
            <p>An admin adds employers, and members say where they work.</p>
          </div>
        )}

        {visible.length > 0 && (
          <div className="ref-grid">
            {visible.map((c) => (
              <button key={c.id} type="button" className="ref-card" onClick={() => openCompany(c)}>
                <span className="ref-logo" aria-hidden="true">{c.logo || c.name.charAt(0)}</span>
                <span className="ref-card-body">
                  <strong>{c.name}</strong>
                  <small>
                    {[c.industry, c.city].filter(Boolean).join(' · ') || 'Employer'}
                  </small>
                  <HelperBadge count={c.helperCount} />
                </span>
                <span className="ref-card-jobs">
                  {c.openJobsCount > 0
                    ? <><strong>{c.openJobsCount}</strong> open</>
                    : <span className="ref-muted">See careers page</span>}
                  <ArrowRight size={15} aria-hidden="true" />
                </span>
              </button>
            ))}
          </div>
        )}

        {companies !== null && visible.length === 0 && companies.length > 0 && (
          <div className="community-panel community-empty">
            <Search size={22} aria-hidden="true" />
            <p><strong>Nothing matched.</strong></p>
            <p>Try a different search or industry.</p>
          </div>
        )}
      </div>
    );
  }

  // ------------------------------------------------------------- sent state
  if (sent) {
    return (
      <div className="ref-page">
        <div className="community-panel ref-sent">
          <span className="ref-sent-icon" aria-hidden="true"><Check size={30} /></span>
          <h1>Request sent</h1>
          <p>
            {sent.notified === 0
              ? `Nobody at ${selected.name} has offered to help yet. Your request is saved, and we will notify you if that changes.`
              : sent.notified === 1
                ? `One member at ${selected.name} has been asked.`
                : `${sent.notified} members at ${selected.name} have been asked.`}
          </p>
          <p className="ref-muted">
            They can see the role you picked and your note, but not your name or contact details.
            If one of them agrees to help, you will both see each other then — and not before.
          </p>
          <div className="ref-sent-actions">
            <Link href="/portal/member/referrals" className="btn btn-primary">Track this request</Link>
            <button type="button" className="btn btn-ghost" onClick={() => setSelected(null)}>
              Browse other employers
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------- role picker
  return (
    <div className="ref-page">
      <button type="button" className="ref-back" onClick={() => setSelected(null)}>
        <ArrowLeft size={15} aria-hidden="true" /> All employers
      </button>

      <header className="ref-company-head">
        <span className="ref-logo ref-logo-lg" aria-hidden="true">
          {selected.logo || selected.name.charAt(0)}
        </span>
        <div>
          <h1>{selected.name}</h1>
          <p>{[selected.industry, selected.city, selected.sizeRange].filter(Boolean).join(' · ')}</p>
          <HelperBadge count={selected.helperCount} />
        </div>
        {selected.careersUrl && (
          <a href={selected.careersUrl} target="_blank" rel="noopener noreferrer"
             className="btn btn-outline btn-sm">
            Careers page <ExternalLink size={13} aria-hidden="true" />
          </a>
        )}
      </header>

      {jobsError && <p role="alert" className="community-error">{jobsError}</p>}

      {jobs === null && !jobsError && (
        <div className="community-panel" aria-hidden="true">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="ref-job-skeleton">
              <span className="community-line-shimmer community-shimmer" style={{ width: '45%' }} />
              <span className="community-line-shimmer community-shimmer" style={{ width: '25%' }} />
            </div>
          ))}
        </div>
      )}

      {jobs?.length === 0 && (
        <div className="community-panel community-empty">
          <Briefcase size={22} aria-hidden="true" />
          <p><strong>No roles cached for {selected.name}.</strong></p>
          <p>
            We only list roles an employer publishes in a machine-readable feed. Open their
            careers page to search directly — and you can still ask for a referral from
            My referral requests once you have found something.
          </p>
          {selected.careersUrl && (
            <a href={selected.careersUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
              Open {selected.name} careers <ExternalLink size={13} aria-hidden="true" />
            </a>
          )}
        </div>
      )}

      {jobs !== null && jobs.length > 0 && (
        <>
          <div className="ref-filters">
            <div className="ref-search">
              <Search size={17} aria-hidden="true" />
              <input
                value={jobSearch}
                onChange={(e) => setJobSearch(e.target.value)}
                placeholder={`Search ${jobs.length} open roles`}
                aria-label="Search roles"
              />
            </div>
            {selected.jobsSyncedAt && (
              <span className="ref-synced">
                <Clock size={12} aria-hidden="true" /> Updated {relative(selected.jobsSyncedAt) ?? 'recently'}
              </span>
            )}
          </div>

          <ul className="ref-jobs">
            {visibleJobs.map((j) => {
              const on = picked.has(j.id);
              return (
                <li key={j.id} className={`ref-job ${on ? 'is-picked' : ''}`}>
                  <label>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(j.id)}
                      aria-label={`Select ${j.title}`}
                    />
                    <span className="ref-job-body">
                      <strong>{j.title}</strong>
                      <small>
                        {j.location && <><MapPin size={11} aria-hidden="true" /> {j.location}</>}
                        {j.department && <> · {j.department}</>}
                        {relative(j.postedAt) && <> · posted {relative(j.postedAt)}</>}
                      </small>
                    </span>
                  </label>
                  <a href={j.applyUrl} target="_blank" rel="noopener noreferrer"
                     className="ref-job-link" aria-label={`View ${j.title}`}>
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                </li>
              );
            })}
          </ul>

          {visibleJobs.length === 0 && (
            <p className="ref-muted" style={{ padding: '12px 0' }}>No roles matched that search.</p>
          )}
        </>
      )}

      {/* The ask. Sticky so the selection count is always in view. */}
      {picked.size > 0 && (
        <div className="ref-ask">
          <div className="ref-ask-count">
            <strong>{picked.size}</strong> {picked.size === 1 ? 'role' : 'roles'} selected
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Anything worth knowing? Keep it short: what you do, and why these roles. Do not put your name or number here — it is added automatically once someone agrees to help."
            aria-label="Note to whoever can help"
          />
          {selected.helperCount === 0 && (
            <p className="ref-warn">
              <AlertCircle size={13} aria-hidden="true" />
              Nobody at {selected.name} has offered to help yet. You can still send this — we
              will pass it on if someone joins.
            </p>
          )}
          <button type="button" className="btn btn-primary" onClick={send} disabled={sending}>
            {sending
              ? <><Loader2 size={15} className="spin" aria-hidden="true" /> Sending</>
              : <><Send size={15} aria-hidden="true" /> Ask for a referral</>}
          </button>
        </div>
      )}
    </div>
  );
}
