'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePortal } from '@/context/portal-context';
import { useApp } from '@/context/app-context';
import { submitHelpRequest } from '@/app/actions/portal';
import { AttachmentField, type Attachment } from '@/components/portal/AttachmentField';
import { SUPPORT_CATEGORIES } from '@/types';
import {
  AlertCircle, ArrowLeft, ArrowRight, BadgeCheck, Check, ChevronRight, Clock,
  Mail, MapPin, Paperclip, Phone, Repeat, ShieldCheck, Tag, User, Users, FileText,
} from 'lucide-react';

/**
 * Request help, restyled to the portal's row-and-sheet language: one question
 * per step, grouped cards, tappable category tiles instead of a select, and
 * segmented pills instead of bordered radio buttons. The flow, the payload and
 * the guards around it are unchanged.
 */

const STEP_NAMES = ['About you', 'Topic', 'Details', 'Review'];
const TOTAL_STEPS = 4;

const URGENCIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
] as const;

const SUPPORT_TYPES = [
  { value: 'one_time', label: 'One-time help' },
  { value: 'ongoing_mentorship', label: 'Ongoing mentorship' },
] as const;

/** Segmented pill group, per the portal's filter/choice pattern. */
const segWrap: React.CSSProperties = {
  display: 'flex', gap: 4, padding: 4,
  background: 'var(--bg-primary)', borderRadius: 999,
  border: '1px solid rgba(27,67,50,0.08)',
  width: 'fit-content', maxWidth: '100%', overflowX: 'auto',
};
const segPill = (on: boolean): React.CSSProperties => ({
  minHeight: 44, border: 0, borderRadius: 999, padding: '0 16px',
  font: 'inherit', fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap',
  background: on ? 'var(--green-950)' : 'none',
  color: on ? '#fff' : 'var(--text-secondary)',
  fontWeight: on ? 700 : 600,
});

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

  const totalSteps = TOTAL_STEPS;

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

  /** One read-only summary row: icon, label, value. */
  const infoRow = (icon: React.ReactNode, label: string, value: string, empty = 'Not on file') => (
    <div className="pp-row pp-row-static" key={label}>
      <span className="pp-row-icon">{icon}</span>
      <span className="pp-row-body">
        <small>{label}</small>
        {value
          ? <strong>{value}</strong>
          : <strong style={{ color: 'var(--text-muted)', fontWeight: 650 }}>{empty}</strong>}
      </span>
    </div>
  );

  return (
    <div className="pp2 animate-fade-in">
      <header style={{ marginBottom: 18 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800,
          letterSpacing: '-0.01em', margin: '0 0 6px',
        }}>
          Request help
        </h1>
        <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.55, color: 'var(--text-secondary)' }}>
          Tell us what you need. An admin reads every request and routes it to the
          right volunteer.
        </p>
      </header>

      {/* Progress: a hairline bar, not a row of numbered circles. */}
      <div style={{ marginBottom: 22 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          marginBottom: 8, fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)',
        }}>
          <span>Step {step} of {totalSteps}</span>
          <span>{STEP_NAMES[step - 1]}</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-label="Request progress"
          style={{ height: 4, borderRadius: 999, background: 'rgba(27,67,50,0.08)', overflow: 'hidden' }}
        >
          <div style={{
            height: '100%', width: `${(step / totalSteps) * 100}%`, borderRadius: 999,
            background: 'var(--primary-700)', transition: 'width 0.3s cubic-bezier(0.22,1,0.36,1)',
          }} />
        </div>
      </div>

      <div className="pp-groups">

        {/* ---- Step 1: who is asking ---- */}
        {step === 1 && (
          <>
            <section className="pp-group">
              <h2>Your name</h2>
              <p className="pp-group-sub">This is the name the reviewing admin sees on the case.</p>
              <div className="pp-group-card" style={{ padding: '0.95rem' }}>
                <div className="pp-sheet-fields" style={{ margin: 0 }}>
                  <div className="pp-field">
                    <label htmlFor="rh-first">First name</label>
                    <input
                      id="rh-first" autoComplete="given-name" value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="pp-field">
                    <label htmlFor="rh-last">Last name</label>
                    <input
                      id="rh-last" autoComplete="family-name" value={lastName}
                      onChange={e => setLastName(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="pp-group">
              <h2>From your profile</h2>
              <p className="pp-group-sub">
                The reviewing admin reads these from your member record. Change them in your profile.
              </p>
              <div className="pp-group-card">
                {infoRow(<Mail size={17} />, 'Email', profile?.email ?? '')}
                {infoRow(<Phone size={17} />, 'Phone', profile?.phone ?? '')}
                {infoRow(<BadgeCheck size={17} />, 'Member number', profile?.pcNumber ?? '')}
                {infoRow(<MapPin size={17} />, 'City', profile?.city ?? '')}
                <Link href="/portal/member/profile" className="pp-row">
                  <span className="pp-row-icon"><User size={17} /></span>
                  <span className="pp-row-body"><strong>Update your profile</strong></span>
                  <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
                </Link>
              </div>
            </section>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-primary" style={{ flex: 1 }}
                onClick={() => setStep(2)} disabled={!firstName || !lastName}
              >
                Continue <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}

        {/* ---- Step 2: the topic, as tappable tiles ---- */}
        {step === 2 && (
          <>
            <section className="pp-group">
              <h2>What do you need help with?</h2>
              <p className="pp-group-sub">Pick the closest match — an admin can re-route it later.</p>
              <div
                role="radiogroup"
                aria-label="Support category"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(9.5rem, 1fr))', gap: 10 }}
              >
                {SUPPORT_CATEGORIES.map(cat => {
                  const on = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setCategory(cat)}
                      style={{
                        display: 'flex', flexDirection: 'column', gap: 10,
                        minHeight: '6rem', padding: '0.85rem 0.9rem',
                        textAlign: 'left', cursor: 'pointer', font: 'inherit',
                        borderRadius: '1rem',
                        border: `1.5px solid ${on ? 'var(--primary-700)' : 'rgba(27,67,50,0.08)'}`,
                        background: on ? 'rgba(232,93,4,0.06)' : 'var(--bg-primary)',
                        color: on ? 'var(--primary-800)' : 'var(--text-primary)',
                        fontSize: '0.86rem', fontWeight: on ? 750 : 650, lineHeight: 1.35,
                        boxShadow: on ? 'none' : '0 6px 20px -14px rgba(15,35,24,0.25)',
                        transition: 'border-color 0.15s ease, background 0.15s ease',
                      }}
                    >
                      <span style={{
                        display: 'grid', placeItems: 'center', flexShrink: 0,
                        width: '1.5rem', height: '1.5rem', borderRadius: '50%',
                        background: on ? 'var(--primary-700)' : 'rgba(27,67,50,0.06)',
                        color: on ? '#fff' : 'transparent',
                      }}>
                        <Check size={13} aria-hidden="true" />
                      </span>
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" onClick={() => setStep(1)}>
                <ArrowLeft size={16} /> Back
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setStep(3)} disabled={!category}>
                Continue <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}

        {/* ---- Step 3: the details ---- */}
        {step === 3 && (
          <>
            <section className="pp-group">
              <h2>Your request</h2>
              <p className="pp-group-sub">A short title, then as much context as you can give.</p>
              <div className="pp-group-card" style={{ padding: '0.95rem' }}>
                <div className="pp-sheet-fields" style={{ margin: 0 }}>
                  <div className="pp-field">
                    <label htmlFor="rh-title">Title</label>
                    <input
                      id="rh-title" placeholder="e.g. Resume review for a data role"
                      value={title} onChange={e => setTitle(e.target.value)}
                    />
                  </div>
                  <div className="pp-field">
                    <label htmlFor="rh-description">What is going on?</label>
                    <textarea
                      id="rh-description" rows={5}
                      placeholder="Describe your situation and the kind of help you are looking for."
                      value={description} onChange={e => setDescription(e.target.value)}
                    />
                    {description.length > 0 && description.length < 20 ? (
                      <span role="alert" style={{
                        display: 'block', marginTop: 6, marginLeft: '0.2rem',
                        fontSize: '0.74rem', fontWeight: 650, color: 'var(--accent-700)',
                      }}>
                        {20 - description.length} more {20 - description.length === 1 ? 'character' : 'characters'} needed before you can continue.
                      </span>
                    ) : (
                      <span style={{
                        display: 'block', marginTop: 6, marginLeft: '0.2rem',
                        fontSize: '0.74rem', color: 'var(--text-muted)',
                      }}>
                        At least 20 characters.
                      </span>
                    )}
                  </div>
                  <div className="pp-field">
                    <label htmlFor="rh-timeline">Preferred timeline</label>
                    <input
                      id="rh-timeline" placeholder="e.g. Within 2 weeks"
                      value={timeline} onChange={e => setTimeline(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="pp-group">
              <h2>How urgent is it?</h2>
              <div role="radiogroup" aria-label="Urgency" style={segWrap}>
                {URGENCIES.map(u => (
                  <button
                    key={u.value} type="button" role="radio" aria-checked={urgency === u.value}
                    onClick={() => setUrgency(u.value)} style={segPill(urgency === u.value)}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="pp-group">
              <h2>What kind of support?</h2>
              <div role="radiogroup" aria-label="Support type" style={segWrap}>
                {SUPPORT_TYPES.map(t => (
                  <button
                    key={t.value} type="button" role="radio" aria-checked={supportType === t.value}
                    onClick={() => setSupportType(t.value)} style={segPill(supportType === t.value)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="pp-group-card" style={{ marginTop: 12 }}>
                <div className="pp-row pp-row-static">
                  <span className="pp-row-icon"><Users size={17} /></span>
                  <span className="pp-row-body">
                    <small>Instead of 1:1 support</small>
                    <strong>Group resources are fine</strong>
                  </span>
                  <button
                    type="button"
                    className={`pp-toggle ${openToGroup ? 'is-on' : ''}`}
                    onClick={() => setOpenToGroup(!openToGroup)}
                    aria-pressed={openToGroup}
                    aria-label="I am open to group resources instead of 1:1 support"
                  >
                    <span className="pp-toggle-dot" aria-hidden="true" />
                    {openToGroup ? 'Yes' : 'No'}
                  </button>
                </div>
              </div>
            </section>

            <section className="pp-group">
              <h2>Attachments</h2>
              <p className="pp-group-sub">
                Optional. A resume, a letter, a screenshot — anything that helps the volunteer.
              </p>
              <AttachmentField
                label="Choose files or drop them here"
                maxFiles={5}
                files={documents}
                setFiles={setDocuments}
                pending={uploading}
                setPending={setUploading}
              />
            </section>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" onClick={() => setStep(2)}>
                <ArrowLeft size={16} /> Back
              </button>
              <button
                className="btn btn-primary" style={{ flex: 1 }} onClick={() => setStep(4)}
                disabled={!title || description.length < 20 || uploading > 0}
              >
                Review <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}

        {/* ---- Step 4: review & submit ---- */}
        {step === 4 && (
          <>
            <section className="pp-group">
              <h2>Check and submit</h2>
              <p className="pp-group-sub">One last look before this goes to the review queue.</p>
              <div className="pp-group-card">
                {infoRow(<User size={17} />, 'From', `${firstName} ${lastName}`.trim())}
                {infoRow(<Tag size={17} />, 'Category', category)}
                {infoRow(<FileText size={17} />, 'Title', title)}
                {infoRow(<AlertCircle size={17} />, 'Urgency', urgency.charAt(0).toUpperCase() + urgency.slice(1))}
                {infoRow(<Repeat size={17} />, 'Support type', supportType === 'one_time' ? 'One-time help' : 'Ongoing mentorship')}
                {timeline.trim() !== '' && infoRow(<Clock size={17} />, 'Preferred timeline', timeline)}
                {openToGroup && infoRow(<Users size={17} />, 'Format', 'Group resources are fine')}
                {documents.length > 0 && infoRow(<Paperclip size={17} />, 'Attachments', documents.map(d => d.name).join(', '))}
              </div>
            </section>

            <div style={{
              display: 'flex', gap: 10, padding: '0.9rem 1rem', borderRadius: '1rem',
              background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.22)',
            }}>
              <ShieldCheck size={17} aria-hidden="true" style={{ color: 'var(--accent-700)', flexShrink: 0, marginTop: 2 }} />
              <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                Your request goes to a secure review, and a volunteer may be assigned
                to help. Everything is routed through the club — nobody will contact
                you directly outside the platform.
              </p>
            </div>

            <label
              htmlFor="rh-consent"
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '0.9rem 1rem', borderRadius: '1rem',
                border: '1px solid rgba(27,67,50,0.08)', background: 'var(--bg-primary)',
                fontSize: '0.82rem', lineHeight: 1.55, cursor: 'pointer',
              }}
            >
              <input
                id="rh-consent" type="checkbox" checked={consent} onChange={() => setConsent(!consent)}
                style={{ width: 18, height: 18, flexShrink: 0, marginTop: 2, accentColor: 'var(--primary-700)' }}
              />
              <span>
                I agree to the platform terms. I understand support is community-based,
                securely routed, and is not professional advice, and I consent to the
                club reviewing my request and assigning a volunteer if appropriate.
              </span>
            </label>

            {submitError && (
              <div role="alert" className="community-error" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <AlertCircle size={15} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{submitError}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" onClick={() => setStep(3)}>
                <ArrowLeft size={16} /> Edit
              </button>
              <button
                className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmit}
                disabled={isSubmitting || !consent || uploading > 0}
              >
                {isSubmitting ? 'Submitting…' : 'Submit request'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
