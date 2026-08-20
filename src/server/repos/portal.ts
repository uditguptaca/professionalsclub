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
 * Attachment arrays arrive from a client that caps them, but a hand-crafted
 * action call is not bound by the UI. Cap and shape them here too, where every
 * write has to pass.
 */
const MAX_ATTACHMENTS = 8;

function safeDocuments(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
    .map((u) => u.trim())
    .filter((u) =>
      /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//.test(u) ||
      /^\/uploads\/[a-z0-9]+\.[a-z0-9]{2,5}$/i.test(u))
    .slice(0, MAX_ATTACHMENTS);
}

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

/**
 * Everything the portal renders, in ONE round trip.
 *
 * This used to be fifteen statements in a Promise.all. That reads as parallel
 * but a single connection serialises queries, so the portal paid fifteen
 * sequential round trips - about five seconds from a laptop, on every portal
 * page load. Each slice is now a json_agg subquery in one statement.
 *
 * RLS is unaffected: a policy is evaluated per table access, nested or not, so
 * a member still sees only their own rows here.
 */
const slice = (alias: string, query: string) =>
  `(select coalesce(json_agg(t), '[]'::json) from (${query}) t) as ${alias}`;

export async function loadSnapshot(userId: string, isAdmin: boolean): Promise<PortalSnapshot> {
  return withUserRead(userId, async (db) => {
    const slices = [
      slice('members', 'select * from public.profiles order by created_at desc'),
      slice('requests', `select ${REQUEST_SELECT} from public.help_requests r order by r.created_at desc`),
      slice('volunteers', 'select * from public.volunteer_applications order by created_at desc'),
      slice('assignments', 'select * from public.case_assignments order by created_at desc'),
      slice('messages', 'select * from public.messages order by created_at desc'),
      slice('businesses', 'select * from public.businesses order by created_at desc'),
      slice('contact_requests', 'select * from public.business_contact_requests order by created_at desc'),
      slice('ebooks', contentQuery('ebooks')),
      slice('workshops', contentQuery('workshops')),
      slice('templates', contentQuery('templates')),
      slice('events', contentQuery('events')),
      slice('team', contentQuery('team')),
      slice('news', contentQuery('news')),
      slice('donations', contentQuery('donations')),
      slice('jobs', contentQuery('jobs')),
    ];

    // Both are admin-only at the database level, so there is no point asking as
    // a member - and asking anyway would make helpdesk_stats() raise.
    if (isAdmin) {
      slices.push(
        slice('audit', 'select * from public.audit_log order by created_at desc limit 200'),
        'public.helpdesk_stats() as stats'
      );
    }

    const rows = await db.run(`select ${slices.join(', ')}`);
    const b = rows[0] as Record<string, never[]> & { stats?: HelpDeskStats };

    const auditLog = toDomainAll<AuditLogEntry & { createdAt: string }>(b.audit ?? []).map(
      (row) => ({ ...row, timestamp: row.createdAt })
    );

    return {
      members: toDomainAll<Member>(b.members),
      helpRequests: toDomainAll<HelpRequest>(b.requests),
      volunteerApps: toDomainAll<VolunteerApplication>(b.volunteers),
      assignments: toDomainAll<CaseAssignment>(b.assignments),
      messages: toDomainAll<AdminMessage>(b.messages),
      auditLog,
      stats: b.stats ?? EMPTY_STATS,
      businesses: toDomainAll<Business>(b.businesses),
      businessContactRequests: toDomainAll<BusinessContactRequest>(b.contact_requests),
      ebooks: toDomainAll<EBook>(b.ebooks),
      workshops: toDomainAll<VideoWorkshop>(b.workshops),
      templates: toDomainAll<ContentTemplate>(b.templates),
      events: toDomainAll<CommunityEvent>(b.events),
      teamMembers: toDomainAll<TeamMember>(b.team),
      newsArticles: toDomainAll<NewsArticle>(b.news),
      donationCampaigns: toDomainAll<DonationCampaign>(b.donations),
      jobPostings: toDomainAll<JobPosting>(b.jobs),
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
        ${safeDocuments(input.documents)},
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
        ${input.experienceSummary ?? null}, ${safeDocuments(input.documents)},
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
  currentStatus: 'current_status',
  industry: 'industry',
  jobTitle: 'job_title',
  employmentStatus: 'employment_status',
  experienceRange: 'experience_range',
  educationLevel: 'education_level',
  linkedinUrl: 'linkedin_url',
  skills: 'skills',
  professionalSummary: 'professional_summary',
  preferredContactMethod: 'preferred_contact_method',
  preferredLanguage: 'preferred_language',
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

// ========== ADMIN CONTROLS THAT HAD NO SERVER PATH ==========

/**
 * These four writes existed as read-only columns in the admin UI with no way
 * to change them: member verification and account status, the business
 * contact-request queue's status, and matrimony photo approval. The guard
 * trigger on profiles (0001) already lets an admin through and pins everyone
 * else, so the authority is unchanged — this only gives the admin a path.
 */

export async function setMemberVerification(
  adminId: string,
  input: { memberId: string; status: 'unverified' | 'pending' | 'verified' }
): Promise<Member> {
  return withUser(adminId, async (db) => {
    const rows = await db`
      update public.profiles set verification_status = ${input.status}
       where id = ${input.memberId}::uuid
      returning *
    `;
    const row = await one(rows);
    if (!row) throw new Error('Member not found');
    return toDomain<Member>(row);
  });
}

export async function setMemberAccountStatus(
  adminId: string,
  input: { memberId: string; status: 'active' | 'suspended' | 'archived' }
): Promise<Member> {
  return withUser(adminId, async (db) => {
    const rows = await db`
      update public.profiles set account_status = ${input.status}
       where id = ${input.memberId}::uuid
      returning *
    `;
    const row = await one(rows);
    if (!row) throw new Error('Member not found');
    return toDomain<Member>(row);
  });
}

export async function setBusinessRequestStatus(
  adminId: string,
  input: { requestId: string; status: string; adminNotes?: string }
): Promise<BusinessContactRequest> {
  return withUser(adminId, async (db) => {
    const rows = await db`
      update public.business_contact_requests
         set status = ${input.status},
             admin_notes = coalesce(${input.adminNotes ?? null}, admin_notes)
       where id = ${input.requestId}::uuid
      returning *
    `;
    const row = await one(rows);
    if (!row) throw new Error('Request not found');
    return toDomain<BusinessContactRequest>(row);
  });
}

/**
 * Approve or hide a member's matrimony photo. Nothing set is_approved before
 * this, so uploaded photos could never reach other members.
 */
export async function setMatrimonyPhotoApproval(
  adminId: string,
  input: { mediaId: string; decision: 'approved' | 'rejected' | 'pending' }
): Promise<void> {
  await withUser(adminId, async (db) => {
    // is_approved is kept in step by the trigger added in 0012, so readers do
    // not need to know about moderation_status.
    await db`
      update public.matrimony_media set moderation_status = ${input.decision}
       where id = ${input.mediaId}::uuid
    `;
  });
}

/**
 * Resolve a matrimony report. The status column and its check constraint have
 * existed since 0002; nothing ever wrote them, so reports could be filed and
 * read but never closed.
 */
export async function resolveMatrimonyReport(
  adminId: string,
  input: { reportId: string; status: 'reviewed' | 'actioned' | 'dismissed'; adminNotes?: string }
): Promise<void> {
  await withUser(adminId, async (db) => {
    await db`
      update public.matrimony_reports
         set status = ${input.status},
             admin_notes = coalesce(${input.adminNotes ?? null}, admin_notes),
             reviewed_by = ${adminId}::uuid,
             reviewed_at = now()
       where id = ${input.reportId}::uuid
    `;
  });
}

/** Approve or reject a submitted verification document. Same gap as reports. */
export async function resolveMatrimonyVerification(
  adminId: string,
  input: { verificationId: string; status: 'approved' | 'rejected' }
): Promise<void> {
  await withUser(adminId, async (db) => {
    await db`
      update public.matrimony_verifications
         set status = ${input.status},
             reviewed_by = ${adminId}::uuid,
             reviewed_at = now()
       where id = ${input.verificationId}::uuid
    `;
  });
}

/** Photos waiting on a decision, newest first. */
export interface PendingPhoto {
  id: string;
  profileId: string;
  url: string;
  isPrimary: boolean;
  createdAt: string;
}

export async function listPendingMatrimonyPhotos(adminId: string): Promise<PendingPhoto[]> {
  return withUserRead(adminId, async (db) => {
    const rows = await db`
      select id, profile_id, url, is_primary, created_at
        from public.matrimony_media
       where moderation_status = 'pending'
       order by created_at desc
       limit 100
    `;
    return toDomainAll<PendingPhoto>(rows);
  });
}

// ========== SAVED BUSINESSES (member) ==========

export async function listSavedBusinessIds(userId: string): Promise<string[]> {
  return withUserRead(userId, async (db) => {
    const rows = await db`
      select business_id from public.member_saved_businesses
       where member_id = ${userId}::uuid
    `;
    return rows.map((r) => (r as { business_id: string }).business_id);
  });
}

export async function toggleSavedBusiness(
  userId: string,
  businessId: string
): Promise<{ saved: boolean }> {
  return withUser(userId, async (db) => {
    const inserted = await db`
      insert into public.member_saved_businesses (member_id, business_id)
      values (${userId}::uuid, ${businessId}::uuid)
      on conflict do nothing
      returning business_id
    `;
    if (inserted.length > 0) return { saved: true };
    await db`
      delete from public.member_saved_businesses
       where member_id = ${userId}::uuid and business_id = ${businessId}::uuid
    `;
    return { saved: false };
  });
}
