'use client';
import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';

export default function HowItWorksPage() {
  return (
    <>
      <Navbar />
      <div style={{ paddingTop: 100 }}>
        <section className="section">
          <div className="container">
            <div className="section-header">
              <div className="overline">How It Works</div>
              <h2>Your Path to a <span className="text-gradient">Trusted Referral</span></h2>
              <p>Our platform connects job seekers with verified employees through an intelligent matching engine.</p>
            </div>

            {/* JOB SEEKER FLOW */}
            <div style={{ marginBottom: 'var(--space-16)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 800, textAlign: 'center', marginBottom: 'var(--space-10)' }}>
                🎯 For Job Seekers
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
                {[
                  { step: 1, icon: '📝', title: 'Create Your Profile', desc: 'Sign up, complete your professional profile, verify your identity and LinkedIn. Upload your resume and tell us about your career goals.', details: ['Full professional profile', 'LinkedIn verification', 'ID verification', 'Resume upload with version history', 'Skills & experience mapping'] },
                  { step: 2, icon: '🏢', title: 'Choose a Company & Job', desc: 'Browse 500+ Canadian companies, find open roles, and select the position you want a referral for.', details: ['Search by company, industry, or role', 'View active referrers at each company', 'See pricing per company', 'Paste any job URL for auto-parsing'] },
                  { step: 3, icon: '✍️', title: 'Submit Your Referral Request', desc: 'Write why you\'re a great fit, attach your resume, and submit. The platform charges based on your plan and company tier.', details: ['Fit summary & cover note', 'Resume selection', 'Work authorization details', 'Portfolio links', 'Urgency level'] },
                  { step: 4, icon: '🤖', title: 'AI Matching Engine', desc: 'Our intelligent matching system scores and ranks available employees based on company, department, role, location, and your profile fit.', details: ['Company & department match', 'Role & seniority match', 'Employee availability check', 'Historical acceptance rates', 'Language & location preferences'] },
                  { step: 5, icon: '💬', title: 'Connect via Chat', desc: 'Once matched and accepted, a secure in-app chat opens. Discuss the role, share insider tips, and prepare for the referral.', details: ['One-to-one secure chat', 'Request context visible', 'File sharing', 'Canned response templates', 'Report & moderation'] },
                  { step: 6, icon: '🚀', title: 'Get Referred & Land the Job', desc: 'The employee submits your referral through their company\'s internal system. Track your status on your dashboard.', details: ['Real-time status tracking', 'Completion confirmation', 'Rating & feedback', 'Success story sharing'] },
                ].map(item => (
                  <div key={item.step} style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>
                    <div style={{ width: 80, height: 80, borderRadius: 'var(--radius-xl)', background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(251,191,36,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', position: 'relative' }}>
                      {item.icon}
                      <span style={{ position: 'absolute', top: -8, right: -8, width: 28, height: 28, borderRadius: '50%', background: 'var(--primary-600)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-xs)', fontWeight: 800 }}>{item.step}</span>
                    </div>
                    <div className="card" style={{ flex: 1 }}>
                      <h4 style={{ fontWeight: 700, fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>{item.title}</h4>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>{item.desc}</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                        {item.details.map(d => <span key={d} className="badge badge-primary">{d}</span>)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* EMPLOYEE FLOW */}
            <div style={{ marginBottom: 'var(--space-12)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 800, textAlign: 'center', marginBottom: 'var(--space-10)' }}>
                🏢 For Employees & Referrers
              </h3>
              <div className="grid grid-3 gap-6">
                {[
                  { step: 1, icon: '📋', title: 'Apply & Get Verified', desc: 'Submit your employee details once. Verify work email and LinkedIn. Admin approves your application.' },
                  { step: 2, icon: '📬', title: 'Receive Matched Requests', desc: 'Get notified when a quality candidate is matched to you. Review their profile, resume, and fit summary.' },
                  { step: 3, icon: '✅', title: 'Accept & Refer', desc: 'Accept the request, chat with the candidate, share tips, and submit the referral through your company.' },
                ].map(item => (
                  <div key={item.step} className="feature-card" style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 'var(--space-4)' }}>{item.icon}</div>
                    <span className="badge badge-accent" style={{ marginBottom: 'var(--space-3)' }}>Step {item.step}</span>
                    <h4 style={{ fontWeight: 700, marginBottom: 'var(--space-2)' }}>{item.title}</h4>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center">
              <Link href="/signup" className="btn btn-primary btn-lg">Get Started Now →</Link>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
