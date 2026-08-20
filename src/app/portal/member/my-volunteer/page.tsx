'use client';
import React, { useEffect, useState } from 'react';
import { usePortal } from '@/context/portal-context';
import { useApp } from '@/context/app-context';
import {
  ClipboardList, CheckCircle, Clock, XCircle, Shield, HandHeart,
  ChevronRight, CalendarClock, Layers, Gauge, X,
} from 'lucide-react';
import Link from 'next/link';
import type { CaseAssignment } from '@/types';

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
};

const ACTIVE_STATUSES = ['pending', 'accepted', 'in_progress'];

/** Chip colours per assignment status. Green only via --success-600 as text. */
function chipStyle(status: string): React.CSSProperties {
  if (status === 'completed') return { background: 'var(--success-50)', color: 'var(--success-600)' };
  if (status === 'cancelled' || status === 'reassigned') return { background: 'var(--bg-secondary)', color: 'var(--text-muted)' };
  return { background: 'rgba(232,93,4,0.09)', color: 'var(--text-accent)' };
}

export default function MyVolunteerPage() {
  const { volunteerApps, assignments } = usePortal();
  const { currentUserId } = useApp();
  const [tab, setTab] = useState<'all' | 'active' | 'done'>('all');
  const [open, setOpen] = useState<CaseAssignment | null>(null);

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
                <strong>{myApp.expertiseAreas.length > 0 ? myApp.expertiseAreas.join(' · ') : 'None selected'}</strong>
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
          {!approved && (
            <p className="pp-group-sub" style={{ margin: '0.6rem 0 0' }}>
              The team reviews every application by hand. You will be able to see assigned cases here once you are approved.
            </p>
          )}
        </section>

        {/* ---- Note from the team ---- */}
        {myApp.adminNotes && approved && (
          <section className="pp-group">
            <h2>Note from the team</h2>
            <div className="pp-group-card" style={{ padding: '0.95rem 1rem' }}>
              <p style={{ margin: 0, fontSize: '0.86rem', lineHeight: 1.55 }}>{myApp.adminNotes}</p>
            </div>
          </section>
        )}

        {/* ---- Work queue ---- */}
        {approved && (
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
                The requester&apos;s details are redacted. Reply only through the club.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
