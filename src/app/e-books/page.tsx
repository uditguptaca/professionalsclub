'use client';
import React, { useState } from 'react';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import Image from 'next/image';
import { BookOpen, Plane, MapPin, ChevronDown, FileText, Download, FolderOpen } from 'lucide-react';


const CATEGORIES = [
  {
    id: 'before-moving',
    title: 'Before Moving To',
    highlight: 'Canada',
    icon: <Plane size={24} />,
    color: '#2563eb',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
    gradientFrom: '#2563eb',
    gradientTo: '#3b82f6',
    description: 'Essential guides to help you prepare for your move - visa checklists, document requirements, pre-arrival planning, and everything you need to know before landing in Canada.',
    files: [ { name: 'Complete Visa Application Checklist', type: 'PDF Document', size: '1.2 MB', url: '#' }, { name: 'Pre-Arrival Packing Guide', type: 'PDF Document', size: '2.4 MB', url: '#' } ] as { name: string; type: string; size: string; url: string }[],
  },
  {
    id: 'after-moving',
    title: 'After Moving To',
    highlight: 'Canada',
    icon: <MapPin size={24} />,
    color: '#059669',
    bgColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    gradientFrom: '#059669',
    gradientTo: '#10b981',
    description: 'Settle into your new life with confidence - housing guides, banking setup, SIN application, tax filing basics, healthcare enrollment, and career kickstart resources.',
    files: [ { name: 'First 30 Days Settlement Guide', type: 'PDF Document', size: '3.1 MB', url: '#' }, { name: 'How to Apply for a SIN Card', type: 'Step-by-step Guide', size: '940 KB', url: '#' } ] as { name: string; type: string; size: string; url: string }[],
  },
];

