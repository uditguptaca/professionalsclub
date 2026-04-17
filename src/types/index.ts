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

// ========== BUSINESS DIRECTORY ==========
export const BUSINESS_CATEGORIES = [
  'Tax & Accounting',
  'Legal Services',
  'Immigration Services',
  'Real Estate',
  'Mortgage',
  'Insurance',
  'IT Services',
  'Marketing',
  'HR & Recruitment',
  'Education / Coaching',
  'Health & Wellness',
  'Home Services',
  'Financial Planning',
  'Notary / Documentation',
  'Business Consulting',
  'Other',
] as const;

export type BusinessCategory = typeof BUSINESS_CATEGORIES[number];

export type BusinessStatus = 'draft' | 'pending_review' | 'verified' | 'rejected' | 'inactive';

export interface Business {
  id: string;
  name: string;
  slug: string;
  logo: string;
  coverImage: string;
  category: BusinessCategory;
  subcategory?: string;
  descriptionShort: string;
  descriptionFull: string;
  services: string[];
  // Contact
  contactPerson: string;
  phone: string;
  email: string;
  website: string;
  socialLinks: { platform: string; url: string }[];
  // Location
  address: string;
  city: string;
  province: string;
  postalCode: string;
  serviceArea: string;
  // Details
  yearsInBusiness: number;
  businessHours?: string;
  pricingSummary?: string;
  // Member benefits
  memberRateText?: string;
  offerBadge?: string;
  memberBenefits?: string[];
  // Status
  verificationStatus: BusinessStatus;
  isFeatured: boolean;
  hasMemberRate: boolean;
  // Admin
  createdBy: string;
  approvedByAdmin?: string;
  createdAt: string;
  updatedAt: string;
}

export type BusinessContactRequestStatus = 'pending' | 'in_progress' | 'completed' | 'closed';
export type BusinessContactHelpType = 'introduction' | 'quote_support' | 'booking_help' | 'clarification' | 'other';

export interface BusinessContactRequest {
  id: string;
  businessId: string;
  businessName: string;
  memberId: string;
  memberName: string;
  helpType: BusinessContactHelpType;
  preferredContact: 'email' | 'phone' | 'portal';
  notes: string;
  status: BusinessContactRequestStatus;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// ========== DYNAMIC CONTENT TYPES ==========

export interface EBook {
  id: string;
  title: string;
  author: string;
  type: string; // PDF, DOCX, etc.
  size: string;
  color: string;
  image: string;
  downloadUrl: string;
  createdAt: string;
}

export interface VideoWorkshop {
  id: string;
  title: string;
  duration: string;
  recordedDate: string;
  platform: string; // YouTube, Zoom Recording, etc.
  thumbnailImage: string;
  videoUrl: string;
  createdAt: string;
}

export interface ContentTemplate {
  id: string;
  title: string;
  fileType: string; // Word Doc, PDF, ZIP
  category: string; // Career, Communication, Settlement
  image: string;
  accessUrl: string;
  createdAt: string;
}

export type EventStatus = 'upcoming' | 'past';
export type EventType = 'in_person' | 'virtual' | 'hybrid';

export interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  eventType: EventType;
  capacity: number;
  attendees: number;
  image: string;
  isFeatured: boolean;
  platform?: string; // YouTube Live, Zoom, etc.
  rsvpUrl?: string;
  status: EventStatus;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  image: string;
  linkedinUrl?: string;
  order: number;
  createdAt: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  image: string;
  author: string;
  category: string;
  publishedAt: string;
  createdAt: string;
}

export interface DonationCampaign {
  id: string;
  title: string;
  description: string;
  goalAmount: number;
  raisedAmount: number;
  isActive: boolean;
  createdAt: string;
}

// ========== JOB PORTAL ==========
export type JobType = 'full_time' | 'part_time' | 'contract' | 'freelance' | 'internship';

export const JOB_CATEGORIES = [
  'Developer',
  'Accounting',
  'Technology',
  'Medical',
  'Government',
  'Media & News',
  'Restaurants',
  'Education',
  'Marketing',
  'Finance',
  'Legal',
  'HR & Recruitment',
  'Design',
  'Other',
] as const;

export type JobCategory = typeof JOB_CATEGORIES[number];

export interface JobPosting {
  id: string;
  title: string;
  company: string;
  companyLogo: string;
  location: string;
  province: string;
  salaryMin: number;
  salaryMax: number;
  salaryPeriod: 'yearly' | 'monthly' | 'hourly';
  jobType: JobType;
  category: JobCategory;
  description: string;
  requirements: string;
  responsibilities: string;
  contactEmail: string;
  applyUrl: string;
  tags: string[];
  isFeatured: boolean;
  isActive: boolean;
  postedAt: string;
  expiresAt: string;
  createdAt: string;
}
