import 'server-only';
import { withUserRead } from '@/server/db';

/**
 * Businesses a member has not saved yet, with the reason they might want to.
 *
 * The scoring is public.business_recommendations() (0050); this file turns its
 * flags into the sentence a card shows. The sentence is the product - a
 * suggestion with no reason is an advert, and a member who reads "Arjun and
 * two others you follow saved this" can judge it for themselves.
 */

export interface BusinessSuggestion {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  category: string;
  city: string | null;
  descriptionShort: string | null;
  memberRateText: string | null;
  isFeatured: boolean;
  score: number;
  /** Plain-language reasons, strongest first. Never empty. */
  reasons: string[];
}

function reasonsFor(r: Record<string, unknown>): string[] {
  const out: string[] = [];
  const savers = Number(r.followee_savers ?? 0);
  const names = Array.isArray(r.followee_names)
    ? (r.followee_names as unknown[]).filter((n): n is string => typeof n === 'string' && n.trim() !== '')
    : [];

  if (savers > 0) {
    if (names.length === 0) {
      out.push(savers === 1 ? 'Saved by someone you follow' : `Saved by ${savers} people you follow`);
    } else if (savers === 1) {
      out.push(`${names[0]} saved this`);
    } else if (savers === 2 && names.length >= 2) {
      out.push(`${names[0]} and ${names[1]} saved this`);
    } else {
      const rest = savers - 1;
      out.push(`${names[0]} and ${rest} other${rest === 1 ? '' : 's'} you follow saved this`);
    }
  }
  if (r.category_affinity) out.push(`You save ${String(r.category)} businesses`);
  if (r.city_match) out.push(`In ${String(r.city)}`);
  if (r.interest_match) out.push('Matches what you do');
  return out;
}

export async function recommendBusinesses(userId: string, limit = 8): Promise<BusinessSuggestion[]> {
  return withUserRead(userId, async (db) => {
    const rows = await db.run<Record<string, unknown>>(
      `select r.*, b.name, b.slug, b.logo, b.category, b.city, b.description_short,
              b.member_rate_text, b.is_featured
         from public.business_recommendations($1) r
         join public.businesses b on b.id = r.business_id
        order by r.score desc, b.is_featured desc, r.followee_savers desc`,
      [Math.min(Math.max(limit, 1), 50)]
    );
    return rows.map((r) => ({
      id: r.business_id as string,
      name: r.name as string,
      slug: r.slug as string,
      logo: (r.logo as string | null) ?? null,
      category: r.category as string,
      city: (r.city as string | null) ?? null,
      descriptionShort: (r.description_short as string | null) ?? null,
      memberRateText: (r.member_rate_text as string | null) ?? null,
      isFeatured: Boolean(r.is_featured),
      score: Number(r.score ?? 0),
      reasons: reasonsFor(r),
    }));
  });
}
