'use client';
import React, { useState } from 'react';
import { usePortal } from '@/context/portal-context';
import { useApp } from '@/context/app-context';
import { ShieldCheck, Mail, Link as LinkIcon, CheckCircle2, Clock } from 'lucide-react';

export default function EmployeeOnboarding() {
  const { employees } = usePortal();
  const { currentUserId } = useApp();
  
  const employee = employees.find(e => e.id === currentUserId);
  const isPending = employee?.status === 'pending';
  const isApproved = employee?.status === 'active';

  const [emailSent, setEmailSent] = useState(false);

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold font-display mb-2">Referrer Verification Program</h1>
        <p className="text-secondary max-w-xl mx-auto">To maintain the highest quality network, we verify all referrers before they can accept requests on IndoCanada Club.</p>
      </div>

      <div className="card shadow-lg relative overflow-hidden">
        {/* Status Banner */}
        {isPending && (
          <div className="absolute top-0 left-0 w-full bg-warning-100 text-warning-800 border-b border-warning-200 text-center py-2 text-sm font-bold flex items-center justify-center gap-2">
            <Clock size={16} /> Verification Pending Admin Review
          </div>
        )}
        {isApproved && (
          <div className="absolute top-0 left-0 w-full bg-success-500 text-white text-center py-2 text-sm font-bold flex items-center justify-center gap-2">
            <ShieldCheck size={16} /> You are an Approved Referrer!
          </div>
        )}

        <div className={`p-6 ${isPending || isApproved ? 'pt-12' : ''}`}>
          
          <div className="flex flex-col gap-6">
            {/* Step 1: Work Email */}
            <div className={`p-4 rounded-xl border ${employee?.workEmailVerified ? 'bg-success-400/10 border-success-400/30' : 'bg-bg-elevated border-border-color'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${employee?.workEmailVerified ? 'bg-success-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <Mail size={20} />
                  </div>
                  <div>
                    <div className="font-bold">Work Email Verification</div>
                    <div className="text-sm text-secondary">
                      {employee?.workEmail || 'No email attached'}
                    </div>
                  </div>
                </div>
                <div>
                  {employee?.workEmailVerified ? (
                    <div className="flex items-center gap-1 text-success-400 font-bold text-sm">
                      <CheckCircle2 size={16} /> Verified
                    </div>
                  ) : (
                    <button 
                      className="btn btn-outline btn-sm"
                      onClick={() => setEmailSent(true)}
                      disabled={emailSent}
                    >
                      {emailSent ? 'Sent!' : 'Send Code'}
                    </button>
                  )}
                </div>
              </div>
              {emailSent && !employee?.workEmailVerified && (
                <div className="mt-4 pt-4 border-t border-border-color flex items-center gap-2 animate-fade-in">
                  <input type="text" className="input flex-1" placeholder="Enter 6-digit OTP" />
                  <button className="btn btn-primary">Verify OTP</button>
                </div>
              )}
            </div>

            {/* Step 2: LinkedIn */}
            <div className={`p-4 rounded-xl border ${employee?.linkedinVerified ? 'bg-success-400/10 border-success-400/30' : 'bg-bg-elevated border-border-color'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${employee?.linkedinVerified ? 'bg-success-400 text-white' : 'bg-[#0A66C2] text-white'}`}>
                    <LinkIcon size={20} />
                  </div>
                  <div>
                    <div className="font-bold">Connect LinkedIn Profile</div>
                    <div className="text-sm text-secondary">Used for identity cross-checking</div>
                  </div>
                </div>
                <div>
                  {employee?.linkedinVerified ? (
                    <div className="flex items-center gap-1 text-success-400 font-bold text-sm">
                      <CheckCircle2 size={16} /> Verified
                    </div>
                  ) : (
                    <button className="btn btn-outline btn-sm">Connect</button>
                  )}
                </div>
              </div>
            </div>

            {/* Step 3: Admin Approval */}
            <div className={`p-4 rounded-xl border ${isApproved ? 'bg-success-400/10 border-success-400/30' : 'bg-bg-elevated border-border-color'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isApproved ? 'bg-success-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <div className="font-bold">Admin Manual Review</div>
                    <div className="text-sm text-secondary">Our team reviews your details to prevent fraud.</div>
                  </div>
                </div>
                <div>
                  {isApproved ? (
                    <div className="flex items-center gap-1 text-success-400 font-bold text-sm">
                      <CheckCircle2 size={16} /> Approved
                    </div>
                  ) : isPending ? (
                    <div className="flex items-center gap-1 text-warning-400 font-bold text-sm">
                      <Clock size={16} /> In Review
                    </div>
                  ) : (
                    <button className="btn btn-primary btn-sm" disabled>Submit to Admin</button>
                  )}
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
