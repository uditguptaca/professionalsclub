'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/app-context';
import { fetchReferralHome, saveWhereIWork, removeWhereIWork } from '@/app/actions/referrals';
import { myDirectReferrals } from '@/app/actions/chat';
import type { Company, CompanyInsider } from '@/types';
import type { MyDirectReferral } from '@/server/repos/chat';
import {
  Send, Building2, Check, X, Loader2, ShieldCheck, Mail, MessageCircle,
  ChevronRight, Plus, ArrowRight,
} from 'lucide-react';
import { useConfirm } from '@/components/portal/confirm';
import PortalLoading from '@/components/portal/PortalLoading';

/**
 * Referrals, overview only.
 *
 * The asks themselves live in chat now: a request opens a conversation with the
 * person you asked, and the referral card in it is where they answer. So this
 * page is two lists — what I asked for, and where I work — and the second one is
 * the consent switch that puts my name in front of job seekers.
 *
 * Profile-hub grammar throughout: glanceable rows in rounded cards, no tabs, no
 * page-long form except the two fields that add an employer.
 */

const when = (iso: string | null): string => {
  if (!iso) return '';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'yesterday' : `${d}d ago`;
};

/** Chip tones. Orange is the "waiting on someone" tint, green means settled. */
const TONES = {
  wait: { background: 'rgba(232, 93, 4, 0.09)', color: 'var(--primary-800)' },
  done: { background: 'var(--green-50)', color: 'var(--success-600)' },
  mute: { background: 'var(--bg-secondary)', color: 'var(--text-muted)' },
} as const;

const STATUS: Record<MyDirectReferral['status'], { label: string; tone: keyof typeof TONES }> = {
  pending:  { label: 'Waiting',  tone: 'wait' },
  accepted: { label: 'Accepted', tone: 'done' },
  declined: { label: 'Declined', tone: 'mute' },
};

/** Row sub-labels carry a company name and a timestamp; keep them one line. */
const ONE_LINE: React.CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };

const chip = (label: string, tone: keyof typeof TONES) => (
  <span className="pp-chip" style={{ ...TONES[tone], flexShrink: 0 }}>{label}</span>
);

const HEAD_LINK: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  minHeight: 44, fontSize: '0.85rem', fontWeight: 700,
  color: 'var(--text-accent)', textDecoration: 'none',
};

