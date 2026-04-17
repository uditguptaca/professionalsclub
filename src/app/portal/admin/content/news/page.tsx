'use client';
import React, { useState } from 'react';
import { usePortal } from '@/context/portal-context';
import { Newspaper, Plus, Pencil, Trash2, X } from 'lucide-react';
import type { NewsArticle } from '@/types';

export default function NewsManagementPage() {
  const { newsArticles, addNewsArticle, updateNewsArticle, deleteNewsArticle } = usePortal();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const openAdd = () => { setShowModal(true); setEditId(null); setForm({}); };
  const openEdit = (item: NewsArticle) => {
    setShowModal(true); setEditId(item.id);
    setForm({ title: item.title, summary: item.summary, content: item.content, image: item.image, author: item.author, category: item.category, publishedAt: item.publishedAt });
  };
  const closeModal = () => { setShowModal(false); setEditId(null); setForm({}); };
  const handleChange = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = () => {
    const data = {
      title: form.title || 'New Article',
      summary: form.summary || '',
      content: form.content || '',
      image: form.image || '/hero-community.png',
      author: form.author || 'Admin',
      category: form.category || 'Announcement',
      publishedAt: form.publishedAt || new Date().toISOString(),
    };
    if (editId) updateNewsArticle(editId, data);
    else addNewsArticle(data);
    closeModal();
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this article?')) return;
    deleteNewsArticle(id);
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: '0.9rem', outline: 'none', background: 'var(--bg-primary)' };
  const labelStyle: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' };
  const tableHeaderStyle: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', borderBottom: '2px solid var(--border-color)' };
  const tableCellStyle: React.CSSProperties = { padding: '14px 16px', borderBottom: '1px solid var(--border-color)', fontSize: '0.88rem' };
  const actionBtnStyle: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6 };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 8 }}>News Manager</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage news articles displayed on the public News page.</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Article</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={tableHeaderStyle}>Title</th><th style={tableHeaderStyle}>Category</th><th style={tableHeaderStyle}>Author</th><th style={tableHeaderStyle}>Published</th><th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Actions</th></tr></thead>
          <tbody>
            {newsArticles.map(article => (
              <tr key={article.id} style={{ transition: 'background 0.15s' }} onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-secondary)')} onMouseOut={e => (e.currentTarget.style.background = '')}>
                <td style={{ ...tableCellStyle, fontWeight: 700, maxWidth: 300 }}>{article.title}</td>
                <td style={tableCellStyle}><span style={{ padding: '2px 8px', background: '#eef2ff', color: '#4f46e5', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700 }}>{article.category}</span></td>
                <td style={tableCellStyle}>{article.author}</td>
                <td style={tableCellStyle}>{new Date(article.publishedAt).toLocaleDateString()}</td>
                <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                  <button style={actionBtnStyle} onClick={() => openEdit(article)} title="Edit"><Pencil size={15} color="var(--primary-600)" /></button>
                  <button style={actionBtnStyle} onClick={() => handleDelete(article.id)} title="Delete"><Trash2 size={15} color="var(--error-500)" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }} onClick={closeModal}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 32, width: 560, maxHeight: '80vh', overflow: 'auto', boxShadow: 'var(--shadow-xl)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{editId ? 'Edit Article' : 'Add Article'}</h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title || ''} onChange={e => handleChange('title', e.target.value)} /></div>
              <div><label style={labelStyle}>Summary</label><textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.summary || ''} onChange={e => handleChange('summary', e.target.value)} /></div>
              <div><label style={labelStyle}>Full Content</label><textarea style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }} value={form.content || ''} onChange={e => handleChange('content', e.target.value)} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Category</label><input style={inputStyle} value={form.category || ''} onChange={e => handleChange('category', e.target.value)} placeholder="Announcement" /></div>
                <div><label style={labelStyle}>Author</label><input style={inputStyle} value={form.author || ''} onChange={e => handleChange('author', e.target.value)} /></div>
              </div>
              <div><label style={labelStyle}>Image Path</label><input style={inputStyle} value={form.image || ''} onChange={e => handleChange('image', e.target.value)} placeholder="/hero-community.png" /></div>
              <button className="btn btn-primary" style={{ marginTop: 8, width: '100%' }} onClick={handleSave}>{editId ? 'Save Changes' : 'Publish Article'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
