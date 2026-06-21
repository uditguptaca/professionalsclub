'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useApp } from '@/context/app-context';
import Link from 'next/link';
import {
  Users, Clock, CheckCircle, XCircle, Ban, AlertTriangle,
  ShieldCheck, Search, Filter, ChevronRight, Eye,
  BarChart3, PieChart, TrendingUp, FileText, Loader2,
  RefreshCw, Calendar, User, MapPin, Heart
} from 'lucide-react';
import type {
  MatrimonyProfile,
  MatrimonyReport,
  MatrimonyVerification,
  MatrimonyAdminAudit,
  MatrimonyProfileStatus,
} from '@/types/matrimony';

// ========== HELPERS ==========
const STATUS_COLORS: Record<MatrimonyProfileStatus, { bg: string; color: string; label: string }> = {
  draft: { bg: 'rgba(71,85,105,0.12)', color: '#64748b', label: 'Draft' },
  pending: { bg: 'rgba(245,158,11,0.14)', color: '#d97706', label: 'Pending' },
  approved: { bg: 'rgba(0,168,107,0.14)', color: '#059669', label: 'Approved' },
  rejected: { bg: 'rgba(240,73,35,0.14)', color: '#dc2626', label: 'Rejected' },
  changes_requested: { bg: 'rgba(249,115,22,0.14)', color: '#ea580c', label: 'Changes Req.' },
  suspended: { bg: 'rgba(30,41,59,0.18)', color: '#334155', label: 'Suspended' },
};

function StatusBadge({ status }: { status: MatrimonyProfileStatus }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.draft;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 10px', borderRadius: 99, fontSize: '0.72rem',
      fontWeight: 700, background: s.bg, color: s.color,
      textTransform: 'capitalize',
    }}>
      {s.label}
    </span>
  );
}

function getAge(dob: string): number {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
  return age;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ========== LOADING SKELETON ==========
function SkeletonRow() {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '14px 0', borderBottom: '1px solid var(--border-color)' }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--gray-100)', animation: 'pulse 1.5s infinite' }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ width: '40%', height: 12, borderRadius: 4, background: 'var(--gray-100)', animation: 'pulse 1.5s infinite' }} />
        <div style={{ width: '25%', height: 10, borderRadius: 4, background: 'var(--gray-100)', animation: 'pulse 1.5s infinite' }} />
      </div>
    </div>
  );
}

