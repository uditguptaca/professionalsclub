'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/app-context';
import {
  ArrowRight, ArrowLeft, Check, User, MapPin, Target,
  Briefcase, Bell, Heart, Shield, Eye, EyeOff, ChevronDown,
  CheckCircle, Link2, HelpCircle, HandHeart, Star,
} from 'lucide-react';

/* ─── STEP DEFINITIONS ─── */
const STEPS = [
  { id: 1, label: 'Account', icon: User },
  { id: 2, label: 'Profile', icon: MapPin },
  { id: 3, label: 'Purpose', icon: Target },
  { id: 4, label: 'Professional', icon: Briefcase },
  { id: 5, label: 'Preferences', icon: Bell },
  { id: 6, label: 'Intent', icon: Heart },
  { id: 7, label: 'Consent', icon: Shield },
];

/* ─── OPTION LISTS ─── */
const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const PROVINCES = ['Ontario', 'British Columbia', 'Alberta', 'Quebec', 'Manitoba', 'Saskatchewan', 'Nova Scotia', 'New Brunswick', 'Newfoundland & Labrador', 'Prince Edward Island', 'Northwest Territories', 'Yukon', 'Nunavut'];
const CURRENT_STATUS = ['Living in Canada', 'Planning to move to Canada', 'Outside Canada'];
const PURPOSE_OPTIONS = [
  'I want to be part of the community',
  'I want help or guidance',
  'I want job opportunities',
  'I want mentorship',
  'I want to volunteer / help others',
  'I want event updates',
  'I want networking opportunities',
  'I want study / exam support',
  'I want business connections',
  'Other',
];
const EMPLOYMENT_STATUS = ['Employed', 'Self-employed', 'Business Owner', 'Student', 'Looking for Opportunities', 'Not Currently Working'];
const INDUSTRIES = ['IT', 'Finance & Accounting', 'Banking', 'HR', 'Healthcare', 'Engineering', 'Marketing & Sales', 'Education', 'Legal', 'Business / Entrepreneurship', 'Other'];
const EXPERIENCE_RANGES = ['0–1 years', '1–3 years', '3–5 years', '5–10 years', '10+ years'];
const EDUCATION_LEVELS = ['High School', 'Diploma', 'Bachelor\'s', 'Master\'s', 'PhD', 'Other'];
const PROFESSIONAL_CATEGORIES = ['Finance Professional', 'IT Professional', 'HR Professional', 'Engineering Professional', 'Healthcare Professional', 'Marketing Professional', 'Business Professional', 'Student', 'Other'];
const CONTACT_METHODS = ['Email', 'WhatsApp', 'SMS'];
const LANGUAGES = ['English', 'Hindi', 'Punjabi', 'Tamil', 'Telugu', 'Gujarati', 'Bengali', 'Malayalam', 'Marathi', 'Kannada', 'Urdu', 'French', 'Other'];
const UPDATE_TOPICS = ['Events', 'Webinars', 'Job opportunities', 'Networking sessions', 'Volunteer opportunities', 'Community announcements', 'Study groups'];
const HELP_TYPES = ['Job Referral', 'Resume/Cover Letter Review', 'Career Mentorship', 'Settlement Support', 'Tax Consultation', 'Immigration Guidance', 'Study/Exam Support', 'Legal Guidance', 'Other'];
const CONTRIBUTE_OPTIONS = ['Mentoring newcomers', 'Resume reviews', 'Job referrals', 'Settlement guidance', 'Tax consultation', 'Event organization', 'Immigration guidance', 'Community support', 'Other'];
const AVAILABILITY_OPTIONS = ['1–2 hours/week', '3–5 hours/week', '5–10 hours/week', 'Flexible / as needed'];

