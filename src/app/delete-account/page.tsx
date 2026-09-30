import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';

export const metadata: Metadata = {
  title: 'Delete your account',
  description:
    'How to delete your Professionals Club account and what is removed, including how to ask if you cannot sign in.',
};

/**
 * The account-deletion page Google Play requires app listings to link to.
 *
 * Play's User Data policy wants a route that works for somebody who has
 * uninstalled the app or cannot sign in, so this page must stay reachable
 * without an account and must state what is deleted and what is kept. The
 * wording here is checked against what deleteOwnAccount() actually does in
 * src/app/actions/auth.ts - if that changes, this page changes with it.
 */

export default function DeleteAccountPage() {
  return (
    <>
      <Navbar />
      <main id="main" className="section-editorial">
        <div className="container" style={{ maxWidth: '46rem' }}>
          <span className="eyebrow">Your account</span>
          <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.4rem)', margin: '1rem 0 0.75rem' }}>
            Delete your account
          </h1>
          <p className="figure" style={{ marginBottom: '2.5rem' }}>
            Professionals Club &middot; ca.professionalsclub.app
          </p>

          <section style={{ marginBottom: '2.25rem' }}>
            <h2 style={{ fontSize: '1.35rem', marginBottom: '0.75rem' }}>If you can sign in</h2>
            <div className="legal-body">
              <p>
                You can delete your own account from inside the app or the website. Nobody
                needs to approve it and it happens straight away.
              </p>
              <ol>
                <li>Open <strong>More</strong>, then <strong>My Profile</strong>.</li>
                <li>Scroll to the bottom and choose <strong>Delete my account</strong>.</li>
                <li>Read what will be removed, then confirm.</li>
              </ol>
              <p>
                <Link href="/portal/member/profile">Open My Profile</Link> if you are already
                signed in.
              </p>
            </div>
          </section>

          <section style={{ marginBottom: '2.25rem' }}>
            <h2 style={{ fontSize: '1.35rem', marginBottom: '0.75rem' }}>
              If you cannot sign in, or you have uninstalled the app
            </h2>
            <div className="legal-body">
              <p>
                Email{' '}
                <a href="mailto:support@professionalsclub.ca?subject=Delete%20my%20account">
                  support@professionalsclub.ca
                </a>{' '}
                from the address you joined with, and ask us to delete your account. We do
                not need a reason.
              </p>
              <p>
                If you no longer have that email address, write from any address and tell us
                the name and city on your account so we can find it. We may ask one question
                to confirm it is yours, so that nobody can delete somebody else&rsquo;s account.
              </p>
              <p>
                We action requests within <strong>30 days</strong>, and usually within a few
                days.
              </p>
            </div>
          </section>

          <section style={{ marginBottom: '2.25rem' }}>
            <h2 style={{ fontSize: '1.35rem', marginBottom: '0.75rem' }}>What is deleted</h2>
            <div className="legal-body">
              <ul>
                <li>Your profile, and your name and details in the member directory.</li>
                <li>Your posts, comments and likes in the community.</li>
                <li>Your help requests and everything written on them.</li>
                <li>Your volunteer application and history.</li>
                <li>Your matrimony listing, preferences, interests and shortlist.</li>
                <li>
                  Your chats, <strong>including the other person&rsquo;s copy</strong> of your
                  conversation with them.
                </li>
                <li>Photos and files you uploaded.</li>
                <li>The notification token for any phone you signed in on.</li>
              </ul>
              <p>This cannot be undone. There is no grace period and no archive to restore from.</p>
            </div>
          </section>

          <section style={{ marginBottom: '2.25rem' }}>
            <h2 style={{ fontSize: '1.35rem', marginBottom: '0.75rem' }}>What is kept, and why</h2>
            <div className="legal-body">
              <ul>
                <li>
                  A line in the club&rsquo;s internal admin log recording that an account was
                  deleted, so the club can answer questions about its own decisions. It is
                  visible only to club admins.
                </li>
                <li>
                  Copies other people already saved or downloaded &mdash; a photo somebody
                  saved to their phone, for instance &mdash; are not ours to take back.
                </li>
                <li>
                  Anything the club must keep to meet a legal obligation, for as long as that
                  obligation lasts.
                </li>
              </ul>
              <p>
                We do not keep a shadow copy of your profile, your requests or your messages
                after deletion.
              </p>
            </div>
          </section>

          <section style={{ marginBottom: '2.25rem' }}>
            <h2 style={{ fontSize: '1.35rem', marginBottom: '0.75rem' }}>
              If you only want to stop the notifications
            </h2>
            <div className="legal-body">
              <p>
                You do not have to delete your account. You can turn individual notifications
                off under <strong>Notifications</strong>, make your profile private under{' '}
                <strong>My Profile</strong>, or hide your matrimony listing without removing
                anything else.
              </p>
            </div>
          </section>

          <p style={{ marginTop: '3rem' }}>
            See also the <Link href="/privacy">privacy policy</Link> and the{' '}
            <Link href="/terms">terms of use</Link>.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
