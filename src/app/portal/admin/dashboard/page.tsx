'use client';
import React from 'react';
import { usePortal } from '@/context/portal-context';
import { BarChart3, Users, FileText, HandHeart, FolderKanban, AlertTriangle, Clock, CheckCircle, Building2 } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const { helpRequests, volunteerApps, assignments, stats, businesses } = usePortal();

  const newRequests = helpRequests.filter(r => r.status === 'submitted');
  const underReview = helpRequests.filter(r => r.status === 'under_review');
  const pendingApps = volunteerApps.filter(a => ['new_application', 'pending_verification'].includes(a.status));
  const activeAssignments = assignments.filter(a => ['pending', 'in_progress'].includes(a.status));

  return (
    <div className="animate-fade-in flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-display font-bold mb-2">Admin Overview</h1>
        <p className="text-secondary">Manage all help requests, volunteer applications, and assignments from this dashboard.</p>
      </div>

      {/* Summary Counters */}
      <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
        {[
          { label: 'Open Requests', value: stats.openRequests, icon: <FileText size={22} />, color: '#6366f1', bg: 'rgba(99,102,241,0.1)', href: '/portal/admin/requests' },
          { label: 'Pending Volunteers', value: pendingApps.length, icon: <HandHeart size={22} />, color: '#059669', bg: 'rgba(5,150,105,0.1)', href: '/portal/admin/volunteers' },
          { label: 'Active Assignments', value: activeAssignments.length, icon: <FolderKanban size={22} />, color: '#d97706', bg: 'rgba(245,158,11,0.1)', href: '/portal/admin/assignments' },
          { label: 'Total Members', value: stats.totalMembers, icon: <Users size={22} />, color: '#374151', bg: '#f3f4f6', href: '/portal/admin/members' },
          { label: 'Businesses', value: businesses.filter(b => b.verificationStatus === 'verified').length, icon: <Building2 size={22} />, color: '#0067a5', bg: 'rgba(0,103,165,0.1)', href: '/portal/admin/businesses' },
        ].map((item, i) => (
          <Link key={i} href={item.href} style={{ textDecoration: 'none' }}>
            <div className="card-stat" style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ padding: 10, background: item.bg, borderRadius: 10, color: item.color }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1 }}>{item.value}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{item.label}</div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Queue Cards */}
      <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* New Requests */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 className="font-bold font-display" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} style={{ color: '#d97706' }} /> New Requests
            </h3>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, background: newRequests.length > 0 ? '#fef3c7' : '#f3f4f6', color: newRequests.length > 0 ? '#92400e' : '#9ca3af', padding: '2px 10px', borderRadius: 99 }}>
              {newRequests.length}
            </span>
          </div>
          {newRequests.length === 0 ? (
            <p className="text-secondary text-sm">All caught up! No new requests.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {newRequests.slice(0, 3).map(req => (
                <Link key={req.id} href={`/portal/admin/requests/${req.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fefce8', border: '1px solid #fde68a', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <div style={{ fontWeight: 600 }}>{req.title}</div>
                    <div style={{ fontSize: '0.72rem', color: '#92400e', marginTop: 2 }}>{req.memberName} • {req.category}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Pending Volunteer Apps */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 className="font-bold font-display" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <HandHeart size={16} style={{ color: '#059669' }} /> Pending Volunteer Apps
            </h3>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, background: pendingApps.length > 0 ? '#d1fae5' : '#f3f4f6', color: pendingApps.length > 0 ? '#065f46' : '#9ca3af', padding: '2px 10px', borderRadius: 99 }}>
              {pendingApps.length}
            </span>
          </div>
          {pendingApps.length === 0 ? (
            <p className="text-secondary text-sm">No pending applications.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pendingApps.slice(0, 3).map(app => (
                <Link key={app.id} href="/portal/admin/volunteers" style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <div style={{ fontWeight: 600 }}>{app.memberName}</div>
                    <div style={{ fontSize: '0.72rem', color: '#065f46', marginTop: 2 }}>{app.currentProfession} at {app.organization}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="card">
        <h3 className="font-bold font-display mb-4">Platform Metrics</h3>
        <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[
            { label: 'Total Requests', value: stats.totalRequests },
            { label: 'Closed Cases', value: stats.closedRequests },
            { label: 'Avg Resolution', value: `${stats.avgResolutionDays} days` },
            { label: 'Approved Volunteers', value: stats.approvedVolunteers },
          ].map((m, i) => (
            <div key={i} style={{ padding: 16, borderRadius: 10, background: '#f9fafb', border: '1px solid #e5e7eb', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{m.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Distribution */}
      <div className="card">
        <h3 className="font-bold font-display mb-4">Requests by Category</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.entries(stats.categoryCounts).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
            <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500 }}>{cat}</div>
              <div style={{ width: 200, height: 8, borderRadius: 4, background: '#f3f4f6', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, var(--primary-500), var(--primary-400))', width: `${(count / 28) * 100}%` }} />
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, minWidth: 28, textAlign: 'right' }}>{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
