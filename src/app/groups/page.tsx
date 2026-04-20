'use client';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { ArrowRight, Users, ExternalLink, Shield, MessageCircle, Wallet, Globe, Building2, BookOpen, Home, Dumbbell, Briefcase, TrendingUp, TrendingDown, DollarSign, Coins, MapPin, Landmark, Code, Banknote, BarChart3, ShieldCheck, FileText, GraduationCap, PenSquare, Plane, Baby, Mountain, BrickWall, Scale, Megaphone, ShoppingBag, BookOpenCheck, Truck, UsersRound, HardHat, TreePine, Tent, Palette, Snowflake, Heart, Star, CircleDot } from 'lucide-react';
import React from 'react';

/* ─── DATA ─── */
const MAIN_COMMUNITY = {
  link: 'https://chat.whatsapp.com/LZQxOHMI7tx3vrrXCGXit4',
  members: '5,000+',
};

interface WhatsAppGroup {
  icon: React.ReactNode;
  name: string;
  link: string;
}

interface CommunitySection {
  id: string;
  number: string;
  icon: React.ReactNode;
  title: string;
  participants: string;
  communityLink: string;
  description: string;
  color: string;
  colorLight: string;
  groups: WhatsAppGroup[];
}

const COMMUNITIES: CommunitySection[] = [
  {
    id: 'finance',
    number: '1',
    icon: <Wallet size={28} />,
    title: 'Finance Professionals, Jobs & Queries',
    participants: '1,600+',
    communityLink: 'https://chat.whatsapp.com/LZQxOHMI7tx3vrrXCGXit4',
    description: 'For finance professionals to network, share queries, and find jobs.',
    color: '#059669',
    colorLight: '#d1fae5',
    groups: [
      { icon: <Briefcase size={20} />, name: 'FP&A, IFRS, Accounts, Audit Professionals', link: 'https://bit.ly/ICPAccounts' },
      { icon: <TrendingUp size={20} />, name: 'Finance Queries & Help Group 1', link: 'https://bit.ly/ICPFinance1' },
      { icon: <TrendingDown size={20} />, name: 'Finance Queries & Help Group 2', link: 'https://bit.ly/ICPFinance2' },
      { icon: <DollarSign size={20} />, name: 'Direct Tax Professionals', link: 'https://bit.ly/ICPDirectTax' },
      { icon: <Coins size={20} />, name: 'Indirect Tax Professionals', link: 'https://bit.ly/ICPIndirectTax' },
    ],
  },
  {
    id: 'ca-india',
    number: '2',
    icon: <Globe size={28} />,
    title: 'CA India in Canada',
    participants: '1,200+',
    communityLink: 'https://chat.whatsapp.com/K9k0IBLoEOW3L16gx23b0n',
    description: 'For CAs from India who are already living in Canada.',
    color: '#dc2626',
    colorLight: '#fee2e2',
    groups: [
      { icon: <Globe size={20} />, name: 'CA India in Canada Group 1', link: 'https://bit.ly/ICP_CA' },
      { icon: <Building2 size={20} />, name: 'CA India in Canada Group 2', link: 'https://bit.ly/ICPCA2' },
      { icon: <MapPin size={20} />, name: 'CA India in Vancouver — Meetups & Jobs', link: 'https://bit.ly/ICPvancouver' },
      { icon: <Mountain size={20} />, name: 'CA India in Alberta — Meetups & Jobs', link: 'https://bit.ly/ICPalberta' },
      { icon: <Landmark size={20} />, name: 'CA India in Ottawa — Meetups & Jobs', link: 'https://bit.ly/ICPottawa' },
      { icon: <Home size={20} />, name: 'CA India in Quebec — Meetups & Jobs', link: 'https://bit.ly/ICPquebec' },
      { icon: <FileText size={20} />, name: 'CA India in Ontario — Jobs, Queries & Help', link: 'https://bit.ly/ICPOntario' },
      { icon: <BookOpen size={20} />, name: 'CA Inter | P2 | CPT | Foundation in Canada', link: 'https://bit.ly/ICPInter' },
    ],
  },
  {
    id: 'industry',
    number: '3',
    icon: <Building2 size={28} />,
    title: 'Industry Experts, Jobs & Queries',
    participants: '1,100+',
    communityLink: 'https://chat.whatsapp.com/KrfRAPFxuAjCLrZ97mlGBp',
    description: 'For professionals from various industries to share jobs and knowledge.',
    color: '#6366f1',
    colorLight: '#e0e7ff',
    groups: [
      { icon: <ShieldCheck size={20} />, name: 'Immigration Queries and Professionals', link: 'https://bit.ly/ICPImmigration' },
      { icon: <Code size={20} />, name: 'IT, Software & Tech Professionals', link: 'https://bit.ly/ICP_IT' },
      { icon: <Banknote size={20} />, name: 'Banking Professionals', link: 'https://bit.ly/ICPBanking' },
      { icon: <Home size={20} />, name: 'Mortgage Queries, Deals & Professionals', link: 'https://bit.ly/ICPMortgage' },
      { icon: <BrickWall size={20} />, name: 'Real Estate Queries & Professionals', link: 'https://bit.ly/ICPRealEstate' },
      { icon: <TrendingUp size={20} />, name: 'Business, Enterprise & Self-Employed', link: 'https://bit.ly/ICPBusiness' },
      { icon: <Scale size={20} />, name: 'Lawyers Queries & Professionals', link: 'https://bit.ly/ICPLawyers' },
      { icon: <Megaphone size={20} />, name: 'Sales & Marketing Professionals', link: 'https://bit.ly/ICP_Marketing' },
      { icon: <Shield size={20} />, name: 'Insurance Queries & Professionals', link: 'https://bit.ly/ICPInsurance' },
      { icon: <BarChart3 size={20} />, name: 'Investment Queries & Discussions', link: 'https://bit.ly/ICPInvestement' },
      { icon: <BookOpenCheck size={20} />, name: 'Education & Content Professionals', link: 'https://bit.ly/ICPEducation' },
      { icon: <ShoppingBag size={20} />, name: 'Hospitality & Tourism Professionals', link: 'https://bit.ly/ICPHospitality' },
      { icon: <Truck size={20} />, name: 'Transportation & Logistics Professionals', link: 'https://bit.ly/ICPTransportation' },
      { icon: <UsersRound size={20} />, name: 'Human Resources Professionals', link: 'https://bit.ly/ICPhrprofessionals' },
      { icon: <HardHat size={20} />, name: 'Engineering & Construction Professionals', link: 'https://bit.ly/ICPEngineering' },
    ],
  },
  {
    id: 'study',
    number: '4',
    icon: <BookOpen size={28} />,
    title: 'Study Buddy Community',
    participants: '1,000+',
    communityLink: 'https://chat.whatsapp.com/FgNygqhDLDqEWsQC1xZmHZ',
    description: 'For students preparing for professional exams.',
    color: '#d97706',
    colorLight: '#fef3c7',
    groups: [
      { icon: <BookOpen size={20} />, name: 'CPA Canada Study Group', link: 'https://bit.ly/ICPCPACanada' },
      { icon: <FileText size={20} />, name: 'CPA USA Study Group', link: 'https://bit.ly/ICPCPAUSA' },
      { icon: <GraduationCap size={20} />, name: 'CFA Study Group & Professionals', link: 'https://bit.ly/ICPCFA' },
      { icon: <PenSquare size={20} />, name: 'Students in Canada', link: 'https://bit.ly/ICPCanadaStudent' },
    ],
  },
  {
    id: 'regional',
    number: '5',
    icon: <Home size={28} />,
    title: 'Regional & Family Community',
    participants: '900+',
    communityLink: 'https://chat.whatsapp.com/KIjJ7ybzkhtHSVF6BGlXYK',
    description: 'For people from the same state or city in India now living in Canada.',
    color: '#e11d48',
    colorLight: '#ffe4e6',
    groups: [
      { icon: <Plane size={20} />, name: 'Travel, Food & Leisure', link: 'https://bit.ly/ICPTravel' },
      { icon: <Baby size={20} />, name: 'Parenting Queries & Help', link: 'https://bit.ly/ICPParenting' },
      { icon: <Mountain size={20} />, name: 'Jharkhand की पहाड़ियाँ', link: 'https://bit.ly/ICPJharkhand' },
      { icon: <Landmark size={20} />, name: 'Telangana क चारमीनार', link: 'https://bit.ly/ICPTelangana' },
      { icon: <CircleDot size={20} />, name: 'Odisha क जगन्नाथ पुरी', link: 'https://bit.ly/ICPOdisha' },
      { icon: <Heart size={20} />, name: 'Andhra Pradesh क तिरुपति बालाजी', link: 'https://bit.ly/ICPAndhraPradesh' },
      { icon: <MapPin size={20} />, name: 'Karnataka की सिलिकॉन वैली', link: 'https://bit.ly/ICPKarnataka' },
      { icon: <Star size={20} />, name: 'Bihar का नालंदा विश्वविद्यालय', link: 'https://bit.ly/ICPBihar' },
      { icon: <Star size={20} />, name: 'Uttar Pradesh की राम नगरी', link: 'https://bit.ly/ICPUttarPradesh' },
      { icon: <Palette size={20} />, name: 'Maharashtra की लाइफस्टाइल', link: 'https://bit.ly/ICPMaharashtra' },
      { icon: <Star size={20} />, name: 'Punjab का स्वर्ण मंदिर', link: 'https://bit.ly/ICPPunjab' },
      { icon: <BrickWall size={20} />, name: 'Rajasthan के किले', link: 'https://bit.ly/ICPRajasthan' },
      { icon: <TreePine size={20} />, name: 'Madhya Pradesh के जंगल', link: 'https://bit.ly/ICPMadhyaPradesh' },
      { icon: <Tent size={20} />, name: 'Haryana का कुरुक्षेत्र', link: 'https://bit.ly/ICPHaryana' },
      { icon: <Palette size={20} />, name: 'Gujarat का गरबा', link: 'https://bit.ly/ICPGujrat' },
      { icon: <Landmark size={20} />, name: 'Tamil Nadu के मंदिर', link: 'https://bit.ly/ICPTamilNadu' },
      { icon: <Snowflake size={20} />, name: 'Delhi की सर्दी', link: 'https://bit.ly/ICPDelhi' },
    ],
  },
  {
    id: 'sports',
    number: '6',
    icon: <Dumbbell size={28} />,
    title: 'Sports, Yoga & Meditation',
    participants: '600+',
    communityLink: 'https://chat.whatsapp.com/JhApEAWvGQoAimRT1nBHBl',
    description: 'For sports, fitness, yoga, and meditation enthusiasts.',
    color: '#0891b2',
    colorLight: '#cffafe',
    groups: [
      { icon: <CircleDot size={20} />, name: 'Cricket Group', link: 'https://bit.ly/ICPCricket' },
      { icon: <Dumbbell size={20} />, name: 'Fitness & Sports Group', link: 'https://bit.ly/ICPFitness' },
    ],
  },
];

