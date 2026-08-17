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

export default function ContentImage({ src, alt, label, fill, width, height, style, className, ...rest }: Props) {
  const clean = typeof src === 'string' ? src.trim() : '';

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
