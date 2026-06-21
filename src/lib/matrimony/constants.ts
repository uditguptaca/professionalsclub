// ========== MATRIMONY CONSTANTS ==========
// All dropdown option lists for the matrimony module

export const RELIGIONS = [
  'Hindu', 'Sikh', 'Muslim', 'Christian', 'Jain', 'Buddhist',
  'Parsi/Zoroastrian', 'Jewish', 'Spiritual', 'No Religion', 'Other',
] as const;

export const DENOMINATIONS: Record<string, string[]> = {
  Hindu: ['Brahmin', 'Kshatriya', 'Vaishya', 'Other'],
  Sikh: ['Jat', 'Khatri', 'Arora', 'Ramgarhia', 'Saini', 'Other'],
  Muslim: ['Sunni', 'Shia', 'Ahmadiyya', 'Other'],
  Christian: ['Catholic', 'Protestant', 'Orthodox', 'Evangelical', 'Other'],
  Jain: ['Digambara', 'Shwetambara', 'Other'],
  Buddhist: ['Theravada', 'Mahayana', 'Vajrayana', 'Other'],
};

export const COMMUNITIES = [
  'Punjabi', 'Gujarati', 'Tamil', 'Telugu', 'Malayalam', 'Kannada',
  'Bengali', 'Marathi', 'Rajasthani', 'Sindhi', 'Bihari', 'Odia',
  'Assamese', 'Kashmiri', 'Konkani', 'Coorgi', 'Tulu', 'Naga',
  'Manipuri', 'Garhwali', 'Kumaoni', 'Bhojpuri', 'Maithili',
  'Anglo-Indian', 'Marwari', "Doesn't Matter", 'Other',
] as const;

export const MOTHER_TONGUES = [
  'Hindi', 'Punjabi', 'Gujarati', 'Tamil', 'Telugu', 'Malayalam',
  'Kannada', 'Bengali', 'Marathi', 'Urdu', 'Odia', 'Assamese',
  'Sindhi', 'Kashmiri', 'Konkani', 'Nepali', 'Dogri', 'Maithili',
  'Bodo', 'Santhali', 'English', 'French', 'Other',
] as const;

export const LANGUAGES = [
  'Hindi', 'English', 'Punjabi', 'Gujarati', 'Tamil', 'Telugu',
  'Malayalam', 'Kannada', 'Bengali', 'Marathi', 'Urdu', 'French',
  'Odia', 'Assamese', 'Sindhi', 'Arabic', 'Mandarin', 'Other',
] as const;

export const COUNTRIES = [
  'Canada', 'India', 'United States', 'United Kingdom', 'Australia',
  'United Arab Emirates', 'Singapore', 'New Zealand', 'Germany', 'Other',
] as const;

export const CANADIAN_PROVINCES = [
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick',
  'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia',
  'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec',
  'Saskatchewan', 'Yukon',
] as const;

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Chandigarh', 'Jammu and Kashmir', 'Ladakh',
] as const;

export const QUALIFICATIONS = [
  'High School', 'Diploma', "Bachelor's Degree", "Master's Degree",
  'Doctorate / PhD', 'Professional Degree (MD, JD, CA, etc.)',
  'Trade Certificate', 'Post-Graduate Diploma', 'Other',
] as const;

export const FIELDS_OF_STUDY = [
  'Engineering / Technology', 'Computer Science / IT', 'Medicine / Health Sciences',
  'Business / MBA', 'Commerce / Accounting', 'Law',
  'Arts / Humanities', 'Science', 'Education',
  'Architecture / Design', 'Agriculture', 'Pharmacy',
  'Nursing', 'Dental', 'Media / Journalism',
  'Hospitality / Tourism', 'Social Work', 'Other',
] as const;

export const INDUSTRIES = [
  'Information Technology', 'Healthcare / Medical', 'Finance / Banking',
  'Engineering', 'Education / Academia', 'Government / Public Sector',
  'Manufacturing', 'Consulting', 'Real Estate',
  'Legal', 'Media / Entertainment', 'Retail / E-Commerce',
  'Hospitality / Food', 'Transportation / Logistics', 'Agriculture',
  'Non-Profit / NGO', 'Telecom', 'Energy / Utilities',
  'Insurance', 'Pharmaceutical', 'Construction', 'Other',
] as const;

