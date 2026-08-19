'use client';
import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, useMotionValue, useReducedMotion, useSpring, type Variants } from 'motion/react';

/**
 * The motion language for the site. Four moves, used everywhere so the page
 * feels composed rather than decorated:
 *
 *   WordReveal — headlines rise word-by-word from behind a mask, with a small
 *                settle of rotation. No opacity fade; the words arrive.
 *   Reveal     — blocks sharpen into place: blur + rise + a 2% scale settle.
 *   Stagger    — lists and grids cascade with a 70ms lag between children.
 *   CountUp    — figures count to their value the moment they enter view.
 *
 * Every component collapses to static content under prefers-reduced-motion.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * useReducedMotion, but hydration-safe. The server cannot read the media
 * query, so branching on the real value during the first client render makes
 * reduced-motion users hydrate against mismatched markup (WordReveal changes
 * its element structure entirely). This returns false until after mount, so
 * the first client render always matches the SSR output; the static variant
 * takes over one frame later.
 */
function useReducedMotionSafe(): boolean {
  const raw = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? Boolean(raw) : false;
}

/* ---------------------------------------------------------------- */

export function WordReveal({
  text,
  as: Tag = 'h2',
  className,
  delay = 0,
  emphasis,
}: {
  text: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  className?: string;
  delay?: number;
  /** Substring whose words render inside <em> (the serif italic accent). */
  emphasis?: string;
}) {
  const reduce = useReducedMotionSafe();
  // The words are clipped by their overflow-hidden wrappers, so a clipped
  // word never intersects the viewport and per-word whileInView never fires.
  // Observe the heading itself and drive the words from that.
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -12% 0px' });
  const words = text.split(' ');
  const emWords = new Set(emphasis ? emphasis.split(' ') : []);
  if (reduce) {
    return (
      <Tag className={className}>
        {words.map((w, i) => (
          <React.Fragment key={i}>
            {emWords.has(w) ? <em>{w}</em> : w}
            {i < words.length - 1 ? ' ' : ''}
          </React.Fragment>
        ))}
      </Tag>
    );
  }

  return (
    <Tag className={className} aria-label={text} ref={ref as React.Ref<never>}>
      {words.map((w, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom', paddingBottom: '0.08em', marginBottom: '-0.08em' }}
        >
          <motion.span
            style={{ display: 'inline-block', transformOrigin: '0% 100%', willChange: 'transform' }}
            initial={{ y: '115%', rotate: 5 }}
            animate={inView ? { y: '0%', rotate: 0 } : undefined}
            transition={{ duration: 0.75, ease: EASE, delay: delay + i * 0.05 }}
          >
            {emWords.has(w) ? <em>{w}</em> : w}
          </motion.span>
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  );
}

/* ---------------------------------------------------------------- */

export function Reveal({
  children,
  delay = 0,
  y = 32,
  className,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const reduce = useReducedMotionSafe();
  if (reduce) return <div className={className} style={style}>{children}</div>;

  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y, scale: 0.985, filter: 'blur(10px)' }}
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.85, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/* ---------------------------------------------------------------- */

const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const staggerChild: Variants = {
  hidden: { opacity: 0, y: 26, scale: 0.97, filter: 'blur(8px)' },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: EASE },
  },
};

export function Stagger({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const reduce = useReducedMotionSafe();
  if (reduce) return <div className={className} style={style}>{children}</div>;

  return (
    <motion.div
      className={className}
      style={style}
      variants={staggerParent}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const reduce = useReducedMotionSafe();
  if (reduce) return <div className={className} style={style}>{children}</div>;
  return (
    <motion.div className={className} style={style} variants={staggerChild}>
      {children}
    </motion.div>
  );
}

/* ---------------------------------------------------------------- */

/** "1,200+" -> counts 0..1200 keeping the formatting and suffix. */
export function CountUp({ value, duration = 1.6 }: { value: string; duration?: number }) {
  const reduce = useReducedMotionSafe();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const [display, setDisplay] = useState(reduce ? value : '0');

  const match = value.match(/^([^0-9]*)([\d,\.]+)(.*)$/);

  useEffect(() => {
    if (reduce || !inView || !match) return;
    const target = parseFloat(match[2].replace(/,/g, ''));
    const hasComma = match[2].includes(',');
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - t, 4);
      const current = Math.round(target * eased);
      const text = hasComma ? current.toLocaleString('en-CA') : String(current);
      setDisplay(match[1] + text + match[3]);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduce]);

  if (!match) return <span>{value}</span>;
  return <span ref={ref}>{reduce ? value : display}</span>;
}

/* ---------------------------------------------------------------- */

/** Mouse parallax: the element drifts toward the cursor with a spring.
 *  depth = maximum translation in px; deeper elements use larger depths.
 *  Inverted drift (away from cursor) via negative depth. */
export function Parallax({
  depth = 20,
  className,
  style,
  children,
}: {
  depth?: number;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotionSafe();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 55, damping: 16, mass: 0.6 });
  const y = useSpring(my, { stiffness: 55, damping: 16, mass: 0.6 });

  useEffect(() => {
    if (reduce) return;
    const onMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      mx.set(nx * depth);
      my.set(ny * depth);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depth, reduce]);

  if (reduce) return <div className={className} style={style}>{children}</div>;
  return (
    <motion.div className={className} style={{ ...style, x, y }}>
      {children}
    </motion.div>
  );
}

/* ---------------------------------------------------------------- */

/** Full-bleed accent marquee. Content is duplicated for the seamless loop;
 *  the second copy is aria-hidden. CSS does the animation (see .marquee). */
export function Marquee({ items }: { items: string[] }) {
  const row = (hidden: boolean) => (
    <div className="marquee-row" aria-hidden={hidden || undefined}>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          <span className={i % 2 ? 'marquee-word marquee-word-alt' : 'marquee-word'}>{item}</span>
          <span className="marquee-sep" aria-hidden="true">✦</span>
        </React.Fragment>
      ))}
    </div>
  );
  return (
    <div className="marquee" role="marquee" aria-label={items.join(', ')}>
      <div className="marquee-track">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