export default function SignupPage() {
  const router = useRouter();
  const { setCurrentRole, setIsAuthenticated } = useApp();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  /* ─── FORM STATE ─── */
  // Step 1 — Account
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2 — Basic Profile
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [country, setCountry] = useState('Canada');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [currentStatus, setCurrentStatus] = useState('');

  // Step 3 — Purpose
  const [purposes, setPurposes] = useState<string[]>([]);

  // Step 4 — Professional
  const [employmentStatus, setEmploymentStatus] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [industry, setIndustry] = useState('');
  const [prevJobTitle, setPrevJobTitle] = useState('');
  const [prevCompany, setPrevCompany] = useState('');
  const [experience, setExperience] = useState('');
  const [education, setEducation] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [profCategory, setProfCategory] = useState('');
  const [certifications, setCertifications] = useState('');
  const [skills, setSkills] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [summary, setSummary] = useState('');

  // Step 5 — Communication
  const [contactMethod, setContactMethod] = useState('');
  const [prefLanguage, setPrefLanguage] = useState('');
  const [updateTopics, setUpdateTopics] = useState<string[]>([]);

  // Step 6 — Intent
  const [joiningFor, setJoiningFor] = useState<'help' | 'volunteer' | 'both' | ''>('');
  const [helpType, setHelpType] = useState('');
  const [helpDescription, setHelpDescription] = useState('');
  const [contributeAreas, setContributeAreas] = useState<string[]>([]);
  const [availability, setAvailability] = useState('');

  // Step 7 — Consent
  const [consentRegister, setConsentRegister] = useState(false);
  const [consentAdminReview, setConsentAdminReview] = useState(false);
  const [consentNoDirectContact, setConsentNoDirectContact] = useState(false);
  const [consentNoMisuse, setConsentNoMisuse] = useState(false);
  const [consentUpdates, setConsentUpdates] = useState(false);
  const [consentTerms, setConsentTerms] = useState(false);

  /* ─── HELPERS ─── */
  const toggleMulti = (arr: string[], setArr: React.Dispatch<React.SetStateAction<string[]>>, val: string) => {
    setArr(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };

  const next = () => { if (step < 7) setStep(step + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const prev = () => { if (step > 1) setStep(step - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const handleSubmit = () => {
    setCurrentRole('member');
    setIsAuthenticated(true);
    router.push('/portal/member/dashboard');
  };

  /* ─── STEP PROGRESS ─── */
  const progressPercent = ((step) / 7) * 100;

  return (
    <div className="onboarding-page">
      {/* ─── HEADER BAR ─── */}
      <div className="onboarding-header">
        <Link href="/" className="onboarding-logo">
          <img src="/professionals-club-logo.png" alt="Professionals Club" style={{ width: 32, height: 32, objectFit: 'contain', mixBlendMode: 'multiply' }} />
          <span>Professionals <strong>Club</strong></span>
        </Link>
        <Link href="/portal/auth" className="onboarding-login-link">
          Already have an account? <strong>Log in</strong>
        </Link>
      </div>

      {/* ─── PROGRESS BAR ─── */}
      <div className="onboarding-progress-bar">
        <div className="onboarding-progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* ─── STEP INDICATORS ─── */}
      <div className="onboarding-steps">
        {STEPS.map((s) => {
          const Icon = s.icon;
          const isActive = step === s.id;
          const isCompleted = step > s.id;
          return (
            <div
              key={s.id}
              className={`onboarding-step-pill ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              onClick={() => isCompleted && setStep(s.id)}
            >
              <div className="step-circle">
                {isCompleted ? <Check size={14} /> : <Icon size={14} />}
              </div>
              <span className="step-label">{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* ─── FORM CONTAINER ─── */}
      <div className="onboarding-container">
        <div className="onboarding-card">

          {/* ── STEP 1: ACCOUNT ── */}
          {step === 1 && (
            <div className="onboarding-step-content animate-fade-in">
              <div className="step-header">
                <h2>Create Your Account</h2>
                <p>Set up your login details to get started with Professionals Club.</p>
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label>First Name <span className="required">*</span></label>
                  <input type="text" className="form-input" placeholder="e.g. Rahul" value={firstName} onChange={e => setFirstName(e.target.value)} />
                </div>
                <div className="form-field">
                  <label>Middle Name</label>
                  <input type="text" className="form-input" placeholder="Optional" value={middleName} onChange={e => setMiddleName(e.target.value)} />
                </div>
              </div>

              <div className="form-field">
                <label>Last Name <span className="required">*</span></label>
                <input type="text" className="form-input" placeholder="e.g. Sharma" value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>

              <div className="form-field">
                <label>Email Address <span className="required">*</span></label>
                <input type="email" className="form-input" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>

              <div className="form-field">
                <label>Phone Number <span className="required">*</span></label>
                <input type="tel" className="form-input" placeholder="+1 (416) 000-0000" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label>Password <span className="required">*</span></label>
                  <div className="input-with-icon">
                    <input type={showPassword ? 'text' : 'password'} className="form-input" placeholder="Min 8 characters" value={password} onChange={e => setPassword(e.target.value)} />
                    <button type="button" className="input-icon-btn" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="form-field">
                  <label>Confirm Password <span className="required">*</span></label>
                  <div className="input-with-icon">
                    <input type={showConfirm ? 'text' : 'password'} className="form-input" placeholder="Re-type password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                    <button type="button" className="input-icon-btn" onClick={() => setShowConfirm(!showConfirm)}>
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: BASIC PROFILE ── */}
          {step === 2 && (
            <div className="onboarding-step-content animate-fade-in">
              <div className="step-header">
                <h2>Your Basic Profile</h2>
                <p>Tell us a bit about yourself so we can personalize your experience.</p>
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label>Date of Birth <span className="required">*</span></label>
                  <input type="date" className="form-input" value={dob} onChange={e => setDob(e.target.value)} />
                </div>
                <div className="form-field">
                  <label>Gender</label>
                  <div className="select-wrapper">
                    <select className="form-input" value={gender} onChange={e => setGender(e.target.value)}>
                      <option value="">Select gender</option>
                      {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <ChevronDown size={16} className="select-chevron" />
                  </div>
                </div>
              </div>

              <div className="form-field">
                <label>Country of Residence <span className="required">*</span></label>
                <input type="text" className="form-input" placeholder="e.g. Canada" value={country} onChange={e => setCountry(e.target.value)} />
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label>Province / State <span className="required">*</span></label>
                  <div className="select-wrapper">
                    <select className="form-input" value={province} onChange={e => setProvince(e.target.value)}>
                      <option value="">Select province</option>
                      {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <ChevronDown size={16} className="select-chevron" />
                  </div>
                </div>
                <div className="form-field">
                  <label>City <span className="required">*</span></label>
                  <input type="text" className="form-input" placeholder="e.g. Toronto" value={city} onChange={e => setCity(e.target.value)} />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label>Postal Code</label>
                  <input type="text" className="form-input" placeholder="e.g. M5V 3L9" value={postalCode} onChange={e => setPostalCode(e.target.value)} />
                </div>
                <div className="form-field">
                  <label>Current Status <span className="required">*</span></label>
                  <div className="select-wrapper">
                    <select className="form-input" value={currentStatus} onChange={e => setCurrentStatus(e.target.value)}>
                      <option value="">Select your status</option>
                      {CURRENT_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={16} className="select-chevron" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: PURPOSE ── */}
          {step === 3 && (
            <div className="onboarding-step-content animate-fade-in">
              <div className="step-header">
                <h2>Why Are You Joining?</h2>
                <p>Select all that apply — this helps us customize your experience.</p>
              </div>

              <div className="chip-grid">
                {PURPOSE_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    className={`chip ${purposes.includes(opt) ? 'selected' : ''}`}
                    onClick={() => toggleMulti(purposes, setPurposes, opt)}
                  >
                    {purposes.includes(opt) && <CheckCircle size={15} />}
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 4: PROFESSIONAL ── */}
          {step === 4 && (
            <div className="onboarding-step-content animate-fade-in">
              <div className="step-header">
                <h2>Professional & Education Profile</h2>
                <p>Help us understand your background to match you with the right resources.</p>
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label>Employment Status <span className="required">*</span></label>
                  <div className="select-wrapper">
                    <select className="form-input" value={employmentStatus} onChange={e => setEmploymentStatus(e.target.value)}>
                      <option value="">Select status</option>
                      {EMPLOYMENT_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={16} className="select-chevron" />
                  </div>
                </div>
                <div className="form-field">
                  <label>Current Job Title / Role</label>
                  <input type="text" className="form-input" placeholder="e.g. Software Engineer" value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label>Current Company / Organization</label>
                  <input type="text" className="form-input" placeholder="e.g. Shopify" value={company} onChange={e => setCompany(e.target.value)} />
                </div>
                <div className="form-field">
                  <label>Current Industry <span className="required">*</span></label>
                  <div className="select-wrapper">
                    <select className="form-input" value={industry} onChange={e => setIndustry(e.target.value)}>
                      <option value="">Select industry</option>
                      {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                    <ChevronDown size={16} className="select-chevron" />
                  </div>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label>Previous Job Title</label>
                  <input type="text" className="form-input" placeholder="Optional" value={prevJobTitle} onChange={e => setPrevJobTitle(e.target.value)} />
                </div>
                <div className="form-field">
                  <label>Previous Company</label>
                  <input type="text" className="form-input" placeholder="Optional" value={prevCompany} onChange={e => setPrevCompany(e.target.value)} />
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-field">
                  <label>Total Experience <span className="required">*</span></label>
                  <div className="select-wrapper">
                    <select className="form-input" value={experience} onChange={e => setExperience(e.target.value)}>
                      <option value="">Select</option>
                      {EXPERIENCE_RANGES.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                    <ChevronDown size={16} className="select-chevron" />
                  </div>
                </div>
                <div className="form-field">
                  <label>Highest Education <span className="required">*</span></label>
                  <div className="select-wrapper">
                    <select className="form-input" value={education} onChange={e => setEducation(e.target.value)}>
                      <option value="">Select</option>
                      {EDUCATION_LEVELS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                    <ChevronDown size={16} className="select-chevron" />
                  </div>
                </div>
                <div className="form-field">
                  <label>Professional Category <span className="required">*</span></label>
                  <div className="select-wrapper">
                    <select className="form-input" value={profCategory} onChange={e => setProfCategory(e.target.value)}>
                      <option value="">Select</option>
                      {PROFESSIONAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown size={16} className="select-chevron" />
                  </div>
                </div>
              </div>

              <div className="form-field">
                <label>Field of Study / Major <span className="required">*</span></label>
                <input type="text" className="form-input" placeholder="e.g. Computer Science" value={fieldOfStudy} onChange={e => setFieldOfStudy(e.target.value)} />
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label>Certifications</label>
                  <input type="text" className="form-input" placeholder="e.g. PMP, AWS, CPA" value={certifications} onChange={e => setCertifications(e.target.value)} />
                </div>
                <div className="form-field">
                  <label>Key Skills</label>
                  <input type="text" className="form-input" placeholder="e.g. Python, Finance, Leadership" value={skills} onChange={e => setSkills(e.target.value)} />
                </div>
              </div>

              <div className="form-field">
                <label><Link2 size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6, color: '#0077b5' }} />LinkedIn Profile URL <span className="required">*</span></label>
                <input type="url" className="form-input" placeholder="https://linkedin.com/in/yourprofile" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} />
                <div className="field-hint">
                  <Shield size={12} /> We verify your profile through LinkedIn to maintain authenticity and trust within the community.
                </div>
              </div>

              <div className="form-field">
                <label>Short Professional Summary <span className="required">*</span></label>
                <textarea className="form-input form-textarea" placeholder="Briefly describe your professional background, expertise, and what you're looking for..." value={summary} onChange={e => setSummary(e.target.value)} rows={3} />
              </div>
            </div>
          )}

          {/* ── STEP 5: COMMUNICATION PREFERENCES ── */}
          {step === 5 && (
            <div className="onboarding-step-content animate-fade-in">
              <div className="step-header">
                <h2>Communication Preferences</h2>
                <p>How would you like us to stay in touch?</p>
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label>Preferred Contact Method <span className="required">*</span></label>
                  <div className="select-wrapper">
                    <select className="form-input" value={contactMethod} onChange={e => setContactMethod(e.target.value)}>
                      <option value="">Select method</option>
                      {CONTACT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ChevronDown size={16} className="select-chevron" />
                  </div>
                </div>
                <div className="form-field">
                  <label>Preferred Language <span className="required">*</span></label>
                  <div className="select-wrapper">
                    <select className="form-input" value={prefLanguage} onChange={e => setPrefLanguage(e.target.value)}>
                      <option value="">Select language</option>
                      {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <ChevronDown size={16} className="select-chevron" />
                  </div>
                </div>
              </div>

              <div className="form-field" style={{ marginTop: 8 }}>
                <label>I want updates about:</label>
                <div className="chip-grid compact">
                  {UPDATE_TOPICS.map(topic => (
                    <button
                      key={topic}
                      type="button"
                      className={`chip ${updateTopics.includes(topic) ? 'selected' : ''}`}
                      onClick={() => toggleMulti(updateTopics, setUpdateTopics, topic)}
                    >
                      {updateTopics.includes(topic) && <CheckCircle size={14} />}
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 6: MEMBER INTENT ── */}
          {step === 6 && (
            <div className="onboarding-step-content animate-fade-in">
              <div className="step-header">
                <h2>How Do You Want to Participate?</h2>
                <p>Let us know whether you&rsquo;re looking for help, want to volunteer, or both.</p>
              </div>

              <div className="form-field">
                <label>I am joining to… <span className="required">*</span></label>
                <div className="intent-cards">
                  {[
                    { key: 'help' as const, icon: <HelpCircle size={28} />, title: 'Get Help', desc: 'I need guidance or support with my career, settlement, taxes, etc.' },
                    { key: 'volunteer' as const, icon: <HandHeart size={28} />, title: 'Help Others', desc: 'I want to volunteer my skills and expertise to help community members.' },
                    { key: 'both' as const, icon: <Star size={28} />, title: 'Both', desc: 'I want to receive support and also give back by helping others.' },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      className={`intent-card ${joiningFor === opt.key ? 'selected' : ''}`}
                      onClick={() => setJoiningFor(opt.key)}
                    >
                      <div className="intent-emoji">{opt.icon}</div>
                      <div className="intent-title">{opt.title}</div>
                      <div className="intent-desc">{opt.desc}</div>
                      {joiningFor === opt.key && <div className="intent-check"><CheckCircle size={18} /></div>}
                    </button>
                  ))}
                </div>
              </div>

              {/* If help */}
              {(joiningFor === 'help' || joiningFor === 'both') && (
                <div className="intent-section animate-fade-in">
                  <div className="intent-section-label">Need Help With</div>
                  <div className="form-field">
                    <label>Type of Help Needed</label>
                    <div className="select-wrapper">
                      <select className="form-input" value={helpType} onChange={e => setHelpType(e.target.value)}>
                        <option value="">Select type</option>
                        {HELP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <ChevronDown size={16} className="select-chevron" />
                    </div>
                  </div>
                  <div className="form-field">
                    <label>Short Description of Your Need</label>
                    <textarea className="form-input form-textarea" placeholder="Briefly describe what help you are looking for..." value={helpDescription} onChange={e => setHelpDescription(e.target.value)} rows={2} />
                  </div>
                </div>
              )}

              {/* If volunteer */}
              {(joiningFor === 'volunteer' || joiningFor === 'both') && (
                <div className="intent-section animate-fade-in">
                  <div className="intent-section-label">I Can Help With</div>
                  <div className="form-field">
                    <label>Areas You Can Help With</label>
                    <div className="chip-grid compact">
                      {CONTRIBUTE_OPTIONS.map(opt => (
                        <button
                          key={opt}
                          type="button"
                          className={`chip ${contributeAreas.includes(opt) ? 'selected' : ''}`}
                          onClick={() => toggleMulti(contributeAreas, setContributeAreas, opt)}
                        >
                          {contributeAreas.includes(opt) && <CheckCircle size={14} />}
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="form-field">
                    <label>Your Availability</label>
                    <div className="select-wrapper">
                      <select className="form-input" value={availability} onChange={e => setAvailability(e.target.value)}>
                        <option value="">Select availability</option>
                        {AVAILABILITY_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                      <ChevronDown size={16} className="select-chevron" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 7: CONSENT ── */}
          {step === 7 && (
            <div className="onboarding-step-content animate-fade-in">
              <div className="step-header">
                <h2>Privacy & Consent</h2>
                <p>Almost done! Please review and agree to the following.</p>
              </div>

              <div className="consent-list">
                {[
                  { val: consentRegister, set: setConsentRegister, label: 'I consent to register as a member of Professionals Club.', required: true },
                  { val: consentAdminReview, set: setConsentAdminReview, label: 'I agree that my information will be reviewed by the platform for onboarding.', required: true },
                  { val: consentNoDirectContact, set: setConsentNoDirectContact, label: 'I understand that no direct member-to-member contact is allowed by default.', required: true },
                  { val: consentNoMisuse, set: setConsentNoMisuse, label: 'I agree not to misuse any community or member information.', required: true },
                  { val: consentUpdates, set: setConsentUpdates, label: 'I allow Professionals Club to send me updates and community communications.', required: false },
                  { val: consentTerms, set: setConsentTerms, label: 'I have read and agree to the Terms & Conditions and Privacy Policy.', required: true },
                ].map((item, i) => (
                  <label key={i} className={`consent-item ${item.val ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={item.val}
                      onChange={e => item.set(e.target.checked)}
                      className="consent-checkbox"
                    />
                    <div className="consent-check-visual">
                      {item.val && <Check size={12} />}
                    </div>
                    <span className="consent-text">
                      {item.label}
                      {item.required && <span className="required"> *</span>}
                    </span>
                  </label>
                ))}
              </div>

              <div className="consent-note">
                <Shield size={16} />
                <p>Your data is secure and will only be used for Professionals Club onboarding and community purposes. We never share your information with third parties.</p>
              </div>
            </div>
          )}

          {/* ─── ACTIONS ─── */}
          <div className="onboarding-actions">
            {step > 1 && (
              <button type="button" className="btn-back" onClick={prev}>
                <ArrowLeft size={16} /> Back
              </button>
            )}
            <div style={{ flex: 1 }} />
            <div className="step-counter">Step {step} of 7</div>
            {step < 7 ? (
              <button type="button" className="btn-next" onClick={next}>
                Continue <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="btn-submit"
                onClick={handleSubmit}
                disabled={!consentRegister || !consentAdminReview || !consentNoDirectContact || !consentNoMisuse || !consentTerms}
              >
                <CheckCircle size={18} /> Create Account
              </button>
            )}
          </div>
        </div>

        {/* ─── FLOW SUMMARY ─── */}
        <div className="onboarding-flow-note">
          <div className="flow-step"><span>1</span> Create Account</div>
          <div className="flow-arrow">→</div>
          <div className="flow-step"><span>2</span> Complete Profile</div>
          <div className="flow-arrow">→</div>
          <div className="flow-step active-flow"><span>3</span> Initial Review</div>
          <div className="flow-arrow">→</div>
          <div className="flow-step"><span>4</span> Dashboard</div>
        </div>
      </div>
    </div>
  );
}
