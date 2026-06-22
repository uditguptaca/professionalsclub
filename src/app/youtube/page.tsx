'use client';
import React from 'react';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import Image from 'next/image';
import { Briefcase, DollarSign, ShieldCheck, Globe, PlayCircle, ExternalLink, ChevronDown, ChevronUp, MoreVertical } from 'lucide-react';
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

const MOCK_YOUTUBE_VIDEOS = [
  {
    id: 'yt-001',
    title: 'ICP - Bajahan Sandhya in Toronto | A Melodic Evening of Togetherness | Meetup',
    category: 'Career & Job Search',
    video_url: 'https://www.youtube.com/watch?v=BscKxIUNxHs',
    duration: '0:51',
    views: '8 views',
    recorded_date: '5 months ago'
  },
  {
    id: 'yt-002',
    title: 'CPA Canada - CFE Strategy Session - May 2026',
    category: 'Certifications & Licensing',
    video_url: 'https://www.youtube.com/watch?v=ugfNUYxIZL8',
    duration: '1:37:42',
    views: '221 views',
    recorded_date: '8 months ago'
  },
  {
    id: 'yt-003',
    title: 'Partnership & Trust Tax Basics | Canada Tax Series | Lesson 3',
    category: 'Tax & Finance',
    video_url: 'https://www.youtube.com/watch?v=IQQBzD_hnpI',
    duration: '24:50',
    views: '367 views',
    recorded_date: '9 months ago'
  },
  {
    id: 'yt-004',
    title: 'CFA: Preparation, Strategy, and Career Pathways',
    category: 'Certifications & Licensing',
    video_url: 'https://www.youtube.com/watch?v=ugfNUYxIZL8',
    duration: '1:07:14',
    views: '127 views',
    recorded_date: '1 year ago'
  },
  {
    id: 'yt-005',
    title: 'Declaring Bankruptcy and Saving Personal Assets : Strategies and Options',
    category: 'Tax & Finance',
    video_url: 'https://www.youtube.com/watch?v=BscKxIUNxHs',
    duration: '1:03:24',
    views: '94 views',
    recorded_date: '1 year ago'
  },
  {
    id: 'yt-006',
    title: 'How to Become a Mortgage Agent in Ontario?',
    category: 'Career & Job Search',
    video_url: 'https://www.youtube.com/watch?v=ugfNUYxIZL8',
    duration: '24:54',
    views: '548 views',
    recorded_date: '1 year ago'
  },
  {
    id: 'yt-007',
    title: 'Sponsor Parents for Canadian PR, Humanitarian Visa Myths and Super Visa',
    category: 'Immigration & Visas',
    video_url: 'https://www.youtube.com/watch?v=BscKxIUNxHs',
    duration: '25:46',
    views: '202 views',
    recorded_date: '1 year ago'
  },
  {
    id: 'yt-008',
    title: 'Complete Guide : How to Become a Realtor in Canada in Year 2025',
    category: 'Career & Job Search',
    video_url: 'https://www.youtube.com/watch?v=ugfNUYxIZL8',
    duration: '46:38',
    views: '141 views',
    recorded_date: '1 year ago'
  },
  {
    id: 'yt-009',
    title: 'Learn Canadian Corporation Taxes | Canada Tax Series | Lesson 2',
    category: 'Tax & Finance',
    video_url: 'https://www.youtube.com/watch?v=IQQBzD_hnpI',
    duration: '54:27',
    views: '1.3K views',
    recorded_date: '1 year ago'
  }
];

