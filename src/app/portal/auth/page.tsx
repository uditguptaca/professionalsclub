'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/app-context';
import type { UserRole } from '@/types';
import { LogIn, UserCircle, Briefcase, Settings } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const { setCurrentRole, setIsAuthenticated, currentRole } = useApp();
  const [loading, setLoading] = useState(false);

  const handleLogin = (role: UserRole, path: string) => {
    setLoading(true);
    // Simulate network delay
    setTimeout(() => {
      setCurrentRole(role);
      setIsAuthenticated(true);
      router.push(path);
    }, 800);
  };

  return (
    <div className="section" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyItems: 'center', position: 'relative', overflow: 'hidden' }}>
      
      {/* Ambient background glows for contrast */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, rgba(255,255,255,0) 70%)', filter: 'blur(40px)', zIndex: 0, pointerEvents: 'none' }}></div>
      <div style={{ position: 'absolute', top: '20%', left: '30%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(251,191,36,0.05) 0%, rgba(255,255,255,0) 70%)', filter: 'blur(40px)', zIndex: 0, pointerEvents: 'none' }}></div>

      <div className="container" style={{ maxWidth: '600px', position: 'relative', zIndex: 10 }}>
        
        <div className="text-center mb-8" style={{ marginBottom: 'var(--space-8)' }}>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-400 mb-6 mx-auto shadow-glow">
            <span className="text-3xl font-black text-white font-display">C</span>
          </div>
          <h1 className="text-3xl font-bold font-display mb-2">Welcome to IndoCanada Club</h1>
          <p className="text-secondary">Select a profile below to log in and test the MVP portals.</p>
        </div>

        <div className="grid gap-4">
          {/* Seeker Login */}
          <button 
            className="card card-clickable text-left flex items-center justify-between transition-transform"
            style={{ background: 'linear-gradient(135deg, var(--primary-600), var(--primary-400))', color: 'white', border: 'none', boxShadow: '0 10px 25px rgba(99, 102, 241, 0.3)' }}
            onClick={() => handleLogin('seeker', '/portal/seeker/dashboard')}
            disabled={loading}
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 mb-1">
                <UserCircle className="text-white" size={24} />
                <span className="font-bold text-xl text-white">Login as Job Seeker</span>
              </div>
              <span className="text-sm text-white/80">Test the referral request flow, browse companies, and view matches.</span>
            </div>
            <LogIn className="text-white/90" size={24} />
          </button>

          {/* Employee Login */}
          <button 
            className="card card-clickable text-left flex items-center justify-between mt-4 transition-transform"
            style={{ background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', border: 'none', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)' }}
            onClick={() => handleLogin('employee', '/portal/employee/dashboard')}
            disabled={loading}
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 mb-1">
                <Briefcase className="text-white" size={24} />
                <span className="font-bold text-xl text-white">Login as Referrer</span>
              </div>
              <span className="text-sm text-white/80">Accept incoming referral requests and manage your onboarding profile.</span>
            </div>
            <LogIn className="text-white/90" size={24} />
          </button>

          {/* Admin Login */}
          <button 
            className="card card-clickable text-left flex items-center justify-between mt-4 transition-transform"
            style={{ background: 'linear-gradient(135deg, #6366f1, #d946ef)', color: 'white', border: 'none', boxShadow: '0 10px 25px rgba(217, 70, 239, 0.3)' }}
            onClick={() => handleLogin('admin', '/portal/admin/dashboard')}
            disabled={loading}
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 mb-1">
                <Settings className="text-white" size={24} />
                <span className="font-bold text-xl text-white">Login as System Admin</span>
              </div>
              <span className="text-sm text-white/80">Manage global pricing, daily limits, and approve employee signups.</span>
            </div>
            <LogIn className="text-white/90" size={24} />
          </button>
        </div>

      </div>
    </div>
  );
}
