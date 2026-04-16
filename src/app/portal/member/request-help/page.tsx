'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePortal } from '@/context/portal-context';
import { useApp } from '@/context/app-context';
import { SUPPORT_CATEGORIES } from '@/types';
import { CheckCircle2, Upload, AlertCircle, ArrowLeft, ArrowRight, Shield } from 'lucide-react';

export default function RequestHelpPage() {
  const router = useRouter();
  const { currentUserId } = useApp();
  const { addHelpRequest } = usePortal();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState('Priya');
  const [lastName, setLastName] = useState('Sharma');
  const [email, setEmail] = useState('priya.sharma@gmail.com');
  const [phone, setPhone] = useState('+1-416-555-0101');
  const [pcNumber, setPcNumber] = useState('PC-2025-0042');
  const [city, setCity] = useState('Toronto');
  const [province, setProvince] = useState('Ontario');
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [timeline, setTimeline] = useState('');
  const [supportType, setSupportType] = useState<'one_time' | 'ongoing_mentorship'>('one_time');
  const [openToGroup, setOpenToGroup] = useState(false);
  const [consent, setConsent] = useState(false);

  const totalSteps = 4;

  const handleSubmit = () => {
    if (!consent) return;
    setIsSubmitting(true);
    setTimeout(() => {
      addHelpRequest({
        memberId: currentUserId,
        memberName: `${firstName} ${lastName}`,
        category: category as any,
        title,
        description,
        urgency,
        preferredTimeline: timeline,
        previouslyRequested: false,
        documentsRequired: false,
        documents: [],
        consentGiven: true,
        supportType,
        openToGroupResources: openToGroup,
        contactByAdminOnly: true,
      });
      setIsSubmitting(false);
      router.push('/portal/member/my-requests');
    }, 1000);
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }} className="animate-fade-in">
      <div style={{ marginBottom: 32 }}>
        <h1 className="text-3xl font-bold font-display mb-2">Request Help</h1>
        <p className="text-secondary">Tell us what you need. Your request will be reviewed by our admin team and routed to the right volunteer.</p>
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <React.Fragment key={i}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '0.85rem', border: '3px solid',
              borderColor: step > i + 1 ? '#059669' : step === i + 1 ? 'var(--primary-500)' : '#e5e7eb',
              background: step > i + 1 ? '#059669' : step === i + 1 ? 'var(--primary-500)' : 'transparent',
              color: step >= i + 1 ? 'white' : '#9ca3af',
            }}>
              {step > i + 1 ? <CheckCircle2 size={18} /> : i + 1}
            </div>
            {i < totalSteps - 1 && (
              <div style={{ width: 48, height: 3, borderRadius: 2, background: step > i + 1 ? '#059669' : '#e5e7eb' }} />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="card" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

        {/* Step 1: Identity */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 className="text-xl font-bold">Your Information</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="input-group"><label>First Name</label><input className="input" value={firstName} onChange={e => setFirstName(e.target.value)} /></div>
              <div className="input-group"><label>Last Name</label><input className="input" value={lastName} onChange={e => setLastName(e.target.value)} /></div>
              <div className="input-group"><label>Email</label><input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
              <div className="input-group"><label>Phone</label><input className="input" value={phone} onChange={e => setPhone(e.target.value)} /></div>
              <div className="input-group"><label>PC Member Number (optional)</label><input className="input" value={pcNumber} onChange={e => setPcNumber(e.target.value)} /></div>
              <div className="input-group"><label>City</label><input className="input" value={city} onChange={e => setCity(e.target.value)} /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setStep(2)} disabled={!firstName || !lastName || !email}>
                Continue <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Category */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 className="text-xl font-bold">What do you need help with?</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {SUPPORT_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  style={{
                    padding: '14px 16px', borderRadius: 10, border: '2px solid',
                    borderColor: category === cat ? 'var(--primary-500)' : '#e5e7eb',
                    background: category === cat ? 'rgba(99,102,241,0.06)' : 'white',
                    cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem', fontWeight: category === cat ? 700 : 500,
                    color: category === cat ? 'var(--primary-700)' : '#374151',
                    transition: 'all 0.15s',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-outline" onClick={() => setStep(1)}><ArrowLeft size={16} /> Back</button>
              <button className="btn btn-primary" onClick={() => setStep(3)} disabled={!category}>Continue <ArrowRight size={16} /></button>
            </div>
          </div>
        )}

        {/* Step 3: Details */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 className="text-xl font-bold">Request Details</h2>
            <div className="input-group">
              <label>Title of Request</label>
              <input className="input" placeholder="Brief title for your request" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Detailed Description</label>
              <textarea className="input" rows={4} placeholder="Describe your situation and what kind of help you need..." value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="input-group">
                <label>Urgency</label>
                <select className="input" value={urgency} onChange={e => setUrgency(e.target.value as any)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="input-group">
                <label>Preferred Timeline</label>
                <input className="input" placeholder="e.g. Within 2 weeks" value={timeline} onChange={e => setTimeline(e.target.value)} />
              </div>
            </div>
            <div className="input-group">
              <label>Support Type</label>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setSupportType('one_time')} style={{ padding: '10px 16px', borderRadius: 8, border: '2px solid', borderColor: supportType === 'one_time' ? 'var(--primary-500)' : '#e5e7eb', background: supportType === 'one_time' ? 'rgba(99,102,241,0.06)' : 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                  One-time help
                </button>
                <button onClick={() => setSupportType('ongoing_mentorship')} style={{ padding: '10px 16px', borderRadius: 8, border: '2px solid', borderColor: supportType === 'ongoing_mentorship' ? 'var(--primary-500)' : '#e5e7eb', background: supportType === 'ongoing_mentorship' ? 'rgba(99,102,241,0.06)' : 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                  Ongoing mentorship
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="group" checked={openToGroup} onChange={() => setOpenToGroup(!openToGroup)} />
              <label htmlFor="group" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>I am open to group resources instead of 1:1 support</label>
            </div>
            {/* Upload area */}
            <div style={{ border: '2px dashed #d1d5db', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: '#fafafa' }}>
              <Upload size={24} style={{ color: '#9ca3af' }} />
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6b7280' }}>Upload supporting documents (optional)</div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>PDF, DOC, or image files up to 10MB</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-outline" onClick={() => setStep(2)}><ArrowLeft size={16} /> Back</button>
              <button className="btn btn-primary" onClick={() => setStep(4)} disabled={!title || description.length < 20}>Review <ArrowRight size={16} /></button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Submit */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 className="text-xl font-bold">Review & Submit</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: 16, borderRadius: 10, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Name</div>
                <div style={{ fontWeight: 600 }}>{firstName} {lastName}</div>
              </div>
              <div style={{ padding: 16, borderRadius: 10, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Category</div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{category}</div>
              </div>
              <div style={{ padding: 16, borderRadius: 10, background: '#f9fafb', border: '1px solid #e5e7eb', gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Request Title</div>
                <div style={{ fontWeight: 600 }}>{title}</div>
              </div>
              <div style={{ padding: 16, borderRadius: 10, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Urgency</div>
                <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{urgency}</div>
              </div>
              <div style={{ padding: 16, borderRadius: 10, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Support Type</div>
                <div style={{ fontWeight: 600 }}>{supportType === 'one_time' ? 'One-time' : 'Ongoing Mentorship'}</div>
              </div>
            </div>

            {/* Disclaimers */}
            <div style={{ padding: 16, borderRadius: 10, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', gap: 12 }}>
              <AlertCircle size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: '0.8rem', color: '#92400e', lineHeight: 1.6 }}>
                <strong>Important:</strong> Your request will be sent to our admin team for review. A volunteer may be assigned to assist you. All communication will be admin-mediated — no one will contact you directly.
              </div>
            </div>

            {/* Consent */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderRadius: 10, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <input type="checkbox" id="consent" checked={consent} onChange={() => setConsent(!consent)} style={{ marginTop: 3 }} />
              <label htmlFor="consent" style={{ fontSize: '0.8rem', cursor: 'pointer', lineHeight: 1.5 }}>
                I agree to the platform terms and conditions. I understand that all support is community-based, admin-mediated, and does not constitute professional advice. I consent to admin reviewing my request and assigning a volunteer if appropriate.
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-outline" onClick={() => setStep(3)}><ArrowLeft size={16} /> Edit</button>
              <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={isSubmitting || !consent}>
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
