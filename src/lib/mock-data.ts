import type {
  Member,
  HelpRequest,
  VolunteerApplication,
  CaseAssignment,
  AdminMessage,
  AuditLogEntry,
  HelpDeskStats,
} from '@/types';

// ========== MEMBERS ==========
export const mockMembers: Member[] = [
  {
    id: 'm1', firstName: 'Priya', lastName: 'Sharma', email: 'priya.sharma@gmail.com', phone: '+1-416-555-0101',
    pcNumber: 'PC-2025-0042', city: 'Toronto', province: 'Ontario', preferredLanguage: 'English',
    preferredContactMethod: 'portal', roleFlags: { isHelpSeeker: true, isVolunteer: false },
    verificationStatus: 'verified', accountStatus: 'active',
    createdAt: '2025-11-15T10:00:00Z', updatedAt: '2026-04-01T08:00:00Z',
  },
  {
    id: 'm2', firstName: 'Arjun', lastName: 'Patel', email: 'arjun.patel@gmail.com', phone: '+1-604-555-0202',
    pcNumber: 'PC-2025-0108', city: 'Vancouver', province: 'British Columbia', preferredLanguage: 'English',
    preferredContactMethod: 'email', roleFlags: { isHelpSeeker: true, isVolunteer: true },
    verificationStatus: 'verified', accountStatus: 'active',
    createdAt: '2025-12-01T10:00:00Z', updatedAt: '2026-03-20T08:00:00Z',
  },
  {
    id: 'm3', firstName: 'Neha', lastName: 'Gupta', email: 'neha.gupta@gmail.com', phone: '+1-647-555-0303',
    pcNumber: 'PC-2026-0015', city: 'Toronto', province: 'Ontario', preferredLanguage: 'Hindi',
    preferredContactMethod: 'portal', roleFlags: { isHelpSeeker: true, isVolunteer: false },
    verificationStatus: 'pending', accountStatus: 'active',
    createdAt: '2026-01-10T10:00:00Z', updatedAt: '2026-04-05T08:00:00Z',
  },
  {
    id: 'm4', firstName: 'Raj', lastName: 'Kumar', email: 'raj.kumar@outlook.com', phone: '+1-613-555-0404',
    pcNumber: 'PC-2025-0003', city: 'Ottawa', province: 'Ontario', preferredLanguage: 'English',
    preferredContactMethod: 'portal', roleFlags: { isHelpSeeker: false, isVolunteer: true },
    verificationStatus: 'verified', accountStatus: 'active',
    createdAt: '2025-08-01T10:00:00Z', updatedAt: '2026-04-10T08:00:00Z',
  },
  {
    id: 'm5', firstName: 'Meera', lastName: 'Joshi', email: 'meera.joshi@gmail.com', phone: '+1-519-555-0505',
    city: 'Waterloo', province: 'Ontario', preferredLanguage: 'English',
    preferredContactMethod: 'email', roleFlags: { isHelpSeeker: false, isVolunteer: true },
    verificationStatus: 'verified', accountStatus: 'active',
    createdAt: '2025-07-20T10:00:00Z', updatedAt: '2026-04-08T08:00:00Z',
  },
];

