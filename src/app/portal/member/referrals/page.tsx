'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/app-context';
import {
  fetchReferralHome, respondToReferralRequest, withdrawReferral,
  saveWhereIWork, removeWhereIWork,
} from '@/app/actions/referrals';
import type {
  Company, CompanyInsider, MyReferralRequest, ReferralInboxItem,
} from '@/types';
import {
  Inbox, Send, Building2, Users, Check, X, Loader2, ShieldCheck, Mail,
  Phone, Link2, FileText, ExternalLink, Trash2, Plus, HelpCircle, EyeOff,
} from 'lucide-react';
import { useConfirm } from '@/components/portal/confirm';

/**
 * Both sides of a referral, plus the opt-in that makes someone an insider.
 *
 * Requests I sent   what I asked for, how many were asked, and who said yes
 * I can help        the anonymous asks waiting on me
 * Where I work      my employers, and whether I am open to helping
 *
 * The anonymity is not implemented here. The server sends null for a seeker's
 * name until this member has accepted, so there is nothing to hide in the
 * markup — if it renders, it was revealed.
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

export default function ReferralsPage() {
  const { currentUserId } = useApp();
  const confirm = useConfirm();

  const [tab, setTab] = useState<Tab>('inbox');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [companies, setCompanies] = useState<Company[]>([]);
  const [myRoles, setMyRoles] = useState<CompanyInsider[]>([]);
  const [requests, setRequests] = useState<MyReferralRequest[]>([]);
  const [inbox, setInbox] = useState<ReferralInboxItem[]>([]);

  const [busy, setBusy] = useState<string | null>(null);

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
        // Land on whichever tab has something waiting.
        if (r.data.inbox.some((i) => i.myStatus === 'pending')) setTab('inbox');
        else if (r.data.myRequests.length) setTab('sent');
        else if (!r.data.myRoles.length) setTab('work');
      } else {
        setError(r.error);
      }
      setLoading(false);
    });
  }, [currentUserId]);

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
    if (r.ok) setInbox(r.data); else setError(r.error);
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
    if (r.ok) setRequests(r.data); else setError(r.error);
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
    setBusy(role.id);
    const r = await removeWhereIWork(role.companyId);
    if (r.ok) setMyRoles(r.data); else setError(r.error);
    setBusy(null);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'inbox', label: 'I can help', icon: <Inbox size={15} />, count: pending.length },
    { id: 'sent', label: 'Requests I sent', icon: <Send size={15} />, count: requests.length },
    { id: 'work', label: 'Where I work', icon: <Building2 size={15} />, count: myRoles.length },
  ];

  return (
    <div className="ref-page">
      <header className="ref-head">
        <div>
          <h1>Referrals</h1>
          <p>
            Members already inside a company can get an application looked at. We pass the ask
            along and keep both sides anonymous until someone agrees to help.
          </p>
        </div>
        <Link href="/portal/member/jobs" className="btn btn-primary btn-sm">
          Browse jobs by company
        </Link>
      </header>

      <div className="ref-tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? 'is-active' : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.icon} {t.label}
            {t.count ? <span className="ref-tab-count">{t.count}</span> : null}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="community-error">{error}</p>}

      {loading && (
        <div className="community-panel" aria-hidden="true">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="ref-job-skeleton">
              <span className="community-line-shimmer community-shimmer" style={{ width: '50%' }} />
              <span className="community-line-shimmer community-shimmer" style={{ width: '30%' }} />
            </div>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------ inbox */}
      {!loading && tab === 'inbox' && (
        <>
          {inbox.length === 0 && (
            <div className="community-panel community-empty">
              <Inbox size={22} aria-hidden="true" />
              <p><strong>Nothing waiting on you.</strong></p>
              <p>
                Add the company you work at under <strong>Where I work</strong> and say you are
                open to helping. When a member applies there, the ask lands here.
              </p>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setTab('work')}>
                Add where I work
              </button>
            </div>
          )}

          {pending.map((item) => (
            <article key={item.recipientId} className="community-panel ref-ask-card">
              <div className="ref-ask-head">
                <span className="ref-logo" aria-hidden="true">
                  {item.companyLogo || item.companyName.charAt(0)}
                </span>
                <div>
                  <strong>{item.headline}</strong>
                  <small>
                    wants a referral at {item.companyName} · {when(item.createdAt)}
                  </small>
                </div>
                <span className="ref-anon" title="You will see who this is only if you agree to help">
                  <EyeOff size={12} aria-hidden="true" /> Anonymous
                </span>
              </div>

              <ul className="ref-ask-jobs">
                {item.jobs.map((j) => (
                  <li key={j.id}>
                    <a href={j.applyUrl} target="_blank" rel="noopener noreferrer">
                      {j.title} {j.location ? <span className="ref-muted">· {j.location}</span> : null}
                      <ExternalLink size={11} aria-hidden="true" />
                    </a>
                    {!j.isOpen && <span className="ref-closed">closed since</span>}
                  </li>
                ))}
              </ul>

              {item.note && <p className="ref-note">“{item.note}”</p>}

              <div className="ref-ask-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy !== null}
                  onClick={() => respond(item.requestId, false)}
                >
                  {busy === item.requestId ? <Loader2 size={14} className="spin" /> : <X size={14} />}
                  Not me
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={busy !== null}
                  onClick={() => respond(item.requestId, true)}
                >
                  <Check size={14} aria-hidden="true" /> I can help
                </button>
              </div>
              <p className="ref-fineprint">
                Saying yes shares your name and email with them, and shows you theirs. Saying no
                tells them nothing at all.
              </p>
            </article>
          ))}

          {answered.map((item) => (
            <article key={item.recipientId} className="community-panel ref-ask-card is-answered">
              <div className="ref-ask-head">
                <span className="ref-logo" aria-hidden="true">
                  {item.companyLogo || item.companyName.charAt(0)}
                </span>
                <div>
                  <strong>{item.seekerName ?? item.headline}</strong>
                  <small>
                    {item.companyName} ·{' '}
                    {item.myStatus === 'accepted' ? 'you offered to help' : 'you passed'} ·{' '}
                    {when(item.respondedAt)}
                  </small>
                </div>
              </div>

              {item.myStatus === 'accepted' && (
                <div className="ref-contact">
                  {item.seekerEmail && (
                    <a href={`mailto:${item.seekerEmail}`}>
                      <Mail size={13} aria-hidden="true" /> {item.seekerEmail}
                    </a>
                  )}
                  {item.seekerPhone && (
                    <a href={`tel:${item.seekerPhone}`}>
                      <Phone size={13} aria-hidden="true" /> {item.seekerPhone}
                    </a>
                  )}
                  {item.seekerLinkedin && (
                    <a href={item.seekerLinkedin} target="_blank" rel="noopener noreferrer">
                      <Link2 size={13} aria-hidden="true" /> LinkedIn
                    </a>
                  )}
                  {item.resumeUrl && (
                    <a href={item.resumeUrl} target="_blank" rel="noopener noreferrer">
                      <FileText size={13} aria-hidden="true" /> Resume
                    </a>
                  )}
                </div>
              )}

              <ul className="ref-ask-jobs">
                {item.jobs.map((j) => (
                  <li key={j.id}>
                    <a href={j.applyUrl} target="_blank" rel="noopener noreferrer">{j.title}</a>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </>
      )}

      {/* ------------------------------------------------------------- sent */}
      {!loading && tab === 'sent' && (
        <>
          {requests.length === 0 && (
            <div className="community-panel community-empty">
              <Send size={22} aria-hidden="true" />
              <p><strong>You have not asked for a referral yet.</strong></p>
              <p>Pick an employer, choose the roles you are going for, and we will pass it on.</p>
              <Link href="/portal/member/jobs" className="btn btn-primary btn-sm">
                Browse jobs by company
              </Link>
            </div>
          )}

          {requests.map((req) => (
            <article key={req.id} className="community-panel ref-req-card">
              <div className="ref-ask-head">
                <span className="ref-logo" aria-hidden="true">
                  {req.companyLogo || req.companyName.charAt(0)}
                </span>
                <div>
                  <strong>{req.companyName}</strong>
                  <small>
                    {req.notifiedCount === 0
                      ? 'nobody inside yet'
                      : `${req.notifiedCount} ${req.notifiedCount === 1 ? 'member' : 'members'} asked`}
                    {' · '}{when(req.createdAt)}
                  </small>
                </div>
                <span className={`ref-status ref-status-${req.status}`}>{req.status}</span>
              </div>

              <ul className="ref-ask-jobs">
                {req.jobs.map((j) => (
                  <li key={j.id}>
                    <a href={j.applyUrl} target="_blank" rel="noopener noreferrer">
                      {j.title} {j.location ? <span className="ref-muted">· {j.location}</span> : null}
                    </a>
                    {!j.isOpen && <span className="ref-closed">no longer listed</span>}
                  </li>
                ))}
              </ul>

              {req.helpers.length > 0 ? (
                <div className="ref-helper-list">
                  <h3><ShieldCheck size={14} aria-hidden="true" /> Can help</h3>
                  {req.helpers.map((h) => (
                    <div key={h.recipientId} className="ref-helper">
                      <div>
                        <strong>{h.name ?? 'A member'}</strong>
                        {h.title && <small>{h.title}</small>}
                      </div>
                      <div className="ref-contact">
                        {h.email && (
                          <a href={`mailto:${h.email}`}>
                            <Mail size={13} aria-hidden="true" /> Email
                          </a>
                        )}
                        {h.linkedin && (
                          <a href={h.linkedin} target="_blank" rel="noopener noreferrer">
                            <Link2 size={13} aria-hidden="true" /> LinkedIn
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="ref-muted ref-waiting">
                  <HelpCircle size={13} aria-hidden="true" />
                  {req.notifiedCount === 0
                    ? 'No member there has offered to help yet. We will pass this on if that changes.'
                    : 'Waiting on a reply. You will be notified the moment someone agrees.'}
                </p>
              )}

              {(req.status === 'open' || req.status === 'matched') && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy !== null}
                  onClick={() => withdraw(req.id)}
                >
                  {busy === req.id ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
                  Withdraw
                </button>
              )}
            </article>
          ))}
        </>
      )}

      {/* ------------------------------------------------------------- work */}
      {!loading && tab === 'work' && (
        <>
          <div className="community-panel ref-privacy">
            <ShieldCheck size={18} aria-hidden="true" />
            <div>
              <strong>What other people can see</strong>
              <p>
                Only a number. The website and the app show “{myRoles.length > 0 ? '3' : 'N'} members
                here can help” on a company — never who. Your name reaches a job seeker only when
                you open a request and say you can help.
              </p>
            </div>
          </div>

          {myRoles.map((role) => (
            <article key={role.id} className="community-panel ref-work-card">
              <div className="ref-ask-head">
                <span className="ref-logo" aria-hidden="true">
                  {role.companyLogo || role.companyName.charAt(0)}
                </span>
                <div>
                  <strong>{role.companyName}</strong>
                  <small>{role.jobTitle || 'No title given'}</small>
                </div>
                <button
                  type="button"
                  className="ref-icon-btn"
                  aria-label={`Remove ${role.companyName}`}
                  disabled={busy !== null}
                  onClick={() => dropRole(role)}
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <label className="ref-toggle">
                <input
                  type="checkbox"
                  checked={role.canRefer}
                  disabled={busy !== null}
                  onChange={(e) => updateRole(role, { canRefer: e.target.checked })}
                />
                <span>
                  <strong>I am open to helping</strong>
                  <small>Turn this off and you stay listed as working here, but nobody is sent to you.</small>
                </span>
              </label>

              <label className="ref-toggle">
                <input
                  type="checkbox"
                  checked={role.notifyEmail}
                  disabled={busy !== null || !role.canRefer}
                  onChange={(e) => updateRole(role, { notifyEmail: e.target.checked })}
                />
                <span>
                  <strong>Email me about requests</strong>
                  <small>Otherwise you will only see them here in the portal.</small>
                </span>
              </label>
            </article>
          ))}

          <div className="community-panel ref-work-add">
            <h3><Plus size={15} aria-hidden="true" /> Add where you work</h3>
            {unlisted.length === 0 ? (
              <p className="ref-muted">
                {companies.length === 0
                  ? 'No employers are listed yet. An admin adds them.'
                  : 'You have added every listed employer. Ask an admin to add yours if it is missing.'}
              </p>
            ) : (
              <>
                <div className="form-field">
                  <label htmlFor="ref-company">Company</label>
                  <select
                    id="ref-company"
                    className="input"
                    value={addCompany}
                    onChange={(e) => setAddCompany(e.target.value)}
                  >
                    <option value="">Choose your employer</option>
                    {unlisted.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="ref-title">Your job title <span className="ref-muted">(optional)</span></label>
                  <input
                    id="ref-title"
                    className="input"
                    value={addTitle}
                    onChange={(e) => setAddTitle(e.target.value)}
                    placeholder="e.g. Staff Engineer"
                    maxLength={120}
                  />
                </div>
                <label className="ref-toggle">
                  <input type="checkbox" checked={addRefer} onChange={(e) => setAddRefer(e.target.checked)} />
                  <span><strong>I am open to helping people applying here</strong></span>
                </label>
                <label className="ref-toggle">
                  <input type="checkbox" checked={addEmail} onChange={(e) => setAddEmail(e.target.checked)} />
                  <span><strong>Email me when someone asks</strong></span>
                </label>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!addCompany || busy !== null}
                  onClick={addRole}
                >
                  {busy === 'add' ? <Loader2 size={15} className="spin" /> : <Users size={15} />}
                  Add company
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
