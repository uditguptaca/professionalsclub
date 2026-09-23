'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { CommunityPost } from '@/types';
import { PostCard } from '@/components/portal/community';
import PortalLoading from '@/components/portal/PortalLoading';
import { AlertCircle, UsersRound } from 'lucide-react';
import * as communityActions from '@/app/actions/community';
import { guardActions } from '@/lib/actions-client';
const { fetchPost } = guardActions(communityActions);

/**
 * One post, at its own address.
 *
 * Every network gives a post a permalink: it is what "copy link" copies, what a
 * notification opens, what a member pastes into a chat. Ours used to point at
 * an anchor inside the feed, which only worked while the post happened to be
 * on the first page. This page is the real destination, with the comments
 * already open because that is why someone followed a link to a post.
 */
export default function CommunityPostPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const postId = params?.id ?? '';
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [error, setError] = useState('');
  const [gone, setGone] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchPost(postId).then((r) => {
      if (!alive) return;
      if (r.ok) setPost(r.data);
      else setError(r.error);
    });
    return () => { alive = false; };
  }, [postId]);

  return (
    <div className="mp">
      {/* The portal shell draws the Back control for every non-tab page. */}
      {error && (
        <div role="alert" className="community-error" style={{ marginBottom: 12 }}>
          <AlertCircle size={15} aria-hidden="true" /> {error}
        </div>
      )}

      {!post && !error && <PortalLoading label="Loading the post" />}

      {gone && (
        <div className="cm-empty">
          <p><strong>This post was deleted.</strong></p>
          <div className="cm-empty-actions">
            <Link href="/portal/member/community" className="cm-btn cm-btn--primary cm-btn--lg">Back to the community</Link>
          </div>
        </div>
      )}

      {post && !gone && (
        <>
          {post.groupId && (
            <Link href={`/portal/member/community/groups/${post.groupId}`} className="cm-tag cm-tag--link" style={{ marginBottom: '0.6rem' }}>
              <UsersRound size={12} aria-hidden="true" /> Posted in {post.groupName ?? 'a group'}
            </Link>
          )}
          <PostCard
            post={post}
            defaultCommentsOpen
            onDeleted={() => setGone(true)}
            onAuthorBlocked={() => router.replace('/portal/member/community')}
          />
        </>
      )}
    </div>
  );
}
