import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { Globe } from 'lucide-react';

export default function AboutPage() {
  const pillars = [
    { num: '01', title: 'COMMUNITY BONDING', desc: 'Fostering deep connections among newcomers through engaging networking environments.' },
    { num: '02', title: 'CAREER ADVANCEMENT', desc: 'Delivering targeted mentorship, strategic job referrals, and specialized career development.' },
    { num: '03', title: 'FINANCIAL ACUMEN', desc: 'Comprehensive financial literacy workshops to navigate banking, credit, and investments securely.' },
    { num: '04', title: 'INDUSTRY NETWORKING', desc: 'Cultivating robust professional ties for internationally educated experts across all sectors.' },
    { num: '05', title: 'CULTURAL IMMERSION', desc: 'Guiding seamless adaptation to Canadian workplace norms, social customs, and everyday life.' },
  ];

  const team = [
    { name: 'Udit Gupta', role: 'Software Engineer', company: 'Shopify', linkedin: '#', image: '/founder.png' },
    { name: 'Chintan Trivedi', role: 'Product Manager', company: 'Amazon', linkedin: '#', image: '/founder.png' },
    { name: 'Medha Bhasin', role: 'Data Scientist', company: 'TD Bank', linkedin: '#', image: '/female_placeholder.png' },
    { name: 'Jay Chande', role: 'Marketing Manager', company: 'Google', linkedin: '#', image: '/founder.png' },
    { name: 'Bhavesh Gwalani', role: 'Business Analyst', company: 'RBC', linkedin: '#', image: '/founder.png' },
    { name: 'Meghna Trivedi', role: 'HR Manager', company: 'Scotiabank', linkedin: '#', image: '/female_placeholder.png' },
    { name: 'Jaimin Shah', role: 'Cloud Architect', company: 'AWS', linkedin: '#', image: '/founder.png' },
    { name: 'Chakri Bhamidipati', role: 'Technical Lead', company: 'Microsoft', linkedin: '#', image: '/founder.png' },
    { name: 'Bhupen Garg', role: 'Senior Developer', company: 'IBM', linkedin: '#', image: '/founder.png' },
    { name: 'Kamakshi Khandelwal', role: 'UX Designer', company: 'Canva', linkedin: '#', image: '/female_placeholder.png' },
    { name: 'Piyush Rana', role: 'Sales Director', company: 'Salesforce', linkedin: '#', image: '/founder.png' },
    { name: 'Sagar Gandhi', role: 'Financial Analyst', company: 'KPMG', linkedin: '#', image: '/founder.png' },
    { name: 'Heena Nagrani', role: 'Talent Acquisition', company: 'Deloitte', linkedin: '#', image: '/female_placeholder.png' },
    { name: 'Sharad Gondaliya', role: 'DevOps Engineer', company: 'Cisco', linkedin: '#', image: '/founder.png' },
    { name: 'Pawan Singh', role: 'Network Specialist', company: 'Bell', linkedin: '#', image: '/founder.png' },
    { name: 'Paramdeep', role: 'Scrum Master', company: 'CGI', linkedin: '#', image: '/founder.png' },
    { name: 'Kshamta', role: 'QA Engineer', company: 'OpenText', linkedin: '#', image: '/female_placeholder.png' },
    { name: 'Swati', role: 'Copywriter', company: 'HubSpot', linkedin: '#', image: '/female_placeholder.png' },
    { name: 'Supriya', role: 'Operations', company: 'Telus', linkedin: '#', image: '/female_placeholder.png' },
  ];

  return (
    <>
      <Navbar />

      {/* Hero Section */}
      <section style={{ position: 'relative', minHeight: '90vh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', backgroundColor: '#111827', color: 'white', paddingBottom: 60, overflow: 'hidden', zIndex: 1 }}>
        <Image src="/hero-community.png" alt="Community networking" fill style={{ objectFit: 'cover', opacity: 0.3 }} priority />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(17,24,39,1) 0%, rgba(17,24,39,0.5) 40%, rgba(17,24,39,0.1) 100%)', zIndex: -1 }} />
        
        <div className="container" style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ maxWidth: 900, marginBottom: 80 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#a5b4fc', marginBottom: 20 }}>WHO WE ARE & WHAT WE DO</div>
            <h1 style={{ fontSize: '3.6rem', fontWeight: 800, lineHeight: 1.15, fontFamily: 'var(--font-display)', marginBottom: 24 }}>
              Empowering newcomers through mentorship, dynamic networking, and transformative skills development.
            </h1>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 32, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 40 }}>
            {pillars.map((p) => (
              <div key={p.num} style={{ position: 'relative' }}>
                <div style={{ fontSize: '3.5rem', fontWeight: 300, color: '#e0e7ff', marginBottom: 16, opacity: 0.8, lineHeight: 1 }}>{p.num}</div>
                <h3 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, color: 'white' }}>{p.title}</h3>
                <p style={{ fontSize: '0.85rem', color: '#a5b4fc', lineHeight: 1.6 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section style={{ padding: '120px 0', background: '#f8fafc' }}>
        <div className="container" style={{ maxWidth: 1200, textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 64, color: '#1e293b' }}>
            Meet our leaders and <span style={{ color: '#94a3b8' }}>talented team</span>
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '30px', justifyContent: 'center' }}>
            {team.map((member, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#fff', borderRadius: 16, padding: '32px 20px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', transition: 'transform 0.2s ease, box-shadow 0.2s ease', position: 'relative' }} className="hover:shadow-xl hover:-translate-y-1">
                <div style={{ position: 'absolute', top: 16, right: 16 }}>
                  <Link href={member.linkedin} target="_blank" style={{ color: '#94a3b8', transition: 'color 0.2s' }} className="hover:text-blue-600"><Globe size={18} /></Link>
                </div>
                <div style={{ width: 120, height: 120, borderRadius: '50%', overflow: 'hidden', marginBottom: 20, border: '3px solid #f8fafc', position: 'relative', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                  <Image src={member.image} alt={member.name} fill style={{ objectFit: 'cover' }} />
                </div>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>{member.name}</h4>
                <div style={{ fontSize: '0.85rem', color: '#6366f1', fontWeight: 700, marginBottom: 2 }}>{member.role}</div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>@ {member.company}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Description + Stats Section */}
      <section style={{ position: 'relative', padding: '140px 0', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src="/hero-community.png" alt="Networking skyline" fill style={{ objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,23,42,0.92), rgba(30,27,75,0.85))' }} />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 10, maxWidth: 1200 }}>
          <div style={{ textAlign: 'center', maxWidth: 850, margin: '0 auto 64px' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.3, marginBottom: 32, fontFamily: 'var(--font-display)', color: 'white' }}>
              We are an expansive, inclusive association dedicated to fostering the success of multiple disciplines.
            </h2>
            <p style={{ fontSize: '1.1rem', color: '#cbd5e1', lineHeight: 1.8, marginBottom: 40 }}>
              From CPAs and medical practitioners to engineers, business innovators, and IT authorities, we are deeply committed to empowering diverse groups of newcomers and established professionals alike. By offering strategic guidance through the intricacies of the Canadian job market, we unlock unparalleled potential for every member of our community.
            </p>
            <Link href="/portal/auth" className="btn btn-primary" style={{ padding: '16px 36px', fontSize: '1rem', borderRadius: 12, background: '#4f46e5', color: 'white', fontWeight: 700, display: 'inline-block', boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}>
              Join the Community
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
            {[
              { val: '2,000+', label: 'Members' },
              { val: '100+', label: 'Active Volunteers' },
              { val: '40+', label: 'Yearly Events' },
            ].map((stat, i) => (
              <div key={i} style={{ padding: '40px 24px', textAlign: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
                <div style={{ fontSize: '4rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 8, color: 'white', lineHeight: 1 }}>{stat.val}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#818cf8' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sponsors Section */}
      <section style={{ padding: '80px 0', background: 'white' }}>
        <div className="container" style={{ maxWidth: 1000 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 40 }}>
            <div style={{ maxWidth: 180 }}>
              <p style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500, lineHeight: 1.5 }}>
                We are grateful to our awesome sponsors. <br /><span style={{ color: '#334155' }}>Thank you!</span>
              </p>
            </div>
            {/* Sponsor placeholders */}
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#334155', fontFamily: 'var(--font-display)' }}>TAXACCOUNT</div>
            <div style={{ width: 40, height: 40, border: '2px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 14, height: 14, background: '#334155' }}></div></div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#334155', fontFamily: 'var(--font-display)' }}>UDIT<span style={{ fontWeight: 400 }}>REALESTATE</span></div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#334155', fontFamily: 'var(--font-display)' }}>HR</div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
