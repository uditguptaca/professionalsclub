'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePortal } from '@/context/portal-context';
import { useApp } from '@/context/app-context';
import { submitHelpRequest } from '@/app/actions/portal';
import { AttachmentField, type Attachment } from '@/components/portal/AttachmentField';
import { SUPPORT_CATEGORIES } from '@/types';
import { CheckCircle2, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';

export default function RequestHelpPage() {
  const router = useRouter();
  const { profile } = useApp();
  const { refresh } = usePortal();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // The name is the only identity field this form writes (help_requests.member_name),
  // so it is the only one that is editable. Email, phone, PC number and city are
  // read straight off the profile below: the table has no columns for them, and
  // showing editable inputs for values that are dropped on submit was a lie.
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [timeline, setTimeline] = useState('');
  const [supportType, setSupportType] = useState<'one_time' | 'ongoing_mentorship'>('one_time');
  const [openToGroup, setOpenToGroup] = useState(false);
  const [consent, setConsent] = useState(false);
  const [documents, setDocuments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(0);

  const totalSteps = 4;

  // The profile arrives from the server on first render; seed the name once it does.
  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.firstName ?? '');
    setLastName(profile.lastName ?? '');
  }, [profile]);

  const handleSubmit = async () => {
    // Submitting mid-upload would drop the attachment that is still in flight.
    if (!consent || isSubmitting || uploading > 0) return;
    setIsSubmitting(true);
    setSubmitError('');

    // The action is called directly rather than through usePortal because the
    // context helper returns void: this page used to navigate away regardless of
    // the outcome, dropping the member on an empty list believing they had filed
    // a request.
    //
    // member_id is set server-side from the session; sending it from here would
    // be ignored anyway.
    const result = await submitHelpRequest({
      memberName: `${firstName} ${lastName}`.trim(),
      category,
      title,
      description,
      urgency,
      preferredTimeline: timeline,
      previouslyRequested: false,
      documentsRequired: false,
      documents: documents.map(d => d.url),
      consentGiven: true,
      supportType,
      openToGroupResources: openToGroup,
      contactByAdminOnly: true,
    });

    if (!result.ok) {
      setSubmitError(result.error);
      setIsSubmitting(false);
      return;
    }

    // The list page renders from the portal snapshot, so re-read it before
    // navigating: otherwise the request that was just written is missing.
    await refresh();
    router.push('/portal/member/my-requests');
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }} className="animate-fade-in">
      <div style={{ marginBottom: 32 }}>
        <h1 className="text-3xl font-bold font-display mb-2">Request Help</h1>
        <p className="text-secondary">Tell us what you need. Your request will be securely reviewed and routed to the right volunteer.</p>
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <React.Fragment key={i}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '0.85rem', border: '3px solid',
              borderColor: step > i + 1 ? 'var(--success-600)' : step === i + 1 ? 'var(--primary-500)' : 'var(--border-color)',
              background: step > i + 1 ? 'var(--success-600)' : step === i + 1 ? 'var(--primary-500)' : 'transparent',
              color: step >= i + 1 ? 'white' : 'var(--text-muted)',
            }}>
              {step > i + 1 ? <CheckCircle2 size={18} /> : i + 1}
            </div>
            {i < totalSteps - 1 && (
              <div style={{ width: 48, height: 3, borderRadius: 2, background: step > i + 1 ? 'var(--success-600)' : 'var(--border-color)' }} />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="card" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

        {/* Step 1: Identity */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 className="text-xl font-bold">Your Information</h2>
            <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="input-group"><label>First Name</label><input className="input" value={firstName} onChange={e => setFirstName(e.target.value)} /></div>
              <div className="input-group"><label>Last Name</label><input className="input" value={lastName} onChange={e => setLastName(e.target.value)} /></div>
            </div>

            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Contact details from your profile
              </div>
              <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Email', value: profile?.email },
                  { label: 'Phone', value: profile?.phone },
                  { label: 'PC Member Number', value: profile?.pcNumber },
                  { label: 'City', value: profile?.city },
                ].map(field => (
                  <div key={field.label} style={{ padding: 16, borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{field.label}</div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: field.value ? undefined : 'var(--text-muted)' }}>
                      {field.value || 'Not on file'}
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 10 }}>
                The reviewing admin reads these from your member record.{' '}
                <Link href="/portal/member/profile" style={{ color: 'var(--primary-600)', fontWeight: 600 }}>
                  Update your profile
                </Link>{' '}
                to change them.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setStep(2)} disabled={!firstName || !lastName}>
                Continue <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Category */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 className="text-xl font-bold">What do you need help with?</h2>
            
            <div className="input-group">
              <select 
                className="input" 
                value={category} 
                onChange={e => setCategory(e.target.value)}
                style={{ padding: '14px', fontSize: '0.95rem' }}
              >
                <option value="" disabled>Select a category...</option>
                {SUPPORT_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
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
            <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
                <button onClick={() => setSupportType('one_time')} style={{ padding: '10px 16px', borderRadius: 8, border: '2px solid', borderColor: supportType === 'one_time' ? 'var(--primary-500)' : 'var(--border-color)', background: supportType === 'one_time' ? 'rgba(232, 93, 4, 0.06)' : 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                  One-time help
                </button>
                <button onClick={() => setSupportType('ongoing_mentorship')} style={{ padding: '10px 16px', borderRadius: 8, border: '2px solid', borderColor: supportType === 'ongoing_mentorship' ? 'var(--primary-500)' : 'var(--border-color)', background: supportType === 'ongoing_mentorship' ? 'rgba(232, 93, 4, 0.06)' : 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                  Ongoing mentorship
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="group" checked={openToGroup} onChange={() => setOpenToGroup(!openToGroup)} />
              <label htmlFor="group" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>I am open to group resources instead of 1:1 support</label>
            </div>
            <AttachmentField
              label="Upload supporting documents (optional)"
              maxFiles={5}
              files={documents}
              setFiles={setDocuments}
              pending={uploading}
              setPending={setUploading}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-outline" onClick={() => setStep(2)}><ArrowLeft size={16} /> Back</button>
              <button className="btn btn-primary" onClick={() => setStep(4)} disabled={!title || description.length < 20 || uploading > 0}>Review <ArrowRight size={16} /></button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Submit */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 className="text-xl font-bold">Review & Submit</h2>

            <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: 16, borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Name</div>
                <div style={{ fontWeight: 600 }}>{firstName} {lastName}</div>
              </div>
              <div style={{ padding: 16, borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Category</div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{category}</div>
              </div>
              <div style={{ padding: 16, borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Request Title</div>
                <div style={{ fontWeight: 600 }}>{title}</div>
              </div>
              <div style={{ padding: 16, borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Urgency</div>
                <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{urgency}</div>
              </div>
              <div style={{ padding: 16, borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Support Type</div>
                <div style={{ fontWeight: 600 }}>{supportType === 'one_time' ? 'One-time' : 'Ongoing Mentorship'}</div>
              </div>
              {documents.length > 0 && (
                <div style={{ padding: 16, borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Attachments</div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{documents.map(d => d.name).join(', ')}</div>
                </div>
              )}
            </div>

            {/* Disclaimers */}
            <div style={{ padding: 16, borderRadius: 10, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', gap: 12 }}>
              <AlertCircle size={18} style={{ color: 'var(--accent-600)', flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: '0.8rem', color: 'var(--primary-800)', lineHeight: 1.6 }}>
                <strong>Important:</strong> Your request will be sent for secure review. A volunteer may be assigned to assist you. All communication will be securely routed — no one will contact you directly outside the platform.
              </div>
            </div>

            {/* Consent */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <input type="checkbox" id="consent" checked={consent} onChange={() => setConsent(!consent)} style={{ marginTop: 3 }} />
              <label htmlFor="consent" style={{ fontSize: '0.8rem', cursor: 'pointer', lineHeight: 1.5 }}>
                I agree to the platform terms and conditions. I understand that all support is community-based, securely routed, and does not constitute professional advice. I consent to the platform reviewing my request and assigning a volunteer if appropriate.
              </label>
            </div>

            {submitError && (
              <div role="alert" style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(240,73,35,0.1)', color: 'var(--error-500)', fontSize: '0.85rem', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{submitError}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-outline" onClick={() => setStep(3)}><ArrowLeft size={16} /> Edit</button>
              <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={isSubmitting || !consent || uploading > 0}>
                {isSubmitting ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
