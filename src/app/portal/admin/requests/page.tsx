'use client';
import React, { useState } from 'react';
import { usePortal } from '@/context/portal-context';
import { FileText, Clock, CheckCircle, AlertTriangle, XCircle, Search } from 'lucide-react';
import Link from 'next/link';

const ALL_STATUSES = ['submitted', 'under_review', 'need_more_info', 'waiting_for_member', 'approved', 'assigned', 'volunteer_responded', 'admin_reviewing', 'response_sent', 'in_progress', 'resolved', 'closed', 'rejected', 'escalated', 'archived'];

export default function AdminRequestsPage() {
  const { helpRequests } = usePortal();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = helpRequests
    .filter(r => filter === 'all' || r.status === filter)
    .filter(r => !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.memberName.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 className="text-3xl font-display font-bold mb-2">Help Requests</h1>
        <p className="text-secondary">Review, manage, and assign all incoming help requests.</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input className="input" style={{ paddingLeft: 36 }} placeholder="Search by title or member..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input" style={{ width: 200 }} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All Statuses ({helpRequests.length})</option>
          {ALL_STATUSES.map(s => {
            const count = helpRequests.filter(r => r.status === s).length;
            return count > 0 ? <option key={s} value={s}>{s.replace(/_/g, ' ')} ({count})</option> : null;
          })}
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
              {['Case ID', 'Member', 'Category', 'Title', 'Priority', 'Status', 'Date', ''].map(h => (
                <th key={h} style={{ padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No requests match your filters.</td></tr>
            ) : (
              filtered.map(req => (
                <tr key={req.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{req.id}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: 600 }}>{req.memberName}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.78rem' }}>{req.category.split(' ').slice(0, 3).join(' ')}...</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.title}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 4,
                      background: req.urgency === 'critical' ? '#fef2f2' : req.urgency === 'high' ? '#fff7ed' : req.urgency === 'medium' ? '#fffbeb' : '#f0fdf4',
                      color: req.urgency === 'critical' ? '#991b1b' : req.urgency === 'high' ? '#9a3412' : req.urgency === 'medium' ? '#92400e' : '#166534',
                    }}>{req.urgency}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className={`badge ${
                      ['resolved', 'closed'].includes(req.status) ? 'badge-success' :
                      ['submitted', 'under_review'].includes(req.status) ? 'badge-warning' :
                      req.status === 'rejected' ? 'badge-error' : 'badge-primary'
                    }`} style={{ textTransform: 'capitalize', fontSize: '0.65rem' }}>
                      {req.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{new Date(req.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <Link href={`/portal/admin/requests/${req.id}`} className="btn btn-outline btn-sm" style={{ fontSize: '0.72rem' }}>Open</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
