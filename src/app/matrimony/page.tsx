'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
// The real create-form steps, so "what a listing contains" cannot drift away
// from the wizard a member actually fills in.
import { WIZARD_STEPS } from '@/lib/matrimony/constants';
import {
  Heart, ShieldCheck, Lock, Eye, UserCheck, ArrowRight,
  ChevronDown, ChevronUp, Sparkles, FileCheck, HeartHandshake, Search, Send, Clock, Globe
} from 'lucide-react';


const howItWorks = [
  {
    step: 1,
    icon: FileCheck,
    title: 'Create Your Profile',
    desc: 'Fill out a detailed profile with your personal details, preferences, family background, and what you\'re looking for in a life partner. Upload photos with privacy controls.',
    color: 'var(--primary-600)',
    bg: 'var(--primary-50)',
  },
  {
    step: 2,
    icon: ShieldCheck,
    title: 'Admin Reviews & Verifies',
    desc: 'Our team manually reviews every profile before it goes live. We verify authenticity, check for completeness, and ensure a safe, genuine community.',
    color: 'var(--primary-600)',
    bg: 'var(--primary-50)',
  },
  {
    step: 3,
    icon: HeartHandshake,
    title: 'Connect Privately',
    desc: 'Browse verified profiles, express interest, and connect privately through our admin-mediated process. Your contact details stay hidden until mutual consent.',
    color: 'var(--primary-600)',
    bg: 'var(--primary-50)',
  },
];

const trustBadges = [
  { icon: UserCheck, title: 'Admin-Verified Profiles', desc: 'Every profile is manually reviewed', color: 'var(--primary-600)' },
  { icon: Lock, title: 'Private & Secure', desc: 'Your data is never shared publicly', color: 'var(--primary-600)' },
  { icon: Eye, title: '100% Confidential', desc: 'Contact info visible only on consent', color: 'var(--primary-600)' },
];

// Claims about how the service is built, not counts. We do not publish member
// numbers or match counts: nothing on this page has a source for them, and the
// listing data itself is deliberately unreadable from the public site.
const assurances = [
  { value: 'Free', label: 'No fees and no premium tiers', icon: Sparkles },
  { value: 'Reviewed', label: 'An admin checks every listing', icon: ShieldCheck },
  { value: 'Private', label: 'Listings are never shown publicly', icon: Lock },
];

const faqs = [
  {
    q: 'Who can join the Matrimony service?',
    a: 'Any registered member of the Professionals Club who is of legal marriageable age can create a matrimony profile. The service is designed specifically for our professional community.',
  },
  {
    q: 'Is my profile visible to everyone?',
    a: 'No. Your profile is only visible to approved members who have created a listing of their own, and it is never shown on the public website. Your contact details are separate again: they stay hidden until you accept an interest from someone.',
  },
  {
    q: 'How does the verification process work?',
    a: 'After you submit your profile, our admin team reviews it for authenticity and completeness. This typically takes 1–2 business days. You\'ll be notified once your profile is approved, or if any changes are needed.',
  },
  {
    q: 'Can I control who sees my photos?',
    a: 'Yes. Each photo can be set to "Visible to all members", "Visible on request only", or "Private", and you can change any of them later. Photos are also reviewed before they appear to anyone.',
  },
  {
    q: 'How do I express interest in someone?',
    a: 'Once your profile is approved, you can browse profiles and send an "Interest" to anyone you like. If they accept, the admin team facilitates the introduction privately.',
  },
  {
    q: 'Is there a fee for the Matrimony service?',
    a: 'No, the matrimony service is 100% free. The Professionals Club is a completely free platform to join, and all services, including matrimony, are provided entirely free of cost for everyone.',
  },
];

