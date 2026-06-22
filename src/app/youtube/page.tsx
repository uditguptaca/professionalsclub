'use client';
import React from 'react';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import Image from 'next/image';
import { Briefcase, DollarSign, ShieldCheck, Globe, PlayCircle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; color: string; bgColor: string; borderColor: string; description: string }> = {
  'Career & Job Search': {
    icon: <Briefcase size={22} />,
    color: '#e85d04',
    bgColor: '#fff7ed',
    borderColor: 'rgba(232, 93, 4, 0.2)',
    description: 'Explore resources to help you navigate the Canadian job market - from building a standout resume and cover letter, to finding freelance or full-time opportunities.',
  },
  'Tax & Finance': {
    icon: <DollarSign size={22} />,
    color: '#0c0c0e',
    bgColor: 'rgba(12, 12, 14, 0.05)',
    borderColor: 'rgba(12, 12, 14, 0.1)',
    description: 'A comprehensive series on understanding the Canadian tax system, CRA filings, partnership structures, and personal finance management.',
  },
  'Certifications & Licensing': {
    icon: <ShieldCheck size={22} />,
    color: '#e85d04',
    bgColor: '#fff7ed',
    borderColor: 'rgba(232, 93, 4, 0.2)',
    description: 'Expert strategy sessions and step-by-step guides on obtaining professional designations like CPA, CFA, or a Real Estate license in Canada.',
  },
  'Immigration & Visas': {
    icon: <Globe size={22} />,
    color: '#0c0c0e',
    bgColor: 'rgba(12, 12, 14, 0.05)',
    borderColor: 'rgba(12, 12, 14, 0.1)',
    description: 'Clarifying common myths and providing walkthroughs for Express Entry profiles, Parent Sponsorships, Super Visas, and the PR process.',
  },
};

const DEFAULT_CONFIG = {
  icon: <PlayCircle size={22} />,
  color: 'var(--text-secondary)',
  bgColor: '#fff7ed',
  borderColor: 'var(--border-color)',
  description: 'Watch our latest videos in this category.',
};

