/**
 * The club's community cities.
 *
 * One canonical list, used by signup, the profile editor, and the home feed's
 * city switcher — so "Toronto", "toronto" and "Toronto, ON" stop being three
 * different communities. Free text is still allowed (a member in Moncton is
 * not locked out); it simply won't have a curated skyline or a big cohort.
 *
 * Skylines ship in /public; cities without one fall back to the community
 * photo, which is the same graceful state InterNations shows for small hubs.
 */

export interface CommunityCity {
  name: string;
  province: string;
  /** Hero image for the home feed. Must exist in /public. */
  skyline: string;
}

export const COMMUNITY_CITIES: CommunityCity[] = [
  { name: 'Toronto',     province: 'Ontario',          skyline: '/toronto-skyline.png' },
  { name: 'Vancouver',   province: 'British Columbia', skyline: '/vancouver-skyline.png' },
  { name: 'Calgary',     province: 'Alberta',          skyline: '/calgary-skyline.png' },
  { name: 'Montreal',    province: 'Quebec',           skyline: '/montreal-skyline.png' },
  { name: 'Mississauga', province: 'Ontario',          skyline: '/toronto-skyline.png' },
  { name: 'Brampton',    province: 'Ontario',          skyline: '/toronto-skyline.png' },
  { name: 'Ottawa',      province: 'Ontario',          skyline: '/hero-community.png' },
  { name: 'Edmonton',    province: 'Alberta',          skyline: '/hero-community.png' },
  { name: 'Winnipeg',    province: 'Manitoba',         skyline: '/hero-community.png' },
  { name: 'Surrey',      province: 'British Columbia', skyline: '/vancouver-skyline.png' },
  { name: 'Halifax',     province: 'Nova Scotia',      skyline: '/hero-community.png' },
  { name: 'Waterloo',    province: 'Ontario',          skyline: '/hero-community.png' },
  { name: 'Hamilton',    province: 'Ontario',          skyline: '/toronto-skyline.png' },
  { name: 'Saskatoon',   province: 'Saskatchewan',     skyline: '/hero-community.png' },
  { name: 'Regina',      province: 'Saskatchewan',     skyline: '/hero-community.png' },
];

const FALLBACK_SKYLINE = '/hero-community.png';

/** Case-insensitive lookup; unknown cities get the community fallback. */
export function cityInfo(city: string | null | undefined): { name: string; skyline: string; known: boolean } {
  const trimmed = (city ?? '').trim();
  if (!trimmed) return { name: 'your city', skyline: FALLBACK_SKYLINE, known: false };
  const match = COMMUNITY_CITIES.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
  return match
    ? { name: match.name, skyline: match.skyline, known: true }
    : { name: trimmed, skyline: FALLBACK_SKYLINE, known: false };
}
