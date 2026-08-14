import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';

export const metadata: Metadata = {
  title: 'Terms of use',
  description: 'The terms that govern the Professionals Club website and mobile apps.',
};

const SECTIONS: { heading: string; body: React.ReactNode }[] = [
  {
    heading: 'The service',
    body: (
      <p>
        Professionals Club is a free, volunteer-run community service for
        newcomers and professionals in Canada: job referrals, settlement
        guidance, mentorship, community events, a business directory and a
        members-only matrimony section. It is provided as-is by volunteers,
        with no fees and no guarantees of outcome — a referral is an
        introduction, not a job offer; settlement guidance is peer experience,
        not legal or financial advice.
      </p>
    ),
  },
  {
    heading: 'Your account',
    body: (
      <ul>
        <li>One account per person, registered with accurate information.</li>
        <li>You are responsible for what happens under your sign-in; keep the password to yourself.</li>
        <li>You can delete the account at any time from Portal &rarr; My Profile; deletion is permanent.</li>
      </ul>
    ),
  },
  {
    heading: 'Acceptable use',
    body: (
      <>
        <p>Do not use the service to:</p>
        <ul>
          <li>harass, deceive or impersonate anyone, on the help desk or in matrimony profiles;</li>
          <li>post content that is unlawful, discriminatory or sexually explicit;</li>
          <li>advertise, spam or recruit for schemes;</li>
          <li>scrape member data or probe the service&apos;s security.</li>
        </ul>
        <p>
          Admins may moderate, suspend or remove accounts that break these
          rules. Matrimony profiles are moderated before other members can see
          them.
        </p>
      </>
    ),
  },
  {
    heading: 'Volunteers and mediation',
    body: (
      <p>
        Help is provided by vetted volunteers through an admin-mediated help
        desk — members do not get each other&apos;s contact details through the
        service. The club is not a party to, and not responsible for, private
        arrangements members make with each other outside the service.
      </p>
    ),
  },
  {
    heading: 'Content',
    body: (
      <p>
        You keep ownership of what you submit, and you grant the club the
        licence needed to operate the service (showing your request to the
        admins handling it, showing your matrimony profile to verified members,
        and so on). The site&apos;s own content — text, design, imagery — may not
        be republished commercially without permission.
      </p>
    ),
  },
  {
    heading: 'Liability',
    body: (
      <p>
        To the maximum extent permitted by law, the service is provided without
        warranties, and the club, its directors and volunteers are not liable
        for indirect or consequential losses arising from its use. Nothing in
        these terms limits liability that cannot be limited under the laws of
        Canada or your province.
      </p>
    ),
  },
  {
    heading: 'Changes and contact',
    body: (
      <p>
        These terms may be updated as the service evolves; the date below moves
        when they do. Continued use after a change is acceptance of it.
        Questions:{' '}
        <a href="mailto:support@professionalsclub.ca">support@professionalsclub.ca</a>.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main id="main" className="section-editorial">
        <div className="container" style={{ maxWidth: '46rem' }}>
          <span className="eyebrow">Legal</span>
          <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.4rem)', margin: '1rem 0 0.75rem' }}>
            Terms of use
          </h1>
          <p className="figure" style={{ marginBottom: '2.5rem' }}>
            Last updated 15 August 2026
          </p>

          {SECTIONS.map((s) => (
            <section key={s.heading} style={{ marginBottom: '2.25rem' }}>
              <h2 style={{ fontSize: '1.35rem', marginBottom: '0.75rem' }}>{s.heading}</h2>
              <div className="legal-body">{s.body}</div>
            </section>
          ))}

          <p style={{ marginTop: '3rem' }}>
            See also the <Link href="/privacy">privacy policy</Link>.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
