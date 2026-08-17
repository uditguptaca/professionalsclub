import 'server-only';
import { withUser, withUserRead, one, type Db } from '@/server/db';
import { toDomain, toDomainAll } from '@/server/case';
import { insertRow, updateRow, selectList } from '@/server/query';
import { CONTENT_TABLES, type ContentEntity } from '@/server/repos/content';
import type {
  HelpRequest, VolunteerApplication, CaseAssignment, AdminMessage, AuditLogEntry,
  Member, HelpDeskStats, RequestStatus, VolunteerStatus, Business,
  BusinessContactRequest, BusinessStatus, EBook, VideoWorkshop, ContentTemplate,
  CommunityEvent, TeamMember, NewsArticle, DonationCampaign, JobPosting,
} from '@/types';

/**
 * Help-desk data access.
 *
 * Every function runs inside withUser(), so RLS decides which rows come back.
 * The same `select * from help_requests` returns a member's own rows or all of
 * them depending on who is asking — there is no role branching in this file, and
 * there should not be. Where a caller must be an admin, that is asserted in the
 * action (requireAdminId) and again by the policy.
 */

const EMPTY_STATS: HelpDeskStats = {
  totalMembers: 0, totalRequests: 0, openRequests: 0, closedRequests: 0,
  pendingVolunteerApps: 0, approvedVolunteers: 0, activeAssignments: 0,
  avgResolutionDays: 0, escalations: 0, categoryCounts: {},
};

/** Nested timeline and notes, assembled in SQL so a request is one round trip. */
const REQUEST_SELECT = `
  r.*,
  coalesce((
    select json_agg(json_build_object(
      'date', t.created_at, 'status', t.status, 'description', t.description
    ) order by t.created_at)
    from public.request_timeline t where t.request_id = r.id
  ), '[]'::json) as timeline,
  coalesce((
    select json_agg(json_build_object(
      'id', n.id, 'authorId', n.author_id, 'authorName', n.author_name,
      'body', n.body, 'createdAt', n.created_at
    ) order by n.created_at)
    from public.request_notes n where n.request_id = r.id
  ), '[]'::json) as internal_notes
`;

export interface PortalSnapshot {
  members: Member[];
  helpRequests: HelpRequest[];
  volunteerApps: VolunteerApplication[];
  assignments: CaseAssignment[];
  messages: AdminMessage[];
  auditLog: AuditLogEntry[];
  stats: HelpDeskStats;
  businesses: Business[];
  businessContactRequests: BusinessContactRequest[];
  ebooks: EBook[];
  workshops: VideoWorkshop[];
  templates: ContentTemplate[];
  events: CommunityEvent[];
  teamMembers: TeamMember[];
  newsArticles: NewsArticle[];
  donationCampaigns: DonationCampaign[];
  jobPostings: JobPosting[];
}

const contentQuery = (entity: ContentEntity) => {
  const { table, columns, order } = CONTENT_TABLES[entity];
  return `select ${selectList(columns, ['id', 'created_at'])} from ${table} order by ${order}`;
};

