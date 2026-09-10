'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/app-context';
import { fetchJobsBoard, fetchCompanyJobs } from '@/app/actions/referrals';
import JobBoard from '@/components/portal/JobBoard';
import { readCache, writeCache, CACHE_KEYS } from '@/lib/swr-cache';
import { companyPeople, requestReferral, referralQuota } from '@/app/actions/chat';
import type { Company } from '@/types';
import type { CompanyInsiderEntry } from '@/server/repos/chat';
import type { ScoredJob } from '@/server/repos/referrals';
import type { BoardRole } from '@/server/repos/job-board';
import {
  facetsOf, SENIORITY_LABELS, EMPLOYMENT_LABELS, ARRANGEMENT_LABELS,
  familyLabel, languageLabel, type JobFacets,
} from '@/lib/job-taxonomy';
import {
  Search, Building2, Users, Briefcase, ArrowLeft, ArrowRight, ExternalLink,
  Check, Loader2, ShieldCheck, Send, AlertCircle, BadgeCheck, UserPlus, X,
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
 * Three things shape the layout:
 *  - Employers are a card grid, because a logo and an "open" count are what
 *    people actually scan for.
 *  - A big employer publishes 200 roles, so step two filters and paginates, and
 *    keeps the picked roles visible as chips even when a filter hides the row.
 *  - Referral requests are capped at two per rolling week by a database trigger,
 *    so step two's successor states the allowance, caps the selection, and still
 *    handles the server saying no (two tabs racing).
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

/** "on Sep 3" — the day a referral slot frees up. */
const onDay = (iso: string | null): string => {
  if (!iso) return 'in a few days';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'in a few days';
  return `on ${d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}`;
};

const HAIRLINE = '1px solid rgba(27, 67, 50, 0.08)';
const HAIRLINE_SOFT = '1px solid rgba(27, 67, 50, 0.06)';

/** Roles render 20 at a time; a bank's feed is 200 rows long. */
const PAGE = 20;

/** Exactly what fetchJobsBoard returns, and what this tab caches. */
type JobsBoardData = { roles: BoardRole[]; companies: Company[] };

/**
 * Where the in-page sticky header parks. The portal topbar is sticky at the
 * viewport top on desktop and `display: none` below 1024px (phones are the app),
 * so the offset has to switch at the same breakpoint. The clamp is that media
 * query written as arithmetic: it collapses to 0 under 1024px and saturates at
 * the topbar's height above it, which an inline style can actually express.
 */
const STICKY_TOP = 'calc(var(--sat, 0px) + clamp(0px, (100vw - 1023px) * 999, 3.75rem))';

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

/** Segmented pill group — the filter language across the portal. Scrolls sideways. */
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

/** Two lines, then an ellipsis — company names run long ("Royal Bank of Canada"). */
const CLAMP2 = {
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
  overflow: 'hidden',
} as React.CSSProperties;

const EMPTY: React.CSSProperties = { textAlign: 'center', padding: '2.5rem 1rem' };
const EMPTY_ICON: React.CSSProperties = { opacity: 0.35 };
const EMPTY_TEXT: React.CSSProperties = {
  margin: '0.8rem auto 0', maxWidth: '24rem',
  fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-secondary)',
};

/** Employer grid: two columns on a 412px phone, more as the column widens. */
const GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
  gap: 12,
};

const CARD: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 7,
  minHeight: 150, padding: 14,
  border: HAIRLINE, borderRadius: '1.1rem',
  background: 'var(--bg-primary)',
  boxShadow: '0 6px 20px -16px rgba(15, 35, 24, 0.28)',
  font: 'inherit', textAlign: 'left', color: 'var(--text-primary)',
  cursor: 'pointer',
};

const LOGO_BOX: React.CSSProperties = {
  display: 'grid', placeItems: 'center', flexShrink: 0,
  width: 44, height: 44, borderRadius: '0.7rem',
  background: 'var(--green-950)', color: '#fff',
  fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.01em',
  overflow: 'hidden',
};

/** `companies.logo` is free text: usually initials, sometimes an image URL. */
const isImage = (logo: string) => /^(https?:\/\/|\/)/.test(logo);

