'use client';
import React, { useState } from 'react';
import { usePortal } from '@/context/portal-context';
import { Briefcase, Plus, Pencil, Trash2, X, MapPin, DollarSign, Star, Eye, EyeOff } from 'lucide-react';
import type { JobPosting, JobType, JobCategory } from '@/types';
import { JOB_CATEGORIES } from '@/types';

const JOB_TYPE_OPTIONS: { value: JobType; label: string }[] = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'internship', label: 'Internship' },
];

const JOB_TYPE_COLORS: Record<JobType, { bg: string; color: string }> = {
  full_time: { bg: '#dbeafe', color: '#1e40af' },
  part_time: { bg: '#fce7f3', color: '#9d174d' },
  contract: { bg: '#d1fae5', color: '#065f46' },
  freelance: { bg: '#fef3c7', color: '#92400e' },
  internship: { bg: '#ede9fe', color: '#5b21b6' },
};

export default function JobsManagementPage() {
  const { jobPostings, addJobPosting, updateJobPosting, deleteJobPosting } = usePortal();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string | number | boolean>>({});

  const activeJobs = jobPostings.filter(j => j.isActive);
  const inactiveJobs = jobPostings.filter(j => !j.isActive);

  const openAdd = () => { setShowModal(true); setEditId(null); setForm({ isActive: true, isFeatured: false, salaryPeriod: 'yearly', jobType: 'full_time', category: 'Developer' }); };
  const openEdit = (item: JobPosting) => {
    setShowModal(true);
    setEditId(item.id);
    setForm({
      title: item.title, company: item.company, companyLogo: item.companyLogo,
      location: item.location, province: item.province,
      salaryMin: item.salaryMin, salaryMax: item.salaryMax, salaryPeriod: item.salaryPeriod,
      jobType: item.jobType, category: item.category,
      description: item.description, requirements: item.requirements, responsibilities: item.responsibilities,
      contactEmail: item.contactEmail, applyUrl: item.applyUrl,
      tags: item.tags.join(', '),
      isFeatured: item.isFeatured, isActive: item.isActive,
      postedAt: item.postedAt.split('T')[0], expiresAt: item.expiresAt.split('T')[0],
    });
  };
  const closeModal = () => { setShowModal(false); setEditId(null); setForm({}); };
  const handleChange = (key: string, val: string | number | boolean) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = () => {
    const tagsStr = String(form.tags || '');
    const data = {
      title: String(form.title || 'New Job'),
      company: String(form.company || ''),
      companyLogo: String(form.companyLogo || '/career-mentorship.png'),
      location: String(form.location || ''),
      province: String(form.province || 'Ontario'),
      salaryMin: Number(form.salaryMin) || 0,
      salaryMax: Number(form.salaryMax) || 0,
      salaryPeriod: (form.salaryPeriod as 'yearly' | 'monthly' | 'hourly') || 'yearly',
      jobType: (form.jobType as JobType) || 'full_time',
      category: (form.category as JobCategory) || 'Developer',
      description: String(form.description || ''),
      requirements: String(form.requirements || ''),
      responsibilities: String(form.responsibilities || ''),
      contactEmail: String(form.contactEmail || ''),
      applyUrl: String(form.applyUrl || '#'),
      tags: tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [],
      isFeatured: Boolean(form.isFeatured),
      isActive: Boolean(form.isActive),
      postedAt: form.postedAt ? new Date(String(form.postedAt)).toISOString() : new Date().toISOString(),
      expiresAt: form.expiresAt ? new Date(String(form.expiresAt)).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    if (editId) updateJobPosting(editId, data);
    else addJobPosting(data);
    closeModal();
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this job posting?')) return;
    deleteJobPosting(id);
  };

  const toggleActive = (id: string, current: boolean) => {
    updateJobPosting(id, { isActive: !current });
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: '0.9rem', outline: 'none', background: 'var(--bg-primary)' };
  const labelStyle: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' };
  const tableHeaderStyle: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', borderBottom: '2px solid var(--border-color)' };
  const tableCellStyle: React.CSSProperties = { padding: '14px 16px', borderBottom: '1px solid var(--border-color)', fontSize: '0.88rem' };
  const actionBtnStyle: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6 };

  const renderTable = (title: string, items: JobPosting[], color: string, showAdd?: boolean) => (
    <div className="card" style={{ marginBottom: 32, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Briefcase size={20} style={{ color }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{title} ({items.length})</h2>
        </div>
        {showAdd && <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }} onClick={openAdd}><Plus size={14} /> Add Job</button>}
      </div>
      {items.length === 0 ? (
        <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          No jobs in this category.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={tableHeaderStyle}>Job Title</th>
              <th style={tableHeaderStyle}>Company</th>
              <th style={tableHeaderStyle}>Location</th>
              <th style={tableHeaderStyle}>Type</th>
              <th style={tableHeaderStyle}>Category</th>
              <th style={tableHeaderStyle}>Salary</th>
              <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(job => {
              const typeStyle = JOB_TYPE_COLORS[job.jobType];
              const typeLabel = JOB_TYPE_OPTIONS.find(o => o.value === job.jobType)?.label || job.jobType;
              return (
                <tr key={job.id} style={{ transition: 'background 0.15s' }} onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-secondary)')} onMouseOut={e => (e.currentTarget.style.background = '')}>
                  <td style={{ ...tableCellStyle, fontWeight: 700, maxWidth: 250 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {job.isFeatured && <Star size={14} color="#d97706" fill="#d97706" />}
                      {job.title}
                    </div>
                  </td>
                  <td style={tableCellStyle}>{job.company}</td>
                  <td style={tableCellStyle}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={12} />{job.location}
                    </span>
                  </td>
                  <td style={tableCellStyle}>
                    <span style={{ padding: '2px 8px', background: typeStyle.bg, color: typeStyle.color, borderRadius: 4, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>
                      {typeLabel}
                    </span>
                  </td>
                  <td style={tableCellStyle}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{job.category}</span>
                  </td>
                  <td style={tableCellStyle}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.82rem' }}>
                      <DollarSign size={12} />
                      {job.salaryPeriod === 'yearly'
                        ? `${(job.salaryMin / 1000).toFixed(0)}k–${(job.salaryMax / 1000).toFixed(0)}k/yr`
                        : `${job.salaryMin}–${job.salaryMax}/${job.salaryPeriod === 'monthly' ? 'mo' : 'hr'}`
                      }
                    </span>
                  </td>
                  <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                    <button style={actionBtnStyle} onClick={() => toggleActive(job.id, job.isActive)} title={job.isActive ? 'Deactivate' : 'Activate'}>
                      {job.isActive ? <Eye size={15} color="#059669" /> : <EyeOff size={15} color="#94a3b8" />}
                    </button>
                    <button style={actionBtnStyle} onClick={() => openEdit(job)} title="Edit"><Pencil size={15} color="var(--primary-600)" /></button>
                    <button style={actionBtnStyle} onClick={() => handleDelete(job.id)} title="Delete"><Trash2 size={15} color="var(--error-500)" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 8 }}>Jobs Manager</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>Manage job postings displayed on the public Jobs page. Add, edit, or remove listings.</p>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Active Jobs', value: activeJobs.length, color: '#059669', bg: '#d1fae5' },
          { label: 'Featured', value: jobPostings.filter(j => j.isFeatured).length, color: '#d97706', bg: '#fef3c7' },
          { label: 'Inactive', value: inactiveJobs.length, color: '#94a3b8', bg: '#f1f5f9' },
          { label: 'Total', value: jobPostings.length, color: '#0891b2', bg: '#ecfeff' },
        ].map((stat, i) => (
          <div key={i} style={{ padding: '20px 24px', borderRadius: 12, background: stat.bg, border: `1px solid ${stat.color}20` }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: stat.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4, opacity: 0.8 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {renderTable('Active Jobs', activeJobs, '#059669', true)}
      {inactiveJobs.length > 0 && renderTable('Inactive Jobs', inactiveJobs, '#94a3b8')}

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }} onClick={closeModal}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 32, width: 640, maxHeight: '85vh', overflow: 'auto', boxShadow: 'var(--shadow-xl)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{editId ? 'Edit Job Posting' : 'Add Job Posting'}</h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Title */}
              <div><label style={labelStyle}>Job Title *</label><input style={inputStyle} value={String(form.title || '')} onChange={e => handleChange('title', e.target.value)} placeholder="e.g. Senior Full-Stack Developer" /></div>

              {/* Company / Logo */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Company Name *</label><input style={inputStyle} value={String(form.company || '')} onChange={e => handleChange('company', e.target.value)} /></div>
                <div><label style={labelStyle}>Company Logo (image path)</label><input style={inputStyle} value={String(form.companyLogo || '')} onChange={e => handleChange('companyLogo', e.target.value)} placeholder="/career-mentorship.png" /></div>
              </div>

              {/* Description */}
              <div><label style={labelStyle}>Job Description *</label><textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={String(form.description || '')} onChange={e => handleChange('description', e.target.value)} /></div>

              {/* Requirements / Responsibilities */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Requirements</label><textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={String(form.requirements || '')} onChange={e => handleChange('requirements', e.target.value)} /></div>
                <div><label style={labelStyle}>Responsibilities</label><textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={String(form.responsibilities || '')} onChange={e => handleChange('responsibilities', e.target.value)} /></div>
              </div>

              {/* Location / Province */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Location *</label><input style={inputStyle} value={String(form.location || '')} onChange={e => handleChange('location', e.target.value)} placeholder="Toronto, ON" /></div>
                <div><label style={labelStyle}>Province</label><input style={inputStyle} value={String(form.province || '')} onChange={e => handleChange('province', e.target.value)} placeholder="Ontario" /></div>
              </div>

              {/* Salary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Salary Min</label><input type="number" style={inputStyle} value={String(form.salaryMin || '')} onChange={e => handleChange('salaryMin', Number(e.target.value))} /></div>
                <div><label style={labelStyle}>Salary Max</label><input type="number" style={inputStyle} value={String(form.salaryMax || '')} onChange={e => handleChange('salaryMax', Number(e.target.value))} /></div>
                <div><label style={labelStyle}>Salary Period</label>
                  <select style={inputStyle} value={String(form.salaryPeriod || 'yearly')} onChange={e => handleChange('salaryPeriod', e.target.value)}>
                    <option value="yearly">Yearly</option><option value="monthly">Monthly</option><option value="hourly">Hourly</option>
                  </select>
                </div>
              </div>

              {/* Type / Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Job Type</label>
                  <select style={inputStyle} value={String(form.jobType || 'full_time')} onChange={e => handleChange('jobType', e.target.value)}>
                    {JOB_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Category</label>
                  <select style={inputStyle} value={String(form.category || 'Developer')} onChange={e => handleChange('category', e.target.value)}>
                    {JOB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div><label style={labelStyle}>Tags (comma-separated)</label><input style={inputStyle} value={String(form.tags || '')} onChange={e => handleChange('tags', e.target.value)} placeholder="React, TypeScript, Remote" /></div>

              {/* Contact */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Contact Email</label><input style={inputStyle} value={String(form.contactEmail || '')} onChange={e => handleChange('contactEmail', e.target.value)} /></div>
                <div><label style={labelStyle}>Apply URL</label><input style={inputStyle} value={String(form.applyUrl || '')} onChange={e => handleChange('applyUrl', e.target.value)} placeholder="https://..." /></div>
              </div>

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Posted Date</label><input type="date" style={inputStyle} value={String(form.postedAt || '')} onChange={e => handleChange('postedAt', e.target.value)} /></div>
                <div><label style={labelStyle}>Expires Date</label><input type="date" style={inputStyle} value={String(form.expiresAt || '')} onChange={e => handleChange('expiresAt', e.target.value)} /></div>
              </div>

              {/* Toggles */}
              <div style={{ display: 'flex', gap: 24, paddingTop: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                  <input type="checkbox" checked={Boolean(form.isFeatured)} onChange={e => handleChange('isFeatured', e.target.checked)} /> Featured Job
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                  <input type="checkbox" checked={Boolean(form.isActive)} onChange={e => handleChange('isActive', e.target.checked)} /> Active (visible on public page)
                </label>
              </div>

              <button className="btn btn-primary" style={{ marginTop: 8, width: '100%' }} onClick={handleSave}>
                {editId ? 'Save Changes' : 'Add Job Posting'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
