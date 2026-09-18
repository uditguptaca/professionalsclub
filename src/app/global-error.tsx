'use client';
import { useEffect } from 'react';
import Link from 'next/link';

/**
 * The boundary above the root layout. error.tsx cannot catch a throw in the
 * root layout itself (it reads the session and the profile), so without this
 * a database hiccup during that read showed Next's bare error page. The
 * message is withheld on purpose: it can carry table or column names.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[global error boundary]', error.message, error.digest);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#fff7ed', color: '#0c0c0e' }}>
        <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: '2rem' }}>
          <div style={{ maxWidth: '30rem', textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.6rem', margin: '0 0 0.6rem' }}>We could not load the site.</h1>
            <p style={{ color: '#555', lineHeight: 1.5, margin: '0 0 1.4rem' }}>
              The error has been logged. Trying again usually works.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={reset}
                style={{ minHeight: 44, padding: '0 1.2rem', border: 0, borderRadius: 999, background: '#c2410c', color: '#fff', font: 'inherit', fontWeight: 700, cursor: 'pointer' }}
              >
                Try again
              </button>
              <Link
                href="/"
                style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center', padding: '0 1.2rem', borderRadius: 999, border: '1px solid #ddd', color: 'inherit', textDecoration: 'none', fontWeight: 700 }}
              >
                Back to home
              </Link>
            </div>
            {error.digest && (
              <p style={{ marginTop: '1.5rem', fontSize: '0.72rem', color: '#888' }}>Reference {error.digest}</p>
            )}
          </div>
        </main>
      </body>
    </html>
  );
}
