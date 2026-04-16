'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import {
  Building2, User, MapPin, Phone, Mail, Globe, Briefcase, Tag, Clock,
  ShieldCheck, Star, Camera, FileText, CheckCircle, ArrowRight, ArrowLeft,
  Gift, Award, DollarSign,
  MessageSquare, Megaphone, Upload, Heart, Link2, Hash, Video, AtSign,
} from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Business Profile', icon: Building2 },
  { id: 2, label: 'Contact & Location', icon: MapPin },
  { id: 3, label: 'Services & Pricing', icon: Briefcase },
  { id: 4, label: 'Credibility', icon: Award },
  { id: 5, label: 'Member Benefits', icon: Gift },
  { id: 6, label: 'Operations & Media', icon: Camera },
  { id: 7, label: 'Social & Promotion', icon: Megaphone },
  { id: 8, label: 'Verification & Consent', icon: ShieldCheck },
];

const CATEGORIES = [
  'Tax & Accounting', 'Legal Services', 'Immigration Services', 'Real Estate',
  'Mortgage', 'Insurance', 'IT Services', 'Marketing', 'HR & Recruitment',
  'Education / Coaching', 'Health & Wellness', 'Home Services', 'Financial Planning',
  'Notary / Documentation', 'Business Consulting', 'Other',
];

const TARGET_AUDIENCES = [
  'Newcomers to Canada', 'International Students', 'Working Professionals',
  'Small Business Owners', 'Families', 'Seniors', 'General Public',
];

const SERVICE_MODES = [
  { value: 'in_person', label: 'In-Person Only' },
  { value: 'online', label: 'Online / Virtual Only' },
  { value: 'hybrid', label: 'Both In-Person & Online' },
  { value: 'mobile', label: 'Mobile / On-Site Service' },
];

const PROMOTION_OPTIONS = [
  { value: 'featured', label: '⭐ Featured Listing — Appear at the top of directory results' },
  { value: 'homepage', label: '🏠 Homepage Spotlight — Featured on the Professionals Club homepage' },
  { value: 'newsletter', label: '📧 Newsletter Feature — Highlighted in our member newsletter' },
  { value: 'social', label: '📱 Social Media Promotion — Shared on our social media channels' },
  { value: 'event', label: '🎪 Event Sponsorship — Sponsor community events and meetups' },
];

