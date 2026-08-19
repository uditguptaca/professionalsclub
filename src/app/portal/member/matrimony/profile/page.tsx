'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/app-context';
import { getMyMatrimony } from '@/app/actions/matrimony';
import type { MatrimonyProfile, MatrimonyPreferences, MatrimonyContact, MatrimonyMedia } from '@/types/matrimony';
import {
  User, Heart, MapPin, Briefcase, GraduationCap, Users, Calendar,
  Shield, Edit3, ArrowLeft, CheckCircle2, AlertCircle, Clock, XCircle,
  Phone, Mail, HeartHandshake, Smile, Coffee, BookOpen, Star, Sparkles
} from 'lucide-react';

const statusConfig: Record<string, { color: string; bg: string; label: string; icon: React.ElementType }> = {
  draft: { color: 'var(--text-secondary)', bg: 'rgba(100,116,139,0.1)', label: 'Draft', icon: Clock },
  pending: { color: '#92400e', bg: 'rgba(245,158,11,0.1)', label: 'Pending Admin Review', icon: Clock },
  approved: { color: '#04724d', bg: 'rgba(0,168,107,0.1)', label: 'Approved & Live', icon: CheckCircle2 },
  rejected: { color: 'var(--error-600)', bg: 'rgba(240,73,35,0.1)', label: 'Rejected', icon: XCircle },
  changes_requested: { color: 'var(--accent-700)', bg: 'rgba(217,119,6,0.1)', label: 'Changes Requested', icon: AlertCircle },
  suspended: { color: 'var(--error-600)', bg: 'rgba(220,38,38,0.1)', label: 'Suspended', icon: XCircle },
};