/** Everything the portal renders, in one transaction. */
export async function loadSnapshot(userId: string, isAdmin: boolean): Promise<PortalSnapshot> {
  return withUserRead(userId, async (db) => {
    const [
      members, requests, volunteers, assignments, messages,
      businesses, contactRequests,
      ebooks, workshops, templates, events, team, news, donations, jobs,
    ] = await Promise.all([
      db`select * from public.profiles order by created_at desc`,
      db.run(`select ${REQUEST_SELECT} from public.help_requests r order by r.created_at desc`),
      db`select * from public.volunteer_applications order by created_at desc`,
      db`select * from public.case_assignments order by created_at desc`,
      db`select * from public.messages order by created_at desc`,
      db`select * from public.businesses order by created_at desc`,
      db`select * from public.business_contact_requests order by created_at desc`,
      db.run(contentQuery('ebooks')),
      db.run(contentQuery('workshops')),
      db.run(contentQuery('templates')),
      db.run(contentQuery('events')),
      db.run(contentQuery('team')),
      db.run(contentQuery('news')),
      db.run(contentQuery('donations')),
      db.run(contentQuery('jobs')),
    ]);

    // Both are admin-only at the database level, so there is no point asking.
    let auditLog: AuditLogEntry[] = [];
    let stats = EMPTY_STATS;

    if (isAdmin) {
      const [auditRows, statsRows] = await Promise.all([
        db`select * from public.audit_log order by created_at desc limit 200`,
        db`select public.helpdesk_stats() as stats`,
      ]);

      auditLog = toDomainAll<AuditLogEntry & { createdAt: string }>(auditRows).map((row) => ({
        ...row,
        timestamp: row.createdAt,
      }));

      const raw = (statsRows[0] as { stats: HelpDeskStats } | undefined)?.stats;
      if (raw) stats = raw;
    }

    return {
      members: toDomainAll<Member>(members),
      helpRequests: toDomainAll<HelpRequest>(requests),
      volunteerApps: toDomainAll<VolunteerApplication>(volunteers),
      assignments: toDomainAll<CaseAssignment>(assignments),
      messages: toDomainAll<AdminMessage>(messages),
      auditLog,
      stats,
      businesses: toDomainAll<Business>(businesses),
      businessContactRequests: toDomainAll<BusinessContactRequest>(contactRequests),
      ebooks: toDomainAll<EBook>(ebooks),
      workshops: toDomainAll<VideoWorkshop>(workshops),
      templates: toDomainAll<ContentTemplate>(templates),
      events: toDomainAll<CommunityEvent>(events),
      teamMembers: toDomainAll<TeamMember>(team),
      newsArticles: toDomainAll<NewsArticle>(news),
      donationCampaigns: toDomainAll<DonationCampaign>(donations),
      jobPostings: toDomainAll<JobPosting>(jobs),
    };
  });
}

const reloadRequest = async (db: Db, id: string) =>
  one(await db.run(`select ${REQUEST_SELECT} from public.help_requests r where r.id = $1`, [id]));

// ========== HELP REQUESTS ==========

export async function createHelpRequest(
  userId: string,
  input: Record<string, unknown>
): Promise<HelpRequest> {
  return withUser(userId, async (db) => {
    // member_id is forced to the caller. The RLS insert policy would reject
    // anything else anyway; setting it here means a spoofed id is ignored rather
    // than turning into an error the client has to interpret.
    const created = await db`
      insert into public.help_requests (
        member_id, member_name, category, subcategory, title, description, urgency,
        preferred_timeline, previously_requested, documents_required, documents,
        consent_given, support_type, open_to_group_resources, contact_by_admin_only
      ) values (
        ${userId}::uuid,
        ${input.memberName ?? ''},
        ${input.category},
        ${input.subcategory ?? null},
        ${input.title},
        ${input.description ?? ''},
        ${input.urgency ?? 'medium'},
        ${input.preferredTimeline ?? null},
        ${input.previouslyRequested ?? false},
        ${input.documentsRequired ?? false},
        ${(input.documents as string[]) ?? []},
        ${input.consentGiven ?? false},
        ${input.supportType ?? 'one_time'},
        ${input.openToGroupResources ?? false},
        ${input.contactByAdminOnly ?? true}
      )
      returning id
    `;

    const row = await reloadRequest(db, (created[0] as { id: string }).id);
    return toDomain<HelpRequest>(row);
  });
}

export async function setRequestStatus(
  adminId: string,
  id: string,
  status: RequestStatus
): Promise<HelpRequest> {
  return withUser(adminId, async (db) => {
    await db`update public.help_requests set status = ${status} where id = ${id}::uuid`;
    await db`select public.log_audit('request_status_changed', 'request', ${id},
                                     ${'Status set to ' + status}, '{}'::jsonb)`;
    return toDomain<HelpRequest>(await reloadRequest(db, id));
  });
}

