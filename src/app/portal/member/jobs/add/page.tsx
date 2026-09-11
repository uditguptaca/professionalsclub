'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/app-context';
import {
  fetchCompanies, curatorAddEmployer, curatorAddRole,
} from '@/app/actions/referrals';
import type { Company, CompanyJob } from '@/types';
import {
  AlertCircle, ArrowRight, Building2, Check, ChevronRight, Loader2, Star,
} from 'lucide-react';

/**
 * Adding an employer or a role, for admins and approved volunteers (0044).
 *
 * Volunteers do the legwork of finding employers who actually hire newcomers,
 * so they get the same two abilities an admin has here. The limits are in the
 * database, not in this screen: a volunteer's employer is pinned to a plain
 * link (never a feed the nightly sync would fetch), their role is pinned to
 * `manual` so the sync cannot close it, both are stamped with their id, and
 * they can only edit what they added. This page would be safe to hand to a
 * member; it is hidden from them because it would be useless, not because
 * hiding it is the protection.
 *
 * Two short forms rather than one long one. Most of the time the employer is
 * already listed and the whole job is four fields.
 */

const TITLE: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 'clamp(1.4rem, 5vw, 1.75rem)',
  fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 0.4rem',
};

const SUB: React.CSSProperties = {
  margin: 0, fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--text-secondary)',
};

const SEG_WRAP: React.CSSProperties = {
  display: 'flex', gap: 4, padding: 4, margin: '14px 0 12px',
  background: 'var(--bg-primary)', borderRadius: 999,
  border: '1px solid rgba(27, 67, 50, 0.08)',
  width: 'fit-content', maxWidth: '100%',
};

const seg = (active: boolean): React.CSSProperties => ({
  minHeight: 44, padding: '0 16px', border: 0, borderRadius: 999,
  font: 'inherit', fontSize: '0.85rem', whiteSpace: 'nowrap', cursor: 'pointer',
  ...(active
    ? { background: 'var(--green-950)', color: '#fff', fontWeight: 700 }
    : { background: 'none', color: 'var(--text-secondary)', fontWeight: 600 }),
});

const CARD: React.CSSProperties = {
  display: 'grid', gap: 12, padding: '1rem',
  border: '1px solid rgba(27, 67, 50, 0.08)', borderRadius: 'var(--radius-lg)',
  background: 'var(--bg-primary)',
};

const HINT: React.CSSProperties = {
  margin: '0.35rem 0 0 0.2rem', fontSize: '0.76rem', lineHeight: 1.5,
  color: 'var(--text-muted)',
};

