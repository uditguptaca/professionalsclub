import { redirect } from 'next/navigation';

/**
 * Groups live as a tab inside the community screen now (Feed · Groups ·
 * People). Kept as a redirect so bookmarks, the profile hub's links and the
 * home feed's "All groups" still land somewhere sensible.
 */
export default function CommunityGroupsPage() {
  redirect('/portal/member/community?tab=groups');
}
