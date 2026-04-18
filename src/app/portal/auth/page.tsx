'use client';
import React, { useState } from 'react';
import { useApp } from '@/context/app-context';
import type { UserRole } from '@/types';
import { Shield, UserCircle, LogIn } from 'lucide-react';
import Link from 'next/link';

export default function AuthPage() {
  const { setCurrentRole, setIsAuthenticated } = useApp();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (username === 'admin' && password === 'password123') {
      executeLogin('admin');
    } else if (username === 'member' && password === 'password123') {
      executeLogin('member');
    } else {
      setError('Invalid username or password');
    }
  };

  const executeLogin = (role: UserRole) => {
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

        <div className="text-center mb-6" style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg, var(--primary-600), var(--primary-400))', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: '0 10px 30px rgba(99,102,241,0.3)' }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: 'white' }}>PC</span>
          </div>
          <h1 className="text-3xl font-bold font-display">Professionals Club Help Desk</h1>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card animate-fade-in" style={{ padding: '24px 32px', background: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
              <LogIn size={24} className="text-primary-600" />
              Sign In
            </h2>
            
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="input-group">
                <label>Username</label>
                <input 
                  type="text" 
                  className="input" 
                  value={username} 
                  onChange={e => setUsername(e.target.value)} 
                  placeholder="Enter your username" 
                  required 
                />
              </div>
              <div className="input-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ marginBottom: 0 }}>Password</label>
                  <a href="#" style={{ fontSize: '0.8rem', color: 'var(--primary-600)', fontWeight: 600 }}>Forgot password?</a>
                </div>
                <input 
                  type="password" 
                  className="input" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="••••••••" 
                  required 
                />
              </div>
              {error && <div style={{ color: 'var(--error-500)', fontSize: '0.85rem', fontWeight: 500, padding: '8px 12px', background: 'rgba(240, 73, 35, 0.1)', borderRadius: 8 }}>{error}</div>}
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ marginTop: 8, width: '100%' }} 
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              
              <div style={{ marginTop: 12, textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Don't have an account? <Link href="/portal/signup" style={{ color: 'var(--primary-600)', fontWeight: 600 }}>Sign up as Member</Link>
              </div>
            </form>

            {/* Demo Accounts */}
            <div style={{ marginTop: 32, padding: 20, border: '1px dashed var(--border-color)', borderRadius: 12 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                Demo Accounts
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                
                {/* Admin Demo Button */}
                <button
                  type="button"
                  onClick={() => {
                    setUsername('admin');
                    setPassword('password123');
                  }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.borderColor = '#d946ef'}
                  onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Shield size={16} color="#d946ef" />
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Super Admin</span>
                  </div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>admin</span>
                </button>

                {/* Member Demo Button */}
                <button
                  type="button"
                  onClick={() => {
                    setUsername('member');
                    setPassword('password123');
                  }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary-400)'}
                  onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <UserCircle size={16} color="var(--primary-600)" />
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Demo Member</span>
                  </div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>member</span>
                </button>

              </div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div style={{ marginTop: 32, padding: '16px 20px', borderRadius: 12, background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <Shield size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
            <strong>No direct member contact.</strong> All interactions are securely routed for safety and privacy.
          </p>
        </div>
      </div>
    </div>
  );
}
