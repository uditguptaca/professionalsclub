'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePortal } from '@/context/portal-context';
import { useApp } from '@/context/app-context';
import { Building2, Link as LinkIcon, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function SeekerRequestPage() {
  const router = useRouter();
  const { currentUserId } = useApp();
  const { companies, pricingRules, addRequest } = usePortal();
  
  const [step, setStep] = useState(1);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobLocation, setJobLocation] = useState('Remote');
  const [fitSummary, setFitSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);
  const globalPrice = pricingRules.find(p => p.scopeType === 'global')?.price || 1;
  const companyPriceOverride = pricingRules.find(p => p.scopeType === 'company' && p.scopeId === selectedCompanyId);
  
  // Use company-specific price if it exists, otherwise use global base price
  const activePrice = companyPriceOverride ? companyPriceOverride.price : globalPrice;

  const handleNextStep = () => {
    if (step === 1 && selectedCompanyId && jobUrl) {
      // Simulate an internal "job scraper/parser"
      setJobTitle('Senior Product Designer');
      setStep(2);
    } else if (step === 2 && fitSummary.length > 20) {
      setStep(3);
    }
  };

  const submitRequest = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      addRequest({
        seekerId: currentUserId,
        seekerName: 'John Doe',
        companyId: selectedCompanyId,
        companyName: selectedCompany?.name || 'Unknown',
        companyLogo: selectedCompany?.logo || 'C',
        jobUrl,
        jobTitle,
        jobLocation,
        fitSummary,
        coverNote: '',
        resumeFile: 'resume-2026.pdf',
        workAuth: 'Canadian Citizen',
        urgency: 'medium',
        portfolioLinks: [],
      });
      setIsSubmitting(false);
      router.push('/portal/seeker/dashboard');
    }, 1500);
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display mb-2">Request a Referral</h1>
        <p className="text-secondary">Get your resume directly into the hands of employees who can advocate for you.</p>
      </div>

      {/* Progress Tracker */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute left-0 top-1/2 w-full h-1 bg-gray-200 -z-10 -translate-y-1/2"></div>
        <div className="absolute left-0 top-1/2 h-1 bg-primary-500 -z-10 -translate-y-1/2 transition-all duration-300" style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}></div>
        
        {[1, 2, 3].map(i => (
          <div key={i} className={`w-10 h-10 flex items-center justify-center rounded-full font-bold text-sm border-4 border-bg-primary transition-colors ${step >= i ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
            {step > i ? <CheckCircle2 size={20} /> : i}
          </div>
        ))}
      </div>

      <div className="card shadow-lg">
        {step === 1 && (
          <div className="flex flex-col gap-6 animate-slide-right">
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Building2 className="text-primary-400" /> Select Target Company</h2>
              <div className="grid grid-2 gap-4">
                {companies.map(c => (
                  <div 
                    key={c.id} 
                    onClick={() => setSelectedCompanyId(c.id)}
                    className={`card p-4 flex items-center gap-4 cursor-pointer transition-all ${selectedCompanyId === c.id ? 'border-primary-500 bg-primary-500/5 shadow-glow' : 'hover:border-gray-300'}`}
                  >
                    <div className="w-12 h-12 flex items-center justify-center rounded-md font-bold text-lg text-white" style={{ background: c.color }}>
                      {c.logo}
                    </div>
                    <div>
                      <div className="font-bold">{c.name}</div>
                      <div className="text-xs text-secondary mt-1">{c.activeReferrers} referrers available</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="input-group">
              <label>Job Posting URL</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input 
                  type="url" 
                  className="input pl-10" 
                  placeholder="https://careers.company.com/job/123"
                  value={jobUrl}
                  onChange={e => setJobUrl(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted mt-1">Paste the direct link to the job posting. We'll automatically extract the details.</p>
            </div>

            <div className="flex justify-end mt-4">
              <button 
                className="btn btn-primary" 
                disabled={!selectedCompanyId || !jobUrl}
                onClick={handleNextStep}
              >
                Continue to Profile
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-6 animate-slide-right">
            <div className="bg-primary-500/5 border border-primary-500/30 p-4 rounded-lg flex items-start gap-4">
              <CheckCircle2 className="text-primary-600 shrink-0 mt-1" />
              <div>
                <div className="font-bold">Job Successfully Parsed!</div>
                <div className="text-sm text-secondary mt-1">We detected this role as: <strong>{jobTitle}</strong> at <strong>{selectedCompany?.name}</strong>. Now tell the referrer why you're the perfect fit.</div>
              </div>
            </div>

            <div className="input-group">
              <label>Candidate Fit Summary</label>
              <textarea 
                className="input" 
                placeholder="Briefly pitch why you are an excellent candidate for this specific role. (e.g. 'I have 4 years of experience using the exact stack mentioned in the JD...')"
                value={fitSummary}
                onChange={e => setFitSummary(e.target.value)}
                rows={4}
              ></textarea>
              <p className="text-xs text-muted mt-1">This context is shown directly to the employee reviewing your request.</p>
            </div>

            <div className="input-group">
              <label>Resume Selection</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 cursor-not-allowed">
                <Upload className="text-gray-400 mb-2" size={24} />
                <div className="font-medium text-gray-800">Using Default Resume</div>
                <div className="text-xs text-primary-600 mt-1">resume-2026-v2.pdf (Parsed and Verified)</div>
              </div>
            </div>

            <div className="flex justify-between mt-4">
              <button className="btn btn-outline" onClick={() => setStep(1)}>Back</button>
              <button className="btn btn-primary" disabled={fitSummary.length < 20} onClick={handleNextStep}>Review Request</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-6 animate-slide-right">
            <h2 className="text-xl font-bold mb-2">Review & Submit</h2>
            
            <div className="grid grid-2 gap-4">
              <div className="bg-bg-elevated p-4 rounded-lg border border-border-color">
                <div className="text-xs text-muted uppercase tracking-wider mb-1">Target Role</div>
                <div className="font-bold">{jobTitle}</div>
                <div className="text-sm text-secondary mt-1">{selectedCompany?.name}</div>
              </div>
              <div className="bg-bg-elevated p-4 rounded-lg border border-border-color">
                <div className="text-xs text-muted uppercase tracking-wider mb-1">Cost / Token Usage</div>
                <div className="font-bold text-accent-400 flex items-center gap-2">
                  {activePrice > 0 ? `$${activePrice}.00` : 'Free'}
                </div>
                {companyPriceOverride && <div className="text-xs text-warning-400 mt-1">Premium Company Rate</div>}
              </div>
            </div>

            <div className="bg-warning-500/10 border border-warning-500/30 p-4 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-warning-600 shrink-0 mt-0.5" size={18} />
              <div className="text-sm text-warning-900">
                <strong>Important:</strong> Your request will be sent to the matching engine. If an employee accepts, they will review your profile. Fees are refunded if no employee accepts within 7 days.
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button className="btn btn-outline" onClick={() => setStep(2)}>Edit Details</button>
              <button className="btn btn-primary btn-lg" onClick={submitRequest} disabled={isSubmitting}>
                {isSubmitting ? 'Sending to Queue...' : 'Confirm & Request Referral'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
