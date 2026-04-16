// ========== ROLES ==========
export type UserRole = 'member' | 'admin';

// ========== SUPPORT CATEGORIES ==========
export const SUPPORT_CATEGORIES = [
  'Job Referrals and Placement Assistance',
  'Resume and Cover Letter Review',
  'Newcomer Settlement Support',
  'Tax Consultation',
  'Career Guidance and Mentorship',
  'Immigration Queries',
  'Study Resource Guidance',
  'Exam Preparation Guidance',
  'General Community Support',
  'Other',
] as const;

export type SupportCategory = typeof SUPPORT_CATEGORIES[number];

// ========== REQUEST STATUS LIFECYCLE ==========
export type RequestStatus =
  | 'submitted'
  | 'under_review'
  | 'need_more_info'
  | 'waiting_for_member'
  | 'approved'
  | 'assigned'
  | 'volunteer_responded'
  | 'admin_reviewing'
  | 'response_sent'
  | 'in_progress'
  | 'resolved'
  | 'closed'
  | 'rejected'
  | 'escalated'
  | 'archived';

// ========== VOLUNTEER APPLICATION STATUS ==========
export type VolunteerStatus =
  | 'new_application'
  | 'pending_verification'
  | 'approved'
  | 'rejected'
  | 'on_hold'
  | 'inactive'
  | 'suspended';

// ========== ASSIGNMENT STATUS ==========
export type AssignmentStatus =
  | 'pending'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'reassigned'
  | 'cancelled';

// ========== MEMBER ENTITY ==========
export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  pcNumber?: string;
  city: string;
  province: string;
  preferredLanguage: string;
  preferredContactMethod: 'email' | 'phone' | 'portal';
  roleFlags: {
    isHelpSeeker: boolean;
    isVolunteer: boolean;
  };
  verificationStatus: 'unverified' | 'pending' | 'verified';
  accountStatus: 'active' | 'suspended' | 'archived';
  createdAt: string;
  updatedAt: string;
}

// ========== HELP REQUEST ENTITY ==========
export interface HelpRequest {
  id: string;
  memberId: string;
  memberName: string;
  category: SupportCategory;
  subcategory?: string;
  title: string;
  description: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  preferredTimeline?: string;
  previouslyRequested: boolean;
  documentsRequired: boolean;
  documents: string[];
  consentGiven: boolean;
  // Optional routing
  supportType?: 'one_time' | 'ongoing_mentorship';
  openToGroupResources: boolean;
  contactByAdminOnly: boolean;
  // Lifecycle
  status: RequestStatus;
  assignedAdminId?: string;
  assignedVolunteerId?: string;
  assignedVolunteerName?: string;
  internalNotes: InternalNote[];
  timeline: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

// ========== VOLUNTEER APPLICATION ENTITY ==========
export interface VolunteerApplication {
  id: string;
  memberId: string;
  memberName: string;
  // Basic
  email: string;
  phone: string;
  pcNumber?: string;
  city: string;
  province: string;
  linkedinUrl?: string;
  currentProfession: string;
  organization: string;
  yearsExperience: number;
  // Volunteer profile
  expertiseAreas: SupportCategory[];
  languages: string[];
  availability: string;
  maxCasesPerMonth: number;
  mentorshipInterest: boolean;
  referralSupportInterest: boolean;
  resumeReviewInterest: boolean;
  settlementSupportInterest: boolean;
  taxGuidanceInterest: boolean;
  immigrationGuidanceInterest: boolean;
  // Compliance
  motivation: string;
  experienceSummary: string;
  documents: string[];
  agreedToRules: boolean;
  agreedNoDirectContact: boolean;
  agreedAdminMediated: boolean;
  consentToScreening: boolean;
  // Status
  status: VolunteerStatus;
  reviewedByAdminId?: string;
  reviewedAt?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// ========== CASE ASSIGNMENT ENTITY ==========
export interface CaseAssignment {
  id: string;
  requestId: string;
  requestTitle: string;
  volunteerMemberId: string;
  volunteerName: string;
  assignedByAdminId: string;
  scope: string;
  instructions: string;
  dueDate: string;
  status: AssignmentStatus;
  volunteerResponse?: string;
  createdAt: string;
  updatedAt: string;
}

// ========== ADMIN MESSAGE ENTITY ==========
export interface AdminMessage {
  id: string;
  caseId: string;
  caseTitle: string;
  senderRole: 'admin' | 'member' | 'volunteer';
  senderUserId: string;
  senderName: string;
  recipientRole: 'admin' | 'member' | 'volunteer';
  moderatedFlag: boolean;
  visibilityScope: 'member_only' | 'volunteer_only' | 'admin_only' | 'all';
  body: string;
  attachments: string[];
  read: boolean;
  createdAt: string;
}

// ========== AUDIT LOG ENTITY ==========
export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  actionType: string;
  targetType: 'request' | 'volunteer_app' | 'assignment' | 'member' | 'message' | 'system';
  targetId: string;
  description: string;
  metadata?: Record<string, string>;
  timestamp: string;
}

// ========== INTERNAL NOTE ==========
export interface InternalNote {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

// ========== TIMELINE EVENT ==========
export interface TimelineEvent {
  date: string;
  status: string;
  description: string;
}

// ========== ADMIN STATS ==========
export interface HelpDeskStats {
  totalMembers: number;
  totalRequests: number;
  openRequests: number;
  closedRequests: number;
  pendingVolunteerApps: number;
  approvedVolunteers: number;
  activeAssignments: number;
  avgResolutionDays: number;
  escalations: number;
  categoryCounts: Record<string, number>;
}