export async function addInternalNote(
  adminId: string,
  requestId: string,
  note: { authorName: string; body: string }
): Promise<HelpRequest> {
  return withUser(adminId, async (db) => {
    await db`
      insert into public.request_notes (request_id, author_id, author_name, body)
      values (${requestId}::uuid, ${adminId}::uuid, ${note.authorName}, ${note.body})
    `;
    return toDomain<HelpRequest>(await reloadRequest(db, requestId));
  });
}

// ========== VOLUNTEERS ==========

export async function createVolunteerApplication(
  userId: string,
  input: Record<string, unknown>
): Promise<VolunteerApplication> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.volunteer_applications (
        member_id, member_name, email, phone, pc_number, city, province, linkedin_url,
        current_profession, organization, years_experience, expertise_areas, languages,
        availability, max_cases_per_month, mentorship_interest, referral_support_interest,
        resume_review_interest, settlement_support_interest, tax_guidance_interest,
        immigration_guidance_interest, motivation, experience_summary, documents,
        agreed_to_rules, agreed_no_direct_contact, agreed_admin_mediated, consent_to_screening
      ) values (
        ${userId}::uuid, ${input.memberName ?? ''}, ${input.email ?? null}, ${input.phone ?? null},
        ${input.pcNumber ?? null}, ${input.city ?? null}, ${input.province ?? null},
        ${input.linkedinUrl ?? null}, ${input.currentProfession ?? null}, ${input.organization ?? null},
        ${input.yearsExperience ?? 0}, ${(input.expertiseAreas as string[]) ?? []},
        ${(input.languages as string[]) ?? []}, ${input.availability ?? null},
        ${input.maxCasesPerMonth ?? 2}, ${input.mentorshipInterest ?? false},
        ${input.referralSupportInterest ?? false}, ${input.resumeReviewInterest ?? false},
        ${input.settlementSupportInterest ?? false}, ${input.taxGuidanceInterest ?? false},
        ${input.immigrationGuidanceInterest ?? false}, ${input.motivation ?? null},
        ${input.experienceSummary ?? null}, ${(input.documents as string[]) ?? []},
        ${input.agreedToRules ?? false}, ${input.agreedNoDirectContact ?? false},
        ${input.agreedAdminMediated ?? false}, ${input.consentToScreening ?? false}
      )
      returning *
    `;
    return toDomain<VolunteerApplication>(rows[0]);
  });
}

export async function setVolunteerStatus(
  adminId: string,
  id: string,
  status: VolunteerStatus,
  notes?: string
): Promise<VolunteerApplication> {
  return withUser(adminId, async (db) => {
    const rows = await db`
      update public.volunteer_applications
         set status = ${status},
             admin_notes = coalesce(${notes ?? null}, admin_notes),
             reviewed_by_admin_id = ${adminId}::uuid,
             reviewed_at = now()
       where id = ${id}::uuid
      returning *
    `;
    await db`select public.log_audit('volunteer_status_changed', 'volunteer_app', ${id},
                                     ${'Application set to ' + status}, '{}'::jsonb)`;
    return toDomain<VolunteerApplication>(rows[0]);
  });
}

// ========== ASSIGNMENTS ==========

/**
 * Assigns a volunteer to a request.
 *
 * Creates the assignment AND stamps the volunteer onto the request itself, in
 * one transaction. Without the second write the assignment would exist but the
 * request would still read as unassigned everywhere in the UI, which is what
 * `help_requests.assigned_volunteer_id` drives.
 *
 * Moving the request to `assigned` also fires the status trigger, so the member
 * sees a timeline entry.
 */
export async function createAssignment(
  adminId: string,
  input: Record<string, unknown>
): Promise<{ assignment: CaseAssignment; request: HelpRequest }> {
  return withUser(adminId, async (db) => {
    const rows = await db`
      insert into public.case_assignments (
        request_id, request_title, volunteer_member_id, volunteer_name,
        assigned_by_admin_id, scope, instructions, due_date
      ) values (
        ${input.requestId}::uuid, ${input.requestTitle ?? ''},
        ${input.volunteerMemberId}::uuid, ${input.volunteerName ?? ''},
        ${adminId}::uuid, ${input.scope ?? null}, ${input.instructions ?? null},
        ${input.dueDate ?? null}
      )
      returning *
    `;

    await db`
      update public.help_requests
         set assigned_volunteer_id   = ${input.volunteerMemberId}::uuid,
             assigned_volunteer_name = ${input.volunteerName ?? ''},
             assigned_admin_id       = ${adminId}::uuid,
             status                  = case when status in ('resolved','closed','rejected','archived')
                                            then status else 'assigned' end
       where id = ${input.requestId}::uuid
    `;

    await db`select public.log_audit('assignment_created', 'assignment', ${String(input.requestId)},
                                     ${'Assigned to ' + String(input.volunteerName ?? '')}, '{}'::jsonb)`;

    return {
      assignment: toDomain<CaseAssignment>(rows[0]),
      request: toDomain<HelpRequest>(await reloadRequest(db, String(input.requestId))),
    };
  });
}

// ========== MESSAGES ==========

export async function sendMessage(
  userId: string,
  input: Record<string, unknown>
): Promise<AdminMessage> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.messages (
        case_id, case_title, sender_role, sender_user_id, sender_name,
        recipient_user_id, recipient_role, visibility_scope, body, attachments
      ) values (
        ${input.caseId ?? null}, ${input.caseTitle ?? ''}, ${input.senderRole},
        ${userId}::uuid, ${input.senderName ?? ''},
        ${input.recipientUserId ?? null}, ${input.recipientRole},
        ${input.visibilityScope ?? 'all'}, ${input.body}, ${(input.attachments as string[]) ?? []}
      )
      returning *
    `;
    return toDomain<AdminMessage>(rows[0]);
  });
}

