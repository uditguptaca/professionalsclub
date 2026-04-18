'use client';
import React, { useState } from 'react';
import { usePortal } from '@/context/portal-context';
import { UsersRound, Plus, Pencil, Trash2, X, GripVertical } from 'lucide-react';
import type { TeamMember } from '@/types';

export default function TeamManagementPage() {
  const { teamMembers, addTeamMember, updateTeamMember, deleteTeamMember } = usePortal();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string | number>>({});

  const sorted = [...teamMembers].sort((a, b) => a.order - b.order);

  const openAdd = () => { setShowModal(true); setEditId(null); setForm({ order: teamMembers.length + 1 }); };
  const openEdit = (item: TeamMember) => { setShowModal(true); setEditId(item.id); setForm({ ...item }); };
  const closeModal = () => { setShowModal(false); setEditId(null); setForm({}); };
  const handleChange = (key: string, val: string | number) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = () => {
    const data = {
      name: String(form.name || 'New Team Member'),
      role: String(form.role || 'Member'),
      bio: String(form.bio || ''),
      image: String(form.image || '/hero-community.png'),
      linkedinUrl: String(form.linkedinUrl || '#'),
      order: Number(form.order) || teamMembers.length + 1,
    };
    if (editId) updateTeamMember(editId, data);
    else addTeamMember(data);
    closeModal();
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this team member?')) return;
    deleteTeamMember(id);
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: '0.9rem', outline: 'none', background: 'var(--bg-primary)' };
  const labelStyle: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 8 }}>Team Manager</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage the team members displayed on the public Team page.</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Member</button>
      </div>

      <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        {sorted.map(member => (
          <div key={member.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ height: 160, background: `url(${member.image}) center/cover no-repeat`, position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.9), transparent)' }} />
              <div style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 5 }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white' }}>{member.name}</div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{member.role}</div>
              </div>
              <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 4, zIndex: 5 }}>
                <button onClick={() => openEdit(member)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6, padding: 6, cursor: 'pointer', backdropFilter: 'blur(4px)' }}><Pencil size={14} color="white" /></button>
                <button onClick={() => handleDelete(member.id)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6, padding: 6, cursor: 'pointer', backdropFilter: 'blur(4px)' }}><Trash2 size={14} color="#fca5a5" /></button>
              </div>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{member.bio}</p>
              <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Order: {member.order}</div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }} onClick={closeModal}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 32, width: 520, maxHeight: '80vh', overflow: 'auto', boxShadow: 'var(--shadow-xl)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{editId ? 'Edit Team Member' : 'Add Team Member'}</h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label style={labelStyle}>Full Name</label><input style={inputStyle} value={String(form.name || '')} onChange={e => handleChange('name', e.target.value)} /></div>
              <div><label style={labelStyle}>Role / Title</label><input style={inputStyle} value={String(form.role || '')} onChange={e => handleChange('role', e.target.value)} /></div>
              <div><label style={labelStyle}>Bio</label><textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={String(form.bio || '')} onChange={e => handleChange('bio', e.target.value)} /></div>
              <div><label style={labelStyle}>Image Path</label><input style={inputStyle} value={String(form.image || '')} onChange={e => handleChange('image', e.target.value)} placeholder="/hero-community.png" /></div>
              <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>LinkedIn URL</label><input style={inputStyle} value={String(form.linkedinUrl || '')} onChange={e => handleChange('linkedinUrl', e.target.value)} /></div>
                <div><label style={labelStyle}>Display Order</label><input type="number" style={inputStyle} value={String(form.order || '')} onChange={e => handleChange('order', Number(e.target.value))} /></div>
              </div>
              <button className="btn btn-primary" style={{ marginTop: 8, width: '100%' }} onClick={handleSave}>{editId ? 'Save Changes' : 'Add Member'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
