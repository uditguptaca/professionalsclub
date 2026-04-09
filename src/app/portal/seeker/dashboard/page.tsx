'use client';
import React from 'react';
import Link from 'next/link';
import { usePortal } from '@/context/portal-context';
import { FileText, Clock, CheckCircle, Search, ArrowRight } from 'lucide-react';

export default function SeekerDashboard() {
  const { requests } = usePortal();
  
  // Stats
  const activeRequests = requests.filter(r => ['queued', 'matched', 'under_review'].includes(r.status));
  const completedRequests = requests.filter(r => r.status === 'completed' || r.status === 'accepted');

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* Header Area */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Welcome back, John!</h1>
          <p className="text-secondary">Track your referral requests and find matches at top Canadian employers.</p>
        </div>
        <Link href="/portal/seeker/request" className="btn btn-primary">
          <Search size={18} />
          Request New Referral
        </Link>
      </div>

      {/* Stats Board */}
      <div className="grid grid-3 gap-6">
        <div className="card-stat">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-500/10 text-primary-600 rounded-lg">
              <Clock size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-primary-900">{activeRequests.length}</div>
              <div className="text-sm text-muted font-medium uppercase tracking-wider">Active Requests</div>
            </div>
          </div>
        </div>
        
        <div className="card-stat">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-success-500/10 text-success-600 rounded-lg">
              <CheckCircle size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-primary-900">{completedRequests.length}</div>
              <div className="text-sm text-muted font-medium uppercase tracking-wider">Successful Matches</div>
            </div>
          </div>
        </div>

        <div className="card-stat" style={{ borderColor: 'var(--accent-500)' }}>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-accent-500/10 text-accent-600 rounded-lg">
              <FileText size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-primary-900">2</div>
              <div className="text-sm text-accent-400 font-medium uppercase tracking-wider">Free Tokens Left</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold font-display">Recent Requests</h2>
          <Link href="/portal/seeker/matches" className="text-sm text-primary-400 font-medium flex items-center gap-1 hover:text-primary-300">
            View All <ArrowRight size={14} />
          </Link>
        </div>

        {requests.length === 0 ? (
          <div className="card flex flex-col items-center justify-center p-12 text-center border-dashed border-gray-300 bg-transparent">
            <Search size={48} className="text-muted mb-4 opacity-50" />
            <h3 className="text-lg font-bold mb-2">No active requests yet</h3>
            <p className="text-secondary max-w-sm mb-6">Start by finding a role at your target company and request a referral from our verified network.</p>
            <Link href="/portal/seeker/request" className="btn btn-outline">Start a Request</Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {requests.slice(0, 5).map(req => (
              <div key={req.id} className="card p-4 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 flex items-center justify-center rounded-lg font-bold text-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)' }}>
                    {req.companyLogo}
                  </div>
                  <div>
                    <h4 className="font-bold">{req.jobTitle} at {req.companyName}</h4>
                    <div className="flex items-center gap-3 text-sm text-secondary mt-1">
                      <span>Submitted: {new Date(req.submittedAt).toLocaleDateString()}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                      <span>{req.jobLocation}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className={`badge ${
                    req.status === 'matched' || req.status === 'accepted' ? 'badge-success' : 
                    req.status === 'queued' ? 'badge-warning' : 'badge-neutral'
                  } capitalize px-3 py-1`}>
                    {req.status}
                  </span>
                  <Link href={`/portal/seeker/matches`} className="btn btn-ghost btn-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
