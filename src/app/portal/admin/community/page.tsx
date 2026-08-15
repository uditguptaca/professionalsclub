'use client';
import React, { useCallback, useEffect, useState } from 'react';
import type { CommunityReport, CommunityReportStatus } from '@/types';
import { fetchCommunityReports, resolveCommunityReport } from '@/app/actions/community';
import { Flag, ShieldOff, ShieldCheck, Loader2 } from 'lucide-react';

/**
 * Moderation queue for community content. Reports arrive from members
 * (post/comment + reason); an admin either removes the content ("actioned")
 * or dismisses the report. Removed content keeps its body for the audit
 * trail but disappears from every member-facing query via RLS.
 */
export default function CommunityModerationPage() {
  const [status, setStatus] = useState<CommunityReportStatus>('open');
  const [reports, setReports] = useState<CommunityReport[] | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (s: CommunityReportStatus) => {
    setReports(null);
    const r = await fetchCommunityReports(s);
    if (r.ok) setReports(r.data);
    else setError(r.error);
  }, []);

  useEffect(() => { load(status); }, [status, load]);

  const resolve = async (reportId: string, action: 'actioned' | 'dismissed') => {
    setBusyId(reportId);
    const r = await resolveCommunityReport({ reportId, action });
    if (r.ok) setReports((rs) => (rs ?? []).filter((x) => x.id !== reportId));
    else setError(r.error);
    setBusyId(null);
  };

  return (
    <div className="community-page">
      <div className="community-page-head">
        <div>
          <h1>Community moderation</h1>
          <p>Member reports on posts and comments. Removing keeps the content for the audit trail but hides it from members.</p>
        </div>
        <div className="community-tabs" role="tablist" aria-label="Report status">
          {(['open', 'actioned', 'dismissed'] as const).map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={status === s}
              className={`community-tab ${status === s ? 'active' : ''}`}
              onClick={() => setStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="community-error">{error}</p>}
      {reports === null && !error && <div className="card community-post community-skeleton" aria-hidden="true" />}
      {reports?.length === 0 && (
        <div className="card community-empty">
          <Flag size={22} aria-hidden="true" />
          <p>No {status} reports.</p>
        </div>
      )}

      {reports?.map((report) => (
        <div key={report.id} className="card community-report">
          <div className="community-report-meta">
            <span className={`pill ${status === 'open' ? 'pill-cream' : 'pill-green'}`}>
              <Flag size={12} /> {report.targetType}
            </span>
            <small>{new Date(report.createdAt).toLocaleString('en-CA')}</small>
          </div>

          <p className="community-report-reason"><strong>Reason:</strong> {report.reason}</p>

          <blockquote className="community-report-quote">
            {report.targetBody ?? <em>Content already deleted by its author.</em>}
          </blockquote>

          {status === 'open' && (
            <div className="community-report-actions">
              <button
                className="btn btn-sm"
                style={{ background: 'var(--error-600)', color: '#fff', border: 'none' }}
                onClick={() => resolve(report.id, 'actioned')}
                disabled={busyId === report.id}
              >
                {busyId === report.id ? <Loader2 size={14} className="spin" /> : <ShieldOff size={14} />}
                Remove content
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => resolve(report.id, 'dismissed')}
                disabled={busyId === report.id}
              >
                <ShieldCheck size={14} /> Dismiss report
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