// ========== HELP REQUESTS ==========
export const mockHelpRequests: HelpRequest[] = [
  {
    id: 'HR-2026-001', memberId: 'm1', memberName: 'Priya Sharma',
    category: 'Job Referrals and Placement Assistance', title: 'Looking for Software Engineering referrals at Shopify',
    description: 'I have 7 years experience building scalable platform infrastructure. I am looking for a Senior or Staff level role at Shopify. I would appreciate any referral assistance from someone connected to their engineering team.',
    urgency: 'medium', preferredTimeline: '2-4 weeks', previouslyRequested: false,
    documentsRequired: true, documents: ['priya_resume_2026.pdf'], consentGiven: true,
    supportType: 'one_time', openToGroupResources: false, contactByAdminOnly: true,
    status: 'assigned', assignedAdminId: 'admin1', assignedVolunteerId: 'm4', assignedVolunteerName: 'Raj Kumar',
    internalNotes: [
      { id: 'n1', authorId: 'admin1', authorName: 'Admin', body: 'Strong candidate. Raj Kumar has Shopify connections. Assigning.', createdAt: '2026-03-16T09:00:00Z' }
    ],
    timeline: [
      { date: '2026-03-15T10:00:00Z', status: 'submitted', description: 'Help request submitted by Priya Sharma' },
      { date: '2026-03-15T14:00:00Z', status: 'under_review', description: 'Admin reviewing request details' },
      { date: '2026-03-16T09:00:00Z', status: 'approved', description: 'Request approved by admin' },
      { date: '2026-03-16T09:30:00Z', status: 'assigned', description: 'Assigned to volunteer Raj Kumar' },
    ],
    createdAt: '2026-03-15T10:00:00Z', updatedAt: '2026-03-16T09:30:00Z',
  },
  {
    id: 'HR-2026-002', memberId: 'm3', memberName: 'Neha Gupta',
    category: 'Newcomer Settlement Support', title: 'Help with finding housing in Toronto',
    description: 'I recently arrived in Canada on a PGWP. I need guidance on finding affordable housing in the Greater Toronto Area. I have been looking at rental listings but I am not sure about tenant rights and what to look for in a lease.',
    urgency: 'high', preferredTimeline: '1-2 weeks', previouslyRequested: false,
    documentsRequired: false, documents: [], consentGiven: true,
    supportType: 'one_time', openToGroupResources: true, contactByAdminOnly: true,
    status: 'under_review', assignedAdminId: 'admin1',
    internalNotes: [
      { id: 'n2', authorId: 'admin1', authorName: 'Admin', body: 'Newcomer case. Check if Meera is available for settlement guidance.', createdAt: '2026-04-06T10:00:00Z' }
    ],
    timeline: [
      { date: '2026-04-05T15:00:00Z', status: 'submitted', description: 'Help request submitted by Neha Gupta' },
      { date: '2026-04-06T09:00:00Z', status: 'under_review', description: 'Admin reviewing request' },
    ],
    createdAt: '2026-04-05T15:00:00Z', updatedAt: '2026-04-06T10:00:00Z',
  },
  {
    id: 'HR-2026-003', memberId: 'm2', memberName: 'Arjun Patel',
    category: 'Tax Consultation', title: 'First-time filing Canadian taxes as a PR',
    description: 'I became a permanent resident in 2025. This is my first time filing taxes in Canada and I need help understanding RRSP, TFSA, and whether I should declare my foreign income from India.',
    urgency: 'medium', preferredTimeline: 'Before April 30', previouslyRequested: false,
    documentsRequired: true, documents: ['t4_slip.pdf', 'india_income_cert.pdf'], consentGiven: true,
    supportType: 'one_time', openToGroupResources: true, contactByAdminOnly: true,
    status: 'response_sent', assignedAdminId: 'admin1', assignedVolunteerId: 'm5', assignedVolunteerName: 'Meera Joshi',
    internalNotes: [
      { id: 'n3', authorId: 'admin1', authorName: 'Admin', body: 'Tax case. Meera has CPA background. Added disclaimer about non-professional advice.', createdAt: '2026-03-22T11:00:00Z' },
    ],
    timeline: [
      { date: '2026-03-20T09:00:00Z', status: 'submitted', description: 'Help request submitted' },
      { date: '2026-03-20T14:00:00Z', status: 'under_review', description: 'Admin reviewing' },
      { date: '2026-03-21T10:00:00Z', status: 'approved', description: 'Request approved' },
      { date: '2026-03-22T11:00:00Z', status: 'assigned', description: 'Assigned to Meera Joshi' },
      { date: '2026-03-25T16:00:00Z', status: 'volunteer_responded', description: 'Volunteer submitted guidance' },
      { date: '2026-03-26T09:00:00Z', status: 'admin_reviewing', description: 'Admin reviewing volunteer response' },
      { date: '2026-03-26T14:00:00Z', status: 'response_sent', description: 'Response sent to member by admin' },
    ],
    createdAt: '2026-03-20T09:00:00Z', updatedAt: '2026-03-26T14:00:00Z',
  },
  {
    id: 'HR-2026-004', memberId: 'm1', memberName: 'Priya Sharma',
    category: 'Resume and Cover Letter Review', title: 'Need resume review for senior engineering roles',
    description: 'I would like an experienced reviewer to look at my resume targeting senior+ engineering roles at top Canadian tech companies. I need feedback on layout, impact-driven bullet points, and overall positioning.',
    urgency: 'low', previouslyRequested: false,
    documentsRequired: true, documents: ['priya_resume_draft_v3.pdf'], consentGiven: true,
    supportType: 'one_time', openToGroupResources: false, contactByAdminOnly: true,
    status: 'resolved',
    internalNotes: [],
    timeline: [
      { date: '2026-02-10T09:00:00Z', status: 'submitted', description: 'Request submitted' },
      { date: '2026-02-11T10:00:00Z', status: 'assigned', description: 'Assigned to volunteer' },
      { date: '2026-02-15T14:00:00Z', status: 'response_sent', description: 'Feedback sent to member' },
      { date: '2026-02-16T08:00:00Z', status: 'resolved', description: 'Member confirmed resolution' },
    ],
    createdAt: '2026-02-10T09:00:00Z', updatedAt: '2026-02-16T08:00:00Z', closedAt: '2026-02-16T08:00:00Z',
  },
  {
    id: 'HR-2026-005', memberId: 'm3', memberName: 'Neha Gupta',
    category: 'Immigration Queries', title: 'PGWP to PR pathway guidance',
    description: 'My post-graduation work permit expires in 8 months. I need guidance on the Express Entry process, CRS score optimization, and whether I should apply through the Canadian Experience Class.',
    urgency: 'high', preferredTimeline: 'As soon as possible', previouslyRequested: false,
    documentsRequired: false, documents: [], consentGiven: true,
    supportType: 'ongoing_mentorship', openToGroupResources: true, contactByAdminOnly: true,
    status: 'submitted',
    internalNotes: [],
    timeline: [
      { date: '2026-04-14T10:00:00Z', status: 'submitted', description: 'Help request submitted by Neha Gupta' },
    ],
    createdAt: '2026-04-14T10:00:00Z', updatedAt: '2026-04-14T10:00:00Z',
  },
];

