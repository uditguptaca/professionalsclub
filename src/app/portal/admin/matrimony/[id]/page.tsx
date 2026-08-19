'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/app-context';
import { adminGetMatrimonyProfile, adminModerateProfile } from '@/app/actions/matrimony';
import type { MatrimonyProfile, MatrimonyPreferences, MatrimonyContact, MatrimonyMedia } from '@/types/matrimony';
import {
  User, CheckCircle2, XCircle, AlertCircle, ArrowLeft, Shield,
  Phone, Mail, MapPin, Briefcase, GraduationCap, Users, Calendar,
  Star, Sparkles, Smile, RefreshCw, FileText, Ban
} from 'lucide-react';

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  draft: { color: 'var(--text-secondary)', bg: 'rgba(100,116,139,0.1)', label: 'Draft' },
  pending: { color: '#92400e', bg: 'rgba(245,158,11,0.1)', label: 'Pending Review' },
  approved: { color: '#04724d', bg: 'rgba(0,168,107,0.1)', label: 'Approved & Live' },
  rejected: { color: 'var(--error-600)', bg: 'rgba(240,73,35,0.1)', label: 'Rejected' },
  changes_requested: { color: 'var(--accent-700)', bg: 'rgba(217,119,6,0.1)', label: 'Changes Requested' },
  suspended: { color: 'var(--error-600)', bg: 'rgba(220,38,38,0.1)', label: 'Suspended' },
};

