import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse, type NextRequest } from 'next/server';
import { requireUserId } from '@/server/auth';

/**
 * Token exchange for Vercel Blob client uploads.
 *
 * The browser uploads media straight to Blob storage (so videos are not
 * squeezed through a serverless function's body limit); this route only
 * decides WHO may upload WHAT:
 *   - a signed-in, active member (requireUserId throws otherwise),
 *   - images or mp4/webm video only,
 *   - capped at 8 MB per image and 120 MB per video.
 *
 * Requires BLOB_READ_WRITE_TOKEN (Vercel dashboard -> Storage -> Blob).
 * Without it this route 503s and the client falls back to the dev-only
 * local-disk endpoint.
 */

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'blob-not-configured' }, { status: 503 });
  }

  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const isVideo = clientPayload === 'video';
        return {
          allowedContentTypes: isVideo ? VIDEO_TYPES : IMAGE_TYPES,
          maximumSizeInBytes: isVideo ? 120 * 1024 * 1024 : 8 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: userId,
        };
      },
      // Nothing to do post-upload: the post row stores the URL when published.
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 400 }
    );
  }
}
