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
          


          {/* Bottom Left / Top Right (Mobile): Landmark Label HUD */}
          <div className="landmark-hud">
            <div className="landmark-hud-count">
              Landmark {activeIndex + 1}/{LANDMARKS.length}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="landmark-hud-title">
                {LANDMARKS[activeIndex].name}
              </div>
              <div className="landmark-hud-subtitle">
                {LANDMARKS[activeIndex].location}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