function CompanyLogo({ company, size = 44 }: { company: Company; size?: number }) {
  const logo = company.logo?.trim() || '';
  if (isImage(logo)) {
    return (
      <img
        src={logo}
        alt=""
        loading="lazy"
        decoding="async"
        width={size}
        height={size}
        style={{
          width: size, height: size, flexShrink: 0,
          borderRadius: '0.7rem', objectFit: 'contain',
          background: '#fff', border: HAIRLINE,
        }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{ ...LOGO_BOX, width: size, height: size, fontSize: size >= 44 ? '0.95rem' : '0.8rem' }}
    >
      {logo || company.name.charAt(0).toUpperCase()}
    </span>
  );
}

/** What my standing request with this person should say on their row. */
const ASKED: Record<string, { label: string; style: React.CSSProperties }> = {
  pending:  { label: 'Requested', style: { background: 'rgba(232, 93, 4, 0.09)', color: 'var(--primary-800)' } },
  accepted: { label: 'Accepted',  style: { background: 'var(--green-50)', color: 'var(--success-600)' } },
  declined: { label: 'Declined',  style: { background: 'var(--bg-secondary)', color: 'var(--text-muted)' } },
};

const CHIP_GREEN: React.CSSProperties = {
  background: 'rgba(27, 67, 50, 0.09)', color: 'var(--green-800)',
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

const CardShimmer = ({ cards }: { cards: number }) => (
  <div style={GRID} aria-hidden="true">
    {[...Array(cards)].map((_, i) => (
      <div key={i} style={{ ...CARD, cursor: 'default', gap: 10 }}>
        <span className="community-shimmer" style={{ width: 44, height: 44, borderRadius: '0.7rem' }} />
        <span className="community-line-shimmer community-shimmer" style={{ width: '80%' }} />
        <span className="community-line-shimmer community-shimmer" style={{ width: '55%' }} />
      </div>
    ))}
  </div>
);

/**
 * One row of filter pills, with counts.
 *
 * Renders NOTHING unless there are at least two values to choose between:
 * every role at a company being "Permanent" makes a Type filter a control that
 * cannot change anything.
 */
function FacetRow({ label, options, value, onChange, labelOf, allLabel }: {
  label: string;
  options: [string, number][];
  value: string;
  onChange: (v: string) => void;
  labelOf: (key: string) => string;
  allLabel: string;
}) {
  if (options.length < 2) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{
        flexShrink: 0, width: '4.4rem', fontSize: '0.72rem', fontWeight: 800,
        letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)',
      }}>
        {label}
      </span>
      <div style={{ ...SEG_WRAP, minWidth: 0 }} role="group" aria-label={`Filter roles by ${label.toLowerCase()}`}>
        <button type="button" style={seg(value === 'all')} aria-pressed={value === 'all'}
          onClick={() => onChange('all')}>
          {allLabel}
        </button>
        {options.map(([key, count]) => (
          <button key={key} type="button" style={seg(value === key)} aria-pressed={value === key}
            onClick={() => onChange(key)}>
            {labelOf(key)} ({count})
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MemberJobsPage() {
  const { currentUserId } = useApp();
  const router = useRouter();

  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('all');
  const [city, setCity] = useState('all');
  const [referOnly, setReferOnly] = useState(false);

  const [selected, setSelected] = useState<Company | null>(null);
  const [step, setStep] = useState<'roles' | 'people'>('roles');
  const [jobs, setJobs] = useState<ScoredJob[] | null>(null);
  const [jobsError, setJobsError] = useState('');
  const [jobSearch, setJobSearch] = useState('');
  const [jobLoc, setJobLoc] = useState('all');
  const [shown, setShown] = useState(PAGE);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  /**
   * Role facets, all derived from the title (see src/lib/job-taxonomy.ts - the
   * feed leaves employment_type, province and description entirely empty, so
   * there is nothing else to filter on).
   */
  const [seniority, setSeniority] = useState('all');
  const [family, setFamily] = useState('all');
  const [employment, setEmployment] = useState('all');
  const [arrangement, setArrangement] = useState('all');
  const [language, setLanguage] = useState('all');
  const [sort, setSort] = useState<'match' | 'newest' | 'title'>('match');

  /** Every open role, for the role-first board. */
  const [roles, setRoles] = useState<BoardRole[]>([]);
  /**
   * The board is the default. Employer browsing is the secondary view, for a
   * member who already has a company in mind - it used to be the only way in,
   * which forced everyone to guess an employer before seeing a single job.
   */
  const [view, setView] = useState<'roles' | 'employers'>('roles');

  const [insiders, setInsiders] = useState<CompanyInsiderEntry[] | null>(null);
  const [insidersError, setInsidersError] = useState('');
  const [people, setPeople] = useState<Set<string>>(new Set());
  const [quota, setQuota] = useState<{ used: number; limit: number; resetsAt: string | null } | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!currentUserId) return;
    const cached = readCache<JobsBoardData>(CACHE_KEYS.jobs);
    if (cached) { setCompanies(cached.companies); setRoles(cached.roles); }
    fetchJobsBoard().then((r) => {
      if (r.ok) {
        setCompanies(r.data.companies);
        setRoles(r.data.roles);
        writeCache<JobsBoardData>(CACHE_KEYS.jobs, r.data);
      } else setError(r.error);
    });
  }, [currentUserId]);

  /**
   * Deep link from the single-role screen: ?company=X&role=Y&ask=1.
   *
   * "Ask for a referral" on a role hands back to THIS flow rather than
   * reimplementing it - the weekly allowance, the named directory and
   * request-opens-a-chat all live here already. company.id is used directly
   * rather than the `selected` state because that state has not landed yet in
   * the same tick, and goPeople() would read a stale value.
   */
  const searchParams = useSearchParams();
  const deepLinked = useRef(false);
  useEffect(() => {
    if (deepLinked.current || !companies || companies.length === 0) return;
    const companyId = searchParams.get('company');
    if (!companyId) return;
    const company = companies.find((c) => c.id === companyId);
    if (!company) return;
    deepLinked.current = true;
    const roleId = searchParams.get('role');
    const ask = searchParams.get('ask') === '1';
    void (async () => {
      await openCompany(company, roleId ?? undefined);
      if (!ask) return;
      setStep('people');
      const r = await companyPeople(company.id);
      if (r.ok) { setInsiders(r.data.insiders); setQuota(r.data.quota); }
      else setInsidersError(r.error);
    })();
    // The ref is what makes this run once, not the dependency list.
  }, [companies, searchParams]);

  const industries = useMemo(
    () => ['all', ...[...new Set((companies ?? []).map((c) => c.industry).filter(Boolean))].sort()] as string[],
    [companies]
  );

  const cities = useMemo(
    () => [...new Set((companies ?? []).map((c) => c.city?.trim()).filter(Boolean))].sort() as string[],
    [companies]
  );

  /** Search, industry, city and "can refer" all compose. */
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (companies ?? []).filter((c) => {
      const matchQ = !q || c.name.toLowerCase().includes(q)
        || (c.industry ?? '').toLowerCase().includes(q)
        || (c.city ?? '').toLowerCase().includes(q);
      const matchI = industry === 'all' || c.industry === industry;
      const matchC = city === 'all' || c.city?.trim() === city;
      const matchR = !referOnly || c.helperCount > 0;
      return matchQ && matchI && matchC && matchR;
    });
  }, [companies, search, industry, city, referOnly]);

  const filtersOn = Boolean(search.trim()) || industry !== 'all' || city !== 'all' || referOnly;
  const clearFilters = () => { setSearch(''); setIndustry('all'); setCity('all'); setReferOnly(false); };

  const openCompany = async (company: Company, preselectJobId?: string) => {
    setSelected(company);
    setStep('roles');
    setJobs(null);
    setJobsError('');
    setJobSearch('');
    setJobLoc('all');
    setSeniority('all');
    setFamily('all');
    setEmployment('all');
    setArrangement('all');
    setLanguage('all');
    setSort('match');
    setShown(PAGE);
    setPicked(preselectJobId ? new Set([preselectJobId]) : new Set());
    setInsiders(null);
    setInsidersError('');
    setPeople(new Set());
    setQuota(null);
    setNote('');
    setSendError('');
    const r = await fetchCompanyJobs(company.id);
    if (r.ok) setJobs(r.data);
    else setJobsError(r.error);
  };

  /**
   * Open a suggested role at its employer with that role already ticked.
   *
   * The suggestion carries the company id but not the full Company row the
   * grid works with, so it falls back to a minimal stand-in when the directory
   * has not arrived yet - the roles screen only reads the name and logo.
   */
  const jobLocations = useMemo(
    () =>
      [...new Set((jobs ?? []).map((j) => j.location?.trim()).filter(Boolean))]
        // Workday multi-site postings ship the literal string "2 Locations" -
        // useless as a filter, and the digits sorted them to the front.
        .filter((l) => !/^\d+\s+locations?$/i.test(l as string))
        .sort() as string[],
    [jobs]
  );

  /** Facets per role, computed once from the title rather than per filter. */
  const facets = useMemo(() => {
    const map = new Map<string, JobFacets>();
    for (const j of jobs ?? []) map.set(j.id, facetsOf(j.title, j.location ?? null));
    return map;
  }, [jobs]);

  /**
   * Only offer a filter value that actually exists in THIS employer's roles,
   * with its count. A dropdown listing "Hybrid (0)" is worse than no dropdown:
   * the feed's coverage varies wildly by company, and an empty option reads as
   * a broken filter rather than an honest absence.
   */
  const facetOptions = useMemo(() => {
    const tally = (pick: (f: JobFacets) => string[]) => {
      const counts = new Map<string, number>();
      for (const j of jobs ?? []) {
        const f = facets.get(j.id);
        if (!f) continue;
        for (const v of pick(f)) counts.set(v, (counts.get(v) ?? 0) + 1);
      }
      return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    };
    return {
      seniority: tally((f) => [f.seniority]),
      family: tally((f) => f.families),
      employment: tally((f) => [f.employment]),
      arrangement: tally((f) => [f.arrangement]),
      language: tally((f) => f.languages),
    };
  }, [jobs, facets]);

  const matchedCount = useMemo(
    () => (jobs ?? []).filter((j) => j.matchScore > 0).length,
    [jobs]
  );

  const visibleJobs = useMemo(() => {
    const q = jobSearch.trim().toLowerCase();
    const rows = (jobs ?? []).filter((j) => {
      const f = facets.get(j.id);
      const matchQ = !q || j.title.toLowerCase().includes(q) || (j.location ?? '').toLowerCase().includes(q);
      const matchL = jobLoc === 'all' || j.location?.trim() === jobLoc;
      const matchS = seniority === 'all' || f?.seniority === seniority;
      const matchF = family === 'all' || Boolean(f?.families.includes(family as never));
      const matchE = employment === 'all' || f?.employment === employment;
      const matchA = arrangement === 'all' || f?.arrangement === arrangement;
      const matchLang = language === 'all' || Boolean(f?.languages.includes(language));
      return matchQ && matchL && matchS && matchF && matchE && matchA && matchLang;
    });
    const byTitle = (a: ScoredJob, b: ScoredJob) => a.title.localeCompare(b.title);
    if (sort === 'title') return [...rows].sort(byTitle);
    if (sort === 'newest') {
      return [...rows].sort((a, b) =>
        (b.postedAt ? Date.parse(b.postedAt) : 0) - (a.postedAt ? Date.parse(a.postedAt) : 0)
        || byTitle(a, b));
    }
    // Best match: scored roles first, everything else in the feed's own order
    // underneath, so the list never LOSES roles just because nothing matched.
    return [...rows].sort((a, b) => b.matchScore - a.matchScore || byTitle(a, b));
  }, [jobs, facets, jobSearch, jobLoc, seniority, family, employment, arrangement, language, sort]);

  const roleFiltersOn = seniority !== 'all' || family !== 'all' || employment !== 'all'
    || arrangement !== 'all' || language !== 'all' || jobLoc !== 'all' || Boolean(jobSearch.trim());

  const clearRoleFilters = () => {
    setSeniority('all'); setFamily('all'); setEmployment('all');
    setArrangement('all'); setLanguage('all'); setJobLoc('all'); setJobSearch('');
  };

  /** Only `shown` rows render; the rest are one tap away. */
  const pagedJobs = useMemo(() => visibleJobs.slice(0, shown), [visibleJobs, shown]);
  const moreLeft = visibleJobs.length - pagedJobs.length;

  const pickedJobs = useMemo(
    () => (jobs ?? []).filter((j) => picked.has(j.id)),
    [jobs, picked]
  );
  const pickedTitles = useMemo(() => pickedJobs.map((j) => j.title), [pickedJobs]);

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  /** The rolling weekly allowance decides how many people you may pick at once. */
  const cap = quota ? Math.max(0, Math.min(2, quota.limit - quota.used)) : 2;
  const exhausted = quota !== null && quota.used >= quota.limit;
  const capReached = people.size >= cap;

  const togglePerson = (id: string) =>
    setPeople((prev) => {
      if (!prev.has(id) && prev.size >= cap) return prev;
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const loadQuota = () => referralQuota().then((r) => { if (r.ok) setQuota(r.data); });

  /**
   * Step 3 needs the named directory and my remaining allowance. They used to
   * be two actions, which Next ran back to back; companyPeople brings both in
   * one round trip. Once the directory is in hand only the allowance can have
   * changed, so a re-entry asks for just that.
   */
  const goPeople = async () => {
    setStep('people');
    setSendError('');
    if (!selected || insiders !== null || insidersError) { loadQuota(); return; }
    const r = await companyPeople(selected.id);
    if (r.ok) { setInsiders(r.data.insiders); setQuota(r.data.quota); }
    else setInsidersError(r.error);
  };

  /**
   * One request per person, sequentially — Next runs a client's Server Action
   * calls one at a time anyway, and a partial failure has to be reportable.
   * Each call spends one weekly slot, and the trigger is the real authority: a
   * second tab can have used the allowance since this one read it.
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
      // show a Requested chip, so it is clear what still needs doing. The
      // banner is re-read from the server, because the reason is usually that
      // the allowance is gone.
      setSendError(done.length === 0
        ? failure
        : `${failure} ${done.length} of ${ids.length} went through.`);
      await loadQuota();
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

  // ------------------------------------------------------------ company grid
  if (!selected) {
    return (
      <div className="pp2">
        <header style={{ marginBottom: 12 }}>
          <h1 style={TITLE}>Jobs</h1>
          <p style={SUB}>
            Every open role our employers are advertising. Open one to apply
            yourself, or to ask a member who works there to refer you.
          </p>
          <Link href="/portal/member/referrals" style={QUIET_LINK}>
            My referral requests <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </header>

        {/* Roles first. Browsing by employer used to be the only way in, which
            made everyone guess a company before seeing a single job. */}
        <div style={{ ...SEG_WRAP, marginBottom: 10 }} role="group" aria-label="Jobs view">
          <button
            type="button"
            style={seg(view === 'roles')}
            aria-pressed={view === 'roles'}
            onClick={() => setView('roles')}
          >
            All roles{roles.length > 0 ? ` (${roles.length})` : ''}
          </button>
          <button
            type="button"
            style={seg(view === 'employers')}
            aria-pressed={view === 'employers'}
            onClick={() => setView('employers')}
          >
            By employer{companies?.length ? ` (${companies.length})` : ''}
          </button>
        </div>

        {error && (
          <div role="alert" className="community-error" style={{ marginBottom: 12 }}>
            <AlertCircle size={15} aria-hidden="true" /> {error}
          </div>
        )}

        {view === 'roles' ? (
          roles.length === 0 && !error ? <CardShimmer cards={4} /> : <JobBoard roles={roles} />
        ) : (
          <>
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
          <div style={{ ...SEG_WRAP, marginBottom: 8 }} role="group" aria-label="Filter by industry">
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, minWidth: 0 }}>
          <button
            type="button"
            className={`pp-toggle ${referOnly ? 'is-on' : ''}`}
            onClick={() => setReferOnly((v) => !v)}
            aria-pressed={referOnly}
            style={{ minHeight: 44, paddingRight: '0.85rem' }}
          >
            <span className="pp-toggle-dot" aria-hidden="true" />
            Can refer
          </button>

          {cities.length > 1 && (
            <div style={{ ...SEG_WRAP, minWidth: 0 }} role="group" aria-label="Filter by city">
              <button
                type="button"
                style={seg(city === 'all')}
                aria-pressed={city === 'all'}
                onClick={() => setCity('all')}
              >
                All cities
              </button>
              {cities.map((c) => (
                <button
                  key={c}
                  type="button"
                  style={seg(city === c)}
                  aria-pressed={city === c}
                  onClick={() => setCity(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {companies === null && !error && <CardShimmer cards={6} />}

        {companies?.length === 0 && (
          <div style={EMPTY}>
            <Building2 size={28} aria-hidden="true" style={EMPTY_ICON} />
            <p style={EMPTY_TEXT}>No employers are listed yet. An admin adds them, and members say where they work.</p>
          </div>
        )}

        {visible.length > 0 && (
          <section className="pp-group">
            <h2>{visible.length === 1 ? '1 employer' : `${visible.length} employers`}</h2>
            <div style={GRID}>
              {visible.map((c) => (
                <button key={c.id} type="button" style={CARD} onClick={() => openCompany(c)}>
                  <CompanyLogo company={c} />
                  <strong style={{ fontSize: '0.95rem', fontWeight: 750, lineHeight: 1.3, ...CLAMP2 }}>
                    {c.name}
                  </strong>
                  <small style={{ fontSize: '0.75rem', color: 'var(--text-muted)', ...ELLIPSIS }}>
                    {[c.industry, c.city].filter(Boolean).join(' · ') || 'Employer'}
                  </small>
                  <span
                    style={{
                      marginTop: 'auto', display: 'flex', alignItems: 'center',
                      gap: 6, flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.78rem', fontWeight: 800, whiteSpace: 'nowrap',
                        color: c.openJobsCount > 0 ? 'var(--text-accent)' : 'var(--text-muted)',
                      }}
                    >
                      {c.openJobsCount > 0 ? `${c.openJobsCount} open` : 'Careers'}
                    </span>
                    {c.helperCount > 0 && (
                      <span className="pp-chip" style={CHIP_GREEN}>{c.helperCount} can refer</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {companies !== null && visible.length === 0 && companies.length > 0 && (
          <div style={EMPTY}>
            <Search size={28} aria-hidden="true" style={EMPTY_ICON} />
            <p style={EMPTY_TEXT}>
              {referOnly
                ? 'No employer matches those filters. Try turning off "Can refer".'
                : 'Nothing matched those filters.'}
            </p>
            {filtersOn && (
              <button type="button" className="btn btn-outline" style={{ marginTop: 14 }} onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
        )}
          </>
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

        {/* The weekly allowance, stated before anyone picks anyone. */}
        {quota && !exhausted && (
          <p
            style={{
              display: 'flex', alignItems: 'center', gap: 7, margin: '0 0 14px',
              padding: '0.6rem 0.85rem', borderRadius: 999,
              background: 'rgba(27, 67, 50, 0.07)', color: 'var(--green-800)',
              fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.4,
            }}
          >
            <ShieldCheck size={15} aria-hidden="true" style={{ flexShrink: 0 }} />
            You can send {quota.limit - quota.used} of {quota.limit} referral requests this week.
          </p>
        )}

        {exhausted && (
          <div
            role="alert"
            className="community-error"
            style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 14, lineHeight: 1.5 }}
          >
            <AlertCircle size={15} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              You&apos;ve used both referral requests for this week. You can send again
              {' '}{onDay(quota?.resetsAt ?? null)}. Your open requests are in
              {' '}<Link href="/portal/member/chats" style={{ color: 'inherit', fontWeight: 800 }}>Chats</Link>.
            </span>
          </div>
        )}

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
                {exhausted
                  ? 'You have no requests left this week.'
                  : `Pick up to ${cap} ${cap === 1 ? 'person' : 'people'}. Each one gets their own chat with you.`}
              </p>
              <div className="pp-group-card">
                {insiders.map((p) => {
                  const on = people.has(p.memberId);
                  const asked = p.requestStatus ? ASKED[p.requestStatus] : null;
                  const name = `${p.firstName} ${p.lastName}`.trim();
                  // Past the cap, the rows you have not picked stop responding.
                  const blocked = !on && (capReached || exhausted);
                  const off = Boolean(asked) || sending || blocked;
                  return (
                    <button
                      key={p.memberId}
                      type="button"
                      className="pp-row"
                      onClick={() => togglePerson(p.memberId)}
                      aria-pressed={on}
                      disabled={off}
                      aria-disabled={off}
                      style={{
                        background: on ? 'rgba(232, 93, 4, 0.045)' : undefined,
                        ...(asked ? { opacity: 0.65, cursor: 'default' } : null),
                        ...(blocked ? { opacity: 0.5, cursor: 'default' } : null),
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

            {askable > 0 && !exhausted && (
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
              <div role="alert" className="community-error" style={{ marginBottom: 12, marginTop: 12 }}>
                <AlertCircle size={15} aria-hidden="true" /> {sendError}
              </div>
            )}

            {askable > 0 && (
              <button
                type="button"
                className="pp-sheet-save"
                style={{ width: '100%', marginTop: 14 }}
                onClick={send}
                disabled={people.size === 0 || sending || exhausted}
              >
                {sending
                  ? <><Loader2 size={16} className="spin" aria-hidden="true" /> Sending</>
                  : <>
                      <Send size={16} aria-hidden="true" />
                      {people.size > 1
                        ? `Send ${people.size} referral requests`
                        : 'Send referral request'}
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
  // A link-only employer has no feed to pick from, and asking a person there is
  // still the point — so the gate only applies when there are roles on screen.
  const mustPick = (jobs?.length ?? 0) > 0 && picked.size === 0;

  return (
    <div className="pp2" style={{ paddingBottom: '0.75rem' }}>
      <button type="button" onClick={() => setSelected(null)} style={BACK_BTN}>
        <ArrowLeft size={16} aria-hidden="true" /> All employers
      </button>

      {/* Identity plus the controls, pinned under the topbar: with 200 roles the
          search box has to stay in reach. */}
      <div
        style={{
          position: 'sticky', top: STICKY_TOP, zIndex: 4,
          background: 'var(--bg-secondary)',
          padding: '8px 0 10px',
          borderBottom: HAIRLINE,
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, marginBottom: 10 }}>
          <CompanyLogo company={selected} size={38} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{ ...TITLE, fontSize: '1.05rem', margin: 0, ...ELLIPSIS }}>{selected.name}</h1>
            {companyMeta && (
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', ...ELLIPSIS }}>
                {companyMeta}
              </p>
            )}
          </div>
        </div>

        {jobs !== null && jobs.length > 0 && (
          <>
            <div style={{ ...SEARCH_WRAP, marginBottom: jobLocations.length > 1 ? 8 : 6 }}>
              <Search size={16} aria-hidden="true" style={SEARCH_ICON} />
              <input
                id="jb-role-search"
                value={jobSearch}
                onChange={(e) => { setJobSearch(e.target.value); setShown(PAGE); }}
                placeholder={`Search ${jobs.length} open roles`}
                aria-label="Search roles"
                style={SEARCH_INPUT}
              />
            </div>

            {jobLocations.length > 1 && (
              <div style={{ ...SEG_WRAP, marginBottom: 6 }} role="group" aria-label="Filter roles by location">
                <button
                  type="button"
                  style={seg(jobLoc === 'all')}
                  aria-pressed={jobLoc === 'all'}
                  onClick={() => { setJobLoc('all'); setShown(PAGE); }}
                >
                  All locations
                </button>
                {jobLocations.map((l) => (
                  <button
                    key={l}
                    type="button"
                    style={seg(jobLoc === l)}
                    aria-pressed={jobLoc === l}
                    onClick={() => { setJobLoc(l); setShown(PAGE); }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            )}

            {/* Role facets. Each row appears only when this employer's roles
                actually offer a choice, and every option carries its count -
                see facetOptions for why an empty option is worse than none. */}
            <FacetRow
              label="Level"
              options={facetOptions.seniority}
              value={seniority}
              onChange={(v) => { setSeniority(v); setShown(PAGE); }}
              labelOf={(k) => SENIORITY_LABELS[k as keyof typeof SENIORITY_LABELS] ?? k}
              allLabel="Any level"
            />
            <FacetRow
              label="Function"
              options={facetOptions.family}
              value={family}
              onChange={(v) => { setFamily(v); setShown(PAGE); }}
              labelOf={familyLabel}
              allLabel="All functions"
            />
            <FacetRow
              label="Type"
              options={facetOptions.employment}
              value={employment}
              onChange={(v) => { setEmployment(v); setShown(PAGE); }}
              labelOf={(k) => EMPLOYMENT_LABELS[k as keyof typeof EMPLOYMENT_LABELS] ?? k}
              allLabel="Any type"
            />
            <FacetRow
              label="Setting"
              options={facetOptions.arrangement}
              value={arrangement}
              onChange={(v) => { setArrangement(v); setShown(PAGE); }}
              labelOf={(k) => ARRANGEMENT_LABELS[k as keyof typeof ARRANGEMENT_LABELS] ?? k}
              allLabel="Anywhere"
            />
            <FacetRow
              label="Language"
              options={facetOptions.language}
              value={language}
              onChange={(v) => { setLanguage(v); setShown(PAGE); }}
              labelOf={languageLabel}
              allLabel="Any language"
            />

            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
              margin: '8px 0 0 2px',
            }}>
              <div style={SEG_WRAP} role="group" aria-label="Sort roles">
                {([
                  ['match', matchedCount > 0 ? `Best match (${matchedCount})` : 'Best match'],
                  ['newest', 'Newest'],
                  ['title', 'A–Z'],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    style={seg(sort === key)}
                    aria-pressed={sort === key}
                    onClick={() => { setSort(key); setShown(PAGE); }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {roleFiltersOn && (
                <button
                  type="button"
                  onClick={() => { clearRoleFilters(); setShown(PAGE); }}
                  style={{
                    minHeight: 44, padding: '0 12px', border: 0, background: 'none',
                    color: 'var(--text-accent)', font: 'inherit', fontSize: '0.82rem',
                    fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>

            <p
              aria-live="polite"
              style={{ margin: '6px 0 0 2px', fontSize: '0.75rem', fontWeight: 650, color: 'var(--text-muted)' }}
            >
              Showing {pagedJobs.length} of {visibleJobs.length} roles
              {visibleJobs.length !== jobs.length ? ` (filtered from ${jobs.length})` : ''}
            </p>
          </>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <HelperBadge count={selected.helperCount} />
        {selected.careersUrl && (
          <a
            href={selected.careersUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={QUIET_LINK}
          >
            Careers page <ExternalLink size={13} aria-hidden="true" />
          </a>
        )}
      </div>

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
        <section className="pp-group">
          {/* Picked roles survive a filter that hides their row, so they are
              listed here where they can still be taken off. */}
          {pickedJobs.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 750, color: 'var(--text-secondary)' }}>
                {pickedJobs.length === 1 ? '1 role picked' : `${pickedJobs.length} roles picked`}
              </span>
              {pickedJobs.map((j) => (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => toggle(j.id)}
                  aria-label={`Remove ${j.title}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    minHeight: 44, maxWidth: '100%', padding: '0 0.7rem 0 0.85rem',
                    border: 0, borderRadius: 999,
                    background: 'rgba(232, 93, 4, 0.09)', color: 'var(--primary-800)',
                    font: 'inherit', fontSize: '0.78rem', fontWeight: 750, cursor: 'pointer',
                  }}
                >
                  <span style={{ ...ELLIPSIS, maxWidth: '11rem' }}>{j.title}</span>
                  <X size={14} aria-hidden="true" style={{ flexShrink: 0 }} />
                </button>
              ))}
            </div>
          )}

          <h2>Open roles</h2>
          <p className="pp-group-sub">
            Tap the roles you want a referral for.{synced ? ` Feed updated ${synced}.` : ''}
          </p>

          {visibleJobs.length === 0 ? (
            <div style={EMPTY}>
              <Search size={28} aria-hidden="true" style={EMPTY_ICON} />
              <p style={EMPTY_TEXT}>No roles matched that filter.</p>
              <button
                type="button"
                className="btn btn-outline"
                style={{ marginTop: 14 }}
                onClick={() => { setJobSearch(''); setJobLoc('all'); setShown(PAGE); }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <ul className="pp-group-card" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {pagedJobs.map((j, i) => {
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
                        borderBottom: i === pagedJobs.length - 1 ? 0 : HAIRLINE_SOFT,
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
                          {/* Why this role is flagged, in the member's own
                              terms. A bare "recommended" badge is unfalsifiable
                              and reads as advertising. */}
                          {j.matchReasons.length > 0 && (
                            <small style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              marginTop: 3, color: 'var(--success-600)', fontWeight: 750,
                            }}>
                              <BadgeCheck size={12} aria-hidden="true" />
                              {j.matchReasons[0]}
                            </small>
                          )}
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
                          borderLeft: HAIRLINE_SOFT,
                        }}
                      >
                        <ExternalLink size={15} aria-hidden="true" />
                      </a>
                    </li>
                  );
                })}
              </ul>

              {moreLeft > 0 && (
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
                  onClick={() => setShown((n) => n + PAGE)}
                >
                  Show {Math.min(PAGE, moreLeft)} more ({moreLeft} left)
                </button>
              )}
            </>
          )}
        </section>
      )}

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
            disabled={mustPick}
          >
            Who can refer you <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
