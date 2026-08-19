'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePortal } from '@/context/portal-context';
import { useApp } from '@/context/app-context';
import { submitVolunteerApplication } from '@/app/actions/portal';
import { AttachmentField, type Attachment } from '@/components/portal/AttachmentField';
import { SUPPORT_CATEGORIES } from '@/types';
import { CheckCircle2, ArrowLeft, ArrowRight, Shield, HandHeart, Check } from 'lucide-react';

export default function VolunteerApplicationPage() {
  const router = useRouter();
  const { profile, currentUserId } = useApp();
  const { volunteerApps, refresh } = usePortal();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Check if already applied
  const existingApp = volunteerApps.find(a => a.memberId === currentUserId);

  // Identity comes from the signed-in member's profile. These were hardcoded
  // sample values, so every applicant submitted the same stranger's details.
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pcNumber, setPcNumber] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [profession, setProfession] = useState('');
  const [organization, setOrganization] = useState('');
  const [experience, setExperience] = useState(0);
  const [areas, setAreas] = useState<string[]>([]);
  const [languages, setLanguages] = useState('English');
  const [availability, setAvailability] = useState('');
  const [maxCases, setMaxCases] = useState(2);
  const [mentorship, setMentorship] = useState(false);
  const [motivation, setMotivation] = useState('');
  const [expSummary, setExpSummary] = useState('');
  const [documents, setDocuments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(0);
  const [agreedRules, setAgreedRules] = useState(false);
  const [agreedNoContact, setAgreedNoContact] = useState(false);
  const [agreedAdmin, setAgreedAdmin] = useState(false);
  const [consentScreen, setConsentScreen] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.firstName ?? '');
    setLastName(profile.lastName ?? '');
    setEmail(profile.email ?? '');
    setPhone(profile.phone ?? '');
    setPcNumber(profile.pcNumber ?? '');
    setCity(profile.city ?? '');
    setProvince(profile.province ?? '');
    // Prefill the professional fields the signup wizard already collected.
    setProfession((prev) => prev || profile.jobTitle || '');
    setOrganization((prev) => prev || profile.company || '');
    setLinkedinUrl((prev) => prev || profile.linkedinUrl || '');
  }, [profile]);

  if (existingApp) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: existingApp.status === 'approved' ? 'var(--success-600)' : 'rgba(245,158,11,0.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          {existingApp.status === 'approved' ? <CheckCircle2 size={28} style={{ color: 'white' }} /> : <HandHeart size={28} style={{ color: 'var(--accent-700)' }} />}
        </div>
        <h1 className="text-2xl font-bold font-display mb-3">
          {existingApp.status === 'approved' ? 'You are an Approved Volunteer!' : 'Application Submitted'}
        </h1>
        <p className="text-secondary mb-6">
          {existingApp.status === 'approved'
            ? 'Your volunteer application has been approved. Visit your volunteer dashboard to see assigned cases.'
            : `Your application is currently: ${existingApp.status.replace(/_/g, ' ')}. Our team will review it and get back to you.`}
        </p>
        <button className="btn btn-primary" onClick={() => router.push('/portal/member/my-volunteer')}>
          View Volunteer Dashboard
        </button>
      </div>
    );
  }

  const toggleArea = (cat: string) => {
    setAreas(a => a.includes(cat) ? a.filter(c => c !== cat) : [...a, cat]);
  };

  const handleSubmit = async () => {
    // Submitting mid-upload would drop the CV that is still in flight.
    if (isSubmitting || uploading > 0) return;
    setIsSubmitting(true);
    setSubmitError('');

    // The action is called directly rather than through usePortal because the
    // context helper returns void: this page used to redirect to the volunteer
    // dashboard whether or not the application was written.
    //
    // member_id is stamped server-side from the session; the value here is ignored.
    const result = await submitVolunteerApplication({
      memberName: `${firstName} ${lastName}`.trim(),
      email, phone, pcNumber, city, province,
      linkedinUrl, currentProfession: profession, organization, yearsExperience: experience,
      expertiseAreas: areas, languages: languages.split(',').map(l => l.trim()),
      availability, maxCasesPerMonth: maxCases,
      mentorshipInterest: mentorship, referralSupportInterest: areas.includes('Job Referrals and Placement Assistance'),
      resumeReviewInterest: areas.includes('Resume and Cover Letter Review'),
      settlementSupportInterest: areas.includes('Newcomer Settlement Support'),
      taxGuidanceInterest: areas.includes('Tax Consultation'),
      immigrationGuidanceInterest: areas.includes('Immigration Queries'),
      motivation, experienceSummary: expSummary,
      documents: documents.map(d => d.url),
      agreedToRules: agreedRules, agreedNoDirectContact: agreedNoContact,
      agreedAdminMediated: agreedAdmin, consentToScreening: consentScreen,
    });

    if (!result.ok) {
      setSubmitError(result.error);
      setIsSubmitting(false);
      return;
    }

    // The dashboard renders from the portal snapshot, so re-read it before
    // navigating: otherwise the application that was just written is missing.
    await refresh();
    router.push('/portal/member/my-volunteer');
  };

  const allAgreed = agreedRules && agreedNoContact && agreedAdmin && consentScreen;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }} className="animate-fade-in">
      <div style={{ marginBottom: 32 }}>
        <h1 className="text-3xl font-bold font-display mb-2">Become a Volunteer / Mentor</h1>
        <p className="text-secondary">Share your expertise to help community members. All support is coordinated through the platform.</p>
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
        {[1, 2, 3].map(i => (
          <React.Fragment key={i}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '0.85rem', border: '3px solid',
              borderColor: step > i ? 'var(--success-600)' : step === i ? 'var(--primary-500)' : 'var(--border-color)',
              background: step > i ? 'var(--success-600)' : step === i ? 'var(--primary-500)' : 'transparent',
              color: step >= i ? 'white' : 'var(--text-muted)',
            }}>
              {step > i ? <CheckCircle2 size={18} /> : i}
            </div>
            {i < 3 && <div style={{ width: 48, height: 3, borderRadius: 2, background: step > i ? 'var(--success-600)' : 'var(--border-color)' }} />}
          </React.Fragment>
        ))}
      </div>

      <div className="card" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

        {/* Step 1: Professional Background */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 className="text-xl font-bold">Professional Background</h2>
            <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="input-group"><label>LinkedIn Profile</label><input className="input" placeholder="linkedin.com/in/..." value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} /></div>
              <div className="input-group"><label>Current Profession</label><input className="input" placeholder="e.g. Software Engineer" value={profession} onChange={e => setProfession(e.target.value)} /></div>
              <div className="input-group"><label>Organization / Employer</label><input className="input" placeholder="e.g. Shopify" value={organization} onChange={e => setOrganization(e.target.value)} /></div>
              <div className="input-group"><label>Years of Experience</label><input className="input" type="number" min={0} value={experience} onChange={e => setExperience(Number(e.target.value))} /></div>
              <div className="input-group"><label>Languages Spoken</label><input className="input" placeholder="English, Hindi, Punjabi" value={languages} onChange={e => setLanguages(e.target.value)} /></div>
              <div className="input-group"><label>Availability</label><input className="input" placeholder="e.g. Weekday evenings" value={availability} onChange={e => setAvailability(e.target.value)} /></div>
            </div>
            <div className="input-group">
              <label>Max Cases Per Month</label>
              <input className="input" type="number" min={1} max={20} value={maxCases} onChange={e => setMaxCases(Number(e.target.value))} style={{ maxWidth: 120 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="mentor" checked={mentorship} onChange={() => setMentorship(!mentorship)} />
              <label htmlFor="mentor" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>I am interested in being a long-term mentor</label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setStep(2)} disabled={!profession}>Continue <ArrowRight size={16} /></button>
            </div>
          </div>
        )}

        {/* Step 2: Areas & Motivation */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 className="text-xl font-bold">Areas You Can Help With</h2>
            <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {SUPPORT_CATEGORIES.filter(c => c !== 'Other').map(cat => (
                <button key={cat} onClick={() => toggleArea(cat)} style={{
                  padding: '12px 14px', borderRadius: 10, border: '2px solid',
                  borderColor: areas.includes(cat) ? 'var(--success-600)' : 'var(--border-color)',
                  background: areas.includes(cat) ? 'rgba(5,150,105,0.06)' : 'white',
                  cursor: 'pointer', textAlign: 'left', fontSize: '0.82rem', fontWeight: areas.includes(cat) ? 700 : 500,
                  color: areas.includes(cat) ? 'var(--success-600)' : 'var(--gray-600)',
                }}>
                  {areas.includes(cat) && <Check size={14} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />}{cat}
                </button>
              ))}
            </div>
            <div className="input-group">
              <label>Why do you want to volunteer?</label>
              <textarea className="input" rows={3} placeholder="Tell us your motivation for volunteering..." value={motivation} onChange={e => setMotivation(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Relevant Experience Summary</label>
              <textarea className="input" rows={3} placeholder="Summarize your relevant experience..." value={expSummary} onChange={e => setExpSummary(e.target.value)} />
            </div>
            <AttachmentField
              label="Upload CV or credentials (optional)"
              maxFiles={3}
              files={documents}
              setFiles={setDocuments}
              pending={uploading}
              setPending={setUploading}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-outline" onClick={() => setStep(1)}><ArrowLeft size={16} /> Back</button>
              <button className="btn btn-primary" onClick={() => setStep(3)} disabled={areas.length === 0 || !motivation || uploading > 0}>Review <ArrowRight size={16} /></button>
            </div>
          </div>
        )}

        {/* Step 3: Agreements & Submit */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 className="text-xl font-bold">Agreements & Submit</h2>

            <div style={{ padding: 16, borderRadius: 10, background: 'rgba(232, 93, 4, 0.04)', border: '1px solid rgba(232, 93, 4, 0.15)' }}>
              <Shield size={18} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 6, color: 'var(--text-accent)' }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--primary-700)', fontWeight: 600 }}>Platform Rules for Volunteers</span>
              <ul style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginTop: 12, paddingLeft: 16, lineHeight: 1.8 }}>
                <li>All support must go through the platform — you cannot contact members directly.</li>
                <li>Personal contact details (phone, email) are never shared between members.</li>
                <li>The platform will assign cases to you and securely relay all communication.</li>
                <li>You agree to submit your responses securely through the portal before they are forwarded.</li>
                <li>Guidance provided is community-based and does not constitute professional advice.</li>
              </ul>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { id: 'rules', label: 'I agree to all platform rules above', checked: agreedRules, set: setAgreedRules },
                { id: 'nocontact', label: 'I will NOT contact any member directly', checked: agreedNoContact, set: setAgreedNoContact },
                { id: 'admin', label: 'I understand all support goes through the platform', checked: agreedAdmin, set: setAgreedAdmin },
                { id: 'screen', label: 'I consent to the platform screening my application', checked: consentScreen, set: setConsentScreen },
              ].map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                  <input type="checkbox" id={item.id} checked={item.checked} onChange={() => item.set(!item.checked)} />
                  <label htmlFor={item.id} style={{ fontSize: '0.83rem', cursor: 'pointer', fontWeight: 500 }}>{item.label}</label>
                </div>
              ))}
            </div>

            {submitError && (
              <div role="alert" style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(240,73,35,0.1)', color: 'var(--error-600)', fontSize: '0.85rem' }}>
                {submitError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-outline" onClick={() => setStep(2)}><ArrowLeft size={16} /> Back</button>
              <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={isSubmitting || !allAgreed || uploading > 0} style={{ background: allAgreed ? 'linear-gradient(135deg, var(--success-600), var(--success-400))' : undefined }}>
                {isSubmitting ? 'Submitting…' : 'Submit Application'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
