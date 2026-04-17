'use client';
import React, { useState } from 'react';
import { usePortal } from '@/context/portal-context';
import { BookOpen, Video, FileCheck, Plus, Pencil, Trash2, X } from 'lucide-react';
import type { EBook, VideoWorkshop, ContentTemplate } from '@/types';

type ModalType = 'ebook' | 'workshop' | 'template' | null;

export default function ResourcesManagementPage() {
  const { ebooks, addEBook, updateEBook, deleteEBook, workshops, addWorkshop, updateWorkshop, deleteWorkshop, templates, addTemplate, updateTemplate, deleteTemplate } = usePortal();
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const openAddModal = (type: ModalType) => { setModalType(type); setEditId(null); setForm({}); };
  const openEditModal = (type: ModalType, item: EBook | VideoWorkshop | ContentTemplate) => {
    setModalType(type); setEditId(item.id);
    const f: Record<string, string> = {};
    Object.entries(item).forEach(([k, v]) => { if (typeof v === 'string' || typeof v === 'number') f[k] = String(v); });
    setForm(f);
  };
  const closeModal = () => { setModalType(null); setEditId(null); setForm({}); };
  const handleChange = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = () => {
    if (modalType === 'ebook') {
      if (editId) updateEBook(editId, { title: form.title, author: form.author, type: form.type || 'PDF', size: form.size, color: form.color || '#6366f1', image: form.image || '/finance_bg.png', downloadUrl: form.downloadUrl || '#' });
      else addEBook({ title: form.title || 'New E-Book', author: form.author || 'Professionals Club', type: form.type || 'PDF', size: form.size || '1.0 MB', color: form.color || '#6366f1', image: form.image || '/finance_bg.png', downloadUrl: form.downloadUrl || '#' });
    } else if (modalType === 'workshop') {
      if (editId) updateWorkshop(editId, { title: form.title, duration: form.duration, recordedDate: form.recordedDate, platform: form.platform, thumbnailImage: form.thumbnailImage || '/meetup_bg.png', videoUrl: form.videoUrl || '#' });
      else addWorkshop({ title: form.title || 'New Workshop', duration: form.duration || '60 mins', recordedDate: form.recordedDate || new Date().toLocaleDateString(), platform: form.platform || 'YouTube', thumbnailImage: form.thumbnailImage || '/meetup_bg.png', videoUrl: form.videoUrl || '#' });
    } else if (modalType === 'template') {
      if (editId) updateTemplate(editId, { title: form.title, fileType: form.fileType, category: form.category, image: form.image || '/hero-community.png', accessUrl: form.accessUrl || '#' });
      else addTemplate({ title: form.title || 'New Template', fileType: form.fileType || 'PDF', category: form.category || 'Career', image: form.image || '/hero-community.png', accessUrl: form.accessUrl || '#' });
    }
    closeModal();
  };

  const handleDelete = (type: ModalType, id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    if (type === 'ebook') deleteEBook(id);
    else if (type === 'workshop') deleteWorkshop(id);
    else if (type === 'template') deleteTemplate(id);
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: '0.9rem', outline: 'none', background: 'var(--bg-primary)' };
  const labelStyle: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' };

  const renderModal = () => {
    if (!modalType) return null;
    const title = editId ? `Edit ${modalType === 'ebook' ? 'E-Book' : modalType === 'workshop' ? 'Workshop' : 'Template'}` : `Add ${modalType === 'ebook' ? 'E-Book' : modalType === 'workshop' ? 'Workshop' : 'Template'}`;
    
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }} onClick={closeModal}>
        <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 32, width: 520, maxHeight: '80vh', overflow: 'auto', boxShadow: 'var(--shadow-xl)' }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{title}</h3>
            <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title || ''} onChange={e => handleChange('title', e.target.value)} placeholder="Enter title" /></div>
            {modalType === 'ebook' && (
              <>
                <div><label style={labelStyle}>Author</label><input style={inputStyle} value={form.author || ''} onChange={e => handleChange('author', e.target.value)} placeholder="Author name" /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={labelStyle}>File Type</label><input style={inputStyle} value={form.type || ''} onChange={e => handleChange('type', e.target.value)} placeholder="PDF" /></div>
                  <div><label style={labelStyle}>File Size</label><input style={inputStyle} value={form.size || ''} onChange={e => handleChange('size', e.target.value)} placeholder="2.4 MB" /></div>
                </div>
                <div><label style={labelStyle}>Image Path</label><input style={inputStyle} value={form.image || ''} onChange={e => handleChange('image', e.target.value)} placeholder="/finance_bg.png" /></div>
                <div><label style={labelStyle}>Color</label><input style={inputStyle} value={form.color || ''} onChange={e => handleChange('color', e.target.value)} placeholder="#6366f1" /></div>
              </>
            )}
            {modalType === 'workshop' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={labelStyle}>Duration</label><input style={inputStyle} value={form.duration || ''} onChange={e => handleChange('duration', e.target.value)} placeholder="45 mins" /></div>
                  <div><label style={labelStyle}>Platform</label><input style={inputStyle} value={form.platform || ''} onChange={e => handleChange('platform', e.target.value)} placeholder="YouTube" /></div>
                </div>
                <div><label style={labelStyle}>Recorded Date</label><input style={inputStyle} value={form.recordedDate || ''} onChange={e => handleChange('recordedDate', e.target.value)} placeholder="Jan 12, 2026" /></div>
                <div><label style={labelStyle}>Thumbnail Image</label><input style={inputStyle} value={form.thumbnailImage || ''} onChange={e => handleChange('thumbnailImage', e.target.value)} placeholder="/meetup_bg.png" /></div>
                <div><label style={labelStyle}>Video URL</label><input style={inputStyle} value={form.videoUrl || ''} onChange={e => handleChange('videoUrl', e.target.value)} placeholder="https://youtube.com/..." /></div>
              </>
            )}
            {modalType === 'template' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={labelStyle}>File Type</label><input style={inputStyle} value={form.fileType || ''} onChange={e => handleChange('fileType', e.target.value)} placeholder="Word Doc" /></div>
                  <div><label style={labelStyle}>Category</label><input style={inputStyle} value={form.category || ''} onChange={e => handleChange('category', e.target.value)} placeholder="Career" /></div>
                </div>
                <div><label style={labelStyle}>Image Path</label><input style={inputStyle} value={form.image || ''} onChange={e => handleChange('image', e.target.value)} placeholder="/hero-community.png" /></div>
              </>
            )}
            <button className="btn btn-primary" style={{ marginTop: 8, width: '100%' }} onClick={handleSave}>{editId ? 'Save Changes' : 'Add Item'}</button>
          </div>
        </div>
      </div>
    );
  };

  const tableHeaderStyle: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', borderBottom: '2px solid var(--border-color)' };
  const tableCellStyle: React.CSSProperties = { padding: '14px 16px', borderBottom: '1px solid var(--border-color)', fontSize: '0.88rem' };
  const actionBtnStyle: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6 };

  return (
    <>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 8 }}>Resources Manager</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>Manage e-books, video workshops, and templates displayed on the public Resources page.</p>

      {/* E-Books Section */}
      <div className="card" style={{ marginBottom: 32, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><BookOpen size={20} style={{ color: '#6366f1' }} /><h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>E-Books & Guides ({ebooks.length})</h2></div>
          <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }} onClick={() => openAddModal('ebook')}><Plus size={14} /> Add E-Book</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={tableHeaderStyle}>Title</th><th style={tableHeaderStyle}>Author</th><th style={tableHeaderStyle}>Type</th><th style={tableHeaderStyle}>Size</th><th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Actions</th></tr></thead>
          <tbody>
            {ebooks.map(book => (
              <tr key={book.id} style={{ transition: 'background 0.15s' }} onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-secondary)')} onMouseOut={e => (e.currentTarget.style.background = '')}>
                <td style={{ ...tableCellStyle, fontWeight: 700 }}>{book.title}</td>
                <td style={tableCellStyle}>{book.author}</td>
                <td style={tableCellStyle}><span style={{ padding: '2px 8px', background: book.color, color: 'white', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700 }}>{book.type}</span></td>
                <td style={tableCellStyle}>{book.size}</td>
                <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                  <button style={actionBtnStyle} onClick={() => openEditModal('ebook', book)} title="Edit"><Pencil size={15} color="var(--primary-600)" /></button>
                  <button style={actionBtnStyle} onClick={() => handleDelete('ebook', book.id)} title="Delete"><Trash2 size={15} color="var(--error-500)" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Workshops Section */}
      <div className="card" style={{ marginBottom: 32, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Video size={20} style={{ color: '#dc2626' }} /><h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Video Workshops ({workshops.length})</h2></div>
          <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }} onClick={() => openAddModal('workshop')}><Plus size={14} /> Add Workshop</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={tableHeaderStyle}>Title</th><th style={tableHeaderStyle}>Duration</th><th style={tableHeaderStyle}>Platform</th><th style={tableHeaderStyle}>Recorded</th><th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Actions</th></tr></thead>
          <tbody>
            {workshops.map(ws => (
              <tr key={ws.id} style={{ transition: 'background 0.15s' }} onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-secondary)')} onMouseOut={e => (e.currentTarget.style.background = '')}>
                <td style={{ ...tableCellStyle, fontWeight: 700 }}>{ws.title}</td>
                <td style={tableCellStyle}>{ws.duration}</td>
                <td style={tableCellStyle}><span style={{ padding: '2px 8px', background: '#fef2f2', color: '#dc2626', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700 }}>{ws.platform}</span></td>
                <td style={tableCellStyle}>{ws.recordedDate}</td>
                <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                  <button style={actionBtnStyle} onClick={() => openEditModal('workshop', ws)} title="Edit"><Pencil size={15} color="var(--primary-600)" /></button>
                  <button style={actionBtnStyle} onClick={() => handleDelete('workshop', ws.id)} title="Delete"><Trash2 size={15} color="var(--error-500)" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Templates Section */}
      <div className="card" style={{ marginBottom: 32, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><FileCheck size={20} style={{ color: '#059669' }} /><h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Templates & Worksheets ({templates.length})</h2></div>
          <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }} onClick={() => openAddModal('template')}><Plus size={14} /> Add Template</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={tableHeaderStyle}>Title</th><th style={tableHeaderStyle}>Type</th><th style={tableHeaderStyle}>Category</th><th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Actions</th></tr></thead>
          <tbody>
            {templates.map(tp => (
              <tr key={tp.id} style={{ transition: 'background 0.15s' }} onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-secondary)')} onMouseOut={e => (e.currentTarget.style.background = '')}>
                <td style={{ ...tableCellStyle, fontWeight: 700 }}>{tp.title}</td>
                <td style={tableCellStyle}>{tp.fileType}</td>
                <td style={tableCellStyle}><span style={{ padding: '2px 8px', background: '#ecfdf5', color: '#059669', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700 }}>{tp.category}</span></td>
                <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                  <button style={actionBtnStyle} onClick={() => openEditModal('template', tp)} title="Edit"><Pencil size={15} color="var(--primary-600)" /></button>
                  <button style={actionBtnStyle} onClick={() => handleDelete('template', tp.id)} title="Delete"><Trash2 size={15} color="var(--error-500)" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {renderModal()}
    </>
  );
}
