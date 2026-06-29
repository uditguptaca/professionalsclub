'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface Meetup {
  src: string;
  name: string;
  location: string;
}

const MEETUPS: Meetup[] = [
  { src: '/images/meetup_ontario.png', name: 'Ontario (Toronto)', location: 'CN Tower visible from restaurant window' },
  { src: '/images/meetup_quebec.png', name: 'Quebec (Quebec City)', location: 'Château Frontenac visible from historic dining hall' },
  { src: '/images/meetup_bc.png', name: 'British Columbia (Vancouver)', location: 'Vancouver Harbour visible from waterfront lounge' },
  { src: '/images/meetup_alberta.png', name: 'Alberta (Calgary)', location: 'Calgary Tower visible from downtown hall' },
  { src: '/images/meetup_manitoba.png', name: 'Manitoba (Winnipeg)', location: 'Museum for Human Rights visible from cafe window' },
  { src: '/images/meetup_saskatchewan.png', name: 'Saskatchewan (Regina)', location: 'Legislative Building visible across Wascana Lake' },
  { src: '/images/meetup_novascotia.png', name: 'Nova Scotia (Halifax)', location: 'Citadel Hill & Town Clock visible from bistro window' },
  { src: '/images/meetup_newbrunswick.png', name: 'New Brunswick (Fredericton)', location: 'Legislative Assembly visible from cafe window' },
  { src: '/images/meetup_pei.png', name: 'Prince Edward Island (Charlottetown)', location: 'Province House visible from restaurant window' },
  { src: '/images/meetup_newfoundland.png', name: 'Newfoundland & Labrador (St. John\'s)', location: 'Signal Hill & Cabot Tower visible from harbour bistro' }
];

export default function CanadaTimeLapseVideo() {
  const [activeIndex, setActiveIndex] = useState(0);

  // Rotate images every 1.8s (montage)
  useEffect(() => {
    const slideInterval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % MEETUPS.length);
    }, 1800);

    return () => clearInterval(slideInterval);
  }, []);

  // Assign different Ken Burns animations for rotation variety
  const getAnimationClass = (index: number) => {
    if (index % 3 === 0) return 'animate-ken-burns-1';
    if (index % 3 === 1) return 'animate-ken-burns-2';
    return 'animate-ken-burns-3';
  };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1, overflow: 'hidden' }}>
      {/* Slideshow of images acting as a high-speed drone footage */}
      {MEETUPS.map((meetup, idx) => (
        <div
          key={meetup.src}
          className={`time-lapse-slide ${idx === activeIndex ? 'active' : ''}`}
          style={{ position: 'absolute', inset: 0 }}
        >
          <Image
            src={meetup.src}
            alt={meetup.name}
            fill
            priority={idx === 0}
            className={idx === activeIndex ? getAnimationClass(idx) : ''}
            style={{ objectFit: 'cover' }}
            sizes="100vw"
          />
        </div>
      ))}

      {/* Cinematic Tint & Gradient Overlays (combining solid dark overlay + linear gradients for rich contrast) */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(12, 12, 14, 0.45)', // Solid black film to darken bright images
          zIndex: 2
        }} 
      />
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to right, rgba(12, 12, 14, 0.65) 0%, rgba(12, 12, 14, 0.2) 60%, rgba(12, 12, 14, 0.45) 100%)', // Darker film on the left for text readability
          zIndex: 3
        }} 
      />
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(12, 12, 14, 0.4) 0%, transparent 40%, rgba(12, 12, 14, 0.3) 70%, rgba(12, 12, 14, 0.95) 100%)', // Vertical blend
          zIndex: 3
        }} 
      />

      {/* Fast Time-Lapse HUD Overlays */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none', padding: '24px' }}>
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          
          {/* Bottom Left / Top Right (Mobile): Meetup HUD */}
          <div className="landmark-hud">
            <div className="landmark-hud-count">
              Meetup {activeIndex + 1}/{MEETUPS.length}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="landmark-hud-title">
                {MEETUPS[activeIndex].name}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
