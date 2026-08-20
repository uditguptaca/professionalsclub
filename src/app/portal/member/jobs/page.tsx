'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/app-context';
import { fetchCompanies, fetchCompanyJobs } from '@/app/actions/referrals';
import { listCompanyInsiders, requestReferral } from '@/app/actions/chat';
import type { Company, CompanyJob } from '@/types';
import type { CompanyInsiderEntry } from '@/server/repos/chat';
import {
  Search, Building2, Users, Briefcase, ArrowLeft, ArrowRight, ExternalLink,
  Check, Loader2, ShieldCheck, Send, AlertCircle, ChevronRight, BadgeCheck, UserPlus,
} from 'lucide-react';

/**
 * Jobs, by company. Three steps: pick an employer, pick the roles, pick who you
 * are asking.
 *
 * Step three is the whole product now. Members who opt into referring are
 * listed BY NAME, so the ask is a direct one: you choose the person, the request
 * opens a chat with them, and the referral card lands in it. Nothing about this
 * flow is anonymous, and the copy says so before anyone taps send.
 *
 * Styled in the profile-hub grammar: one narrow column, grouped rows in rounded
 * cards, segmented pills for filters.
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

const BACK_BTN: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  minHeight: 44, padding: '0 4px', marginBottom: 4,
  background: 'none', border: 0, cursor: 'pointer',
  font: 'inherit', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)',
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

/** What my standing request with this person should say on their row. */
const ASKED: Record<string, { label: string; style: React.CSSProperties }> = {
  pending:  { label: 'Requested', style: { background: 'rgba(232, 93, 4, 0.09)', color: 'var(--primary-800)' } },
  accepted: { label: 'Accepted',  style: { background: 'var(--green-50)', color: 'var(--success-600)' } },
  declined: { label: 'Declined',  style: { background: 'var(--bg-secondary)', color: 'var(--text-muted)' } },
};

function HelperBadge({ count }: { count: number }) {
  if (count === 0) {
    return (
      <span className="ref-helpers ref-helpers-none">
        <Users size={13} aria-hidden="true" /> No one here is referring yet
      </span>
    );
  }
  return (
    <span className="ref-helpers">
      <ShieldCheck size={13} aria-hidden="true" />
      {count === 1 ? '1 member here can refer you' : `${count} members here can refer you`}
    </span>
  );
}

