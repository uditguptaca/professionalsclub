'use client';
import React, { useState } from 'react';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { Briefcase, ExternalLink, Search } from 'lucide-react';

const firms = [
  "Randstad Canada", "Summit Search Group", "Impact Recruitment", "Hays Canada",
  "Goldbeck Recruiting", "Manpower", "Robert Half", "iSQill", "1 Point System LLC",
  "Aaron Consulting Inc.", "Accion Labs", "Affinity", "Alltech Consulting Services Inc.",
  "Alquemy Search & Consulting", "Altis Technology", "Bay Street Staffing", "Calian Group",
  "CBTS", "Collabera Canada Inc.", "CorGTA Inc.", "Dimensional Tech Inc", "Empower Professionals Inc",
  "Epsilon Solutions Ltd.", "Experis", "Finance Professionals Inc.", "Flexstaf I.T. Inc.",
  "GalaxE.Solutions", "GyanSys Inc.", "HRbrain Inc.", "IBISKA", "IDC Technologies, Inc.",
  "iFathom", "Infotek Consulting Inc.", "LanceSoft, Inc.", "Live Assets | I.T. Staffing Solutions",
  "LRO Staffing", "MaxSys Staffing & Consulting", "Nexus Systems Group", "OnX Canada",
  "Orion Innovation", "PrecisionERP", "Procom", "Proviso Consulting", "Quantum Technology Recruiting Inc.",
  "Quantum World Technologies Inc.", "Quarry Consulting", "Seven Hills Group", "Spruce Infotech",
  "Teema", "Tekshapers", "Thomas Technology Partners Inc.", "Tundra Technical Solutions", "VDart",
  "vTech Solution Inc", "Direct IT Recruiting Inc.", "Q1 Technologies", "Clarity Recruitment",
  "Limitless Staffing", "NextGen Consulting", "Xforia Global Talent Solutions", "J&M Group Inc",
  "Astek Canada", "Charger Logistics", "Akkodis", "K+S Potash Canada", "Myticas Consulting",
  "Mentor Tech Source", "Veriday", "Huntel Global", "Canadian Staffing", "emergiTEL", "AddSource"
].sort();

export default function RecruitFirmsPage() {
  const [search, setSearch] = useState('');

  const filteredFirms = firms.filter(firm => 
    firm.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Navbar />

      <main style={{ paddingTop: 120, paddingBottom: 80, minHeight: '100vh', background: '#f8fafc' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', background: 'rgba(56,189,248,0.1)', color: '#0284c7', marginBottom: 20 }}>
              <Briefcase size={32} />
            </div>
            <h1 style={{ fontSize: '3rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 16 }}>
              Recruitment Firms in Canada
            </h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: 700, margin: '0 auto', marginBottom: 32 }}>
              Browse our comprehensive directory of IT recruitment and staffing agencies operating across Canada to accelerate your job search.
            </p>

            <div style={{ position: 'relative', maxWidth: 500, margin: '0 auto' }}>
              <Search style={{ position: 'absolute', top: 14, left: 16, color: '#94a3b8' }} size={20} />
              <input 
                type="text" 
                placeholder="Search recruitment firms..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 44px',
                  borderRadius: 99,
                  border: '1px solid var(--border-color)',
                  background: 'white',
                  fontSize: '1rem',
                  outline: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}
              />
            </div>
          </div>

          <div className="mobile-stack-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {filteredFirms.map((firm, idx) => (
              <div key={idx} style={{ 
                background: 'white', 
                borderRadius: 16, 
                padding: 24, 
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                flexDirection: 'column',
                textAlign: 'center',
                transition: 'transform 0.15s, box-shadow 0.15s'
              }} className="hover:-translate-y-1 hover:shadow-lg">
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, color: '#cbd5e1' }}>
                  <Briefcase size={24} />
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, lineHeight: 1.3 }}>
                  {firm}
                </h3>
                <a 
                  href={`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(firm)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ 
                    marginTop: 'auto',
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: 6,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#0284c7',
                    textDecoration: 'none',
                    padding: '8px 16px',
                    borderRadius: 99,
                    background: 'rgba(56,189,248,0.1)'
                  }}
                  className="hover:bg-sky-100 transition-colors"
                >
                  View LinkedIn <ExternalLink size={14} />
                </a>
              </div>
            ))}
            
            {filteredFirms.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                No recruitment firms found matching your search.
              </div>
            )}
          </div>

        </div>
      </main>

      <Footer />
    </>
  );
}