// ========== VOLUNTEER APPLICATIONS ==========
export const mockVolunteerApplications: VolunteerApplication[] = [
  {
    id: 'VA-001', memberId: 'm4', memberName: 'Raj Kumar',
    email: 'raj.kumar@outlook.com', phone: '+1-613-555-0404', pcNumber: 'PC-2025-0003',
    city: 'Ottawa', province: 'Ontario', linkedinUrl: 'linkedin.com/in/rajkumar',
    currentProfession: 'Staff Software Engineer', organization: 'Shopify', yearsExperience: 12,
    expertiseAreas: ['Job Referrals and Placement Assistance', 'Resume and Cover Letter Review', 'Career Guidance and Mentorship'],
    languages: ['English', 'Hindi', 'Punjabi'], availability: 'Weekday evenings, Saturdays',
    maxCasesPerMonth: 4, mentorshipInterest: true, referralSupportInterest: true,
    resumeReviewInterest: true, settlementSupportInterest: false, taxGuidanceInterest: false, immigrationGuidanceInterest: false,
    motivation: 'I want to give back to the community that helped me when I first arrived in Canada 8 years ago.',
    experienceSummary: '12 years in software engineering, currently Staff Engineer at Shopify. Have mentored 20+ engineers.',
    documents: ['raj_kumar_cv.pdf'], agreedToRules: true, agreedNoDirectContact: true, agreedAdminMediated: true, consentToScreening: true,
    status: 'approved', reviewedByAdminId: 'admin1', reviewedAt: '2025-09-01T10:00:00Z',
    adminNotes: 'Excellent candidate. Strong community commitment. Approved.',
    createdAt: '2025-08-15T10:00:00Z', updatedAt: '2025-09-01T10:00:00Z',
  },
  {
    id: 'VA-002', memberId: 'm5', memberName: 'Meera Joshi',
    email: 'meera.joshi@gmail.com', phone: '+1-519-555-0505',
    city: 'Waterloo', province: 'Ontario', linkedinUrl: 'linkedin.com/in/meerajoshi',
    currentProfession: 'CPA & Financial Advisor', organization: 'Independent', yearsExperience: 8,
    expertiseAreas: ['Tax Consultation', 'Newcomer Settlement Support', 'General Community Support'],
    languages: ['English', 'Hindi', 'Marathi'], availability: 'Flexible',
    maxCasesPerMonth: 6, mentorshipInterest: true, referralSupportInterest: false,
    resumeReviewInterest: false, settlementSupportInterest: true, taxGuidanceInterest: true, immigrationGuidanceInterest: false,
    motivation: 'As a CPA, I see many newcomers struggling with Canadian tax obligations. I want to help them navigate this.',
    experienceSummary: '8 years as CPA. Specialized in newcomer tax filing and cross-border tax issues.',
    documents: ['meera_cpa_cert.pdf', 'meera_cv.pdf'], agreedToRules: true, agreedNoDirectContact: true, agreedAdminMediated: true, consentToScreening: true,
    status: 'approved', reviewedByAdminId: 'admin1', reviewedAt: '2025-10-15T10:00:00Z',
    adminNotes: 'CPA credentials verified. Approved for tax and settlement categories.',
    createdAt: '2025-10-01T10:00:00Z', updatedAt: '2025-10-15T10:00:00Z',
  },
  {
    id: 'VA-003', memberId: 'm2', memberName: 'Arjun Patel',
    email: 'arjun.patel@gmail.com', phone: '+1-604-555-0202', pcNumber: 'PC-2025-0108',
    city: 'Vancouver', province: 'British Columbia', linkedinUrl: 'linkedin.com/in/arjunpatel',
    currentProfession: 'Product Manager', organization: 'Amazon Canada', yearsExperience: 5,
    expertiseAreas: ['Career Guidance and Mentorship', 'Resume and Cover Letter Review'],
    languages: ['English', 'Hindi', 'Gujarati'], availability: 'Weekends only',
    maxCasesPerMonth: 2, mentorshipInterest: true, referralSupportInterest: true,
    resumeReviewInterest: true, settlementSupportInterest: false, taxGuidanceInterest: false, immigrationGuidanceInterest: false,
    motivation: 'I benefited from mentorship when I transitioned to Canada. I want to pay it forward.',
    experienceSummary: '5 years as PM. Previously co-founded a startup. MBA from Rotman.',
    documents: ['arjun_cv.pdf'], agreedToRules: true, agreedNoDirectContact: true, agreedAdminMediated: true, consentToScreening: true,
    status: 'pending_verification', adminNotes: 'Need to verify Amazon employment.',
    createdAt: '2026-04-10T10:00:00Z', updatedAt: '2026-04-10T10:00:00Z',
  },
];

