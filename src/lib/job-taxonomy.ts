/**
 * What a job title tells us, and how well it fits a member.
 *
 * WHY THIS IS DERIVED FROM THE TITLE. The job feed gives us almost nothing to
 * filter on: of the roles currently synced, `employment_type`, `province` and
 * `description_snippet` are 100% empty, `department` is set on 7% and
 * `posted_at` on 7%. Only `title` and `location` are reliably there. A
 * "Full-time / Contract" dropdown built on the column would have been an empty
 * control, so the facets below read the title instead - which is where a feed
 * actually puts this information ("(6 month contract)", "[Hourly]", "Senior",
 * "Remote - Bilingual").
 *
 * ONE definition, used by both sides: the jobs page builds its filter pills and
 * badges from it in the browser, and the server scores suggestions with the
 * same functions. Two copies - one in SQL, one here - would drift, and the
 * drift would show up as a filter that disagrees with the badge next to it.
 *
 * Every regex here was checked against the real titles in the feed rather than
 * imagined; the counts in the tests next to them are from that data.
 */

export type Seniority = 'intern' | 'associate' | 'mid' | 'senior' | 'lead' | 'manager' | 'director';

export const SENIORITY_LABELS: Record<Seniority, string> = {
  intern: 'Student / intern',
  associate: 'Associate / junior',
  mid: 'Mid level',
  senior: 'Senior',
  lead: 'Lead / principal',
  manager: 'Manager',
  director: 'Director / executive',
};

/** Most senior marker wins: "Senior Manager" is a manager role, not a senior IC. */
const SENIORITY_RULES: { key: Seniority; re: RegExp }[] = [
  { key: 'director', re: /\b(director|vice[- ]president|\bvp\b|chief|head of|president)\b/i },
  { key: 'manager', re: /\b(manager|supervisor|superintendent)\b/i },
  { key: 'lead', re: /\b(lead|principal|staff|architect)\b/i },
  { key: 'senior', re: /\b(senior|sr\.?)\b/i },
  { key: 'intern', re: /\b(intern|internship|co[- ]?op|student|new grad|graduate program|trainee|apprentice)\b/i },
  { key: 'associate', re: /\b(associate|assistant|junior|jr\.?|entry[- ]level|\bi{1,2}\b|\b[12]\b)\b/i },
];

export function seniorityOf(title: string): Seniority {
  for (const { key, re } of SENIORITY_RULES) if (re.test(title)) return key;
  return 'mid';
}

/**
 * The band a member's own experience puts them in.
 *
 * Handles the EN DASH as well as the hyphen: the signup wizard has shipped both
 * ("3-5 years" and "3–5 years" are both in the table), and matching only the
 * hyphen silently dropped those members' seniority signal.
 */
export function seniorityFromExperience(range: string | null | undefined): Seniority | null {
  if (!range) return null;
  const first = range.replace(/[‒-―]/g, '-').match(/\d+/);
  if (!first) return null;
  const years = Number(first[0]);
  if (!Number.isFinite(years)) return null;
  if (years < 1) return 'intern';
  if (years < 3) return 'associate';
  if (years < 6) return 'mid';
  if (years < 10) return 'senior';
  return 'lead';
}

/** How far apart two bands are, for partial credit on a near miss. */
const SENIORITY_ORDER: Seniority[] = ['intern', 'associate', 'mid', 'senior', 'lead', 'manager', 'director'];
const seniorityGap = (a: Seniority, b: Seniority) =>
  Math.abs(SENIORITY_ORDER.indexOf(a) - SENIORITY_ORDER.indexOf(b));

export type FamilyKey =
  | 'finance' | 'client_service' | 'advisory' | 'data' | 'technology' | 'sales'
  | 'risk' | 'operations' | 'people' | 'marketing' | 'legal' | 'health' | 'trades' | 'education';

