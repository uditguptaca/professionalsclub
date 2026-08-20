'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePortal } from '@/context/portal-context';
import { useApp } from '@/context/app-context';
import { submitVolunteerApplication } from '@/app/actions/portal';
import { AttachmentField, type Attachment } from '@/components/portal/AttachmentField';
import { SUPPORT_CATEGORIES } from '@/types';
import {
  CheckCircle2, ArrowLeft, ArrowRight, Shield, HandHeart, Check,
  AlertCircle, Sparkles, User,
} from 'lucide-react';

/**
 * Volunteer application, restyled to the profile-hub language: a slim step bar
 * instead of the circles-and-rails progress widget, and each step's inputs in
 * grouped `.pp-group-card` cards with `.pp-field` styling. The three-step flow,
 * its gates and the submit payload are unchanged.
 */

const STEP_TITLES = ['Your background', 'How you can help', 'Agreements'];

const RULES = [
  'All support goes through the platform — you cannot contact members directly.',
  'Personal contact details are never shared between members.',
  'The club assigns cases to you and relays every message.',
  'You submit your responses through the portal before they are forwarded.',
  'Guidance is community-based and is not professional advice.',
];

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
    const approved = existingApp.status === 'approved';
    return (
      <div className="pp2" style={{ textAlign: 'center', padding: '56px 4px' }}>
        {approved
          ? <CheckCircle2 size={28} style={{ color: 'var(--success-600)' }} />
          : <HandHeart size={28} style={{ opacity: 0.35 }} />}
        <h1 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 800, margin: '14px 0 8px' }}>
          {approved ? 'You are an approved volunteer' : 'Application submitted'}
        </h1>
        <p style={{ margin: '0 auto 22px', maxWidth: '22rem', fontSize: '0.9rem', lineHeight: 1.55, color: 'var(--text-secondary)' }}>
          {approved
            ? 'Your assigned cases live in your volunteer dashboard.'
            : `Your application is ${existingApp.status.replace(/_/g, ' ')}. The team will review it and get back to you.`}
        </p>
        <button className="btn btn-primary" onClick={() => router.push('/portal/member/my-volunteer')}>
          View volunteer status
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

  const applyingAs = [`${firstName} ${lastName}`.trim() || 'Your profile', [city, province].filter(Boolean).join(', ')]
    .filter(Boolean).join(' · ');

  const agreements = [
    { id: 'rules', label: 'I agree to all the platform rules above', checked: agreedRules, set: setAgreedRules },
    { id: 'nocontact', label: 'I will not contact any member directly', checked: agreedNoContact, set: setAgreedNoContact },
    { id: 'admin', label: 'I understand all support goes through the platform', checked: agreedAdmin, set: setAgreedAdmin },
    { id: 'screen', label: 'I consent to the club screening my application', checked: consentScreen, set: setConsentScreen },
  ];

  return (
    <div className="pp2">
      <header style={{ marginBottom: 18 }}>
        <h1 className="font-display" style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 6px' }}>
          Volunteer with the club
        </h1>
        <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
          Share your expertise with newcomers. Every case is coordinated through the platform, so your contact details stay private.
        </p>
      </header>

      {/* Progress: three hairline segments, no circles-and-rails chrome. */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 6 }} aria-hidden="true">
          {[1, 2, 3].map(i => (
            <span key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: step >= i ? 'var(--green-800)' : 'rgba(27,67,50,0.12)' }} />
          ))}
        </div>
        <p style={{ margin: '10px 0 0', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
          Step {step} of 3 · {STEP_TITLES[step - 1]}
        </p>
      </div>

      {/* Step 1: Professional Background */}
      {step === 1 && (
        <div className="pp-groups">
          <section className="pp-group">
            <h2>Your work</h2>
            <p className="pp-group-sub">Prefilled from your profile. Edit anything that is out of date.</p>
            <div className="pp-group-card" style={{ padding: '0.9rem 1rem' }}>
              <div className="pp-sheet-fields" style={{ margin: 0 }}>
                <div className="pp-field">
                  <label htmlFor="v-profession">Current profession</label>
                  <input id="v-profession" placeholder="e.g. Software engineer" value={profession} onChange={e => setProfession(e.target.value)} />
                </div>
                <div className="pp-field">
                  <label htmlFor="v-org">Organisation or employer</label>
                  <input id="v-org" placeholder="e.g. Shopify" value={organization} onChange={e => setOrganization(e.target.value)} />
                </div>
                <div className="pp-field">
                  <label htmlFor="v-exp">Years of experience</label>
                  <input id="v-exp" type="number" min={0} value={experience} onChange={e => setExperience(Number(e.target.value))} />
                </div>
                <div className="pp-field">
                  <label htmlFor="v-linkedin">LinkedIn profile</label>
                  <input id="v-linkedin" type="url" placeholder="linkedin.com/in/…" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} />
                </div>
              </div>
            </div>
          </section>

          <section className="pp-group">
            <h2>Your availability</h2>
            <p className="pp-group-sub">How much you can take on, and when.</p>
            <div className="pp-group-card" style={{ padding: '0.9rem 1rem' }}>
              <div className="pp-sheet-fields" style={{ margin: 0 }}>
                <div className="pp-field">
                  <label htmlFor="v-langs">Languages you speak</label>
                  <input id="v-langs" placeholder="English, Hindi, Punjabi" value={languages} onChange={e => setLanguages(e.target.value)} />
                </div>
                <div className="pp-field">
                  <label htmlFor="v-avail">When you are usually free</label>
                  <input id="v-avail" placeholder="e.g. Weekday evenings" value={availability} onChange={e => setAvailability(e.target.value)} />
                </div>
                <div className="pp-field">
                  <label htmlFor="v-max">Cases per month at most</label>
                  <input id="v-max" type="number" min={1} max={20} value={maxCases} onChange={e => setMaxCases(Number(e.target.value))} />
                </div>
              </div>
            </div>
            <div className="pp-group-card" style={{ marginTop: 10 }}>
              <div className="pp-row pp-row-static">
                <span className="pp-row-icon"><Sparkles size={17} /></span>
                <span className="pp-row-body">
                  <small>Long-term mentoring</small>
                  <strong>Mentor a member over months</strong>
                </span>
                <button
                  type="button"
                  className={`pp-toggle ${mentorship ? 'is-on' : ''}`}
                  onClick={() => setMentorship(!mentorship)}
                  aria-pressed={mentorship}
                  aria-label="Interested in long-term mentoring"
                >
                  <span className="pp-toggle-dot" aria-hidden="true" />
                  {mentorship ? 'Yes' : 'No'}
                </button>
              </div>
            </div>
          </section>

          <section className="pp-group">
            <h2>Applying as</h2>
            <div className="pp-group-card">
              <div className="pp-row pp-row-static">
                <span className="pp-row-icon"><User size={17} /></span>
                <span className="pp-row-body">
                  <small>{email || 'Your account'}</small>
                  <strong>{applyingAs}</strong>
                </span>
              </div>
            </div>
            <p className="pp-group-sub" style={{ margin: '0.55rem 0 0' }}>
              Your name, email, phone and city come from your profile. Update them there if they have changed.
            </p>
          </section>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={() => setStep(2)} disabled={!profession}>
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Areas & Motivation */}
      {step === 2 && (
        <div className="pp-groups">
          <section className="pp-group">
            <h2>Areas you can help with</h2>
            <p className="pp-group-sub">Pick every area you are comfortable advising on. Cases are matched to these.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SUPPORT_CATEGORIES.filter(c => c !== 'Other').map(cat => {
                const on = areas.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleArea(cat)}
                    aria-pressed={on}
                    className="pp-chip"
                    style={{
                      minHeight: 44, maxWidth: '100%', padding: '0.5rem 0.95rem',
                      borderRadius: 99, cursor: 'pointer', textAlign: 'left',
                      fontSize: '0.82rem', lineHeight: 1.35, fontWeight: on ? 750 : 650,
                      background: on ? 'var(--green-950)' : 'var(--bg-secondary)',
                      color: on ? '#fff' : 'var(--text-secondary)',
                      border: on ? '1px solid var(--green-950)' : '1px solid rgba(27,67,50,0.08)',
                    }}
                  >
                    {on && <Check size={14} aria-hidden="true" style={{ flexShrink: 0 }} />}{cat}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="pp-group">
            <h2>In your words</h2>
            <div className="pp-group-card" style={{ padding: '0.9rem 1rem' }}>
              <div className="pp-sheet-fields" style={{ margin: 0 }}>
                <div className="pp-field">
                  <label htmlFor="v-motivation">Why do you want to volunteer?</label>
                  <textarea id="v-motivation" rows={4} placeholder="A few lines on what brought you here." value={motivation} onChange={e => setMotivation(e.target.value)} />
                </div>
                <div className="pp-field">
                  <label htmlFor="v-summary">Relevant experience</label>
                  <textarea id="v-summary" rows={4} placeholder="The experience that makes you useful in these areas." value={expSummary} onChange={e => setExpSummary(e.target.value)} />
                </div>
              </div>
            </div>
          </section>

          <section className="pp-group">
            <h2>Credentials</h2>
            <p className="pp-group-sub">Optional. A CV or certificate speeds up verification.</p>
            <AttachmentField
              label="Upload CV or credentials (optional)"
              maxFiles={3}
              files={documents}
              setFiles={setDocuments}
              pending={uploading}
              setPending={setUploading}
            />
          </section>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline" onClick={() => setStep(1)}><ArrowLeft size={16} /> Back</button>
            <button
              className="btn btn-primary"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => setStep(3)}
              disabled={areas.length === 0 || !motivation || uploading > 0}
            >
              Review <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Agreements & Submit */}
      {step === 3 && (
        <div className="pp-groups">
          <section className="pp-group">
            <h2>Platform rules</h2>
            <p className="pp-group-sub">
              <Shield size={13} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4, color: 'var(--primary-600)' }} />
              These keep members safe, and they are not optional.
            </p>
            <div className="pp-group-card" style={{ padding: '0.95rem 1rem' }}>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {RULES.map(rule => (
                  <li key={rule} style={{ display: 'flex', gap: 10, fontSize: '0.85rem', lineHeight: 1.5 }}>
                    <Check size={15} aria-hidden="true" style={{ flexShrink: 0, marginTop: 3, color: 'var(--primary-600)' }} />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="pp-group">
            <h2>Your agreement</h2>
            <div className="pp-group-card">
              {agreements.map(item => (
                <label key={item.id} htmlFor={item.id} className="pp-row" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    id={item.id}
                    checked={item.checked}
                    onChange={() => item.set(!item.checked)}
                    style={{ width: 20, height: 20, flexShrink: 0, margin: '0 0.35rem', accentColor: 'var(--green-800)' }}
                  />
                  <span className="pp-row-body">
                    <strong style={{ whiteSpace: 'normal', overflow: 'visible', fontWeight: 650, fontSize: '0.88rem', lineHeight: 1.45 }}>
                      {item.label}
                    </strong>
                  </span>
                </label>
              ))}
            </div>
          </section>

          {submitError && (
            <div role="alert" className="community-error">
              <AlertCircle size={15} aria-hidden="true" style={{ verticalAlign: '-3px', marginRight: 5 }} />
              {submitError}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline" onClick={() => setStep(2)}><ArrowLeft size={16} /> Back</button>
            <button
              className="btn btn-primary"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={handleSubmit}
              disabled={isSubmitting || !allAgreed || uploading > 0}
            >
              {isSubmitting ? 'Submitting…' : 'Submit application'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
