'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { HelpCircle, Shield, FileText, BadgeInfo, Scale, DollarSign } from 'lucide-react';

type TabType = 'general' | 'terms' | 'privacy' | 'cookie' | 'refund';

export default function FAQPage() {
  const [activeTab, setActiveTab] = useState<TabType>('general');

  // Sync tab with URL hash if provided
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as TabType;
      if (['general', 'terms', 'privacy', 'cookie', 'refund'].includes(hash)) {
        setActiveTab(hash);
        // Scroll to top of the content card
        const element = document.getElementById('faq-content-anchor');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };

    handleHashChange(); // Run once on load
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const tabs = [
    { id: 'general' as TabType, label: 'General FAQ & Help', icon: <HelpCircle size={18} /> },
    { id: 'terms' as TabType, label: 'Terms of Service', icon: <Scale size={18} /> },
    { id: 'privacy' as TabType, label: 'Privacy Policy', icon: <Shield size={18} /> },
    { id: 'cookie' as TabType, label: 'Cookie Policy', icon: <BadgeInfo size={18} /> },
    { id: 'refund' as TabType, label: 'Refund Policy', icon: <DollarSign size={18} /> },
  ];

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1, paddingTop: 120, paddingBottom: 80 }}>
        <div className="container" style={{ maxWidth: 1000 }}>
          
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h1 style={{ fontSize: '3rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: 16 }}>
              FAQ & Documentation
            </h1>
            <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto' }}>
              Find answers to commonly asked questions, read our platform documentation, and check our policies.
            </p>
          </div>

          {/* Tab Navigation */}
          <div style={{ 
            display: 'flex', 
            gap: 10, 
            marginBottom: 32, 
            overflowX: 'auto', 
            paddingBottom: 8,
            borderBottom: '1px solid var(--border-color)'
          }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  window.history.pushState(null, '', `#${tab.id}`);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 20px',
                  borderRadius: 12,
                  border: 'none',
                  background: activeTab === tab.id ? 'var(--primary-600)' : 'var(--bg-primary)',
                  color: activeTab === tab.id ? 'white' : 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                  boxShadow: activeTab === tab.id ? '0 4px 12px rgba(232,93,4,0.2)' : 'none'
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div id="faq-content-anchor" style={{ scrollMarginTop: 140 }} />

          {/* Main Content Area */}
          <div style={{ 
            background: 'var(--bg-primary)', 
            padding: 40, 
            borderRadius: 24, 
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
            minHeight: 400
          }}>
            
            {/* General FAQ */}
            {activeTab === 'general' && (
              <div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <HelpCircle size={24} style={{ color: 'var(--primary-600)' }} /> General FAQ & Help Center
                </h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {[
                    {
                      q: 'What is Professionals Club?',
                      a: 'Professionals Club is a career and settlement community built to support newcomers and professionals in Canada. We provide job referrals, resume reviews, settlement guidance, mentorship, and community groups to help you build your future here.'
                    },
                    {
                      q: 'Is there really no cost to use the platform?',
                      a: 'Yes, Professionals Club is 100% free to join and use. There are no registration fees, premium tiers, or hidden charges. All our resources, guides, and matrimony portals are offered completely free of charge as a community service.'
                    },
                    {
                      q: 'How does the Help Desk process work?',
                      a: 'Newcomers can submit a help request detailing what they need (e.g. career advice, housing support, tax guidance). The platform securely matches the request with a verified volunteer mentor who has the relevant expertise. All interactions are routed safely to protect your privacy.'
                    },
                    {
                      q: 'How can I volunteer or become a mentor?',
                      a: 'You can apply to volunteer by creating an account and completing the volunteer profile form. Once your background and professional status are verified by our admin team, you can begin receiving case assignments based on your availability and chosen case limit.'
                    },
                    {
                      q: 'Is my personal information kept secure?',
                      a: 'Absolutely. We take your privacy very seriously. Your contact information is never shared with volunteers or third parties without your explicit consent. All communications are mediated through our secure administrative desk.'
                    }
                  ].map((item, idx) => (
                    <div key={idx} style={{ paddingBottom: 20, borderBottom: '1px solid var(--border-color)' }}>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>{item.q}</h4>
                      <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{item.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Terms of Service */}
            {activeTab === 'terms' && (
              <div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Scale size={24} style={{ color: 'var(--primary-600)' }} /> Terms of Service
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <p>Welcome to Professionals Club. By accessing our website, creating an account, or using our services, you agree to comply with and be bound by the following terms and conditions.</p>
                  
                  <h4 style={{ color: 'var(--text-primary)', fontWeight: 800, margin: '12px 0 6px 0' }}>1. Member Conduct</h4>
                  <p>Our platform is built on mutual respect and support. Members must interact in a respectful manner. Harassment, discrimination, spamming, and abusive behavior are strictly prohibited and will result in immediate termination of account access.</p>

                  <h4 style={{ color: 'var(--text-primary)', fontWeight: 800, margin: '12px 0 6px 0' }}>2. Free Community Service</h4>
                  <p>All mentorship, referrals, and resources are provided strictly for free. Members and volunteers are forbidden from charging, requesting payments, or offering commercial services to other members through our platform. Referral services must never be sold or commodified.</p>

                  <h4 style={{ color: 'var(--text-primary)', fontWeight: 800, margin: '12px 0 6px 0' }}>3. Disclaimer of Liabilities</h4>
                  <p>All support is provided by volunteers on an as-is basis. Professionals Club does not guarantee job placements, visa approvals, housing availability, or financial outcomes. Advice given on the platform does not constitute official legal, immigration, or tax advice.</p>
                </div>
              </div>
            )}

            {/* Privacy Policy */}
            {activeTab === 'privacy' && (
              <div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Shield size={24} style={{ color: 'var(--primary-600)' }} /> Privacy Policy
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <p>Professionals Club is committed to protecting your privacy. This policy explains how we collect, protect, and use your personal information.</p>
                  
                  <h4 style={{ color: 'var(--text-primary)', fontWeight: 800, margin: '12px 0 6px 0' }}>1. Information Collection</h4>
                  <p>We collect information you provide voluntarily during registration (such as name, email, LinkedIn URL, and professional background) and case details you submit when requesting support.</p>

                  <h4 style={{ color: 'var(--text-primary)', fontWeight: 800, margin: '12px 0 6px 0' }}>2. How We Use Your Data</h4>
                  <p>Your case details are shared with verified volunteers exclusively to facilitate case matching and support. Your email address and personal contact information are kept private and are never shared without your permission.</p>

                  <h4 style={{ color: 'var(--text-primary)', fontWeight: 800, margin: '12px 0 6px 0' }}>3. Data Security</h4>
                  <p>We implement standard encryption and access control measures to protect your account data. We do not sell or monetize your personal information to third parties.</p>
                </div>
              </div>
            )}

            {/* Cookie Policy */}
            {activeTab === 'cookie' && (
              <div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <BadgeInfo size={24} style={{ color: 'var(--primary-600)' }} /> Cookie Policy
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <p>This policy details how Professionals Club uses cookies and similar tracking technologies on our portal.</p>
                  
                  <h4 style={{ color: 'var(--text-primary)', fontWeight: 800, margin: '12px 0 6px 0' }}>1. Session & Authentication Cookies</h4>
                  <p>We only use essential session cookies. These cookies are required to authenticate your identity when you log in, allowing you to access member directories and request help desks securely.</p>

                  <h4 style={{ color: 'var(--text-primary)', fontWeight: 800, margin: '12px 0 6px 0' }}>2. No Third-Party Tracking</h4>
                  <p>We do not use advertising or behavioral tracking cookies on our platform. Your online activities outside of our portal are not tracked, logged, or recorded.</p>
                </div>
              </div>
            )}

            {/* Refund Policy */}
            {activeTab === 'refund' && (
              <div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <DollarSign size={24} style={{ color: 'var(--primary-600)' }} /> Refund Policy
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <p>Because Professionals Club is a completely free platform run by volunteers, there are no charges, membership fees, or subscription payments. As such, refund terms are governed as follows:</p>
                  
                  <h4 style={{ color: 'var(--text-primary)', fontWeight: 800, margin: '12px 0 6px 0' }}>1. Zero Platform Charges</h4>
                  <p>Since we do not charge for any of our referral, settlement, or mentorship services, refund policies are not applicable to platform usage.</p>

                  <h4 style={{ color: 'var(--text-primary)', fontWeight: 800, margin: '12px 0 6px 0' }}>2. Voluntary Donations</h4>
                  <p>If you made a voluntary financial donation to support our initiative and need assistance or a correction regarding your contribution, please contact our support desk at <a href="mailto:support@professionalsclub.ca" style={{ color: 'var(--primary-600)', textDecoration: 'none' }}>support@professionalsclub.ca</a>.</p>
                </div>
              </div>
            )}

          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
