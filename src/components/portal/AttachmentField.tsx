'use client';
import React, { useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import { Upload, X, FileText, Loader2 } from 'lucide-react';

/**
 * File attachments for the help-request and volunteer-application forms, which
 * both write a text[] of URLs (help_requests.documents,
 * volunteer_applications.documents).
 *
 * uploadAttachment is the third caller of the Blob handshake after
 * src/components/portal/community.tsx and matrimony/create, whose comment asked
 * for a shared helper once that happened — so it lives here rather than being
 * pasted into two more pages.
 *
 * State lives in the parent: it owns the URLs it submits, and it has to keep
 * its own submit button disabled while an upload is still in flight.
 */

/** Kept in step with DOCUMENT_TYPES in src/app/api/community/upload/route.ts. */
const ACCEPT = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
].join(',');

/** Only the url is persisted; the name is kept locally so the chip can be read. */
export type Attachment = { url: string; name: string };

async function uploadAttachment(file: File): Promise<string> {
  try {
    const blob = await upload(file.name, file, {
      access: 'public',
      handleUploadUrl: '/api/community/upload',
      clientPayload: 'document',
    });
    return blob.url;
  } catch (error) {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/community/upload-dev', { method: 'POST', body: form });
    // The dev endpoint 404s in production, where the Blob error is the truth.
    if (res.status === 404) throw error;
    if (!res.ok) throw new Error('Upload failed');
    const data = (await res.json()) as { url: string };
    return data.url;
  }
}

export function AttachmentField({
  label,
  maxFiles,
  files,
  setFiles,
  pending,
  setPending,
}: {
  label: string;
  maxFiles: number;
  files: Attachment[];
  setFiles: React.Dispatch<React.SetStateAction<Attachment[]>>;
  pending: number;
  setPending: React.Dispatch<React.SetStateAction<number>>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  const used = files.length + pending;
  const full = used >= maxFiles;

  const attach = async (list: FileList | null) => {
    if (!list?.length) return;
    setError('');
    const chosen = Array.from(list).slice(0, Math.max(maxFiles - used, 0));
    if (chosen.length === 0) {
      setError(`You can attach up to ${maxFiles} files.`);
      return;
    }
    setPending(n => n + chosen.length);
    await Promise.all(
      chosen.map(async file => {
        try {
          const url = await uploadAttachment(file);
          setFiles(f => [...f, { url, name: file.name }]);
        } catch {
          setError('Upload failed. Use a PDF, Word file, JPG, PNG or WebP under 8 MB.');
        } finally {
          setPending(n => n - 1);
        }
      })
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); void attach(e.dataTransfer.files); }}
      >
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={full}
          style={{
            width: '100%', border: '2px dashed var(--gray-300)', borderRadius: 12, padding: 24,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            background: 'var(--bg-secondary)', cursor: full ? 'not-allowed' : 'pointer',
            opacity: full ? 0.6 : 1, font: 'inherit',
          }}
        >
          <Upload size={24} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            PDF, Word or image, up to 8 MB each. {maxFiles} files maximum
            {used > 0 ? ` (${used} of ${maxFiles} used)` : ''}.
          </span>
        </button>
        <input
          ref={input} type="file" accept={ACCEPT} multiple hidden
          onChange={e => { void attach(e.target.files); e.target.value = ''; }}
        />
      </div>

      {(files.length > 0 || pending > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {files.map(file => (
            <span
              key={file.url}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px',
                borderRadius: 99, background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)', fontSize: '0.78rem', maxWidth: 260,
              }}
            >
              <FileText size={13} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
              {/* Removing only drops the URL from the payload. The uploaded blob is
                  left unreferenced rather than adding a delete endpoint for a file
                  no row points at. */}
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() => setFiles(f => f.filter(x => x.url !== file.url))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}
              >
                <X size={13} />
              </button>
            </span>
          ))}
          {Array.from({ length: pending }).map((_, i) => (
            <span
              key={`pending-${i}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px',
                borderRadius: 99, background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)', fontSize: '0.78rem', color: 'var(--text-muted)',
              }}
            >
              {/* .spin is the class that actually animates; animate-spin used
                  elsewhere in the portal is not defined in the stylesheet. */}
              <Loader2 size={13} className="spin" /> Uploading…
            </span>
          ))}
        </div>
      )}

      {error && <p role="alert" className="community-error">{error}</p>}
    </div>
  );
}
