/**
 * The help desk's member-facing words, in one place.
 *
 * Shared by the request form, the request list and the request thread so the
 * promise a member reads before submitting is the same one they read after.
 */

/**
 * PRODUCT DECISION, not a measurement: the reply time the club commits to in
 * front of members. Nothing enforces it; changing it here changes every
 * screen that states it. Agreed at 2 in September 2026.
 */
export const FIRST_REPLY_BUSINESS_DAYS = 2;

export const FIRST_REPLY_PROMISE =
  `Most requests get a first reply within ${FIRST_REPLY_BUSINESS_DAYS} business days.`;

/** Shown wherever someone in real trouble might be typing. 211 is Canada-wide. */
export const EMERGENCY_LINE =
  'This is not an emergency service. For urgent help call 211 (free, 24/7, many languages).';

/**
 * What a person says, for what the database stores. The codes in
 * SUPPORT_CATEGORIES are the club's register ("Immigration Queries") and stay
 * unchanged: admins, volunteers' expertise areas and every stored request use
 * them. Members read these instead.
 */
export const CATEGORY_LABELS: Record<string, string> = {
  'Job Referrals and Placement Assistance': 'Finding a job',
  'Resume and Cover Letter Review': 'My resume',
  'Newcomer Settlement Support': 'Settling in and housing',
  'Tax Consultation': 'Money and taxes',
  'Career Guidance and Mentorship': 'Career advice and mentoring',
  'Immigration Queries': 'Immigration and status',
  'Study Resource Guidance': 'School and studying',
  'Exam Preparation Guidance': 'Preparing for an exam',
  'General Community Support': 'Community and settling in',
  'Other': 'Something else',
};

export const categoryLabel = (code: string): string => CATEGORY_LABELS[code] ?? code;