export const FAMILIES: { key: FamilyKey; label: string; re: RegExp }[] = [
  { key: 'finance', label: 'Finance & banking', re: /\b(financial|finance|bank|banking|mortgage|lending|credit|investment|wealth|treasury|tax|accountant|accounting|payroll|teller|underwrit\w*)\b/i },
  { key: 'client_service', label: 'Client service', re: /\b(client|customer|service representative|contact centre|contact center|call centre|call center|servicing|concierge|reception\w*|support representative)\b/i },
  // "Specialist" deliberately absent: it is a title suffix, not a field, and
  // including it filed "Marketing Specialist" under advisory alongside
  // "Financial Advisor" - which is exactly the suggestion nobody wants.
  { key: 'advisory', label: 'Advisory & consulting', re: /\b(advisor|adviser|consultant|consulting|planner)\b/i },
  { key: 'data', label: 'Data & analytics', re: /\b(data|analytics|analyst|scientist|reporting|insights?|business intelligence|\bbi\b|statistic\w*)\b/i },
  { key: 'technology', label: 'Technology', re: /\b(engineer|engineering|developer|software|technology|\bit\b|cloud|devops|architect|cyber|security engineer|\bqa\b|quality assurance|tester|programmer|technician|network|database|full[- ]?stack|frontend|backend)\b/i },
  { key: 'sales', label: 'Sales & business development', re: /\b(sales|business development|account executive|account manager|relationship manager|commission|broker|realtor|retail associate)\b/i },
  { key: 'risk', label: 'Risk, audit & compliance', re: /\b(risk|audit|auditor|compliance|regulatory|fraud|\baml\b|governance|controls?)\b/i },
  { key: 'operations', label: 'Operations & admin', re: /\b(operations|process|logistics|supply chain|warehouse|facilit\w*|administrative|admin|coordinator|clerk|dispatch\w*|procurement|scheduler)\b/i },
  { key: 'people', label: 'People & HR', re: /\b(human resources|\bhr\b|talent|recruit\w*|people partner|training|learning)\b/i },
  { key: 'marketing', label: 'Marketing & communications', re: /\b(marketing|brand|communications|content|social media|copywriter|designer|creative|public relations)\b/i },
  { key: 'legal', label: 'Legal', re: /\b(legal|counsel|paralegal|solicitor|attorney|notary)\b/i },
  { key: 'health', label: 'Healthcare', re: /\b(nurse|nursing|\brn\b|\brpn\b|clinical|clinic|health|medical|pharmac\w*|dental|therapist|care aide|personal support worker|\bpsw\b|physician|caregiver)\b/i },
  { key: 'trades', label: 'Skilled trades & driving', re: /\b(driver|drivers|technician|electrician|plumber|welder|mechanic|carpenter|machinist|installer|operator|labourer|laborer|construction|forklift)\b/i },
  { key: 'education', label: 'Education', re: /\b(teacher|tutor|instructor|professor|educator|early childhood|\bece\b|lecturer)\b/i },
];

const FAMILY_LABEL = new Map(FAMILIES.map((f) => [f.key, f.label]));
export const familyLabel = (key: string): string => FAMILY_LABEL.get(key as FamilyKey) ?? key;

/** A title can sit in more than one family - "Financial Data Analyst" is both. */
export function familiesOf(text: string): FamilyKey[] {
  return FAMILIES.filter((f) => f.re.test(text)).map((f) => f.key);
}

export type EmploymentType = 'permanent' | 'contract' | 'part_time';

export const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  permanent: 'Permanent',
  contract: 'Contract / term',
  part_time: 'Part time / hourly',
};

export function employmentTypeOf(title: string): EmploymentType {
  if (/\b(part[- ]?time|hourly|casual|seasonal)\b/i.test(title)) return 'part_time';
  if (/\b(contract|contractor|temporary|temp|term|fixed[- ]term|\d+\s*month)\b/i.test(title)) return 'contract';
  return 'permanent';
}

export type Arrangement = 'onsite' | 'hybrid' | 'remote';

export const ARRANGEMENT_LABELS: Record<Arrangement, string> = {
  onsite: 'On site',
  hybrid: 'Hybrid',
  remote: 'Remote',
};

export function arrangementOf(title: string, location: string | null): Arrangement {
  const both = `${title} ${location ?? ''}`;
  if (/\b(remote|work from home|\bwfh\b|virtual)\b/i.test(both)) return 'remote';
  if (/\bhybrid\b/i.test(both)) return 'hybrid';
  return 'onsite';
}

/**
 * Languages a posting names. Worth a filter in this club specifically: a role
 * that asks for Mandarin or Punjabi is an advantage for the member, not a
 * barrier, and those postings are hard to find by scrolling.
 */
const LANGUAGES: { key: string; label: string; re: RegExp }[] = [
  { key: 'bilingual', label: 'Bilingual (FR/EN)', re: /\b(bilingual|bilingue|french|francais)\b/i },
  { key: 'mandarin', label: 'Mandarin', re: /\bmandarin\b/i },
  { key: 'cantonese', label: 'Cantonese', re: /\bcantonese\b/i },
  { key: 'punjabi', label: 'Punjabi', re: /\bpunjabi\b/i },
  { key: 'hindi', label: 'Hindi', re: /\bhindi\b/i },
  { key: 'spanish', label: 'Spanish', re: /\bspanish\b/i },
  { key: 'arabic', label: 'Arabic', re: /\barabic\b/i },
];

