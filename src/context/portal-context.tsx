'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  HelpRequest, VolunteerApplication, CaseAssignment, AdminMessage, AuditLogEntry,
  Member, HelpDeskStats, RequestStatus, VolunteerStatus, Business,
  BusinessContactRequest, BusinessStatus, EBook, VideoWorkshop, ContentTemplate,
  CommunityEvent, TeamMember, NewsArticle, DonationCampaign, JobPosting,
} from '@/types';
import * as actions from '@/app/actions/portal';
import type { ActionResult } from '@/app/actions/portal';
import { useApp } from '@/context/app-context';

/**
 * Portal state for client components.
 *
 * This holds no database credentials and makes no authorization decisions. It
 * calls Server Actions and mirrors what comes back. Which rows a member is
 * allowed to see is settled on the server and again by RLS; if this file
 * filtered anything by role it would only be a display convention.
 *
 * The public API is unchanged from the previous version, so the pages consuming
 * `usePortal()` did not need rewriting when the backend moved to Neon.
 */

const EMPTY_STATS: HelpDeskStats = {
  totalMembers: 0, totalRequests: 0, openRequests: 0, closedRequests: 0,
  pendingVolunteerApps: 0, approvedVolunteers: 0, activeAssignments: 0,
  avgResolutionDays: 0, escalations: 0, categoryCounts: {},
};

interface HelpDeskContextType {
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;

  members: Member[];
  helpRequests: HelpRequest[];
  volunteerApps: VolunteerApplication[];
  assignments: CaseAssignment[];
  messages: AdminMessage[];
  auditLog: AuditLogEntry[];
  stats: HelpDeskStats;

  businesses: Business[];
  businessContactRequests: BusinessContactRequest[];
  addBusinessContactRequest: (req: Omit<BusinessContactRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateBusinessStatus: (id: string, status: BusinessStatus) => Promise<void>;
  toggleBusinessFeatured: (id: string) => Promise<void>;

  addHelpRequest: (req: Omit<HelpRequest, 'id' | 'reference' | 'status' | 'createdAt' | 'updatedAt' | 'timeline' | 'internalNotes'>) => Promise<void>;
  updateRequestStatus: (id: string, status: RequestStatus) => Promise<void>;
  addInternalNote: (requestId: string, note: { authorId: string; authorName: string; body: string }) => Promise<void>;

  addVolunteerApp: (app: Omit<VolunteerApplication, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateVolunteerStatus: (id: string, status: VolunteerStatus, notes?: string) => Promise<void>;

  createAssignment: (assignment: Omit<CaseAssignment, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  sendMessage: (msg: Omit<AdminMessage, 'id' | 'createdAt' | 'read'>) => Promise<void>;
  markMessageRead: (id: string) => Promise<void>;
  logAction: (entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'actorId' | 'actorName' | 'actorRole'>) => Promise<void>;

  ebooks: EBook[];
  addEBook: (item: Omit<EBook, 'id' | 'createdAt'>) => Promise<void>;
  updateEBook: (id: string, item: Partial<EBook>) => Promise<void>;
  deleteEBook: (id: string) => Promise<void>;

  workshops: VideoWorkshop[];
  addWorkshop: (item: Omit<VideoWorkshop, 'id' | 'createdAt'>) => Promise<void>;
  updateWorkshop: (id: string, item: Partial<VideoWorkshop>) => Promise<void>;
  deleteWorkshop: (id: string) => Promise<void>;

  templates: ContentTemplate[];
  addTemplate: (item: Omit<ContentTemplate, 'id' | 'createdAt'>) => Promise<void>;
  updateTemplate: (id: string, item: Partial<ContentTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;

  events: CommunityEvent[];
  addEvent: (item: Omit<CommunityEvent, 'id' | 'createdAt'>) => Promise<void>;
  updateEvent: (id: string, item: Partial<CommunityEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;

  teamMembers: TeamMember[];
  addTeamMember: (item: Omit<TeamMember, 'id' | 'createdAt'>) => Promise<void>;
  updateTeamMember: (id: string, item: Partial<TeamMember>) => Promise<void>;
  deleteTeamMember: (id: string) => Promise<void>;

  newsArticles: NewsArticle[];
  addNewsArticle: (item: Omit<NewsArticle, 'id' | 'createdAt'>) => Promise<void>;
  updateNewsArticle: (id: string, item: Partial<NewsArticle>) => Promise<void>;
  deleteNewsArticle: (id: string) => Promise<void>;

  donationCampaigns: DonationCampaign[];
  updateDonationCampaign: (id: string, item: Partial<DonationCampaign>) => Promise<void>;

  jobPostings: JobPosting[];
  addJobPosting: (item: Omit<JobPosting, 'id' | 'createdAt'>) => Promise<void>;
  updateJobPosting: (id: string, item: Partial<JobPosting>) => Promise<void>;
  deleteJobPosting: (id: string) => Promise<void>;
}

const HelpDeskContext = createContext<HelpDeskContextType | undefined>(undefined);

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useApp();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [volunteerApps, setVolunteerApps] = useState<VolunteerApplication[]>([]);
  const [assignments, setAssignments] = useState<CaseAssignment[]>([]);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<HelpDeskStats>(EMPTY_STATS);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessContactRequests, setBusinessContactRequests] = useState<BusinessContactRequest[]>([]);
  const [ebooks, setEbooks] = useState<EBook[]>([]);
  const [workshops, setWorkshops] = useState<VideoWorkshop[]>([]);
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [donationCampaigns, setDonationCampaigns] = useState<DonationCampaign[]>([]);
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);

  /** Unwraps an action result, recording the message on failure. */
  const unwrap = useCallback(<T,>(result: ActionResult<T>): T | null => {
    if (result.ok) return result.data;
    // Surfaced rather than swallowed: a silently failing write is how the old
    // version looked like it worked while saving nothing.
    setError(result.error);
    return null;
  }, []);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setMembers([]); setHelpRequests([]); setVolunteerApps([]); setAssignments([]);
      setMessages([]); setAuditLog([]); setStats(EMPTY_STATS);
      setBusinesses([]); setBusinessContactRequests([]);
      return;
    }

    setLoading(true);
    setError(null);

    const snapshot = unwrap(await actions.loadPortal());

    if (snapshot) {
      setMembers(snapshot.members);
      setHelpRequests(snapshot.helpRequests);
      setVolunteerApps(snapshot.volunteerApps);
      setAssignments(snapshot.assignments);
      setMessages(snapshot.messages);
      setAuditLog(snapshot.auditLog);
      setStats(snapshot.stats);
      setBusinesses(snapshot.businesses);
      setBusinessContactRequests(snapshot.businessContactRequests);
      setEbooks(snapshot.ebooks);
      setWorkshops(snapshot.workshops);
      setTemplates(snapshot.templates);
      setEvents(snapshot.events);
      setTeamMembers(snapshot.teamMembers);
      setNewsArticles(snapshot.newsArticles);
      setDonationCampaigns(snapshot.donationCampaigns);
      setJobPostings(snapshot.jobPostings);
    }

    setLoading(false);
  }, [isAuthenticated, unwrap]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // ========== HELP REQUESTS ==========