// ========== SIMPLE BAR CHART (no recharts dep) ==========
function SimpleBarChart({ data, maxVal }: { data: { label: string; value: number }[]; maxVal: number }) {
  const barColors = ['#0067A5', '#2b91b9', '#4baed0', '#88c9df', '#0067A5', '#2b91b9', '#4baed0', '#88c9df', '#0067A5', '#2b91b9', '#4baed0', '#88c9df'];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 200, padding: '0 4px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{d.value}</span>
          <div style={{
            width: '100%', maxWidth: 40,
            height: `${Math.max((d.value / (maxVal || 1)) * 160, 4)}px`,
            background: `linear-gradient(180deg, ${barColors[i % barColors.length]}, ${barColors[i % barColors.length]}cc)`,
            borderRadius: '6px 6px 2px 2px',
            transition: 'height 0.6s ease',
          }} />
          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2, maxWidth: 48, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ========== SIMPLE PIE CHART (CSS-based) ==========
function SimplePieChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((a, b) => a + b.value, 0) || 1;
  let cumulativePct = 0;
  const gradientParts = data.map(d => {
    const start = cumulativePct;
    cumulativePct += (d.value / total) * 100;
    return `${d.color} ${start}% ${cumulativePct}%`;
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <div style={{
        width: 160, height: 160, borderRadius: '50%',
        background: `conic-gradient(${gradientParts.join(', ')})`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        flexShrink: 0,
      }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--text-secondary)' }}>{d.label}</span>
            <span style={{ fontWeight: 700, marginLeft: 'auto' }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ========== TAB TYPES ==========
type TabId = 'pending' | 'all' | 'reports' | 'verifications' | 'audit' | 'analytics';

// ========== MAIN PAGE ==========
export default function AdminMatrimonyPage() {
  const supabase = createClient();
  const { currentUserId } = useApp();

  // State
  const [activeTab, setActiveTab] = useState<TabId>('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data
  const [profiles, setProfiles] = useState<MatrimonyProfile[]>([]);
  const [reports, setReports] = useState<MatrimonyReport[]>([]);
  const [verifications, setVerifications] = useState<MatrimonyVerification[]>([]);
  const [auditLog, setAuditLog] = useState<MatrimonyAdminAudit[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ===== FETCH DATA =====
  const fetchData = async () => {
    try {
      const [profilesRes, reportsRes, verificationsRes, auditRes] = await Promise.all([
        supabase.from('matrimony_profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('matrimony_reports').select('*').order('created_at', { ascending: false }),
        supabase.from('matrimony_verifications').select('*').order('created_at', { ascending: false }),
        supabase.from('matrimony_admin_audit').select('*').order('created_at', { ascending: false }).limit(100),
      ]);

      if (profilesRes.data) setProfiles(profilesRes.data);
      if (reportsRes.data) setReports(reportsRes.data);
      if (verificationsRes.data) setVerifications(verificationsRes.data);
      if (auditRes.data) setAuditLog(auditRes.data);
    } catch (err) {
      console.error('Error fetching matrimony admin data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // ===== COMPUTED STATS =====
  const stats = useMemo(() => {
    const total = profiles.length;
    const pending = profiles.filter(p => p.status === 'pending').length;
    const approved = profiles.filter(p => p.status === 'approved').length;
    const rejected = profiles.filter(p => p.status === 'rejected').length;
    const suspended = profiles.filter(p => p.status === 'suspended').length;
    const openReports = reports.filter(r => r.status === 'open').length;
    const pendingVerifications = verifications.filter(v => v.status === 'pending').length;
    return { total, pending, approved, rejected, suspended, openReports, pendingVerifications };
  }, [profiles, reports, verifications]);

  // ===== FILTERED PROFILES =====
  const pendingProfiles = useMemo(
    () => profiles.filter(p => p.status === 'pending').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [profiles]
  );

  const filteredProfiles = useMemo(() => {
    let list = [...profiles];
    if (statusFilter !== 'all') list = list.filter(p => p.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.full_name?.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q) ||
        p.id?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [profiles, statusFilter, searchQuery]);

  const openReports = useMemo(() => reports.filter(r => r.status === 'open'), [reports]);
  const pendingVerifs = useMemo(() => verifications.filter(v => v.status === 'pending'), [verifications]);

  // ===== ANALYTICS DATA =====
  const pieData = useMemo(() => [
    { label: 'Approved', value: stats.approved, color: '#059669' },
    { label: 'Pending', value: stats.pending, color: '#d97706' },
    { label: 'Rejected', value: stats.rejected, color: '#dc2626' },
    { label: 'Suspended', value: stats.suspended, color: '#334155' },
    { label: 'Draft', value: profiles.filter(p => p.status === 'draft').length, color: '#94a3b8' },
    { label: 'Changes Req.', value: profiles.filter(p => p.status === 'changes_requested').length, color: '#ea580c' },
  ], [profiles, stats]);

  const weeklyData = useMemo(() => {
    const weeks: { label: string; value: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const end = new Date();
      end.setDate(end.getDate() - i * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 7);
      const count = profiles.filter(p => {
        const d = new Date(p.created_at);
        return d >= start && d < end;
      }).length;
      weeks.push({ label: `W${12 - i}`, value: count });
    }
    return weeks;
  }, [profiles]);

  // ===== TABS CONFIG =====
  const tabs: { id: TabId; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'pending', label: 'Pending Queue', icon: <Clock size={15} />, count: stats.pending },
    { id: 'all', label: 'All Profiles', icon: <Users size={15} />, count: stats.total },
    { id: 'reports', label: 'Reports', icon: <AlertTriangle size={15} />, count: stats.openReports },
    { id: 'verifications', label: 'Verifications', icon: <ShieldCheck size={15} />, count: stats.pendingVerifications },
    { id: 'audit', label: 'Audit Log', icon: <FileText size={15} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={15} /> },
  ];

  // ========== RENDER ==========
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', fontWeight: 800, marginBottom: 4 }}>
            <Heart size={28} style={{ display: 'inline', marginRight: 8, color: 'var(--error-500)', verticalAlign: 'middle' }} />
            Matrimony Admin
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            Moderate profiles, review verifications, and manage reports
          </p>
        </div>
        <button className="btn btn-outline" onClick={handleRefresh} disabled={refreshing} style={{ gap: 6 }}>
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} />
          Refresh
        </button>
      </div>

      {/* ===== STATS ROW ===== */}
      <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {[
          { label: 'Total Profiles', value: stats.total, icon: <Users size={20} />, color: '#0067A5', bg: 'rgba(0,103,165,0.1)' },
          { label: 'Pending Review', value: stats.pending, icon: <Clock size={20} />, color: '#d97706', bg: 'rgba(245,158,11,0.1)', alert: stats.pending > 0 },
          { label: 'Approved', value: stats.approved, icon: <CheckCircle size={20} />, color: '#059669', bg: 'rgba(5,150,105,0.1)' },
          { label: 'Rejected', value: stats.rejected, icon: <XCircle size={20} />, color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
          { label: 'Suspended', value: stats.suspended, icon: <Ban size={20} />, color: '#334155', bg: 'rgba(51,65,85,0.1)' },
          { label: 'Open Reports', value: stats.openReports, icon: <AlertTriangle size={20} />, color: '#ea580c', bg: 'rgba(234,88,12,0.1)', alert: stats.openReports > 0 },
          { label: 'Pending Verif.', value: stats.pendingVerifications, icon: <ShieldCheck size={20} />, color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
        ].map((item, i) => (
          <div key={i} className="card-stat" style={{ position: 'relative' }}>
            {item.alert && (
              <div style={{
                position: 'absolute', top: 10, right: 10, width: 8, height: 8,
                borderRadius: '50%', background: '#F04923',
                animation: 'pulse 2s infinite',
                boxShadow: '0 0 6px rgba(240,73,35,0.5)',
              }} />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ padding: 8, background: item.bg, borderRadius: 10, color: item.color }}>{item.icon}</div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1, fontFamily: 'var(--font-display)' }}>
                  {loading ? '—' : item.value}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>
                  {item.label}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ===== TABS ===== */}
      <div style={{ overflowX: 'auto' }}>
        <div className="tabs" style={{ minWidth: 'max-content' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                <span className="count" style={activeTab === tab.id ? { background: 'rgba(0,103,165,0.15)', color: 'var(--primary-600)' } : {}}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ===== TAB CONTENT ===== */}

      {/* --- PENDING QUEUE --- */}
      {activeTab === 'pending' && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 700, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} style={{ color: '#d97706' }} /> Pending Review Queue
            </h3>
            <span className="badge badge-warning">{pendingProfiles.length} awaiting</span>
          </div>
          {loading ? (
            <div style={{ padding: '0 20px' }}>{[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}</div>
          ) : pendingProfiles.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <CheckCircle size={48} style={{ color: 'var(--success-400)', margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 600, fontSize: 'var(--text-lg)', marginBottom: 4 }}>All caught up!</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No profiles pending review.</p>
            </div>
          ) : (
            <div>
              {pendingProfiles.map((profile, idx) => (
                <Link key={profile.id} href={`/portal/admin/matrimony/${profile.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
                    borderBottom: idx < pendingProfiles.length - 1 ? '1px solid var(--border-color)' : 'none',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg, var(--primary-100), var(--accent-100))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 700,
                      color: 'var(--primary-600)', flexShrink: 0,
                    }}>
                      {profile.gender === 'male' ? '👨' : profile.gender === 'female' ? '👩' : '🧑'}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{profile.full_name}</span>
                        <StatusBadge status={profile.status} />
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <span>{profile.gender === 'male' ? 'M' : profile.gender === 'female' ? 'F' : 'O'} • {getAge(profile.dob)}y</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={10} /> {profile.city}</span>
                        <span>Submitted {timeAgo(profile.created_at)}</span>
                      </div>
                    </div>

                    {/* Completeness */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: profile.completeness_pct >= 80 ? 'var(--success-600)' : profile.completeness_pct >= 50 ? '#d97706' : 'var(--error-500)' }}>
                        {profile.completeness_pct}%
                      </div>
                      <div style={{ width: 60, height: 4, borderRadius: 2, background: 'var(--gray-200)', marginTop: 4 }}>
                        <div style={{
                          height: '100%', borderRadius: 2, width: `${profile.completeness_pct}%`,
                          background: profile.completeness_pct >= 80 ? 'var(--success-500)' : profile.completeness_pct >= 50 ? '#d97706' : 'var(--error-500)',
                          transition: 'width 0.5s',
                        }} />
                      </div>
                    </div>

                    <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- ALL PROFILES --- */}
      {activeTab === 'all' && (
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 360 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="input"
                style={{ paddingLeft: 34 }}
                placeholder="Search by name, city, or ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <select className="input" style={{ width: 180 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="changes_requested">Changes Requested</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {/* Table */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Gender</th>
                  <th>City</th>
                  <th>Religion</th>
                  <th>Submitted</th>
                  <th>Reviewed</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center' }}>
                    <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                  </td></tr>
                ) : filteredProfiles.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    No profiles found matching your filters.
                  </td></tr>
                ) : (
                  filteredProfiles.map(p => (
                    <tr key={p.id} style={{ cursor: 'pointer' }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: 'linear-gradient(135deg, var(--primary-100), var(--accent-100))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.8rem', flexShrink: 0,
                          }}>
                            {p.gender === 'male' ? '👨' : p.gender === 'female' ? '👩' : '🧑'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>{p.full_name}</div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.id.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td><StatusBadge status={p.status} /></td>
                      <td style={{ textTransform: 'capitalize' }}>{p.gender}</td>
                      <td>{p.city}, {p.province}</td>
                      <td>{p.religion}</td>
                      <td>{new Date(p.created_at).toLocaleDateString()}</td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {p.reviewed_at ? new Date(p.reviewed_at).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <Link href={`/portal/admin/matrimony/${p.id}`} className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem' }}>
                          <Eye size={13} /> View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- REPORTS --- */}
      {activeTab === 'reports' && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 700, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} style={{ color: '#ea580c' }} /> Open Reports
            </h3>
            <span className="badge badge-error">{openReports.length} open</span>
          </div>
          {loading ? (
            <div style={{ padding: '0 20px' }}>{[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}</div>
          ) : openReports.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <CheckCircle size={48} style={{ color: 'var(--success-400)', margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 600, marginBottom: 4 }}>No open reports</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>All reports have been reviewed.</p>
            </div>
          ) : (
            <div>
              {openReports.map((report, idx) => (
                <div key={report.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
                  borderBottom: idx < openReports.length - 1 ? '1px solid var(--border-color)' : 'none',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: 'rgba(240,73,35,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#F04923', flexShrink: 0,
                  }}>
                    <AlertTriangle size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{report.reason}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      Reporter: {report.reporter_profile_id?.slice(0, 8)}... → Target: {report.reported_profile_id?.slice(0, 8)}...
                      <span style={{ marginLeft: 8 }}>{timeAgo(report.created_at)}</span>
                    </div>
                    {report.details && (
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>{report.details}</p>
                    )}
                  </div>
                  <Link href={`/portal/admin/matrimony/${report.reported_profile_id}`} className="btn btn-outline btn-sm" style={{ fontSize: '0.72rem', flexShrink: 0 }}>
                    Review Profile
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- VERIFICATIONS --- */}
      {activeTab === 'verifications' && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 700, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={16} style={{ color: '#7c3aed' }} /> Pending Verifications
            </h3>
            <span className="badge badge-primary">{pendingVerifs.length} pending</span>
          </div>
          {loading ? (
            <div style={{ padding: '0 20px' }}>{[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}</div>
          ) : pendingVerifs.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <ShieldCheck size={48} style={{ color: 'var(--success-400)', margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 600, marginBottom: 4 }}>No pending verifications</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>All verification requests have been processed.</p>
            </div>
          ) : (
            <div>
              {pendingVerifs.map((v, idx) => (
                <div key={v.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
                  borderBottom: idx < pendingVerifs.length - 1 ? '1px solid var(--border-color)' : 'none',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#7c3aed', flexShrink: 0,
                  }}>
                    <ShieldCheck size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', textTransform: 'capitalize' }}>{v.type} Verification</span>
                      <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Pending</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      Profile: {v.profile_id?.slice(0, 8)}... • {timeAgo(v.created_at)}
                    </div>
                  </div>
                  {v.doc_url && (
                    <a href={v.doc_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem' }}>
                      View Doc
                    </a>
                  )}
                  <Link href={`/portal/admin/matrimony/${v.profile_id}`} className="btn btn-outline btn-sm" style={{ fontSize: '0.72rem', flexShrink: 0 }}>
                    Review
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- AUDIT LOG --- */}
      {activeTab === 'audit' && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontWeight: 700, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={16} style={{ color: 'var(--primary-600)' }} /> Audit Log
            </h3>
          </div>
          {loading ? (
            <div style={{ padding: '0 20px' }}>{[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}</div>
          ) : auditLog.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <FileText size={48} style={{ color: 'var(--gray-300)', margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 600, marginBottom: 4 }}>No audit entries</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Admin actions will appear here.</p>
            </div>
          ) : (
            <div>
              {auditLog.map((entry, idx) => {
                const actionColors: Record<string, string> = {
                  'approve': '#059669', 'reject': '#dc2626', 'suspend': '#334155',
                  'request_changes': '#ea580c', 'verify_id': '#7c3aed',
                  'verify_photo': '#7c3aed', 'verify_profession': '#7c3aed',
                };
                const actionColor = Object.entries(actionColors).find(([k]) => entry.action?.toLowerCase().includes(k))?.[1] || 'var(--primary-600)';
                return (
                  <div key={entry.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 20px',
                    borderBottom: idx < auditLog.length - 1 ? '1px solid var(--border-color)' : 'none',
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', background: actionColor,
                      marginTop: 6, flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{entry.admin_name || entry.admin_user_id?.slice(0, 8)}</span>
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 700, padding: '1px 8px', borderRadius: 4,
                          background: `${actionColor}18`, color: actionColor, textTransform: 'uppercase',
                        }}>
                          {entry.action}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        Target: {entry.target_id?.slice(0, 8)}... ({entry.target_type})
                        {entry.reason && <span> — {entry.reason}</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {timeAgo(entry.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --- ANALYTICS --- */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16 }}>
          {/* Profiles by Status - Pie */}
          <div className="card">
            <h3 style={{ fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <PieChart size={16} style={{ color: 'var(--primary-600)' }} /> Profiles by Status
            </h3>
            {loading ? (
              <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
              </div>
            ) : (
              <SimplePieChart data={pieData.filter(d => d.value > 0)} />
            )}
          </div>

          {/* New Profiles per Week - Bar */}
          <div className="card">
            <h3 style={{ fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChart3 size={16} style={{ color: 'var(--primary-600)' }} /> New Profiles (Last 12 Weeks)
            </h3>
            {loading ? (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
              </div>
            ) : (
              <SimpleBarChart data={weeklyData} maxVal={Math.max(...weeklyData.map(d => d.value), 1)} />
            )}
          </div>

          {/* Gender Distribution */}
          <div className="card">
            <h3 style={{ fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={16} style={{ color: 'var(--primary-600)' }} /> Gender Distribution
            </h3>
            {loading ? (
              <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
              </div>
            ) : (
              <SimplePieChart data={[
                { label: 'Male', value: profiles.filter(p => p.gender === 'male').length, color: '#0067A5' },
                { label: 'Female', value: profiles.filter(p => p.gender === 'female').length, color: '#ec4899' },
                { label: 'Other', value: profiles.filter(p => p.gender === 'other').length, color: '#8b5cf6' },
              ].filter(d => d.value > 0)} />
            )}
          </div>

          {/* Completeness Distribution */}
          <div className="card">
            <h3 style={{ fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={16} style={{ color: 'var(--primary-600)' }} /> Completeness Overview
            </h3>
            {loading ? (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
              </div>
            ) : (
              <SimpleBarChart
                data={[
                  { label: '0-25%', value: profiles.filter(p => p.completeness_pct <= 25).length },
                  { label: '26-50%', value: profiles.filter(p => p.completeness_pct > 25 && p.completeness_pct <= 50).length },
                  { label: '51-75%', value: profiles.filter(p => p.completeness_pct > 50 && p.completeness_pct <= 75).length },
                  { label: '76-90%', value: profiles.filter(p => p.completeness_pct > 75 && p.completeness_pct <= 90).length },
                  { label: '91-100%', value: profiles.filter(p => p.completeness_pct > 90).length },
                ]}
                maxVal={Math.max(...[
                  profiles.filter(p => p.completeness_pct <= 25).length,
                  profiles.filter(p => p.completeness_pct > 25 && p.completeness_pct <= 50).length,
                  profiles.filter(p => p.completeness_pct > 50 && p.completeness_pct <= 75).length,
                  profiles.filter(p => p.completeness_pct > 75 && p.completeness_pct <= 90).length,
                  profiles.filter(p => p.completeness_pct > 90).length,
                ], 1)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
