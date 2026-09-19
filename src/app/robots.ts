import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/server/origin';

/** The marketing site is for crawlers; the portal, the API and the business console are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/portal/', '/api/', '/business/'] }],
    host: SITE_URL,
  };
}
