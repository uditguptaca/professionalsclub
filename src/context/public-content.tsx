'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getPublicContent } from '@/app/actions/public';
import type {
  JobPosting, NewsArticle, TeamMember, DonationCampaign,
  EBook, VideoWorkshop, ContentTemplate, CommunityEvent,
} from '@/types';

/**
 * Admin-managed content for the PUBLIC pages.
 *
 * The marketing pages used to read these slices from usePortal(), whose
 * loader returns nothing unless the visitor is signed in — so /jobs, /news,
 * /blogs, /team, /donate and /resources rendered permanently empty for the
 * public. This provider fetches the same shapes through the anonymous
 * (app_anonymous) read path, which RLS restricts to published rows.
 *
 * Field names match the portal context deliberately, so a page swaps one
 * import and nothing else.
 */

type PublicContent = {
  jobPostings: JobPosting[];
  newsArticles: NewsArticle[];
  teamMembers: TeamMember[];
  donationCampaigns: DonationCampaign[];
  ebooks: EBook[];
  workshops: VideoWorkshop[];
  templates: ContentTemplate[];
  events: CommunityEvent[];
  loading: boolean;
};

const EMPTY: PublicContent = {
  jobPostings: [], newsArticles: [], teamMembers: [], donationCampaigns: [],
  ebooks: [], workshops: [], templates: [], events: [], loading: true,
};

const PublicContentContext = createContext<PublicContent>(EMPTY);

/** Module-level cache: several public pages mount this in one session. */
let cached: { promise: Promise<Omit<PublicContent, 'loading'>>; expires: number } | null = null;

function load(): Promise<Omit<PublicContent, 'loading'>> {
  if (cached && cached.expires > Date.now()) return cached.promise;
  const promise = getPublicContent().catch(() => ({
    jobPostings: [], newsArticles: [], teamMembers: [], donationCampaigns: [],
    ebooks: [], workshops: [], templates: [], events: [],
  }));
  cached = { promise, expires: Date.now() + 60_000 };
  return promise;
}

export function PublicContentProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PublicContent>(EMPTY);

  useEffect(() => {
    let alive = true;
    load().then((data) => {
      if (alive) setState({ ...data, loading: false });
    });
    return () => { alive = false; };
  }, []);

  return (
    <PublicContentContext.Provider value={state}>
      {children}
    </PublicContentContext.Provider>
  );
}

export function usePublicContent(): PublicContent {
  return useContext(PublicContentContext);
}