export default function BusinessSignupPage() {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Step 1: Business Profile
  const [businessName, setBusinessName] = useState('');
  const [tagline, setTagline] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [descShort, setDescShort] = useState('');
  const [descFull, setDescFull] = useState('');
  const [targetAudience, setTargetAudience] = useState<string[]>([]);
  const [yearEstablished, setYearEstablished] = useState('');

  // Step 2: Contact & Location
  const [contactPerson, setContactPerson] = useState('');
  const [contactTitle, setContactTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [serviceArea, setServiceArea] = useState('');

  // Step 3: Services & Pricing
  const [services, setServices] = useState<string[]>(['']);
  const [pricingSummary, setPricingSummary] = useState('');
  const [consultationType, setConsultationType] = useState('');
  const [consultationFee, setConsultationFee] = useState('');

  // Step 4: Credibility
  const [yearsInBusiness, setYearsInBusiness] = useState('');
  const [certifications, setCertifications] = useState('');
  const [credentials, setCredentials] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [clientsServed, setClientsServed] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);

  // Step 5: Member Benefits
  const [discountPercent, setDiscountPercent] = useState('');
  const [offerDescription, setOfferDescription] = useState('');
  const [offerType, setOfferType] = useState('permanent');
  const [offerExpiry, setOfferExpiry] = useState('');
  const [additionalBenefits, setAdditionalBenefits] = useState<string[]>(['']);

  // Step 6: Operations & Media
  const [businessHours, setBusinessHours] = useState('');
  const [serviceMode, setServiceMode] = useState('');
  const [testimonial1, setTestimonial1] = useState('');
  const [testimonial2, setTestimonial2] = useState('');

  // Step 7: Social & Promotion
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');
  const [promotionInterests, setPromotionInterests] = useState<string[]>([]);

  // Step 8: Verification & Consent
  const [accuracyConfirm, setAccuracyConfirm] = useState(false);
  const [adminReviewAgree, setAdminReviewAgree] = useState(false);
  const [allowPublicListing, setAllowPublicListing] = useState(false);
  const [allowDirectContact, setAllowDirectContact] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  const toggleTargetAudience = (val: string) => {
    setTargetAudience(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  };

  const toggleLanguage = (lang: string) => {
    setLanguages(prev => prev.includes(lang) ? prev.filter(x => x !== lang) : [...prev, lang]);
  };

  const togglePromotion = (val: string) => {
    setPromotionInterests(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  };

  const addService = () => setServices(prev => [...prev, '']);
  const updateService = (i: number, val: string) => setServices(prev => prev.map((s, idx) => idx === i ? val : s));
  const removeService = (i: number) => setServices(prev => prev.filter((_, idx) => idx !== i));

  const addBenefit = () => setAdditionalBenefits(prev => [...prev, '']);
  const updateBenefit = (i: number, val: string) => setAdditionalBenefits(prev => prev.map((b, idx) => idx === i ? val : b));
  const removeBenefit = (i: number) => setAdditionalBenefits(prev => prev.filter((_, idx) => idx !== i));

  const canProceed = () => {
    switch (step) {
      case 1: return businessName && category && descShort;
      case 2: return contactPerson && phone && email && city && province;
      case 3: return services.filter(s => s.trim()).length > 0;
      case 4: return true; // optional
      case 5: return offerDescription; // mandatory section
      case 6: return businessHours && serviceMode;
      case 7: return true; // optional
      case 8: return accuracyConfirm && adminReviewAgree && allowPublicListing && acceptTerms;
      default: return true;
    }
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f8fafc, #eef2ff)' }}>
        <div style={{ maxWidth: 520, textAlign: 'center', padding: 40 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #059669, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 8px 32px rgba(5,150,105,0.3)' }}>
            <CheckCircle size={40} color="white" />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900, marginBottom: 12 }}>Application Submitted!</h1>
          <p style={{ fontSize: '1rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 8 }}>
            Your business listing for <strong>{businessName}</strong> has been submitted for admin review.
          </p>
          <div style={{ padding: 20, borderRadius: 14, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', margin: '24px 0', textAlign: 'left' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={16} style={{ color: 'var(--primary-600)' }} /> <strong>Status:</strong> Pending Review</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ShieldCheck size={16} style={{ color: 'var(--primary-600)' }} /> <strong>Next:</strong> Admin team will verify your business details</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Star size={16} style={{ color: 'var(--primary-600)' }} /> <strong>Timeline:</strong> Typically 2–3 business days</div>
            </div>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 28 }}>
            You&rsquo;ll receive an email at <strong>{email}</strong> once your listing is approved and live.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link href="/businesses" className="btn btn-primary" style={{ padding: '12px 28px' }}>Browse Directory</Link>
            <Link href="/" className="btn btn-ghost" style={{ padding: '12px 28px' }}>Back to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!mounted) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc, #eef2ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--primary-600)', fontWeight: 600 }}>Loading form...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc, #eef2ff)' }}>
      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--border-color)', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--text-primary)' }}>
            <img src="/logo.png" alt="PC" style={{ width: 32, height: 32, objectFit: 'contain' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem' }}>Professionals Club</span>
          </Link>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Business Listing Application</span>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px 60px' }}>
        {/* Progress */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--primary-600)' }}>Step {step} of {STEPS.length}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{Math.round(progress)}% complete</span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: 'var(--gray-200)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, var(--primary-500), #8b5cf6)', width: `${progress}%`, transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 14, overflowX: 'auto', paddingBottom: 4 }}>
            {STEPS.map(s => {
              const Icon = s.icon;
              const isActive = step === s.id;
              const isDone = step > s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { if (isDone) setStep(s.id); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 600, border: 'none', cursor: isDone ? 'pointer' : 'default', whiteSpace: 'nowrap', transition: 'all 0.2s',
                    background: isActive ? 'var(--primary-600)' : isDone ? 'rgba(5,150,105,0.1)' : 'var(--gray-100)',
                    color: isActive ? 'white' : isDone ? '#059669' : 'var(--gray-500)',
                  }}
                >
                  {isDone ? <CheckCircle size={12} /> : <Icon size={12} />}
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Card */}
        <div style={{ background: 'white', borderRadius: 20, border: '1px solid var(--border-color)', padding: '36px 40px', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>

          {/* ═══ STEP 1: Business Profile ═══ */}
          {step === 1 && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Building2 size={22} style={{ color: 'var(--primary-600)' }} />
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800 }}>Business Profile</h2>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 28 }}>Tell us about your business. This information will appear on your public listing.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={labelStyle}>Business Name <span style={reqStyle}>*</span></label>
                  <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="e.g. Sharma & Associates CPA" style={inputStyle} />
                </div>

                <div>
                  <label style={labelStyle}>Tagline / Slogan</label>
                  <input type="text" value={tagline} onChange={e => setTagline(e.target.value)} placeholder="e.g. Trusted tax filing for newcomers" style={inputStyle} />
                  <span style={hintStyle}>A short, catchy phrase that describes your business</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Business Category <span style={reqStyle}>*</span></label>
                    <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
                      <option value="">Select category...</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Sub-Category</label>
                    <input type="text" value={subcategory} onChange={e => setSubcategory(e.target.value)} placeholder="e.g. Personal Tax" style={inputStyle} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Short Description <span style={reqStyle}>*</span></label>
                  <input type="text" value={descShort} onChange={e => setDescShort(e.target.value)} placeholder="One line summary shown on directory cards" style={inputStyle} maxLength={150} />
                  <span style={hintStyle}>{descShort.length}/150 characters — shown on listing cards</span>
                </div>

                <div>
                  <label style={labelStyle}>Full Description</label>
                  <textarea value={descFull} onChange={e => setDescFull(e.target.value)} placeholder="Detailed description of your business, services, and what makes you unique..." rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
                  <span style={hintStyle}>Displayed on your business profile page</span>
                </div>

                <div>
                  <label style={labelStyle}>Year Established</label>
                  <input type="number" value={yearEstablished} onChange={e => setYearEstablished(e.target.value)} placeholder="e.g. 2015" style={{ ...inputStyle, maxWidth: 180 }} min="1900" max="2026" />
                </div>

                <div>
                  <label style={labelStyle}>Target Audience</label>
                  <span style={hintStyle}>Select all that apply</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    {TARGET_AUDIENCES.map(aud => (
                      <button key={aud} type="button" onClick={() => toggleTargetAudience(aud)}
                        style={{ padding: '7px 14px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 500, border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s',
                          background: targetAudience.includes(aud) ? 'rgba(99,102,241,0.08)' : 'white',
                          borderColor: targetAudience.includes(aud) ? 'var(--primary-500)' : 'var(--gray-200)',
                          color: targetAudience.includes(aud) ? 'var(--primary-700)' : 'var(--gray-600)' }}
                      >{targetAudience.includes(aud) && <CheckCircle size={12} style={{ marginRight: 4, verticalAlign: '-2px' }} />}{aud}</button>
                    ))}
                  </div>
                </div>

                {/* Logo Upload */}
                <div>
                  <label style={labelStyle}>Business Logo</label>
                  <div style={{ border: '2px dashed var(--gray-200)', borderRadius: 14, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: 'var(--gray-50)' }}>
                    <Upload size={28} style={{ color: 'var(--gray-400)', margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Click to upload logo</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>PNG, JPG or SVG. Max 2MB. Recommended: 400×400px</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP 2: Contact & Location ═══ */}
          {step === 2 && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <MapPin size={22} style={{ color: 'var(--primary-600)' }} />
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800 }}>Contact & Location</h2>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 28 }}>How can members reach you? This info will be visible on your listing.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Contact Person <span style={reqStyle}>*</span></label>
                    <input type="text" value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="Full name" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Title / Designation</label>
                    <input type="text" value={contactTitle} onChange={e => setContactTitle(e.target.value)} placeholder="e.g. Owner, CPA, RCIC" style={inputStyle} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Phone Number <span style={reqStyle}>*</span></label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (416) 555-0000" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Email Address <span style={reqStyle}>*</span></label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="business@email.com" style={inputStyle} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Website</label>
                  <input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yourbusiness.ca" style={inputStyle} />
                </div>

                <div style={{ height: 1, background: 'var(--gray-100)', margin: '4px 0' }} />

                <div>
                  <label style={labelStyle}>Street Address</label>
                  <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Business Street, Suite 100" style={inputStyle} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>City <span style={reqStyle}>*</span></label>
                    <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Toronto" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Province <span style={reqStyle}>*</span></label>
                    <select value={province} onChange={e => setProvince(e.target.value)} style={inputStyle}>
                      <option value="">Select...</option>
                      {['Ontario', 'British Columbia', 'Alberta', 'Quebec', 'Manitoba', 'Saskatchewan', 'Nova Scotia', 'New Brunswick', 'Newfoundland', 'PEI'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Postal Code</label>
                    <input type="text" value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="M5V 2H1" style={inputStyle} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Service Area / Coverage</label>
                  <input type="text" value={serviceArea} onChange={e => setServiceArea(e.target.value)} placeholder="e.g. Greater Toronto Area, Canada-wide (virtual)" style={inputStyle} />
                  <span style={hintStyle}>Where do you serve clients?</span>
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP 3: Services & Pricing ═══ */}
          {step === 3 && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Briefcase size={22} style={{ color: 'var(--primary-600)' }} />
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800 }}>Services & Pricing</h2>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 28 }}>List the services you offer and your general pricing. At least one service is required.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={labelStyle}>Services Offered <span style={reqStyle}>*</span></label>
                  <span style={hintStyle}>Add each service your business provides</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    {services.map((svc, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="text" value={svc} onChange={e => updateService(i, e.target.value)} placeholder={`Service ${i + 1} (e.g. Personal Tax Filing)`} style={{ ...inputStyle, flex: 1 }} />
                        {services.length > 1 && (
                          <button type="button" onClick={() => removeService(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem', padding: '4px 8px' }}>×</button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={addService} style={{ alignSelf: 'flex-start', padding: '6px 14px', borderRadius: 8, border: '1px dashed var(--gray-300)', background: 'none', fontSize: '0.78rem', fontWeight: 600, color: 'var(--primary-600)', cursor: 'pointer' }}>+ Add Another Service</button>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Pricing Summary</label>
                  <textarea value={pricingSummary} onChange={e => setPricingSummary(e.target.value)} placeholder="e.g. Personal tax returns from $80. Corporate returns from $500. Free initial consultation." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                  <span style={hintStyle}>Give members a general idea of your pricing</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Consultation Type</label>
                    <select value={consultationType} onChange={e => setConsultationType(e.target.value)} style={inputStyle}>
                      <option value="">Select...</option>
                      <option value="free">Free Consultation</option>
                      <option value="paid">Paid Consultation</option>
                      <option value="free_members">Free for PC Members</option>
                      <option value="none">No Consultation Offered</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Consultation Fee (if applicable)</label>
                    <input type="text" value={consultationFee} onChange={e => setConsultationFee(e.target.value)} placeholder="e.g. $100/hour" style={inputStyle} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP 4: Credibility ═══ */}
          {step === 4 && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Award size={22} style={{ color: 'var(--primary-600)' }} />
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800 }}>Business Credibility</h2>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 28 }}>Build trust with potential clients. Share your credentials and experience.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Years in Business</label>
                    <input type="number" value={yearsInBusiness} onChange={e => setYearsInBusiness(e.target.value)} placeholder="e.g. 10" style={inputStyle} min="0" />
                  </div>
                  <div>
                    <label style={labelStyle}>Team Size</label>
                    <input type="text" value={teamSize} onChange={e => setTeamSize(e.target.value)} placeholder="e.g. 5 employees" style={inputStyle} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Certifications & Licenses</label>
                  <textarea value={certifications} onChange={e => setCertifications(e.target.value)} placeholder="e.g. CPA Ontario Licensed, RCIC Certified, Member of CREA" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                  <span style={hintStyle}>List any professional certifications, licenses, or regulatory registrations</span>
                </div>

                <div>
                  <label style={labelStyle}>Professional Credentials</label>
                  <textarea value={credentials} onChange={e => setCredentials(e.target.value)} placeholder="e.g. MBA from Rotman School, 15 years in Canadian tax law" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>

                <div>
                  <label style={labelStyle}>Clients Served (approx)</label>
                  <input type="text" value={clientsServed} onChange={e => setClientsServed(e.target.value)} placeholder="e.g. 500+ clients" style={inputStyle} />
                </div>

                <div>
                  <label style={labelStyle}>Languages Spoken</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    {['English', 'Hindi', 'Punjabi', 'Gujarati', 'Tamil', 'Telugu', 'Marathi', 'Bengali', 'Urdu', 'French', 'Other'].map(lang => (
                      <button key={lang} type="button" onClick={() => toggleLanguage(lang)}
                        style={{ padding: '6px 12px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 500, border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s',
                          background: languages.includes(lang) ? 'rgba(99,102,241,0.08)' : 'white',
                          borderColor: languages.includes(lang) ? 'var(--primary-500)' : 'var(--gray-200)',
                          color: languages.includes(lang) ? 'var(--primary-700)' : 'var(--gray-600)' }}
                      >{lang}</button>
                    ))}
                  </div>
                </div>

                {/* Document Upload */}
                <div>
                  <label style={labelStyle}>Supporting Documents</label>
                  <div style={{ border: '2px dashed var(--gray-200)', borderRadius: 14, padding: '24px 20px', textAlign: 'center', cursor: 'pointer', background: 'var(--gray-50)' }}>
                    <FileText size={24} style={{ color: 'var(--gray-400)', margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Upload certifications, licenses, or credentials</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>PDF, JPG, PNG. Max 5MB each</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP 5: Member Benefits ═══ */}
          {step === 5 && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Gift size={22} style={{ color: 'var(--primary-600)' }} />
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800 }}>Member Benefits</h2>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8 }}>Offer exclusive benefits to Professionals Club members. This helps attract clients and builds community trust.</p>
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', fontSize: '0.78rem', color: '#92400e', fontWeight: 500, marginBottom: 28 }}>
                ⚠️ This section is <strong>mandatory</strong>. All listed businesses must offer at least one member benefit.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Discount Percentage</label>
                    <input type="text" value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} placeholder="e.g. 15%" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Offer Type</label>
                    <select value={offerType} onChange={e => setOfferType(e.target.value)} style={inputStyle}>
                      <option value="permanent">Permanent Offer</option>
                      <option value="limited">Limited Time Offer</option>
                      <option value="seasonal">Seasonal Offer</option>
                      <option value="first_time">First-Time Client Only</option>
                    </select>
                  </div>
                </div>

                {offerType === 'limited' && (
                  <div>
                    <label style={labelStyle}>Offer Expiry Date</label>
                    <input type="date" value={offerExpiry} onChange={e => setOfferExpiry(e.target.value)} style={{ ...inputStyle, maxWidth: 220 }} />
                  </div>
                )}

                <div>
                  <label style={labelStyle}>Offer Description <span style={reqStyle}>*</span></label>
                  <textarea value={offerDescription} onChange={e => setOfferDescription(e.target.value)} placeholder="e.g. 15% off all tax services for Professionals Club members. Free 20-minute initial consultation included." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                  <span style={hintStyle}>This text will appear on your listing card and profile page</span>
                </div>

                <div>
                  <label style={labelStyle}>Additional Benefits</label>
                  <span style={hintStyle}>List each individual benefit you offer to members</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    {additionalBenefits.map((b, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="text" value={b} onChange={e => updateBenefit(i, e.target.value)} placeholder={`Benefit ${i + 1} (e.g. Free initial assessment)`} style={{ ...inputStyle, flex: 1 }} />
                        {additionalBenefits.length > 1 && (
                          <button type="button" onClick={() => removeBenefit(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem', padding: '4px 8px' }}>×</button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={addBenefit} style={{ alignSelf: 'flex-start', padding: '6px 14px', borderRadius: 8, border: '1px dashed var(--gray-300)', background: 'none', fontSize: '0.78rem', fontWeight: 600, color: 'var(--primary-600)', cursor: 'pointer' }}>+ Add Another Benefit</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP 6: Operations & Media ═══ */}
          {step === 6 && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Camera size={22} style={{ color: 'var(--primary-600)' }} />
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800 }}>Operations & Media</h2>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 28 }}>Tell us when and how you operate, and share media to enhance your listing.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={labelStyle}>Business Hours <span style={reqStyle}>*</span></label>
                  <input type="text" value={businessHours} onChange={e => setBusinessHours(e.target.value)} placeholder="e.g. Mon–Fri 9AM–6PM, Sat 10AM–2PM" style={inputStyle} />
                </div>

                <div>
                  <label style={labelStyle}>Service Mode <span style={reqStyle}>*</span></label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                    {SERVICE_MODES.map(mode => (
                      <label key={mode.value} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10, border: `1.5px solid ${serviceMode === mode.value ? 'var(--primary-500)' : 'var(--gray-200)'}`, cursor: 'pointer', background: serviceMode === mode.value ? 'rgba(99,102,241,0.04)' : 'white', transition: 'all 0.15s' }}>
                        <input type="radio" name="serviceMode" value={mode.value} checked={serviceMode === mode.value} onChange={e => setServiceMode(e.target.value)} style={{ accentColor: 'var(--primary-600)' }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: serviceMode === mode.value ? 600 : 400 }}>{mode.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ height: 1, background: 'var(--gray-100)', margin: '4px 0' }} />

                {/* Image Upload */}
                <div>
                  <label style={labelStyle}>Business Photos / Gallery</label>
                  <div style={{ border: '2px dashed var(--gray-200)', borderRadius: 14, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: 'var(--gray-50)' }}>
                    <Camera size={28} style={{ color: 'var(--gray-400)', margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Upload business photos</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>Office, team, storefront, work samples. Max 5 images, 5MB each</div>
                  </div>
                </div>

                <div style={{ height: 1, background: 'var(--gray-100)', margin: '4px 0' }} />

                {/* Testimonials */}
                <div>
                  <label style={labelStyle}>Client Testimonials</label>
                  <span style={hintStyle}>Share 1–2 testimonials from satisfied clients (optional but recommended)</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                    <div>
                      <textarea value={testimonial1} onChange={e => setTestimonial1(e.target.value)} placeholder={`"They made my first Canadian tax filing incredibly smooth..." — Client Name`} rows={2} style={{ ...inputStyle, resize: 'vertical', fontStyle: 'italic' }} />
                    </div>
                    <div>
                      <textarea value={testimonial2} onChange={e => setTestimonial2(e.target.value)} placeholder={`"Highly professional team. Would recommend to every newcomer." — Client Name`} rows={2} style={{ ...inputStyle, resize: 'vertical', fontStyle: 'italic' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP 7: Social & Promotion ═══ */}
          {step === 7 && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Megaphone size={22} style={{ color: 'var(--primary-600)' }} />
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800 }}>Social Links & Promotion</h2>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 28 }}>Add your social profiles and let us know if you&rsquo;re interested in premium promotion.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={labelStyle}>Social Media Links</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { icon: <Briefcase size={16} />, label: 'LinkedIn', val: linkedinUrl, set: setLinkedinUrl, ph: 'https://linkedin.com/company/...' },
                      { icon: <Link2 size={16} />, label: 'Instagram', val: instagramUrl, set: setInstagramUrl, ph: 'https://instagram.com/...' },
                      { icon: <Globe size={16} />, label: 'Facebook', val: facebookUrl, set: setFacebookUrl, ph: 'https://facebook.com/...' },
                      { icon: <Video size={16} />, label: 'YouTube', val: youtubeUrl, set: setYoutubeUrl, ph: 'https://youtube.com/@...' },
                      { icon: <AtSign size={16} />, label: 'Twitter / X', val: twitterUrl, set: setTwitterUrl, ph: 'https://x.com/...' },
                    ].map(s => (
                      <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--gray-50)', border: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-500)', flexShrink: 0 }}>{s.icon}</div>
                        <input type="url" value={s.val} onChange={e => s.set(e.target.value)} placeholder={s.ph} style={{ ...inputStyle, flex: 1 }} />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Google Reviews Link</label>
                  <input type="url" value={googleReviewUrl} onChange={e => setGoogleReviewUrl(e.target.value)} placeholder="https://g.co/kgs/..." style={inputStyle} />
                  <span style={hintStyle}>Link to your Google Business reviews page</span>
                </div>

                <div style={{ height: 1, background: 'var(--gray-100)', margin: '4px 0' }} />

                {/* Promotion Interest */}
                <div>
                  <label style={labelStyle}>Promotion Interest <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                  <span style={hintStyle}>Select any premium promotions you&rsquo;d be interested in. Our team will reach out with details.</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                    {PROMOTION_OPTIONS.map(opt => (
                      <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10, border: `1.5px solid ${promotionInterests.includes(opt.value) ? 'var(--primary-500)' : 'var(--gray-200)'}`, cursor: 'pointer', background: promotionInterests.includes(opt.value) ? 'rgba(99,102,241,0.04)' : 'white', transition: 'all 0.15s' }}>
                        <input type="checkbox" checked={promotionInterests.includes(opt.value)} onChange={() => togglePromotion(opt.value)} style={{ accentColor: 'var(--primary-600)', width: 16, height: 16 }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: promotionInterests.includes(opt.value) ? 600 : 400 }}>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP 8: Verification & Consent ═══ */}
          {step === 8 && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <ShieldCheck size={22} style={{ color: 'var(--primary-600)' }} />
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800 }}>Verification & Consent</h2>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 28 }}>Review and confirm the following before submitting your application.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Summary */}
                <div style={{ padding: 20, borderRadius: 14, background: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 12 }}>📋 Application Summary</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <div><strong>Business:</strong> {businessName || '—'}</div>
                    <div><strong>Category:</strong> {category || '—'}</div>
                    <div><strong>Contact:</strong> {contactPerson || '—'}</div>
                    <div><strong>City:</strong> {city || '—'}, {province || '—'}</div>
                    <div><strong>Services:</strong> {services.filter(s => s.trim()).length} listed</div>
                    <div><strong>Member Offer:</strong> {discountPercent || 'Custom offer'}</div>
                  </div>
                </div>

                <div style={{ height: 1, background: 'var(--gray-100)' }} />

                {/* Declarations */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 14 }}>Declarations</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <label style={checkboxRowStyle}>
                      <input type="checkbox" checked={accuracyConfirm} onChange={e => setAccuracyConfirm(e.target.checked)} style={checkboxStyle} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Accuracy Confirmation <span style={reqStyle}>*</span></div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>I confirm that all information provided is accurate and truthful. I understand that misrepresentation may result in listing removal.</div>
                      </div>
                    </label>

                    <label style={checkboxRowStyle}>
                      <input type="checkbox" checked={adminReviewAgree} onChange={e => setAdminReviewAgree(e.target.checked)} style={checkboxStyle} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Admin Review Agreement <span style={reqStyle}>*</span></div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>I understand that my listing will be reviewed by the Professionals Club admin team before publication. Listing will not go live until verified.</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div style={{ height: 1, background: 'var(--gray-100)' }} />

                {/* Consents */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 14 }}>Consent & Permissions</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <label style={checkboxRowStyle}>
                      <input type="checkbox" checked={allowPublicListing} onChange={e => setAllowPublicListing(e.target.checked)} style={checkboxStyle} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Allow Public Listing <span style={reqStyle}>*</span></div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>I authorize Professionals Club to display my business name, description, services, and contact details on the public Business Directory.</div>
                      </div>
                    </label>

                    <label style={checkboxRowStyle}>
                      <input type="checkbox" checked={allowDirectContact} onChange={e => setAllowDirectContact(e.target.checked)} style={checkboxStyle} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Allow Direct Contact by Members</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>I authorize members to contact my business directly via the provided phone number, email, and website. (Recommended)</div>
                      </div>
                    </label>

                    <label style={checkboxRowStyle}>
                      <input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} style={checkboxStyle} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Accept Platform Terms <span style={reqStyle}>*</span></div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>I agree to the Professionals Club Business Directory Terms of Service and understand that my listing may be removed if I violate community guidelines.</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* What happens next */}
                <div style={{ padding: 16, borderRadius: 12, background: 'rgba(0,103,165,0.04)', border: '1px solid rgba(0,103,165,0.12)', marginTop: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary-700)', marginBottom: 8 }}>What happens after submission?</div>
                  <ol style={{ margin: 0, paddingLeft: 18, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                    <li>Your application is stored as <strong>&ldquo;Pending Review&rdquo;</strong></li>
                    <li>Admin team verifies your business details and credentials</li>
                    <li>You&rsquo;ll receive email confirmation within 2–3 business days</li>
                    <li>Once approved, your listing goes live on the directory</li>
                    <li>Admin may contact you for additional verification if needed</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 36, paddingTop: 24, borderTop: '1px solid var(--gray-100)' }}>
            {step > 1 ? (
              <button type="button" onClick={() => setStep(s => s - 1)} className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                <ArrowLeft size={16} /> Back
              </button>
            ) : (
              <Link href="/businesses" className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                <ArrowLeft size={16} /> Back to Directory
              </Link>
            )}

            {step < STEPS.length ? (
              <button type="button" onClick={() => setStep(s => s + 1)} disabled={!canProceed()} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', opacity: canProceed() ? 1 : 0.5, cursor: canProceed() ? 'pointer' : 'not-allowed' }}>
                Continue <ArrowRight size={16} />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={!canProceed()} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem', padding: '12px 28px', opacity: canProceed() ? 1 : 0.5, cursor: canProceed() ? 'pointer' : 'not-allowed', background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 8px 24px rgba(5,150,105,0.3)' }}>
                <CheckCircle size={18} /> Submit Application
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shared Styles ──
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: 6,
};
const reqStyle: React.CSSProperties = { color: '#ef4444', fontWeight: 700 };
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--gray-200)',
  fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-sans)', background: 'white',
  transition: 'border-color 0.2s',
};
const hintStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4,
};
const checkboxRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 12,
  border: '1.5px solid var(--gray-200)', cursor: 'pointer', background: 'white', transition: 'all 0.15s',
};
const checkboxStyle: React.CSSProperties = {
  marginTop: 2, accentColor: 'var(--primary-600)', width: 18, height: 18, flexShrink: 0,
};
