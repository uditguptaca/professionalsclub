import React from 'react';
import type { LinkPreview } from '@/types';

/**
 * Links in chat: finding them, rendering them, and carrying a preview card
 * inside an end-to-end encrypted message.
 *
 * THE ENVELOPE. A message's plaintext is the text itself - unless it starts
 * with U+001E (the ASCII record separator, which nobody types), in which case
 * it is `{"v":1,"t":"<text>","lp":{...}}`. That is how a sender's link
 * preview reaches the reader without the server ever seeing it: the card is
 * sealed with the text (0042). Anything that shows a message's text goes
 * through unpackContent(), so a raw envelope is never displayed.
 */

export const ENVELOPE_MARK = '';

export interface ChatContent {
  text: string;
  preview: LinkPreview | null;
}

export function packContent(text: string, preview: LinkPreview | null): string {
  return preview ? ENVELOPE_MARK + JSON.stringify({ v: 1, t: text, lp: preview }) : text;
}

export function unpackContent(raw: string): ChatContent {
  if (!raw.startsWith(ENVELOPE_MARK)) return { text: raw, preview: null };
  try {
    const parsed = JSON.parse(raw.slice(1)) as { v?: number; t?: unknown; lp?: unknown };
    const text = typeof parsed.t === 'string' ? parsed.t : '';
    const lp = parsed.lp as Partial<LinkPreview> | undefined;
    const preview = lp && typeof lp.url === 'string' && typeof lp.siteName === 'string'
      ? { url: lp.url, siteName: lp.siteName, title: lp.title, description: lp.description, image: lp.image }
      : null;
    return { text, preview };
  } catch {
    return { text: raw, preview: null };
  }
}

/** http(s) URLs and bare www. hosts; trailing punctuation stays outside the link. */
export const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"'()]+?(?=[.,;:!?)"']*(?:\s|$))/gi;

const href = (match: string) => (/^https?:\/\//i.test(match) ? match : `https://${match}`);

/** The first URL in the text, normalised, or null. */
export function firstUrl(text: string): string | null {
  const m = new RegExp(URL_RE.source, 'i').exec(text);
  if (!m) return null;
  try { return new URL(href(m[0])).href; } catch { return null; }
}

/**
 * Text with its URLs as anchors. `onOpen` gets the href so a native shell can
 * hand it to the system browser instead of the WebView.
 */
export function linkify(text: string, onOpen?: (url: string) => void, className?: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = new RegExp(URL_RE.source, 'gi');
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const url = href(m[0]);
    parts.push(
      <a
        key={`${m.index}-${url}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={(e) => { e.stopPropagation(); if (onOpen) { e.preventDefault(); onOpen(url); } }}
      >
        {m[0]}
      </a>,
    );
    last = m.index + m[0].length;
  }
  if (parts.length === 0) return text;
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