const LANGUAGE_LABEL = new Map(LANGUAGES.map((l) => [l.key, l.label]));
export const languageLabel = (key: string): string => LANGUAGE_LABEL.get(key) ?? key;

export function languagesOf(title: string): string[] {
  return LANGUAGES.filter((l) => l.re.test(title)).map((l) => l.key);
}

/** Everything derivable about one role, computed once per row. */
export interface JobFacets {
  seniority: Seniority;
  families: FamilyKey[];
  employment: EmploymentType;
  arrangement: Arrangement;
  languages: string[];
}

export function facetsOf(title: string, location: string | null): JobFacets {
  return {
    seniority: seniorityOf(title),
    families: familiesOf(title),
    employment: employmentTypeOf(title),
    arrangement: arrangementOf(title, location),
    languages: languagesOf(title),
  };
}

// ---------------------------------------------------------------- matching

/**
 * Words that carry no signal when comparing a member's title to a role's.
 * Seniority words are excluded deliberately: they are scored separately, and
 * counting them as a title match made every "Senior X" look like a fit for
 * every "Senior Y".
 */
const STOPWORDS = new Set([
  'and', 'the', 'for', 'with', 'our', 'you', 'your', 'new', 'per', 'via', 'inc',
  'ltd', 'llp', 'team', 'role', 'job', 'jobs', 'career', 'careers', 'time',
  'full', 'part', 'hourly', 'remote', 'hybrid', 'onsite', 'urban', 'only',
  'senior', 'junior', 'associate', 'assistant', 'lead', 'principal', 'staff',
  'manager', 'director', 'intern', 'student', 'graduate', 'trainee', 'chief',
  'vice', 'president', 'head', 'supervisor', 'month', 'months', 'contract',
  'permanent', 'temporary', 'bilingual', 'canada', 'canadian',
]);

/**
 * Job-title SUFFIXES rather than subject matter. They are not stopwords - a
 * member really is a "Specialist" - but they say nothing about the field, and
 * treating them as a match made "Marketing Specialist" a suggestion for
 * "Mortgage Specialist". They earn a fraction of the credit and never on their
 * own justify a suggestion.
 */
const GENERIC_ROLE_WORDS = new Set([
  'specialist', 'representative', 'representatives', 'consultant', 'advisor',
  'adviser', 'officer', 'agent', 'coordinator', 'administrator', 'generalist',
  'partner', 'professional', 'clerk', 'executive', 'operations', 'services',
  'service', 'support', 'general', 'business', 'senior', 'reviewer',
]);

export const isGenericRoleWord = (token: string): boolean => GENERIC_ROLE_WORDS.has(token);

export function meaningfulTokens(text: string | null | undefined): string[] {
  if (!text) return [];
  return [
    ...new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9+#. ]+/g, ' ')
        .split(/\s+/)
        .map((w) => w.replace(/\.$/, ''))
        .filter((w) => w.length > 2 && !STOPWORDS.has(w))
    ),
  ];
}

/** The parts of a member's profile that say anything about what work suits them. */
export interface MatchProfile {
  jobTitle?: string | null;
  previousJobTitle?: string | null;
  professionalCategory?: string | null;
  industry?: string | null;
  fieldOfStudy?: string | null;
  skills?: string | null;
  experienceRange?: string | null;
  city?: string | null;
}

export interface JobLike {
  title: string;
  location?: string | null;
  postedAt?: string | null;
  /** Whether anyone at that employer has offered to refer. */
  helperCount?: number;
}

export interface MatchResult {
  score: number;
  /** Plain-language reasons, shown in the UI - a score alone explains nothing. */
  reasons: string[];
  /** A subject-matter hit: a real title word, a skill, or past work. */
  strong: boolean;
  /** Same field AND a level that fits - the weaker way in. */
  fieldAndLevel: boolean;
}

/**
 * How well one role fits one member, 0 upwards.
 *
 * Weighted by which profile fields members ACTUALLY fill in: job_title is set
 * on nearly every profile and is the strongest signal, industry is common,
 * skills and professional_category are almost never set - so the score leans on
 * the title and treats the rest as bonuses rather than requirements.
 *
 * `reasons` is the point as much as the number: a member who is told "matches
 * your role: analyst" can judge the suggestion themselves, and a suggestion
 * with no reason to give should not be made at all (see suggestionsFor).
 */
