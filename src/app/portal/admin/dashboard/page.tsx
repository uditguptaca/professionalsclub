'use client';
import React, { useEffect, useRef } from 'react';
import { usePortal } from '@/context/portal-context';
import { BarChart3, Users, FileText, HandHeart, FolderKanban, AlertTriangle, Clock, CheckCircle, Building2 } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const { helpRequests, volunteerApps, assignments, stats, businesses, loading } = usePortal();

  const newRequests = helpRequests.filter(r => r.status === 'submitted');
  const pendingApps = volunteerApps.filter(a => ['new_application', 'pending_verification'].includes(a.status));
  const activeAssignments = assignments.filter(a => ['pending', 'in_progress'].includes(a.status));

  const categoryEntries = Object.entries(stats.categoryCounts).sort((a, b) => b[1] - a[1]);
  // Sorted descending, so the head is the busiest category. Bars are scaled
  // against it rather than a fixed denominator, which mis-sized every bar and
  // let anything past the guessed ceiling run over the end of the track.
  const busiestCategoryCount = categoryEntries[0]?.[1] ?? 0;

  /**
   * The context's `loading` starts false and only flips inside the effect that
   * kicks off the fetch, which runs after the first paint. Reading it alone
   * would still let one frame of confident zeroes through, so the first load is
   * treated as pending until `loading` has actually been observed true. Every
   * transition that matters changes `loading`, so the ref is current wherever
   * `pending` is read.
   */
  const sawLoading = useRef(false);
  useEffect(() => {
    if (loading) sawLoading.current = true;
  }, [loading]);
  const pending = loading || !sawLoading.current;

  /**
   * A figure derived from a snapshot that has not arrived yet is a guess, not a
   * fact, and zero is the most confident guess of all. Until the load settles,
   * every count on this page renders as a placeholder instead.
   */
  const counter = (value: React.ReactNode, width: number) =>
    pending
      ? <span className="skeleton" style={{ display: 'block', width, height: '1.5rem', borderRadius: 6 }} />
      : value;

  const rowSkeletons = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[0, 1, 2].map(i => <div key={i} className="skeleton" style={{ height: 46, borderRadius: 8 }} />)}
    </div>
  );

  return (
    <div className="animate-fade-in flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-display font-bold mb-2">Admin Overview</h1>
        <p className="text-secondary">Manage all help requests, volunteer applications, and assignments from this dashboard.</p>
      </div>

      {/* Summary Counters */}
      <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
        {[
          { label: 'Open Requests', value: stats.openRequests, icon: <FileText size={22} />, color: 'var(--primary-600)', bg: 'rgba(232, 93, 4, 0.1)', href: '/portal/admin/requests' },
          { label: 'Pending Volunteers', value: pendingApps.length, icon: <HandHeart size={22} />, color: 'var(--success-600)', bg: 'rgba(5,150,105,0.1)', href: '/portal/admin/volunteers' },
          { label: 'Active Assignments', value: activeAssignments.length, icon: <FolderKanban size={22} />, color: 'var(--accent-600)', bg: 'rgba(245,158,11,0.1)', href: '/portal/admin/assignments' },
          { label: 'Total Members', value: stats.totalMembers, icon: <Users size={22} />, color: 'var(--text-primary)', bg: 'var(--bg-secondary)', href: '/portal/admin/members' },
          { label: 'Businesses', value: businesses.filter(b => b.verificationStatus === 'verified').length, icon: <Building2 size={22} />, color: 'var(--primary-600)', bg: 'rgba(232, 93, 4, 0.1)', href: '/portal/admin/businesses' },
        ].map((item, i) => (
          <Link key={i} href={item.href} style={{ textDecoration: 'none' }}>
            <div className="card-stat" style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ padding: 10, background: item.bg, borderRadius: 10, color: item.color }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1 }}>{counter(item.value, 44)}</div>
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
              <AlertTriangle size={16} style={{ color: 'var(--accent-600)' }} /> New Requests
            </h3>
            {!pending && (
              <span style={{ fontSize: '0.7rem', fontWeight: 700, background: newRequests.length > 0 ? 'var(--accent-100)' : 'var(--bg-secondary)', color: newRequests.length > 0 ? 'var(--primary-800)' : 'var(--text-muted)', padding: '2px 10px', borderRadius: 99 }}>
                {newRequests.length}
              </span>
            )}
          </div>
          {pending ? rowSkeletons : newRequests.length === 0 ? (
            <p className="text-secondary text-sm">All caught up. No new requests.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {newRequests.slice(0, 3).map(req => (
                <Link key={req.id} href={`/portal/admin/requests/${req.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fefce8', border: '1px solid var(--accent-200)', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <div style={{ fontWeight: 600 }}>{req.title}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--primary-800)', marginTop: 2 }}>{req.memberName} • {req.category}</div>
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
              <HandHeart size={16} style={{ color: 'var(--success-600)' }} /> Pending Volunteer Apps
            </h3>
            {!pending && (
              <span style={{ fontSize: '0.7rem', fontWeight: 700, background: pendingApps.length > 0 ? 'var(--success-50)' : 'var(--bg-secondary)', color: pendingApps.length > 0 ? 'var(--success-600)' : 'var(--text-muted)', padding: '2px 10px', borderRadius: 99 }}>
                {pendingApps.length}
              </span>
            )}
          </div>
          {pending ? rowSkeletons : pendingApps.length === 0 ? (
            <p className="text-secondary text-sm">No pending applications.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pendingApps.slice(0, 3).map(app => (
                <Link key={app.id} href="/portal/admin/volunteers" style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--success-50)', border: '1px solid var(--success-50)', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <div style={{ fontWeight: 600 }}>{app.memberName}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--success-600)', marginTop: 2 }}>{app.currentProfession} at {app.organization}</div>
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
            <div key={i} style={{ padding: 16, borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', justifyContent: 'center' }}>{counter(m.value, 60)}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Distribution */}
      <div className="card">
        <h3 className="font-bold font-display mb-4">Requests by Category</h3>
        {pending ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[0, 1, 2].map(i => <div key={i} className="skeleton" style={{ height: 20, borderRadius: 4 }} />)}
          </div>
        ) : categoryEntries.length === 0 ? (
          <p className="text-secondary text-sm">No requests yet, so there is nothing to break down by category.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {categoryEntries.map(([cat, count]) => (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500 }}>{cat}</div>
                <div style={{ width: 200, height: 8, borderRadius: 4, background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, var(--primary-500), var(--primary-400))', width: `${busiestCategoryCount > 0 ? (count / busiestCategoryCount) * 100 : 0}%` }} />
                </div>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, minWidth: 28, textAlign: 'right' }}>{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