// ========== CASE ASSIGNMENTS ==========
export const mockAssignments: CaseAssignment[] = [
  {
    id: 'ASG-001', requestId: 'HR-2026-001', requestTitle: 'Looking for Software Engineering referrals at Shopify',
    volunteerMemberId: 'm4', volunteerName: 'Raj Kumar', assignedByAdminId: 'admin1',
    scope: 'Provide referral guidance and share relevant job openings at Shopify. Do NOT share personal contact details with the requester.',
    instructions: 'Review the member\'s resume and provide feedback. If appropriate, check internal openings. Respond through the admin relay only.',
    dueDate: '2026-03-23T00:00:00Z', status: 'in_progress',
    createdAt: '2026-03-16T09:30:00Z', updatedAt: '2026-03-18T14:00:00Z',
  },
  {
    id: 'ASG-002', requestId: 'HR-2026-003', requestTitle: 'First-time filing Canadian taxes as a PR',
    volunteerMemberId: 'm5', volunteerName: 'Meera Joshi', assignedByAdminId: 'admin1',
    scope: 'Provide general tax filing guidance for first-time PR filers. Include RRSP/TFSA basics, foreign income declaration overview.',
    instructions: 'NOTE: Add disclaimer that this is general guidance, not professional tax advice. Member should consult a CPA for formal filing.',
    dueDate: '2026-03-30T00:00:00Z', status: 'completed',
    volunteerResponse: 'I\'ve prepared a comprehensive guide covering: 1) T4 filing basics, 2) RRSP vs TFSA comparison, 3) Foreign income declaration requirements under the ITA. Included the standard disclaimer. Ready for admin review.',
    createdAt: '2026-03-22T11:00:00Z', updatedAt: '2026-03-26T14:00:00Z',
  },
];