export default function AdminReviewProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { currentUserId } = useApp();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<MatrimonyProfile | null>(null);
  const [preferences, setPreferences] = useState<MatrimonyPreferences | null>(null);
  const [contact, setContact] = useState<MatrimonyContact | null>(null);
  const [media, setMedia] = useState<MatrimonyMedia[]>([]);

  // Moderation state
  const [status, setStatus] = useState<MatrimonyProfile['status']>('pending');
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isVerifiedId, setIsVerifiedId] = useState(false);
  const [isVerifiedPhoto, setIsVerifiedPhoto] = useState(false);
  const [isVerifiedProfession, setIsVerifiedProfession] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      setLoading(true);
      // Admins read the base table, not the curated view: moderation notes and
      // the rejection reason live there and are exactly what this page needs.
      const result = await adminGetMatrimonyProfile(id as string);

      if (result.ok && result.data) {
        const { profile: prof, preferences: prefs, contact: cont, media: med } = result.data;
        setProfile(prof);
        setStatus(prof.status);
        setRejectionReason(prof.rejection_reason || '');
        setAdminNotes(prof.admin_notes || '');
        setIsVerifiedId(prof.is_verified_id || false);
        setIsVerifiedPhoto(prof.is_verified_photo || false);
        setIsVerifiedProfession(prof.is_verified_profession || false);
        if (prefs) setPreferences(prefs);
        if (cont) setContact(cont);
        setMedia(med);
      } else if (!result.ok) {
        console.error('Error loading admin review data:', result.error);
      }

      setLoading(false);
    }
    loadData();
  }, [id]);

  const handleSaveModeration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || saving) return;
    setSaving(true);

    // Status, badges, notes and the audit entry are written in one transaction,
    // and the owner is notified by the notify_on_matrimony_review trigger.
    const result = await adminModerateProfile(profile.id, {
      status,
      rejectionReason:
        status === 'rejected' || status === 'changes_requested' ? rejectionReason : null,
      adminNotes,
      isVerifiedId,
      isVerifiedPhoto,
      isVerifiedProfession,
    });

    if (result.ok) {
      // Straight back to the queue; the row leaving Pending IS the
      // confirmation, no blocking popup needed.
      router.push('/portal/admin/matrimony');
    } else {
      console.error('Error saving moderation:', result.error);
      setSaveError(result.error);
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
        <div style={{
          width: 48, height: 48, border: '3px solid var(--border-color)',
          borderTopColor: 'var(--primary-600)', borderRadius: '50%', animation: 'spin 1s linear infinite',
        }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading review queue details...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col gap-6" style={{ maxWidth: 600, margin: '40px auto', textAlign: 'center' }}>
        <h2 style={{ fontWeight: 800 }}>Profile Not Found</h2>
        <p style={{ color: 'var(--text-secondary)' }}>The requested profile does not exist.</p>
        <Link href="/portal/admin/matrimony" className="btn btn-outline" style={{ alignSelf: 'center', textDecoration: 'none' }}>
          Back to Admin Queue
        </Link>
      </div>
    );
  }

  const birthYear = new Date(profile.dob).getFullYear();
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;

  return (
    <div className="flex flex-col gap-6 animate-fade-in" style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 60 }}>
      {/* Back button */}
      <div>
        <Link href="/portal/admin/matrimony" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}>
          <ArrowLeft size={16} /> Back to Moderation Queue
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 4 }}>
            Review Profile: {profile.full_name}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Inspect candidate details, verify verification badges, and make moderation decisions.
          </p>
        </div>
      </div>

      {/* Main Grid split: Left (Details), Right (Moderation Panel) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: 24, alignItems: 'start' }}>
        
        {/* Left Column: Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Header Summary */}
          <div className="card" style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center', padding: 24 }}>
            <div style={{
              width: 90, height: 90, borderRadius: 16,
              background: profile.gender?.toLowerCase() === 'female' ? 'linear-gradient(135deg, rgba(217,119,6,0.13), rgba(251,191,36,0.06))' : 'linear-gradient(135deg, rgba(232,93,4,0.13), rgba(249,115,22,0.06))',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <User size={44} style={{ color: profile.gender?.toLowerCase() === 'female' ? 'var(--accent-600)' : 'var(--primary-600)' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 6px 0' }}>{profile.full_name}</h2>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={14} /> {age} yrs ({new Date(profile.dob).toLocaleDateString()})</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={14} /> {profile.city}, {profile.province}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Briefcase size={14} /> {profile.occupation}</span>
              </div>
            </div>
          </div>

          {/* Media / Photos */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16 }}>Submitted Photos / Documents</h3>
            {media.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>No media files submitted.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 16 }}>
                {media.map((item) => (
                  <div key={item.id} style={{ border: '1px solid var(--border-color)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                    <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 8 }}>
                      <FileText size={24} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{item.type}</span>
                    <a href={item.url} target="_blank" rel="noreferrer" style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-accent)', textDecoration: 'none', marginTop: 4 }}>
                      Open File
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* About Me */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Smile size={18} style={{ color: 'var(--text-accent)' }} /> About Me & Lifestyle
            </h3>
            <p style={{ lineHeight: 1.6, color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 16px 0' }}>
              {profile.about_me || 'No bio written.'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
              {[
                { label: 'Diet', value: profile.diet },
                { label: 'Smoking', value: profile.smoking },
                { label: 'Drinking', value: profile.drinking },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize' }}>{item.value || 'N/A'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Background details */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={18} style={{ color: '#04724d' }} /> Religion, Community & Location
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
              {[
                { label: 'Religion', value: profile.religion },
                { label: 'Denomination / Sect', value: profile.denomination || 'N/A' },
                { label: 'Community / Caste', value: profile.community || 'N/A' },
                { label: 'Mother Tongue', value: profile.mother_tongue },
                { label: 'Country of Residence', value: profile.country },
                { label: 'Province', value: profile.province },
                { label: 'City', value: profile.city },
                { label: 'Residency Status', value: profile.residency_status?.toUpperCase() },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.value || 'N/A'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Education & Career */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Briefcase size={18} style={{ color: 'var(--accent-400)' }} /> Education & Career
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
              {[
                { label: 'Qualification', value: profile.qualification },
                { label: 'Field of Study', value: profile.field_of_study || 'N/A' },
                { label: 'Institution', value: profile.institution || 'N/A' },
                { label: 'Occupation', value: profile.occupation },
                { label: 'Employer', value: profile.employer || 'N/A' },
                { label: 'Income Range', value: profile.income_range },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.value || 'N/A'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Moderation Action Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, position: 'sticky', top: 20 }}>
          {/* Contact Details (For verification review) */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Phone size={18} style={{ color: 'var(--text-accent)' }} /> Contact Details
            </h3>
            {contact ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Phone</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{contact.phone || 'N/A'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Email</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{contact.email || 'N/A'}</div>
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>No contact info available.</p>
            )}
          </div>

          {/* Moderation Form */}
          <div className="card" style={{ padding: 24, border: '1px solid rgba(232, 93, 4, 0.2)', background: 'rgba(232, 93, 4, 0.01)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={18} style={{ color: 'var(--text-accent)' }} /> Moderation Decision
            </h3>
            <form onSubmit={handleSaveModeration} className="flex flex-col gap-4">
              {saveError && <p role="alert" className="community-error">{saveError}</p>}
              
              {/* Status Select */}
              <div className="input-group">
                <label>Profile Status</label>
                <select className="input" value={status} onChange={e => setStatus(e.target.value as any)} required>
                  <option value="pending">Pending Review</option>
                  <option value="approved">Approve & Publish</option>
                  <option value="changes_requested">Request Changes</option>
                  <option value="rejected">Reject</option>
                  <option value="suspended">Suspend</option>
                </select>
              </div>

              {/* Reject / Changes requested reason */}
              {(status === 'rejected' || status === 'changes_requested') && (
                <div className="input-group">
                  <label>Reason for rejection / change request</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    placeholder="Enter explanation visible to member..."
                    required
                  />
                </div>
              )}

              {/* Admin notes */}
              <div className="input-group">
                <label>Internal Admin Notes</label>
                <textarea
                  className="input"
                  rows={4}
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Notes visible only to admins..."
                />
              </div>

              {/* Verification Badges */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '8px 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input type="checkbox" checked={isVerifiedId} onChange={e => setIsVerifiedId(e.target.checked)} />
                  Verify ID Document (Badge)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input type="checkbox" checked={isVerifiedPhoto} onChange={e => setIsVerifiedPhoto(e.target.checked)} />
                  Verify Photo Authenticity (Badge)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input type="checkbox" checked={isVerifiedProfession} onChange={e => setIsVerifiedProfession(e.target.checked)} />
                  Verify Profession / Employment (Badge)
                </label>
              </div>

              {/* Submit */}
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={saving}>
                {saving ? 'Saving...' : 'Save Moderation'}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
