'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { HelpRequest, VolunteerApplication, CaseAssignment, AdminMessage, AuditLogEntry, Member, HelpDeskStats, RequestStatus, VolunteerStatus, Business, BusinessContactRequest, BusinessStatus, EBook, VideoWorkshop, ContentTemplate, CommunityEvent, TeamMember, NewsArticle, DonationCampaign, JobPosting } from '@/types';
import { createClient } from '@/utils/supabase/client';

interface HelpDeskContextType {
  // Data
  members: Member[];
  helpRequests: HelpRequest[];
  volunteerApps: VolunteerApplication[];
  assignments: CaseAssignment[];
  messages: AdminMessage[];
  auditLog: AuditLogEntry[];
  stats: HelpDeskStats;
  // Business Directory
  businesses: Business[];
  businessContactRequests: BusinessContactRequest[];
  addBusinessContactRequest: (req: Omit<BusinessContactRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => void;
  updateBusinessStatus: (id: string, status: BusinessStatus) => void;
  toggleBusinessFeatured: (id: string) => void;
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

  // ========== DYNAMIC CONTENT ==========
  // E-Books
  ebooks: EBook[];
  addEBook: (item: Omit<EBook, 'id' | 'createdAt'>) => void;
  updateEBook: (id: string, item: Partial<EBook>) => void;
  deleteEBook: (id: string) => void;
  // Workshops
  workshops: VideoWorkshop[];
  addWorkshop: (item: Omit<VideoWorkshop, 'id' | 'createdAt'>) => void;
  updateWorkshop: (id: string, item: Partial<VideoWorkshop>) => void;
  deleteWorkshop: (id: string) => void;
  // Templates
  templates: ContentTemplate[];
  addTemplate: (item: Omit<ContentTemplate, 'id' | 'createdAt'>) => void;
  updateTemplate: (id: string, item: Partial<ContentTemplate>) => void;
  deleteTemplate: (id: string) => void;
  // Events
  events: CommunityEvent[];
  addEvent: (item: Omit<CommunityEvent, 'id' | 'createdAt'>) => void;
  updateEvent: (id: string, item: Partial<CommunityEvent>) => void;
  deleteEvent: (id: string) => void;
  // Team Members
  teamMembers: TeamMember[];
  addTeamMember: (item: Omit<TeamMember, 'id' | 'createdAt'>) => void;
  updateTeamMember: (id: string, item: Partial<TeamMember>) => void;
  deleteTeamMember: (id: string) => void;
  // News
  newsArticles: NewsArticle[];
  addNewsArticle: (item: Omit<NewsArticle, 'id' | 'createdAt'>) => void;
  updateNewsArticle: (id: string, item: Partial<NewsArticle>) => void;
  deleteNewsArticle: (id: string) => void;
  // Donations
  donationCampaigns: DonationCampaign[];
  updateDonationCampaign: (id: string, item: Partial<DonationCampaign>) => void;
  // Job Postings
  jobPostings: JobPosting[];
  addJobPosting: (item: Omit<JobPosting, 'id' | 'createdAt'>) => void;
  updateJobPosting: (id: string, item: Partial<JobPosting>) => void;
  deleteJobPosting: (id: string) => void;
}

const HelpDeskContext = createContext<HelpDeskContextType | undefined>(undefined);

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);

  const [members, setMembers] = useState<Member[]>([]);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [volunteerApps, setVolunteerApps] = useState<VolunteerApplication[]>([]);
  const [assignments, setAssignments] = useState<CaseAssignment[]>([]);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<HelpDeskStats>({
    totalMembers: 0, totalRequests: 0, openRequests: 0, closedRequests: 0,
    pendingVolunteerApps: 0, approvedVolunteers: 0, activeAssignments: 0,
    avgResolutionDays: 0, escalations: 0, categoryCounts: {}
  });
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessContactRequests, setBusinessContactRequests] = useState<BusinessContactRequest[]>([]);

  // Dynamic Content State
  const [ebooks, setEbooks] = useState<EBook[]>([]);
  const [workshops, setWorkshops] = useState<VideoWorkshop[]>([]);
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [donationCampaigns, setDonationCampaigns] = useState<DonationCampaign[]>([]);
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);

  // Fetch data from Supabase on mount
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [
          { data: membersData },
          { data: requestsData },
          { data: jobsData },
          { data: eventsData },
          { data: businessesData }
        ] = await Promise.all([
          supabase.from('club_members').select('*'),
          supabase.from('help_requests').select('*'),
          supabase.from('jobs').select('*'),
          supabase.from('events').select('*'),
          supabase.from('businesses').select('*'),
        ]);

        if (membersData) setMembers(membersData as any);
        if (requestsData) setHelpRequests(requestsData as any);
        if (jobsData) setJobPostings(jobsData as any);
        if (eventsData) setEvents(eventsData as any);
        if (businessesData) setBusinesses(businessesData as any);
      } catch (error) {
        console.error('Error fetching portal data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // ========== ACTIONS ==========
  const addHelpRequest = async (req: Omit<HelpRequest, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'timeline' | 'internalNotes'>) => {
    const { data, error } = await supabase
      .from('help_requests')
      .insert([{
        ...req,
        status: 'submitted',
        timeline: [{ date: new Date().toISOString(), status: 'submitted', description: `Help request submitted by ${req.memberName}` }],
        internal_notes: [],
      }])
      .select()
      .single();

    if (data) {
      setHelpRequests(prev => [data as any, ...prev]);
    } else if (error) {
      console.error('Error adding help request:', error);
    }
  };

  const updateRequestStatus = async (id: string, status: RequestStatus) => {
    const { data, error } = await supabase
      .from('help_requests')
      .update({ 
        status, 
        updated_at: new Date().toISOString(),
        // We'll handle timeline updates in a real app with a trigger or batching
      })
      .eq('id', id)
      .select()
      .single();

    if (data) {
      setHelpRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    }
  };

  const addInternalNote = async (requestId: string, note: { authorId: string; authorName: string; body: string }) => {
    // For now, we update the array in the DB (Postgres handle arrays well)
    // Note: This is simplified for the demo
    setHelpRequests(prev => prev.map(r => {
      if (r.id === requestId) {
        return {
          ...r,
          internalNotes: [...r.internalNotes, { ...note, id: `note-${Date.now()}`, createdAt: new Date().toISOString() }],
        };
      }
      return r;
    }));
  };

  const addVolunteerApp = async (app: Omit<VolunteerApplication, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
    const { data, error } = await supabase
      .from('volunteer_applications')
      .insert([{
        ...app,
        status: 'new_application',
      }])
      .select()
      .single();

    if (data) {
      setVolunteerApps(prev => [data as any, ...prev]);
    }
  };

  const updateVolunteerStatus = async (id: string, status: VolunteerStatus, notes?: string) => {
    const { error } = await supabase
      .from('volunteer_applications')
      .update({ status, admin_notes: notes })
      .eq('id', id);

    if (!error) {
      setVolunteerApps(prev => prev.map(a => a.id === id ? { ...a, status, adminNotes: notes || a.adminNotes } : a));
    }
  };

  const createAssignment = async (assignment: Omit<CaseAssignment, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
    const { data, error } = await supabase
      .from('case_assignments')
      .insert([{
        ...assignment,
        status: 'pending',
      }])
      .select()
      .single();

    if (data) {
      setAssignments(prev => [data as any, ...prev]);
    }
  };

  const sendMessage = async (msg: Omit<AdminMessage, 'id' | 'createdAt' | 'read'>) => {
    const { data, error } = await supabase
      .from('admin_messages')
      .insert([{
        ...msg,
        read: false,
      }])
      .select()
      .single();

    if (data) {
      setMessages(prev => [data as any, ...prev]);
    }
  };

  const markMessageRead = async (id: string) => {
    const { error } = await supabase
      .from('admin_messages')
      .update({ read: true })
      .eq('id', id);

    if (!error) {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
    }
  };

  const logAction = (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => {
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    setAuditLog(prev => [newEntry, ...prev]);
  };

  const addBusinessContactRequest = (req: Omit<BusinessContactRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newReq: BusinessContactRequest = {
      ...req,
      id: `bcr-${Date.now()}`,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    setBusinessContactRequests(prev => [newReq, ...prev]);
  };

  const updateBusinessStatus = (id: string, status: BusinessStatus) => {
    setBusinesses(prev => prev.map(b => b.id === id ? { ...b, verificationStatus: status, updatedAt: new Date().toISOString() } : b));
  };

  const toggleBusinessFeatured = (id: string) => {
    setBusinesses(prev => prev.map(b => b.id === id ? { ...b, isFeatured: !b.isFeatured, updatedAt: new Date().toISOString() } : b));
  };

  // ========== DYNAMIC CONTENT ACTIONS ==========

  // E-Books
  const addEBook = (item: Omit<EBook, 'id' | 'createdAt'>) => {
    setEbooks(prev => [{ ...item, id: `eb-${Date.now()}`, createdAt: new Date().toISOString() }, ...prev]);
  };
  const updateEBook = (id: string, item: Partial<EBook>) => {
    setEbooks(prev => prev.map(e => e.id === id ? { ...e, ...item } : e));
  };
  const deleteEBook = (id: string) => {
    setEbooks(prev => prev.filter(e => e.id !== id));
  };

  // Workshops
  const addWorkshop = (item: Omit<VideoWorkshop, 'id' | 'createdAt'>) => {
    setWorkshops(prev => [{ ...item, id: `ws-${Date.now()}`, createdAt: new Date().toISOString() }, ...prev]);
  };
  const updateWorkshop = (id: string, item: Partial<VideoWorkshop>) => {
    setWorkshops(prev => prev.map(e => e.id === id ? { ...e, ...item } : e));
  };
  const deleteWorkshop = (id: string) => {
    setWorkshops(prev => prev.filter(e => e.id !== id));
  };

  // Templates
  const addTemplate = (item: Omit<ContentTemplate, 'id' | 'createdAt'>) => {
    setTemplates(prev => [{ ...item, id: `tp-${Date.now()}`, createdAt: new Date().toISOString() }, ...prev]);
  };
  const updateTemplate = (id: string, item: Partial<ContentTemplate>) => {
    setTemplates(prev => prev.map(e => e.id === id ? { ...e, ...item } : e));
  };
  const deleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(e => e.id !== id));
  };

  // Events
  const addEvent = (item: Omit<CommunityEvent, 'id' | 'createdAt'>) => {
    setEvents(prev => [{ ...item, id: `evt-${Date.now()}`, createdAt: new Date().toISOString() }, ...prev]);
  };
  const updateEvent = (id: string, item: Partial<CommunityEvent>) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...item } : e));
  };
  const deleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  // Team Members
  const addTeamMember = (item: Omit<TeamMember, 'id' | 'createdAt'>) => {
    setTeamMembers(prev => [{ ...item, id: `tm-${Date.now()}`, createdAt: new Date().toISOString() }, ...prev]);
  };
  const updateTeamMember = (id: string, item: Partial<TeamMember>) => {
    setTeamMembers(prev => prev.map(e => e.id === id ? { ...e, ...item } : e));
  };
  const deleteTeamMember = (id: string) => {
    setTeamMembers(prev => prev.filter(e => e.id !== id));
  };

  // News
  const addNewsArticle = (item: Omit<NewsArticle, 'id' | 'createdAt'>) => {
    setNewsArticles(prev => [{ ...item, id: `news-${Date.now()}`, createdAt: new Date().toISOString() }, ...prev]);
  };
  const updateNewsArticle = (id: string, item: Partial<NewsArticle>) => {
    setNewsArticles(prev => prev.map(e => e.id === id ? { ...e, ...item } : e));
  };
  const deleteNewsArticle = (id: string) => {
    setNewsArticles(prev => prev.filter(e => e.id !== id));
  };

  // Donations
  const updateDonationCampaign = (id: string, item: Partial<DonationCampaign>) => {
    setDonationCampaigns(prev => prev.map(e => e.id === id ? { ...e, ...item } : e));
  };

  // Job Postings
  const addJobPosting = (item: Omit<JobPosting, 'id' | 'createdAt'>) => {
    setJobPostings(prev => [{ ...item, id: `job-${Date.now()}`, createdAt: new Date().toISOString() }, ...prev]);
  };
  const updateJobPosting = (id: string, item: Partial<JobPosting>) => {
    setJobPostings(prev => prev.map(e => e.id === id ? { ...e, ...item } : e));
  };
  const deleteJobPosting = (id: string) => {
    setJobPostings(prev => prev.filter(e => e.id !== id));
  };

  return (
    <HelpDeskContext.Provider value={{
      members, helpRequests, volunteerApps, assignments, messages, auditLog, stats,
      businesses, businessContactRequests,
      addHelpRequest, updateRequestStatus, addInternalNote,
      addVolunteerApp, updateVolunteerStatus,
      createAssignment, sendMessage, markMessageRead, logAction,
      addBusinessContactRequest, updateBusinessStatus, toggleBusinessFeatured,
      // Dynamic Content
      ebooks, addEBook, updateEBook, deleteEBook,
      workshops, addWorkshop, updateWorkshop, deleteWorkshop,
      templates, addTemplate, updateTemplate, deleteTemplate,
      events, addEvent, updateEvent, deleteEvent,
      teamMembers, addTeamMember, updateTeamMember, deleteTeamMember,
      newsArticles, addNewsArticle, updateNewsArticle, deleteNewsArticle,
      donationCampaigns, updateDonationCampaign,
      jobPostings, addJobPosting, updateJobPosting, deleteJobPosting,
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