// ========== ADMIN MESSAGES ==========
export const mockMessages: AdminMessage[] = [
  {
    id: 'msg-001', caseId: 'HR-2026-001', caseTitle: 'Looking for Software Engineering referrals at Shopify',
    senderRole: 'admin', senderUserId: 'admin1', senderName: 'Admin',
    recipientRole: 'member', moderatedFlag: false, visibilityScope: 'member_only',
    body: 'Hi Priya, we have received your request for referral assistance at Shopify. We are currently matching you with a volunteer who has connections there. You will hear back within 3-5 business days.',
    attachments: [], read: true, createdAt: '2026-03-16T10:00:00Z',
  },
  {
    id: 'msg-002', caseId: 'HR-2026-001', caseTitle: 'Looking for Software Engineering referrals at Shopify',
    senderRole: 'member', senderUserId: 'm1', senderName: 'Priya Sharma',
    recipientRole: 'admin', moderatedFlag: false, visibilityScope: 'admin_only',
    body: 'Thank you for the update! I am happy to provide any additional information needed. Looking forward to hearing back.',
    attachments: [], read: true, createdAt: '2026-03-16T11:00:00Z',
  },
  {
    id: 'msg-003', caseId: 'HR-2026-003', caseTitle: 'First-time filing Canadian taxes as a PR',
    senderRole: 'admin', senderUserId: 'admin1', senderName: 'Admin',
    recipientRole: 'member', moderatedFlag: false, visibilityScope: 'member_only',
    body: 'Hi Arjun, our volunteer has prepared a comprehensive guide for your tax situation. Please find the guidance below:\n\n1. T4 Filing: File through CRA My Account. Your employer\'s T4 slip has all the info needed.\n2. RRSP: You have contribution room based on your 2025 earned income (18% of earned income, up to the annual limit).\n3. TFSA: As a PR, you accumulate room from the year you became a resident.\n4. Foreign Income: If you had Indian income in 2025, it must be declared. Canada-India tax treaty prevents double taxation.\n\n⚠️ DISCLAIMER: This is general guidance only and not professional tax advice. Please consult a licensed CPA for your specific filing.',
    attachments: ['tax_guide_newcomers.pdf'], read: false, createdAt: '2026-03-26T14:00:00Z',
  },
  {
    id: 'msg-004', caseId: 'HR-2026-002', caseTitle: 'Help with finding housing in Toronto',
    senderRole: 'admin', senderUserId: 'admin1', senderName: 'Admin',
    recipientRole: 'member', moderatedFlag: false, visibilityScope: 'member_only',
    body: 'Hi Neha, thank you for reaching out. We are currently reviewing your settlement support request. We have a volunteer with Toronto housing expertise and will connect you through our admin-mediated process shortly.',
    attachments: [], read: true, createdAt: '2026-04-06T10:30:00Z',
  },
  {
    id: 'msg-005', caseId: 'HR-2026-001', caseTitle: 'Looking for Software Engineering referrals at Shopify',
    senderRole: 'admin', senderUserId: 'admin1', senderName: 'Admin',
    recipientRole: 'volunteer', moderatedFlag: false, visibilityScope: 'volunteer_only',
    body: 'Hi Raj, we have a member looking for referral assistance at Shopify for a Senior/Staff SWE role. They have 7 years of experience. Please review the attached resume and let us know if you can help. Do NOT contact the member directly.',
    attachments: ['priya_resume_2026.pdf'], read: true, createdAt: '2026-03-16T09:45:00Z',
  },
];

