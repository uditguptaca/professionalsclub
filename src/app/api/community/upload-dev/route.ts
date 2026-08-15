import { NextResponse, type NextRequest } from 'next/server';
import { requireUserId } from '@/server/auth';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

/**
 * DEV-ONLY upload fallback: writes to public/uploads (gitignored) so the
 * media flow works on a laptop without a Vercel Blob token. Refuses to run
 * in production — there, /api/community/upload (Vercel Blob) is the path.
 */

const ALLOWED: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === 'production' || process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  try {
    await requireUserId();
  } catch {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file' }, { status: 400 });
  }
  const ext = ALLOWED[file.type];
  if (!ext) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
  }
  const max = file.type.startsWith('video/') ? 120 * 1024 * 1024 : 8 * 1024 * 1024;
  if (file.size > max) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 });
  }

  const name = `${crypto.randomBytes(10).toString('hex')}${ext}`;
  const dir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ url: `/uploads/${name}` });
}
