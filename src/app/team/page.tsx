import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { Globe } from 'lucide-react';

export default function TeamPage() {
  const leadership = [
    { name: 'Udit Gupta', role: 'Founder & CEO', company: 'Shopify', exp: 'Leading the vision and strategy for Professionals Club. Former engineering at top tech.', linkedin: '#', image: '/founder.png' },
    { name: 'Chintan Trivedi', role: 'Product Manager', company: 'Amazon', exp: 'Driving product development. Former PM for enterprise solutions.', linkedin: '#', image: '/founder.png' },
    { name: 'Medha Bhasin', role: 'Data Scientist', company: 'TD Bank', exp: 'Building data models and platform matching algorithms.', linkedin: '#', image: '/female_placeholder.png' },
    { name: 'Jay Chande', role: 'Marketing Manager', company: 'Google', exp: 'Scaling our community reach and driving member acquisition.', linkedin: '#', image: '/founder.png' }
  ];

  const volunteers = [
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
    { name: 'Supriya', role: 'Operations', company: 'Telus', linkedin: '#', image: '/female_placeholder.png' }
  ];

  return (
    <div style={{ background: '#fcfcfc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1, padding: '120px 0' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 80 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', marginBottom: 12 }}>Our team</div>
            <h1 style={{ fontSize: '3rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: '#0f172a', marginBottom: 20 }}>
              Leadership team
            </h1>
            <p style={{ fontSize: '1.2rem', color: '#475569', maxWidth: 600, margin: '0 auto' }}>
              We're building the future of community support and professional empowerment.
            </p>
          </div>

          {/* Leadership Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '48px 32px', marginBottom: 140 }}>
            {leadership.map((member, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ width: 100, height: 100, borderRadius: '50%', overflow: 'hidden', marginBottom: 20, boxShadow: '0 8px 16px rgba(0,0,0,0.06)' }}>
                  <Image src={member.image} alt={member.name} width={100} height={100} style={{ objectFit: 'cover' }} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{member.name}</h3>
                <div style={{ fontSize: '0.9rem', color: '#4f46e5', fontWeight: 600, marginBottom: 12 }}>{member.role}</div>
                <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6, marginBottom: 20, minHeight: 40 }}>
                  {member.exp}
                </p>
                <div style={{ display: 'flex', gap: 16 }}>
                  <Link href="#" style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 700 }} className="hover:text-blue-500 transition-colors">TW</Link>
                  <Link href={member.linkedin} style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 700 }} className="hover:text-blue-600 transition-colors">IN</Link>
                  <Link href="#" style={{ color: '#94a3b8' }} className="hover:text-gray-800 transition-colors"><Globe size={18} /></Link>
                </div>
              </div>
            ))}
          </div>

          <hr style={{ borderTop: '1px solid #e2e8f0', marginBottom: 100 }} />

          {/* Board Members / Volunteers Header */}
          <div style={{ textAlign: 'center', marginBottom: 80 }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: '#0f172a', marginBottom: 20 }}>
              Volunteers & Mentors
            </h2>
            <p style={{ fontSize: '1.1rem', color: '#475569', maxWidth: 600, margin: '0 auto' }}>
              We're incredibly lucky to be supported by some of the best industry professionals helping build our community.
            </p>
          </div>

          {/* Volunteers Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '48px 24px' }}>
             {volunteers.map((member, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', marginBottom: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                  <Image src={member.image} alt={member.name} width={80} height={80} style={{ objectFit: 'cover' }} />
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>{member.name}</h3>
                <div style={{ fontSize: '0.85rem', color: '#4f46e5', fontWeight: 600, marginBottom: 8 }}>{member.role}</div>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 16 }}>@{member.company}</p>
                <div style={{ display: 'flex', gap: 12 }}>
                  <Link href={member.linkedin} style={{ color: '#cbd5e1', fontSize: '0.9rem', fontWeight: 700 }} className="hover:text-blue-600 transition-colors">IN</Link>
                </div>
              </div>
            ))}
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
