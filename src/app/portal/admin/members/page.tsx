'use client';
import React, { useState } from 'react';
import { usePortal } from '@/context/portal-context';
import { updateMemberVerification, updateMemberAccountStatus } from '@/app/actions/portal';
import type { ActionResult } from '@/app/actions/portal';
import type { Member } from '@/types';
import { Search, CheckCircle, Clock, XCircle } from 'lucide-react';

/**
 * The three values profiles.verification_status accepts (see the check
 * constraint in db/migrations/0001_core_schema.sql). The action signature is
 * narrowed to the same three, so there is no control here that always fails.
 */
const VERIFICATION: Member['verificationStatus'][] = ['unverified', 'pending', 'verified'];
const ACCOUNT: Member['accountStatus'][] = ['active', 'suspended', 'archived'];

/** Both consequential transitions say what the member loses, in the member's terms. */
const confirmCopy = (name: string, status: Member['accountStatus']) =>
  status === 'suspended'
    ? `Suspend ${name}? A suspended member cannot sign in until an admin sets the account back to active.`
    : `Archive ${name}? An archived member cannot sign in and the account is closed. The record is kept.`;

export default function AdminMembersPage() {
  const { members } = usePortal();
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // The portal snapshot has no per-member setter, so the returned row is held
  // here and merged over the context list. Avoids refetching the whole snapshot
  // to show one status change.
  const [updated, setUpdated] = useState<Record<string, Member>>({});

  /**
   * One row locks until the write returns, and a failure is shown rather than
   * leaving the select looking changed when nothing was written.
   */
  const runRowAction = async (id: string, write: () => Promise<ActionResult<Member>>) => {
    setActionError(null);
    setBusyId(id);
    const result = await write();
    setBusyId(null);
    if (result.ok) setUpdated(prev => ({ ...prev, [id]: result.data }));
    else setActionError(result.error);
  };

  const setVerification = (m: Member, status: Member['verificationStatus']) =>
    runRowAction(m.id, () => updateMemberVerification({ memberId: m.id, status }));

  const setAccountStatus = (m: Member, status: Member['accountStatus']) => {
    const name = `${m.firstName} ${m.lastName}`.trim() || m.email;
    if (status !== 'active' && !window.confirm(confirmCopy(name, status))) return;
    return runRowAction(m.id, () => updateMemberAccountStatus({ memberId: m.id, status }));
  };

  const rows = members.map(m => updated[m.id] ?? m);
  const filtered = rows.filter(m =>
    !search || `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase())
  );

  const controlStyle: React.CSSProperties = { padding: '4px 8px', fontSize: '0.72rem', minWidth: 118, textTransform: 'capitalize' };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 className="text-3xl font-display font-bold mb-2">Members</h1>
        <p className="text-secondary">View and manage all registered community members.</p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" style={{ paddingLeft: 36 }} placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {actionError && <p role="alert" className="community-error" style={{ marginBottom: 16 }}>{actionError}</p>}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
              {['Name', 'Email', 'Location', 'PC Number', 'Roles', 'Verification', 'Status'].map(h => (
                <th key={h} style={{ padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => (
              <tr key={m.id} style={{ borderBottom: '1px solid var(--bg-secondary)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.85rem' }}>{m.firstName} {m.lastName}</td>
                <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{m.email}</td>
                <td style={{ padding: '12px 16px', fontSize: '0.82rem' }}>{m.city}, {m.province}</td>
                <td style={{ padding: '12px 16px', fontSize: '0.75rem', fontFamily: 'monospace' }}>{m.pcNumber || '-'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {m.isHelpSeeker && <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(232, 93, 4, 0.08)', color: 'var(--primary-700)', fontWeight: 600 }}>Seeker</span>}
                    {m.isVolunteer && <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(5,150,105,0.08)', color: 'var(--success-600)', fontWeight: 600 }}>Volunteer</span>}
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ display: 'inline-flex', color: m.verificationStatus === 'verified' ? 'var(--success-600)' : m.verificationStatus === 'pending' ? 'var(--accent-600)' : 'var(--text-muted)' }}>
                      {m.verificationStatus === 'verified' ? <CheckCircle size={14} /> : m.verificationStatus === 'pending' ? <Clock size={14} /> : <XCircle size={14} />}
                    </span>
                    <select
                      className="input"
                      style={controlStyle}
                      aria-label={`Verification for ${m.firstName} ${m.lastName}`}
                      value={m.verificationStatus}
                      disabled={busyId === m.id}
                      onChange={e => setVerification(m, e.target.value as Member['verificationStatus'])}
                    >
                      {VERIFICATION.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <select
                    className="input"
                    style={{ ...controlStyle, minWidth: 108, color: m.accountStatus === 'active' ? 'var(--success-600)' : 'var(--error-500)', fontWeight: 600 }}
                    aria-label={`Account status for ${m.firstName} ${m.lastName}`}
                    value={m.accountStatus}
                    disabled={busyId === m.id}
                    onChange={e => setAccountStatus(m, e.target.value as Member['accountStatus'])}
                  >
                    {ACCOUNT.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 28, textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {members.length === 0 ? 'No members have registered yet.' : 'No members match that search.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