export default function AddJobPage() {
  const { profile, currentUserId } = useApp();
  const canCurate = profile?.role === 'admin' || Boolean(profile?.isVolunteer);

  const [tab, setTab] = useState<'role' | 'employer'>('role');
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [added, setAdded] = useState<{ job: CompanyJob; companyName: string } | null>(null);
  const [note, setNote] = useState('');

  // Role
  const [companyId, setCompanyId] = useState('');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [applyUrl, setApplyUrl] = useState('');
  const [featured, setFeatured] = useState(false);

  // Employer
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [industry, setIndustry] = useState('');
  const [careersUrl, setCareersUrl] = useState('');
  const [website, setWebsite] = useState('');

  useEffect(() => {
    if (!currentUserId || !canCurate) return;
    fetchCompanies().then((r) => {
      if (r.ok) setCompanies(r.data);
      else setError(r.error);
    });
  }, [currentUserId, canCurate]);

  const industries = useMemo(
    () => [...new Set((companies ?? []).map((c) => c.industry?.trim()).filter(Boolean))].sort() as string[],
    [companies]
  );

  if (!canCurate) {
    return (
      <div style={{ maxWidth: '40rem' }}>
        <h1 style={TITLE}>Add a job</h1>
        <p style={SUB}>
          Admins and approved volunteers add employers and roles to the board.
        </p>
        <Link href="/portal/member/jobs" className="btn btn-outline" style={{ marginTop: 14 }}>
          Back to jobs
        </Link>
      </div>
    );
  }

  async function submitRole(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setNote(''); setBusy(true);
    const res = await curatorAddRole({
      companyId, title, location, applyUrl, isFeatured: featured,
    });
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    const companyName = companies?.find((c) => c.id === companyId)?.name ?? 'the employer';
    setAdded({ job: res.data, companyName });
    setTitle(''); setLocation(''); setApplyUrl(''); setFeatured(false);
  }

  async function submitEmployer(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setNote(''); setBusy(true);
    const res = await curatorAddEmployer({ name, city, industry, careersUrl, website });
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    // Straight on to the role: an employer with no roles shows a member nothing.
    setCompanies((prev) => [...(prev ?? []), res.data].sort((a, b) => a.name.localeCompare(b.name)));
    setCompanyId(res.data.id);
    setNote(`${res.data.name} is on the board. Now add a role with them.`);
    setName(''); setCity(''); setIndustry(''); setCareersUrl(''); setWebsite('');
    setTab('role');
  }

  return (
    <div style={{ maxWidth: '40rem' }}>
      <header>
        <h1 style={TITLE}>Add a job</h1>
        <p style={SUB}>
          What you add here shows on the jobs board for every member. Mark a role
          as featured and it is put in front of the members it actually suits.
        </p>
      </header>

      <div style={SEG_WRAP} role="group" aria-label="What to add">
        <button type="button" style={seg(tab === 'role')} aria-pressed={tab === 'role'} onClick={() => setTab('role')}>
          A role
        </button>
        <button type="button" style={seg(tab === 'employer')} aria-pressed={tab === 'employer'} onClick={() => setTab('employer')}>
          An employer
        </button>
      </div>

      {error && (
        <div role="alert" className="community-error" style={{ marginBottom: 12 }}>
          <AlertCircle size={15} aria-hidden="true" /> {error}
        </div>
      )}

      {note && (
        <p style={{
          display: 'flex', alignItems: 'center', gap: 7, margin: '0 0 12px',
          padding: '0.6rem 0.85rem', borderRadius: '0.85rem',
          background: 'var(--green-50)', color: 'var(--green-800)',
          fontSize: '0.84rem', fontWeight: 700, lineHeight: 1.4,
        }}>
          <Check size={15} aria-hidden="true" style={{ flexShrink: 0 }} /> {note}
        </p>
      )}

      {added && (
        <div className="pp-group-card" style={{ marginBottom: 12 }}>
          <Link href={`/portal/member/jobs/${added.job.id}`} className="pp-row" style={{ textDecoration: 'none' }}>
            <span className="pp-row-icon" aria-hidden="true"><Check size={17} /></span>
            <span className="pp-row-body">
              <strong>{added.job.title} is live</strong>
              <small>At {added.companyName}. Open it the way a member will.</small>
            </span>
            <ChevronRight size={16} aria-hidden="true" style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
          </Link>
        </div>
      )}

      {tab === 'role' ? (
        <form style={CARD} onSubmit={submitRole}>
          <div className="pp-field">
            <label htmlFor="cj-company">Employer</label>
            <div className="pp-select">
              <select
                id="cj-company"
                value={companyId}
                required
                onChange={(e) => setCompanyId(e.target.value)}
              >
                <option value="">{companies === null ? 'Loading employers…' : 'Choose an employer'}</option>
                {(companies ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronRight size={14} aria-hidden="true" className="pp-select-chevron" />
            </div>
            <p style={HINT}>
              Not listed?{' '}
              <button
                type="button"
                onClick={() => setTab('employer')}
                style={{
                  border: 0, background: 'none', padding: 0, font: 'inherit',
                  fontWeight: 750, color: 'var(--text-accent)', cursor: 'pointer',
                }}
              >
                Add the employer first
              </button>
              .
            </p>
          </div>

          <div className="pp-field">
            <label htmlFor="cj-title">Role title</label>
            <input
              id="cj-title" value={title} required maxLength={160}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Bilingual Customer Service Representative"
            />
            <p style={HINT}>
              Write it the way the employer does. The board reads the title to
              work out the level and the field, so &quot;Senior&quot; or
              &quot;Part time&quot; in the title does real work.
            </p>
          </div>

          <div className="pp-field">
            <label htmlFor="cj-location">Location</label>
            <input
              id="cj-location" value={location} maxLength={120}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Mississauga, ON — or Remote"
            />
          </div>

          <div className="pp-field">
            <label htmlFor="cj-url">Where to apply</label>
            <input
              id="cj-url" type="url" value={applyUrl} required
              onChange={(e) => setApplyUrl(e.target.value)}
              placeholder="https://…"
            />
            <p style={HINT}>The exact posting, not the careers homepage.</p>
          </div>

          <div>
            <button
              type="button"
              className={`pp-toggle ${featured ? 'is-on' : ''}`}
              aria-pressed={featured}
              onClick={() => setFeatured((v) => !v)}
              style={{ minHeight: 44, paddingRight: '0.85rem' }}
            >
              <span className="pp-toggle-dot" aria-hidden="true" />
              <Star size={14} aria-hidden="true" /> Feature this role
            </button>
            <p style={HINT}>
              Featured roles rank ahead of the feed for members whose background
              fits them. It is a boost, not a broadcast: a member in another
              field still will not be shown it.
            </p>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy || !companyId}
            style={{ minHeight: 48, justifyContent: 'center', gap: 8 }}
          >
            {busy ? <Loader2 size={16} className="spin" aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
            {busy ? 'Adding…' : 'Add this role'}
          </button>
        </form>
      ) : (
        <form style={CARD} onSubmit={submitEmployer}>
          <div className="pp-field">
            <label htmlFor="ce-name">Employer name</label>
            <input
              id="ce-name" value={name} required maxLength={120}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Peel Regional Health"
            />
          </div>

          <div className="pp-field">
            <label htmlFor="ce-city">City</label>
            <input
              id="ce-city" value={city} maxLength={80}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Brampton"
            />
          </div>

          <div className="pp-field">
            <label htmlFor="ce-industry">Industry</label>
            <input
              id="ce-industry" list="ce-industries" value={industry} maxLength={80}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. Healthcare"
            />
            <datalist id="ce-industries">
              {industries.map((i) => <option key={i} value={i} />)}
            </datalist>
          </div>

          <div className="pp-field">
            <label htmlFor="ce-careers">Careers page</label>
            <input
              id="ce-careers" type="url" value={careersUrl}
              onChange={(e) => setCareersUrl(e.target.value)}
              placeholder="https://…"
            />
            <p style={HINT}>
              Shown to members when a role of theirs closes, so they can look for
              the next one themselves.
            </p>
          </div>

          <div className="pp-field">
            <label htmlFor="ce-website">Website</label>
            <input
              id="ce-website" type="url" value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://…"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy}
            style={{ minHeight: 48, justifyContent: 'center', gap: 8 }}
          >
            {busy ? <Loader2 size={16} className="spin" aria-hidden="true" /> : <Building2 size={16} aria-hidden="true" />}
            {busy ? 'Adding…' : 'Add this employer'}
          </button>
        </form>
      )}

      <p style={{ ...HINT, marginTop: 14 }}>
        Roles you add stay up until you close them. The nightly feed sync never
        touches them.
      </p>
    </div>
  );
}
