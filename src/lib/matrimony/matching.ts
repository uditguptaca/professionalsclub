import type { MatrimonyProfile, MatrimonyPreferences, MatrimonyProfileCard } from '@/types/matrimony';

// ========== MATCH SCORING ENGINE ==========
// Computes a 0-100 match score between a viewer's preferences and a candidate profile.

interface MatchWeights {
  religion: number;
  community: number;
  location: number;
  age: number;
  height: number;
  education: number;
  diet: number;
  residency: number;
  marital_status: number;
  mother_tongue: number;
  smoking: number;
  drinking: number;
  manglik: number;
}

const DEFAULT_WEIGHTS: MatchWeights = {
  religion: 15,
  community: 10,
  location: 12,
  age: 12,
  height: 5,
  education: 8,
  diet: 8,
  residency: 8,
  marital_status: 8,
  mother_tongue: 6,
  smoking: 3,
  drinking: 3,
  manglik: 2,
};

function getAge(dob: string): number {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function arrayMatch(prefArray: string[] | undefined, candidateValue: string | undefined): boolean {
  if (!prefArray || prefArray.length === 0) return true; // "Doesn't matter"
  if (!candidateValue) return false;
  return prefArray.some(p => 
    p.toLowerCase() === candidateValue.toLowerCase() || 
    p === "Doesn't Matter" ||
    p === "doesn't_matter"
  );
}

function rangeMatch(min: number | undefined, max: number | undefined, value: number | undefined): number {
  if (min === undefined && max === undefined) return 1; // "Doesn't matter"
  if (value === undefined) return 0.5; // Unknown value, partial score
  if (min !== undefined && max !== undefined) {
    if (value >= min && value <= max) return 1;
    // Partial score for close matches
    const range = max - min;
    if (range === 0) return value === min ? 1 : 0;
    const distance = value < min ? min - value : value - max;
    const penalty = Math.min(distance / Math.max(range * 0.5, 1), 1);
    return Math.max(0, 1 - penalty);
  }
  if (min !== undefined) return value >= min ? 1 : 0.5;
  if (max !== undefined) return value <= max ? 1 : 0.5;
  return 0.5;
}

function stringMatch(pref: string | undefined, candidateValue: string | undefined): boolean {
  if (!pref || pref === '' || pref === "Doesn't matter") return true;
  if (!candidateValue) return false;
  return pref.toLowerCase() === candidateValue.toLowerCase();
}

export function computeMatchScore(
  preferences: MatrimonyPreferences,
  candidate: MatrimonyProfile | MatrimonyProfileCard,
  weights: MatchWeights = DEFAULT_WEIGHTS
): number {
  let totalWeight = 0;
  let totalScore = 0;

  // Religion
  totalWeight += weights.religion;
  totalScore += arrayMatch(preferences.religion, candidate.religion) ? weights.religion : 0;

  // Community
  totalWeight += weights.community;
  totalScore += arrayMatch(preferences.community, 'community' in candidate ? (candidate as MatrimonyProfile).community || '' : '') ? weights.community : 0;

  // Location (city + province)
  totalWeight += weights.location;
  const cityMatch = stringMatch(preferences.city, candidate.city);
  const provMatch = stringMatch(preferences.province, candidate.province);
  const countryMatch = stringMatch(preferences.country, candidate.country);
  if (cityMatch) totalScore += weights.location;
  else if (provMatch) totalScore += weights.location * 0.7;
  else if (countryMatch) totalScore += weights.location * 0.4;

  // Age
  totalWeight += weights.age;
  const candidateAge = getAge(candidate.dob);
  totalScore += rangeMatch(preferences.age_min, preferences.age_max, candidateAge) * weights.age;

  // Height
  totalWeight += weights.height;
  totalScore += rangeMatch(preferences.height_min_cm, preferences.height_max_cm, candidate.height_cm) * weights.height;

  // Education
  totalWeight += weights.education;
  totalScore += arrayMatch(preferences.education, candidate.qualification) ? weights.education : 0;

  // Diet
  totalWeight += weights.diet;
  totalScore += arrayMatch(preferences.diet, candidate.diet) ? weights.diet : 0;

  // Residency Status
  totalWeight += weights.residency;
  totalScore += arrayMatch(preferences.residency_status, candidate.residency_status) ? weights.residency : 0;

  // Marital Status
  totalWeight += weights.marital_status;
  totalScore += arrayMatch(preferences.marital_status, candidate.marital_status) ? weights.marital_status : 0;

  // Mother Tongue
  totalWeight += weights.mother_tongue;
  totalScore += arrayMatch(preferences.mother_tongue, candidate.mother_tongue) ? weights.mother_tongue : 0;

  // Smoking
  if (preferences.smoking && preferences.smoking !== "Doesn't matter") {
    totalWeight += weights.smoking;
    const cSmoke = 'smoking' in candidate ? (candidate as MatrimonyProfile).smoking : undefined;
    totalScore += stringMatch(preferences.smoking, cSmoke) ? weights.smoking : 0;
  }

  // Drinking
  if (preferences.drinking && preferences.drinking !== "Doesn't matter") {
    totalWeight += weights.drinking;
    const cDrink = 'drinking' in candidate ? (candidate as MatrimonyProfile).drinking : undefined;
    totalScore += stringMatch(preferences.drinking, cDrink) ? weights.drinking : 0;
  }

  // Manglik
  if (preferences.manglik_pref && preferences.manglik_pref !== "Doesn't matter") {
    totalWeight += weights.manglik;
    const cManglik = 'manglik' in candidate ? (candidate as MatrimonyProfile).manglik : undefined;
    totalScore += stringMatch(preferences.manglik_pref, cManglik) ? weights.manglik : 0;
  }

  if (totalWeight === 0) return 50; // No preferences set
  return Math.round((totalScore / totalWeight) * 100);
}

// Check if candidate matches viewer's preferences (returns true if score >= threshold)
export function isMatch(
  preferences: MatrimonyPreferences,
  candidate: MatrimonyProfile | MatrimonyProfileCard,
  threshold: number = 50
): boolean {
  return computeMatchScore(preferences, candidate) >= threshold;
}

// Check if it's a mutual match (both match each other's preferences)
export function isMutualMatch(
  viewerProfile: MatrimonyProfile,
  viewerPrefs: MatrimonyPreferences,
  candidateProfile: MatrimonyProfile,
  candidatePrefs: MatrimonyPreferences,
  threshold: number = 50
): boolean {
  return (
    computeMatchScore(viewerPrefs, candidateProfile) >= threshold &&
    computeMatchScore(candidatePrefs, viewerProfile) >= threshold
  );
}
