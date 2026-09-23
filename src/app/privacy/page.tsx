import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: 'What Professionals Club collects, why, and how to have it deleted.',
};

/**
 * The privacy policy both app stores link to. Written to describe what this
 * codebase actually does — no analytics SDKs, no ad networks, no data sale —
 * so the Play Data Safety form and Apple privacy labels can point here
 * truthfully. If data practices change, this page must change with them.
 */

const SECTIONS: { heading: string; body: React.ReactNode }[] = [
  {
    heading: 'Who we are',
    body: (
      <p>
        Professionals Club is a volunteer-run, nonprofit community for newcomers
        and professionals in Canada. This policy covers the website at
        professionalsclub.ca and the Professionals Club mobile apps, which
        present the same portal. Questions and requests:{' '}
        <a href="mailto:support@professionalsclub.ca">support@professionalsclub.ca</a>.
      </p>
    ),
  },
  {
    heading: 'What we collect',
    body: (
      <>
        <p>We collect only what you type into the portal yourself:</p>
        <ul>
          <li><strong>Account</strong> — name, email address, password (stored as a hash by our authentication provider, never readable by us).</li>
          <li><strong>Profile</strong> — phone, city, province, industry and job title, if you choose to add them.</li>
          <li><strong>Help desk</strong> — the contents of help requests, volunteer applications and messages you exchange with the admin team.</li>
          <li><strong>Matrimony</strong> — the profile you create there, visible only to signed-in, verified members and moderated by admins. Nothing from it is ever public.</li>
        </ul>
        <p>
          We do not collect your location or your contacts, and we only hold the
          photos and files you attach yourself. The mobile app asks for two
          permissions, both of which you can refuse: notifications, so we can
          tell you about a reply, and the camera, so a business can scan a
          member coupon. Neither is required to use the club.
        </p>
      </>
    ),
  },
  {
    heading: 'What we do not do',
    body: (
      <ul>
        <li>No advertising and no ad networks.</li>
        <li>No third-party analytics or tracking SDKs.</li>
        <li>No sale or sharing of personal data with third parties for their own purposes.</li>
        <li>No cookies beyond the single session cookie that keeps you signed in.</li>
      </ul>
    ),
  },
  {
    heading: 'Where data lives',
    body: (
      <p>
        Data is stored in a Neon PostgreSQL database (hosted on AWS, US East)
        and served through Vercel. Files you upload are held in Vercel Blob
        storage. We also use a mail provider to send you email, a Google service
        to deliver push notifications, and Anthropic&apos;s API to check posts and
        photos automatically before they appear — which means the text and images
        you post pass through it. Each of these handles your data on our behalf
        and under their own security programs; none of them sells it. All traffic
        is encrypted in transit (TLS), and database access is restricted by
        row-level security so members can only ever read their own records.
      </p>
    ),
  },
  {
    heading: 'Who can see what',
    body: (
      <ul>
        <li><strong>You</strong> — your own profile, requests and messages.</li>
        <li><strong>Admins</strong> — help requests, volunteer applications and the matrimony and content moderation queues, in order to run the service. A volunteer assigned to your request reads that request.</li>
        <li><strong>Other members</strong> — your name, job title, employer and city; anything you post in the community feed or a group; events you say you are attending; and your matrimony listing if you created one and it passed review. If you set your profile to private, your posts are limited to the members you accept as followers.</li>
        <li><strong>Nobody but you</strong> — your help requests (beyond the admin and any assigned volunteer), your chats, which are end-to-end encrypted and unreadable by the club, and your chat PIN backup.</li>
        <li><strong>Your choice</strong> — your phone number and email are shown only where you put them: on your profile if you add them, and to a matrimony match once you accept their interest.</li>
      </ul>
    ),
  },
  {
    heading: 'Deleting your account and data',
    body: (
      <p>
        You can permanently delete your account at any time from{' '}
        <strong>Portal &rarr; My Profile &rarr; Delete My Account</strong>, in
        the app or on the web. Deletion is immediate and cascades to your
        profile, help requests, volunteer history, matrimony data and messages.
        If you cannot sign in, email{' '}
        <a href="mailto:support@professionalsclub.ca">support@professionalsclub.ca</a>{' '}
        from your registered address and we will delete the account manually
        within 30 days.
      </p>
    ),
  },
  {
    heading: 'Children',
    body: (
      <p>
        The service is intended for adults building their careers in Canada and
        is not directed at children under 13. We do not knowingly collect data
        from children.
      </p>
    ),
  },
  {
    heading: 'Changes',
    body: (
      <p>
        If our data practices change, this page changes first and the date below
        is updated. Meaningful changes are announced on the site.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main id="main" className="section-editorial">
        <div className="container" style={{ maxWidth: '46rem' }}>
          <span className="eyebrow">Legal</span>
          <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.4rem)', margin: '1rem 0 0.75rem' }}>
            Privacy policy
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
            See also the <Link href="/terms">terms of use</Link>.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