export function scoreJob(job: JobLike, profile: MatchProfile): MatchResult {
  const reasons: string[] = [];
  let score = 0;

  const titleTokens = new Set(meaningfulTokens(job.title));
  const myTitleTokens = meaningfulTokens(profile.jobTitle);
  const myPastTokens = meaningfulTokens(profile.previousJobTitle);

  // Subject-matter words carry the match; title suffixes get a token amount.
  const allHits = myTitleTokens.filter((t) => titleTokens.has(t));
  const strongHits = allHits.filter((t) => !isGenericRoleWord(t));
  const weakHits = allHits.filter((t) => isGenericRoleWord(t));

  if (strongHits.length > 0) {
    score += Math.min(0.5, 0.28 * strongHits.length);
    reasons.push(`Matches your role: ${strongHits.slice(0, 2).join(', ')}`);
  } else {
    const pastStrong = myPastTokens.filter((t) => titleTokens.has(t) && !isGenericRoleWord(t));
    if (pastStrong.length > 0) {
      score += Math.min(0.28, 0.16 * pastStrong.length);
      reasons.push(`Close to your past work: ${pastStrong.slice(0, 2).join(', ')}`);
    }
  }
  if (weakHits.length > 0) score += 0.05;

  // Field overlap. A member's industry and category are matched through the
  // same family map as the role, so "Banking" meets "Financial Advisor".
  const jobFamilies = new Set(familiesOf(job.title));
  const myFamilies = new Set([
    ...familiesOf(profile.jobTitle ?? ''),
    ...familiesOf(profile.professionalCategory ?? ''),
    ...familiesOf(profile.industry ?? ''),
    ...familiesOf(profile.fieldOfStudy ?? ''),
  ]);
  const sharedFamily = [...myFamilies].find((f) => jobFamilies.has(f));
  if (sharedFamily) {
    score += 0.24;
    reasons.push(`In your field: ${familyLabel(sharedFamily)}`);
  }
  const mySeniorityBand = seniorityFromExperience(profile.experienceRange);
  const levelFits = mySeniorityBand !== null
    && seniorityGap(mySeniorityBand, seniorityOf(job.title)) <= 1;

  const skillHits = meaningfulTokens(profile.skills).filter((s) => titleTokens.has(s));
  if (skillHits.length > 0) {
    score += Math.min(0.2, 0.1 * skillHits.length);
    reasons.push(`Uses your skills: ${skillHits.slice(0, 2).join(', ')}`);
  }

  if (mySeniorityBand) {
    const gap = seniorityGap(mySeniorityBand, seniorityOf(job.title));
    if (gap === 0) {
      score += 0.16;
      reasons.push(`Right level for ${profile.experienceRange} of experience`);
    } else if (gap === 1) {
      score += 0.07;
    }
  }

  if (profile.city && job.location && job.location.toLowerCase().includes(profile.city.toLowerCase())) {
    score += 0.12;
    reasons.push(`In ${profile.city}`);
  }

  if (job.postedAt) {
    const days = (Date.now() - new Date(job.postedAt).getTime()) / 86_400_000;
    if (Number.isFinite(days) && days >= 0 && days <= 30) score += 0.05;
  }

  // A role at an employer where someone has offered to refer is worth more to
  // this member than an identical role they can only apply to cold.
  if ((job.helperCount ?? 0) > 0) {
    score += 0.08;
    reasons.push('Someone here can refer you');
  }

  return {
    score: Math.round(score * 100) / 100,
    reasons,
    strong: strongHits.length > 0 || skillHits.length > 0
      || reasons.some((r) => r.startsWith('Close to your past work')),
    fieldAndLevel: Boolean(sharedFamily) && levelFits,
  };
}

/**
 * The suggestion threshold. A role only qualifies if something concrete lines
 * up - a title word, the member's field, or their skills - never on level and
 * city alone. Without this a Registered Nurse was shown "Financial Advisor"
 * because both are in Toronto and both suit six years' experience, which is
 * worse than showing nothing.
 */
export function isSuggestable(m: MatchResult): boolean {
  return m.score >= 0.3 && (m.strong || m.fieldAndLevel);
}

/** True when a profile carries enough to match on at all. */
export function canMatch(profile: MatchProfile): boolean {
  return Boolean(
    profile.jobTitle?.trim()
    || profile.previousJobTitle?.trim()
    || profile.professionalCategory?.trim()
    || profile.industry?.trim()
    || profile.fieldOfStudy?.trim()
  );
}
