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

const httpUrl = (v: unknown, max: number): string | undefined => {
  if (typeof v !== 'string' || v.length > max) return undefined;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : undefined;
  } catch {
    return undefined;
  }
};
const str = (v: unknown, max: number): string | undefined =>
  (typeof v === 'string' && v.trim() ? v.slice(0, max) : undefined);

/**
 * The sender's device wrote the card, so it is treated like any other input:
 * every field a string of bounded length, every URL http(s). A card that fails
 * is dropped and the text stands alone. The site name shown on the card is
 * always the link's own host, so a card cannot claim to be somewhere it is not.
 */
export function sanitizePreview(lp: unknown): LinkPreview | null {
  if (!lp || typeof lp !== 'object') return null;
  const o = lp as Record<string, unknown>;
  const url = httpUrl(o.url, 2000);
  if (!url) return null;
  return {
    url,
    siteName: new URL(url).hostname.replace(/^www\./, ''),
    title: str(o.title, 160),
    description: str(o.description, 300),
    image: httpUrl(o.image, 1000),
  };
}

export function unpackContent(raw: string): ChatContent {
  if (!raw.startsWith(ENVELOPE_MARK)) return { text: raw, preview: null };
  try {
    const parsed = JSON.parse(raw.slice(1)) as { v?: number; t?: unknown; lp?: unknown };
    const text = typeof parsed.t === 'string' ? parsed.t.slice(0, 5000) : '';
    return { text, preview: sanitizePreview(parsed.lp) };
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
