'use client';
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import {
  Heart, ShieldCheck, Lock, Eye, UserCheck, ArrowRight,
  ChevronDown, ChevronUp, Sparkles, Star, Users, FileCheck, Fingerprint, HeartHandshake, Search, Send, Clock, Globe, MapPin
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';


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

const stats = [
  { value: '500+', label: 'Verified Profiles', icon: Users },
  { value: '50+', label: 'Successful Matches', icon: Heart },
  { value: '10+', label: 'Success Stories', icon: Star },
];

const faqs = [
  {
    q: 'Who can join the Matrimony service?',
    a: 'Any registered member of the Professionals Club who is of legal marriageable age can create a matrimony profile. The service is designed specifically for our professional community.',
  },
  {
    q: 'Is my profile visible to everyone?',
    a: 'No. Your profile is only visible to other verified, approved members on the platform. Your contact details are never shown — they are shared only through our admin-mediated process after mutual interest.',
  },
  {
    q: 'How does the verification process work?',
    a: 'After you submit your profile, our admin team reviews it for authenticity and completeness. This typically takes 1–2 business days. You\'ll be notified once your profile is approved, or if any changes are needed.',
  },
  {
    q: 'Can I control who sees my photos?',
    a: 'Absolutely. You can set your photo visibility to "Visible to all members", "Visible on request only", or "Blurred preview". You maintain complete control.',
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

const MOCK_MATRIMONY_PROFILES = [
  {
    id: 'MI-1659382',
    gender: 'female',
    first_name: 'Preeti',
    dob: '1995-06-15',
    height_cm: 165,
    religion: 'Sikh',
    mother_tongue: 'Punjabi',
    city: 'Toronto',
    province: 'Ontario',
    country: 'Canada',
    nationality: 'British',
    about_me: 'This profile is of my daughter who is a software engineer. She is simple and good looking, family-oriented.',
  },
  {
    id: 'MI-1658464',
    gender: 'female',
    first_name: 'Jasmin',
    dob: '1997-08-20',
    height_cm: 162,
    religion: 'Christian',
    mother_tongue: 'English',
    city: 'Vancouver',
    province: 'British Columbia',
    country: 'Canada',
    nationality: 'Canadian',
    about_me: 'Chartered Accountant working with a Big 4 firm. Caring, family-oriented, settled in British Columbia.',
  },
  {
    id: 'MI-1645718',
    gender: 'female',
    first_name: 'Anjali',
    dob: '1994-11-10',
    height_cm: 168,
    religion: 'Hindu',
    mother_tongue: 'Hindi',
    city: 'Hamilton',
    province: 'Ontario',
    country: 'Canada',
    nationality: 'American',
    about_me: 'This profile is of my sister who is simple and good looking. She is currently residing in Hamilton.',
  },
  {
    id: 'MI-1632385',
    gender: 'male',
    first_name: 'Aman',
    dob: '1992-04-12',
    height_cm: 182,
    religion: 'Sikh',
    mother_tongue: 'Punjabi',
    city: 'Toronto',
    province: 'Ontario',
    country: 'Canada',
    nationality: 'Canadian',
    about_me: 'IT professional settled in Toronto. Looking for an educated and understanding partner.',
  },
  {
    id: 'MI-1321090',
    gender: 'male',
    first_name: 'Rohan',
    dob: '1994-09-05',
    height_cm: 177,
    religion: 'Hindu',
    mother_tongue: 'Gujarati',
    city: 'Brampton',
    province: 'Ontario',
    country: 'Canada',
    nationality: 'Australian',
    about_me: 'Civil engineer working in Brampton. Looking for a companion who shares similar family values.',
  },
  {
    id: 'MI-1283940',
    gender: 'male',
    first_name: 'Kabir',
    dob: '1996-01-25',
    height_cm: 175,
    religion: 'Muslim',
    mother_tongue: 'Urdu',
    city: 'Surrey',
    province: 'British Columbia',
    country: 'Canada',
    nationality: 'Canadian',
    about_me: 'Business analyst working in Surrey. Family-oriented, progressive, settled in BC.',
  }
];

const calculateAge = (dobString: string) => {
  if (!dobString) return 29;
  const birthDate = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const cmToFeetInches = (cm: number) => {
  if (!cm) return "5' 5\"";
  const realInches = cm / 2.54;
  const feet = Math.floor(realInches / 12);
  const inches = Math.round(realInches % 12);
  return `${feet}' ${inches}"`;
};

export default function MatrimonyLandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Profile data state
  const [dbProfiles, setDbProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search Filter State (strictly Canada only)
  const [searchGender, setSearchGender] = useState<string>('female');
  const [searchReligion, setSearchReligion] = useState<string>('any');
  const [searchNationality, setSearchNationality] = useState<string>('any');
  const [minAge, setMinAge] = useState<number>(18);
  const [maxAge, setMaxAge] = useState<number>(50);

  // Active Grid Tab (either brides or grooms)
  const [activeTab, setActiveTab] = useState<'brides' | 'grooms'>('brides');

  // Supabase Fetch
  useEffect(() => {
    async function fetchProfiles() {
      try {
        const { data, error } = await supabase
          .from('matrimony_profiles')
          .select('*')
          .eq('status', 'approved')
          .eq('country', 'Canada'); // strictly Canada only!

        if (data && data.length > 0) {
          setDbProfiles(data);
        } else {
          setDbProfiles(MOCK_MATRIMONY_PROFILES);
        }
        if (error) console.error('Supabase error:', error);
      } catch (err) {
        console.error('Error connecting to Supabase:', err);
        setDbProfiles(MOCK_MATRIMONY_PROFILES);
      } finally {
        setLoading(false);
      }
    }
    fetchProfiles();
  }, []);

  // Filter Profiles
  const filteredProfiles = useMemo(() => {
    return dbProfiles.filter(profile => {
      // 1. Gender filter (either brides or grooms)
      const targetGender = activeTab === 'grooms' ? 'male' : 'female';
      if (profile.gender !== targetGender) {
        return false;
      }
      
      // 2. Nationality filter
      if (searchNationality !== 'any' && profile.nationality?.toLowerCase() !== searchNationality.toLowerCase()) {
        return false;
      }

      // 3. Religion filter
      if (searchReligion !== 'any' && profile.religion?.toLowerCase() !== searchReligion.toLowerCase()) {
        return false;
      }

      // 4. Age filter
      const age = calculateAge(profile.dob);
      if (age < minAge || age > maxAge) {
        return false;
      }

      // 5. Canada Only filter (Enforcing user constraint)
      if (profile.country?.toLowerCase() !== 'canada') {
        return false;
      }

      return true;
    });
  }, [dbProfiles, activeTab, searchNationality, searchReligion, minAge, maxAge]);


  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {/* ═══════ HERO ═══════ */}
      <section style={{
        position: 'relative',
        padding: '140px 0 100px',
        display: 'flex',
        alignItems: 'center',
        background: '#0c0c0e',
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

            {/* Inline stats */}
            <div className="animate-fade-in-up" style={{
              display: 'flex', gap: 48, justifyContent: 'center', marginTop: 64, flexWrap: 'wrap',
            }}>
              {stats.map((s) => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: 'white',
                  }}>{s.value}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--gray-400)', marginTop: 4 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ SEARCH WIDGET ═══════ */}
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
            padding: '24px 32px',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
              flexWrap: 'wrap',
              gap: 12,
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                margin: 0,
              }}>
                <Search size={20} style={{ color: 'var(--primary-600)' }} /> Search for Life Partner in Canada
              </h3>
              <button 
                onClick={() => {
                  setSearchGender('female');
                  setSearchReligion('any');
                  setSearchNationality('any');
                  setMinAge(18);
                  setMaxAge(50);
                  setActiveTab('brides');
                }}
                style={{
                  background: 'rgba(232, 93, 4, 0.08)',
                  border: '1px solid rgba(232, 93, 4, 0.2)',
                  color: 'var(--primary-600)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '6px 12px',
                  borderRadius: 6,
                  transition: 'all 0.2s',
                }}
                className="clear-filters-btn"
              >
                Clear Filters
              </button>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 20,
              alignItems: 'flex-end',
            }}>
              {/* Looking for */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Looking For</label>
                <select 
                  value={searchGender}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchGender(val);
                    setActiveTab(val === 'male' ? 'grooms' : 'brides');
                  }}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                >
                  <option value="female">Female (Bride)</option>
                  <option value="male">Male (Groom)</option>
                </select>
              </div>

              {/* Age Range */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Age Range</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <select 
                    value={minAge}
                    onChange={(e) => setMinAge(Number(e.target.value))}
                    style={{
                      flex: 1,
                      padding: '12px 10px',
                      borderRadius: 10,
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  >
                    {Array.from({ length: 33 }, (_, i) => 18 + i).map(age => (
                      <option key={age} value={age}>{age}</option>
                    ))}
                  </select>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>to</span>
                  <select 
                    value={maxAge}
                    onChange={(e) => setMaxAge(Number(e.target.value))}
                    style={{
                      flex: 1,
                      padding: '12px 10px',
                      borderRadius: 10,
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  >
                    {Array.from({ length: 33 }, (_, i) => 18 + i).map(age => (
                      <option key={age} value={age}>{age}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Religion */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Religion</label>
                <select 
                  value={searchReligion}
                  onChange={(e) => setSearchReligion(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                >
                  <option value="any">Any Religion</option>
                  <option value="Sikh">Sikh</option>
                  <option value="Hindu">Hindu</option>
                  <option value="Christian">Christian</option>
                  <option value="Muslim">Muslim</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Nationality */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Nationality</label>
                <select 
                  value={searchNationality}
                  onChange={(e) => setSearchNationality(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                >
                  <option value="any">Any Nationality</option>
                  <option value="Canadian">Canadian</option>
                  <option value="British">British</option>
                  <option value="American">American</option>
                  <option value="Australian">Australian</option>
                  <option value="Other">Other</option>
                </select>
              </div>


            </div>
            <div style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Globe size={12} /> Strictly displaying profiles residing in <strong>Canada</strong>.
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ PROFILES LISTING GRID ═══════ */}
      <section style={{ padding: '40px 0 80px', background: 'var(--bg-secondary)' }}>
        <div className="container" style={{ maxWidth: 1280, margin: '0 auto', padding: '0 20px' }}>
          
          {/* Tabs */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 16,
            marginBottom: 40,
            borderBottom: '2px solid var(--border-color)',
            paddingBottom: 16,
          }}>
            <button
              onClick={() => {
                setActiveTab('brides');
                setSearchGender('female');
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: '8px 24px',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
                color: activeTab === 'brides' ? 'var(--primary-600)' : 'var(--text-muted)',
                borderBottom: activeTab === 'brides' ? '3px solid var(--primary-600)' : '3px solid transparent',
                marginBottom: '-19px',
                transition: 'all 0.2s',
              }}
            >
              Show All Brides
            </button>
            <button
              onClick={() => {
                setActiveTab('grooms');
                setSearchGender('male');
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: '8px 24px',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
                color: activeTab === 'grooms' ? 'var(--primary-600)' : 'var(--text-muted)',
                borderBottom: activeTab === 'grooms' ? '3px solid var(--primary-600)' : '3px solid transparent',
                marginBottom: '-19px',
                transition: 'all 0.2s',
              }}
            >
              Show All Grooms
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 320px',
            gap: 32,
          }} className="matrimony-grid-container">
            
            {/* Grid listings */}
            <div>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                  Loading profiles...
                </div>
              ) : filteredProfiles.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '60px 24px',
                  background: 'var(--bg-primary)',
                  borderRadius: 16,
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                }}>
                  <p style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: 8 }}>No Matching Profiles Found</p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Try adjusting your search criteria or religion filters.</p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: 24,
                }}>
                  {filteredProfiles.map((profile) => (
                    <div 
                      key={profile.id}
                      style={{
                        background: 'var(--bg-primary)',
                        borderRadius: 16,
                        border: '1px solid var(--border-color)',
                        overflow: 'hidden',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      }}
                      className="profile-card-hover"
                    >
                      {/* Blurred Image / Avatar Header */}
                      <div style={{
                        height: 220,
                        position: 'relative',
                        background: '#1a1a24',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {/* Simulated photo with heavy blur */}
                        <div style={{
                          position: 'absolute',
                          width: '120%',
                          height: '120%',
                          backgroundImage: `url(${profile.gender === 'female' 
                            ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300' 
                            : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300'})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          filter: 'blur(20px) grayscale(20%)',
                          opacity: 0.7,
                        }} />
                        {/* Lock Overlay */}
                        <div style={{
                          position: 'relative',
                          zIndex: 2,
                          textAlign: 'center',
                          padding: 16,
                          background: 'rgba(0, 0, 0, 0.5)',
                          borderRadius: 12,
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          backdropFilter: 'blur(10px)',
                          maxWidth: '80%',
                        }}>
                          <Lock size={20} style={{ color: 'white', margin: '0 auto 8px' }} />
                          <div style={{ color: 'white', fontSize: '0.82rem', fontWeight: 600 }}>Photo Blurred for Privacy</div>
                          <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.7rem', marginTop: 4 }}>Visible to approved members</div>
                        </div>
                        {/* Floating Gender Badge */}
                        <div style={{
                          position: 'absolute',
                          top: 16,
                          left: 16,
                          zIndex: 3,
                          background: profile.gender === 'female' ? '#fdf2f8' : '#eff6ff',
                          color: profile.gender === 'female' ? '#db2777' : '#2563eb',
                          border: `1px solid ${profile.gender === 'female' ? '#fbcfe8' : '#bfdbfe'}`,
                          padding: '4px 10px',
                          borderRadius: 99,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                        }}>
                          {profile.gender === 'female' ? 'Bride' : 'Groom'}
                        </div>
                      </div>

                      {/* Info Card Content */}
                      <div style={{ padding: 24 }}>
                        <div style={{ fontSize: '0.78rem', color: 'var(--primary-600)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>
                          Matrimony ID: {profile.id}
                        </div>
                        <h4 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-primary)' }}>
                          {profile.first_name || 'Verified Member'} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>({calculateAge(profile.dob)} Yrs)</span>
                        </h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                          <div style={{ display: 'flex', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            <span style={{ width: 100, fontWeight: 600 }}>Height:</span>
                            <span>{cmToFeetInches(profile.height_cm)} ({profile.height_cm} cm)</span>
                          </div>
                          <div style={{ display: 'flex', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            <span style={{ width: 100, fontWeight: 600 }}>Religion:</span>
                            <span>{profile.religion || 'No Bar'}</span>
                          </div>
                          <div style={{ display: 'flex', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            <span style={{ width: 100, fontWeight: 600 }}>Nationality:</span>
                            <span>{profile.nationality || 'Canadian'}</span>
                          </div>
                          <div style={{ display: 'flex', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            <span style={{ width: 100, fontWeight: 600 }}>Mother Tongue:</span>
                            <span>{profile.mother_tongue || 'English'}</span>
                          </div>
                          <div style={{ display: 'flex', fontSize: '0.85rem', color: 'var(--text-secondary)', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 100, fontWeight: 600 }}>Residency:</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <MapPin size={14} style={{ color: 'var(--primary-600)' }} /> {profile.city}, {profile.province}, Canada
                            </span>
                          </div>
                        </div>

                        <p style={{
                          fontSize: '0.85rem',
                          color: 'var(--text-muted)',
                          lineHeight: 1.6,
                          borderTop: '1px solid var(--border-color)',
                          paddingTop: 12,
                          marginBottom: 20,
                          height: 64,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                        }}>
                          {profile.about_me || 'No description provided by user.'}
                        </p>

                        <Link 
                          href={`/portal/member/matrimony/profile/${profile.id}`}
                          style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'center',
                            background: 'var(--primary-600)',
                            color: 'white',
                            textDecoration: 'none',
                            padding: '12px',
                            borderRadius: 10,
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            boxShadow: '0 4px 12px rgba(232, 93, 4, 0.15)',
                            transition: 'all 0.2s',
                          }}
                        >
                          Request Full Details
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div>
              {/* Free Platform Card */}
              <div style={{
                background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                borderRadius: 20,
                padding: 28,
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: 24,
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
              }}>
                <Sparkles size={32} style={{ color: 'var(--primary-400)', marginBottom: 16 }} />
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800, color: 'white', marginBottom: 12 }}>
                  100% Free Platform
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.75)', lineHeight: 1.6, marginBottom: 20 }}>
                  Completely free — no premium tiers, no fees, no hidden charges. A genuine community service.
                </p>
                <Link 
                  href="/portal/member/matrimony/create" 
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    background: 'var(--primary-600)',
                    color: 'white',
                    padding: '12px',
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    textDecoration: 'none',
                  }}
                >
                  Create Your Free Profile
                </Link>
              </div>

              {/* Safety guidelines */}
              <div style={{
                background: 'var(--bg-primary)',
                borderRadius: 20,
                padding: 24,
                border: '1px solid var(--border-color)',
              }}>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 800, marginBottom: 14, color: 'var(--text-primary)' }}>
                  Matrimony Guidelines
                </h4>
                <ul style={{ paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <li>All members are verified by Professionals Club admins.</li>
                  <li>Photos are blurred by default for maximum privacy.</li>
                  <li>Contact details are shared only upon mutual consent.</li>
                  <li>This service is strictly for verified residents in Canada.</li>
                </ul>
              </div>
            </div>

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

      {/* ═══════ STATS BANNER ═══════ */}
      <section style={{
        padding: '80px 0',
        background: 'linear-gradient(135deg, var(--primary-600), var(--primary-500))',
        color: 'white',
      }}>
        <div className="container" style={{ maxWidth: 1280 }}>
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 80, flexWrap: 'wrap',
          }}>
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <Icon size={32} style={{ marginBottom: 12, opacity: 0.8 }} />
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: '2.5rem',
                    fontWeight: 900, marginBottom: 4,
                  }}>{s.value}</div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>{s.label}</div>
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
            <Link href="/matrimony/faq" style={{
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
        background: '#0c0c0e',
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
            Join hundreds of verified professionals on their journey to meaningful connections.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/portal/member/matrimony/create" className="btn btn-lg" style={{
              background: 'linear-gradient(135deg, var(--primary-600), var(--primary-50))', color: 'white',
              fontWeight: 700, padding: '16px 36px', fontSize: '1rem', borderRadius: 14,
              boxShadow: '0 8px 30px rgba(232,93,4,0.3)', border: 'none', textDecoration: 'none',
            }}>
              <Heart size={20} /> Create Your Profile
            </Link>
            <Link href="/matrimony/success-stories" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '16px 32px', fontSize: '1rem', borderRadius: 14,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
              color: 'white', fontWeight: 600, textDecoration: 'none',
            }}>
              <Star size={18} /> Success Stories
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