const getYoutubeId = (url: string) => {
  if (!url) return null;
  if (url.includes('watch?v=')) {
    const parts = url.split('watch?v=');
    if (parts[1]) {
      return parts[1].split('&')[0];
    }
  }
  if (url.includes('youtu.be/')) {
    const parts = url.split('youtu.be/');
    if (parts[1]) {
      return parts[1].split('?')[0];
    }
  }
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const getYoutubeThumbnail = (url: string) => {
  const id = getYoutubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=300';
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

        if (data && data.length > 0) {
          setVideos(data);
          const firstCat = data.find(v => v.category)?.category;
          if (firstCat) setExpandedSection(firstCat);
        } else {
          // Fallback to rich mock data if empty or error
          setVideos(MOCK_YOUTUBE_VIDEOS);
          setExpandedSection(MOCK_YOUTUBE_VIDEOS[0].category);
        }
        if (error) console.error('Supabase error:', error);
      } catch (err) {
        console.error('Error connecting to Supabase:', err);
        setVideos(MOCK_YOUTUBE_VIDEOS);
        setExpandedSection(MOCK_YOUTUBE_VIDEOS[0].category);
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

          {/* Featured Video Section */}
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: 20,
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
            marginBottom: 40,
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
          }}>
            <div style={{
              padding: '24px 32px',
              borderBottom: '1px solid var(--border-color)',
              background: 'linear-gradient(135deg, rgba(232, 93, 4, 0.03), transparent)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16,
            }}>
              <div>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: 'var(--primary-600)',
                  letterSpacing: '0.05em',
                  display: 'block',
                  marginBottom: 4
                }}>
                  Featured Session
                </span>
                <h2 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  margin: 0,
                  color: 'var(--text-primary)'
                }}>
                  Learn Canadian Individual Taxes | Lesson 1
                </h2>
              </div>
              <a 
                href="https://www.youtube.com/watch?v=BscKxIUNxHs"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'var(--primary-600)',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                  boxShadow: '0 4px 12px rgba(232, 93, 4, 0.2)',
                }}
              >
                Watch on YouTube <ExternalLink size={14} />
              </a>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 24,
              padding: 32,
            }}>
              {/* Embedded Player */}
              <div style={{
                position: 'relative',
                paddingBottom: '56.25%', // 16:9 ratio
                height: 0,
                borderRadius: 12,
                overflow: 'hidden',
                border: '1px solid var(--border-color)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
              }}>
                <iframe
                  src="https://www.youtube.com/embed/BscKxIUNxHs"
                  title="Learn Canadian Individual Taxes | Canada Tax Series | Lesson 1"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none',
                  }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              {/* Video Info / description */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <p style={{
                  fontSize: '0.92rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.7,
                  margin: '0 0 20px',
                }}>
                  Join CA Azhar Sakrivala (CPA Canada) as he walks through the fundamentals of the Canadian individual tax system. Learn about tax residency, filing requirements, capital gains rules, tax planning accounts (RRSP, TFSA, FHSA), and compliance checklists for newcomers.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                  <div style={{ background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    ⏱️ 57 Minutes
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    👤 By Azhar Sakrivala, CPA
                  </div>
                </div>
              </div>
            </div>
          </div>

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

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                        gap: 24,
                        marginTop: 16
                      }}>
                        {categoryVideos.map((video) => (
                          <a
                            key={video.id}
                            href={video.video_url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              textDecoration: 'none',
                              color: 'inherit',
                              transition: 'all 0.2s ease',
                              cursor: 'pointer',
                            }}
                            className="youtube-video-card hover:-translate-y-1"
                          >
                            {/* Thumbnail Container */}
                            <div style={{
                              position: 'relative',
                              width: '100%',
                              paddingBottom: '56.25%', // 16:9 aspect ratio
                              borderRadius: 12,
                              overflow: 'hidden',
                              background: '#1a1a24',
                              border: '1px solid var(--border-color)',
                              marginBottom: 10,
                            }}>
                              <img 
                                src={getYoutubeThumbnail(video.video_url)} 
                                alt={video.title} 
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=300';
                                }}
                              />
                              
                              {/* Duration Badge */}
                              <div style={{
                                position: 'absolute',
                                bottom: 8,
                                right: 8,
                                background: 'rgba(0,0,0,0.85)',
                                color: 'white',
                                padding: '2px 6px',
                                borderRadius: 4,
                                fontSize: '0.72rem',
                                fontWeight: 700,
                              }}>
                                {video.duration || '24:00'}
                              </div>

                              {/* Hover Play Overlay */}
                              <div className="play-overlay" style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'rgba(0, 0, 0, 0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: 0,
                                transition: 'opacity 0.2s',
                              }}>
                                <PlayCircle size={36} style={{ color: 'white' }} />
                              </div>
                            </div>

                            {/* Details area */}
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', padding: '0 4px' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <h4 style={{
                                  fontWeight: 700,
                                  fontSize: '0.85rem',
                                  color: 'var(--text-primary)',
                                  lineHeight: 1.4,
                                  margin: '0 0 6px',
                                  maxHeight: '2.8em',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                }}>
                                  {video.title}
                                </h4>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                  {video.views || '150 views'} · {video.recorded_date || '1 year ago'}
                                </div>
                              </div>
                              <div style={{ color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }} title="Options">
                                <MoreVertical size={16} />
                              </div>
                            </div>
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
