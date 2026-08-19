'use client';
import React from 'react';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import Image from 'next/image';
import { Briefcase, DollarSign, ShieldCheck, Globe, PlayCircle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { getPublicVideos } from '@/app/actions/public';
import type { PublicVideo } from '@/server/repos/public-content';

const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; color: string; bgColor: string; borderColor: string; description: string }> = {
  'Career & Job Search': {
    icon: <Briefcase size={22} />,
    color: 'var(--text-accent)',
    bgColor: 'var(--bg-secondary)',
    borderColor: 'rgba(232, 93, 4, 0.2)',
    description: 'Explore resources to help you navigate the Canadian job market - from building a standout resume and cover letter, to finding freelance or full-time opportunities.',
  },
  'Tax & Finance': {
    icon: <DollarSign size={22} />,
    color: 'var(--text-primary)',
    bgColor: 'rgba(12, 12, 14, 0.05)',
    borderColor: 'rgba(12, 12, 14, 0.1)',
    description: 'A comprehensive series on understanding the Canadian tax system, CRA filings, partnership structures, and personal finance management.',
  },
  'Certifications & Licensing': {
    icon: <ShieldCheck size={22} />,
    color: 'var(--text-accent)',
    bgColor: 'var(--bg-secondary)',
    borderColor: 'rgba(232, 93, 4, 0.2)',
    description: 'Expert strategy sessions and step-by-step guides on obtaining professional designations like CPA, CFA, or a Real Estate license in Canada.',
  },
  'Immigration & Visas': {
    icon: <Globe size={22} />,
    color: 'var(--text-primary)',
    bgColor: 'rgba(12, 12, 14, 0.05)',
    borderColor: 'rgba(12, 12, 14, 0.1)',
    description: 'Clarifying common myths and providing walkthroughs for Express Entry profiles, Parent Sponsorships, Super Visas, and the PR process.',
  },
};

const DEFAULT_CONFIG = {
  icon: <PlayCircle size={22} />,
  color: 'var(--text-secondary)',
  bgColor: 'var(--bg-secondary)',
  borderColor: 'var(--border-color)',
  description: 'Watch our latest videos in this category.',
};


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

// duration, views and recorded_date are all optional free text on the row. Only
// the ones an admin actually filled in get rendered; nothing is substituted.
const metaFields = (video: PublicVideo) =>
  [video.category, video.duration, video.recorded_date, video.views].filter(
    (v): v is string => Boolean(v && v.trim())
  );

const getYoutubeThumbnail = (url: string) => {
  const id = getYoutubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=300';
};


export default function YouTubePage() {
  const [videos, setVideos] = React.useState<PublicVideo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [expandedSection, setExpandedSection] = React.useState<string | null>(null);

  const toggleSection = (category: string) => {
    setExpandedSection(prev => prev === category ? null : category);
  };
  React.useEffect(() => {
    async function fetchVideos() {
      const rows = await getPublicVideos();
      setVideos(rows);
      const firstCat = rows.find((v) => v.category)?.category;
      if (firstCat) setExpandedSection(firstCat);
      setLoading(false);
    }
    void fetchVideos();
  }, []);

  // youtube_videos has no "featured" column. listVideos() orders by
  // display_order, so the first row is whatever the admin put at the top; skip
  // any row whose URL we cannot turn into an embed id.
  const featured = React.useMemo(() => {
    for (const video of videos) {
      const embedId = getYoutubeId(video.video_url);
      if (embedId) return { video, embedId };
    }
    return null;
  }, [videos]);

  const groupedVideos = React.useMemo(() => {
    const groups: Record<string, PublicVideo[]> = {};
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

      <main id="main">

      {/* Hero */}
      <section style={{ position: 'relative', paddingTop: 140, paddingBottom: 100, background: 'var(--text-primary)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src="/meetup_bg.png" alt="YouTube Archive" fill sizes="100vw" style={{ objectFit: 'cover', opacity: 0.25 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(12,12,14,0.95), rgba(232,93,4,0.15))' }} />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 10, maxWidth: 900, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(232,93,4,0.08)', padding: '6px 16px', borderRadius: 99, marginBottom: 24, border: '1px solid rgba(232,93,4,0.2)' }}>
            <PlayCircle size={14} style={{ color: 'var(--text-accent)' }} />
            <span style={{ color: 'var(--text-accent)', fontWeight: 700, fontSize: '0.82rem' }}>YouTube Archive</span>
          </div>
          <h1 style={{ fontSize: '3.4rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-display)', marginBottom: 20, lineHeight: 1.15 }}>
            Learn, Watch & <span style={{ color: 'var(--text-accent)' }}>Grow</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: 650, margin: '0 auto' }}>
            Browse our curated video library organized by topic. Find expert sessions, tutorials, and community recordings.
          </p>
        </div>
      </section>

      {/* Category Sections */}
      <section style={{ padding: '48px 0 60px', background: 'var(--bg-secondary)' }}>
        <div className="container" style={{ maxWidth: 900 }}>

          {/* Featured Video Section. The table stores no description or author,
              so the block shows only the fields that exist and are filled in. */}
          {featured && (
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
                    color: 'var(--text-accent)',
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
                    {featured.video.title}
                  </h2>
                </div>
                <a
                  href={featured.video.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'var(--primary-700)',
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

              <div style={{ padding: 32 }}>
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
                    src={`https://www.youtube.com/embed/${featured.embedId}`}
                    title={featured.video.title}
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

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 20 }}>
                  {metaFields(featured.video).map(field => (
                    <div key={field} style={{ background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {field}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>Loading videos...</div>
          )}

          {!loading && orderedCategories.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontWeight: 600 }}>
              No videos found. Add videos from the admin portal.
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
                  <button
                    type="button"
                    onClick={() => toggleSection(category)}
                    aria-expanded={isExpanded}
                    style={{
                      width: '100%',
                      padding: '24px 28px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      border: 'none',
                      font: 'inherit',
                      textAlign: 'left',
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
                  </button>

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
                            href={video.video_url}
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
                              background: 'var(--gray-800)',
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
                              
                              {/* Duration Badge, only when the row carries one */}
                              {video.duration && (
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
                                  {video.duration}
                                </div>
                              )}

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
                            <div style={{ padding: '0 4px' }}>
                              <div style={{ minWidth: 0 }}>
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
                                {(video.views || video.recorded_date) && (
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                    {[video.views, video.recorded_date].filter(Boolean).join(' · ')}
                                  </div>
                                )}
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
              <PlayCircle size={36} style={{ color: 'var(--text-accent)', margin: '0 auto 16px' }} />
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
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', background: 'var(--primary-700)', color: 'white', borderRadius: 12, fontWeight: 700, textDecoration: 'none', border: 'none' }}
              >
                <PlayCircle size={18} /> Subscribe on YouTube
              </a>
            </div>
          )}
        </div>
      </section>

      </main>

      <Footer />
    </>
  );
}
