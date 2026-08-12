'use server';

import * as repo from '@/server/repos/public-content';

/**
 * Reads for the public marketing pages.
 *
 * No authentication, by design — these run as app_anonymous and can only reach
 * published rows. They are actions rather than direct repository imports so the
 * pages can stay client components without pulling the database driver into the
 * browser bundle.
 */

export async function getVerifiedBusinesses() {
  return repo.listVerifiedBusinesses();
}

export async function getBusinessBySlug(slug: string) {
  return repo.getBusinessBySlug(slug);
}

export async function getUpcomingEvents() {
  return repo.listUpcomingEvents();
}

export async function getPublicVideos() {
  return repo.listVideos();
}
