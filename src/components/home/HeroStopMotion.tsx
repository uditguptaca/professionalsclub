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
 */

const FRAMES = Array.from({ length: 8 }, (_, i) => `/img/hero-loop/crowd-${i + 1}.webp`);

export default function HeroStopMotion({ alt }: { alt: string }) {
  const [on, setOn] = useState(0);
  const [ready, setReady] = useState(false);

  // Decode every frame up front; flip `ready` only when all are paintable.
  useEffect(() => {
    let alive = true;
    Promise.all(
      FRAMES.map((src) => {
        const im = new window.Image();
        im.src = src;
        return im.decode().catch(() => {});
      })
    ).then(() => {
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
      {FRAMES.map((src, i) => (
        <img
          key={src}
          src={src}
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