export async function markMessageRead(userId: string, id: string): Promise<void> {
  await withUser(userId, async (db) => {
    await db`update public.messages set read = true where id = ${id}::uuid`;
  });
}

// ========== BUSINESSES ==========

export async function createBusinessContactRequest(
  userId: string,
  input: Record<string, unknown>
): Promise<BusinessContactRequest> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.business_contact_requests (
        business_id, business_name, member_id, member_name,
        help_type, preferred_contact, notes
      ) values (
        ${input.businessId}::uuid, ${input.businessName ?? ''}, ${userId}::uuid,
        ${input.memberName ?? ''}, ${input.helpType ?? 'introduction'},
        ${input.preferredContact ?? 'portal'}, ${input.notes ?? null}
      )
      returning *
    `;
    return toDomain<BusinessContactRequest>(rows[0]);
  });
}

export async function setBusinessStatus(
  adminId: string,
  id: string,
  status: BusinessStatus
): Promise<Business> {
  return withUser(adminId, async (db) => {
    const rows = await db`
      update public.businesses
         set verification_status = ${status}, approved_by_admin = ${adminId}::uuid
       where id = ${id}::uuid
      returning *
    `;
    await db`select public.log_audit('business_status_changed', 'business', ${id},
                                     ${'Listing set to ' + status}, '{}'::jsonb)`;
    return toDomain<Business>(rows[0]);
  });
}

export async function toggleBusinessFeatured(adminId: string, id: string): Promise<Business> {
  return withUser(adminId, async (db) => {
    const rows = await db`
      update public.businesses set is_featured = not is_featured
       where id = ${id}::uuid returning *
    `;
    return toDomain<Business>(rows[0]);
  });
}

// ========== CONTENT CRUD ==========

const contentReturning = (entity: ContentEntity) =>
  selectList(CONTENT_TABLES[entity].columns, ['id', 'created_at']);

export async function createContent<T>(
  adminId: string,
  entity: ContentEntity,
  data: Record<string, unknown>
): Promise<T> {
  const { table, columns } = CONTENT_TABLES[entity];
  return withUser(adminId, async (db) => {
    const row = await insertRow(db, table, columns, data, contentReturning(entity));
    return toDomain<T>(row);
  });
}

export async function updateContent<T>(
  adminId: string,
  entity: ContentEntity,
  id: string,
  data: Record<string, unknown>
): Promise<T> {
  const { table, columns } = CONTENT_TABLES[entity];
  return withUser(adminId, async (db) => {
    const row = await updateRow(db, table, columns, id, data, contentReturning(entity));
    return toDomain<T>(row);
  });
}

export async function deleteContent(
  adminId: string,
  entity: ContentEntity,
  id: string
): Promise<void> {
  const { table } = CONTENT_TABLES[entity];
  await withUser(adminId, async (db) => {
    await db.run(`delete from ${table} where id = $1`, [id]);
  });
}

// ========== MEMBER PROFILE ==========

const PROFILE_WRITABLE = {
  firstName: 'first_name',
  lastName: 'last_name',
  phone: 'phone',
  city: 'city',
  province: 'province',
  industry: 'industry',
  jobTitle: 'job_title',
} as const;

/**
 * Self-service profile edit.
 *
 * The allowlist is the point: role, account_status and verification_status are
 * absent, so they cannot be written through this path even if the payload
 * carries them. The guard_profile_privileges trigger enforces the same rule in
 * the database.
 */
export async function updateOwnProfile(
  userId: string,
  data: Record<string, unknown>
): Promise<Member> {
  return withUser(userId, async (db) => {
    const row = await updateRow(db, 'public.profiles', PROFILE_WRITABLE, userId, data, '*');
    return toDomain<Member>(row);
  });
}

export async function archiveOwnAccount(userId: string): Promise<void> {
  // Deliberately not a hard delete: removing the identity row is Neon Auth's to
  // do, and case history is retained for administrative records.
  await withUser(userId, async (db) => {
    await db`update public.profiles set account_status = 'archived' where id = ${userId}::uuid`;
  });
}

// ========== PUBLIC INQUIRIES (contact form + volunteer help relay) ==========

/**
 * Submissions from the public forms.
 *
 * RLS on public_inquiries restricts select and update to admins, so these run
 * under the caller's own transaction with no role branching here. The table is
 * written only by the SECURITY DEFINER submit_inquiry() function (0007), which
 * is why nothing in this file inserts.
 */
export interface PublicInquiry {
  id: string;
  kind: 'contact' | 'volunteer_help';
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  requestedFor: string | null;
  category: string | null;
  status: 'new' | 'in_progress' | 'closed';
  adminNote: string | null;
  handledAt: string | null;
  createdAt: string;
}

export async function listInquiries(
  adminId: string,
  status: 'new' | 'in_progress' | 'closed'
): Promise<PublicInquiry[]> {
  return withUserRead(adminId, async (db) => {
    const rows = await db`
      select id, kind, name, email, phone, subject, message,
             requested_for, category, status, admin_note, handled_at, created_at
        from public.public_inquiries
       where status = ${status}
       order by created_at desc
       limit 200
    `;
    return toDomainAll<PublicInquiry>(rows);
  });
}

export async function countNewInquiries(adminId: string): Promise<number> {
  return withUserRead(adminId, async (db) => {
    const rows = await db`
      select count(*)::int as n from public.public_inquiries where status = 'new'
    `;
    return (rows[0] as { n: number } | undefined)?.n ?? 0;
  });
}

export async function setInquiryStatus(
  adminId: string,
  input: { id: string; status: 'new' | 'in_progress' | 'closed'; note?: string }
): Promise<void> {
  await withUser(adminId, async (db) => {
    await db`
      update public.public_inquiries
         set status = ${input.status},
             admin_note = coalesce(${input.note ?? null}, admin_note),
             handled_by = ${adminId}::uuid,
             handled_at = now()
       where id = ${input.id}::uuid
    `;
  });
}
