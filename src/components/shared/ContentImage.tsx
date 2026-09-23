'use client';
import React from 'react';
import Image, { type ImageProps } from 'next/image';

/**
 * An image whose src comes from admin-entered content.
 *
 * next/image throws "Image is missing required src property" on an empty
 * string, and every content table stores image as a nullable text column — so
 * the moment an admin saved a job, article or team member without a picture,
 * the public page filled the console with errors and rendered a broken box.
 *
 * This renders the picture when there is one and a quiet branded placeholder
 * (the initial of the label, on the cream surface) when there is not, so a
 * row without an image looks deliberate instead of broken.
 */

type Props = Omit<ImageProps, 'src' | 'alt'> & {
  src: string | null | undefined;
  alt: string;
  /** Text used for the placeholder glyph; defaults to alt. */
  label?: string;
};

/**
 * Our Blob store's hostname, inlined at build time by next.config.ts from the
 * store token - the one remote host the image optimiser is allowed to fetch.
 * Uploads (logos, covers, post photos, matrimony photos) all live there and
 * used to be served at their uploaded size: a 2.7 MB logo into a 42 px badge.
 */
const BLOB_HOST = process.env.NEXT_PUBLIC_BLOB_HOST;

/** True only for a URL on OUR store; anything else must not reach next/image. */
export function isOurBlobUrl(url: string): boolean {
  if (!BLOB_HOST) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === BLOB_HOST;
  } catch {
    return false;
  }
}

export default function ContentImage({ src, alt, label, fill, width, height, style, className, ...rest }: Props) {
  const clean = typeof src === 'string' ? src.trim() : '';

  // next/image refuses a remote host that is not configured, and content
  // editors paste hosted URLs. A plain <img> shows them instead of throwing.
  // Our own Blob store IS configured, so its files fall through to <Image>
  // below and come back resized, AVIF/WebP, and cached for a year.
  if (/^https?:\/\//i.test(clean) && !isOurBlobUrl(clean)) {
    return <img src={clean} alt={alt} className={className} style={{ ...(fill ? { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' } : {}), ...style }} loading="lazy" decoding="async" />;
  }

  if (clean.length > 0) {
    return (
      <Image
        src={clean}
        alt={alt}
        fill={fill}
        width={width}
        height={height}
        style={style}
        className={className}
        {...rest}
      />
    );
  }

  const glyph = (label ?? alt ?? '?').trim().charAt(0).toUpperCase() || '?';

  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: 'grid',
        placeItems: 'center',
        background: 'var(--green-50, #eef7f0)',
        color: 'var(--green-700, #2d6a4f)',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: '1.4rem',
        ...(fill
          ? { position: 'absolute', inset: 0 }
          : { width: width ? `${width}px` : '100%', height: height ? `${height}px` : '100%' }),
        ...style,
      }}
    >
      {glyph}
    </span>
  );
}