const RowShimmer = ({ rows }: { rows: number }) => (
  <div className="pp-group-card" aria-hidden="true">
    {[...Array(rows)].map((_, i) => (
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
);

export default function MemberJobsPage() {
  const { currentUserId } = useApp();
  const router = useRouter();

  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('all');

  const [selected, setSelected] = useState<Company | null>(null);
  const [step, setStep] = useState<'roles' | 'people'>('roles');
  const [jobs, setJobs] = useState<CompanyJob[] | null>(null);
  const [jobsError, setJobsError] = useState('');
  const [jobSearch, setJobSearch] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const [insiders, setInsiders] = useState<CompanyInsiderEntry[] | null>(null);
  const [insidersError, setInsidersError] = useState('');
  const [people, setPeople] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [toast, setToast] = useState('');

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
    setStep('roles');
    setJobs(null);
    setJobsError('');
    setPicked(new Set());
    setInsiders(null);
    setInsidersError('');
    setPeople(new Set());
    setNote('');
    setSendError('');
    const r = await fetchCompanyJobs(company.id);
    if (r.ok) setJobs(r.data);
    else setJobsError(r.error);
  };

  const visibleJobs = useMemo(() => {
    const q = jobSearch.trim().toLowerCase();
    return (jobs ?? []).filter((j) =>
      !q || j.title.toLowerCase().includes(q) || (j.location ?? '').toLowerCase().includes(q));
  }, [jobs, jobSearch]);

  const pickedTitles = useMemo(
    () => (jobs ?? []).filter((j) => picked.has(j.id)).map((j) => j.title),
    [jobs, picked]
  );

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const togglePerson = (id: string) =>
    setPeople((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  /** Step 3 loads the named directory once per company. */
  const goPeople = async () => {
    setStep('people');
    setSendError('');
    if (!selected || insiders !== null || insidersError) return;
    const r = await listCompanyInsiders(selected.id);
    if (r.ok) setInsiders(r.data); else setInsidersError(r.error);
  };

  /**
   * One request per person, sequentially — Next runs a client's Server Action
   * calls one at a time anyway, and a partial failure has to be reportable.
   */
  const send = async () => {
    if (!selected || people.size === 0 || sending) return;
    setSending(true);
    setSendError('');
    const ids = [...people];
    const done: { id: string; conversationId: string }[] = [];
    let failure = '';
    for (const id of ids) {
      const r = await requestReferral({
        insiderId: id,
        companyId: selected.id,
        jobIds: [...picked],
        note: note.trim() || undefined,
      });
      if (r.ok) done.push({ id, conversationId: r.data.conversationId });
      else if (!failure) failure = r.error;
    }

    if (done.length > 0) {
      const sentTo = new Set(done.map((d) => d.id));
      setInsiders((prev) => prev?.map((p) =>
        sentTo.has(p.memberId) ? { ...p, requestStatus: 'pending' as const } : p) ?? prev);
      setPeople(new Set(ids.filter((id) => !sentTo.has(id))));
    }

    if (failure) {
      // Stay put so the failure is readable; the ones that went through now
      // show a Requested chip, so it is clear what still needs doing.
      setSendError(done.length === 0
        ? failure
        : `${failure} ${done.length} of ${ids.length} went through.`);
      setSending(false);
      return;
    }

    if (done.length === 1) {
      router.push(`/portal/member/chats?c=${done[0].conversationId}`);
      return;
    }
    setToast(`Sent to ${done.length} people at ${selected.name}`);
    setTimeout(() => router.push('/portal/member/chats'), 1200);
  };

  // ------------------------------------------------------------ company list
  if (!selected) {
    return (
      <div className="pp2">
        <header style={{ marginBottom: 14 }}>
          <h1 style={TITLE}>Jobs by company</h1>
          <p style={SUB}>
            Pick an employer to see their open roles, then ask someone who works there to refer
            you. Members who offer to refer are listed by name, so you choose who you ask.
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

        {companies === null && !error && <RowShimmer rows={5} />}

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

  // ------------------------------------------------- step 3: who can refer you
  if (step === 'people') {
    const askable = insiders?.filter((p) => p.requestStatus === null).length ?? 0;
    return (
      <div className="pp2" style={{ paddingBottom: '0.75rem' }}>
        <button type="button" onClick={() => { setStep('roles'); setSendError(''); }} style={BACK_BTN}>
          <ArrowLeft size={16} aria-hidden="true" /> Roles at {selected.name}
        </button>

        <header style={{ marginBottom: 14 }}>
          <h1 style={{ ...TITLE, fontSize: '1.35rem' }}>Who can refer you</h1>
          <p style={SUB}>These members chose to be visible as referrers.</p>
          <p style={{ ...SUB, marginTop: 6, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Whoever you pick sees your name and your request straight away, in a chat with you.
          </p>
        </header>

        {pickedTitles.length > 0 && (
          <p
            style={{
              margin: '0 0 14px', padding: '0.7rem 0.9rem', borderRadius: '0.85rem',
              background: 'var(--bg-secondary)', fontSize: '0.82rem', lineHeight: 1.5,
              color: 'var(--text-secondary)',
            }}
          >
            <strong style={{ fontWeight: 750 }}>
              {pickedTitles.length === 1 ? '1 role' : `${pickedTitles.length} roles`}
            </strong>
            {' · '}{pickedTitles.join(', ')}
          </p>
        )}

        {insidersError && (
          <div role="alert" className="community-error" style={{ marginBottom: 12 }}>
            <AlertCircle size={15} aria-hidden="true" /> {insidersError}
          </div>
        )}

        {insiders === null && !insidersError && <RowShimmer rows={3} />}

        {insiders?.length === 0 && (
          <div style={EMPTY}>
            <UserPlus size={28} aria-hidden="true" style={EMPTY_ICON} />
            <p style={EMPTY_TEXT}>
              No one at {selected.name} is taking referral requests yet. You can still apply
              directly — every role links to the employer's own posting.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ justifyContent: 'center' }}
                onClick={() => setStep('roles')}
              >
                Back to the roles
              </button>
              {selected.careersUrl && (
                <a
                  href={selected.careersUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline"
                  style={{ justifyContent: 'center' }}
                >
                  Open {selected.name} careers <ExternalLink size={13} aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
        )}

        {insiders && insiders.length > 0 && (
          <>
            <section className="pp-group">
              <h2>{insiders.length === 1 ? '1 member here' : `${insiders.length} members here`}</h2>
              <p className="pp-group-sub">
                Pick everyone you want to ask. Each one gets their own chat with you.
              </p>
              <div className="pp-group-card">
                {insiders.map((p) => {
                  const on = people.has(p.memberId);
                  const asked = p.requestStatus ? ASKED[p.requestStatus] : null;
                  const name = `${p.firstName} ${p.lastName}`.trim();
                  return (
                    <button
                      key={p.memberId}
                      type="button"
                      className="pp-row"
                      onClick={() => togglePerson(p.memberId)}
                      aria-pressed={on}
                      disabled={Boolean(asked) || sending}
                      style={{
                        background: on ? 'rgba(232, 93, 4, 0.045)' : undefined,
                        ...(asked ? { opacity: 0.65, cursor: 'default' } : null),
                      }}
                    >
                      <span
                        className="pp-row-icon"
                        aria-hidden="true"
                        style={{
                          fontWeight: 800, fontSize: '0.85rem',
                          ...(on ? { background: 'var(--primary-700)', color: '#fff' } : null),
                        }}
                      >
                        {on
                          ? <Check size={17} />
                          : `${p.firstName.charAt(0)}${p.lastName.charAt(0)}`.toUpperCase()}
                      </span>
                      <span className="pp-row-body">
                        <strong>
                          {name}
                          {p.verifiedByAdmin && (
                            <BadgeCheck
                              size={14}
                              role="img"
                              aria-label="Verified by an admin"
                              style={{ display: 'inline', marginLeft: 5, marginBottom: -2, color: 'var(--green-800)' }}
                            />
                          )}
                        </strong>
                        <small style={ELLIPSIS}>{p.jobTitle || `Works at ${selected.name}`}</small>
                      </span>
                      {asked && (
                        <span className="pp-chip" style={{ ...asked.style, flexShrink: 0 }}>{asked.label}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {askable > 0 && (
              <section className="pp-group" style={{ marginTop: 18 }}>
                <div className="pp-sheet-fields" style={{ margin: 0 }}>
                  <div className="pp-field">
                    <label htmlFor="jb-note">Note (optional)</label>
                    <textarea
                      id="jb-note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      maxLength={2000}
                      rows={4}
                      placeholder="Be specific: what you do now, why these roles, and what you would like them to do — pass on your resume, or answer a question about the team."
                    />
                  </div>
                </div>
              </section>
            )}

            {sendError && (
              <div role="alert" className="community-error" style={{ marginBottom: 12 }}>
                <AlertCircle size={15} aria-hidden="true" /> {sendError}
              </div>
            )}

            {askable > 0 && (
              <button
                type="button"
                className="pp-sheet-save"
                style={{ width: '100%' }}
                onClick={send}
                disabled={people.size === 0 || sending}
              >
                {sending
                  ? <><Loader2 size={16} className="spin" aria-hidden="true" /> Sending</>
                  : <>
                      <Send size={16} aria-hidden="true" />
                      Send referral request{people.size > 1 ? `s (${people.size})` : ''}
                    </>}
              </button>
            )}

            {askable === 0 && (
              <p style={{ ...EMPTY_TEXT, textAlign: 'center' }}>
                You have already asked everyone listed here. Your requests are in
                {' '}<Link href="/portal/member/chats" style={{ color: 'var(--text-accent)', fontWeight: 700 }}>Chats</Link>.
              </p>
            )}
          </>
        )}

        {toast && (
          <div className="pp-toast" role="status">
            <Check size={15} aria-hidden="true" /> {toast}
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------- role picker
  const companyMeta = [selected.industry, selected.city, selected.sizeRange].filter(Boolean).join(' · ');
  const synced = selected.jobsSyncedAt ? relative(selected.jobsSyncedAt) : null;

  return (
    <div className="pp2" style={{ paddingBottom: '0.75rem' }}>
      <button type="button" onClick={() => setSelected(null)} style={BACK_BTN}>
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

      {jobsError && (
        <div role="alert" className="community-error" style={{ marginBottom: 12 }}>
          <AlertCircle size={15} aria-hidden="true" /> {jobsError}
        </div>
      )}

      {jobs === null && !jobsError && <RowShimmer rows={4} />}

      {jobs?.length === 0 && (
        <div style={EMPTY}>
          <Briefcase size={28} aria-hidden="true" style={EMPTY_ICON} />
          <p style={EMPTY_TEXT}>
            No roles are cached for {selected.name}. We only list roles an employer publishes in a
            machine-readable feed, so search their careers page directly. You can still ask a
            member there for a referral.
          </p>
          {selected.careersUrl && (
            <a
              href={selected.careersUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
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

      {/* Step 3 is reachable with no roles picked: a link-only employer has no
          feed to pick from, and asking a person there is still the point. */}
      {jobs !== null && !jobsError && (
        <div
          className="ref-ask"
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16,
            border: HAIRLINE, borderRadius: '1.1rem',
          }}
        >
          <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', minWidth: 0 }}>
            {picked.size === 0
              ? 'No roles picked yet'
              : <>
                  <strong style={{ color: 'var(--text-accent)', fontWeight: 800 }}>{picked.size}</strong>
                  {picked.size === 1 ? ' role selected' : ' roles selected'}
                </>}
          </span>
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}
            onClick={goPeople}
          >
            Who can refer you <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
