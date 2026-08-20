'use client';
import React from 'react';
import Link from 'next/link';
import { usePortal } from '@/context/portal-context';
import { useApp } from '@/context/app-context';
import PortalLoading from '@/components/portal/PortalLoading';
import { FileText, ChevronRight, Clock, CheckCircle, AlertTriangle, XCircle, Plus } from 'lucide-react';

/**
 * My requests: one glanceable row per case — status chip, reference, title —
 * in the portal's grouped-row language. The detail page carries everything else.
 */

/** Chip and row-icon colours per status. Tokens only: no orange text below AA. */
const statusTone = (status: string): { bg: string; fg: string } => {
  if (['resolved', 'closed'].includes(status)) return { bg: 'rgba(22,163,74,0.10)', fg: 'var(--success-600)' };
  if (['rejected'].includes(status)) return { bg: 'var(--error-50)', fg: 'var(--error-600)' };
  if (['escalated'].includes(status)) return { bg: 'rgba(245,158,11,0.12)', fg: 'var(--accent-700)' };
  return { bg: 'rgba(232,93,4,0.09)', fg: 'var(--primary-800)' };
};

const statusIcon = (status: string) => {
  if (['resolved', 'closed'].includes(status)) return <CheckCircle size={17} />;
  if (['rejected'].includes(status)) return <XCircle size={17} />;
  if (['escalated'].includes(status)) return <AlertTriangle size={17} />;
  return <Clock size={17} />;
};

const sentence = (text: string) => {
  const words = text.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

export default function MyRequestsPage() {
  const { helpRequests, loading } = usePortal();
  const { currentUserId } = useApp();
  const myRequests = helpRequests.filter(r => r.memberId === currentUserId);

  if (loading && helpRequests.length === 0) return <PortalLoading label="Loading your requests" />;

  return (
    <div className="pp2 animate-fade-in">
      <header style={{ marginBottom: 18 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800,
          letterSpacing: '-0.01em', margin: '0 0 6px',
        }}>
          My requests
        </h1>
        <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.55, color: 'var(--text-secondary)' }}>
          Every case you have filed, and where it stands.
        </p>
      </header>

      {myRequests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
          <FileText size={28} style={{ opacity: 0.35 }} aria-hidden="true" />
          <p style={{ margin: '0.9rem 0 1.2rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            You have not asked for help yet.
          </p>
          <Link href="/portal/member/request-help" className="btn btn-primary">Request help</Link>
        </div>
      ) : (
        <div className="pp-groups">
          <section className="pp-group">
            <div className="pp-group-card">
              <Link href="/portal/member/request-help" className="pp-row pp-row-add">
                <span className="pp-row-icon"><Plus size={17} /></span>
                <span className="pp-row-body"><strong>New request</strong></span>
                <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
              </Link>

              {myRequests.map(req => {
                const tone = statusTone(req.status);
                return (
                  <Link key={req.id} href={`/portal/member/my-requests/${req.id}`} className="pp-row">
                    <span className="pp-row-icon" style={{ background: tone.bg, color: tone.fg }}>
                      {statusIcon(req.status)}
                    </span>
                    <span className="pp-row-body">
                      <small style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {req.reference} · {new Date(req.createdAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </small>
                      <strong>{req.title}</strong>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, minWidth: 0 }}>
                        <span className="pp-chip" style={{ background: tone.bg, color: tone.fg, flexShrink: 0 }}>
                          {sentence(req.status)}
                        </span>
                        <span style={{
                          fontSize: '0.74rem', color: 'var(--text-muted)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {sentence(req.urgency)} priority · {req.category}
                        </span>
                      </span>
                    </span>
                    <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