export default function MyProfilePage() {
  const router = useRouter();
  const { currentUserId } = useApp();

  const [profile, setProfile] = useState<MatrimonyProfile | null>(null);
  const [preferences, setPreferences] = useState<MatrimonyPreferences | null>(null);
  const [contact, setContact] = useState<MatrimonyContact | null>(null);
  const [media, setMedia] = useState<MatrimonyMedia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      if (!currentUserId) { setLoading(false); return; }

      // One action returns the listing with its preferences, contact and media.
      const result = await getMyMatrimony();
      if (result.ok) {
        setProfile(result.data.profile);
        setPreferences(result.data.preferences);
        setContact(result.data.contact);
        setMedia(result.data.media);
      } else {
        console.error('Error loading profile:', result.error);
      }
      setLoading(false);
    }
    void loadProfile();
  }, [currentUserId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
        <div style={{
          width: 48, height: 48, border: '3px solid var(--border-color)',
          borderTopColor: 'var(--primary-600)', borderRadius: '50%', animation: 'spin 1s linear infinite',
        }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading your matrimony profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col gap-6" style={{ maxWidth: 600, margin: '40px auto', textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: 'rgba(240,73,35,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto'
        }}>
          <AlertCircle size={32} color="var(--error-500)" />
        </div>
        <h2 style={{ fontWeight: 800 }}>Profile Not Found</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          You haven&apos;t created a matrimony profile yet. Get started to find your perfect partner.
        </p>
        <Link href="/portal/member/matrimony/create" className="btn btn-primary" style={{ alignSelf: 'center', textDecoration: 'none' }}>
          Create Profile Now
        </Link>
      </div>
    );
  }

  const status = statusConfig[profile.status] || statusConfig.draft;
  const StatusIcon = status.icon;
  const birthYear = new Date(profile.dob).getFullYear();
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;

  return (
    <div className="flex flex-col gap-6 animate-fade-in" style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 60 }}>
      {/* Back button */}
      <div>
        <Link href="/portal/member/matrimony" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>

      {/* Main Header Card */}
      <div className="card" style={{
        background: 'linear-gradient(145deg, var(--bg-card), rgba(232, 93, 4, 0.02))',
        border: '1px solid var(--border-color)', borderRadius: 24, padding: 32,
        display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center'
      }}>
        {/* Avatar/Photo */}
        <div style={{
          width: 140, height: 140, borderRadius: 24, flexShrink: 0,
          background: profile.gender?.toLowerCase() === 'female' ? 'linear-gradient(135deg, rgba(217,119,6,0.13), rgba(251,191,36,0.06))' : 'linear-gradient(135deg, rgba(232,93,4,0.13), rgba(249,115,22,0.06))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 30px rgba(0,0,0,0.04)', border: '1px solid var(--border-color)'
        }}>
          <User size={64} style={{ color: profile.gender?.toLowerCase() === 'female' ? 'var(--accent-600)' : 'var(--primary-600)' }} />
        </div>

        {/* Basic info */}
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', margin: 0 }}>
              {profile.full_name}
            </h1>
            {profile.is_verified_id && (
              <span className="badge" style={{ background: 'rgba(232, 93, 4, 0.1)', color: 'var(--text-accent)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={12} /> ID Verified
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 16 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={16} /> {age} years ({new Date(profile.dob).toLocaleDateString()})</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={16} /> {profile.city}, {profile.province}, {profile.country}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Briefcase size={16} /> {profile.occupation}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 16px', borderRadius: 99, background: status.bg,
              border: `1px solid ${status.color}25`, color: status.color, fontSize: '0.8rem', fontWeight: 700
            }}>
              <StatusIcon size={14} /> {status.label}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Completeness: <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{profile.completeness_pct}%</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div>
          <Link href="/portal/member/matrimony/edit" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Edit3 size={16} /> Edit Profile
          </Link>
        </div>
      </div>

      {/* Grid of detail sections */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left Column: Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* About Me */}
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Smile size={18} style={{ color: 'var(--text-accent)' }} /> About Me
            </h2>
            <p style={{ lineHeight: 1.7, color: 'var(--text-secondary)', whiteSpace: 'pre-line', margin: 0, fontSize: '0.95rem' }}>
              {profile.about_me || 'No bio written yet.'}
            </p>
          </div>

          {/* Background Details */}
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={18} style={{ color: '#04724d' }} /> Religious & Cultural Background
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
              {[
                { label: 'Religion', value: profile.religion },
                { label: 'Denomination / Sect', value: profile.denomination || 'N/A' },
                { label: 'Community / Caste', value: profile.community || 'N/A' },
                { label: 'Sub-Caste', value: profile.sub_caste || 'N/A' },
                { label: 'Gothra', value: profile.gothra || 'N/A' },
                { label: 'Mother Tongue', value: profile.mother_tongue },
                { label: 'Languages Spoken', value: profile.languages?.join(', ') || 'N/A' },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Education & Career */}
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Briefcase size={18} style={{ color: 'var(--accent-400)' }} /> Education & Career
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
              {[
                { label: 'Qualification', value: profile.qualification },
                { label: 'Field of Study', value: profile.field_of_study || 'N/A' },
                { label: 'Institution', value: profile.institution || 'N/A' },
                { label: 'Occupation', value: profile.occupation },
                { label: 'Employer', value: profile.employer || 'N/A' },
                { label: 'Industry', value: profile.industry },
                { label: 'Employment Type', value: profile.employment_type?.replace('_', ' ') },
                { label: 'Work Location', value: profile.work_location || 'N/A' },
                { label: 'Income Range', value: profile.income_range },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'capitalize' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Family details */}
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <HeartHandshake size={18} style={{ color: 'var(--primary-700)' }} /> Family & Lifestyle
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
              {[
                { label: 'Family Type', value: profile.family_type },
                { label: 'Family Status', value: profile.family_status },
                { label: 'Family Values', value: profile.family_values },
                { label: 'Father\'s Occupation', value: profile.father_occupation || 'N/A' },
                { label: 'Mother\'s Occupation', value: profile.mother_occupation || 'N/A' },
                { label: 'Native Place', value: profile.native_place || 'N/A' },
                { label: 'Diet', value: profile.diet },
                { label: 'Smoking', value: profile.smoking },
                { label: 'Drinking', value: profile.drinking },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'capitalize' }}>{item.value || 'N/A'}</div>
                </div>
              ))}
            </div>
            {profile.family_about && (
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>About Family</div>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{profile.family_about}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Preferences & contact */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Contact details */}
          <div className="card" style={{ padding: 24, border: '1px solid rgba(232, 93, 4, 0.15)', background: 'rgba(232, 93, 4, 0.01)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Phone size={18} style={{ color: 'var(--text-accent)' }} /> Contact Details
            </h2>
            {contact ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Phone size={16} style={{ color: 'var(--text-muted)' }} />
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Phone</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{contact.phone || 'Not provided'}</div>
                  </div>
                </div>
                {contact.alt_phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Phone size={16} style={{ color: 'var(--text-muted)' }} />
                    <div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Alt Phone</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{contact.alt_phone}</div>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Mail size={16} style={{ color: 'var(--text-muted)' }} />
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Email</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{contact.email || 'Not provided'}</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: 10, marginTop: 4 }}>
                  Preferred Method: <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>{contact.preferred_method}</strong>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                No contact information provided. Please complete your profile.
              </p>
            )}
          </div>

          {/* Preferences Summary */}
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Star size={18} style={{ color: 'var(--accent-400)' }} /> Partner Preferences
            </h2>
            {preferences ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Age Range', value: `${preferences.age_min} to ${preferences.age_max} years` },
                  { label: 'Religion', value: preferences.religion?.join(', ') || 'Any' },
                  { label: 'Mother Tongue', value: preferences.mother_tongue?.join(', ') || 'Any' },
                  { label: 'Marital Status', value: preferences.marital_status?.join(', ')?.replace(/_/g, ' ') || 'Any' },
                  { label: 'Diet', value: preferences.diet?.join(', ') || 'Any' },
                  { label: 'Residency Status', value: preferences.residency_status?.join(', ')?.toUpperCase() || 'Any' },
                ].map(item => (
                  <div key={item.label} style={{ fontSize: '0.82rem', paddingBottom: 10, borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{item.value}</div>
                  </div>
                ))}
                {preferences.other_notes && (
                  <div style={{ fontSize: '0.82rem' }}>
                    <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Other Preferences</div>
                    <div style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{preferences.other_notes}</div>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Partner preferences not set.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