export default function ReferralsPage() {
  const { currentUserId } = useApp();
  const confirm = useConfirm();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [myRoles, setMyRoles] = useState<CompanyInsider[]>([]);
  const [requests, setRequests] = useState<MyDirectReferral[]>([]);

  // Where-I-work form
  const [addCompany, setAddCompany] = useState('');
  const [addTitle, setAddTitle] = useState('');
  const [addRefer, setAddRefer] = useState(true);
  const [addEmail, setAddEmail] = useState(true);

  const workRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!currentUserId) { setLoading(false); return; }
    (async () => {
      // Next runs a client's Server Action calls one at a time, so these are
      // sequential either way.
      const home = await fetchReferralHome();
      const mine = await myDirectReferrals();
      if (home.ok) { setCompanies(home.data.companies); setMyRoles(home.data.myRoles); }
      else setError(home.error);
      if (mine.ok) setRequests(mine.data);
      else if (home.ok) setError(mine.error);
      setLoading(false);
    })();
  }, [currentUserId]);

  // The profile hub deep-links here with ?tab=work. Tabs are gone, so honour it
  // by taking the member to that section instead.
  useEffect(() => {
    if (loading) return;
    if (new URLSearchParams(window.location.search).get('tab') !== 'work') return;
    workRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    workRef.current?.focus({ preventScroll: true });
  }, [loading]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const unlisted = useMemo(
    () => companies.filter((c) => !myRoles.some((r) => r.companyId === c.id)),
    [companies, myRoles]
  );

  const addRole = async () => {
    if (!addCompany || busy) return;
    setBusy('add');
    setError('');
    const r = await saveWhereIWork({
      companyId: addCompany,
      jobTitle: addTitle.trim() || undefined,
      canRefer: addRefer,
      notifyEmail: addEmail,
    });
    if (r.ok) {
      setMyRoles(r.data);
      setAddCompany(''); setAddTitle('');
      setToast('Employer added');
    } else setError(r.error);
    setBusy(null);
  };

  const updateRole = async (role: CompanyInsider, patch: Partial<CompanyInsider>) => {
    if (busy) return;
    setBusy(role.id);
    setError('');
    const r = await saveWhereIWork({
      companyId: role.companyId,
      jobTitle: (patch.jobTitle ?? role.jobTitle) || undefined,
      canRefer: patch.canRefer ?? role.canRefer,
      notifyEmail: patch.notifyEmail ?? role.notifyEmail,
    });
    if (r.ok) setMyRoles(r.data); else setError(r.error);
    setBusy(null);
  };

  const dropRole = async (role: CompanyInsider) => {
    if (busy) return;
    const ok = await confirm({
      title: `Remove ${role.companyName}?`,
      message: 'You will stop being listed as a referrer there, and stop receiving requests. You can add it back any time.',
      confirmLabel: 'Remove',
      tone: 'danger',
    });
    if (!ok) return;
    setBusy(role.id);
    setError('');
    const r = await removeWhereIWork(role.companyId);
    if (r.ok) { setMyRoles(r.data); setToast('Employer removed'); } else setError(r.error);
    setBusy(null);
  };

  /** A company badge that sits where a row icon would. */
  const logo = (text: string | null, name: string) => (
    <span className="pp-row-icon" aria-hidden="true" style={{ fontWeight: 800, fontSize: '0.95rem' }}>
      {text || name.charAt(0).toUpperCase()}
    </span>
  );

  /** Toggle row, matching the profile hub: static row + pill toggle. */
  const toggleRow = (
    icon: React.ReactNode,
    label: string,
    value: string,
    on: boolean,
    onLabel: string,
    offLabel: string,
    onToggle: () => void,
    ariaLabel: string,
    disabled = false,
  ) => (
    <div className="pp-row pp-row-static">
      <span className="pp-row-icon">{icon}</span>
      <span className="pp-row-body">
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
      <button
        type="button"
        className={`pp-toggle ${on ? 'is-on' : ''}`}
        onClick={onToggle}
        aria-pressed={on}
        aria-label={ariaLabel}
        disabled={disabled}
        style={disabled ? { opacity: 0.5 } : undefined}
      >
        <span className="pp-toggle-dot" aria-hidden="true" />
        {on ? onLabel : offLabel}
      </button>
    </div>
  );

  return (
    <div className="pp2">
      <header style={{ marginBottom: 16 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800,
          letterSpacing: '-0.02em', margin: '0 0 6px',
        }}>
          Referrals
        </h1>
        <p style={{ margin: 0, fontSize: '0.86rem', lineHeight: 1.6, color: 'var(--text-secondary)', maxWidth: '34rem' }}>
          Ask someone who already works at a company to refer you — by name, in a chat with them.
        </p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Link href="/portal/member/jobs" style={HEAD_LINK}>
            Browse employers <ArrowRight size={14} aria-hidden="true" />
          </Link>
          <Link href="/portal/member/chats" style={HEAD_LINK}>
            Chats <MessageCircle size={14} aria-hidden="true" />
          </Link>
        </div>
      </header>

      {error && (
        <p role="alert" className="community-error" style={{ marginBottom: 14 }}>{error}</p>
      )}

      {loading && <PortalLoading label="Loading your referrals" />}

      {!loading && (
        <div className="pp-groups">
          {/* ------------------------------------------------- requests I sent */}
          <section className="pp-group">
            <h2>Your requests</h2>
            {requests.length === 0 ? (
              <div
                className="pp-group-card"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                  padding: '2.2rem 1.25rem', textAlign: 'center',
                }}
              >
                <Send size={28} aria-hidden="true" style={{ opacity: 0.35 }} />
                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-secondary)', maxWidth: '24rem' }}>
                  You have not asked anyone for a referral yet. Pick an employer, choose the roles
                  you are going for, then choose who to ask.
                </p>
                <Link
                  href="/portal/member/jobs"
                  className="btn btn-primary"
                  style={{ minHeight: 48, borderRadius: 999 }}
                >
                  Browse employers
                </Link>
              </div>
            ) : (
              <>
                <p className="pp-group-sub">Tap a request to open the chat where it lives.</p>
                <div className="pp-group-card">
                  {requests.map((r) => {
                    const status = STATUS[r.status] ?? STATUS.pending;
                    const name = `${r.insiderFirstName} ${r.insiderLastName}`.trim();
                    const body = (
                      <>
                        {logo(
                          `${r.insiderFirstName.charAt(0)}${r.insiderLastName.charAt(0)}`.toUpperCase(),
                          name,
                        )}
                        <span className="pp-row-body">
                          <small style={ONE_LINE}>{r.companyName} · {when(r.createdAt)}</small>
                          <strong>{name}</strong>
                        </span>
                        {chip(status.label, status.tone)}
                      </>
                    );
                    return r.conversationId ? (
                      <Link
                        key={r.id}
                        className="pp-row"
                        href={`/portal/member/chats?c=${r.conversationId}`}
                        aria-label={`Open chat with ${name} about ${r.companyName}`}
                      >
                        {body}
                        <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
                      </Link>
                    ) : (
                      <div key={r.id} className="pp-row pp-row-static">{body}</div>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          {/* ----------------------------------------------------- where I work */}
          <section className="pp-group" id="where-i-work" ref={workRef} tabIndex={-1}>
            <h2>Where I work</h2>
            <p className="pp-group-sub">
              Turning referrals on lists you by name to members looking at that employer&apos;s jobs.
              Turn it off and you appear nowhere.
            </p>

            {myRoles.length === 0 ? (
              <div
                className="pp-group-card"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                  padding: '2.2rem 1.25rem', textAlign: 'center',
                }}
              >
                <Building2 size={28} aria-hidden="true" style={{ opacity: 0.35 }} />
                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-secondary)', maxWidth: '24rem' }}>
                  No employers yet. Add the company you work at below and choose whether you are
                  open to referring.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {myRoles.map((role) => (
                  <div key={role.id} className="pp-group-card">
                    <div className="pp-row pp-row-static">
                      {logo(role.companyLogo, role.companyName)}
                      <span className="pp-row-body">
                        <small style={ONE_LINE}>
                          {role.jobTitle || 'Employer'}{role.verifiedByAdmin ? ' · verified' : ''}
                        </small>
                        <strong>{role.companyName}</strong>
                      </span>
                      <button
                        type="button"
                        className={`pp-toggle ${role.canRefer ? 'is-on' : ''}`}
                        onClick={() => updateRole(role, { canRefer: !role.canRefer })}
                        aria-pressed={role.canRefer}
                        aria-label={`${role.canRefer ? 'Stop' : 'Start'} referring at ${role.companyName}`}
                        disabled={busy !== null}
                        style={busy !== null ? { opacity: 0.5 } : undefined}
                      >
                        <span className="pp-toggle-dot" aria-hidden="true" />
                        {role.canRefer ? 'Referring' : 'Paused'}
                      </button>
                      <button
                        type="button"
                        className="pp-row-x"
                        onClick={() => dropRole(role)}
                        aria-label={`Remove ${role.companyName}`}
                        disabled={busy !== null}
                      >
                        {busy === role.id
                          ? <Loader2 size={15} className="spin" aria-hidden="true" />
                          : <X size={15} aria-hidden="true" />}
                      </button>
                    </div>
                    <p style={{
                      margin: 0, padding: '0.6rem 0.9rem',
                      borderBottom: '1px solid rgba(27, 67, 50, 0.06)',
                      fontSize: '0.78rem', lineHeight: 1.5, color: 'var(--text-muted)',
                    }}>
                      Turning referrals on lists you by name to members looking at{' '}
                      {role.companyName}&apos;s jobs.
                    </p>
                    {toggleRow(
                      <Mail size={17} />,
                      role.canRefer ? 'Notifications' : 'Paused, nobody can ask you',
                      'Email me about requests',
                      role.notifyEmail,
                      'On', 'Off',
                      () => updateRole(role, { notifyEmail: !role.notifyEmail }),
                      `${role.notifyEmail ? 'Stop' : 'Start'} emailing me about requests at ${role.companyName}`,
                      busy !== null || !role.canRefer,
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ------------------------------------------------- add an employer */}
          <section className="pp-group">
            <h2>Add an employer</h2>
            {unlisted.length === 0 ? (
              <div className="pp-group-card" style={{ padding: '1.1rem' }}>
                <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                  {companies.length === 0
                    ? 'No employers are listed yet. An admin adds them.'
                    : 'You have added every listed employer. Ask an admin to add yours if it is missing.'}
                </p>
              </div>
            ) : (
              <div className="pp-group-card">
                <div className="pp-sheet-fields" style={{ margin: 0, padding: '1.1rem 1.1rem 0.9rem' }}>
                  <div className="pp-field">
                    <label htmlFor="ref-company">Company</label>
                    <div className="pp-select">
                      <select
                        id="ref-company"
                        value={addCompany}
                        onChange={(e) => setAddCompany(e.target.value)}
                      >
                        <option value="">Choose your employer</option>
                        {unlisted.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <ChevronRight size={14} aria-hidden="true" className="pp-select-chevron" />
                    </div>
                  </div>
                  <div className="pp-field">
                    <label htmlFor="ref-title">Your job title (optional)</label>
                    <input
                      id="ref-title"
                      value={addTitle}
                      onChange={(e) => setAddTitle(e.target.value)}
                      placeholder="e.g. Staff Engineer"
                      maxLength={120}
                    />
                  </div>
                </div>

                {toggleRow(
                  <ShieldCheck size={17} />,
                  'Referrals',
                  'Open to referring',
                  addRefer,
                  'Yes', 'No',
                  () => setAddRefer(!addRefer),
                  'Open to referring people applying here',
                )}
                <p style={{
                  margin: 0, padding: '0.6rem 0.9rem',
                  borderBottom: '1px solid rgba(27, 67, 50, 0.06)',
                  fontSize: '0.78rem', lineHeight: 1.5, color: 'var(--text-muted)',
                }}>
                  Turning referrals on lists you by name to members looking at that company&apos;s jobs.
                </p>
                {toggleRow(
                  <Mail size={17} />,
                  'Notifications',
                  'Email me about requests',
                  addEmail,
                  'On', 'Off',
                  () => setAddEmail(!addEmail),
                  'Email me when someone asks',
                )}

                <div style={{ padding: '0.9rem 1.1rem 1.1rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: '100%', minHeight: 48, borderRadius: 999 }}
                    disabled={!addCompany || busy !== null}
                    onClick={addRole}
                  >
                    {busy === 'add'
                      ? <Loader2 size={15} className="spin" aria-hidden="true" />
                      : <Plus size={15} aria-hidden="true" />}
                    Add company
                  </button>
                </div>
              </div>
            )}
          </section>
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
