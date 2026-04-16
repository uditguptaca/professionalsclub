'use client';
import React, { useState } from 'react';
import { usePortal } from '@/context/portal-context';
import { ScrollText, Search } from 'lucide-react';

export default function AdminAuditPage() {
  const { auditLog } = usePortal();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  const actionTypes = [...new Set(auditLog.map(l => l.actionType))];
  const filtered = auditLog
    .filter(l => filterType === 'all' || l.actionType === filterType)
    .filter(l => !search || l.description.toLowerCase().includes(search.toLowerCase()) || l.actorName.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 className="text-3xl font-display font-bold mb-2">Audit Log</h1>
        <p className="text-secondary">Complete history of all admin and system actions for compliance and review.</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input className="input" style={{ paddingLeft: 36 }} placeholder="Search audit log..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input" style={{ width: 220 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">All Actions ({auditLog.length})</option>
          {actionTypes.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
              {['Timestamp', 'Actor', 'Role', 'Action', 'Target', 'Description'].map(h => (
                <th key={h} style={{ padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No audit entries match.</td></tr>
            ) : (
              filtered.map(entry => (
                <tr key={entry.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 16px', fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(entry.timestamp).toLocaleString()}</td>
                  <td style={{ padding: '10px 16px', fontSize: '0.82rem', fontWeight: 600 }}>{entry.actorName}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 4, background: entry.actorRole === 'admin' ? 'rgba(99,102,241,0.08)' : '#f3f4f6', color: entry.actorRole === 'admin' ? '#4338ca' : '#374151' }}>{entry.actorRole}</span>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: '0.78rem' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, background: '#f3f4f6', fontSize: '0.72rem', fontWeight: 600 }}>{entry.actionType.replace(/_/g, ' ')}</span>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{entry.targetId}</td>
                  <td style={{ padding: '10px 16px', fontSize: '0.82rem', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.description}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
