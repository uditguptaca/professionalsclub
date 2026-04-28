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
    description: 'Essential guides to help you prepare for your move -- visa checklists, document requirements, pre-arrival planning, and everything you need to know before landing in Canada.',
    files: [
      { name: 'Before Moving to Canada Guide', type: 'PDF Document', size: 'Download', url: 'https://docs.google.com/viewer?url=https://raw.githubusercontent.com/uditguptaca/professionalsclub/main/Before-moving-to-Canada.pdf' },
      { name: 'Document List - A Newcomer\'s Complete Guide', type: 'PDF Document', size: 'Download', url: 'https://docs.google.com/viewer?url=https://raw.githubusercontent.com/uditguptaca/professionalsclub/main/Document-List-you-should-bring-with-yourself-to-Canada-%E2%80%93-A-Newcomers-complete-guide-.pdf' }
    ] as { name: string; type: string; size: string; url: string }[],
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
