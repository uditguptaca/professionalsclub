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
  Check, Loader2, ShieldCheck, Send, AlertCircle, ChevronRight, X,
} from 'lucide-react';

/**
 * Jobs, by company.
 *
 * Three steps: pick an employer, pick the roles, ask. The thing that makes it
 * worth using is the helper count on each company row — "3 members here can
 * help" — and the club's whole promise is that the count is all anyone ever
 * sees. No insider is named on this screen, because the server never sends one.
 *
 * Styled in the profile-hub grammar: one narrow column, grouped rows in rounded
 * cards, segmented pills for filters, and the ask itself in a bottom sheet so
 * the roles list is never buried under a form.
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

const HAIRLINE = '1px solid rgba(27, 67, 50, 0.08)';

const TITLE: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 'clamp(1.5rem, 5vw, 1.85rem)',
  fontWeight: 800,
  letterSpacing: '-0.02em',
  margin: '0 0 0.4rem',
};

const SUB: React.CSSProperties = {
  margin: 0,
  fontSize: '0.88rem',
  lineHeight: 1.6,
  color: 'var(--text-secondary)',
};

const QUIET_LINK: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  minHeight: 44,
  fontSize: '0.85rem',
  fontWeight: 700,
  color: 'var(--text-accent)',
  textDecoration: 'none',
};

const SEARCH_WRAP: React.CSSProperties = { position: 'relative', marginBottom: 10 };
const SEARCH_ICON: React.CSSProperties = {
  position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)',
  color: 'var(--text-muted)', pointerEvents: 'none',
};
const SEARCH_INPUT: React.CSSProperties = {
  width: '100%', minHeight: 48, padding: '0 16px 0 42px',
  border: HAIRLINE, borderRadius: 999,
  background: 'var(--bg-primary)', color: 'var(--text-primary)',
  font: 'inherit', fontSize: '1rem', outline: 'none',
};

/** Segmented pill group — the filter language across the portal. */
const SEG_WRAP: React.CSSProperties = {
  display: 'flex', gap: 4, padding: 4,
  background: 'var(--bg-primary)', borderRadius: 999, border: HAIRLINE,
  width: 'fit-content', maxWidth: '100%', overflowX: 'auto',
};
const seg = (active: boolean): React.CSSProperties => ({
  minHeight: 44, padding: '0 16px', border: 0, borderRadius: 999,
  font: 'inherit', fontSize: '0.85rem', whiteSpace: 'nowrap', cursor: 'pointer',
  ...(active
    ? { background: 'var(--green-950)', color: '#fff', fontWeight: 700 }
    : { background: 'none', color: 'var(--text-secondary)', fontWeight: 600 }),
});

const ELLIPSIS: React.CSSProperties = {
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};

