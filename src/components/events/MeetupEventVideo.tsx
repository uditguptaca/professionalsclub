'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface MeetupActivity {
  src: string;
  title: string;
  desc: string;
}

const MEETUP_IMAGES: MeetupActivity[] = [
  { src: '/images/networking_mixer_1.png', title: 'Professional Networking Mixer', desc: 'Diverse professionals greeting and talking' },
  { src: '/events-meetup.png', title: 'Community Networking Hub', desc: 'Meeting partners, mentors, and local experts' },
  { src: '/meetup_bg.png', title: 'Interactive Meetup Lounge', desc: 'Greeting and sharing business ideas' },
  { src: '/career-mentorship.png', title: 'Mentorship & Roundtable Sessions', desc: 'Direct career connection and professional guidance' },
  { src: '/volunteer-help.png', title: 'Newcomer Collaborative Circles', desc: 'Volunteers and members greeting and planning together' }
];

export default function MeetupEventVideo() {
  const [activeIndex, setActiveIndex] = useState(0);

  // Rotate images every 1.8s (simulating speed playback)
  useEffect(() => {
    const slideInterval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % MEETUP_IMAGES.length);
    }, 1800);

    return () => clearInterval(slideInterval);
  }, []);

  const getAnimationClass = (index: number) => {
    if (index % 3 === 0) return 'animate-ken-burns-1';
    if (index % 3 === 1) return 'animate-ken-burns-2';
    return 'animate-ken-burns-3';
  };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1, overflow: 'hidden' }}>
      {/* Slideshow simulating professional meetup video */}
      {MEETUP_IMAGES.map((item, idx) => (
        <div
          key={item.src}
          className={`time-lapse-slide ${idx === activeIndex ? 'active' : ''}`}
          style={{ position: 'absolute', inset: 0 }}
        >
          <Image
            src={item.src}
            alt={item.title}
            fill
            priority={idx === 0}
            className={idx === activeIndex ? getAnimationClass(idx) : ''}
            style={{ objectFit: 'cover' }}
            sizes="100vw"
          />
        </div>
      ))}

      {/* Cinematic Tint & Gradient Overlays (combining solid dark overlay + linear gradient for rich contrast) */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(12, 12, 14, 0.4)', // Solid black film to darken images
          zIndex: 2
        }} 
      />
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(12, 12, 14, 0.95) 0%, rgba(12, 12, 14, 0.45) 60%, rgba(232, 93, 4, 0.25) 100%)',
          zIndex: 3
        }} 
      />

      {/* Video HUD Overlays */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none', padding: '24px' }}>
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          


          {/* Bottom Left / Top Right (Mobile): Event Activity HUD */}
          <div className="event-hud">
            <div className="event-hud-count">
              Meetup Feed
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="event-hud-title">
                {MEETUP_IMAGES[activeIndex].title}
              </div>
              <div className="event-hud-subtitle">
                {MEETUP_IMAGES[activeIndex].desc}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
