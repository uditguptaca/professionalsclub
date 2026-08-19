import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';

/**
 * Branded 404.
 *
 * The site had none, so a mistyped URL landed on Next's default black-on-white
 * stack trace page. This keeps the chrome, so nobody is dead-ended: the nav and
 * footer are still there to navigate from.
 */
export default function NotFound() {
  return (
    <>
      <Navbar />

      <main id="main" className="section-editorial section-tint">
        <div className="container">
          <div className="split-editorial">
            <div>
              <span className="eyebrow">Error 404</span>

              <h1 style={{ marginTop: '1.25rem' }}>
                That page has moved on.
              </h1>

              <p className="standfirst" style={{ marginTop: '1.5rem' }}>
                The link is broken or the page no longer exists. Nothing you did
                caused it. Here are the places people usually want.
              </p>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '2.25rem' }}>
                <Link href="/" className="btn btn-primary">Back to home</Link>
                <Link href="/support" className="btn btn-outline">Get help</Link>
              </div>
            </div>

            <nav aria-label="Popular pages" className="index-list" style={{ marginTop: 0 }}>
              {[
                { href: '/jobs', label: 'Jobs and referrals', num: '01' },
                { href: '/settlement', label: 'Settlement guides', num: '02' },
                { href: '/events', label: 'Events and meetups', num: '03' },
                { href: '/businesses', label: 'Business directory', num: '04' },
                { href: '/portal/auth', label: 'Member sign in', num: '05' },
              ].map((item) => (
                <Link key={item.href} href={item.href} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <span className="index-num">{item.num}</span>
                  <span style={{ fontWeight: 600 }}>{item.label}</span>
                  <span aria-hidden="true" style={{ color: 'var(--text-accent)' }}>&rarr;</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
