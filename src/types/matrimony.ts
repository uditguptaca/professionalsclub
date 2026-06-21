// ========== MATRIMONY MODULE TYPES ==========

// ========== STATUS ENUMS ==========
export type MatrimonyProfileStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'changes_requested'
  | 'suspended';

export type MatrimonyInterestStatus = 'pending' | 'accepted' | 'declined';
export type MatrimonyPhotoRequestStatus = 'pending' | 'granted' | 'declined';
export type MatrimonyReportStatus = 'open' | 'reviewed' | 'actioned' | 'dismissed';
export type MatrimonyVerificationStatus = 'pending' | 'approved' | 'rejected';
export type MatrimonySuccessStoryStatus = 'pending' | 'approved' | 'rejected';
export type MatrimonyMessageStatus = 'sent' | 'delivered' | 'read';

export type MatrimonyIntroMode = 'mutual_reveal' | 'admin_mediated';

// ========== FIELD ENUMS ==========
export type MatrimonyGender = 'male' | 'female' | 'other';
export type MatrimonyMaritalStatus = 'never_married' | 'divorced' | 'widowed' | 'awaiting_divorce' | 'separated';
export type MatrimonyHaveChildren = 'yes_living_together' | 'yes_not_living_together' | 'no';
export type MatrimonyPhysicalStatus = 'normal' | 'differently_abled';
export type MatrimonyManglikStatus = 'yes' | 'no' | 'dont_know';
export type MatrimonyResidencyStatus = 'citizen' | 'pr' | 'work_permit' | 'study_permit' | 'visitor' | 'other';
export type MatrimonyEmploymentType = 'full_time' | 'part_time' | 'self_employed' | 'business' | 'student' | 'not_working';
export type MatrimonyFamilyType = 'nuclear' | 'joint';
export type MatrimonyFamilyStatus = 'middle' | 'upper_middle' | 'affluent' | 'rich';
export type MatrimonyFamilyValues = 'traditional' | 'moderate' | 'liberal';
export type MatrimonyDiet = 'veg' | 'non_veg' | 'eggetarian' | 'vegan' | 'jain';
export type MatrimonyYesNoOccasionally = 'no' | 'occasionally' | 'yes';
export type MatrimonyPhotoVisibility = 'all' | 'on_request' | 'blurred';
export type MatrimonyMediaType = 'photo' | 'video' | 'horoscope' | 'id_doc';
export type MatrimonyContactMethod = 'email' | 'phone' | 'whatsapp';
export type MatrimonyProfileCreatedBy = 'self' | 'parent' | 'sibling' | 'relative' | 'friend' | 'guardian';
export type MatrimonyDisplayPref = 'full_name' | 'first_name' | 'initials';
export type MatrimonyReportTargetType = 'profile' | 'message';
export type MatrimonyVerificationType = 'id' | 'profession' | 'photo';

// ========== MAIN PROFILE ==========
export interface MatrimonyProfile {
  id: string;
  user_id: string;
  status: MatrimonyProfileStatus;
  created_by: MatrimonyProfileCreatedBy;

  // Personal
  full_name: string;
  display_pref: MatrimonyDisplayPref;
  gender: MatrimonyGender;
  dob: string; // ISO date
  height_cm: number;
  weight_kg?: number;
  body_type?: string;
  marital_status: MatrimonyMaritalStatus;
  have_children: MatrimonyHaveChildren;
  physical_status?: MatrimonyPhysicalStatus;

  // Religion & Community
  religion: string;
  denomination?: string;
  community?: string;
  sub_caste?: string;
  gothra?: string;
  mother_tongue: string;
  languages: string[];

  // Astrology (optional)
  time_of_birth?: string;
  place_of_birth?: string;
  rashi?: string;
  nakshatra?: string;
  manglik?: MatrimonyManglikStatus;

  // Location & Residency
  country: string;
  province: string;
  city: string;
  residency_status: MatrimonyResidencyStatus;
  open_to_relocate: 'yes' | 'no' | 'depends';

  // Education
  qualification: string;
  field_of_study?: string;
  institution?: string;

  // Career
  occupation: string;
  employer?: string;
  industry: string;
  employment_type: MatrimonyEmploymentType;
  work_location?: string;
  income_range: string;

  // Family
  family_type?: MatrimonyFamilyType;
  family_status?: MatrimonyFamilyStatus;
  family_values?: MatrimonyFamilyValues;
  father_occupation?: string;
  mother_occupation?: string;
  siblings_count?: number;
  siblings_married?: number;
  native_place?: string;
  family_about?: string;

  // Lifestyle
  diet: MatrimonyDiet;
  smoking: MatrimonyYesNoOccasionally;
  drinking: MatrimonyYesNoOccasionally;
  hobbies: string[];
  about_me: string;

