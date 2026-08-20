'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/app-context';
import {
  fetchReferralHome, respondToReferralRequest, withdrawReferral,
  saveWhereIWork, removeWhereIWork,
} from '@/app/actions/referrals';
import type {
  Company, CompanyInsider, MyReferralRequest, ReferralInboxItem, ReferralJobRef,
} from '@/types';
import {
  Inbox, Send, Building2, Check, X, Loader2, ShieldCheck, Mail, Phone, Link2,
  FileText, ExternalLink, Trash2, Plus, HelpCircle, EyeOff, ChevronRight, Briefcase,
} from 'lucide-react';
import { useConfirm } from '@/components/portal/confirm';
import PortalLoading from '@/components/portal/PortalLoading';

/**
 * Both sides of a referral, plus the opt-in that makes someone an insider.
 *
 * I can help        the anonymous asks waiting on me
 * Requests I sent   what I asked for, how many were asked, and who said yes
 * Where I work      my employers, and whether I am open to helping
 *
 * Second pass, in the profile-hub language: the page is a glanceable list of
 * rows, and everything with detail or a decision in it (an ask, a request I
 * sent) opens in a focused bottom sheet. Nothing on the page is a form except
 * the two fields that add an employer.
 *
 * The anonymity is not implemented here. The server sends null for a seeker's
 * name until this member has accepted, so there is nothing to hide in the
 * markup: if it renders, it was revealed.
 */

type Tab = 'inbox' | 'sent' | 'work';

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

/** Row sub-labels carry a company name and a timestamp; keep them one line. */
const ONE_LINE: React.CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };

const chip = (label: string, tone: keyof typeof TONES, icon?: React.ReactNode) => (
  <span className="pp-chip" style={{ ...TONES[tone], flexShrink: 0 }}>{icon}{label}</span>
);

/** What a sent request's status should say to the person who sent it. */
const SENT_STATUS: Record<string, { label: string; tone: keyof typeof TONES }> = {
  open: { label: 'Waiting', tone: 'wait' },
  matched: { label: 'Someone can help', tone: 'done' },
  closed: { label: 'Closed', tone: 'mute' },
  withdrawn: { label: 'Withdrawn', tone: 'mute' },
};