// The visibility rules below are the ones the database actually enforces, in
// db/migrations/0002_matrimony_schema.sql and 0003_rls_policies.sql. Keep this
// list in step with those policies: it is the page's central promise, so a claim
// here that RLS does not back is a claim we cannot keep.
const visibilityRules = [
  {
    icon: Lock,
    title: 'No public directory',
    desc: 'No listing is published on this website, so there is no public page for anyone to read or for a search engine to index. Browsing happens only inside the member portal.',
  },
  {
    icon: UserCheck,
    title: 'Browsing needs a listing of your own',
    desc: 'You can only see other members once you have created a listing yourself. An account on its own is not enough, so nobody can sign up purely to read through the member base.',
  },
  {
    icon: Eye,
    title: 'Photos are a separate decision',
    desc: 'Each photo you upload carries its own visibility setting: all members, on request only, or private. Photos are also reviewed before they appear, and you can change your mind at any time.',
  },
  {
    icon: Send,
    title: 'Contact details need your consent',
    desc: 'Your phone number and email stay hidden until you accept an interest. Only the person receiving an interest can accept it, so a sender cannot unlock their own access.',
  },
];

const moderationPromises = [
  'Every listing is reviewed by an admin before it becomes visible to anyone.',
  'Members cannot approve their own listing, and cannot grant themselves a verified badge.',
  'You can hide your listing, block another member, or report a listing at any time.',
  'Blocking works in both directions, so a blocked member disappears from your results and you from theirs.',
];