  // Meta
  completeness_pct: number;
  is_hidden: boolean;
  is_verified_id: boolean;
  is_verified_photo: boolean;
  is_verified_profession: boolean;
  photo_visibility: MatrimonyPhotoVisibility;
  last_active_at: string;
  rejection_reason?: string;
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

// ========== PARTNER PREFERENCES ==========
export interface MatrimonyPreferences {
  id: string;
  profile_id: string;
  age_min: number;
  age_max: number;
  height_min_cm?: number;
  height_max_cm?: number;
  marital_status: string[];
  religion: string[];
  denomination: string[];
  community: string[];
  mother_tongue: string[];
  country?: string;
  province?: string;
  city?: string;
  residency_status: string[];
  education: string[];
  profession: string[];
  income_range?: string;
  diet: string[];
  smoking?: string;
  drinking?: string;
  manglik_pref?: string;
  other_notes?: string;
  created_at: string;
  updated_at: string;
}

// ========== PRIVATE CONTACT ==========
export interface MatrimonyContact {
  id: string;
  profile_id: string;
  phone?: string;
  alt_phone?: string;
  email?: string;
  preferred_method: MatrimonyContactMethod;
  best_time?: string;
}

// ========== MEDIA ==========
export interface MatrimonyMedia {
  id: string;
  profile_id: string;
  type: MatrimonyMediaType;
  url: string;
  is_primary: boolean;
  visibility: MatrimonyPhotoVisibility;
  is_approved: boolean;
  created_at: string;
}

// ========== INTEREST ==========
export interface MatrimonyInterest {
  id: string;
  sender_profile_id: string;
  receiver_profile_id: string;
  status: MatrimonyInterestStatus;
  created_at: string;
  responded_at?: string;
  // Joined fields
  sender_profile?: MatrimonyProfileCard;
  receiver_profile?: MatrimonyProfileCard;
}

// ========== SHORTLIST ==========
export interface MatrimonyShortlist {
  id: string;
  owner_profile_id: string;
  target_profile_id: string;
  created_at: string;
  target_profile?: MatrimonyProfileCard;
}

// ========== PROFILE NOTE ==========
export interface MatrimonyProfileNote {
  id: string;
  author_profile_id: string;
  target_profile_id: string;
  note: string;
  created_at: string;
}

// ========== BLOCK ==========
export interface MatrimonyBlock {
  id: string;
  blocker_profile_id: string;
  blocked_profile_id: string;
  created_at: string;
}

// ========== REPORT ==========
export interface MatrimonyReport {
  id: string;
  reporter_profile_id: string;
  reported_profile_id: string;
  target_type: MatrimonyReportTargetType;
  reason: string;
  details?: string;
  status: MatrimonyReportStatus;
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

// ========== PHOTO REQUEST ==========
export interface MatrimonyPhotoRequest {
  id: string;
  requester_profile_id: string;
  target_profile_id: string;
  status: MatrimonyPhotoRequestStatus;
  created_at: string;
  responded_at?: string;
}

// ========== SAVED SEARCH ==========
export interface MatrimonySavedSearch {
  id: string;
  profile_id: string;
  name: string;
  filters: MatrimonySearchFilters;
  notify: boolean;
  created_at: string;
}

// ========== CONVERSATION & MESSAGES ==========
export interface MatrimonyConversation {
  id: string;
  profile_a_id: string;
  profile_b_id: string;
  last_message_at: string;
  created_at: string;
  // Joined
  other_profile?: MatrimonyProfileCard;
  last_message?: MatrimonyMessage;
  unread_count?: number;
}

export interface MatrimonyMessage {
  id: string;
  conversation_id: string;
  sender_profile_id: string;
  body: string;
  read_at?: string;
  created_at: string;
}

// ========== PROFILE VIEW ==========
export interface MatrimonyProfileView {
  id: string;
  viewer_profile_id: string;
  viewed_profile_id: string;
  created_at: string;
  viewer_profile?: MatrimonyProfileCard;
}

// ========== VERIFICATION ==========
export interface MatrimonyVerification {
  id: string;
  profile_id: string;
  type: MatrimonyVerificationType;
  doc_url: string;
  status: MatrimonyVerificationStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

// ========== SUCCESS STORY ==========
export interface MatrimonySuccessStory {
  id: string;
  profile_id: string;
  partner_profile_id?: string;
  story: string;
  photo_url?: string;
  status: MatrimonySuccessStoryStatus;
  is_public: boolean;
  created_at: string;
}

// ========== ADMIN AUDIT ==========
export interface MatrimonyAdminAudit {
  id: string;
  admin_user_id: string;
  admin_name?: string;
  action: string;
  target_id: string;
  target_type: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// ========== NOTIFICATION ==========
export interface InAppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  is_read: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// ========== CARD VIEW (lightweight for lists) ==========
export interface MatrimonyProfileCard {
  id: string;
  user_id: string;
  full_name: string;
  display_pref: MatrimonyDisplayPref;
  gender: MatrimonyGender;
  dob: string;
  height_cm: number;
  city: string;
  province: string;
  country: string;
  religion: string;
  mother_tongue: string;
  occupation: string;
  qualification: string;
  residency_status: MatrimonyResidencyStatus;
  diet: MatrimonyDiet;
  marital_status: MatrimonyMaritalStatus;
  is_verified_id: boolean;
  is_verified_photo: boolean;
  is_verified_profession: boolean;
  photo_visibility: MatrimonyPhotoVisibility;
  last_active_at: string;
  about_me: string;
  completeness_pct: number;
  status: MatrimonyProfileStatus;
  primary_photo_url?: string;
  match_score?: number;
}

// ========== SEARCH FILTERS ==========
export interface MatrimonySearchFilters {
  gender?: MatrimonyGender;
  age_min?: number;
  age_max?: number;
  height_min_cm?: number;
  height_max_cm?: number;
  marital_status?: string[];
  religion?: string[];
  denomination?: string[];
  community?: string[];
  mother_tongue?: string[];
  country?: string;
  province?: string;
  city?: string;
  residency_status?: string[];
  education?: string[];
  profession?: string[];
  income_range?: string;
  diet?: string[];
  smoking?: string;
  drinking?: string;
  manglik_pref?: string;
  verified_only?: boolean;
  has_photo?: boolean;
  recently_active?: boolean;
  sort_by?: 'newest' | 'recently_active' | 'best_match';
}

// ========== WIZARD STEP DATA ==========
export interface MatrimonyWizardData {
  // Step 1: Personal
  full_name: string;
  display_pref: MatrimonyDisplayPref;
  gender: MatrimonyGender;
  dob: string;
  height_cm: number;
  weight_kg?: number;
  body_type?: string;
  marital_status: MatrimonyMaritalStatus;
  have_children: MatrimonyHaveChildren;
  physical_status?: MatrimonyPhysicalStatus;
  created_by: MatrimonyProfileCreatedBy;

