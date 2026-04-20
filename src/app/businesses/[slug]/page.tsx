'use client';
import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import {
  ShieldCheck, Star, Tag, MapPin, Phone, Mail, Globe, Clock, Briefcase,
  ArrowLeft, CheckCircle, ExternalLink, User, Calendar, Target,
} from 'lucide-react';
import { mockBusinesses } from '@/lib/mock-data';

export default function BusinessProfilePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const biz = mockBusinesses.find(b => b.slug === slug);

  if (!biz) {
    return (
      <>
        <Navbar />
        <div style={{ maxWidth: 600, margin: '120px auto', textAlign: 'center', padding: 24 }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 8 }}>Business Not Found</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>The business you&rsquo;re looking for doesn&rsquo;t exist or has been removed.</p>
          <Link href="/businesses" className="btn btn-primary">Back to Directory</Link>
        </div>
      </>
    );
  }

  const initial = biz.name.charAt(0);

  return (
    <>
      <Navbar />

      {/* Cover */}
      <div className="biz-profile-hero">
        {biz.coverImage && <img src={biz.coverImage} alt={biz.name} />}
      </div>

      {/* Header */}
      <div className="biz-profile-header">
        <div className="biz-profile-header-card">
          <div className="biz-profile-logo">{initial}</div>
          <div className="biz-profile-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1>{biz.name}</h1>
              {biz.verificationStatus === 'verified' && <span className="biz-badge biz-badge-verified" style={{ fontSize: '0.7rem' }}><ShieldCheck size={11} /> Verified</span>}
              {biz.isFeatured && <span className="biz-badge biz-badge-featured" style={{ fontSize: '0.7rem' }}><Star size={11} /> Featured</span>}
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: 4 }}>{biz.descriptionShort}</p>
            <div className="biz-profile-meta-row">
              <span><Briefcase size={14} /> {biz.category}</span>
              <span><MapPin size={14} /> {biz.city}, {biz.province}</span>
              <span><Calendar size={14} /> {biz.yearsInBusiness} years in business</span>
              {biz.businessHours && <span><Clock size={14} /> {biz.businessHours}</span>}
            </div>
          </div>
          <div className="biz-profile-ctas">
            <a href={`tel:${biz.phone}`} className="btn btn-primary" style={{ fontSize: '0.82rem' }}><Phone size={14} /> Call Now</a>
            <a href={`mailto:${biz.email}`} className="btn btn-ghost" style={{ fontSize: '0.82rem' }}><Mail size={14} /> Email</a>
            {biz.website && (
              <a href={biz.website} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: '0.82rem' }}><Globe size={14} /> Website</a>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="biz-profile-content">
        {/* Main */}
        <div className="biz-profile-main">
          {/* About */}
          <div className="biz-profile-section">
            <h3>About This Business</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{biz.descriptionFull}</p>
          </div>

          {/* Services */}
          <div className="biz-profile-section">
            <h3><Briefcase size={16} /> Services Offered</h3>
            <div className="biz-services-grid">
              {biz.services.map(s => <span key={s} className="biz-service-tag">{s}</span>)}
            </div>
          </div>

          {/* Pricing */}
          {biz.pricingSummary && (
            <div className="biz-profile-section">
              <h3><Tag size={16} /> Pricing</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{biz.pricingSummary}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="biz-profile-sidebar">
          {/* Member Benefits */}
          {biz.hasMemberRate && (
            <div className="biz-member-rate">
              <div className="biz-member-rate-badge"><Tag size={13} /> {biz.offerBadge || 'Member Rate'}</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Target size={20} className="text-secondary-600" /> Exclusive Member Benefits
              </h3>
              {biz.memberRateText && <p>{biz.memberRateText}</p>}
              {biz.memberBenefits && biz.memberBenefits.length > 0 && (
                <ul className="biz-benefit-list">
                  {biz.memberBenefits.map(b => (
                    <li key={b}><CheckCircle size={14} /> {b}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Contact Info */}
          <div className="biz-profile-section">
            <h3><Phone size={16} /> Contact Information</h3>
            <div className="biz-contact-list">
              <div className="biz-contact-item"><User size={16} /> {biz.contactPerson}</div>
              <div className="biz-contact-item"><Phone size={16} /> <a href={`tel:${biz.phone}`}>{biz.phone}</a></div>
              <div className="biz-contact-item"><Mail size={16} /> <a href={`mailto:${biz.email}`}>{biz.email}</a></div>
              {biz.website && <div className="biz-contact-item"><Globe size={16} /> <a href={biz.website} target="_blank" rel="noopener noreferrer">{biz.website.replace('https://', '')} <ExternalLink size={11} /></a></div>}
              <div className="biz-contact-item"><MapPin size={16} /> {biz.address}, {biz.city}, {biz.province} {biz.postalCode}</div>
              <div className="biz-contact-item"><Briefcase size={16} /> Service Area: {biz.serviceArea}</div>
            </div>
          </div>

          {/* Admin Help CTA */}
          <div className="biz-profile-section" style={{ background: 'var(--gray-50)', borderColor: 'var(--gray-200)' }}>
            <h3 style={{ fontSize: '0.92rem' }}>Need help contacting this business?</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 12 }}>
              Our admin team can help you connect with this business, get quotes, or schedule consultations.
            </p>
            <Link href="/portal/auth" className="btn btn-primary" style={{ width: '100%', textAlign: 'center', fontSize: '0.82rem' }}>
              Ask Admin to Help <ArrowLeft size={14} style={{ transform: 'rotate(180deg)' }} />
            </Link>
          </div>
        </div>
      </div>

      {/* Back Link */}
      <div style={{ maxWidth: 1000, margin: '0 auto 60px', padding: '0 24px' }}>
        <Link href="/businesses" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--primary-600)', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Back to Business Directory
        </Link>
      </div>
    </>
  );
}
