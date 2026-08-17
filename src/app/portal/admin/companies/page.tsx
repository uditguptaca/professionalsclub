'use client';
import React, { useEffect, useMemo, useState } from 'react';
import {
  adminFetchCompanies, adminSaveCompany, adminSyncCompany,
  adminDetectSource, adminAddManualJob, adminDrainEmail,
} from '@/app/actions/referrals';
import type { Company, JobSourceKind } from '@/types';
import {
  Building2, Plus, RefreshCw, Search, Loader2, Check, X, AlertTriangle,
  Wand2, Users, Briefcase, Mail, ExternalLink, Clock,
} from 'lucide-react';

/**
 * Companies and their job feeds.
 *
 * The only screen where source_kind and source_config are set, and the reason
 * Detect exists: guessing an ATS token produces a feed that silently returns
 * nothing, so the button probes the real endpoints and reports what actually
 * answered. Sync now shows the counts, and a failure is kept on the row rather
 * than swallowed.
 */

const SOURCE_KINDS: JobSourceKind[] = [
  'link', 'manual', 'greenhouse', 'lever', 'ashby', 'workable',
  'smartrecruiters', 'recruitee', 'workday', 'jsonld', 'rss', 'jobbank', 'adzuna',
];

const KIND_LABELS: Record<JobSourceKind, string> = {
  link: 'Link out only', manual: 'Roles added by hand',
  greenhouse: 'Greenhouse', lever: 'Lever', ashby: 'Ashby', workable: 'Workable',
  smartrecruiters: 'SmartRecruiters', recruitee: 'Recruitee', workday: 'Workday',
  jsonld: 'Careers page (JSON-LD)', rss: 'Careers RSS/Atom feed',
  jobbank: 'Job Bank Canada (general feed)', adzuna: 'Adzuna',
};

/** Which source_config keys each kind expects. Drives the form. */
const KIND_FIELDS: Record<JobSourceKind, string[]> = {
  link: [], manual: [],
  greenhouse: ['token'], lever: ['token'], ashby: ['token'], workable: ['token'],
  smartrecruiters: ['token'], recruitee: ['token'],
  workday: ['host', 'tenant', 'site'],
  jsonld: ['url'], rss: ['url'], jobbank: ['feedUrl'], adzuna: ['employer'],
};

const KIND_HINTS: Partial<Record<JobSourceKind, string>> = {
  greenhouse: 'The board name from boards.greenhouse.io/<token>',
  lever: 'The company name from jobs.lever.co/<token>',
  ashby: 'The board name from jobs.ashbyhq.com/<token>',
  workable: 'The subdomain from apply.workable.com/<token>',
  smartrecruiters: 'The company id from jobs.smartrecruiters.com/<token>',
  recruitee: 'The subdomain from <token>.recruitee.com',
  workday: 'From cibc.wd3.myworkdayjobs.com/search: host cibc.wd3.myworkdayjobs.com, tenant cibc, site search',
  jsonld: 'A careers page that carries JobPosting markup. Rare on enterprise careers hubs, common on smaller sites.',
  rss: 'The feed URL. Atom works too.',
  jobbank: 'Job Bank cannot filter by employer, so this is a general Canada-wide feed, not this company’s roles.',
  adzuna: 'Needs ADZUNA_APP_ID and ADZUNA_APP_KEY in the environment.',
};

const blank = {
  id: '', name: '', slug: '', logo: '', industry: '', sizeRange: '', city: '',
  province: '', website: '', careersUrl: '', descriptionShort: '',
  sourceKind: 'link' as JobSourceKind, isActive: true,
};

type Draft = typeof blank & { sourceConfig: Record<string, string> };

const toDraft = (c: Company): Draft => ({
  id: c.id, name: c.name, slug: c.slug, logo: c.logo ?? '', industry: c.industry ?? '',
  sizeRange: c.sizeRange ?? '', city: c.city ?? '', province: c.province ?? '',
  website: c.website ?? '', careersUrl: c.careersUrl ?? '',
  descriptionShort: c.descriptionShort ?? '', sourceKind: c.sourceKind,
  isActive: c.isActive !== false,
  sourceConfig: Object.fromEntries(
    Object.entries(c.sourceConfig ?? {}).map(([k, v]) => [k, String(v ?? '')])
  ),
});