export default function GroupsPage() {
  return (
    <>
      <Navbar />

      {/* ─── HERO ─── */}
      <section style={{ position: 'relative', paddingTop: 130, paddingBottom: 90, background: '#0f172a', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src="/events-meetup.png" alt="Community" fill style={{ objectFit: 'cover', opacity: 0.2 }} priority />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,23,42,0.97) 0%, rgba(30,41,59,0.85) 50%, rgba(37,99,235,0.2) 100%)' }} />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 10, maxWidth: 1100 }}>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 60, flexWrap: 'wrap' }}>
            
            {/* Left Content */}
            <div style={{ flex: '1 1 500px', textAlign: 'left' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(37,99,235,0.15)', padding: '6px 16px', borderRadius: 99, marginBottom: 24, border: '1px solid rgba(37,99,235,0.3)' }}>
                <MessageCircle size={14} style={{ color: '#93c5fd' }} />
                <span style={{ color: '#93c5fd', fontWeight: 700, fontSize: '0.82rem' }}>WhatsApp Community Groups</span>
              </div>
              <h1 style={{ fontSize: '3.6rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', marginBottom: 16, lineHeight: 1.1 }}>
                Canada&apos;s Biggest <br /><span style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Professional</span> Community
              </h1>
              <p style={{ fontSize: '1.15rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: 680, margin: '0 0 40px 0' }}>
                Join Canada&apos;s largest professional networking platform.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 40, marginTop: 24 }}>
                {[
                  { val: '5,000+', label: 'Participants' },
                  { val: '6', label: 'Communities' },
                  { val: '50+', label: 'WhatsApp Groups' },
                ].map((s, i) => (
                  <div key={i}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'white' }}>{s.val}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Content - Main Community CTA */}
            <div style={{ flex: '1 1 400px', display: 'flex', justifyContent: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(37,211,102,0.08)', padding: '40px 40px', borderRadius: 24, border: '1px solid rgba(37,211,102,0.2)', width: '100%', maxWidth: '440px', backdropFilter: 'blur(10px)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(37,211,102,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#25D366', marginBottom: 16 }}>
                  <MessageCircle size={32} />
                </div>
                <div style={{ fontWeight: 900, fontSize: '1.3rem', color: 'white', marginBottom: 8, fontFamily: 'var(--font-display)', textAlign: 'center' }}>Main Community Channel</div>
                <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: 24, textAlign: 'center' }}>{MAIN_COMMUNITY.members} participants • All groups in one place</div>
                <a href={MAIN_COMMUNITY.link} target="_blank" rel="noopener noreferrer" style={{
                  background: 'linear-gradient(135deg, #25D366, #128C7E)',
                  color: 'white',
                  padding: '16px 36px',
                  borderRadius: 14,
                  fontSize: '1rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  gap: 10,
                  boxShadow: '0 8px 24px rgba(37,211,102,0.3)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  <span style={{ fontSize: '1.05rem' }}>Join Main Community</span>
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── QUICK NAV ─── */}
      <section style={{ padding: '40px 0', background: 'white', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 40, backdropFilter: 'blur(12px)', backgroundColor: 'rgba(255,255,255,0.95)' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {COMMUNITIES.map((c) => (
              <a
                key={c.id}
                href={`#${c.id}`}
                style={{
                  padding: '8px 18px',
                  borderRadius: 99,
                  border: `1px solid ${c.color}30`,
                  background: c.colorLight,
                  color: c.color,
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center' }}>{React.cloneElement(c.icon as React.ReactElement<any>, { size: 16 })}</span> {c.title.split(',')[0]}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMMUNITY SECTIONS ─── */}
      {COMMUNITIES.map((community, idx) => (
        <section
          key={community.id}
          id={community.id}
          style={{
            padding: '40px 0',
            background: idx % 2 === 0 ? '#f8fafc' : 'white',
            scrollMarginTop: 100,
          }}
        >
          <div className="container" style={{ maxWidth: 1100 }}>
            {/* Section Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 36 }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                background: community.colorLight,
                border: `2px solid ${community.color}30`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: community.color,
              }}>
                {community.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '3px 10px', borderRadius: 6, background: community.color, color: 'white', letterSpacing: '0.05em' }}>
                    COMMUNITY {community.number}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: community.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Users size={13} /> {community.participants} participants
                  </span>
                </div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: '#0f172a', marginBottom: 6 }}>
                  {community.title}
                </h2>
                <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: 12 }}>{community.description}</p>
                <a
                  href={community.communityLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 18px',
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #25D366, #128C7E)',
                    color: 'white',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(37,211,102,0.2)',
                  }}
                >
                  <MessageCircle size={14} /> Join Community Channel
                </a>
              </div>
            </div>

            {/* Groups Grid */}
            <div className="mobile-stack-2" style={{
              display: 'grid',
              gridTemplateColumns: community.groups.length <= 4 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
              gap: 12,
            }}>
              {community.groups.map((group, gi) => (
                <a
                  key={gi}
                  href={group.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '16px 18px',
                    borderRadius: 12,
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                  }}
                  onMouseOver={(e: React.MouseEvent<HTMLAnchorElement>) => { (e.currentTarget as HTMLElement).style.borderColor = community.color; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 14px ${community.color}15`; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                  onMouseOut={(e: React.MouseEvent<HTMLAnchorElement>) => { (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', color: community.color, flexShrink: 0 }}>{group.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', lineHeight: 1.3 }}>{group.name}</div>
                  </div>
                  <ExternalLink size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                </a>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* ─── REGISTER AS MEMBER CTA ─── */}
      <section style={{ padding: '40px 0', background: 'linear-gradient(135deg, #0f172a, #1e1b4b)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src="/toronto-skyline.png" alt="Toronto" fill style={{ objectFit: 'cover', opacity: 0.1 }} />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 10, maxWidth: 700, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a5b4fc', margin: '0 auto 16px' }}>
            <UsersRound size={32} />
          </div>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', marginBottom: 16, lineHeight: 1.15 }}>
            Register as a Member
          </h2>
          <p style={{ fontSize: '1.1rem', color: '#94a3b8', marginBottom: 12, lineHeight: 1.7 }}>
            Register to receive exclusive group links directly.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 32, fontSize: '0.85rem', color: '#fbbf24' }}>
            <Shield size={16} /> All group access is managed by admin for safety and quality
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
            <Link href="/portal/signup" className="btn btn-lg" style={{
              background: 'linear-gradient(135deg, #25D366, #128C7E)',
              color: 'white',
              border: 'none',
              padding: '16px 36px',
              fontSize: '1.05rem',
              boxShadow: '0 8px 30px rgba(37,211,102,0.35)',
            }}>
              Register as Member <ArrowRight size={18} />
            </Link>
            <Link href="/portal/auth" className="btn btn-lg mobile-hide" style={{
              background: 'rgba(255,255,255,0.08)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.15)',
              padding: '16px 36px',
            }}>
              Already a Member? Login
            </Link>
          </div>
        </div>
      </section>

      {/* ─── IMPORTANT NOTE ─── */}
      <section style={{ padding: '40px 0', background: '#fef3c7', borderTop: '2px solid #f59e0b' }}>
        <div className="container" style={{ maxWidth: 800, textAlign: 'center' }}>
          <p style={{ fontSize: '0.9rem', color: '#78350f', fontWeight: 600, lineHeight: 1.6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Shield size={16} style={{ color: '#f59e0b' }} /> <strong>Important Note:</strong> Canada residents only (+1 numbers). Others will be removed.
          </p>
        </div>
      </section>

      <Footer />
    </>
  );
}
