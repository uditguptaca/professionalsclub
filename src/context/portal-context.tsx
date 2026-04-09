'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReferralRequest, UserRole, Employee, Company, PricingRule } from '@/types';
import { useApp } from './app-context';

interface PortalContextType {
  requests: ReferralRequest[];
  addRequest: (req: Omit<ReferralRequest, 'id' | 'status' | 'submittedAt' | 'timeline' | 'paymentStatus' | 'priceCharged'>) => void;
  updateRequestStatus: (id: string, status: ReferralRequest['status']) => void;
  employees: Employee[];
  approveEmployee: (id: string) => void;
  companies: Company[];
  pricingRules: PricingRule[];
  updateGlobalPrice: (price: number) => void;
}

const PortalContext = createContext<PortalContextType | undefined>(undefined);

// Initial Mock Data
const MOCK_COMPANIES: Company[] = [
  { id: 'c1', name: 'Google', logo: 'G', domain: 'google.ca', industry: 'Technology', size: '10000+', location: 'Toronto, ON', description: 'Search and cloud', openRoles: 42, activeReferrers: 15, pricingTier: 'premium', pricePerRequest: 3, active: true, featured: true, color: '#4285F4' },
  { id: 'c2', name: 'Amazon', logo: 'A', domain: 'amazon.ca', industry: 'E-commerce', size: '10000+', location: 'Vancouver, BC', description: 'Everything store', openRoles: 105, activeReferrers: 32, pricingTier: 'premium', pricePerRequest: 2, active: true, featured: true, color: '#FF9900' },
  { id: 'c3', name: 'Shopify', logo: 'S', domain: 'shopify.com', industry: 'E-commerce', size: '5000+', location: 'Ottawa, ON', description: 'Commerce platform', openRoles: 18, activeReferrers: 8, pricingTier: 'standard', pricePerRequest: 1, active: true, featured: false, color: '#96BF48' },
];

const MOCK_EMPLOYEES: Employee[] = [
  { id: 'emp1', role: 'employee', email: 'sarah@google.ca', name: 'Sarah Jenkins', status: 'active', createdAt: new Date().toISOString(), verified: true, verificationLevel: 3, companyId: 'c1', companyName: 'Google', workEmail: 'sarah@google.ca', workEmailVerified: true, linkedinUrl: 'linkedin.com/in/sarah', linkedinVerified: true, adminApproved: true, title: 'Senior Engineer', department: 'Cloud', yearsAtCompany: 4, location: 'Toronto', referralAvailable: true, maxWeeklyReferrals: 5, currentWeeklyReferrals: 1, totalReferrals: 12, acceptanceRate: 0.8, avgResponseTime: '12h', bio: '', hiringAreas: ['Engineering'], preferredCandidateLevel: ['Senior'], chatAvailable: true, reputationScore: 95, badges: ['Top Referrer'], leaderboardRank: 2 },
  { id: 'emp2', role: 'employee', email: 'mike@pending.ca', name: 'Mike Ross', status: 'pending', createdAt: new Date().toISOString(), verified: false, verificationLevel: 1, companyId: 'c3', companyName: 'Shopify', workEmail: 'mike@shopify.com', workEmailVerified: true, linkedinUrl: 'linkedin.com/in/mike', linkedinVerified: false, adminApproved: false, title: 'Product Manager', department: 'Core', yearsAtCompany: 1, location: 'Ottawa', referralAvailable: false, maxWeeklyReferrals: 2, currentWeeklyReferrals: 0, totalReferrals: 0, acceptanceRate: 0, avgResponseTime: '-', bio: '', hiringAreas: ['Product'], preferredCandidateLevel: ['Mid-level'], chatAvailable: false, reputationScore: 0, badges: [], leaderboardRank: 0 }
];

const MOCK_REQUESTS: ReferralRequest[] = [
  { id: 'r1', seekerId: 'js1', seekerName: 'John Doe', companyId: 'c1', companyName: 'Google', companyLogo: 'G', jobTitle: 'Frontend Developer', jobUrl: 'careers.google.com/123', jobLocation: 'Toronto', resumeFile: 'resume_v2.pdf', fitSummary: 'I have 5 years of React experience and built scalable systems.', coverNote: 'Would love a referral!', workAuth: 'Citizen', urgency: 'high', portfolioLinks: [], status: 'assigned', submittedAt: new Date(Date.now() - 86400000).toISOString(), priceCharged: 3, paymentStatus: 'paid', matchedEmployeeId: 'emp1', matchedEmployeeName: 'Sarah Jenkins', matchScore: 92, timeline: [{ date: new Date().toISOString(), status: 'assigned', description: 'Matched with Sarah'}] } as any
];

const MOCK_PRICING: PricingRule[] = [
  { id: 'p1', scopeType: 'global', price: 1, currency: 'CAD', chargeEvent: 'on_submit', freeRequests: 2, active: true },
  { id: 'p2', scopeType: 'company', scopeId: 'c1', scopeName: 'Google', price: 3, currency: 'CAD', chargeEvent: 'on_submit', freeRequests: 0, active: true },
  { id: 'p3', scopeType: 'company', scopeId: 'c2', scopeName: 'Amazon', price: 2, currency: 'CAD', chargeEvent: 'on_submit', freeRequests: 0, active: true }
];

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const [requests, setRequests] = useState<ReferralRequest[]>(MOCK_REQUESTS);
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [companies, setCompanies] = useState<Company[]>(MOCK_COMPANIES);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>(MOCK_PRICING);

  const addRequest = (req: Omit<ReferralRequest, 'id' | 'status' | 'submittedAt' | 'timeline' | 'paymentStatus' | 'priceCharged'>) => {
    const newReq: ReferralRequest = {
      ...req,
      id: `r${Date.now()}`,
      status: 'queued',
      submittedAt: new Date().toISOString(),
      timeline: [{ date: new Date().toISOString(), status: 'queued', description: 'Request submitted to matching engine' }],
      paymentStatus: 'pending',
      priceCharged: 1 // default
    };
    setRequests(prev => [newReq, ...prev]);
  };

  const updateRequestStatus = (id: string, status: ReferralRequest['status']) => {
    setRequests(prev => prev.map(r => {
      if (r.id === id) {
        return {
          ...r,
          status,
          timeline: [...r.timeline, { date: new Date().toISOString(), status, description: `Status updated to ${status}` }]
        };
      }
      return r;
    }));
  };

  const approveEmployee = (id: string) => {
    setEmployees(prev => prev.map(e => {
      if (e.id === id) return { ...e, status: 'active', adminApproved: true, verified: true, verificationLevel: 3 };
      return e;
    }));
  };

  const updateGlobalPrice = (price: number) => {
    setPricingRules(prev => prev.map(p => {
      if (p.scopeType === 'global') return { ...p, price };
      return p;
    }));
  };

  return (
    <PortalContext.Provider value={{ requests, addRequest, updateRequestStatus, employees, approveEmployee, companies, pricingRules, updateGlobalPrice }}>
      {children}
    </PortalContext.Provider>
  );
}

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortal must be used within PortalProvider');
  return ctx;
}
