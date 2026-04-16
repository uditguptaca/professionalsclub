import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';

export default function SupportPage() {
  const projects = [
    {
      title: 'Educational Advancement Initiative',
      desc: 'Join us in offering workshops that educate newcomers on essential topics like local education systems and professional qualifications.',
      image: '/hero-community.png',
      raised: 0,
      goal: 10000
    },
    {
      title: 'Networking Skills Initiative',
      desc: 'We are dedicated to expanding professional networks and enhancing networking skills among newcomers.',
      image: '/career-mentorship.png',
      raised: 0,
      goal: 10000
    },
    {
      title: 'Life Skills Initiative',
      desc: 'Donations to this initiative will aid in organizing sessions that teach practical life skills, from navigating public transport to understanding local customs.',
      image: '/settlement-guide.png',
      raised: 0,
      goal: 10000
    }
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <Navbar />

      <main style={{ flex: 1, padding: '120px 0 100px 0' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <h1 style={{ fontSize: '3rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: '#0f172a' }}>Support our Projects</h1>
            <p style={{ fontSize: '1.1rem', color: '#64748b', maxWidth: 600, margin: '16px auto 0' }}>
              Your contributions help us deliver critical resources, education, and community building programs for newcomers across Canada.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32 }}>
            {projects.map((project, idx) => (
              <div key={idx} style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative', height: 220, width: '100%' }}>
                  <Image src={project.image} alt={project.title} fill style={{ objectFit: 'cover' }} sizes="(max-width: 768px) 100vw, 33vw" />
                </div>
                
                <div style={{ padding: 24, display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {/* Progress Stats */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 400, color: '#334155', marginBottom: 8, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: '1.8rem', fontWeight: 600, color: '#0f172a' }}>${project.raised.toLocaleString()}</span> 
                      <span style={{ fontSize: '0.9rem', color: '#64748b' }}>of ${project.goal.toLocaleString()} raised</span>
                    </div>
                    {/* Progress Bar Container */}
                    <div style={{ width: '100%', height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${(project.raised / project.goal) * 100}%`, height: '100%', background: '#0ea5e9', borderRadius: 4 }}></div>
                    </div>
                  </div>

                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', marginBottom: 12, lineHeight: 1.3 }}>
                    {project.title}
                  </h3>
                  <p style={{ fontSize: '0.95rem', color: '#64748b', lineHeight: 1.6, marginBottom: 24, flex: 1 }}>
                    {project.desc}
                  </p>

                  <button className="btn" style={{ width: 'fit-content', background: '#1e293b', color: 'white', padding: '12px 24px', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, border: 'none', borderRadius: 6 }}>
                    Donate Now
                  </button>
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
