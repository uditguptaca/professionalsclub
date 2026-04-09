'use client';
import React from 'react';
import { usePortal } from '@/context/portal-context';
import { useApp } from '@/context/app-context';
import { ListTodo, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function EmployeeDashboard() {
  const { requests, updateRequestStatus, employees } = usePortal();
  const { currentUserId } = useApp();
  
  const employee = employees.find(e => e.id === currentUserId);
  const isApproved = employee?.status === 'active';

  // Find requests matching this employee's company that are queued
  const queue = requests.filter(r => r.status === 'queued' && r.companyId === employee?.companyId);
  // Find requests accepted by this employee
  const myReferrals = requests.filter(r => (r.status === 'matched' || r.status === 'accepted') && r.matchedEmployeeId === currentUserId);

  if (!isApproved) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center p-12 text-center h-[60vh]">
        <Clock size={48} className="text-warning-500 mb-4" />
        <h2 className="text-2xl font-bold font-display mb-2">Account Pending Verification</h2>
        <p className="text-secondary max-w-md mb-6">You need to complete onboarding and be approved by an Admin before you can view candidate requests.</p>
        <Link href="/portal/employee/onboarding" className="btn btn-primary">Go to Onboarding</Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Referral Queue</h1>
          <p className="text-secondary">Review candidates requesting referrals at <strong>{employee?.companyName}</strong>.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-bg-elevated border border-border-color px-4 py-2 rounded-lg flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success-400 animate-pulse"></div>
            <span className="text-sm font-bold">Accepting Requests</span>
          </div>
        </div>
      </div>

      <div className="grid grid-3 gap-6">
        <div className="card-stat">
          <div className="text-sm text-muted uppercase tracking-wider mb-2">Pending in Queue</div>
          <div className="text-3xl font-bold">{queue.length}</div>
        </div>
        <div className="card-stat">
          <div className="text-sm text-muted uppercase tracking-wider mb-2">My Active Referrals</div>
          <div className="text-3xl font-bold text-primary-400">{myReferrals.length}</div>
        </div>
        <div className="card-stat">
          <div className="text-sm text-muted uppercase tracking-wider mb-2">Global Reputation</div>
          <div className="text-3xl font-bold text-accent-400">{employee?.reputationScore}</div>
        </div>
      </div>

      {/* Queue Area */}
      <div>
        <h2 className="text-xl font-bold font-display mb-4 flex items-center gap-2">
          <ListTodo className="text-primary-400" /> Incoming Candidates
        </h2>

        {queue.length === 0 ? (
          <div className="card p-8 text-center bg-transparent border-dashed">
            <div className="text-secondary">No candidates are currently waiting in the {employee?.companyName} queue.</div>
          </div>
        ) : (
          <div className="grid gap-4">
            {queue.map(req => (
              <div key={req.id} className="card p-0 flex overflow-hidden">
                <div className="p-6 flex-1 border-r border-border-color">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{req.seekerName}</h3>
                      <div className="text-sm text-primary-400 mt-1">Applying for: {req.jobTitle}</div>
                    </div>
                    <span className="badge badge-warning">Waiting for Response</span>
                  </div>
                  
                  <div className="bg-primary-50 p-4 rounded-lg mb-4 text-sm text-secondary italic border-l-4 border-l-primary-500">
                    "{req.fitSummary}"
                  </div>

                  <div className="flex gap-4">
                    <button className="btn btn-outline btn-sm">
                      <ExternalLink size={14} /> View Job Post
                    </button>
                    <button className="btn btn-outline btn-sm">
                      <ExternalLink size={14} /> View Resume
                    </button>
                  </div>
                </div>

                <div className="w-64 bg-gray-50 p-6 flex flex-col justify-center gap-3">
                  <button 
                    className="btn btn-success w-full"
                    onClick={() => updateRequestStatus(req.id, 'matched')}
                  >
                    Accept & Chat
                  </button>
                  <button 
                    className="btn btn-outline w-full hover:bg-error-50 hover:text-error-600 hover:border-error-200"
                  >
                    Decline Waitlist
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Matches */}
      {myReferrals.length > 0 && (
        <div className="mt-4">
          <h2 className="text-xl font-bold font-display mb-4 flex items-center gap-2">
            <CheckCircle className="text-success-400" /> My Active Referrals
          </h2>
          <div className="grid gap-4">
            {myReferrals.map(req => (
              <div key={req.id} className="card p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-bold">{req.seekerName}</h4>
                  <div className="text-sm text-secondary mt-1">{req.jobTitle}</div>
                </div>
                <div className="flex gap-3">
                  <button className="btn btn-primary btn-sm">Open Chat</button>
                  <button 
                    className="btn btn-success btn-sm"
                    onClick={() => updateRequestStatus(req.id, 'completed')}
                  >Mark Complete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
