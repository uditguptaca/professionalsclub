'use client';
import React, { useEffect, useState } from 'react';

/**
 * Stop-motion hero photograph.
 *
 * Eight frames of the same wide crowd (distinct people edge to edge),
 * cut hard every 500ms for a 4-second loop — deliberately not a video and
 * not a cross-fade: the flip-book cadence is the point.
 *
 * The cycle does not start until every frame is fetched AND decoded
 * (img.decode()), so the loop never advances onto a frame the browser has
 * not painted yet — that was visible as a blink on first load. Until then
 * the first frame holds still. Respects prefers-reduced-motion by never
 * starting the cycle at all.
 *
 * Only the first frame is in the server HTML. It is the page's LCP element,
 * and when all eight carried a `src` the browser started them together and
 * they shared the connection - 1.2 MB above the fold, LCP 3.6 s on 4G. The
 * other seven are fetched after frame 1 has landed and mount once decoded.
 * Each frame ships at two widths: 1100 px for phones, the 2206 px original
 * for wide screens (srcset lets the browser pick; sizes matches .hero-loop).
 */

const FRAMES = Array.from({ length: 8 }, (_, i) => `/img/hero-loop/crowd-${i + 1}`);
const SIZES = '100vw';
const srcSetFor = (base: string) => `${base}-1100.webp 1100w, ${base}.webp 2206w`;

export default function HeroStopMotion({ alt }: { alt: string }) {
  const [on, setOn] = useState(0);
  const [ready, setReady] = useState(false);

  // Frame 1 first (already in flight from the HTML; this is a cache hit),
  // then the other seven, then flip `ready` once all are paintable.
  useEffect(() => {
    let alive = true;
    const decode = (base: string) => {
      const im = new window.Image();
      im.srcset = srcSetFor(base);
      im.sizes = SIZES;
      im.src = `${base}.webp`;
      return im.decode().catch(() => {});
    };
    decode(FRAMES[0])
      .then(() => Promise.all(FRAMES.slice(1).map(decode)))
      .then(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setOn((i) => (i + 1) % FRAMES.length), 500);
    return () => clearInterval(id);
  }, [ready]);

  return (
    <div className="hero-loop" role="img" aria-label={alt}>
      {FRAMES.map((base, i) => (i === 0 || ready) && (
        <img
          key={base}
          src={`${base}.webp`}
          srcSet={srcSetFor(base)}
          sizes={SIZES}
          alt=""
          aria-hidden="true"
          className={i === on ? 'is-on' : undefined}
          decoding={i === 0 ? 'sync' : 'async'}
          fetchPriority={i === 0 ? 'high' : undefined}
        />
      ))}
    </div>
  );
}
