'use client';
import React, { useState, useMemo } from 'react';
import { usePortal } from '@/context/portal-context';
import {
  ShieldCheck, Star, Tag, MapPin, Building2, CheckCircle, XCircle,
  Eye, ToggleLeft, ToggleRight, Clock, AlertTriangle,
} from 'lucide-react';
import type { Business, BusinessStatus } from '@/types';
import type { ActionResult } from '@/app/actions/portal';

export default function AdminBusinesses() {
  const { businesses, businessContactRequests, updateBusinessStatus, toggleBusinessFeatured } = usePortal();
  const [statusFilter, setStatusFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  /**
   * Both row actions settle the same way: the row locks until the write returns,
   * and a failure is shown rather than leaving the table looking updated when
   * nothing was written.
   */
  const runRowAction = async (id: string, write: () => Promise<ActionResult<Business>>) => {
    setActionError(null);
    setBusyId(id);
    const result = await write();
    setBusyId(null);
    if (!result.ok) setActionError(result.error);
  };

  const setStatus = (id: string, status: BusinessStatus) =>
    runRowAction(id, () => updateBusinessStatus(id, status));

  const filtered = useMemo(() => {
    let result = [...businesses];
    if (statusFilter) result = result.filter(b => b.verificationStatus === statusFilter);
    if (catFilter) result = result.filter(b => b.category === catFilter);
    return result;
  }, [businesses, statusFilter, catFilter]);

  const verified = businesses.filter(b => b.verificationStatus === 'verified').length;
  const featured = businesses.filter(b => b.isFeatured).length;
  const pending = businesses.filter(b => b.verificationStatus === 'pending_review').length;
  const pendingRequests = businessContactRequests.filter(r => r.status === 'pending').length;

  const statusColors: Record<string, string> = {
    verified: 'var(--success-600)', featured: 'var(--accent-600)', pending_review: 'var(--primary-600)', rejected: 'var(--error-500)', draft: 'var(--text-muted)', inactive: 'var(--text-secondary)',
  };

  return (
    <div className="animate-fade-in flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-display font-bold mb-2">Business Directory Management</h1>
        <p className="text-secondary">Manage verified businesses, approve listings, and configure member rates.</p>
      </div>

      {/* Stats */}
      <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: 'Total Businesses', value: businesses.length, icon: <Building2 size={22} />, color: 'var(--text-primary)', bg: 'var(--bg-secondary)' },
          { label: 'Verified', value: verified, icon: <ShieldCheck size={22} />, color: 'var(--success-600)', bg: 'rgba(5,150,105,0.1)' },
          { label: 'Featured', value: featured, icon: <Star size={22} />, color: 'var(--accent-600)', bg: 'rgba(245,158,11,0.1)' },
          { label: 'Pending Review', value: pending, icon: <Clock size={22} />, color: 'var(--primary-600)', bg: 'rgba(232, 93, 4, 0.1)' },
        ].map((s, i) => (
          <div key={i} className="card-stat">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: 10, background: s.bg, borderRadius: 10, color: s.color }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="biz-filter-bar">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ minWidth: 140 }}>
          <option value="">All Statuses</option>
          <option value="verified">Verified</option>
          <option value="pending_review">Pending Review</option>
          <option value="rejected">Rejected</option>
          <option value="draft">Draft</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ minWidth: 160 }}>
          <option value="">All Categories</option>
          {[...new Set(businesses.map(b => b.category))].sort().map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="biz-results-count">{filtered.length} listing{filtered.length !== 1 ? 's' : ''}</div>
      </div>

      {actionError && <p role="alert" className="community-error">{actionError}</p>}

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Business</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Category</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>City</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Featured</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Deal</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(biz => (
              <tr key={biz.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ fontWeight: 700 }}>{biz.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{biz.contactPerson}</div>
                </td>
                <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{biz.category}</td>
                <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}><MapPin size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />{biz.city}</td>
                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700, background: `${statusColors[biz.verificationStatus]}15`, color: statusColors[biz.verificationStatus] }}>
                    {biz.verificationStatus === 'verified' && <ShieldCheck size={11} />}
                    {biz.verificationStatus === 'pending_review' && <Clock size={11} />}
                    {biz.verificationStatus.replace('_', ' ')}
                  </span>
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => runRowAction(biz.id, () => toggleBusinessFeatured(biz.id))}
                    disabled={busyId === biz.id}
                    style={{ background: 'none', border: 'none', cursor: busyId === biz.id ? 'not-allowed' : 'pointer', color: biz.isFeatured ? 'var(--accent-600)' : 'var(--gray-300)' }}
                  >
                    {biz.isFeatured ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                  </button>
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                  {biz.hasMemberRate ? <Tag size={14} style={{ color: 'var(--primary-600)' }} /> : <span style={{ color: 'var(--gray-300)' }}>—</span>}
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    {biz.verificationStatus === 'pending_review' && (
                      <>
                        <button type="button" className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '0.72rem' }} disabled={busyId === biz.id} onClick={() => setStatus(biz.id, 'verified')}>
                          <CheckCircle size={12} /> Verify
                        </button>
                        <button type="button" className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: '0.72rem', color: 'var(--error-500)' }} disabled={busyId === biz.id} onClick={() => setStatus(biz.id, 'rejected')}>
                          <XCircle size={12} /> Reject
                        </button>
                      </>
                    )}
                    {biz.verificationStatus === 'verified' && (
                      <button type="button" className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: '0.72rem' }} disabled={busyId === biz.id} onClick={() => setStatus(biz.id, 'inactive')}>
                        Deactivate
                      </button>
                    )}
                    {biz.verificationStatus === 'inactive' && (
                      <button type="button" className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: '0.72rem' }} disabled={busyId === biz.id} onClick={() => setStatus(biz.id, 'verified')}>
                        Reactivate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pending Contact Requests Alert */}
      {pendingRequests > 0 && (
        <div style={{ padding: '16px 20px', borderRadius: 12, background: 'var(--accent-100)', border: '1px solid var(--accent-200)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <AlertTriangle size={18} style={{ color: 'var(--primary-800)' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary-800)' }}>{pendingRequests} pending business contact request{pendingRequests > 1 ? 's' : ''}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--primary-800)', opacity: 0.8 }}>Members are waiting for admin-assisted connections.</div>
          </div>
        </div>
      )}
    </div>
  );
}
