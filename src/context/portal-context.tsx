'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
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

/**
 * Every mutation hands back the action's own result.
 *
 * The shared `error` field below is for display only. It cannot be used for
 * control flow: the copy a component destructured at render time is captured in
 * the handler's closure, so reading it after an `await` yields the previous
 * render's value, and a stale message from an earlier failure is
 * indistinguishable from a fresh one. Callers branch on the returned `ok`.
 */
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
  addBusinessContactRequest: (req: Omit<BusinessContactRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<ActionResult<BusinessContactRequest>>;
  updateBusinessStatus: (id: string, status: BusinessStatus) => Promise<ActionResult<Business>>;
  toggleBusinessFeatured: (id: string) => Promise<ActionResult<Business>>;

  addHelpRequest: (req: Omit<HelpRequest, 'id' | 'reference' | 'status' | 'createdAt' | 'updatedAt' | 'timeline' | 'internalNotes'>) => Promise<ActionResult<HelpRequest>>;
  updateRequestStatus: (id: string, status: RequestStatus) => Promise<ActionResult<HelpRequest>>;
  addInternalNote: (requestId: string, note: { authorId: string; authorName: string; body: string }) => Promise<ActionResult<HelpRequest>>;

  addVolunteerApp: (app: Omit<VolunteerApplication, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<ActionResult<VolunteerApplication>>;
  updateVolunteerStatus: (id: string, status: VolunteerStatus, notes?: string) => Promise<ActionResult<VolunteerApplication>>;

  createAssignment: (assignment: Omit<CaseAssignment, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<ActionResult<{ assignment: CaseAssignment; request: HelpRequest }>>;
  sendMessage: (msg: Omit<AdminMessage, 'id' | 'createdAt' | 'read'>) => Promise<ActionResult<AdminMessage>>;
  markMessageRead: (id: string) => Promise<ActionResult<null>>;
  // Not a mutation from here: the server writes audit entries itself. Stays void.
  logAction: (entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'actorId' | 'actorName' | 'actorRole'>) => Promise<void>;

  ebooks: EBook[];
  addEBook: (item: Omit<EBook, 'id' | 'createdAt'>) => Promise<ActionResult<EBook>>;
  updateEBook: (id: string, item: Partial<EBook>) => Promise<ActionResult<EBook>>;
  deleteEBook: (id: string) => Promise<ActionResult<null>>;

  workshops: VideoWorkshop[];
  addWorkshop: (item: Omit<VideoWorkshop, 'id' | 'createdAt'>) => Promise<ActionResult<VideoWorkshop>>;
  updateWorkshop: (id: string, item: Partial<VideoWorkshop>) => Promise<ActionResult<VideoWorkshop>>;
  deleteWorkshop: (id: string) => Promise<ActionResult<null>>;

  templates: ContentTemplate[];
  addTemplate: (item: Omit<ContentTemplate, 'id' | 'createdAt'>) => Promise<ActionResult<ContentTemplate>>;
  updateTemplate: (id: string, item: Partial<ContentTemplate>) => Promise<ActionResult<ContentTemplate>>;
  deleteTemplate: (id: string) => Promise<ActionResult<null>>;

  events: CommunityEvent[];
  addEvent: (item: Omit<CommunityEvent, 'id' | 'createdAt'>) => Promise<ActionResult<CommunityEvent>>;
  updateEvent: (id: string, item: Partial<CommunityEvent>) => Promise<ActionResult<CommunityEvent>>;
  deleteEvent: (id: string) => Promise<ActionResult<null>>;

  teamMembers: TeamMember[];
  addTeamMember: (item: Omit<TeamMember, 'id' | 'createdAt'>) => Promise<ActionResult<TeamMember>>;
  updateTeamMember: (id: string, item: Partial<TeamMember>) => Promise<ActionResult<TeamMember>>;
  deleteTeamMember: (id: string) => Promise<ActionResult<null>>;

  newsArticles: NewsArticle[];
  addNewsArticle: (item: Omit<NewsArticle, 'id' | 'createdAt'>) => Promise<ActionResult<NewsArticle>>;
  updateNewsArticle: (id: string, item: Partial<NewsArticle>) => Promise<ActionResult<NewsArticle>>;
  deleteNewsArticle: (id: string) => Promise<ActionResult<null>>;

  donationCampaigns: DonationCampaign[];
  updateDonationCampaign: (id: string, item: Partial<DonationCampaign>) => Promise<ActionResult<DonationCampaign>>;

  jobPostings: JobPosting[];
  addJobPosting: (item: Omit<JobPosting, 'id' | 'createdAt'>) => Promise<ActionResult<JobPosting>>;
  updateJobPosting: (id: string, item: Partial<JobPosting>) => Promise<ActionResult<JobPosting>>;
  deleteJobPosting: (id: string) => Promise<ActionResult<null>>;
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

  /**
   * Records the message on failure and passes the result straight through, so
   * the caller still gets the `ok` flag it needs to decide what to do.
   */
  const track = useCallback(<T,>(result: ActionResult<T>): ActionResult<T> => {
    // Surfaced rather than swallowed: a silently failing write is how the old
    // version looked like it worked while saving nothing.
    if (!result.ok) setError(result.error);
    return result;
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

    const loaded = track(await actions.loadPortal());

    if (loaded.ok) {
      const snapshot = loaded.data;
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
  }, [isAuthenticated, track]);

  // The snapshot is heavy (every help-desk slice in one query). Load it only
  // on portal routes that actually render from it — not on the public site,
  // and not on the community or matrimony surfaces, which have their own
  // narrower data paths.
  const pathname = usePathname();
  // ALLOWLIST, not blocklist: the snapshot used to load on every portal route,
  // taxing the dashboard, chats and jobs screens with a heavy query none of
  // them read. Only the help-desk surfaces (and the whole admin portal, which
  // renders from every slice) actually consume it.
  const SNAPSHOT_ROUTES = [
    '/portal/member/businesses', '/portal/member/messages',
    '/portal/member/my-requests', '/portal/member/my-volunteer',
    '/portal/member/request-help', '/portal/member/volunteer',
  ];
  const needsSnapshot =
    pathname.startsWith('/portal/admin') ||
    SNAPSHOT_ROUTES.some((r) => pathname.startsWith(r));

  useEffect(() => {
    if (needsSnapshot) void refresh();
  }, [refresh, needsSnapshot]);

  // ========== HELP REQUESTS ==========

  const addHelpRequest: HelpDeskContextType['addHelpRequest'] = async (req) => {
    const result = track(await actions.submitHelpRequest(req));
    if (result.ok) setHelpRequests((prev) => [result.data, ...prev]);
    return result;
  };

  const updateRequestStatus: HelpDeskContextType['updateRequestStatus'] = async (id, status) => {
    const result = track(await actions.updateRequestStatus(id, status));
    if (result.ok) setHelpRequests((prev) => prev.map((r) => (r.id === id ? result.data : r)));
    return result;
  };

  const addInternalNote: HelpDeskContextType['addInternalNote'] = async (requestId, note) => {
    // authorId and authorName are stamped server-side from the session; only the
    // body is taken from the caller.
    const result = track(await actions.addInternalNote(requestId, note.body));
    if (result.ok) setHelpRequests((prev) => prev.map((r) => (r.id === requestId ? result.data : r)));
    return result;
  };

  // ========== VOLUNTEERS ==========

  const addVolunteerApp: HelpDeskContextType['addVolunteerApp'] = async (app) => {
    const result = track(await actions.submitVolunteerApplication(app));
    if (result.ok) setVolunteerApps((prev) => [result.data, ...prev]);
    return result;
  };

  const updateVolunteerStatus: HelpDeskContextType['updateVolunteerStatus'] = async (id, status, notes) => {
    const result = track(await actions.updateVolunteerStatus(id, status, notes));
    if (result.ok) setVolunteerApps((prev) => prev.map((a) => (a.id === id ? result.data : a)));
    return result;
  };

  // ========== ASSIGNMENTS ==========

  const createAssignment: HelpDeskContextType['createAssignment'] = async (assignment) => {
    const result = track(await actions.createAssignment(assignment));
    if (result.ok) {
      // The request is stamped with the volunteer in the same transaction, so both
      // slices are refreshed together.
      const { assignment: saved, request } = result.data;
      setAssignments((prev) => [saved, ...prev]);
      setHelpRequests((prev) => prev.map((r) => (r.id === request.id ? request : r)));
    }
    return result;
  };

  // ========== MESSAGES ==========

  const sendMessage: HelpDeskContextType['sendMessage'] = async (msg) => {
    const result = track(await actions.sendMessage(msg));
    if (result.ok) setMessages((prev) => [result.data, ...prev]);
    return result;
  };

  const markMessageRead: HelpDeskContextType['markMessageRead'] = async (id) => {
    const result = track(await actions.markMessageRead(id));
    if (result.ok) setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
    return result;
  };

  /**
   * Audit entries are written by the server as a side effect of the action that
   * caused them, with the actor taken from the session. There is no client-side
   * audit write, because an audit trail its subject can forge is not one.
   */
  const logAction: HelpDeskContextType['logAction'] = async () => {};

  // ========== BUSINESSES ==========

  const addBusinessContactRequest: HelpDeskContextType['addBusinessContactRequest'] = async (req) => {
    const result = track(await actions.submitBusinessContactRequest(req));
    if (result.ok) setBusinessContactRequests((prev) => [result.data, ...prev]);
    return result;
  };

  const updateBusinessStatus: HelpDeskContextType['updateBusinessStatus'] = async (id, status) => {
    const result = track(await actions.updateBusinessStatus(id, status));
    if (result.ok) setBusinesses((prev) => prev.map((b) => (b.id === id ? result.data : b)));
    return result;
  };

  const toggleBusinessFeatured: HelpDeskContextType['toggleBusinessFeatured'] = async (id) => {
    const result = track(await actions.toggleBusinessFeatured(id));
    if (result.ok) setBusinesses((prev) => prev.map((b) => (b.id === id ? result.data : b)));
    return result;
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
      add: async (item: Partial<T>): Promise<ActionResult<T>> => {
        const result = track(await actions.createContent<T>(entity, item as Record<string, unknown>));
        if (result.ok) setter((prev) => applySort([result.data, ...prev]));
        return result;
      },
      update: async (id: string, item: Partial<T>): Promise<ActionResult<T>> => {
        const result = track(await actions.updateContent<T>(entity, id, item as Record<string, unknown>));
        if (result.ok) setter((prev) => applySort(prev.map((row) => (row.id === id ? result.data : row))));
        return result;
      },
      remove: async (id: string): Promise<ActionResult<null>> => {
        const result = track(await actions.deleteContent(entity, id));
        if (result.ok) setter((prev) => prev.filter((row) => row.id !== id));
        return result;
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