const EMPTY: React.CSSProperties = { textAlign: 'center', padding: '2.5rem 1rem' };
const EMPTY_ICON: React.CSSProperties = { opacity: 0.35 };
const EMPTY_TEXT: React.CSSProperties = {
  margin: '0.8rem auto 0', maxWidth: '24rem',
  fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-secondary)',
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
  const [askOpen, setAskOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ notified: number } | null>(null);

  useEffect(() => {
    if (!currentUserId) return;
    fetchCompanies().then((r) => {
      if (r.ok) setCompanies(r.data);
      else setError(r.error);
    });
  }, [currentUserId]);

  // The ask sheet locks background scroll and closes on Escape, same as every
  // other sheet in the portal.
  useEffect(() => {
    if (!askOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAskOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [askOpen]);

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
    setAskOpen(false);
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
    if (r.ok) { setAskOpen(false); setSent({ notified: r.data.notified }); }
    else setJobsError(r.error);
    setSending(false);
  };

  // ------------------------------------------------------------ company list
  if (!selected) {
    return (
      <div className="pp2">
        <header style={{ marginBottom: 14 }}>
          <h1 style={TITLE}>Jobs by company</h1>
          <p style={SUB}>
            Pick an employer to see their open roles. Where a club member works there and has
            offered to help, we pass your request along without giving them your details or you
            theirs, until they agree.
          </p>
          <Link href="/portal/member/referrals" style={QUIET_LINK}>
            My referral requests <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </header>

        <div style={SEARCH_WRAP}>
          <Search size={16} aria-hidden="true" style={SEARCH_ICON} />
          <input
            id="jb-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employers"
            aria-label="Search employers"
            style={SEARCH_INPUT}
          />
        </div>

        {industries.length > 2 && (
          <div style={{ ...SEG_WRAP, marginBottom: 16 }} role="group" aria-label="Filter by industry">
            {industries.map((i) => (
              <button
                key={i}
                type="button"
                style={seg(industry === i)}
                aria-pressed={industry === i}
                onClick={() => setIndustry(i)}
              >
                {i === 'all' ? 'All' : i}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div role="alert" className="community-error" style={{ marginBottom: 12 }}>
            <AlertCircle size={15} aria-hidden="true" /> {error}
          </div>
        )}

        {companies === null && !error && (
          <div className="pp-group-card" aria-hidden="true">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="pp-row pp-row-static">
                <span
                  className="community-shimmer"
                  style={{ width: '2.35rem', height: '2.35rem', borderRadius: '0.75rem', flexShrink: 0 }}
                />
                <span className="pp-row-body">
                  <span className="community-line-shimmer community-shimmer" style={{ width: '62%' }} />
                  <span className="community-line-shimmer community-shimmer" style={{ width: '38%' }} />
                </span>
              </div>
            ))}
          </div>
        )}

        {companies?.length === 0 && (
          <div style={EMPTY}>
            <Building2 size={28} aria-hidden="true" style={EMPTY_ICON} />
            <p style={EMPTY_TEXT}>No employers are listed yet. An admin adds them, and members say where they work.</p>
          </div>
        )}

        {visible.length > 0 && (
          <section className="pp-group">
            <h2>{visible.length === 1 ? '1 employer' : `${visible.length} employers`}</h2>
            <div className="pp-group-card">
              {visible.map((c) => (
                <button key={c.id} type="button" className="pp-row" onClick={() => openCompany(c)}>
                  <span className="pp-row-icon" aria-hidden="true" style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                    {c.logo || c.name.charAt(0)}
                  </span>
                  <span className="pp-row-body">
                    <strong>{c.name}</strong>
                    <small style={ELLIPSIS}>
                      {[c.industry, c.city].filter(Boolean).join(' · ') || 'Employer'}
                    </small>
                    <span style={{ display: 'block', marginTop: 5 }}>
                      <HelperBadge count={c.helperCount} />
                    </span>
                  </span>
                  <span
                    style={{
                      flexShrink: 0, fontSize: '0.75rem', fontWeight: 800, whiteSpace: 'nowrap',
                      color: c.openJobsCount > 0 ? 'var(--text-accent)' : 'var(--text-muted)',
                    }}
                  >
                    {c.openJobsCount > 0 ? `${c.openJobsCount} open` : 'Careers'}
                  </span>
                  <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
                </button>
              ))}
            </div>
          </section>
        )}

        {companies !== null && visible.length === 0 && companies.length > 0 && (
          <div style={EMPTY}>
            <Search size={28} aria-hidden="true" style={EMPTY_ICON} />
            <p style={EMPTY_TEXT}>Nothing matched that search.</p>
            <button
              type="button"
              className="btn btn-outline"
              style={{ marginTop: 14 }}
              onClick={() => { setSearch(''); setIndustry('all'); }}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    );
  }

  // ------------------------------------------------------------- sent state
  if (sent) {
    return (
      <div className="pp2">
        <div className="pp-group-card" style={{ padding: '2.25rem 1.25rem', textAlign: 'center' }}>
          <span
            aria-hidden="true"
            style={{
              display: 'inline-grid', placeItems: 'center', width: 56, height: 56,
              marginBottom: 14, borderRadius: '50%',
              background: 'rgba(27, 67, 50, 0.09)', color: 'var(--green-800)',
            }}
          >
            <Check size={26} />
          </span>
          <h1 style={{ ...TITLE, fontSize: '1.4rem' }}>Request sent</h1>
          <p style={{ ...EMPTY_TEXT, margin: '0 auto 0.7rem', maxWidth: '26rem' }}>
            {sent.notified === 0
              ? `Nobody at ${selected.name} has offered to help yet. Your request is saved, and we will notify you if that changes.`
              : sent.notified === 1
                ? `One member at ${selected.name} has been asked.`
                : `${sent.notified} members at ${selected.name} have been asked.`}
          </p>
          <p style={{ margin: '0 auto', maxWidth: '26rem', fontSize: '0.82rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>
            They can see the roles you picked and your note, but not your name or contact details.
            If one of them agrees to help, you will both see each other then, and not before.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
            <Link href="/portal/member/referrals" className="btn btn-primary" style={{ justifyContent: 'center' }}>
              Track this request
            </Link>
            <button
              type="button"
              className="btn btn-outline"
              style={{ justifyContent: 'center' }}
              onClick={() => setSelected(null)}
            >
              Browse other employers
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------- role picker
  const companyMeta = [selected.industry, selected.city, selected.sizeRange].filter(Boolean).join(' · ');
  const synced = selected.jobsSyncedAt ? relative(selected.jobsSyncedAt) : null;

  return (
    <div className="pp2" style={{ paddingBottom: '0.75rem' }}>
      <button
        type="button"
        onClick={() => setSelected(null)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          minHeight: 44, padding: '0 4px', marginBottom: 4,
          background: 'none', border: 0, cursor: 'pointer',
          font: 'inherit', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)',
        }}
      >
        <ArrowLeft size={16} aria-hidden="true" /> All employers
      </button>

      <header
        className="pp-group-card"
        style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '1rem', marginBottom: 16 }}
      >
        <span className="ref-logo ref-logo-lg" aria-hidden="true">
          {selected.logo || selected.name.charAt(0)}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={{ ...TITLE, fontSize: '1.25rem', margin: '0 0 0.2rem', ...ELLIPSIS }}>{selected.name}</h1>
          {companyMeta && (
            <p style={{ margin: '0 0 0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)', ...ELLIPSIS }}>
              {companyMeta}
            </p>
          )}
          <HelperBadge count={selected.helperCount} />
        </div>
      </header>

      {selected.careersUrl && (
        <a
          href={selected.careersUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...QUIET_LINK, marginBottom: 6 }}
        >
          Open the careers page <ExternalLink size={13} aria-hidden="true" />
        </a>
      )}

      {jobsError && !askOpen && (
        <div role="alert" className="community-error" style={{ marginBottom: 12 }}>
          <AlertCircle size={15} aria-hidden="true" /> {jobsError}
        </div>
      )}

      {jobs === null && !jobsError && (
        <div className="pp-group-card" aria-hidden="true">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="pp-row pp-row-static">
              <span
                className="community-shimmer"
                style={{ width: '2.35rem', height: '2.35rem', borderRadius: '0.75rem', flexShrink: 0 }}
              />
              <span className="pp-row-body">
                <span className="community-line-shimmer community-shimmer" style={{ width: '55%' }} />
                <span className="community-line-shimmer community-shimmer" style={{ width: '30%' }} />
              </span>
            </div>
          ))}
        </div>
      )}

      {jobs?.length === 0 && (
        <div style={EMPTY}>
          <Briefcase size={28} aria-hidden="true" style={EMPTY_ICON} />
          <p style={EMPTY_TEXT}>
            No roles are cached for {selected.name}. We only list roles an employer publishes in a
            machine-readable feed, so search their careers page directly.
          </p>
          {selected.careersUrl && (
            <a
              href={selected.careersUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ marginTop: 14, justifyContent: 'center' }}
            >
              Open {selected.name} careers <ExternalLink size={13} aria-hidden="true" />
            </a>
          )}
        </div>
      )}

      {jobs !== null && jobs.length > 0 && (
        <>
          <div style={SEARCH_WRAP}>
            <Search size={16} aria-hidden="true" style={SEARCH_ICON} />
            <input
              id="jb-role-search"
              value={jobSearch}
              onChange={(e) => setJobSearch(e.target.value)}
              placeholder={`Search ${jobs.length} open roles`}
              aria-label="Search roles"
              style={SEARCH_INPUT}
            />
          </div>

          <section className="pp-group">
            <h2>Open roles</h2>
            <p className="pp-group-sub">
              Tap the roles you want a referral for.{synced ? ` Feed updated ${synced}.` : ''}
            </p>

            {visibleJobs.length === 0 ? (
              <div style={EMPTY}>
                <Search size={28} aria-hidden="true" style={EMPTY_ICON} />
                <p style={EMPTY_TEXT}>No roles matched that search.</p>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ marginTop: 14 }}
                  onClick={() => setJobSearch('')}
                >
                  Clear search
                </button>
              </div>
            ) : (
              <ul className="pp-group-card" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {visibleJobs.map((j, i) => {
                  const on = picked.has(j.id);
                  const meta = [
                    j.location, j.department,
                    relative(j.postedAt) ? `posted ${relative(j.postedAt)}` : null,
                  ].filter(Boolean).join(' · ');
                  return (
                    <li
                      key={j.id}
                      style={{
                        display: 'flex', alignItems: 'stretch',
                        borderBottom: i === visibleJobs.length - 1 ? 0 : '1px solid rgba(27, 67, 50, 0.06)',
                        background: on ? 'rgba(232, 93, 4, 0.045)' : undefined,
                      }}
                    >
                      <button
                        type="button"
                        className="pp-row"
                        onClick={() => toggle(j.id)}
                        aria-pressed={on}
                        style={{ flex: 1, minWidth: 0, borderBottom: 0 }}
                      >
                        <span
                          className="pp-row-icon"
                          aria-hidden="true"
                          style={on ? { background: 'var(--primary-700)', color: '#fff' } : undefined}
                        >
                          {on ? <Check size={17} /> : <Briefcase size={17} />}
                        </span>
                        <span className="pp-row-body">
                          <strong>{j.title}</strong>
                          {meta && <small style={ELLIPSIS}>{meta}</small>}
                        </span>
                      </button>
                      <a
                        href={j.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open the ${j.title} posting`}
                        style={{
                          display: 'grid', placeItems: 'center', flexShrink: 0,
                          width: 48, color: 'var(--text-muted)',
                          borderLeft: '1px solid rgba(27, 67, 50, 0.06)',
                        }}
                      >
                        <ExternalLink size={15} aria-hidden="true" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      {/* The ask. A sticky summary bar keeps the count in view; the note and the
          send button live in a sheet, so the roles list is never buried. */}
      {picked.size > 0 && (
        <div
          className="ref-ask"
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16,
            border: HAIRLINE, borderRadius: '1.1rem',
          }}
        >
          <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', minWidth: 0 }}>
            <strong style={{ color: 'var(--text-accent)', fontWeight: 800 }}>{picked.size}</strong>
            {picked.size === 1 ? ' role selected' : ' roles selected'}
          </span>
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}
            onClick={() => setAskOpen(true)}
          >
            <Send size={15} aria-hidden="true" /> Ask for a referral
          </button>
        </div>
      )}

      {/* ---- Ask sheet ---- */}
      {askOpen && (
        <div
          className="hf-sheet-scrim"
          onClick={(e) => { if (e.target === e.currentTarget) setAskOpen(false); }}
        >
          <div className="hf-sheet pp-sheet" role="dialog" aria-modal="true" aria-label="Ask for a referral">
            <div className="hf-sheet-head">
              <h2>Ask for a referral</h2>
              <button type="button" className="portal-sheet-close" onClick={() => setAskOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <p className="hf-sheet-sub">
              {picked.size === 1 ? '1 role' : `${picked.size} roles`} at {selected.name}. Whoever can
              help sees the roles and your note, never your name or contact details, until they agree.
            </p>

            <div className="pp-sheet-fields">
              <div className="pp-field">
                <label htmlFor="jb-note">Note (optional)</label>
                <textarea
                  id="jb-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={2000}
                  rows={4}
                  placeholder="Keep it short: what you do, and why these roles. Leave out your name and number, they are added automatically once someone agrees to help."
                />
              </div>
            </div>

            {selected.helperCount === 0 && (
              <p className="ref-warn" style={{ marginBottom: 12 }}>
                <AlertCircle size={13} aria-hidden="true" />
                Nobody at {selected.name} has offered to help yet. You can still send this, and we
                will pass it on if someone joins.
              </p>
            )}

            {jobsError && (
              <div role="alert" className="community-error" style={{ marginTop: 0, marginBottom: 12 }}>
                <AlertCircle size={15} aria-hidden="true" /> {jobsError}
              </div>
            )}

            <button type="button" className="pp-sheet-save" onClick={send} disabled={sending}>
              {sending
                ? <><Loader2 size={16} className="spin" aria-hidden="true" /> Sending</>
                : <><Send size={16} aria-hidden="true" /> Send request</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