export default function YouTubePage() {
  const [videos, setVideos] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [expandedSection, setExpandedSection] = React.useState<string | null>(null);

  const toggleSection = (category: string) => {
    setExpandedSection(prev => prev === category ? null : category);
  };
  React.useEffect(() => {
    async function fetchVideos() {
      try {
        const { data, error } = await supabase
          .from('youtube_videos')
          .select('*')
          .order('created_at', { ascending: true });

        if (data) {
          setVideos(data);
          const firstCat = data.find(v => v.category)?.category;
          if (firstCat) setExpandedSection(firstCat);
        }
        if (error) console.error('Supabase error:', error);
      } catch (err) {
        console.error('Error connecting to Supabase:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchVideos();
  }, []);

  const groupedVideos = React.useMemo(() => {
    const groups: Record<string, any[]> = {};
    videos.forEach(v => {
      const cat = v.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(v);
    });
    return groups;
  }, [videos]);

  const orderedCategories = React.useMemo(() => {
    const predefined = Object.keys(CATEGORY_CONFIG);
    const all = Object.keys(groupedVideos);
    const ordered = predefined.filter(c => all.includes(c));
    const extras = all.filter(c => !predefined.includes(c));
    return [...ordered, ...extras];
  }, [groupedVideos]);

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section style={{ position: 'relative', paddingTop: 140, paddingBottom: 100, background: '#0c0c0e', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src="/meetup_bg.png" alt="YouTube Archive" fill style={{ objectFit: 'cover', opacity: 0.25 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(12,12,14,0.95), rgba(232,93,4,0.15))' }} />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 10, maxWidth: 900, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(232,93,4,0.08)', padding: '6px 16px', borderRadius: 99, marginBottom: 24, border: '1px solid rgba(232,93,4,0.2)' }}>
            <PlayCircle size={14} style={{ color: 'var(--primary-600)' }} />
            <span style={{ color: 'var(--primary-600)', fontWeight: 700, fontSize: '0.82rem' }}>YouTube Archive</span>
          </div>
          <h1 style={{ fontSize: '3.4rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', marginBottom: 20, lineHeight: 1.15 }}>
            Learn, Watch & <span style={{ color: 'var(--primary-600)' }}>Grow</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: 650, margin: '0 auto' }}>
            Browse our curated video library organized by topic. Find expert sessions, tutorials, and community recordings.
          </p>
        </div>
      </section>

      {/* Category Sections */}
      <section style={{ padding: '48px 0 60px', background: 'var(--bg-secondary)' }}>
        <div className="container" style={{ maxWidth: 900 }}>

          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>Loading videos...</div>
          )}

          {!loading && orderedCategories.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontWeight: 600 }}>
              No videos found. Add videos in your Supabase dashboard!
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {orderedCategories.map((category) => {
              const config = CATEGORY_CONFIG[category] || DEFAULT_CONFIG;
              const isExpanded = expandedSection === category;
              const categoryVideos = groupedVideos[category];

              return (
                <div
                  key={category}
                  style={{
                    borderRadius: 16,
                    border: '1px solid ' + (isExpanded ? config.borderColor : 'var(--border-color)'),
                    background: 'var(--bg-primary)',
                    overflow: 'hidden',
                    transition: 'all 0.25s ease',
                    boxShadow: isExpanded ? '0 4px 20px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  <div
                    onClick={() => toggleSection(category)}
                    style={{
                      padding: '24px 28px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      background: isExpanded ? config.bgColor : 'white',
                      transition: 'background 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: config.bgColor,
                        border: '1px solid ' + (config.borderColor),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: config.color,
                        flexShrink: 0,
                      }}>
                        {config.icon}
                      </div>
                      <div>
                        <h3 style={{ fontWeight: 800, fontSize: '1.1rem', fontFamily: 'var(--font-display)', margin: 0, color: 'var(--text-primary)' }}>
                          {category}
                        </h3>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                          {categoryVideos.length} video{categoryVideos.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div style={{ color: config.color, transition: 'transform 0.2s' }}>
                      {isExpanded ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: '0 28px 28px', borderTop: '1px solid ' + (config.borderColor) }}>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: 20, marginBottom: 24 }}>
                        {config.description}
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {categoryVideos.map((video) => (
                          <a
                            key={video.id}
                            href={video.video_url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 14,
                              padding: '14px 18px',
                              borderRadius: 12,
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border-color)',
                              textDecoration: 'none',
                              transition: 'all 0.2s ease',
                              cursor: 'pointer',
                            }}
                            className="hover:shadow-md hover:-translate-y-0.5"
                          >
                            <div style={{
                              width: 40,
                              height: 40,
                              borderRadius: 10,
                              background: 'var(--primary-50)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              <PlayCircle size={20} style={{ color: 'var(--primary-600)' }} />
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {video.title}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                {video.duration && <span>{video.duration}</span>}
                                {video.duration && video.recorded_date && <span> · </span>}
                                {video.recorded_date && <span>{video.recorded_date}</span>}
                              </div>
                            </div>

                            <ExternalLink size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!loading && orderedCategories.length > 0 && (
            <div style={{ marginTop: 48, textAlign: 'center', padding: '40px 32px', borderRadius: 16, background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
              <PlayCircle size={36} style={{ color: 'var(--primary-600)', margin: '0 auto 16px' }} />
              <h3 style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--text-primary)', marginBottom: 8, fontFamily: 'var(--font-display)' }}>
                Want more content?
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
                Subscribe to our YouTube channel for new sessions, workshops, and expert interviews every week.
              </p>
              <a
                href="https://www.youtube.com/@professionalsclubca"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', background: 'var(--primary-600)', color: 'white', borderRadius: 12, fontWeight: 700, textDecoration: 'none', border: 'none' }}
              >
                <PlayCircle size={18} /> Subscribe on YouTube
              </a>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </>
  );
}