  // Step 2: Religion & Community
  religion: string;
  denomination?: string;
  community?: string;
  sub_caste?: string;
  gothra?: string;
  mother_tongue: string;
  languages: string[];

  // Step 3: Astrology
  time_of_birth?: string;
  place_of_birth?: string;
  rashi?: string;
  nakshatra?: string;
  manglik?: MatrimonyManglikStatus;

  // Step 4: Location & Residency
  country: string;
  province: string;
  city: string;
  residency_status: MatrimonyResidencyStatus;
  open_to_relocate: 'yes' | 'no' | 'depends';

  // Step 5: Education & Career
  qualification: string;
  field_of_study?: string;
  institution?: string;
  occupation: string;
  employer?: string;
  industry: string;
  employment_type: MatrimonyEmploymentType;
  work_location?: string;
  income_range: string;

  // Step 6: Family & Lifestyle
  family_type?: MatrimonyFamilyType;
  family_status?: MatrimonyFamilyStatus;
  family_values?: MatrimonyFamilyValues;
  father_occupation?: string;
  mother_occupation?: string;
  siblings_count?: number;
  siblings_married?: number;
  native_place?: string;
  family_about?: string;
  diet: MatrimonyDiet;
  smoking: MatrimonyYesNoOccasionally;
  drinking: MatrimonyYesNoOccasionally;
  hobbies: string[];

  // Step 7: About & Media
  about_me: string;
  photo_visibility: MatrimonyPhotoVisibility;

  // Step 8: Partner Preferences
  pref_age_min: number;
  pref_age_max: number;
  pref_height_min_cm?: number;
  pref_height_max_cm?: number;
  pref_marital_status: string[];
  pref_religion: string[];
  pref_denomination: string[];
  pref_community: string[];
  pref_mother_tongue: string[];
  pref_country?: string;
  pref_province?: string;
  pref_city?: string;
  pref_residency_status: string[];
  pref_education: string[];
  pref_profession: string[];
  pref_income_range?: string;
  pref_diet: string[];
  pref_smoking?: string;
  pref_drinking?: string;
  pref_manglik?: string;
  pref_other_notes?: string;

  // Contact (private)
  contact_phone?: string;
  contact_alt_phone?: string;
  contact_email?: string;
  contact_preferred_method: MatrimonyContactMethod;
  contact_best_time?: string;

  // Consent
  terms_accepted: boolean;
  age_confirmed: boolean;
}

// ========== ADMIN CONFIG ==========
export interface MatrimonyModuleConfig {
  feature_enabled: boolean;
  members_only: boolean;
  intro_mode: MatrimonyIntroMode;
  re_review_on_edit: boolean;
  daily_interest_limit: number;
  max_photos: number;
  photo_default_visibility: MatrimonyPhotoVisibility;
  enable_astrology: boolean;
  enable_chat: boolean;
  enable_premium: boolean;
}

// ========== ADMIN STATS ==========
export interface MatrimonyAdminStats {
  total_profiles: number;
  pending_profiles: number;
  approved_profiles: number;
  rejected_profiles: number;
  suspended_profiles: number;
  new_this_week: number;
  new_this_month: number;
  active_profiles: number;
  interests_sent: number;
  interests_accepted: number;
  open_reports: number;
  pending_verifications: number;
  success_stories: number;
}
