'use client';
import React from 'react';
import Link from 'next/link';
import { usePortal } from '@/context/portal-context';
import { useApp } from '@/context/app-context';
import { HelpCircle, HandHeart, FileText, ClipboardList, MessageSquare, ArrowRight, Bell, CheckCircle, Building2, Tag, Star } from 'lucide-react';

export default function MemberDashboard() {
  const { helpRequests, volunteerApps, messages } = usePortal();
  const { currentUserId } = useApp();

  const myRequests = helpRequests.filter(r => r.memberId === currentUserId);
  const myVolunteerApp = volunteerApps.find(a => a.memberId === currentUserId);
  const myMessages = messages.filter(m => (m.recipientRole === 'member' && m.visibilityScope === 'member_only'));
  const unreadMessages = myMessages.filter(m => !m.read).length;
  const openRequests = myRequests.filter(r => !['resolved', 'closed', 'rejected', 'archived'].includes(r.status));

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-display font-bold mb-2">Welcome to the Help Desk</h1>
        <p className="text-secondary">How can we help you today? Choose an action below or track your existing requests.</p>
      </div>

      {/* Primary Actions */}
      <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Link href="/portal/member/request-help" style={{ textDecoration: 'none' }}>
          <div className="card card-clickable" style={{ background: 'linear-gradient(135deg, var(--primary-600), var(--primary-400))', color: 'white', border: 'none', padding: '32px 28px', boxShadow: '0 10px 30px rgba(99,102,241,0.25)', transition: 'transform 0.2s', cursor: 'pointer' }}>
            <HelpCircle size={36} style={{ marginBottom: 16, opacity: 0.9 }} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 8 }}>Request Help</h2>
            <p style={{ fontSize: '0.85rem', opacity: 0.85, lineHeight: 1.5 }}>Submit a support request for job referrals, settlement guidance, tax help, mentorship, and more.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 16, fontSize: '0.85rem', fontWeight: 600 }}>
              Get Started <ArrowRight size={16} />
            </div>
          </div>
        </Link>

        <Link href="/portal/member/volunteer" style={{ textDecoration: 'none' }}>
          <div className="card card-clickable" style={{ background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', border: 'none', padding: '32px 28px', boxShadow: '0 10px 30px rgba(16,185,129,0.25)', transition: 'transform 0.2s', cursor: 'pointer' }}>
            <HandHeart size={36} style={{ marginBottom: 16, opacity: 0.9 }} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 8 }}>Volunteer to Help</h2>
            <p style={{ fontSize: '0.85rem', opacity: 0.85, lineHeight: 1.5 }}>Apply to become a volunteer or mentor. Help community members with your professional expertise.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 16, fontSize: '0.85rem', fontWeight: 600 }}>
              Apply Now <ArrowRight size={16} />
            </div>
          </div>
        </Link>
      </div>

      {/* Status Cards */}
      <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <Link href="/portal/member/my-requests" style={{ textDecoration: 'none' }}>
          <div className="card-stat" style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: 10, background: 'rgba(99,102,241,0.1)', borderRadius: 10 }}>
                <FileText size={22} className="text-primary-600" />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{myRequests.length}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>My Requests</div>
              </div>
            </div>
            {openRequests.length > 0 && (
              <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--primary-600)', fontWeight: 600 }}>
                {openRequests.length} active
              </div>
            )}
          </div>
        </Link>

        <Link href="/portal/member/my-volunteer" style={{ textDecoration: 'none' }}>
          <div className="card-stat" style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: 10, background: 'rgba(16,185,129,0.1)', borderRadius: 10 }}>
                <ClipboardList size={22} style={{ color: '#059669' }} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                  {myVolunteerApp ? (
                    <span style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {myVolunteerApp.status === 'approved' && <><CheckCircle size={16} style={{ color: '#059669' }} /> Approved</>}
                      {myVolunteerApp.status === 'pending_verification' && '⏳ Pending'}
                      {myVolunteerApp.status === 'new_application' && '📝 Submitted'}
                      {myVolunteerApp.status === 'rejected' && '❌ Rejected'}
                      {!['approved', 'pending_verification', 'new_application', 'rejected'].includes(myVolunteerApp.status) && myVolunteerApp.status}
                    </span>
                  ) : '—'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Volunteer Status</div>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/portal/member/messages" style={{ textDecoration: 'none' }}>
          <div className="card-stat" style={{ cursor: 'pointer', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: 10, background: 'rgba(245,158,11,0.1)', borderRadius: 10, position: 'relative' }}>
                <MessageSquare size={22} style={{ color: '#d97706' }} />
                {unreadMessages > 0 && (
                  <div style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', color: 'white', fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unreadMessages}</div>
                )}
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{myMessages.length}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin Messages</div>
              </div>
            </div>
            {unreadMessages > 0 && (
              <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>
                {unreadMessages} unread
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* Recent Requests */}
      {myRequests.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 className="text-xl font-bold font-display">Recent Requests</h2>
            <Link href="/portal/member/my-requests" style={{ fontSize: '0.85rem', color: 'var(--primary-600)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {myRequests.slice(0, 3).map(req => (
              <Link key={req.id} href={`/portal/member/my-requests/${req.id}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{req.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
                      <span>{req.category}</span>
                      <span>•</span>
                      <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span className={`badge ${
                    ['resolved', 'closed'].includes(req.status) ? 'badge-success' :
                    ['submitted', 'under_review'].includes(req.status) ? 'badge-warning' :
                    req.status === 'rejected' ? 'badge-error' : 'badge-primary'
                  }`} style={{ textTransform: 'capitalize', fontSize: '0.7rem' }}>
                    {req.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Business Directory CTA */}
      <Link href="/portal/member/businesses" style={{ textDecoration: 'none' }}>
        <div className="card card-clickable" style={{ background: 'linear-gradient(135deg, #0067a5, #0ea5e9)', color: 'white', border: 'none', padding: '24px 28px', boxShadow: '0 8px 24px rgba(0,103,165,0.25)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ padding: 12, background: 'rgba(255,255,255,0.15)', borderRadius: 12 }}>
            <Building2 size={28} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 4 }}>Discover Verified Businesses</h3>
            <p style={{ fontSize: '0.82rem', opacity: 0.85, lineHeight: 1.5 }}>Find trusted local services with exclusive member rates — tax, legal, real estate, financial planning & more.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-flex', padding: '4px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.2)', fontSize: '0.7rem', fontWeight: 700 }}><Tag size={11} style={{ marginRight: 4 }} /> Member Deals</span>
            <ArrowRight size={20} />
          </div>
        </div>
      </Link>

      {/* Safety Notice */}
      <div style={{ padding: '16px 20px', borderRadius: 12, background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)' }}>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6, textAlign: 'center' }}>
          🔒 <strong>Your privacy is protected.</strong> All communications go through our admin team. No member can contact you directly.
        </p>
      </div>
    </div>
  );
}
