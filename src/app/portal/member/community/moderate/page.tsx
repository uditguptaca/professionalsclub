'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { CommunityReport } from '@/types';
import type { ModerationItem } from '@/server/repos/community';
import {
  fetchModerationQueue, moderateContentItem, fetchModeratorReports, resolveReportAsModerator,
} from '@/app/actions/community';
import PortalLoading from '@/components/portal/PortalLoading';
import { useConfirm } from '@/components/portal/confirm';
import { AlertCircle, Check, Flag, ShieldCheck, ShieldOff, Trash2, UsersRound, Sparkles } from 'lucide-react';

/**
 * The moderators' queue (0053).
 *
 * Two lists. HELD: posts and comments the classifier stopped at the door -
 * the author can see them, nobody else can, and each carries the classifier's
 * reasons. REPORTED: what members flagged. A group moderator sees their
 * groups; a club admin sees everything. RLS draws that line, so an empty
 * queue here is the truth, not a permission error.
 */

const when = (iso: string) => new Date(iso).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function ModerationQueuePage() {
  const confirm = useConfirm();
  const [items, setItems] = useState<ModerationItem[] | null>(null);
  const [reports, setReports] = useState<CommunityReport[] | null>(null);
  const [tab, setTab] = useState<'held' | 'reported'>('held');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    const [q, r] = await Promise.all([fetchModerationQueue(), fetchModeratorReports()]);
    if (q.ok) setItems(q.data); else { setItems([]); setError(q.error); }
    if (r.ok) setReports(r.data); else { setReports([]); setError(r.error); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const act = async (item: ModerationItem, action: 'approve' | 'remove') => {
    if (action === 'remove') {
      const ok = await confirm({
        title: `Remove this ${item.kind}?`,
        message: 'The author is told a moderator removed it. The text stays in the audit trail.',
        confirmLabel: 'Remove',
        tone: 'danger',
      });
      if (!ok) return;
    }
    setBusyId(item.id);
    setError('');
    const r = await moderateContentItem({ kind: item.kind, id: item.id, action });
    if (r.ok) { setItems((l) => (l ?? []).filter((x) => x.id !== item.id)); setToast(action === 'approve' ? 'Approved - it is live now' : 'Removed'); }
    else setError(r.error);
    setBusyId(null);
  };

  const resolve = async (report: CommunityReport, action: 'actioned' | 'dismissed') => {
    if (action === 'actioned') {
      const ok = await confirm({
        title: `Remove the reported ${report.targetType}?`,
        message: 'It disappears for members and the report is closed.',
        confirmLabel: 'Remove',
        tone: 'danger',
      });
      if (!ok) return;
    }
    setBusyId(report.id);
    setError('');
    const r = await resolveReportAsModerator({ reportId: report.id, action });
    if (r.ok) { setReports((l) => (l ?? []).filter((x) => x.id !== report.id)); setToast(action === 'actioned' ? 'Removed and closed' : 'Report dismissed'); }
    else setError(r.error);
    setBusyId(null);
  };

  const loading = items === null || reports === null;

  return (
    <div className="mp">
      <header className="cm-screen-head">
        <h1>Moderation</h1>
        <p>What is waiting for you in the groups you look after. Held items were stopped by the automatic check; reported ones were flagged by members.</p>
      </header>

      {error && (
        <div role="alert" className="community-error" style={{ marginBottom: 12 }}>
          <AlertCircle size={15} aria-hidden="true" /> {error}
        </div>
      )}

      <div className="cm-tabs" role="tablist" aria-label="Queue">
        <button type="button" role="tab" aria-selected={tab === 'held'} className={tab === 'held' ? 'is-on' : ''} onClick={() => setTab('held')}>
          <ShieldCheck size={15} aria-hidden="true" /> Held {items && items.length > 0 && <span className="cm-badge">{items.length}</span>}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'reported'} className={tab === 'reported' ? 'is-on' : ''} onClick={() => setTab('reported')}>
          <Flag size={15} aria-hidden="true" /> Reported {reports && reports.length > 0 && <span className="cm-badge">{reports.length}</span>}
        </button>
      </div>

      {loading && <PortalLoading label="Loading the queue" />}

      {!loading && tab === 'held' && (
        items!.length === 0 ? (
          <div className="cm-empty">
            <ShieldCheck size={24} aria-hidden="true" />
            <p><strong>Nothing held.</strong></p>
            <p>When the automatic check holds a post or comment in a group you moderate, it appears here with its reasons.</p>
          </div>
        ) : (
          <div className="md-list">
            {items!.map((it) => (
              <article key={it.id} className="md-item">
                <div className="md-item-head">
                  <span className="cm-tag">{it.kind === 'post' ? 'Post' : 'Comment'}</span>
                  {it.groupName
                    ? <Link href={`/portal/member/community/groups/${it.groupId}`} className="cm-tag cm-tag--link"><UsersRound size={12} aria-hidden="true" /> {it.groupName}</Link>
                    : <span className="cm-tag">Club-wide</span>}
                  <small>{when(it.createdAt)}</small>
                </div>
                <p className="md-item-author">
                  {it.authorId
                    ? <Link href={`/portal/member/people/${it.authorId}`}>{[it.authorFirstName, it.authorLastName].filter(Boolean).join(' ') || 'Member'}</Link>
                    : 'A business'}
                </p>
                <blockquote className="md-item-body">{it.body.trim() || '(no text)'}</blockquote>
                {it.media.length > 0 && (
                  <div className="md-item-media">
                    {(it.media as { url: string; type: string }[]).map((m) => (
                      m.type === 'image'
                        ? <img key={m.url} src={m.url} alt="" />
                        : <video key={m.url} src={m.url} muted playsInline preload="metadata" />
                    ))}
                  </div>
                )}
                {Array.isArray((it.moderation as { reasons?: string[] } | null)?.reasons) && (
                  <p className="md-item-reasons">
                    <Sparkles size={12} aria-hidden="true" /> Held for: {((it.moderation as { reasons: string[] }).reasons).join(', ')}
                    {(it.moderation as { engine?: string }).engine === 'rules+claude' ? ' · checked by rules and AI' : ' · checked by rules'}
                  </p>
                )}
                <div className="cm-person-actions" style={{ justifyContent: 'flex-end' }}>
                  <Link href={`/portal/member/community/posts/${it.postId}`} className="cm-btn cm-btn--ghost">Open</Link>
                  <button type="button" className="cm-btn cm-btn--secondary" disabled={busyId === it.id} onClick={() => void act(it, 'remove')}>
                    <Trash2 size={15} aria-hidden="true" /> Remove
                  </button>
                  <button type="button" className="cm-btn cm-btn--primary" disabled={busyId === it.id} onClick={() => void act(it, 'approve')}>
                    <Check size={15} aria-hidden="true" /> Approve
                  </button>
                </div>
              </article>
            ))}
          </div>
        )
      )}

      {!loading && tab === 'reported' && (
        reports!.length === 0 ? (
          <div className="cm-empty">
            <Flag size={24} aria-hidden="true" />
            <p><strong>No open reports.</strong></p>
            <p>Reports on posts and comments in your groups land here.</p>
          </div>
        ) : (
          <div className="md-list">
            {reports!.map((r) => (
              <article key={r.id} className="md-item">
                <div className="md-item-head">
                  <span className="cm-tag"><Flag size={12} aria-hidden="true" /> {r.targetType}</span>
                  <small>{when(r.createdAt)}</small>
                </div>
                <p className="md-item-author"><strong>Reason:</strong> {r.reason}</p>
                <blockquote className="md-item-body">{r.targetBody?.trim() || '(content unavailable)'}</blockquote>
                <div className="cm-person-actions" style={{ justifyContent: 'flex-end' }}>
                  {r.targetType === 'post' && (
                    <Link href={`/portal/member/community/posts/${r.targetId}`} className="cm-btn cm-btn--ghost">Open</Link>
                  )}
                  <button type="button" className="cm-btn cm-btn--secondary" disabled={busyId === r.id} onClick={() => void resolve(r, 'dismissed')}>
                    <ShieldOff size={15} aria-hidden="true" /> Dismiss
                  </button>
                  <button type="button" className="cm-btn cm-btn--primary" disabled={busyId === r.id} onClick={() => void resolve(r, 'actioned')}>
                    <Trash2 size={15} aria-hidden="true" /> Remove content
                  </button>
                </div>
              </article>
            ))}
          </div>
        )
      )}

      {toast && <div className="pp-toast" role="status"><Check size={15} aria-hidden="true" /> {toast}</div>}
    </div>
  );
}
