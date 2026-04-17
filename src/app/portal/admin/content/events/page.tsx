'use client';
import React, { useState } from 'react';
import { usePortal } from '@/context/portal-context';
import { Calendar, Plus, Pencil, Trash2, X, MapPin, Users, Star } from 'lucide-react';
import type { CommunityEvent, EventType, EventStatus } from '@/types';

export default function EventsManagementPage() {
  const { events, addEvent, updateEvent, deleteEvent } = usePortal();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string | number | boolean>>({});

  const upcomingEvents = events.filter(e => e.status === 'upcoming');
  const pastEvents = events.filter(e => e.status === 'past');

  const openAdd = () => { setShowModal(true); setEditId(null); setForm({}); };
  const openEdit = (item: CommunityEvent) => { setShowModal(true); setEditId(item.id); setForm({ ...item }); };
  const closeModal = () => { setShowModal(false); setEditId(null); setForm({}); };
  const handleChange = (key: string, val: string | number | boolean) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = () => {
    const data = {
      title: String(form.title || 'New Event'),
      description: String(form.description || ''),
      date: String(form.date || new Date().toISOString().split('T')[0]),
      time: String(form.time || '6:00 PM'),
      location: String(form.location || 'Toronto'),
      eventType: (form.eventType as EventType) || 'in_person',
      capacity: Number(form.capacity) || 50,
      attendees: Number(form.attendees) || 0,
      image: String(form.image || '/meetup_bg.png'),
      isFeatured: Boolean(form.isFeatured),
      platform: String(form.platform || ''),
      rsvpUrl: String(form.rsvpUrl || '#'),
      status: (form.status as EventStatus) || 'upcoming',
    };
    if (editId) updateEvent(editId, data);
    else addEvent(data);
    closeModal();
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this event?')) return;
    deleteEvent(id);
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: '0.9rem', outline: 'none', background: 'var(--bg-primary)' };
  const labelStyle: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' };
  const tableHeaderStyle: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', borderBottom: '2px solid var(--border-color)' };
  const tableCellStyle: React.CSSProperties = { padding: '14px 16px', borderBottom: '1px solid var(--border-color)', fontSize: '0.88rem' };
  const actionBtnStyle: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6 };

  const renderTable = (title: string, items: CommunityEvent[], color: string) => (
    <div className="card" style={{ marginBottom: 32, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Calendar size={20} style={{ color }} /><h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{title} ({items.length})</h2></div>
        {title.includes('Upcoming') && <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }} onClick={openAdd}><Plus size={14} /> Add Event</button>}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th style={tableHeaderStyle}>Event</th><th style={tableHeaderStyle}>Date</th><th style={tableHeaderStyle}>Location</th><th style={tableHeaderStyle}>Type</th><th style={tableHeaderStyle}>Attendees</th><th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Actions</th></tr></thead>
        <tbody>
          {items.map(evt => (
            <tr key={evt.id} style={{ transition: 'background 0.15s' }} onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-secondary)')} onMouseOut={e => (e.currentTarget.style.background = '')}>
              <td style={{ ...tableCellStyle, fontWeight: 700 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {evt.isFeatured && <Star size={14} color="#d97706" fill="#d97706" />}
                  {evt.title}
                </div>
              </td>
              <td style={tableCellStyle}>{evt.date}</td>
              <td style={tableCellStyle}><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} />{evt.location}</span></td>
              <td style={tableCellStyle}><span style={{ padding: '2px 8px', background: evt.eventType === 'in_person' ? '#d1fae5' : '#dbeafe', color: evt.eventType === 'in_person' ? '#065f46' : '#1e40af', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700, textTransform: 'capitalize' }}>{evt.eventType.replace('_', '-')}</span></td>
              <td style={tableCellStyle}><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={12} />{evt.attendees}/{evt.capacity}</span></td>
              <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                <button style={actionBtnStyle} onClick={() => openEdit(evt)} title="Edit"><Pencil size={15} color="var(--primary-600)" /></button>
                <button style={actionBtnStyle} onClick={() => handleDelete(evt.id)} title="Delete"><Trash2 size={15} color="var(--error-500)" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 8 }}>Events Manager</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>Manage upcoming and past events displayed on the public Events page.</p>

      {renderTable('Upcoming Events', upcomingEvents, '#059669')}
      {renderTable('Past Events', pastEvents, '#94a3b8')}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }} onClick={closeModal}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 32, width: 560, maxHeight: '80vh', overflow: 'auto', boxShadow: 'var(--shadow-xl)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{editId ? 'Edit Event' : 'Add Event'}</h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label style={labelStyle}>Title</label><input style={inputStyle} value={String(form.title || '')} onChange={e => handleChange('title', e.target.value)} /></div>
              <div><label style={labelStyle}>Description</label><textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={String(form.description || '')} onChange={e => handleChange('description', e.target.value)} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Date</label><input type="date" style={inputStyle} value={String(form.date || '')} onChange={e => handleChange('date', e.target.value)} /></div>
                <div><label style={labelStyle}>Time</label><input style={inputStyle} value={String(form.time || '')} onChange={e => handleChange('time', e.target.value)} placeholder="6:00 PM" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Location</label><input style={inputStyle} value={String(form.location || '')} onChange={e => handleChange('location', e.target.value)} /></div>
                <div><label style={labelStyle}>Event Type</label>
                  <select style={inputStyle} value={String(form.eventType || 'in_person')} onChange={e => handleChange('eventType', e.target.value)}>
                    <option value="in_person">In-Person</option><option value="virtual">Virtual</option><option value="hybrid">Hybrid</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Capacity</label><input type="number" style={inputStyle} value={String(form.capacity || '')} onChange={e => handleChange('capacity', Number(e.target.value))} /></div>
                <div><label style={labelStyle}>Attendees</label><input type="number" style={inputStyle} value={String(form.attendees || '')} onChange={e => handleChange('attendees', Number(e.target.value))} /></div>
              </div>
              <div><label style={labelStyle}>Image Path</label><input style={inputStyle} value={String(form.image || '')} onChange={e => handleChange('image', e.target.value)} placeholder="/meetup_bg.png" /></div>
              <div><label style={labelStyle}>Platform (for virtual)</label><input style={inputStyle} value={String(form.platform || '')} onChange={e => handleChange('platform', e.target.value)} placeholder="YouTube Live" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Status</label>
                  <select style={inputStyle} value={String(form.status || 'upcoming')} onChange={e => handleChange('status', e.target.value)}>
                    <option value="upcoming">Upcoming</option><option value="past">Past</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 24 }}>
                  <input type="checkbox" checked={Boolean(form.isFeatured)} onChange={e => handleChange('isFeatured', e.target.checked)} />
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Featured Event</label>
                </div>
              </div>
              <button className="btn btn-primary" style={{ marginTop: 8, width: '100%' }} onClick={handleSave}>{editId ? 'Save Changes' : 'Add Event'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
