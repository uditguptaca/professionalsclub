'use client';
import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Route-level error boundary.
 *
 * Without this, an exception in any page rendered Next's default error screen —
 * and in production that is a blank page with no way out.
 *
 * The digest is shown deliberately: it is the only thing that ties what the user
 * saw to a specific entry in the server logs, and it leaks nothing. The message
 * itself is not shown, because it can carry database or column names.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[error boundary]', error.message, error.digest);
  }, [error]);

  return (
    <main
      id="main"
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: '2rem',
        background: 'var(--bg-secondary)',
      }}
    >
      <div className="card" style={{ maxWidth: '32rem', textAlign: 'center' }}>
        <span className="eyebrow" style={{ justifyContent: 'center' }}>Something broke</span>

        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', margin: '1rem 0 0.75rem' }}>
          We could not load this page.
        </h1>

        <p style={{ color: 'var(--text-secondary)', margin: '0 auto 1.75rem' }}>
          The error has been logged. Trying again often works — the most common
          cause is a dropped connection.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" onClick={reset} className="btn btn-primary">Try again</button>
          <Link href="/" className="btn btn-outline">Back to home</Link>
        </div>

        {error.digest && (
          <p
            className="figure"
            style={{ marginTop: '1.75rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}
          >
            Reference {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}
