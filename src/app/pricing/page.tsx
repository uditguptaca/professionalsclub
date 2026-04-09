'use client';
import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';

export default function PricingPage() {
  const plans = [
    { name: 'Free', price: '$0', period: '/forever', desc: 'Get started with basic access', featured: false, features: ['Create profile', 'Community access', 'Discussion forums', '1 free referral request/month', 'Basic chat after match', 'Event browsing', 'Career news access'] },
    { name: 'Starter', price: '$1', period: '/per request', desc: 'Pay only when you need a referral', featured: false, features: ['Everything in Free', 'Pay-per-request referrals', 'Faster matching', 'Verified badge eligibility', '5 requests/month', '3 active chats', 'Priority notifications'] },
    { name: 'Pro', price: '$19', period: '/month', desc: 'For serious job seekers', featured: true, features: ['Everything in Starter', '15 referral requests/month', 'Priority matching queue', 'Resume review tools', 'Advanced analytics', 'Meetup discounts', 'Direct company search'] },
    { name: 'Elite', price: '$49', period: '/month', desc: 'Premium career acceleration', featured: false, features: ['Everything in Pro', '30 referral requests/month', 'Premium company access', 'Concierge support', 'Profile optimization', 'Career coaching perks', 'Priority event access'] },
  ];

  return (
    <>
      <Navbar />
      <div style={{ paddingTop: 100 }}>
        <section className="section">
          <div className="container">
            <div className="section-header">
              <div className="overline">Pricing</div>
              <h2>Simple, <span className="text-gradient">Transparent Pricing</span></h2>
              <p>Start free, pay only when you need premium referral access. Admin can adjust pricing anytime.</p>
            </div>
            <div className="grid grid-4 gap-6" style={{ alignItems: 'start' }}>
              {plans.map(plan => (
                <div key={plan.name} className={`pricing-card ${plan.featured ? 'featured' : ''}`}>
                  <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{plan.name}</h3>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{plan.desc}</p>
                  <div className="price">{plan.price}<span>{plan.period}</span></div>
                  <ul className="features">
                    {plan.features.map(f => (<li key={f}><span className="check">✓</span>{f}</li>))}
                  </ul>
                  <Link href="/signup" className={`btn ${plan.featured ? 'btn-primary' : 'btn-outline'} w-full`}>
                    {plan.name === 'Free' ? 'Get Started' : 'Choose Plan'}
                  </Link>
                </div>
              ))}
            </div>

            {/* Employee Pricing */}
            <div className="card-glass text-center" style={{ marginTop: 'var(--space-12)', padding: 'var(--space-10)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 800, marginBottom: 'var(--space-4)' }}>For Employees & Referrers</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-lg)', marginBottom: 'var(--space-6) '}}>Always free. Earn recognition, badges, and rewards by helping quality candidates.</p>
              <Link href="/for-employees" className="btn btn-accent btn-lg">Join as Referrer — Free</Link>
            </div>

            {/* FAQ */}
            <div style={{ marginTop: 'var(--space-16)', maxWidth: 700, margin: '64px auto 0' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 800, textAlign: 'center', marginBottom: 'var(--space-8)' }}>Pricing FAQ</h3>
              {[
                { q: 'Can admin change the price?', a: 'Yes — admin has full control over global pricing, company-specific pricing, promotional campaigns, and refund rules.' },
                { q: 'What does per-request pricing mean?', a: 'You pay only when you submit a referral request. No monthly commitment. Price varies by company tier.' },
                { q: 'Do employees pay anything?', a: 'No — employees and referrers always join for free. They earn recognition and rewards for quality referrals.' },
                { q: 'Is there a refund policy?', a: 'Yes — if your request expires without a match or is declined, you receive a full refund automatically.' },
              ].map(item => (
                <div key={item.q} className="card" style={{ marginBottom: 'var(--space-3)' }}>
                  <h4 style={{ fontWeight: 700, marginBottom: 'var(--space-2)' }}>{item.q}</h4>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
