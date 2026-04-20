'use client';
import React from 'react';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';

export default function BuildResumePage() {
  return (
    <>
      <Navbar />

      <main style={{ paddingTop: 120, paddingBottom: 80, minHeight: '100vh', background: 'white' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          
          <div style={{ marginBottom: 40 }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.8, marginBottom: 20 }}>
              Professionals Club, in collaboration with WriteCV.io, is thrilled to present the most advanced and efficient way of crafting your resume. Whether you're an IT professional looking to break into the Canadian job market or a seasoned expert aiming to elevate your career, this partnership introduces cutting-edge tools and techniques to make your resume stand out.
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.8, marginBottom: 20 }}>
              With a focus on precision, modern design, and industry relevance, WriteCV.io provides personalized templates and actionable insights tailored to highlight your skills and achievements. Together, we aim to empower job seekers by bridging the gap between their potential and the expectations of hiring managers.
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.8, fontWeight: 500 }}>
              Ready to impress? Build your future with confidence and let your resume work for you!
            </p>
          </div>

          <div style={{ 
            width: '100%', 
            height: '80vh', 
            borderRadius: 16, 
            overflow: 'hidden', 
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
            border: '1px solid var(--border-color)'
          }}>
            <iframe 
              src="https://writecv.io/" 
              width="100%" 
              height="100%" 
              style={{ border: 'none' }}
              title="WriteCV.io Resume Builder"
              allow="clipboard-write; clipboard-read"
            />
          </div>

        </div>
      </main>

      <Footer />
    </>
  );
}