  const addHelpRequest: HelpDeskContextType['addHelpRequest'] = async (req) => {
    const saved = unwrap(await actions.submitHelpRequest(req));
    if (saved) setHelpRequests((prev) => [saved, ...prev]);
  };

  const updateRequestStatus: HelpDeskContextType['updateRequestStatus'] = async (id, status) => {
    const saved = unwrap(await actions.updateRequestStatus(id, status));
    if (saved) setHelpRequests((prev) => prev.map((r) => (r.id === id ? saved : r)));
  };

  const addInternalNote: HelpDeskContextType['addInternalNote'] = async (requestId, note) => {
    // authorId and authorName are stamped server-side from the session; only the
    // body is taken from the caller.
    const saved = unwrap(await actions.addInternalNote(requestId, note.body));
    if (saved) setHelpRequests((prev) => prev.map((r) => (r.id === requestId ? saved : r)));
  };

  // ========== VOLUNTEERS ==========

  const addVolunteerApp: HelpDeskContextType['addVolunteerApp'] = async (app) => {
    const saved = unwrap(await actions.submitVolunteerApplication(app));
    if (saved) setVolunteerApps((prev) => [saved, ...prev]);
  };

  const updateVolunteerStatus: HelpDeskContextType['updateVolunteerStatus'] = async (id, status, notes) => {
    const saved = unwrap(await actions.updateVolunteerStatus(id, status, notes));
    if (saved) setVolunteerApps((prev) => prev.map((a) => (a.id === id ? saved : a)));
  };

  // ========== ASSIGNMENTS ==========

  const createAssignment: HelpDeskContextType['createAssignment'] = async (assignment) => {
    const saved = unwrap(await actions.createAssignment(assignment));
    if (!saved) return;
    // The request is stamped with the volunteer in the same transaction, so both
    // slices are refreshed together.
    setAssignments((prev) => [saved.assignment, ...prev]);
    setHelpRequests((prev) => prev.map((r) => (r.id === saved.request.id ? saved.request : r)));
  };

  // ========== MESSAGES ==========

  const sendMessage: HelpDeskContextType['sendMessage'] = async (msg) => {
    const saved = unwrap(await actions.sendMessage(msg));
    if (saved) setMessages((prev) => [saved, ...prev]);
  };

  const markMessageRead: HelpDeskContextType['markMessageRead'] = async (id) => {
    const result = await actions.markMessageRead(id);
    if (result.ok) setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
    else setError(result.error);
  };

