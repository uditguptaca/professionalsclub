'use client';
import React, { useState, useMemo } from 'react';
import { usePortal } from '@/context/portal-context';
import {
  ShieldCheck, Star, Tag, MapPin, Building2, CheckCircle, XCircle,
  Eye, ToggleLeft, ToggleRight, Clock, AlertTriangle,
} from 'lucide-react';
import type { BusinessStatus } from '@/types';

export default function AdminBusinesses() {
  const { businesses, businessContactRequests, updateBusinessStatus, toggleBusinessFeatured } = usePortal();
  const [statusFilter, setStatusFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');

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
    verified: '#059669', featured: '#d97706', pending_review: '#6366f1', rejected: '#ef4444', draft: '#9ca3af', inactive: '#6b7280',
  };

  return (
    <div className="animate-fade-in flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-display font-bold mb-2">Business Directory Management</h1>
        <p className="text-secondary">Manage verified businesses, approve listings, and configure member rates.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: 'Total Businesses', value: businesses.length, icon: <Building2 size={22} />, color: '#374151', bg: '#f3f4f6' },
          { label: 'Verified', value: verified, icon: <ShieldCheck size={22} />, color: '#059669', bg: 'rgba(5,150,105,0.1)' },
          { label: 'Featured', value: featured, icon: <Star size={22} />, color: '#d97706', bg: 'rgba(245,158,11,0.1)' },
          { label: 'Pending Review', value: pending, icon: <Clock size={22} />, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
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
                    onClick={() => toggleBusinessFeatured(biz.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: biz.isFeatured ? '#d97706' : 'var(--gray-300)' }}
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
                        <button type="button" className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '0.72rem' }} onClick={() => updateBusinessStatus(biz.id, 'verified')}>
                          <CheckCircle size={12} /> Verify
                        </button>
                        <button type="button" className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: '0.72rem', color: '#ef4444' }} onClick={() => updateBusinessStatus(biz.id, 'rejected')}>
                          <XCircle size={12} /> Reject
                        </button>
                      </>
                    )}
                    {biz.verificationStatus === 'verified' && (
                      <button type="button" className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: '0.72rem' }} onClick={() => updateBusinessStatus(biz.id, 'inactive')}>
                        Deactivate
                      </button>
                    )}
                    {biz.verificationStatus === 'inactive' && (
                      <button type="button" className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: '0.72rem' }} onClick={() => updateBusinessStatus(biz.id, 'verified')}>
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
        <div style={{ padding: '16px 20px', borderRadius: 12, background: '#fef3c7', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: 12 }}>
          <AlertTriangle size={18} style={{ color: '#92400e' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#92400e' }}>{pendingRequests} pending business contact request{pendingRequests > 1 ? 's' : ''}</div>
            <div style={{ fontSize: '0.78rem', color: '#92400e', opacity: 0.8 }}>Members are waiting for admin-assisted connections.</div>
          </div>
        </div>
      )}
    </div>
  );
}
