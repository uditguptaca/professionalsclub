'use client';
import React, { useState } from 'react';
import { usePortal } from '@/context/portal-context';
import { Heart, Pencil, X, DollarSign } from 'lucide-react';

export default function DonationsManagementPage() {
  const { donationCampaigns, updateDonationCampaign } = usePortal();
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string | number | boolean>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openEdit = (item: typeof donationCampaigns[0]) => {
    setEditId(item.id);
    setFormError(null);
    setForm({ title: item.title, description: item.description, goalAmount: item.goalAmount, raisedAmount: item.raisedAmount, isActive: item.isActive });
  };
  const closeModal = () => { setEditId(null); setForm({}); setFormError(null); };
  // Backdrop and X are inert mid-save, so a write in flight cannot be dismissed
  // before its result is known.
  const dismiss = () => { if (!saving) closeModal(); };
  const handleChange = (key: string, val: string | number | boolean) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!editId) return;

    setSaving(true);
    setFormError(null);
    const result = await updateDonationCampaign(editId, {
      title: String(form.title),
      description: String(form.description),
      goalAmount: Number(form.goalAmount),
      raisedAmount: Number(form.raisedAmount),
      isActive: Boolean(form.isActive),
    });
    setSaving(false);

    // Modal stays open on failure: closing it would look like the write landed
    // and would throw away everything the admin typed.
    if (!result.ok) { setFormError(result.error); return; }
    closeModal();
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: '0.9rem',  background: 'var(--bg-primary)' };
  const labelStyle: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' };

  return (
    <>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 8 }}>Donations Manager</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>Manage donation campaigns displayed on the public Donate page.</p>

      <div className="mobile-stack" style={{ display: 'grid', gap: 24 }}>
        {donationCampaigns.map(campaign => {
          const pct = campaign.goalAmount > 0 ? Math.min(100, (campaign.raisedAmount / campaign.goalAmount) * 100) : 0;
          return (
            <div key={campaign.id} className="card" style={{ padding: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: campaign.isActive ? 'var(--success-50)' : 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Heart size={24} color={campaign.isActive ? 'var(--success-600)' : 'var(--text-muted)'} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{campaign.title}</h2>
                    <span style={{ padding: '2px 8px', background: campaign.isActive ? 'var(--success-50)' : 'var(--bg-secondary)', color: campaign.isActive ? 'var(--success-600)' : 'var(--gray-400)', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700 }}>{campaign.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
                <button className="btn btn-ghost" onClick={() => openEdit(campaign)} style={{ padding: '8px 12px' }}><Pencil size={16} /> Edit</button>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 24 }}>{campaign.description}</p>

              <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginBottom: 24 }}>
                <div style={{ padding: 20, background: 'var(--bg-secondary)', borderRadius: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Goal</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>${campaign.goalAmount.toLocaleString()}</div>
                </div>
                <div style={{ padding: 20, background: 'var(--bg-secondary)', borderRadius: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Raised</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success-600)' }}>${campaign.raisedAmount.toLocaleString()}</div>
                </div>
                <div style={{ padding: 20, background: 'var(--bg-secondary)', borderRadius: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Progress</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-accent)' }}>{pct.toFixed(0)}%</div>
                </div>
              </div>

              <div style={{ width: '100%', height: 10, background: 'var(--border-color)', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, var(--success-600), var(--success-400))', borderRadius: 5, transition: 'width 0.5s ease' }} />
              </div>
            </div>
          );
        })}
      </div>

      {editId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }} onClick={dismiss}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 32, width: 520, boxShadow: 'var(--shadow-xl)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Edit Campaign</h3>
              <button onClick={dismiss} disabled={saving} style={{ background: 'none', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label style={labelStyle}>Campaign Title</label><input style={inputStyle} value={String(form.title || '')} onChange={e => handleChange('title', e.target.value)} /></div>
              <div><label style={labelStyle}>Description</label><textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={String(form.description || '')} onChange={e => handleChange('description', e.target.value)} /></div>
              <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Goal Amount ($)</label><input type="number" style={inputStyle} value={String(form.goalAmount || '')} onChange={e => handleChange('goalAmount', Number(e.target.value))} /></div>
                <div><label style={labelStyle}>Raised Amount ($)</label><input type="number" style={inputStyle} value={String(form.raisedAmount || '')} onChange={e => handleChange('raisedAmount', Number(e.target.value))} /></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={Boolean(form.isActive)} onChange={e => handleChange('isActive', e.target.checked)} />
                <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Campaign is Active</label>
              </div>
              {formError && <p role="alert" className="community-error">{formError}</p>}
              <button className="btn btn-primary" style={{ marginTop: 8, width: '100%' }} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
