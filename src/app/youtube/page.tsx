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
    color: '#2563eb',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
    description: 'Explore resources to help you navigate the Canadian job market - from building a standout resume and cover letter, to finding freelance or full-time opportunities.',
  },
  'Tax & Finance': {
    icon: <DollarSign size={22} />,
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    description: 'A comprehensive series on understanding the Canadian tax system, CRA filings, partnership structures, and personal finance management.',
  },
  'Certifications & Licensing': {
    icon: <ShieldCheck size={22} />,
    color: '#9333ea',
    bgColor: '#faf5ff',
    borderColor: '#e9d5ff',
    description: 'Expert strategy sessions and step-by-step guides on obtaining professional designations like CPA, CFA, or a Real Estate license in Canada.',
  },
  'Immigration & Visas': {
    icon: <Globe size={22} />,
    color: '#ea580c',
    bgColor: '#fff7ed',
    borderColor: '#fed7aa',
