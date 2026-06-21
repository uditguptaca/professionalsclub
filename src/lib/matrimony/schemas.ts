import { z } from 'zod';

// ========== STEP 1: Personal Details ==========
export const personalSchema = z.object({
  full_name: z.string().min(2, 'Full name is required').max(100),
  display_pref: z.enum(['full_name', 'first_name', 'initials']),
  gender: z.enum(['male', 'female', 'other']),
  dob: z.string().min(1, 'Date of birth is required').refine((val) => {
    const dob = new Date(val);
    const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    return age >= 18;
  }, { message: 'You must be at least 18 years old' }),
  height_cm: z.number().min(120, 'Height must be at least 120 cm').max(220, 'Height must be at most 220 cm'),
  weight_kg: z.number().min(30).max(200).optional(),
  body_type: z.string().optional(),
  marital_status: z.enum(['never_married', 'divorced', 'widowed', 'awaiting_divorce', 'separated']),
  have_children: z.enum(['yes_living_together', 'yes_not_living_together', 'no']),
  physical_status: z.enum(['normal', 'differently_abled']).optional(),
  created_by: z.enum(['self', 'parent', 'sibling', 'relative', 'friend', 'guardian']),
});

// ========== STEP 2: Religion & Community ==========
export const religionSchema = z.object({
  religion: z.string().min(1, 'Religion is required'),
  denomination: z.string().optional(),
  community: z.string().optional(),
  sub_caste: z.string().optional(),
  gothra: z.string().optional(),
  mother_tongue: z.string().min(1, 'Mother tongue is required'),
  languages: z.array(z.string()).min(1, 'Select at least one language'),
});

// ========== STEP 3: Astrology (optional) ==========
export const astrologySchema = z.object({
  time_of_birth: z.string().optional(),
  place_of_birth: z.string().optional(),
  rashi: z.string().optional(),
  nakshatra: z.string().optional(),
  manglik: z.enum(['yes', 'no', 'dont_know']).optional(),
});

// ========== STEP 4: Location & Residency ==========
export const locationSchema = z.object({
  country: z.string().min(1, 'Country is required'),
  province: z.string().min(1, 'Province/State is required'),
  city: z.string().min(1, 'City is required'),
  residency_status: z.enum(['citizen', 'pr', 'work_permit', 'study_permit', 'visitor', 'other']),
  open_to_relocate: z.enum(['yes', 'no', 'depends']),
});

// ========== STEP 5: Education & Career ==========
export const careerSchema = z.object({
  qualification: z.string().min(1, 'Qualification is required'),
  field_of_study: z.string().optional(),
  institution: z.string().optional(),
  occupation: z.string().min(1, 'Occupation is required'),
  employer: z.string().optional(),
  industry: z.string().min(1, 'Industry is required'),
  employment_type: z.enum(['full_time', 'part_time', 'self_employed', 'business', 'student', 'not_working']),
  work_location: z.string().optional(),
  income_range: z.string().min(1, 'Income range is required'),
});

// ========== STEP 6: Family & Lifestyle ==========
export const familySchema = z.object({
  family_type: z.enum(['nuclear', 'joint']).optional(),
  family_status: z.enum(['middle', 'upper_middle', 'affluent', 'rich']).optional(),
  family_values: z.enum(['traditional', 'moderate', 'liberal']).optional(),
  father_occupation: z.string().optional(),
  mother_occupation: z.string().optional(),
  siblings_count: z.number().min(0).max(20).optional(),
  siblings_married: z.number().min(0).max(20).optional(),
  native_place: z.string().optional(),
  family_about: z.string().max(1000).optional(),
  diet: z.enum(['veg', 'non_veg', 'eggetarian', 'vegan', 'jain']),
  smoking: z.enum(['no', 'occasionally', 'yes']),
  drinking: z.enum(['no', 'occasionally', 'yes']),
  hobbies: z.array(z.string()),
});

