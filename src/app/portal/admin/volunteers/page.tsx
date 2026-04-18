'use client';
import React, { useState } from 'react';
import { usePortal } from '@/context/portal-context';
import { HandHeart, CheckCircle, XCircle, Clock, Search } from 'lucide-react';
import type { VolunteerStatus } from '@/types';

export default function AdminVolunteersPage() {
  const { volunteerApps, updateVolunteerStatus } = usePortal();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = volunteerApps
    .filter(a => filter === 'all' || a.status === filter)
    .filter(a => !search || a.memberName.toLowerCase().includes(search.toLowerCase()));

  const handleAction = (id: string, status: VolunteerStatus) => {
    updateVolunteerStatus(id, status);
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 className="text-3xl font-display font-bold mb-2">Volunteer Applications</h1>
        <p className="text-secondary">Review and manage volunteer and mentor applications.</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input className="input" style={{ paddingLeft: 36 }} placeholder="Search volunteers..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input" style={{ width: 200 }} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All ({volunteerApps.length})</option>
          <option value="new_application">New Applications</option>
          <option value="pending_verification">Pending Verification</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="on_hold">On Hold</option>
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 60 }}>
            <HandHeart size={40} style={{ color: '#d1d5db', marginBottom: 12 }} />
            <p className="text-secondary">No volunteer applications match your filters.</p>
          </div>
        ) : (
          filtered.map(app => (
            <div key={app.id} className="card" style={{ padding: '24px 28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                    <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--text-muted)', background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{app.id}</span>
                    <span className={`badge ${app.status === 'approved' ? 'badge-success' : app.status === 'rejected' ? 'badge-error' : 'badge-warning'}`} style={{ textTransform: 'capitalize', fontSize: '0.68rem' }}>
                      {app.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{app.memberName}</h3>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{app.currentProfession} at {app.organization} • {app.yearsExperience} years</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {app.status !== 'approved' && (
                    <button className="btn btn-sm" onClick={() => handleAction(app.id, 'approved')} style={{ background: '#059669', color: 'white', border: 'none', fontSize: '0.72rem' }}>
                      <CheckCircle size={14} /> Approve
                    </button>
                  )}
                  {app.status !== 'rejected' && (
                    <button className="btn btn-outline btn-sm" onClick={() => handleAction(app.id, 'rejected')} style={{ fontSize: '0.72rem', color: '#dc2626', borderColor: '#fecaca' }}>
                      <XCircle size={14} /> Reject
                    </button>
                  )}
                  {!['on_hold'].includes(app.status) && (
                    <button className="btn btn-outline btn-sm" onClick={() => handleAction(app.id, 'on_hold')} style={{ fontSize: '0.72rem' }}>
                      <Clock size={14} /> Hold
                    </button>
                  )}
                </div>
              </div>

              <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
                <div style={{ padding: 10, borderRadius: 8, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase' }}>City</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, marginTop: 2 }}>{app.city}, {app.province}</div>
                </div>
                <div style={{ padding: 10, borderRadius: 8, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase' }}>Languages</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, marginTop: 2 }}>{app.languages.join(', ')}</div>
                </div>
                <div style={{ padding: 10, borderRadius: 8, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase' }}>Availability</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, marginTop: 2 }}>{app.availability}</div>
                </div>
                <div style={{ padding: 10, borderRadius: 8, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase' }}>Max Cases/Month</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, marginTop: 2 }}>{app.maxCasesPerMonth}</div>
                </div>
              </div>

              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Expertise Areas</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {app.expertiseAreas.map(a => (
                    <span key={a} style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: 6, background: 'rgba(5,150,105,0.08)', color: '#065f46', fontWeight: 600 }}>{a}</span>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.6 }}>
                <strong>Motivation:</strong> {app.motivation}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
