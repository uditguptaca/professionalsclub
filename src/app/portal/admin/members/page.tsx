'use client';
import React, { useState } from 'react';
import { usePortal } from '@/context/portal-context';
import { Users, Search, CheckCircle, Clock, XCircle, Shield, Ban } from 'lucide-react';

export default function AdminMembersPage() {
  const { members } = usePortal();
  const [search, setSearch] = useState('');

  const filtered = members.filter(m =>
    !search || `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 className="text-3xl font-display font-bold mb-2">Members</h1>
        <p className="text-secondary">View and manage all registered community members.</p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input className="input" style={{ paddingLeft: 36 }} placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
              {['Name', 'Email', 'Location', 'PC Number', 'Roles', 'Verification', 'Status'].map(h => (
                <th key={h} style={{ padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => (
              <tr key={m.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.85rem' }}>{m.firstName} {m.lastName}</td>
                <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{m.email}</td>
                <td style={{ padding: '12px 16px', fontSize: '0.82rem' }}>{m.city}, {m.province}</td>
                <td style={{ padding: '12px 16px', fontSize: '0.75rem', fontFamily: 'monospace' }}>{m.pcNumber || '—'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {m.roleFlags.isHelpSeeker && <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(99,102,241,0.08)', color: '#4338ca', fontWeight: 600 }}>Seeker</span>}
                    {m.roleFlags.isVolunteer && <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(5,150,105,0.08)', color: '#065f46', fontWeight: 600 }}>Volunteer</span>}
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 600, color: m.verificationStatus === 'verified' ? '#059669' : m.verificationStatus === 'pending' ? '#d97706' : '#9ca3af' }}>
                    {m.verificationStatus === 'verified' ? <CheckCircle size={14} /> : m.verificationStatus === 'pending' ? <Clock size={14} /> : <XCircle size={14} />}
                    {m.verificationStatus}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span className={`badge ${m.accountStatus === 'active' ? 'badge-success' : 'badge-error'}`} style={{ textTransform: 'capitalize', fontSize: '0.65rem' }}>{m.accountStatus}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
