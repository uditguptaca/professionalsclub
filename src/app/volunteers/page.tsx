'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { Search, MapPin, Building2, Globe, Phone, X, ArrowRight, UserCheck } from 'lucide-react';

const LinkedinIcon = ({ size = 20 }: { size?: number }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

interface Volunteer {
  id: string;
  name: string;
  role: string;
  company: string;
  industry: string;
  city: string;
  province: string;
  bio: string;
  image: string;
  linkedinUrl: string;
  websiteUrl: string;
  phone: string;
  expertise: string[];
  bannerGradient: string;
  verified: boolean;
}

const mockVolunteers: Volunteer[] = [
  {
    id: 'vol-001',
    name: 'Sarah Jenkins',
    role: 'Senior UX Designer',
    company: 'DesignCraft Studio',
    industry: 'Design',
    city: 'Toronto',
    province: 'Ontario',
    bio: 'Specializing in user research, wireframing, and interactive design. Excited to guide newcomers on entering the Canadian creative and product design industries.',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150&h=150',
    linkedinUrl: 'https://linkedin.com',
    websiteUrl: 'https://designcraft.ca',
    phone: '+1-604-555-5679',
    expertise: ['UX Design', 'User Research', 'Figma', 'Product Strategy', 'Creative Portfolio'],
    bannerGradient: 'linear-gradient(135deg, #1e1e24 0%, #e85d04 100%)',
    verified: true
  },
  {
    id: 'vol-002',
    name: 'David Chen',
    role: 'Senior Systems Architect',
    company: 'TechFlow Solutions',
    industry: 'Technology',
    city: 'Calgary',
    province: 'Alberta',
    bio: 'Over 15 years designing scalable cloud infrastructure and enterprise software. Ready to help newcomers with cloud certification pathing and resume updates.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150',
    linkedinUrl: 'https://linkedin.com',
    websiteUrl: 'https://techflow.ca',
    phone: '+1-403-555-0199',
    expertise: ['Cloud Infrastructure', 'System Architecture', 'AWS/Azure', 'DevOps', 'Tech Careers'],
    bannerGradient: 'linear-gradient(135deg, #0f172a 0%, #3b82f6 100%)',
    verified: true
  },
  {
    id: 'vol-003',
    name: 'Amara Okafor',
    role: 'Clinical Nurse Specialist',
    company: 'CareFirst Health',
    industry: 'Healthcare',
    city: 'Ottawa',
    province: 'Ontario',
    bio: 'Passionate healthcare professional with a background in nursing education. Helping foreign-trained medical graduates navigate licensing and credential validation.',
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=150&h=150',
    linkedinUrl: 'https://linkedin.com',
    websiteUrl: 'https://carefirsthealth.ca',
    phone: '+1-613-555-0811',
    expertise: ['Nursing Licensing', 'Credential Evaluation', 'Healthcare Navigation', 'Patient Care', 'Residency Prep'],
    bannerGradient: 'linear-gradient(135deg, #111827 0%, #10b981 100%)',
    verified: true
  },
  {
    id: 'vol-004',
    name: 'Jean-Pierre Dubois',
    role: 'Corporate Legal Counsel',
    company: 'Apex Legal Advisors',
    industry: 'Legal',
    city: 'Montreal',
    province: 'Quebec',
    bio: 'Bilingual legal counsel specializing in corporate governance and contract negotiation. Assisting newcomers in understanding business law and licensing.',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150&h=150',
    linkedinUrl: 'https://linkedin.com',
    websiteUrl: 'https://apexlegal.ca',
    phone: '+1-514-555-0123',
    expertise: ['Corporate Governance', 'Contract Negotiation', 'Business Law', 'Regulatory Compliance', 'Legal Advising'],
    bannerGradient: 'linear-gradient(135deg, #180828 0%, #8b5cf6 100%)',
    verified: true
  },
  {
    id: 'vol-005',
    name: 'Elena Rostova',
    role: 'Principal Financial Analyst',
    company: 'Maple Wealth Management',
    industry: 'Finance',
    city: 'Vancouver',
    province: 'British Columbia',
    bio: 'Chartered Financial Analyst advising high-net-worth clients. Assisting newcomers with Canadian personal finance, investment basics, and wealth planning.',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150&h=150',
    linkedinUrl: 'https://linkedin.com',
    websiteUrl: 'https://maplewealth.ca',
    phone: '+1-604-555-0922',
    expertise: ['CFA Pathways', 'Investment Planning', 'Wealth Management', 'Personal Finance', 'Tax Optimization'],
    bannerGradient: 'linear-gradient(135deg, #3b0764 0%, #f43f5e 100%)',
    verified: true
  },
  {
    id: 'vol-006',
    name: 'Marcus Aurelius',
    role: 'Construction Project Manager',
    company: 'Nova Infrastructure',
    industry: 'Engineering',
    city: 'Halifax',
    province: 'Nova Scotia',
    bio: 'Civil engineer overseeing major highway and transit developments. Happy to counsel engineers on obtaining their P.Eng. designation in Canada.',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150',
    linkedinUrl: 'https://linkedin.com',
    websiteUrl: 'https://novainfra.ca',
    phone: '+1-902-555-0248',
    expertise: ['Civil Engineering', 'Project Management', 'P.Eng Designation', 'Infrastructure Design', 'Safety Regulations'],
    bannerGradient: 'linear-gradient(135deg, #1e3a8a 0%, #06b6d4 100%)',
    verified: true
  },
  {
    id: 'vol-007',
    name: 'Priya Sharma',
    role: 'Marketing Director',
    company: 'Zenith Brand Co',
    industry: 'Marketing',
    city: 'Mississauga',
    province: 'Ontario',
    bio: 'Creative strategist building multi-channel advertising campaigns. Offering resume reviews and networking strategies for aspiring marketers.',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150',
    linkedinUrl: 'https://linkedin.com',
    websiteUrl: 'https://zenithbrand.ca',
    phone: '+1-905-555-0812',
    expertise: ['Brand Strategy', 'Digital Marketing', 'Public Relations', 'Content Creation', 'Campaign Optimization'],
    bannerGradient: 'linear-gradient(135deg, #022c22 0%, #14b8a6 100%)',
    verified: true
  },
  {
    id: 'vol-008',
    name: 'Kenji Sato',
    role: 'DevOps Engineer',
    company: 'CloudScale Technologies',
    industry: 'Technology',
    city: 'Surrey',
    province: 'British Columbia',
    bio: 'Specialist in container orchestration, continuous integration, and Kubernetes pipelines. Assisting tech graduates in starting their Canadian DevOps careers.',
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=150&h=150',
    linkedinUrl: 'https://linkedin.com',
    websiteUrl: 'https://cloudscale.ca',
    phone: '+1-604-555-0723',
    expertise: ['Kubernetes', 'CI/CD Pipelines', 'Docker', 'Automation', 'Infrastructure as Code'],
    bannerGradient: 'linear-gradient(135deg, #4c0519 0%, #db2777 100%)',
    verified: true
  },
  {
    id: 'vol-009',
    name: 'Chloe Dupont',
    role: 'HR Specialist',
    company: 'TalentPulse Consulting',
    industry: 'HR & Recruitment',
    city: 'Quebec City',
    province: 'Quebec',
    bio: 'Recruiter and HR professional helping companies scale. Offering invaluable feedback on resume templates, job hunt strategies, and interview conduct.',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150&h=150',
    linkedinUrl: 'https://linkedin.com',
    websiteUrl: 'https://talentpulse.ca',
    phone: '+1-418-555-0404',
    expertise: ['Resume Formatting', 'Interview Coaching', 'Job Hunt Strategies', 'Talent Acquisition', 'HR Policies'],
    bannerGradient: 'linear-gradient(135deg, #062006 0%, #5e8a11 100%)',
    verified: true
  },
  {
    id: 'vol-010',
    name: 'Mateo Rodriguez',
    role: 'Operations Director',
    company: 'Global Logistics',
    industry: 'Operations',
    city: 'Winnipeg',
    province: 'Manitoba',
    bio: 'Supply chain expert managing cross-border freight. Ready to advise professionals on supply chain logistics pathways and professional certifications.',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150&h=150',
    linkedinUrl: 'https://linkedin.com',
    websiteUrl: 'https://globallogistics.ca',
    phone: '+1-204-555-0505',
    expertise: ['Supply Chain Management', 'Logistics Operations', 'Freight Management', 'Inventory Control', 'Process Optimization'],
    bannerGradient: 'linear-gradient(135deg, #111827 0%, #4b5563 100%)',
    verified: true
  }
];

export default function VolunteerDirectoryPage() {
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [dismissedVolunteers, setDismissedVolunteers] = useState<string[]>([]);
  const [activeVolunteer, setActiveVolunteer] = useState<Volunteer | null>(null);

  const cities = useMemo(() => [...new Set(mockVolunteers.map(v => v.city))].sort(), []);
  const industries = useMemo(() => [...new Set(mockVolunteers.map(v => v.industry))].sort(), []);
  const companies = useMemo(() => [...new Set(mockVolunteers.map(v => v.company))].sort(), []);

  const filteredVolunteers = useMemo(() => {
    return mockVolunteers.filter(v => {
      if (dismissedVolunteers.includes(v.id)) return false;

      const query = search.toLowerCase();
      const matchesSearch = v.name.toLowerCase().includes(query) || 
                            v.role.toLowerCase().includes(query) || 
                            v.company.toLowerCase().includes(query) || 
                            v.industry.toLowerCase().includes(query) ||
                            v.expertise.some(e => e.toLowerCase().includes(query));
      
      const matchesCity = selectedCity ? v.city === selectedCity : true;
      const matchesIndustry = selectedIndustry ? v.industry === selectedIndustry : true;
      const matchesCompany = selectedCompany ? v.company === selectedCompany : true;

      return matchesSearch && matchesCity && matchesIndustry && matchesCompany;
    });
  }, [search, selectedCity, selectedIndustry, selectedCompany, dismissedVolunteers]);

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCity('');
    setSelectedIndustry('');
    setSelectedCompany('');
  };

  const handleResetDismissed = () => {
    setDismissedVolunteers([]);
  };

  return (
    <>
      <Navbar />

      {/* Hero Section */}
      <section className="volunteers-hero-section" style={{ position: 'relative', paddingTop: 160, paddingBottom: 80, background: '#0c0c0e', overflow: 'hidden' }}>
        {/* Background Animation (Volunteers) */}
        <div className="cinematic-bg-container">
          <img 
            src="/volunteer-help.png" 
            alt="Volunteers background" 
            className="cinematic-bg"
            style={{ opacity: 0.42 }}
          />
          <div className="cinematic-overlay" />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 10, maxWidth: 900, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(232,93,4,0.12)', padding: '6px 16px', borderRadius: 99, marginBottom: 20, border: '1px solid rgba(232,93,4,0.2)' }}>
            <UserCheck size={14} style={{ color: 'var(--primary-600)' }} />
            <span style={{ color: 'var(--primary-400)', fontWeight: 700, fontSize: '0.82rem' }}>Community Mentors</span>
          </div>
          <h1 style={{ fontSize: '3.4rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', marginBottom: 16, lineHeight: 1.15 }}>
            Volunteer & Mentor <span style={{ color: 'var(--primary-600)' }}>Directory</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: 650, margin: '0 auto' }}>
            Verified professionals ready to guide you as you build your future in Canada.
          </p>
        </div>
      </section>

      {/* Directory Content */}
      <section style={{ paddingBottom: 100, background: 'var(--bg-primary)' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          
          {/* Filters Bar */}
          <div className="biz-filter-bar" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', padding: '24px 0', borderBottom: '1px solid var(--border-color)', marginBottom: 40 }}>
            <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search volunteers by name, company, role, or skill..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: 99, border: '1.5px solid var(--border-color)', background: 'white', color: 'var(--text-primary)', outline: 'none', fontSize: '0.9rem' }}
              />
            </div>
            
            <select
              value={selectedCity}
              onChange={e => setSelectedCity(e.target.value)}
              style={{ padding: '12px 20px', borderRadius: 99, border: '1.5px solid var(--border-color)', background: 'white', color: 'var(--text-primary)', fontSize: '0.9rem', cursor: 'pointer', outline: 'none' }}
            >
              <option value="">All Cities</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            
            <select
              value={selectedIndustry}
              onChange={e => setSelectedIndustry(e.target.value)}
              style={{ padding: '12px 20px', borderRadius: 99, border: '1.5px solid var(--border-color)', background: 'white', color: 'var(--text-primary)', fontSize: '0.9rem', cursor: 'pointer', outline: 'none' }}
            >
              <option value="">All Industries</option>
              {industries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
            </select>

            <select
              value={selectedCompany}
              onChange={e => setSelectedCompany(e.target.value)}
              style={{ padding: '12px 20px', borderRadius: 99, border: '1.5px solid var(--border-color)', background: 'white', color: 'var(--text-primary)', fontSize: '0.9rem', cursor: 'pointer', outline: 'none' }}
            >
              <option value="">All Companies</option>
              {companies.map(comp => <option key={comp} value={comp}>{comp}</option>)}
            </select>

            {(search || selectedCity || selectedIndustry || selectedCompany) && (
              <button
                onClick={handleResetFilters}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 20px', borderRadius: 99, border: '1.5px solid var(--primary-600)', background: 'rgba(232, 93, 4, 0.05)', color: 'var(--primary-600)', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', outline: 'none', transition: 'background 0.2s' }}
              >
                Reset
              </button>
            )}

            {dismissedVolunteers.length > 0 && (
              <button
                onClick={handleResetDismissed}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 20px', borderRadius: 99, border: '1.5px solid var(--gray-300)', background: 'white', color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', outline: 'none', transition: 'background 0.2s' }}
              >
                Restore Hidden ({dismissedVolunteers.length})
              </button>
            )}

            <div className="biz-results-count" style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 600, marginLeft: 'auto' }}>
              {filteredVolunteers.length} volunteer{filteredVolunteers.length !== 1 ? 's' : ''} found
            </div>
          </div>

          {/* Grid Layout */}
          {filteredVolunteers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-secondary)', borderRadius: 20, border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 8 }}>No volunteers match your search criteria</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 16 }}>Try clearing some filters or restoring hidden profiles.</p>
              <button
                onClick={handleResetFilters}
                style={{ padding: '10px 24px', background: 'var(--primary-600)', color: 'white', border: 'none', borderRadius: 99, fontWeight: 700, cursor: 'pointer' }}
              >
                Clear Search & Filters
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
              {filteredVolunteers.map(vol => (
                <div 
                  key={vol.id} 
                  onClick={() => setActiveVolunteer(vol)}
                  style={{ display: 'flex', flexDirection: 'column', background: 'white', border: '1px solid var(--border-color)', borderRadius: 16, overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: 'var(--shadow-sm)', position: 'relative', cursor: 'pointer' }} 
                  className="hover:-translate-y-1 hover:shadow-md"
                >
                  
                  {/* LinkedIn-style top banner */}
                  <div style={{ height: 70, background: vol.bannerGradient, position: 'relative' }}>
                    {/* Close / Dismiss Icon */}
                    <button
                      title="Hide recommendation"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDismissedVolunteers(prev => [...prev, vol.id]);
                      }}
                      style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0, 0, 0, 0.45)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, outline: 'none' }}
                      className="hover:bg-black/60"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Avatar centered and overlapping */}
                  <div style={{ position: 'relative', marginTop: -38, alignSelf: 'center', width: 76, height: 76, borderRadius: '50%', overflow: 'hidden', border: '3.5px solid white', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                    <img src={vol.image} alt={vol.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>

                  <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', flex: 1, alignItems: 'center', textAlign: 'center' }}>
                    {/* Name & Verified check */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>{vol.name}</div>
                      {vol.verified && (
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="var(--primary-600)" style={{ flexShrink: 0 }}>
                          <title>Verified Volunteer</title>
                          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      )}
                    </div>
                    
                    {/* Headline Role at Company */}
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.35, height: '2.4rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 6 }}>
                      {vol.role} at <span style={{ fontWeight: 700 }}>{vol.company}</span>
                    </div>

                    {/* Location */}
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3, marginBottom: 12 }}>
                      <MapPin size={12} style={{ color: 'var(--primary-600)' }} /> {vol.city}, {vol.province}
                    </div>

                    {/* Prominent LinkedIn-style Connect Button ("Ask for Help") */}
                    <Link 
                      href={`/volunteers/ask-help?volunteerId=${vol.id}`} 
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="btn hover:bg-primary-600 hover:text-white"
                      style={{ 
                        width: '100%', 
                        padding: '8px 0', 
                        fontSize: '0.84rem', 
                        fontWeight: 700, 
                        borderRadius: 20, 
                        border: '1.5px solid var(--primary-600)', 
                        background: 'white', 
                        color: 'var(--primary-600)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: 6, 
                        textDecoration: 'none',
                        transition: 'all 0.2s',
                        marginTop: 'auto'
                      }}
                    >
                      <UserCheck size={14} /> Ask for Help
                    </Link>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>
      </section>

      {/* Volunteer Profile Details Modal */}
      {activeVolunteer && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(12,12,14,0.65)', backdropFilter: 'blur(4px)', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 24, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-color)', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', position: 'relative' }}>
            
            {/* Close Button */}
            <button
              onClick={() => setActiveVolunteer(null)}
              style={{ position: 'absolute', top: 16, right: 16, border: 'none', cursor: 'pointer', color: 'white', zIndex: 10, width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={18} />
            </button>

            {/* Profile Header Background */}
            <div style={{ height: 110, background: activeVolunteer.bannerGradient }} />
            
            <div style={{ padding: '0 32px 32px' }}>
              
              {/* Avatar circle */}
              <div style={{ marginTop: -55, width: 100, height: 100, borderRadius: '50%', overflow: 'hidden', border: '5px solid white', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', marginBottom: 16 }}>
                <img src={activeVolunteer.image} alt={activeVolunteer.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>

              {/* Name & Verified Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', margin: 0 }}>{activeVolunteer.name}</h2>
                {activeVolunteer.verified && (
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="var(--primary-600)" style={{ flexShrink: 0 }}>
                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                )}
              </div>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 20 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-600)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{activeVolunteer.role} at {activeVolunteer.company}</span>
                <span style={{ color: 'var(--gray-300)' }}>•</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={14} style={{ color: 'var(--primary-600)' }} /> {activeVolunteer.city}, {activeVolunteer.province}</span>
              </div>

              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>About Me</h4>
                <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{activeVolunteer.bio}</p>
              </div>

              {/* Skills Tags */}
              <div style={{ marginBottom: 32 }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>Expertise & Help Areas</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {activeVolunteer.expertise.map((tag, i) => (
                    <span key={i} style={{ fontSize: '0.76rem', fontWeight: 600, padding: '6px 12px', borderRadius: 8, background: 'rgba(232,93,4,0.06)', border: '1px solid rgba(232,93,4,0.12)', color: 'var(--primary-700)' }}>{tag}</span>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', gap: 16, borderTop: '1px solid var(--border-color)', paddingTop: 24, alignItems: 'center' }}>
                
                {/* Socials */}
                <div style={{ display: 'flex', gap: 16 }}>
                  <a href={activeVolunteer.linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)' }} className="hover:text-primary-600"><LinkedinIcon size={20} /></a>
                  <a href={activeVolunteer.websiteUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)' }} className="hover:text-primary-600"><Globe size={20} /></a>
                  <a href={`tel:${activeVolunteer.phone}`} style={{ color: 'var(--text-muted)' }} className="hover:text-primary-600"><Phone size={20} /></a>
                </div>

                {/* Main Action */}
                <Link 
                  href={`/volunteers/ask-help?volunteerId=${activeVolunteer.id}`}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '14px 24px', fontSize: '0.9rem', fontWeight: 800, background: 'var(--primary-600)', border: 'none', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'white', textDecoration: 'none' }}
                >
                  Ask for Help <ArrowRight size={16} />
                </Link>
              </div>

            </div>

          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
