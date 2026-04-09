'use client';
import React, { useState } from 'react';
import { usePortal } from '@/context/portal-context';
import { ShieldCheck, MessageSquare, Briefcase, FileText, Send, MoreVertical } from 'lucide-react';

export default function SeekerMatchesPage() {
  const { requests } = usePortal();
  const matchedRequests = requests.filter(r => r.status === 'matched' || r.status === 'assigned' || r.status === 'accepted');
  
  const [activeMatchId, setActiveMatchId] = useState(matchedRequests[0]?.id || null);
  const [message, setMessage] = useState('');
  
  const activeMatch = matchedRequests.find(r => r.id === activeMatchId);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-display">My Matches</h1>
        <p className="text-secondary">Chat directly with the employees who have accepted to review your profile.</p>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Match List Sidebar */}
        <div className="w-1/3 bg-bg-card border border-border-color rounded-xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border-color bg-bg-elevated/50 font-bold text-sm uppercase tracking-wider text-muted">
            Active Connections ({matchedRequests.length})
          </div>
          <div className="overflow-y-auto flex-1">
            {matchedRequests.length === 0 ? (
              <div className="p-8 text-center text-secondary text-sm">
                No active matches right now. Check your dashboard for queue status.
              </div>
            ) : (
              matchedRequests.map(req => (
                <div 
                  key={req.id}
                  onClick={() => setActiveMatchId(req.id)}
                  className={`p-4 border-b border-border-color cursor-pointer transition-colors ${activeMatchId === req.id ? 'bg-primary-50 border-l-4 border-l-primary-500' : 'hover:bg-bg-glass-hover border-l-4 border-l-transparent'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-primary-600">
                      {req.matchedEmployeeName ? req.matchedEmployeeName.charAt(0) : '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate text-sm">{req.matchedEmployeeName || 'Referrer'}</div>
                      <div className="text-xs text-muted truncate">{req.jobTitle} at {req.companyName}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 bg-bg-card border border-border-color rounded-xl flex flex-col relative overflow-hidden">
          {activeMatch ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border-color bg-bg-elevated/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-600 border border-primary-200">
                    {activeMatch.matchedEmployeeName?.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold flex items-center gap-2">
                      {activeMatch.matchedEmployeeName}
                      <ShieldCheck size={14} className="text-success-400" />
                    </div>
                    <div className="text-xs text-secondary">Verified Employee at {activeMatch.companyName}</div>
                  </div>
                </div>
                <button className="btn btn-ghost btn-icon"><MoreVertical size={18} /></button>
              </div>

              {/* Chat History */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                <div className="text-center text-xs text-muted my-2 uppercase tracking-wide">Connection Established • {new Date().toLocaleDateString()}</div>
                
                {/* System Message */}
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 text-sm mx-auto max-w-md text-center">
                  <Briefcase size={20} className="text-primary-500 mx-auto mb-2" />
                  Request for <strong>{activeMatch.jobTitle}</strong> was accepted! <br/>
                  Be polite and provide any additional context the referrer asks for.
                </div>

                {/* Simulated Messages */}
                <div className="flex gap-3 justify-end mt-4">
                  <div className="bg-primary-600 text-white rounded-2xl rounded-tr-sm py-2 px-4 max-w-[80%] text-sm">
                    Hi {activeMatch.matchedEmployeeName}, thanks so much for accepting my request! I believe my background in scalable systems fits the JD perfectly. Have you had a chance to glance at my resume?
                  </div>
                </div>

                <div className="flex gap-3 justify-start mt-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0 flex items-center justify-center text-xs font-bold text-gray-700">{activeMatch.matchedEmployeeName?.charAt(0)}</div>
                  <div className="bg-gray-100 text-gray-900 border border-gray-200 rounded-2xl rounded-tl-sm py-2 px-4 max-w-[80%] text-sm">
                    Hey! Yes, I just took a look. Your experience looks solid. Could you expand a bit on the microservices migration you mentioned in your Fit Summary? The hiring manager for this role is specifically looking for that.
                  </div>
                </div>
              </div>

              {/* Input Area */}
              <div className="p-4 bg-bg-elevated border-t border-border-color">
                <div className="flex items-center gap-2">
                  <button className="btn btn-ghost btn-icon shrink-0"><FileText size={20} /></button>
                  <input 
                    type="text" 
                    className="input rounded-full bg-bg-primary flex-1" 
                    placeholder="Type a message..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                  />
                  <button className="btn btn-primary rounded-full shrink-0 px-4" disabled={!message}>
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <MessageSquare size={48} className="text-muted opacity-30 mb-4" />
              <h3 className="text-xl font-bold mb-2">No Chat Selected</h3>
              <p className="text-secondary">Select a match from the sidebar to view your conversation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
