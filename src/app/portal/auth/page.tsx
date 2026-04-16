'use client';
import React, { useState } from 'react';
import { useApp } from '@/context/app-context';
import type { UserRole } from '@/types';
import { LogIn, UserCircle, Shield, HelpCircle, HandHeart } from 'lucide-react';

export default function AuthPage() {
  const { setCurrentRole, setIsAuthenticated } = useApp();
  const [loading, setLoading] = useState(false);

  const handleLogin = (role: UserRole) => {
    if (loading) return;
    setLoading(true);
    setCurrentRole(role);
    setIsAuthenticated(true);
  };

  return (
    <div className="section" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>

      {/* Ambient glows */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, rgba(255,255,255,0) 70%)', filter: 'blur(40px)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '20%', left: '30%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(251,191,36,0.05) 0%, rgba(255,255,255,0) 70%)', filter: 'blur(40px)', zIndex: 0, pointerEvents: 'none' }} />

      <div className="container" style={{ maxWidth: '560px', position: 'relative', zIndex: 10 }}>

        <div className="text-center mb-8" style={{ marginBottom: 'var(--space-8)' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg, var(--primary-600), var(--primary-400))', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, boxShadow: '0 10px 30px rgba(99,102,241,0.3)' }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: 'white' }}>PC</span>
          </div>
          <h1 className="text-3xl font-bold font-display mb-2">Professionals Club Help Desk</h1>
          <p className="text-secondary" style={{ maxWidth: 420, margin: '0 auto' }}>A managed community support platform. Request help or volunteer to help others — all coordinated through admin.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Member Login */}
          <button
            className="card card-clickable text-left flex items-center justify-between transition-transform"
            style={{ background: 'linear-gradient(135deg, var(--primary-600), var(--primary-400))', color: 'white', border: 'none', boxShadow: '0 10px 25px rgba(99, 102, 241, 0.3)', padding: '24px 28px' }}
            onClick={() => handleLogin('member')}
            disabled={loading}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <UserCircle size={24} />
                <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>Login as Member</span>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', opacity: 0.85, display: 'flex', alignItems: 'center', gap: 4 }}><HelpCircle size={14} /> Request Help</span>
                <span style={{ fontSize: '0.8rem', opacity: 0.85, display: 'flex', alignItems: 'center', gap: 4 }}><HandHeart size={14} /> Volunteer</span>
              </div>
              <span style={{ fontSize: '0.78rem', opacity: 0.7, marginTop: 4 }}>Submit help requests, apply to volunteer, track your cases, and receive admin updates.</span>
            </div>
            <LogIn style={{ opacity: 0.9 }} size={24} />
          </button>

          {/* Admin Login */}
          <button
            className="card card-clickable text-left flex items-center justify-between transition-transform"
            style={{ background: 'linear-gradient(135deg, #6366f1, #d946ef)', color: 'white', border: 'none', boxShadow: '0 10px 25px rgba(217, 70, 239, 0.3)', padding: '24px 28px' }}
            onClick={() => handleLogin('admin')}
            disabled={loading}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <Shield size={24} />
                <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>Login as Admin</span>
              </div>
              <span style={{ fontSize: '0.78rem', opacity: 0.7 }}>Manage all requests, volunteer applications, assignments, messaging, and audit logs.</span>
            </div>
            <LogIn style={{ opacity: 0.9 }} size={24} />
          </button>
        </div>

        {/* Info */}
        <div style={{ marginTop: 32, padding: '16px 20px', borderRadius: 12, background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <Shield size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
            <strong>No direct member contact.</strong> All interactions are admin-mediated for safety and privacy.
          </p>
        </div>
      </div>
    </div>
  );
}
