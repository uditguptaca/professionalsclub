'use client';
import React, { useEffect, useState } from 'react';
import { usePortal } from '@/context/portal-context';
import { useApp } from '@/context/app-context';
import { useConfirm } from '@/components/portal/confirm';
import { useDismissOnBack } from '@/lib/use-dismiss-on-back';
import { categoryLabel } from '@/lib/help-desk';
import {
  ClipboardList, CheckCircle, Clock, XCircle, Shield, HandHeart,
  ChevronRight, CalendarClock, Layers, Gauge, X, PauseCircle, PlayCircle,
  Check, AlertCircle, LogOut,
} from 'lucide-react';
import Link from 'next/link';
import { SUPPORT_CATEGORIES, type CaseAssignment, type VolunteerApplication } from '@/types';
import * as portalActions from '@/app/actions/portal';
import { guardActions } from '@/lib/actions-client';
const { updateMyVolunteering } = guardActions(portalActions);

/**
 * Volunteer status, restyled to the profile-hub language: the application is a
 * card of summary rows, the work queue is a segmented filter over assignment
 * cards, and the long instruction/scope blocks moved into a detail sheet so the
 * queue stays scannable on a phone.
 */

const APP_STATUS: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  approved: { color: 'var(--success-600)', bg: 'rgba(5,150,105,0.1)', icon: <CheckCircle size={17} />, label: 'Approved' },
  pending_verification: { color: 'var(--accent-700)', bg: 'rgba(245,158,11,0.12)', icon: <Clock size={17} />, label: 'Pending verification' },
  new_application: { color: 'var(--text-accent)', bg: 'rgba(232,93,4,0.1)', icon: <ClipboardList size={17} />, label: 'Submitted for review' },
  rejected: { color: 'var(--error-600)', bg: 'var(--error-50)', icon: <XCircle size={17} />, label: 'Not accepted' },
  on_hold: { color: 'var(--text-muted)', bg: 'var(--bg-secondary)', icon: <Clock size={17} />, label: 'On hold' },
  inactive: { color: 'var(--text-muted)', bg: 'var(--bg-secondary)', icon: <PauseCircle size={17} />, label: 'Stopped' },
};

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-CA', { day: 'numeric', month: 'long', year: 'numeric' });

/** A pause set in the past has expired: treat it as no pause. */
const isPaused = (app: VolunteerApplication) =>
  Boolean(app.pausedUntil && new Date(app.pausedUntil).getTime() > Date.now());

/** Default pause: a month from today, as a yyyy-mm-dd for <input type="date">. */
const monthAhead = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
};

const ACTIVE_STATUSES = ['pending', 'accepted', 'in_progress'];

/** Chip colours per assignment status. Green only via --success-600 as text. */
function chipStyle(status: string): React.CSSProperties {
  if (status === 'completed') return { background: 'var(--success-50)', color: 'var(--success-600)' };
  if (status === 'cancelled' || status === 'reassigned') return { background: 'var(--bg-secondary)', color: 'var(--text-muted)' };
  return { background: 'rgba(232,93,4,0.09)', color: 'var(--text-accent)' };
}