  /**
   * Audit entries are written by the server as a side effect of the action that
   * caused them, with the actor taken from the session. There is no client-side
   * audit write, because an audit trail its subject can forge is not one.
   */
  const logAction: HelpDeskContextType['logAction'] = async () => {};

  // ========== BUSINESSES ==========

  const addBusinessContactRequest: HelpDeskContextType['addBusinessContactRequest'] = async (req) => {
    const saved = unwrap(await actions.submitBusinessContactRequest(req));
    if (saved) setBusinessContactRequests((prev) => [saved, ...prev]);
  };

  const updateBusinessStatus: HelpDeskContextType['updateBusinessStatus'] = async (id, status) => {
    const saved = unwrap(await actions.updateBusinessStatus(id, status));
    if (saved) setBusinesses((prev) => prev.map((b) => (b.id === id ? saved : b)));
  };

  const toggleBusinessFeatured: HelpDeskContextType['toggleBusinessFeatured'] = async (id) => {
    const saved = unwrap(await actions.toggleBusinessFeatured(id));
    if (saved) setBusinesses((prev) => prev.map((b) => (b.id === id ? saved : b)));
  };

  // ========== CONTENT CRUD ==========

  /**
   * The eight content tables behave identically, so one factory covers them all
   * instead of twenty-four near-identical methods.
   */
  function contentCrud<T extends { id: string }>(
    entity: Parameters<typeof actions.createContent>[0],
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    sort?: (a: T, b: T) => number
  ) {
    const applySort = (rows: T[]) => (sort ? [...rows].sort(sort) : rows);

    return {
      add: async (item: Partial<T>) => {
        const saved = unwrap(await actions.createContent<T>(entity, item as Record<string, unknown>));
        if (saved) setter((prev) => applySort([saved, ...prev]));
      },
      update: async (id: string, item: Partial<T>) => {
        const saved = unwrap(await actions.updateContent<T>(entity, id, item as Record<string, unknown>));
        if (saved) setter((prev) => applySort(prev.map((row) => (row.id === id ? saved : row))));
      },
      remove: async (id: string) => {
        const result = await actions.deleteContent(entity, id);
        if (result.ok) setter((prev) => prev.filter((row) => row.id !== id));
        else setError(result.error);
      },
    };
  }

  const ebookCrud = contentCrud<EBook>('ebooks', setEbooks);
  const workshopCrud = contentCrud<VideoWorkshop>('workshops', setWorkshops);
  const templateCrud = contentCrud<ContentTemplate>('templates', setTemplates);
  const eventCrud = contentCrud<CommunityEvent>('events', setEvents);
  const newsCrud = contentCrud<NewsArticle>('news', setNewsArticles);
  const donationCrud = contentCrud<DonationCampaign>('donations', setDonationCampaigns);
  const jobCrud = contentCrud<JobPosting>('jobs', setJobPostings);
  const teamCrud = contentCrud<TeamMember>('team', setTeamMembers, (a, b) => a.order - b.order);

  return (
    <HelpDeskContext.Provider
      value={{
        loading, error, refresh,
        members, helpRequests, volunteerApps, assignments, messages, auditLog, stats,
        businesses, businessContactRequests,
        addHelpRequest, updateRequestStatus, addInternalNote,
        addVolunteerApp, updateVolunteerStatus,
        createAssignment, sendMessage, markMessageRead, logAction,
        addBusinessContactRequest, updateBusinessStatus, toggleBusinessFeatured,

        ebooks, addEBook: ebookCrud.add, updateEBook: ebookCrud.update, deleteEBook: ebookCrud.remove,
        workshops, addWorkshop: workshopCrud.add, updateWorkshop: workshopCrud.update, deleteWorkshop: workshopCrud.remove,
        templates, addTemplate: templateCrud.add, updateTemplate: templateCrud.update, deleteTemplate: templateCrud.remove,
        events, addEvent: eventCrud.add, updateEvent: eventCrud.update, deleteEvent: eventCrud.remove,
        teamMembers, addTeamMember: teamCrud.add, updateTeamMember: teamCrud.update, deleteTeamMember: teamCrud.remove,
        newsArticles, addNewsArticle: newsCrud.add, updateNewsArticle: newsCrud.update, deleteNewsArticle: newsCrud.remove,
        donationCampaigns, updateDonationCampaign: donationCrud.update,
        jobPostings, addJobPosting: jobCrud.add, updateJobPosting: jobCrud.update, deleteJobPosting: jobCrud.remove,
      }}
    >
      {children}
    </HelpDeskContext.Provider>
  );
}

export function usePortal() {
  const ctx = useContext(HelpDeskContext);
  if (!ctx) throw new Error('usePortal must be used within PortalProvider');
  return ctx;
}
