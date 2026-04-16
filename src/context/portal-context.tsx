'use client';
import React, { createContext, useContext, useState } from 'react';
import type { HelpRequest, VolunteerApplication, CaseAssignment, AdminMessage, AuditLogEntry, Member, HelpDeskStats, RequestStatus, VolunteerStatus } from '@/types';
import { mockHelpRequests, mockVolunteerApplications, mockAssignments, mockMessages, mockAuditLog, mockMembers, mockStats } from '@/lib/mock-data';

interface HelpDeskContextType {
  // Data
  members: Member[];
  helpRequests: HelpRequest[];
  volunteerApps: VolunteerApplication[];
  assignments: CaseAssignment[];
  messages: AdminMessage[];
  auditLog: AuditLogEntry[];
  stats: HelpDeskStats;
  // Actions - Help Requests
  addHelpRequest: (req: Omit<HelpRequest, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'timeline' | 'internalNotes'>) => void;
  updateRequestStatus: (id: string, status: RequestStatus) => void;
  addInternalNote: (requestId: string, note: { authorId: string; authorName: string; body: string }) => void;
  // Actions - Volunteer
  addVolunteerApp: (app: Omit<VolunteerApplication, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => void;
  updateVolunteerStatus: (id: string, status: VolunteerStatus, notes?: string) => void;
  // Actions - Assignments
  createAssignment: (assignment: Omit<CaseAssignment, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => void;
  // Actions - Messages
  sendMessage: (msg: Omit<AdminMessage, 'id' | 'createdAt' | 'read'>) => void;
  markMessageRead: (id: string) => void;
  // Actions - Audit
  logAction: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => void;
}

const HelpDeskContext = createContext<HelpDeskContextType | undefined>(undefined);

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const [members] = useState<Member[]>(mockMembers);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>(mockHelpRequests);
  const [volunteerApps, setVolunteerApps] = useState<VolunteerApplication[]>(mockVolunteerApplications);
  const [assignments, setAssignments] = useState<CaseAssignment[]>(mockAssignments);
  const [messages, setMessages] = useState<AdminMessage[]>(mockMessages);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(mockAuditLog);
  const [stats] = useState<HelpDeskStats>(mockStats);

  const addHelpRequest = (req: Omit<HelpRequest, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'timeline' | 'internalNotes'>) => {
    const now = new Date().toISOString();
    const newReq: HelpRequest = {
      ...req,
      id: `HR-${Date.now()}`,
      status: 'submitted',
      internalNotes: [],
      timeline: [{ date: now, status: 'submitted', description: `Help request submitted by ${req.memberName}` }],
      createdAt: now,
      updatedAt: now,
    };
    setHelpRequests(prev => [newReq, ...prev]);
  };

  const updateRequestStatus = (id: string, status: RequestStatus) => {
    setHelpRequests(prev => prev.map(r => {
      if (r.id === id) {
        const now = new Date().toISOString();
        return {
          ...r,
          status,
          updatedAt: now,
          timeline: [...r.timeline, { date: now, status, description: `Status updated to ${status.replace(/_/g, ' ')}` }],
        };
      }
      return r;
    }));
  };

  const addInternalNote = (requestId: string, note: { authorId: string; authorName: string; body: string }) => {
    setHelpRequests(prev => prev.map(r => {
      if (r.id === requestId) {
        return {
          ...r,
          internalNotes: [...r.internalNotes, { ...note, id: `note-${Date.now()}`, createdAt: new Date().toISOString() }],
          updatedAt: new Date().toISOString(),
        };
      }
      return r;
    }));
  };

  const addVolunteerApp = (app: Omit<VolunteerApplication, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newApp: VolunteerApplication = {
      ...app,
      id: `VA-${Date.now()}`,
      status: 'new_application',
      createdAt: now,
      updatedAt: now,
    };
    setVolunteerApps(prev => [newApp, ...prev]);
  };

  const updateVolunteerStatus = (id: string, status: VolunteerStatus, notes?: string) => {
    setVolunteerApps(prev => prev.map(a => {
      if (a.id === id) {
        return { ...a, status, adminNotes: notes || a.adminNotes, updatedAt: new Date().toISOString() };
      }
      return a;
    }));
  };

  const createAssignment = (assignment: Omit<CaseAssignment, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newAsg: CaseAssignment = {
      ...assignment,
      id: `ASG-${Date.now()}`,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    setAssignments(prev => [newAsg, ...prev]);
  };

  const sendMessage = (msg: Omit<AdminMessage, 'id' | 'createdAt' | 'read'>) => {
    const newMsg: AdminMessage = {
      ...msg,
      id: `msg-${Date.now()}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [newMsg, ...prev]);
  };

  const markMessageRead = (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
  };

  const logAction = (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => {
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    setAuditLog(prev => [newEntry, ...prev]);
  };

  return (
    <HelpDeskContext.Provider value={{
      members, helpRequests, volunteerApps, assignments, messages, auditLog, stats,
      addHelpRequest, updateRequestStatus, addInternalNote,
      addVolunteerApp, updateVolunteerStatus,
      createAssignment, sendMessage, markMessageRead, logAction,
    }}>
      {children}
    </HelpDeskContext.Provider>
  );
}

export function usePortal() {
  const ctx = useContext(HelpDeskContext);
  if (!ctx) throw new Error('usePortal must be used within PortalProvider');
  return ctx;
}
