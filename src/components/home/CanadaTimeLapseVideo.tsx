'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface Landmark {
  src: string;
  name: string;
  location: string;
}

const LANDMARKS: Landmark[] = [
  { src: '/images/toronto_skyline_hero.png', name: 'CN Tower & Skyline', location: 'Toronto, Ontario' },
  { src: '/images/niagara_falls_aerial.png', name: 'Niagara Falls', location: 'Niagara, Ontario' },
  { src: '/images/banff_rockies_aerial.png', name: 'Banff National Park', location: 'Rocky Mountains, Alberta' },
  { src: '/images/ottawa_parliament_aerial.png', name: 'Parliament Hill', location: 'Ottawa, Ontario' },
  { src: '/images/vancouver_harbor_aerial.png', name: 'Vancouver Harbor', location: 'Vancouver, British Columbia' },
  { src: '/images/quebec_frontenac_aerial.png', name: 'Château Frontenac', location: 'Quebec City, Quebec' },
  { src: '/images/peggys_cove_aerial.png', name: "Peggy's Cove Lighthouse", location: "Peggy's Cove, Nova Scotia" },
  { src: '/images/hopewell_rocks_aerial.png', name: 'Hopewell Rocks', location: 'Bay of Fundy, New Brunswick' },
  { src: '/images/cabot_trail_aerial.png', name: 'Cabot Trail Scenic Route', location: 'Cape Breton, Nova Scotia' },
  { src: '/images/montreal_skyline_aerial.png', name: 'Montreal Skyline', location: 'Montreal, Quebec' }
];

export default function CanadaTimeLapseVideo() {
  const [activeIndex, setActiveIndex] = useState(0);

  // Rotate images every 1.5s (high speed montage)
  useEffect(() => {
    const slideInterval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % LANDMARKS.length);
    }, 1500);

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
      {LANDMARKS.map((landmark, idx) => (
        <div
          key={landmark.src}
          className={`time-lapse-slide ${idx === activeIndex ? 'active' : ''}`}
          style={{ position: 'absolute', inset: 0 }}
        >
          <Image
            src={landmark.src}
            alt={landmark.name}
            fill
            priority={idx === 0}
            className={idx === activeIndex ? getAnimationClass(idx) : ''}
            style={{ objectFit: 'cover' }}
            sizes="100vw"
          />
        </div>
      ))}

      {/* Cinematic Gradient Overlays (fully transparent in center to showcase day theme) */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(12, 12, 14, 0.45) 0%, rgba(12, 12, 14, 0.1) 40%, rgba(12, 12, 14, 0.3) 70%, rgba(12, 12, 14, 0.95) 100%)',
          zIndex: 3
        }} 
      />

      {/* Fast Time-Lapse HUD Overlays */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none', padding: '24px' }}>
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          


          {/* Bottom Left: Landmark Label HUD */}
          <div style={{
            position: 'absolute',
            bottom: '24px',
            left: '24px',
            background: 'rgba(12, 12, 14, 0.7)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(232, 93, 4, 0.3)',
            borderRadius: '16px',
            padding: '16px 20px',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            maxWidth: '340px'
          }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary-400)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Canadian Landmark {activeIndex + 1} of {LANDMARKS.length}
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, letterSpacing: '-0.01em', fontFamily: 'var(--font-display)' }}>
              {LANDMARKS[activeIndex].name}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>
              {LANDMARKS[activeIndex].location}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