export default function MatrimonyLandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // There is deliberately no profile state here. This page is served to signed-out
  // visitors, and matrimony listings are readable only through
  // matrimony_visible_profiles, which requires a session and a listing of the
  // caller's own. Browsing lives at /portal/member/matrimony/browse instead.

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main id="main">

      {/* ═══════ HERO ═══════ */}
      <section style={{
        position: 'relative',
        padding: '140px 0 100px',
        display: 'flex',
        alignItems: 'center',
        background: 'var(--text-primary)',
      }}>
        {/* Background Video */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          <video autoPlay loop muted playsInline style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }}>
            <source src="/videos/couple.mp4" type="video/mp4" />
          </video>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(12,12,14,0.4) 0%, rgba(12,12,14,0.72) 40%, rgba(12,12,14,0.98) 100%)' }} />
        </div>

        <div className="container" style={{ position: 'relative', zIndex: 10, maxWidth: 1280 }}>
          <div style={{ maxWidth: 780, margin: '0 auto', textAlign: 'center' }}>
            {/* Badge */}
            <div className="animate-fade-in-up" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 20px', borderRadius: 999,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
              marginBottom: 32, backdropFilter: 'blur(12px)',
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary-600)', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
                Trusted by professionals across Canada
              </span>
            </div>

            {/* Main heading */}
            <h1 className="animate-fade-in-up" style={{
              fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 6vw, 4rem)',
              fontWeight: 900, color: 'white', lineHeight: 1.1, marginBottom: 24,
            }}>
              Find Your{' '}
              <span style={{
                background: 'linear-gradient(135deg, var(--primary-600), var(--primary-400))',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>Life Partner</span>
            </h1>

            {/* Subtext */}
            <p className="animate-fade-in-up" style={{
              fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', color: 'var(--gray-400)',
              lineHeight: 1.7, maxWidth: 620, margin: '0 auto 40px',
            }}>
              Admin-verified profiles, full privacy, built for our community in Canada — a safe space for meaningful connections.
            </p>

            {/* CTA buttons */}
            <div className="animate-fade-in-up" style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/portal/member/matrimony/create" className="btn btn-lg" style={{
                background: 'linear-gradient(135deg, var(--primary-600), var(--primary-500))', color: 'white',
                fontWeight: 700, padding: '16px 36px', fontSize: '1rem', borderRadius: 14,
                boxShadow: '0 8px 30px rgba(232,93,4,0.35)', border: 'none',
                textDecoration: 'none',
              }}>
                <Heart size={20} /> Create Your Profile
              </Link>
              <Link href="#how-it-works" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '16px 32px', fontSize: '1rem', borderRadius: 14,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                color: 'white', fontWeight: 600, textDecoration: 'none',
                backdropFilter: 'blur(12px)', transition: 'all 0.2s',
              }}>
                Learn More <ArrowRight size={18} />
              </Link>
            </div>

            {/* Inline assurances */}
            <div className="animate-fade-in-up" style={{
              display: 'flex', gap: 48, justifyContent: 'center', marginTop: 64, flexWrap: 'wrap',
            }}>
              {assurances.map((a) => (
                <div key={a.label} style={{ textAlign: 'center' }}>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: 'white',
                  }}>{a.value}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--gray-400)', marginTop: 4 }}>
                    {a.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ NO PUBLIC DIRECTORY ═══════ */}
      <section style={{
        marginTop: '-50px',
        position: 'relative',
        zIndex: 20,
        padding: '0 20px 20px',
      }}>
        <div className="container" style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: 20,
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.08)',
            border: '1px solid var(--border-color)',
            padding: 32,
            display: 'flex',
            gap: 24,
            flexWrap: 'wrap',
            alignItems: 'flex-start',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, flexShrink: 0,
              background: 'var(--primary-50)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Lock size={26} style={{ color: 'var(--primary-600)' }} />
            </div>
            <div style={{ flex: 1, minWidth: 280 }}>
              <h2 style={{
                fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800,
                marginBottom: 10, color: 'var(--text-primary)',
              }}>
                There are no member listings on this page
              </h2>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20 }}>
                That is the whole idea. Listings live inside the member portal, and the
                database will not release one unless you are signed in and have created a
                listing of your own. Nothing is on display here to be screenshotted,
                forwarded, or turned up by a search engine.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link href="/portal/signup" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                  <Heart size={18} /> Create your listing
                </Link>
                <Link href="/portal/auth" className="btn btn-outline" style={{ textDecoration: 'none' }}>
                  Sign in to browse
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ PRIVACY MODEL ═══════ */}
      <section style={{ padding: '60px 0 80px', background: 'var(--bg-secondary)' }}>
        <div className="container" style={{ maxWidth: 1280 }}>
          <div className="section-header">
            <div className="overline" style={{ color: 'var(--primary-600)' }}>Privacy Model</div>
            <h2>Who Can See What</h2>
            <p>Four rules decide who ever sees your listing. Each one is enforced by the database, so it holds even if something in the interface goes wrong.</p>
          </div>

          {/* 420px holds two per row inside the 1100 container, so four rules land as a
              clean 2x2 rather than 3 with an orphan. The min() is load bearing: a bare
              minmax(420px, ...) cannot shrink below 420 on a phone and overflows the
              viewport instead of collapsing to one column. */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))',
            gap: 24, maxWidth: 1100, margin: '0 auto 64px',
          }}>
            {visibilityRules.map((rule, i) => {
              const Icon = rule.icon;
              return (
                <div key={rule.title} className="animate-fade-in-up" style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 20, padding: 28, position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute', top: 20, right: 24,
                    fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-display)',
                    color: 'var(--primary-600)', opacity: 0.1, lineHeight: 1,
                  }}>
                    {i + 1}
                  </div>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: 'var(--primary-50)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
                  }}>
                    <Icon size={24} style={{ color: 'var(--primary-600)' }} />
                  </div>
                  <h3 style={{
                    fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-display)',
                    marginBottom: 10, paddingRight: 32,
                  }}>
                    {rule.title}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                    {rule.desc}
                  </p>
                </div>
              );
            })}
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))',
            gap: 24, maxWidth: 1100, margin: '0 auto',
          }}>
            {/* What a listing contains */}
            <div style={{
              background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
              borderRadius: 20, padding: 28,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <FileCheck size={22} style={{ color: 'var(--primary-600)' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-display)', margin: 0 }}>
                  What a listing contains
                </h3>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 18 }}>
                The form is a guided wizard, one section at a time. Optional fields can stay
                blank and be filled in later, and a completeness score tracks how much you
                have filled in.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {WIZARD_STEPS.map((s, i) => (
                  <span key={s.id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 99,
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)',
                  }}>
                    <span style={{ color: 'var(--primary-600)', fontWeight: 800 }}>{i + 1}</span>
                    {s.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Moderation */}
            <div style={{
              background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
              borderRadius: 20, padding: 28,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <ShieldCheck size={22} style={{ color: 'var(--primary-600)' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-display)', margin: 0 }}>
                  Moderation guarantees
                </h3>
              </div>
              <ul style={{
                margin: 0, paddingLeft: 0, listStyle: 'none',
                display: 'flex', flexDirection: 'column', gap: 14,
              }}>
                {moderationPromises.map((promise) => (
                  <li key={promise} style={{
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7,
                  }}>
                    <ShieldCheck size={16} style={{ color: 'var(--primary-600)', flexShrink: 0, marginTop: 4 }} />
                    <span>{promise}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Free platform */}
          <div style={{
            maxWidth: 1100, margin: '24px auto 0',
            background: 'linear-gradient(135deg, var(--gray-900), var(--gray-700))',
            borderRadius: 20, padding: 32, color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
            display: 'flex', gap: 24, flexWrap: 'wrap',
            alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <Sparkles size={28} style={{ color: 'var(--primary-400)', marginBottom: 14 }} />
              <h3 style={{
                fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800,
                color: 'white', marginBottom: 10,
              }}>
                Free, with nothing held back for a paid tier
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.75)', lineHeight: 1.7, margin: 0 }}>
                No fees, no premium plan, and no paywall on sending an interest or on
                messaging once one is accepted. The Professionals Club runs this as a
                community service.
              </p>
            </div>
            <Link href="/portal/signup" className="btn btn-primary" style={{
              textDecoration: 'none', flexShrink: 0,
            }}>
              Get started <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section id="how-it-works" style={{ padding: '80px 0', background: 'var(--bg-primary)' }}>
        <div className="container" style={{ maxWidth: 1280 }}>
          <div className="section-header">
            <div className="overline" style={{ color: 'var(--primary-600)' }}>Simple & Secure Process</div>
            <h2>How It Works</h2>
            <p>Three simple steps to find your perfect match — with privacy and safety at every stage.</p>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 32, maxWidth: 1100, margin: '0 auto',
          }}>
            {howItWorks.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="animate-fade-in-up" style={{
                  background: item.bg,
                  border: '1px solid rgba(232, 93, 4, 0.08)',
                  borderRadius: 20, padding: 36,
                  position: 'relative', transition: 'all 0.3s',
                }}>
                  {/* Step number */}
                  <div style={{
                    position: 'absolute', top: 20, right: 20,
                    fontSize: '4rem', fontWeight: 900, fontFamily: 'var(--font-display)',
                    color: 'var(--primary-600)', opacity: 0.08, lineHeight: 1,
                  }}>
                    {item.step}
                  </div>
                  <div style={{
                    width: 56, height: 56, borderRadius: 16,
                    background: 'rgba(232, 93, 4, 0.1)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
                  }}>
                    <Icon size={28} style={{ color: 'var(--primary-600)' }} />
                  </div>
                  <h3 style={{
                    fontSize: '1.25rem', fontWeight: 700,
                    fontFamily: 'var(--font-display)', marginBottom: 12,
                  }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════ TRUST & SAFETY ═══════ */}
      <section style={{ padding: '80px 0', background: 'var(--bg-secondary)' }}>
        <div className="container" style={{ maxWidth: 1280 }}>
          <div className="section-header">
            <div className="overline" style={{ color: 'var(--primary-600)' }}>Your Safety Matters</div>
            <h2>Trust & Safety</h2>
            <p>We take your privacy and security seriously. Every layer of our platform is designed to keep you safe.</p>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 24, maxWidth: 1100, margin: '0 auto',
          }}>
            {trustBadges.map((badge) => {
              const Icon = badge.icon;
              return (
                <div key={badge.title} className="card-glass animate-fade-in-up" style={{
                  padding: 32, textAlign: 'center',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
                  background: 'white', border: '1px solid var(--border-color)',
                }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: 20,
                    background: 'var(--primary-50)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={30} style={{ color: badge.color }} />
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                    {badge.title}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {badge.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════ FEATURES HIGHLIGHT ═══════ */}
      <section style={{ padding: '80px 0', background: 'var(--bg-primary)' }}>
        <div className="container" style={{ maxWidth: 1280 }}>
          <div className="section-header">
            <div className="overline" style={{ color: 'var(--primary-600)' }}>Why Choose Us</div>
            <h2>Built for Meaningful Connections</h2>
            <p>Everything you need to find a compatible life partner, with the trust and privacy you deserve.</p>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 24, maxWidth: 1100, margin: '0 auto',
          }}>
            {[
              { icon: Search, title: 'Smart Matching', desc: 'Advanced filters for religion, community, education, profession, location, lifestyle, and more.' },
              { icon: ShieldCheck, title: 'Verified Community', desc: 'Only admin-verified profiles are visible. No fake or spam profiles — ever.' },
              { icon: Eye, title: 'Photo Privacy Controls', desc: 'Set photos to visible, blurred, or request-only. You\'re always in control.' },
              { icon: Send, title: 'Admin-Mediated Intros', desc: 'Contact details are shared only through our admin team after mutual consent.' },
              { icon: Globe, title: 'Global Connections', desc: 'Designed specifically for professionals residing in Canada — PRs, citizens, and work permit holders.' },
              { icon: Clock, title: 'Active Profiles Only', desc: 'We track activity and encourage engagement. No dormant or abandoned profiles cluttering your search.' },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} style={{
                  display: 'flex', gap: 16, padding: 24,
                  borderRadius: 16, border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  transition: 'all 0.2s',
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: 'var(--primary-50)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={22} style={{ color: 'var(--primary-600)' }} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 6 }}>{feature.title}</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{feature.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════ ASSURANCES BANNER ═══════ */}
      <section style={{
        padding: '80px 0',
        background: 'linear-gradient(135deg, var(--primary-600), var(--primary-500))',
        color: 'white',
      }}>
        <div className="container" style={{ maxWidth: 1280 }}>
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 80, flexWrap: 'wrap',
          }}>
            {assurances.map((a) => {
              const Icon = a.icon;
              return (
                <div key={a.label} style={{ textAlign: 'center' }}>
                  <Icon size={32} style={{ marginBottom: 12, opacity: 0.8 }} />
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: '2.5rem',
                    fontWeight: 900, marginBottom: 4,
                  }}>{a.value}</div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>{a.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════ FAQ ═══════ */}
      <section style={{ padding: '80px 0', background: 'var(--bg-secondary)' }}>
        <div className="container" style={{ maxWidth: 800 }}>
          <div className="section-header">
            <div className="overline" style={{ color: 'var(--primary-600)' }}>Common Questions</div>
            <h2>Frequently Asked Questions</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {faqs.map((faq, i) => (
              <div key={i} style={{
                background: 'var(--bg-primary)', borderRadius: 16,
                border: '1px solid var(--border-color)',
                overflow: 'hidden', transition: 'all 0.2s',
              }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
                  width: '100%', padding: '20px 24px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)',
                  textAlign: 'left', gap: 16,
                }}>
                  <span>{faq.q}</span>
                  {openFaq === i ? <ChevronUp size={20} style={{ flexShrink: 0, color: 'var(--primary-600)' }} /> : <ChevronDown size={20} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />}
                </button>
                {openFaq === i && (
                  <div style={{
                    padding: '0 24px 20px', fontSize: '0.9rem',
                    color: 'var(--text-secondary)', lineHeight: 1.7,
                    animation: 'fadeIn 0.2s ease-out',
                  }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Link href="/faq" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              color: 'var(--primary-600)', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none',
            }}>
              View All FAQs <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════ CTA ═══════ */}
      <section style={{
        padding: '100px 0',
        background: 'var(--text-primary)',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)', width: 600, height: 600,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,93,4,0.08), transparent 70%)',
        }} />
        <div className="container" style={{ position: 'relative', zIndex: 1, maxWidth: 1280 }}>
          <Sparkles size={40} style={{ color: 'var(--primary-600)', marginBottom: 20 }} />
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
            fontWeight: 900, color: 'white', marginBottom: 16,
          }}>
            Ready to Find Your Life Partner?
          </h2>
          <p style={{
            fontSize: '1.1rem', color: 'var(--gray-400)',
            maxWidth: 500, margin: '0 auto 36px', lineHeight: 1.7,
          }}>
            Create your listing, and the only people who will ever see it are members with
            a reviewed listing of their own.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/portal/member/matrimony/create" className="btn btn-lg" style={{
              background: 'linear-gradient(135deg, var(--primary-600), var(--primary-50))', color: 'white',
              fontWeight: 700, padding: '16px 36px', fontSize: '1rem', borderRadius: 14,
              boxShadow: '0 8px 30px rgba(232,93,4,0.3)', border: 'none', textDecoration: 'none',
            }}>
              <Heart size={20} /> Create Your Profile
            </Link>
            <Link href="/portal/auth" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '16px 32px', fontSize: '1rem', borderRadius: 14,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
              color: 'white', fontWeight: 600, textDecoration: 'none',
            }}>
              Sign In <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      </main>

      <Footer />
    </div>
  );
}