export default function ReferralsPage() {
  const { currentUserId } = useApp();
  const confirm = useConfirm();

  const [tab, setTab] = useState<Tab>('inbox');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [companies, setCompanies] = useState<Company[]>([]);
  const [myRoles, setMyRoles] = useState<CompanyInsider[]>([]);
  const [requests, setRequests] = useState<MyReferralRequest[]>([]);
  const [inbox, setInbox] = useState<ReferralInboxItem[]>([]);

  const [busy, setBusy] = useState<string | null>(null);

  // Open sheets are held by id, not by object, so the sheet re-reads the list
  // it came from after a save instead of showing a stale copy.
  const [openAsk, setOpenAsk] = useState<string | null>(null);
  const [openReq, setOpenReq] = useState<string | null>(null);

  // Where-I-work form
  const [addCompany, setAddCompany] = useState('');
  const [addTitle, setAddTitle] = useState('');
  const [addRefer, setAddRefer] = useState(true);
  const [addEmail, setAddEmail] = useState(true);

  useEffect(() => {
    if (!currentUserId) { setLoading(false); return; }
    fetchReferralHome().then((r) => {
      if (r.ok) {
        setCompanies(r.data.companies);
        setMyRoles(r.data.myRoles);
        setRequests(r.data.myRequests);
        setInbox(r.data.inbox);
        // An explicit ?tab= wins (the profile hub deep-links to Where I
        // work); otherwise land on whichever tab has something waiting.
        const asked = new URLSearchParams(window.location.search).get('tab');
        if (asked === 'work' || asked === 'inbox' || asked === 'sent') setTab(asked);
        else if (r.data.inbox.some((i) => i.myStatus === 'pending')) setTab('inbox');
        else if (r.data.myRequests.length) setTab('sent');
        else if (!r.data.myRoles.length) setTab('work');
      } else {
        setError(r.error);
      }
      setLoading(false);
    });
  }, [currentUserId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const ask = useMemo(() => inbox.find((i) => i.recipientId === openAsk) ?? null, [inbox, openAsk]);
  const req = useMemo(() => requests.find((r) => r.id === openReq) ?? null, [requests, openReq]);
  const sheetOpen = Boolean(ask || req);

  // An open sheet locks background scroll and closes on Escape, same as the
  // profile hub and the city switcher.
  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpenAsk(null); setOpenReq(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [sheetOpen]);

  const closeSheets = () => { setOpenAsk(null); setOpenReq(null); };

  const pending = useMemo(() => inbox.filter((i) => i.myStatus === 'pending'), [inbox]);
  const answered = useMemo(() => inbox.filter((i) => i.myStatus !== 'pending'), [inbox]);
  const unlisted = useMemo(
    () => companies.filter((c) => !myRoles.some((r) => r.companyId === c.id)),
    [companies, myRoles]
  );

  const respond = async (requestId: string, accept: boolean) => {
    if (busy) return;
    setBusy(requestId);
    setError('');
    const r = await respondToReferralRequest(requestId, accept);
    if (r.ok) {
      setInbox(r.data);
      setToast(accept ? 'They can reach you now' : 'Passed on this one');
      // Saying yes reveals their details in the same sheet; saying no is done.
      if (!accept) closeSheets();
    } else setError(r.error);
    setBusy(null);
  };

  const withdraw = async (requestId: string) => {
    if (busy) return;
    const ok = await confirm({
      title: 'Withdraw this request?',
      message: 'Anyone who has not answered yet stops seeing it. People who already offered to help keep your details.',
      confirmLabel: 'Withdraw',
    });
    if (!ok) return;
    setBusy(requestId);
    setError('');
    const r = await withdrawReferral(requestId);
    if (r.ok) { setRequests(r.data); setToast('Request withdrawn'); closeSheets(); }
    else setError(r.error);
    setBusy(null);
  };

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
      message: 'You will stop receiving referral requests for this employer. You can add it back any time.',
      confirmLabel: 'Remove',
      tone: 'danger',
    });
    if (!ok) return;
    setBusy(role.id);
    const r = await removeWhereIWork(role.companyId);
    if (r.ok) { setMyRoles(r.data); setToast('Employer removed'); } else setError(r.error);
    setBusy(null);
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'inbox', label: 'I can help', count: pending.length },
    { id: 'sent', label: 'Requests I sent', count: requests.length },
    { id: 'work', label: 'Where I work', count: myRoles.length },
  ];

  /** A company badge that sits where a row icon would. */
  const logo = (text: string | null, name: string) => (
    <span className="pp-row-icon" aria-hidden="true" style={{ fontWeight: 800, fontSize: '0.95rem' }}>
      {text || name.charAt(0).toUpperCase()}
    </span>
  );

  /** The roles a request covers, as rows inside a card. Postings are public. */
  const jobRows = (jobs: ReferralJobRef[]) => (
    <div className="pp-group-card">
      {jobs.map((j) => (
        <a
          key={j.id}
          className="pp-row"
          href={j.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="pp-row-icon"><Briefcase size={17} /></span>
          <span className="pp-row-body">
            <small>{[j.location, j.isOpen ? null : 'no longer listed'].filter(Boolean).join(' · ') || 'Open role'}</small>
            <strong>{j.title}</strong>
          </span>
          <ExternalLink size={15} aria-hidden="true" className="pp-row-go" />
        </a>
      ))}
    </div>
  );

  const emptyState = (icon: React.ReactNode, line: string, cta: React.ReactNode) => (
    <div
      className="pp-group-card"
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        padding: '2.2rem 1.25rem', textAlign: 'center',
      }}
    >
      {icon}
      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '24rem' }}>{line}</p>
      {cta}
    </div>
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
        <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)', maxWidth: '34rem' }}>
          A member already inside a company can get an application looked at. Both sides stay
          anonymous until someone agrees to help.
        </p>
        <Link
          href="/portal/member/jobs"
          className="btn btn-quiet"
          style={{ display: 'inline-flex', minHeight: 44, marginTop: 2 }}
        >
          Browse jobs by company
        </Link>
      </header>

      <div
        role="tablist"
        aria-label="Referrals"
        style={{
          display: 'flex', gap: 4, padding: 4, marginBottom: 18,
          background: 'var(--bg-primary)', borderRadius: 999,
          border: '1px solid rgba(27,67,50,0.08)',
          width: 'fit-content', maxWidth: '100%', overflowX: 'auto',
        }}
      >
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                minHeight: 44, padding: '0 16px', border: 0, borderRadius: 999,
                font: 'inherit', fontSize: '0.85rem', whiteSpace: 'nowrap', cursor: 'pointer',
                ...(active
                  ? { background: 'var(--green-950)', color: '#fff', fontWeight: 700 }
                  : { background: 'none', color: 'var(--text-secondary)', fontWeight: 600 }),
              }}
            >
              {t.label}
              {t.count > 0 && (
                <span style={{
                  padding: '0 6px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 800,
                  ...(active
                    ? { background: 'rgba(255,255,255,0.18)', color: '#fff' }
                    : { background: 'var(--bg-secondary)', color: 'var(--text-muted)' }),
                }}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && !sheetOpen && (
        <p role="alert" className="community-error" style={{ marginBottom: 14 }}>{error}</p>
      )}

      {loading && <PortalLoading label="Loading your referrals" />}

      {/* ------------------------------------------------------------ inbox */}
      {!loading && tab === 'inbox' && (
        <div className="pp-groups">
          {inbox.length === 0 && emptyState(
            <Inbox size={28} aria-hidden="true" style={{ opacity: 0.35 }} />,
            'Nothing is waiting on you. Add the company you work at and say you are open to helping, and asks will land here.',
            <button
              type="button"
              className="btn btn-primary"
              style={{ minHeight: 48, borderRadius: 999 }}
              onClick={() => setTab('work')}
            >
              Add where I work
            </button>,
          )}

          {pending.length > 0 && (
            <section className="pp-group">
              <h2>Waiting on you</h2>
              <p className="pp-group-sub">
                You will see who is asking only if you agree to help. Saying no tells them nothing.
              </p>
              <div className="pp-group-card">
                {pending.map((item) => (
                  <button
                    key={item.recipientId}
                    type="button"
                    className="pp-row"
                    onClick={() => { setOpenReq(null); setOpenAsk(item.recipientId); }}
                  >
                    {logo(item.companyLogo, item.companyName)}
                    <span className="pp-row-body">
                      <small style={ONE_LINE}>{item.companyName} · {when(item.createdAt)}</small>
                      <strong>{item.headline}</strong>
                    </span>
                    {chip('Anonymous', 'wait', <EyeOff size={11} aria-hidden="true" />)}
                    <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {answered.length > 0 && (
            <section className="pp-group">
              <h2>Already answered</h2>
              <div className="pp-group-card">
                {answered.map((item) => (
                  <button
                    key={item.recipientId}
                    type="button"
                    className="pp-row"
                    onClick={() => { setOpenReq(null); setOpenAsk(item.recipientId); }}
                  >
                    {logo(item.companyLogo, item.companyName)}
                    <span className="pp-row-body">
                      <small style={ONE_LINE}>{item.companyName} · {when(item.respondedAt)}</small>
                      <strong>{item.seekerName ?? item.headline}</strong>
                    </span>
                    {item.myStatus === 'accepted'
                      ? chip('You helped', 'done')
                      : chip('Passed', 'mute')}
                    <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- sent */}
      {!loading && tab === 'sent' && (
        <div className="pp-groups">
          {requests.length === 0 && emptyState(
            <Send size={28} aria-hidden="true" style={{ opacity: 0.35 }} />,
            'You have not asked for a referral yet. Pick an employer, choose the roles you are going for, and we will pass it on.',
            <Link
              href="/portal/member/jobs"
              className="btn btn-primary"
              style={{ minHeight: 48, borderRadius: 999 }}
            >
              Browse jobs by company
            </Link>,
          )}

          {requests.length > 0 && (
            <section className="pp-group">
              <h2>Requests I sent</h2>
              <p className="pp-group-sub">
                Tap a request to see the roles, who offered to help, and how to reach them.
              </p>
              <div className="pp-group-card">
                {requests.map((r) => {
                  const status = SENT_STATUS[r.status] ?? SENT_STATUS.open;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      className="pp-row"
                      onClick={() => { setOpenAsk(null); setOpenReq(r.id); }}
                    >
                      {logo(r.companyLogo, r.companyName)}
                      <span className="pp-row-body">
                        <small style={ONE_LINE}>
                          {r.notifiedCount === 0
                            ? 'nobody inside yet'
                            : `${r.notifiedCount} ${r.notifiedCount === 1 ? 'member' : 'members'} asked`}
                          {' · '}{when(r.createdAt)}
                        </small>
                        <strong>{r.companyName}</strong>
                      </span>
                      {chip(status.label, status.tone)}
                      <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- work */}
      {!loading && tab === 'work' && (
        <div className="pp-groups">
          <section className="pp-group">
            <h2>Where I work</h2>
            <p className="pp-group-sub">
              Other people only ever see a count, something like “3 members here can help”, never
              who. Your name reaches a job seeker only when you open a request and say you can help.
            </p>

            {myRoles.length === 0 ? (
              emptyState(
                <Building2 size={28} aria-hidden="true" style={{ opacity: 0.35 }} />,
                'No employers yet. Add the company you work at below and choose whether you are open to helping.',
                null,
              )
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {myRoles.map((role) => (
                  <div key={role.id} className="pp-group-card">
                    <div className="pp-row pp-row-static">
                      {logo(role.companyLogo, role.companyName)}
                      <span className="pp-row-body">
                        <small style={ONE_LINE}>{role.jobTitle || 'Employer'}{role.verifiedByAdmin ? ' · verified' : ''}</small>
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
                    {toggleRow(
                      <Mail size={17} />,
                      role.canRefer ? 'Notifications' : 'Paused, nobody is sent to you',
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

          <section className="pp-group">
            <h2>Add an employer</h2>
            {unlisted.length === 0 ? (
              <div className="pp-group-card" style={{ padding: '1.1rem 1.1rem' }}>
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
                  'Open to helping',
                  addRefer,
                  'Yes', 'No',
                  () => setAddRefer(!addRefer),
                  'Open to helping people applying here',
                )}
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

      {/* -------------------------------------------------- ask detail sheet */}
      {ask && (
        <div className="hf-sheet-scrim" onClick={(e) => { if (e.target === e.currentTarget) closeSheets(); }}>
          <div className="hf-sheet pp-sheet" role="dialog" aria-modal="true" aria-label={`Referral request at ${ask.companyName}`}>
            <div className="hf-sheet-head">
              <h2>{ask.companyName}</h2>
              <button type="button" className="portal-sheet-close" onClick={closeSheets} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <p className="hf-sheet-sub">
              {ask.myStatus === 'pending'
                ? `${ask.headline} · ${when(ask.createdAt)}`
                : ask.myStatus === 'accepted'
                  ? `${ask.seekerName ?? ask.headline} · you offered to help ${when(ask.respondedAt)}`
                  : `${ask.headline} · you passed ${when(ask.respondedAt)}`}
            </p>

            {ask.myStatus === 'accepted' && (
              <div className="pp-group-card" style={{ marginBottom: 12 }}>
                {ask.seekerEmail && (
                  <a className="pp-row" href={`mailto:${ask.seekerEmail}`}>
                    <span className="pp-row-icon"><Mail size={17} /></span>
                    <span className="pp-row-body"><small>Email</small><strong>{ask.seekerEmail}</strong></span>
                    <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
                  </a>
                )}
                {ask.seekerPhone && (
                  <a className="pp-row" href={`tel:${ask.seekerPhone}`}>
                    <span className="pp-row-icon"><Phone size={17} /></span>
                    <span className="pp-row-body"><small>Phone</small><strong>{ask.seekerPhone}</strong></span>
                    <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
                  </a>
                )}
                {ask.seekerLinkedin && (
                  <a className="pp-row" href={ask.seekerLinkedin} target="_blank" rel="noopener noreferrer">
                    <span className="pp-row-icon"><Link2 size={17} /></span>
                    <span className="pp-row-body"><small>Profile</small><strong>LinkedIn</strong></span>
                    <ExternalLink size={15} aria-hidden="true" className="pp-row-go" />
                  </a>
                )}
                {ask.resumeUrl && (
                  <a className="pp-row" href={ask.resumeUrl} target="_blank" rel="noopener noreferrer">
                    <span className="pp-row-icon"><FileText size={17} /></span>
                    <span className="pp-row-body"><small>Attachment</small><strong>Resume</strong></span>
                    <ExternalLink size={15} aria-hidden="true" className="pp-row-go" />
                  </a>
                )}
              </div>
            )}

            <p className="pp-group-sub" style={{ margin: '0 0 6px', paddingLeft: 0 }}>
              {ask.jobs.length === 1 ? 'The role' : 'The roles'}
            </p>
            {jobRows(ask.jobs)}

            {ask.note && (
              <p style={{
                margin: '12px 0 0', padding: '0.85rem 1rem', borderRadius: '0.85rem',
                background: 'var(--bg-secondary)', fontSize: '0.88rem', color: 'var(--text-secondary)',
              }}>
                “{ask.note}”
              </p>
            )}

            {error && (
              <p role="alert" className="community-error" style={{ marginTop: 12 }}>{error}</p>
            )}

            {ask.myStatus === 'pending' ? (
              <>
                <p style={{ margin: '14px 0 10px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Saying yes shares your name and email with them, and shows you theirs. Saying no
                  tells them nothing at all.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ flex: 1, minHeight: 48, borderRadius: 999 }}
                    disabled={busy !== null}
                    onClick={() => respond(ask.requestId, false)}
                  >
                    {busy === ask.requestId
                      ? <Loader2 size={14} className="spin" aria-hidden="true" />
                      : <X size={14} aria-hidden="true" />}
                    Not me
                  </button>
                  <button
                    type="button"
                    className="pp-sheet-save"
                    style={{ flex: 1 }}
                    disabled={busy !== null}
                    onClick={() => respond(ask.requestId, true)}
                  >
                    <Check size={16} aria-hidden="true" /> I can help
                  </button>
                </div>
              </>
            ) : (
              <p style={{ margin: '14px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {ask.myStatus === 'accepted'
                  ? 'They have your name and email, and you have theirs.'
                  : 'You passed on this one. They were told nothing about you.'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------- sent detail sheet */}
      {req && (
        <div className="hf-sheet-scrim" onClick={(e) => { if (e.target === e.currentTarget) closeSheets(); }}>
          <div className="hf-sheet pp-sheet" role="dialog" aria-modal="true" aria-label={`My referral request at ${req.companyName}`}>
            <div className="hf-sheet-head">
              <h2>{req.companyName}</h2>
              <button type="button" className="portal-sheet-close" onClick={closeSheets} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <p className="hf-sheet-sub">
              {req.notifiedCount === 0
                ? 'nobody inside yet'
                : `${req.notifiedCount} ${req.notifiedCount === 1 ? 'member' : 'members'} asked`}
              {' · '}{when(req.createdAt)}
            </p>

            <div style={{ marginBottom: 12 }}>
              {chip((SENT_STATUS[req.status] ?? SENT_STATUS.open).label, (SENT_STATUS[req.status] ?? SENT_STATUS.open).tone)}
            </div>

            <p className="pp-group-sub" style={{ margin: '0 0 6px', paddingLeft: 0 }}>
              {req.jobs.length === 1 ? 'The role' : 'The roles'}
            </p>
            {jobRows(req.jobs)}

            {req.helpers.length > 0 ? (
              <>
                <p className="pp-group-sub" style={{ margin: '14px 0 6px', paddingLeft: 0 }}>Can help you</p>
                <div className="pp-group-card">
                  {req.helpers.map((h) => (
                    <div key={h.recipientId} className="pp-row pp-row-static">
                      <span className="pp-row-icon"><ShieldCheck size={17} /></span>
                      <span className="pp-row-body">
                        <small>{h.title || 'Works there'}</small>
                        <strong>{h.name ?? 'A member'}</strong>
                      </span>
                      {h.email && (
                        <a
                          href={`mailto:${h.email}`}
                          aria-label={`Email ${h.name ?? 'this member'}`}
                          style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 999, color: 'var(--green-800)', flexShrink: 0 }}
                        >
                          <Mail size={17} aria-hidden="true" />
                        </a>
                      )}
                      {h.linkedin && (
                        <a
                          href={h.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`LinkedIn profile for ${h.name ?? 'this member'}`}
                          style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 999, color: 'var(--green-800)', flexShrink: 0 }}
                        >
                          <Link2 size={17} aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                margin: '14px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)',
              }}>
                <HelpCircle size={14} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
                {req.notifiedCount === 0
                  ? 'No member there has offered to help yet. We will pass this on if that changes.'
                  : 'Waiting on a reply. You will be notified the moment someone agrees.'}
              </p>
            )}

            {error && (
              <p role="alert" className="community-error" style={{ marginTop: 12 }}>{error}</p>
            )}

            {(req.status === 'open' || req.status === 'matched') && (
              <button
                type="button"
                className="btn btn-outline"
                style={{ marginTop: 16, minHeight: 48, borderRadius: 999, color: 'var(--error-600)' }}
                disabled={busy !== null}
                onClick={() => withdraw(req.id)}
              >
                {busy === req.id
                  ? <Loader2 size={14} className="spin" aria-hidden="true" />
                  : <Trash2 size={14} aria-hidden="true" />}
                Withdraw this request
              </button>
            )}
          </div>
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