const ago = (iso: string | null): string => {
  if (!iso) return 'never';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');

  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  const [jobFor, setJobFor] = useState<Company | null>(null);
  const [job, setJob] = useState({ title: '', location: '', applyUrl: '', department: '' });

  const load = async () => {
    const r = await adminFetchCompanies();
    if (r.ok) setCompanies(r.data); else setError(r.error);
  };
  useEffect(() => { load(); }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (companies ?? []).filter((c) =>
      !q || c.name.toLowerCase().includes(q) || (c.industry ?? '').toLowerCase().includes(q));
  }, [companies, search]);

  const save = async () => {
    if (!draft || saving) return;
    setSaving(true);
    setError(''); setNotice('');
    const r = await adminSaveCompany({
      ...draft,
      id: draft.id || undefined,
      sourceConfig: draft.sourceConfig,
    });
    if (r.ok) { setCompanies(r.data); setDraft(null); setNotice('Company saved.'); }
    else setError(r.error);
    setSaving(false);
  };

  const detect = async () => {
    if (!draft?.careersUrl || detecting) return;
    setDetecting(true);
    setError(''); setNotice('');
    const r = await adminDetectSource(draft.careersUrl);
    if (!r.ok) setError(r.error);
    else if (!r.data) {
      setNotice('Nothing answered at that URL. Use "Link out only", or add roles by hand.');
    } else {
      setDraft({
        ...draft,
        sourceKind: r.data.kind as JobSourceKind,
        sourceConfig: r.data.config,
      });
      setNotice(`Found a ${KIND_LABELS[r.data.kind as JobSourceKind]} feed with ${r.data.jobCount} roles. Save to keep it.`);
    }
    setDetecting(false);
  };

  const sync = async (company: Company) => {
    if (syncing) return;
    setSyncing(company.id);
    setError(''); setNotice('');
    const r = await adminSyncCompany(company.id);
    if (r.ok) {
      setCompanies(r.data.companies);
      setNotice(r.data.error
        ? `${company.name}: ${r.data.error}`
        : `${company.name}: ${r.data.added} added, ${r.data.updated} updated, ${r.data.closed} closed.`);
    } else setError(r.error);
    setSyncing(null);
  };

  const addJob = async () => {
    if (!jobFor || saving) return;
    setSaving(true);
    setError(''); setNotice('');
    const r = await adminAddManualJob({ companyId: jobFor.id, ...job });
    if (r.ok) {
      setNotice(`Added "${r.data.title}" at ${jobFor.name}.`);
      setJob({ title: '', location: '', applyUrl: '', department: '' });
      setJobFor(null);
      await load();
    } else setError(r.error);
    setSaving(false);
  };

  const drain = async () => {
    setNotice('');
    const r = await adminDrainEmail();
    if (r.ok) {
      setNotice(r.data.configured
        ? `Email: ${r.data.sent} sent, ${r.data.failed} failed, ${r.data.skipped} skipped.`
        : `No RESEND_API_KEY set, so nothing was actually delivered — ${r.data.sent} message(s) were logged to the server console instead.`);
    } else setError(r.error);
  };

  const fields = draft ? KIND_FIELDS[draft.sourceKind] : [];

  return (
    <div className="ref-page">
      <header className="ref-head">
        <div>
          <h1>Companies</h1>
          <p>
            Employers members can ask for referrals at. A company&rsquo;s open roles come from its
            own public job feed &mdash; set that here, or leave it linking out to their careers page.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={drain}>
            <Mail size={14} aria-hidden="true" /> Send queued email
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setDraft({ ...blank, sourceConfig: {} })}
          >
            <Plus size={14} aria-hidden="true" /> Add company
          </button>
        </div>
      </header>

      {error && <p role="alert" className="community-error">{error}</p>}
      {notice && <p className="community-panel" style={{ padding: '12px 14px', margin: 0, fontSize: '0.87rem' }}>{notice}</p>}

      {/* ---------------------------------------------------------- editor */}
      {draft && (
        <div className="community-panel ref-work-add">
          <h3>{draft.id ? `Edit ${draft.name || 'company'}` : 'New company'}</h3>

          <div className="form-grid-2">
            <div className="form-field">
              <label htmlFor="c-name">Name</label>
              <input id="c-name" className="input" value={draft.name}
                     onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div className="form-field">
              <label htmlFor="c-industry">Industry</label>
              <input id="c-industry" className="input" value={draft.industry}
                     onChange={(e) => setDraft({ ...draft, industry: e.target.value })} />
            </div>
            <div className="form-field">
              <label htmlFor="c-city">City</label>
              <input id="c-city" className="input" value={draft.city}
                     onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
            </div>
            <div className="form-field">
              <label htmlFor="c-prov">Province</label>
              <input id="c-prov" className="input" value={draft.province}
                     onChange={(e) => setDraft({ ...draft, province: e.target.value })} />
            </div>
            <div className="form-field">
              <label htmlFor="c-size">Size</label>
              <input id="c-size" className="input" value={draft.sizeRange} placeholder="10,000+"
                     onChange={(e) => setDraft({ ...draft, sizeRange: e.target.value })} />
            </div>
            <div className="form-field">
              <label htmlFor="c-logo">Logo initials</label>
              <input id="c-logo" className="input" value={draft.logo} maxLength={4} placeholder="RBC"
                     onChange={(e) => setDraft({ ...draft, logo: e.target.value })} />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="c-desc">One line about them</label>
            <input id="c-desc" className="input" value={draft.descriptionShort}
                   onChange={(e) => setDraft({ ...draft, descriptionShort: e.target.value })} />
          </div>

          <div className="form-field">
            <label htmlFor="c-careers">Careers URL</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input id="c-careers" className="input" style={{ flex: 1, minWidth: '16rem' }}
                     value={draft.careersUrl} placeholder="https://jobs.example.com/careers"
                     onChange={(e) => setDraft({ ...draft, careersUrl: e.target.value })} />
              <button type="button" className="btn btn-outline btn-sm"
                      disabled={!draft.careersUrl || detecting} onClick={detect}>
                {detecting
                  ? <><Loader2 size={14} className="spin" /> Probing</>
                  : <><Wand2 size={14} /> Detect feed</>}
              </button>
            </div>
            <small className="ref-muted">
              Detect calls the likely endpoints and only reports one that returned real roles.
            </small>
          </div>

          <div className="form-field">
            <label htmlFor="c-kind">Where roles come from</label>
            <select id="c-kind" className="input" value={draft.sourceKind}
                    onChange={(e) => setDraft({ ...draft, sourceKind: e.target.value as JobSourceKind, sourceConfig: {} })}>
              {SOURCE_KINDS.map((k) => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
            </select>
            {KIND_HINTS[draft.sourceKind] && (
              <small className="ref-muted">{KIND_HINTS[draft.sourceKind]}</small>
            )}
          </div>

          {fields.length > 0 && (
            <div className="form-grid-2">
              {fields.map((f) => (
                <div className="form-field" key={f}>
                  <label htmlFor={`cfg-${f}`}>{f}</label>
                  <input
                    id={`cfg-${f}`}
                    className="input"
                    value={draft.sourceConfig[f] ?? ''}
                    onChange={(e) => setDraft({
                      ...draft,
                      sourceConfig: { ...draft.sourceConfig, [f]: e.target.value },
                    })}
                  />
                </div>
              ))}
            </div>
          )}

          <label className="ref-toggle">
            <input type="checkbox" checked={draft.isActive}
                   onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
            <span><strong>Listed</strong><small>Unlisted companies disappear from the directory and the dropdown.</small></span>
          </label>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>
              {saving ? <Loader2 size={15} className="spin" /> : <Check size={15} />} Save
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setDraft(null)}>
              <X size={15} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------ manual role */}
      {jobFor && (
        <div className="community-panel ref-work-add">
          <h3>Add a role at {jobFor.name}</h3>
          <div className="form-grid-2">
            <div className="form-field">
              <label htmlFor="j-title">Title</label>
              <input id="j-title" className="input" value={job.title}
                     onChange={(e) => setJob({ ...job, title: e.target.value })} />
            </div>
            <div className="form-field">
              <label htmlFor="j-loc">Location</label>
              <input id="j-loc" className="input" value={job.location}
                     onChange={(e) => setJob({ ...job, location: e.target.value })} />
            </div>
            <div className="form-field">
              <label htmlFor="j-dept">Team</label>
              <input id="j-dept" className="input" value={job.department}
                     onChange={(e) => setJob({ ...job, department: e.target.value })} />
            </div>
            <div className="form-field">
              <label htmlFor="j-url">Apply URL</label>
              <input id="j-url" className="input" value={job.applyUrl} placeholder="https://"
                     onChange={(e) => setJob({ ...job, applyUrl: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={addJob}>
              {saving ? <Loader2 size={15} className="spin" /> : <Plus size={15} />} Add role
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setJobFor(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ list */}
      <div className="ref-filters">
        <div className="ref-search">
          <Search size={17} aria-hidden="true" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
                 placeholder="Search companies" aria-label="Search companies" />
        </div>
      </div>

      {companies === null && (
        <div className="community-panel" aria-hidden="true">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="ref-job-skeleton">
              <span className="community-line-shimmer community-shimmer" style={{ width: '40%' }} />
            </div>
          ))}
        </div>
      )}

      {visible.map((c) => (
        <article key={c.id} className="community-panel ref-work-card">
          <div className="ref-ask-head">
            <span className="ref-logo" aria-hidden="true">{c.logo || c.name.charAt(0)}</span>
            <div>
              <strong>
                {c.name}
                {c.isActive === false && <span className="ref-closed" style={{ marginLeft: 8 }}>unlisted</span>}
              </strong>
              <small>
                {[c.industry, c.city].filter(Boolean).join(' · ') || 'No industry set'}
                {' · '}{KIND_LABELS[c.sourceKind]}
              </small>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setDraft(toDraft(c))}>
                Edit
              </button>
              {c.sourceKind === 'manual' && (
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setJobFor(c)}>
                  <Plus size={13} /> Role
                </button>
              )}
              {c.sourceKind !== 'manual' && c.sourceKind !== 'link' && (
                <button type="button" className="btn btn-primary btn-sm"
                        disabled={syncing !== null} onClick={() => sync(c)}>
                  {syncing === c.id
                    ? <><Loader2 size={13} className="spin" /> Syncing</>
                    : <><RefreshCw size={13} /> Sync now</>}
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="ref-helpers">
              <Users size={13} aria-hidden="true" />
              {c.helperCount} {c.helperCount === 1 ? 'member inside' : 'members inside'}
            </span>
            <span className="ref-helpers" style={{ background: 'rgba(232,93,4,0.1)', color: 'var(--primary-700)' }}>
              <Briefcase size={13} aria-hidden="true" /> {c.openJobsCount} open
            </span>
            {c.sourceKind !== 'link' && c.sourceKind !== 'manual' && (
              <span className="ref-helpers ref-helpers-none">
                <Clock size={13} aria-hidden="true" /> synced {ago(c.jobsSyncedAt)}
              </span>
            )}
            {c.careersUrl && (
              <a href={c.careersUrl} target="_blank" rel="noopener noreferrer"
                 className="ref-helpers ref-helpers-none" style={{ textDecoration: 'none' }}>
                <ExternalLink size={13} aria-hidden="true" /> Careers page
              </a>
            )}
          </div>

          {c.jobsSyncError && (
            <p className="ref-warn" style={{ margin: 0 }}>
              <AlertTriangle size={13} aria-hidden="true" />
              Last sync failed: {c.jobsSyncError}
            </p>
          )}
        </article>
      ))}

      {companies?.length === 0 && (
        <div className="community-panel community-empty">
          <Building2 size={22} aria-hidden="true" />
          <p><strong>No companies yet.</strong></p>
          <p>Add the employers your members work at, and they can offer to help with referrals.</p>
        </div>
      )}
    </div>
  );
}