// ========== AUDIT LOG ==========
export const mockAuditLog: AuditLogEntry[] = [
  { id: 'log-001', actorId: 'admin1', actorName: 'Admin', actorRole: 'admin', actionType: 'request_reviewed', targetType: 'request', targetId: 'HR-2026-001', description: 'Reviewed and approved help request HR-2026-001', timestamp: '2026-03-16T09:00:00Z' },
  { id: 'log-002', actorId: 'admin1', actorName: 'Admin', actorRole: 'admin', actionType: 'volunteer_assigned', targetType: 'assignment', targetId: 'ASG-001', description: 'Assigned volunteer Raj Kumar to case HR-2026-001', timestamp: '2026-03-16T09:30:00Z' },
  { id: 'log-003', actorId: 'admin1', actorName: 'Admin', actorRole: 'admin', actionType: 'message_sent', targetType: 'message', targetId: 'msg-001', description: 'Sent acknowledgment message to Priya Sharma', timestamp: '2026-03-16T10:00:00Z' },
  { id: 'log-004', actorId: 'admin1', actorName: 'Admin', actorRole: 'admin', actionType: 'volunteer_approved', targetType: 'volunteer_app', targetId: 'VA-001', description: 'Approved volunteer application from Raj Kumar', timestamp: '2025-09-01T10:00:00Z' },
  { id: 'log-005', actorId: 'admin1', actorName: 'Admin', actorRole: 'admin', actionType: 'response_relayed', targetType: 'message', targetId: 'msg-003', description: 'Relayed volunteer tax guidance to Arjun Patel', timestamp: '2026-03-26T14:00:00Z' },
  { id: 'log-006', actorId: 'm1', actorName: 'Priya Sharma', actorRole: 'member', actionType: 'request_submitted', targetType: 'request', targetId: 'HR-2026-001', description: 'Submitted help request for Shopify referral', timestamp: '2026-03-15T10:00:00Z' },
  { id: 'log-007', actorId: 'm3', actorName: 'Neha Gupta', actorRole: 'member', actionType: 'request_submitted', targetType: 'request', targetId: 'HR-2026-005', description: 'Submitted help request for PGWP to PR guidance', timestamp: '2026-04-14T10:00:00Z' },
];

// ========== STATS ==========
export const mockStats: HelpDeskStats = {
  totalMembers: 247,
  totalRequests: 89,
  openRequests: 12,
  closedRequests: 64,
  pendingVolunteerApps: 3,
  approvedVolunteers: 18,
  activeAssignments: 5,
  avgResolutionDays: 4.2,
  escalations: 2,
  categoryCounts: {
    'Job Referrals and Placement Assistance': 28,
    'Resume and Cover Letter Review': 18,
    'Newcomer Settlement Support': 15,
    'Tax Consultation': 9,
    'Career Guidance and Mentorship': 8,
    'Immigration Queries': 5,
    'General Community Support': 4,
    'Other': 2,
  },
};