export default function MyVolunteerPage() {
  const { volunteerApps, assignments, refresh } = usePortal();
  const { currentUserId, refreshProfile } = useApp();
  const confirm = useConfirm();
  const [tab, setTab] = useState<'all' | 'active' | 'done'>('all');
  const [open, setOpen] = useState<CaseAssignment | null>(null);
  useDismissOnBack(open !== null, () => setOpen(null));

  // ---- Your availability (0059) ------------------------------------------
  // Each control saves on its own; one `busy` key so two saves never race.
  const [busy, setBusy] = useState<'' | 'pause' | 'cap' | 'areas' | 'stop'>('');
  const [availError, setAvailError] = useState('');
  const [toast, setToast] = useState('');
  const [pausePicker, setPausePicker] = useState(false);
  const [pauseUntil, setPauseUntil] = useState(monthAhead);
  const [capDraft, setCapDraft] = useState<number | null>(null);
  const [areasDraft, setAreasDraft] = useState<string[] | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const save = async (
    key: 'pause' | 'cap' | 'areas' | 'stop',
    patch: Parameters<typeof updateMyVolunteering>[0],
    done: string,
  ) => {
    if (busy) return false;
    setBusy(key);
    setAvailError('');
    const r = await updateMyVolunteering(patch);
    if (r.ok) {
      // The page renders from the portal snapshot, so re-read it; withdrawing
      // also changes is_volunteer on the profile, which the shell reads.
      await refresh();
      if (patch.status) await refreshProfile();
      setToast(done);
    } else {
      setAvailError(r.error);
    }
    setBusy('');
    return r.ok;
  };

  // The detail sheet locks background scroll and closes on Escape, same as
  // every other sheet in the portal.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open]);

  const myApp = volunteerApps.find(a => a.memberId === currentUserId);
  const myAssignments = assignments.filter(a => a.volunteerMemberId === currentUserId);

  if (!myApp) {
    return (
      <div className="pp2" style={{ textAlign: 'center', padding: '56px 4px' }}>
        <HandHeart size={28} style={{ opacity: 0.35 }} />
        <h1 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 800, margin: '14px 0 8px' }}>
          You have not applied yet
        </h1>
        <p style={{ margin: '0 auto 22px', maxWidth: '20rem', fontSize: '0.9rem', lineHeight: 1.55, color: 'var(--text-secondary)' }}>
          Volunteers answer questions from newcomers, one case at a time.
        </p>
        <Link href="/portal/member/volunteer" className="btn btn-primary">Apply to volunteer</Link>
      </div>
    );
  }

  const sc = APP_STATUS[myApp.status] || APP_STATUS.new_application;
  const approved = myApp.status === 'approved';
  const stopped = myApp.status === 'inactive';
  const paused = isPaused(myApp);
  const openCases = myAssignments.filter(a => ACTIVE_STATUSES.includes(a.status)).length;

  const stopVolunteering = async () => {
    const ok = await confirm({
      title: 'Stop volunteering?',
      message: openCases > 0
        ? `Your application is marked stopped and the club is told. Your ${openCases === 1 ? 'open case stays' : `${openCases} open cases stay`} assigned to you until an admin moves ${openCases === 1 ? 'it' : 'them'}, so finish or hand back what you can. You can apply again any time.`
        : 'Your application is marked stopped and the club is told. You get no new cases. You can apply again any time.',
      confirmLabel: 'Stop volunteering',
      tone: 'danger',
    });
    if (!ok) return;
    await save('stop', { status: 'withdraw' }, 'You have stopped volunteering');
  };

  const areaChip = (cat: string, on: boolean, onToggle: () => void) => (
    <button
      key={cat}
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className="pp-chip"
      style={{
        minHeight: 44, maxWidth: '100%', padding: '0.5rem 0.95rem',
        borderRadius: 99, cursor: 'pointer', textAlign: 'left',
        fontSize: '0.82rem', lineHeight: 1.35, fontWeight: on ? 750 : 650,
        background: on ? 'var(--green-950)' : 'var(--bg-secondary)',
        color: on ? '#fff' : 'var(--text-secondary)',
        border: on ? '1px solid var(--green-950)' : '1px solid rgba(27,67,50,0.08)',
      }}
    >
      {on && <Check size={14} aria-hidden="true" style={{ flexShrink: 0 }} />}{categoryLabel(cat)}
    </button>
  );

  const activeCount = myAssignments.filter(a => ACTIVE_STATUSES.includes(a.status)).length;
  const doneCount = myAssignments.filter(a => a.status === 'completed').length;
  const tabs = [
    { id: 'all' as const, label: `All ${myAssignments.length}` },
    { id: 'active' as const, label: `Active ${activeCount}` },
    { id: 'done' as const, label: `Completed ${doneCount}` },
  ];
  const shown = myAssignments.filter(a =>
    tab === 'all' ? true : tab === 'active' ? ACTIVE_STATUSES.includes(a.status) : a.status === 'completed');

  return (
    <div className="pp2">
      <header style={{ marginBottom: 18 }}>
        <h1 className="font-display" style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 6px' }}>
          Volunteering
        </h1>
        <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
          Your application and the cases assigned to you.
        </p>
      </header>

      <div className="pp-groups">
        {/* ---- Application summary ---- */}
        <section className="pp-group">
          <h2>Your application</h2>
          <div className="pp-group-card">
            <div className="pp-row pp-row-static">
              <span className="pp-row-icon" style={{ background: sc.bg, color: sc.color }}>{sc.icon}</span>
              <span className="pp-row-body">
                <small>Status</small>
                <strong style={{ color: sc.color }}>{sc.label}</strong>
              </span>
            </div>
            <div className="pp-row pp-row-static">
              <span className="pp-row-icon"><CalendarClock size={17} /></span>
              <span className="pp-row-body">
                <small>Applied</small>
                <strong>{new Date(myApp.createdAt).toLocaleDateString('en-CA', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
              </span>
            </div>
            <div className="pp-row pp-row-static">
              <span className="pp-row-icon"><Layers size={17} /></span>
              <span className="pp-row-body">
                <small>Areas you cover</small>
                <strong>{myApp.expertiseAreas.length > 0 ? myApp.expertiseAreas.map(categoryLabel).join(' · ') : 'None selected'}</strong>
              </span>
            </div>
            <div className="pp-row pp-row-static">
              <span className="pp-row-icon"><Gauge size={17} /></span>
              <span className="pp-row-body">
                <small>Your monthly cap</small>
                <strong>{myApp.maxCasesPerMonth} {myApp.maxCasesPerMonth === 1 ? 'case' : 'cases'}</strong>
              </span>
            </div>
          </div>
          {!approved && !stopped && (
            <p className="pp-group-sub" style={{ margin: '0.6rem 0 0' }}>
              The team reviews every application by hand. You will be able to see assigned cases here once you are approved.
            </p>
          )}
          {stopped && (
            <div style={{ marginTop: 10 }}>
              <p className="pp-group-sub" style={{ margin: '0 0 10px' }}>
                You stopped volunteering. The club assigns you nothing new. Apply again and the team reviews it like a new application.
              </p>
              <button
                type="button"
                className="btn btn-outline"
                disabled={busy !== ''}
                onClick={() => void save('stop', { status: 'reapply' }, 'Application sent for review again')}
              >
                <HandHeart size={15} aria-hidden="true" /> Volunteer again
              </button>
            </div>
          )}
        </section>

        {/* ---- Your availability (0059) ----
            Before this card the page had no controls at all: a volunteer who
            got a job, or hit a crisis of their own, could only go silent or
            delete their account. */}
        {approved && (
          <section className="pp-group">
            <h2>Your availability</h2>
            <p className="pp-group-sub">Pause when life gets busy, change how much you take on, or stop. Nothing here needs the club's approval.</p>
            <div className="pp-group-card">
              <div className="pp-row pp-row-static" style={{ alignItems: 'center' }}>
                <span
                  className="pp-row-icon"
                  style={paused ? { background: 'rgba(245,158,11,0.12)', color: 'var(--accent-700)' } : undefined}
                >
                  {paused ? <PauseCircle size={17} /> : <PlayCircle size={17} />}
                </span>
                <span className="pp-row-body">
                  <small>New cases</small>
                  <strong style={{ whiteSpace: 'normal' }}>
                    {paused ? `Paused until ${longDate(myApp.pausedUntil as string)}` : 'Taking new cases'}
                  </strong>
                </span>
                {paused ? (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={busy !== ''}
                    onClick={() => void save('pause', { pausedUntil: null }, 'Taking new cases again')}
                  >
                    {busy === 'pause' ? 'Saving…' : 'Resume'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    aria-expanded={pausePicker}
                    aria-controls="mv-pause"
                    onClick={() => setPausePicker(v => !v)}
                  >
                    Pause
                  </button>
                )}
              </div>

              {pausePicker && !paused && (
                <form
                  id="mv-pause"
                  onSubmit={e => {
                    e.preventDefault();
                    void save('pause', { pausedUntil: new Date(`${pauseUntil}T23:59:59`).toISOString() }, 'Paused. The club assigns you nothing until then')
                      .then(ok => { if (ok) setPausePicker(false); });
                  }}
                  style={{ padding: '0 1rem 0.95rem 3.9rem', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}
                >
                  <div className="pp-field" style={{ flex: '1 1 10rem', margin: 0 }}>
                    <label htmlFor="mv-pause-until">Pause new cases until</label>
                    <input
                      id="mv-pause-until"
                      type="date"
                      value={pauseUntil}
                      min={new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)}
                      onChange={e => setPauseUntil(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={busy !== '' || !pauseUntil} style={{ minHeight: 44 }}>
                    {busy === 'pause' ? 'Saving…' : 'Pause until then'}
                  </button>
                  <p style={{ flexBasis: '100%', margin: 0, fontSize: '0.76rem', lineHeight: 1.5, color: 'var(--text-muted)' }}>
                    Cases already assigned to you stay yours. You can resume any day.
                  </p>
                </form>
              )}

              <div className="pp-row pp-row-static" style={{ alignItems: 'center' }}>
                <span className="pp-row-icon"><Gauge size={17} /></span>
                <span className="pp-row-body">
                  <label htmlFor="mv-cap" style={{ display: 'block', fontSize: '0.72rem', fontWeight: 650, color: 'var(--text-muted)' }}>
                    Cases per month at most
                  </label>
                  <input
                    id="mv-cap"
                    type="number"
                    min={1}
                    max={100}
                    inputMode="numeric"
                    value={capDraft ?? myApp.maxCasesPerMonth}
                    onChange={e => setCapDraft(Number(e.target.value))}
                    style={{
                      width: '5.5rem', minHeight: 40, padding: '0 0.6rem', marginTop: 2,
                      border: '1px solid rgba(27,67,50,0.14)', borderRadius: '0.6rem',
                      font: 'inherit', fontSize: '0.95rem', fontWeight: 700,
                    }}
                  />
                </span>
                {capDraft !== null && capDraft !== myApp.maxCasesPerMonth && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={busy !== '' || !(capDraft >= 1 && capDraft <= 100)}
                    onClick={() => void save('cap', { maxCasesPerMonth: capDraft }, 'Monthly cap saved').then(ok => { if (ok) setCapDraft(null); })}
                  >
                    {busy === 'cap' ? 'Saving…' : 'Save'}
                  </button>
                )}
              </div>

              <div style={{ padding: '0.85rem 1rem 1rem' }}>
                <p style={{ margin: '0 0 8px', fontSize: '0.72rem', fontWeight: 650, color: 'var(--text-muted)' }}>
                  Areas you cover
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="group" aria-label="Areas you cover">
                  {SUPPORT_CATEGORIES.filter(c => c !== 'Other').map(cat => {
                    const current = areasDraft ?? myApp.expertiseAreas;
                    const on = current.includes(cat);
                    return areaChip(cat, on, () =>
                      setAreasDraft(on ? current.filter(c => c !== cat) : [...current, cat]));
                  })}
                </div>
                {areasDraft !== null && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={busy !== '' || areasDraft.length === 0}
                      onClick={() => void save('areas', { expertiseAreas: areasDraft }, 'Areas saved').then(ok => { if (ok) setAreasDraft(null); })}
                    >
                      {busy === 'areas' ? 'Saving…' : 'Save areas'}
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" disabled={busy !== ''} onClick={() => setAreasDraft(null)}>
                      Cancel
                    </button>
                    {areasDraft.length === 0 && (
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Keep at least one area, or stop volunteering below.</span>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="pp-row pp-row-danger"
                onClick={() => void stopVolunteering()}
                disabled={busy !== ''}
              >
                <span className="pp-row-icon"><LogOut size={17} /></span>
                <span className="pp-row-body">
                  <strong>{busy === 'stop' ? 'Stopping…' : 'Stop volunteering'}</strong>
                  <small style={{ whiteSpace: 'normal' }}>No new cases. Open ones stay yours until the club moves them.</small>
                </span>
                <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
              </button>
            </div>

            {availError && (
              <div role="alert" className="community-error" style={{ marginTop: 10 }}>
                <AlertCircle size={15} aria-hidden="true" /> {availError}
              </div>
            )}
          </section>
        )}

        {/* ---- Note from the team ---- */}
        {myApp.adminNotes && approved && (
          <section className="pp-group">
            <h2>Note from the team</h2>
            <div className="pp-group-card" style={{ padding: '0.95rem 1rem' }}>
              <p style={{ margin: 0, fontSize: '0.86rem', lineHeight: 1.55 }}>{myApp.adminNotes}</p>
            </div>
          </section>
        )}

        {/* ---- Work queue ----
            Also shown to a volunteer who stopped while still holding cases: the
            confirm dialog told them those stay theirs until the club moves them,
            so they must stay visible. */}
        {(approved || myAssignments.length > 0) && (
          <section className="pp-group">
            <h2>Your cases</h2>
            <p className="pp-group-sub">Tap a case to read the full brief and respond through the club.</p>

            {myAssignments.length > 0 && (
              <div style={{
                display: 'flex', gap: 4, padding: 4, marginBottom: 12, background: 'var(--bg-primary)',
                borderRadius: 999, border: '1px solid rgba(27,67,50,0.08)',
                width: 'fit-content', maxWidth: '100%', overflowX: 'auto',
              }}>
                {tabs.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    aria-pressed={tab === t.id}
                    style={{
                      minHeight: 44, padding: '0 16px', borderRadius: 999, border: 0,
                      whiteSpace: 'nowrap', font: 'inherit', fontSize: '0.84rem', cursor: 'pointer',
                      ...(tab === t.id
                        ? { background: 'var(--green-950)', color: '#fff', fontWeight: 700 }
                        : { background: 'none', color: 'var(--text-secondary)', fontWeight: 600 }),
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {shown.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 8px' }}>
                <ClipboardList size={28} style={{ opacity: 0.35 }} />
                <p style={{ margin: '12px auto 0', maxWidth: '20rem', fontSize: '0.88rem', lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                  {myAssignments.length === 0
                    ? 'No cases yet. The team assigns them based on the areas you cover.'
                    : 'Nothing in this view.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {shown.map(asg => (
                  <button
                    key={asg.id}
                    type="button"
                    className="pp-group-card"
                    onClick={() => setOpen(asg)}
                    style={{
                      display: 'flex', flexDirection: 'column', gap: 8, width: '100%',
                      padding: '0.95rem 1rem', font: 'inherit', color: 'var(--text-primary)',
                      textAlign: 'left', cursor: 'pointer',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <strong style={{ fontSize: '0.95rem', fontWeight: 750, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {asg.requestTitle}
                      </strong>
                      <span className="pp-chip" style={{ ...chipStyle(asg.status), flexShrink: 0, textTransform: 'capitalize' }}>
                        {asg.status.replace(/_/g, ' ')}
                      </span>
                    </span>
                    <span style={{
                      fontSize: '0.83rem', lineHeight: 1.5, color: 'var(--text-secondary)',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {asg.instructions}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', fontWeight: 650, color: 'var(--text-muted)' }}>
                      <CalendarClock size={13} aria-hidden="true" />
                      Due {new Date(asg.dueDate).toLocaleDateString('en-CA', { day: 'numeric', month: 'short' })}
                      <ChevronRight size={15} aria-hidden="true" style={{ marginLeft: 'auto' }} />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {toast && (
        <div role="status" className="pp-toast">{toast}</div>
      )}

      {/* ---- Case detail sheet ---- */}
      {open && (
        <div className="hf-sheet-scrim" onClick={(e) => { if (e.target === e.currentTarget) setOpen(null); }}>
          <div className="hf-sheet pp-sheet" role="dialog" aria-modal="true" aria-label={open.requestTitle}>
            <div className="hf-sheet-head">
              <h2>{open.requestTitle}</h2>
              <button type="button" className="portal-sheet-close" onClick={() => setOpen(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <p className="hf-sheet-sub">
              Due {new Date(open.dueDate).toLocaleDateString('en-CA', { day: 'numeric', month: 'long', year: 'numeric' })} · case {open.id}
            </p>

            <span className="pp-chip" style={{ ...chipStyle(open.status), textTransform: 'capitalize', alignSelf: 'flex-start' }}>
              {open.status.replace(/_/g, ' ')}
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, margin: '14px 0 1rem' }}>
              <div>
                <h3 style={{ margin: '0 0 5px', fontSize: '0.76rem', fontWeight: 750, color: 'var(--text-secondary)' }}>What the team asked for</h3>
                <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.6 }}>{open.instructions}</p>
              </div>
              <div>
                <h3 style={{ margin: '0 0 5px', fontSize: '0.76rem', fontWeight: 750, color: 'var(--text-secondary)' }}>Scope</h3>
                <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.6 }}>{open.scope}</p>
              </div>
              {open.volunteerResponse && (
                <div>
                  <h3 style={{ margin: '0 0 5px', fontSize: '0.76rem', fontWeight: 750, color: 'var(--text-secondary)' }}>Your response</h3>
                  <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.6 }}>{open.volunteerResponse}</p>
                </div>
              )}
              <p style={{
                display: 'flex', gap: 8, margin: 0, padding: '0.7rem 0.85rem', borderRadius: '0.75rem',
                background: 'rgba(232,93,4,0.05)', border: '1px solid rgba(232,93,4,0.12)',
                fontSize: '0.78rem', lineHeight: 1.5, color: 'var(--text-secondary)',
              }}>
                <Shield size={14} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2, color: 'var(--primary-600)' }} />
                You can see who asked and what they wrote, because you were assigned to help them. Keep it in the club, and keep it to yourself.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