export const OCCUPATIONS = [
  'Software Engineer / Developer', 'Doctor / Physician', 'Engineer',
  'Accountant / CPA', 'Teacher / Professor', 'Business Analyst',
  'Manager / Director', 'Nurse', 'Lawyer / Advocate',
  'Architect', 'Designer', 'Data Scientist / Analyst',
  'Entrepreneur / Business Owner', 'Consultant', 'Civil Servant',
  'Pharmacist', 'Dentist', 'Scientist / Researcher',
  'Project Manager', 'Marketing Professional', 'HR Professional',
  'Sales Professional', 'Financial Analyst', 'Student',
  'Homemaker', 'Other',
] as const;

export const INCOME_RANGES = [
  'Prefer not to say',
  'Below $30,000 CAD',
  '$30,000 - $50,000 CAD',
  '$50,000 - $75,000 CAD',
  '$75,000 - $100,000 CAD',
  '$100,000 - $150,000 CAD',
  '$150,000 - $200,000 CAD',
  '$200,000 - $300,000 CAD',
  'Above $300,000 CAD',
] as const;

export const BODY_TYPES = [
  'Slim', 'Athletic', 'Average', 'Heavy', 'Prefer not to say',
] as const;

export const HEIGHT_OPTIONS = (() => {
  const options: { label: string; value: number }[] = [];
  for (let ft = 4; ft <= 7; ft++) {
    for (let inch = 0; inch <= 11; inch++) {
      const cm = Math.round((ft * 12 + inch) * 2.54);
      if (cm >= 120 && cm <= 220) {
        options.push({ label: `${ft}'${inch}" (${cm} cm)`, value: cm });
      }
    }
  }
  return options;
})();

export const RASHIS = [
  'Aries (Mesha)', 'Taurus (Vrishabha)', 'Gemini (Mithuna)',
  'Cancer (Karka)', 'Leo (Simha)', 'Virgo (Kanya)',
  'Libra (Tula)', 'Scorpio (Vrishchika)', 'Sagittarius (Dhanu)',
  'Capricorn (Makara)', 'Aquarius (Kumbha)', 'Pisces (Meena)',
] as const;

export const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Moola', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
] as const;

export const HOBBIES = [
  'Reading', 'Travelling', 'Cooking', 'Music', 'Dancing', 'Sports',
  'Yoga / Meditation', 'Photography', 'Gaming', 'Movies / TV',
  'Art / Painting', 'Writing', 'Gardening', 'Hiking / Outdoors',
  'Fitness / Gym', 'Singing', 'Swimming', 'Cycling',
  'Volunteering', 'Learning Languages', 'Board Games',
  'Technology / Coding', 'Fashion', 'Animal Lover', 'Podcast',
] as const;

export const REJECTION_REASON_PRESETS = [
  'Incomplete information — please fill all required fields',
  'Unclear or inappropriate photos',
  'Suspected fake or duplicate profile',
  'Mismatched or inconsistent details',
  'Policy violation — inappropriate content',
  'Under 18 — not eligible',
] as const;

export const REPORT_REASON_PRESETS = [
  'Fake / scam profile',
  'Inappropriate photos',
  'Harassment / abusive language',
  'Married / already committed',
  'Asking for money',
  'Underage',
  'Spam / commercial profile',
  'Other',
] as const;

// ========== WIZARD STEPS ==========
export const WIZARD_STEPS = [
  { id: 'personal', label: 'Personal Details', icon: 'User' },
  { id: 'religion', label: 'Religion & Community', icon: 'Heart' },
  { id: 'astrology', label: 'Astrology', icon: 'Star' },
  { id: 'location', label: 'Location & Residency', icon: 'MapPin' },
  { id: 'career', label: 'Education & Career', icon: 'Briefcase' },
  { id: 'family', label: 'Family & Lifestyle', icon: 'Users' },
  { id: 'about', label: 'About & Media', icon: 'Camera' },
  { id: 'preferences', label: 'Partner Preferences', icon: 'Search' },
] as const;

// ========== COMPLETENESS WEIGHTS ==========
export const COMPLETENESS_WEIGHTS: Record<string, number> = {
  full_name: 5,
  gender: 5,
  dob: 5,
  height_cm: 3,
  marital_status: 5,
  religion: 5,
  mother_tongue: 4,
  country: 4,
  province: 4,
  city: 4,
  residency_status: 5,
  qualification: 5,
  occupation: 5,
  industry: 3,
  income_range: 3,
  diet: 3,
  about_me: 10,
  photo: 15,
  preferences: 10,
  contact: 5,
  family_about: 4,
};

// ========== FEATURE FLAG HELPER ==========
export const isMatrimonyEnabled = (): boolean => {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_FEATURE_MATRIMONY !== 'false';
  }
  return process.env.NEXT_PUBLIC_FEATURE_MATRIMONY !== 'false';
};