// ========== STEP 7: About & Media ==========
export const aboutSchema = z.object({
  about_me: z.string().min(50, 'Please write at least 50 characters').max(2000, 'Maximum 2000 characters'),
  photo_visibility: z.enum(['all', 'on_request', 'blurred']),
});

// ========== STEP 8: Partner Preferences ==========
export const preferencesSchema = z.object({
  pref_age_min: z.number().min(18).max(70),
  pref_age_max: z.number().min(18).max(70),
  pref_height_min_cm: z.number().min(120).max(220).optional(),
  pref_height_max_cm: z.number().min(120).max(220).optional(),
  pref_marital_status: z.array(z.string()),
  pref_religion: z.array(z.string()),
  pref_denomination: z.array(z.string()),
  pref_community: z.array(z.string()),
  pref_mother_tongue: z.array(z.string()),
  pref_country: z.string().optional(),
  pref_province: z.string().optional(),
  pref_city: z.string().optional(),
  pref_residency_status: z.array(z.string()),
  pref_education: z.array(z.string()),
  pref_profession: z.array(z.string()),
  pref_income_range: z.string().optional(),
  pref_diet: z.array(z.string()),
  pref_smoking: z.string().optional(),
  pref_drinking: z.string().optional(),
  pref_manglik: z.string().optional(),
  pref_other_notes: z.string().max(500).optional(),
}).refine(data => data.pref_age_max >= data.pref_age_min, {
  message: 'Max age must be greater than or equal to min age',
  path: ['pref_age_max'],
});

// ========== Contact ==========
export const contactSchema = z.object({
  contact_phone: z.string().optional(),
  contact_alt_phone: z.string().optional(),
  contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
  contact_preferred_method: z.enum(['email', 'phone', 'whatsapp']),
  contact_best_time: z.string().optional(),
});

// ========== Consent ==========
export const consentSchema = z.object({
  terms_accepted: z.boolean().refine(v => v === true, 'You must accept the terms'),
  age_confirmed: z.boolean().refine(v => v === true, 'You must confirm you are 18+'),
});

// ========== Search Filters ==========
export const searchFiltersSchema = z.object({
  gender: z.enum(['male', 'female', 'other']).optional(),
  age_min: z.number().min(18).max(70).optional(),
  age_max: z.number().min(18).max(70).optional(),
  height_min_cm: z.number().optional(),
  height_max_cm: z.number().optional(),
  marital_status: z.array(z.string()).optional(),
  religion: z.array(z.string()).optional(),
  denomination: z.array(z.string()).optional(),
  community: z.array(z.string()).optional(),
  mother_tongue: z.array(z.string()).optional(),
  country: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  residency_status: z.array(z.string()).optional(),
  education: z.array(z.string()).optional(),
  profession: z.array(z.string()).optional(),
  income_range: z.string().optional(),
  diet: z.array(z.string()).optional(),
  smoking: z.string().optional(),
  drinking: z.string().optional(),
  manglik_pref: z.string().optional(),
  verified_only: z.boolean().optional(),
  has_photo: z.boolean().optional(),
  recently_active: z.boolean().optional(),
  sort_by: z.enum(['newest', 'recently_active', 'best_match']).optional(),
});

// ========== Report ==========
export const reportSchema = z.object({
  reason: z.string().min(1, 'Please select a reason'),
  details: z.string().max(1000).optional(),
});

// ========== Success Story ==========
export const successStorySchema = z.object({
  couple_names: z.string().min(2, 'Names are required'),
  story: z.string().min(50, 'Please write at least 50 characters').max(3000),
  photo_url: z.string().optional(),
});

// ========== STEP VALIDATORS ==========
export const STEP_SCHEMAS = [
  personalSchema,
  religionSchema,
  astrologySchema,
  locationSchema,
  careerSchema,
  familySchema,
  aboutSchema,
  preferencesSchema,
] as const;

export type StepSchemaType = typeof STEP_SCHEMAS[number];
