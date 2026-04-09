'use client';
import React from 'react';
import { usePortal } from '@/context/portal-context';
import { Check, X, Building2, Link as LinkIcon, Mail } from 'lucide-react';

export default function AdminApprovals() {
  const { employees, approveEmployee } = usePortal();
  
  const pendingQueue = employees.filter(e => e.status === 'pending');

  return (
    <div className="animate-fade-in flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-display font-bold mb-2">Referrer Approval Queue</h1>
        <p className="text-secondary">Verify employee identities before they are admitted to the supply network.</p>
      </div>

      <div className="card p-0 overflow-hidden border-warning-500/30">
        <div className="bg-warning-500/10 p-4 border-b border-border-color flex justify-between items-center">
          <div className="font-bold font-display text-warning-400">Action Required: {pendingQueue.length} Pending</div>
        </div>

        {pendingQueue.length === 0 ? (
          <div className="p-12 text-center text-secondary">
            Queue is empty. Network is fully verified.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border-color">
            {pendingQueue.map(emp => (
              <div key={emp.id} className="p-6 flex items-start justify-between hover:bg-bg-glass-hover transition-colors">
                
                <div className="flex gap-6">
                  {/* Avatar Column */}
                  <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center font-display text-2xl font-bold text-primary-600">
                    {emp.name.charAt(0)}
                  </div>
                  
                  {/* Context Column */}
                  <div className="flex flex-col gap-1">
                    <h3 className="font-bold text-xl">{emp.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-secondary">
                      <Building2 size={16} className="text-primary-400" />
                      <span>{emp.title} at <strong>{emp.companyName}</strong></span>
                    </div>

                    <div className="flex gap-3 mt-3">
                       <span className={`badge ${emp.workEmailVerified ? 'badge-success' : 'badge-neutral'}`}>
                         <Mail size={12} className="mr-1" />
                         {emp.workEmailVerified ? 'Work Email Verified' : 'Email Unverified'}
                       </span>
                       
                       <span className={`badge ${emp.linkedinVerified ? 'badge-success' : 'badge-neutral'}`}>
                         <LinkIcon size={12} className="mr-1" />
                         {emp.linkedinVerified ? 'LinkedIn Verified' : 'Manual Rec Check Required'}
                       </span>
                    </div>
                    
                    {!emp.linkedinVerified && (
                      <div className="mt-3 bg-bg-elevated p-3 rounded border border-border-color text-xs">
                        <strong className="text-muted">LinkedIn URL provided:</strong><br/>
                        <a href={`https://${emp.linkedinUrl}`} target="_blank" rel="noreferrer" className="text-accent-400 hover:underline">{emp.linkedinUrl}</a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 min-w-[140px]">
                  <button 
                    className="btn btn-success w-full flex items-center justify-center gap-1"
                    onClick={() => approveEmployee(emp.id)}
                  >
                    <Check size={16} /> Approve
                  </button>
                  <button className="btn btn-outline w-full flex items-center justify-center gap-1 hover:border-error-600 hover:text-error-600 hover:bg-error-50">
                    <X size={16} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
