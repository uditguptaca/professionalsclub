'use client';
import React from 'react';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import Image from 'next/image';
                              padding: '14px 18px',
                              borderRadius: 12,
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
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
                              background: '#fee2e2',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              <PlayCircle size={20} style={{ color: '#dc2626' }} />
                            </div>


                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {video.title}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
                                {video.duration && <span>{video.duration}</span>}
                                {video.duration && video.recorded_date && <span> · </span>}
                                {video.recorded_date && <span>{video.recorded_date}</span>}
                              </div>
                            </div>


                            <ExternalLink size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
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
            <div style={{ marginTop: 48, textAlign: 'center', padding: '40px 32px', borderRadius: 16, background: 'white', border: '1px solid #e2e8f0' }}>
              <PlayCircle size={36} style={{ color: '#dc2626', margin: '0 auto 16px' }} />
              <h3 style={{ fontWeight: 800, fontSize: '1.3rem', color: '#0f172a', marginBottom: 8, fontFamily: 'var(--font-display)' }}>
                Want more content?
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
                Subscribe to our YouTube channel for new sessions, workshops, and expert interviews every week.
              </p>
              <a
                href="https://www.youtube.com/@professionalsclubca"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', background: '#dc2626', color: 'white', borderRadius: 12, fontWeight: 700, textDecoration: 'none' }}
              >
                <PlayCircle size={18} /> Subscribe on YouTube
              </a>
            </div>
          )}
        </div>
      </section>


      <Footer />
    </>
