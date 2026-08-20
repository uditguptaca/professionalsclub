'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/app-context';
import { getMyMatrimony } from '@/app/actions/matrimony';
import type { MatrimonyProfile, MatrimonyPreferences, MatrimonyContact, MatrimonyMedia } from '@/types/matrimony';
import {
  ArrowLeft, CheckCircle2, AlertCircle, Clock, XCircle, Edit3, Shield,
  ChevronRight, Phone, Mail, Heart, BadgeCheck,
} from 'lucide-react';
import PortalLoading from '@/components/portal/PortalLoading';

/** Moderation state, said plainly. Chips sit on the dark hero, so every
 *  colour here has to read against --green-950. */
const statusConfig: Record<string, { label: string; icon: React.ElementType; lime?: boolean }> = {
  draft: { label: 'Draft', icon: Clock },
  pending: { label: 'Waiting for review', icon: Clock },
  approved: { label: 'Approved and live', icon: CheckCircle2, lime: true },
  rejected: { label: 'Not approved', icon: XCircle },
  changes_requested: { label: 'Changes requested', icon: AlertCircle },
  suspended: { label: 'Suspended', icon: XCircle },
};

const EDIT = '/portal/member/matrimony/edit';

export default function MyProfilePage() {
  const { currentUserId } = useApp();

  const [profile, setProfile] = useState<MatrimonyProfile | null>(null);
  const [preferences, setPreferences] = useState<MatrimonyPreferences | null>(null);
  const [contact, setContact] = useState<MatrimonyContact | null>(null);
  const [media, setMedia] = useState<MatrimonyMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setError(result.error);
      }
      setLoading(false);
    }
    void loadProfile();
  }, [currentUserId]);

  if (loading) {
    return (
      <PortalLoading label="Loading your matrimony profile" />
    );
  }

  if (!profile) {
    return (
      <div className="pp2" style={{ textAlign: 'center', padding: '2.5rem 0' }}>
        <Heart size={28} aria-hidden="true" style={{ opacity: 0.35, marginBottom: 12 }} />
        <p style={{ margin: '0 0 1.1rem', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
          You have not created a matrimony profile yet.
        </p>
        <Link href="/portal/member/matrimony/create" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          Create profile
        </Link>
        {error && (
          <div role="alert" className="community-error" style={{ marginTop: 16, textAlign: 'left' }}>
            <AlertCircle size={15} aria-hidden="true" /> {error}
          </div>
        )}
      </div>
    );
  }

  const status = statusConfig[profile.status] ?? statusConfig.draft;
  const StatusIcon = status.icon;
  const age = new Date().getFullYear() - new Date(profile.dob).getFullYear();
  const primaryPhoto = media.find(m => m.is_primary) ?? media[0];
  const initials = profile.full_name
    .split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'PC';

  /** One value row. Filled values are static; a gap links straight to editing. */
  const infoRow = (label: string, value?: string | null, capitalize = false) => (
    value && String(value).trim() ? (
      <div className="pp-row pp-row-static" key={label} style={{ minHeight: '3rem' }}>
        <span className="pp-row-body">
          <small>{label}</small>
          <strong style={{ whiteSpace: 'normal', textTransform: capitalize ? 'capitalize' : 'none' }}>{value}</strong>
        </span>
      </div>
    ) : (
      <Link href={EDIT} className="pp-row" key={label} style={{ minHeight: '3rem' }}>
        <span className="pp-row-body">
          <small>{label}</small>
          <strong className="pp-row-empty">Add</strong>
        </span>
        <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
      </Link>
    )
  );

  return (
    <div className="pp2">
      {/* ---- Hero ---- */}
      <header className="pp-hero" style={{ paddingTop: 'calc(3.8rem + var(--sat))' }}>
        <Link
          href="/portal/member/matrimony"
          className="pp-chip pp-chip-light"
          style={{
            position: 'absolute', top: 'calc(1rem + var(--sat))', left: '1rem',
            minHeight: 36, padding: '0 0.8rem', textDecoration: 'none',
          }}
        >
          <ArrowLeft size={13} aria-hidden="true" /> Matrimony
        </Link>
        <div className="hf-avatar" style={{ margin: '0 auto 0.6rem', overflow: 'hidden' }}>
          {primaryPhoto
            ? <img src={primaryPhoto.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            : initials}
        </div>
        <h1>{profile.full_name}</h1>
        <p>
          {age} · {[profile.city, profile.province].filter(Boolean).join(', ')}
          {profile.occupation ? ` · ${profile.occupation}` : ''}
        </p>
        <div className="pp-hero-chips">
          <span
            className="pp-chip"
            style={status.lime
              ? { background: 'rgba(188,223,106,0.18)', color: 'var(--lime-300)' }
              : { background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.92)', border: '1px solid rgba(255,255,255,0.16)' }}
          >
            <StatusIcon size={12} aria-hidden="true" /> {status.label}
          </span>
          <span className="pp-chip pp-chip-light">{profile.completeness_pct}% complete</span>
          {profile.is_verified_id && (
            <span className="pp-chip pp-chip-light"><BadgeCheck size={12} aria-hidden="true" /> ID verified</span>
          )}
        </div>
      </header>

      <div className="pp-groups">
        {/* ---- Manage ---- */}
        <section className="pp-group">
          <h2>Manage</h2>
          <div className="pp-group-card">
            <Link href={EDIT} className="pp-row pp-row-add">
              <span className="pp-row-icon"><Edit3 size={17} aria-hidden="true" /></span>
              <span className="pp-row-body"><strong>Edit your profile</strong></span>
              <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
            </Link>
            <Link href="/portal/member/matrimony/settings" className="pp-row">
              <span className="pp-row-icon"><Shield size={17} aria-hidden="true" /></span>
              <span className="pp-row-body">
                <small>Privacy</small>
                <strong>{profile.is_hidden ? 'Listing paused' : 'Listing live'}</strong>
              </span>
              <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
            </Link>
          </div>
        </section>

        {/* ---- About ---- */}
        <section className="pp-group">
          <h2>About you</h2>
          <div className="pp-group-card">
            {profile.about_me ? (
              <p style={{ margin: 0, padding: '1rem', fontSize: '0.92rem', lineHeight: 1.65, color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>
                {profile.about_me}
              </p>
            ) : (
              <Link href={EDIT} className="pp-row">
                <span className="pp-row-body">
                  <small>Your introduction</small>
                  <strong className="pp-row-empty">Add a few lines about yourself</strong>
                </span>
                <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
              </Link>
            )}
          </div>
        </section>

        {/* ---- Background ---- */}
        <section className="pp-group">
          <h2>Religion and culture</h2>
          <div className="pp-group-card">
            {infoRow('Religion', profile.religion)}
            {infoRow('Denomination or sect', profile.denomination)}
            {infoRow('Community', profile.community)}
            {infoRow('Sub-caste', profile.sub_caste)}
            {infoRow('Gothra', profile.gothra)}
            {infoRow('Mother tongue', profile.mother_tongue)}
            {infoRow('Languages spoken', profile.languages?.join(', '))}
          </div>
        </section>

        {/* ---- Education & career ---- */}
        <section className="pp-group">
          <h2>Education and work</h2>
          <div className="pp-group-card">
            {infoRow('Qualification', profile.qualification)}
            {infoRow('Field of study', profile.field_of_study)}
            {infoRow('Institution', profile.institution)}
            {infoRow('Occupation', profile.occupation)}
            {infoRow('Employer', profile.employer)}
            {infoRow('Industry', profile.industry)}
            {infoRow('Employment type', profile.employment_type?.replace(/_/g, ' '), true)}
            {infoRow('Work location', profile.work_location)}
            {infoRow('Income range', profile.income_range)}
          </div>
        </section>

        {/* ---- Family & lifestyle ---- */}
        <section className="pp-group">
          <h2>Family and lifestyle</h2>
          <div className="pp-group-card">
            {infoRow('Family type', profile.family_type, true)}
            {infoRow('Family status', profile.family_status, true)}
            {infoRow('Family values', profile.family_values, true)}
            {infoRow("Father's occupation", profile.father_occupation)}
            {infoRow("Mother's occupation", profile.mother_occupation)}
            {infoRow('Native place', profile.native_place)}
            {infoRow('Diet', profile.diet, true)}
            {infoRow('Smoking', profile.smoking, true)}
            {infoRow('Drinking', profile.drinking, true)}
            {profile.family_about && (
              <div className="pp-row pp-row-static" style={{ alignItems: 'flex-start', padding: '0.85rem 0.9rem' }}>
                <span className="pp-row-body">
                  <small>About the family</small>
                  <strong style={{ whiteSpace: 'normal', fontWeight: 600, lineHeight: 1.55 }}>{profile.family_about}</strong>
                </span>
              </div>
            )}
          </div>
        </section>

        {/* ---- Contact ---- */}
        <section className="pp-group">
          <h2>Your contact details</h2>
          <p className="pp-group-sub">
            Only released to a member after you accept their interest.
          </p>
          <div className="pp-group-card">
            {contact ? (
              <>
                <div className="pp-row pp-row-static" style={{ minHeight: '3.2rem' }}>
                  <span className="pp-row-icon"><Phone size={17} aria-hidden="true" /></span>
                  <span className="pp-row-body">
                    <small>Phone</small>
                    <strong>{contact.phone || 'Not provided'}</strong>
                  </span>
                </div>
                {contact.alt_phone && (
                  <div className="pp-row pp-row-static" style={{ minHeight: '3.2rem' }}>
                    <span className="pp-row-icon"><Phone size={17} aria-hidden="true" /></span>
                    <span className="pp-row-body">
                      <small>Alternate phone</small>
                      <strong>{contact.alt_phone}</strong>
                    </span>
                  </div>
                )}
                <div className="pp-row pp-row-static" style={{ minHeight: '3.2rem' }}>
                  <span className="pp-row-icon"><Mail size={17} aria-hidden="true" /></span>
                  <span className="pp-row-body">
                    <small>Email</small>
                    <strong>{contact.email || 'Not provided'}</strong>
                  </span>
                </div>
                {infoRow('Preferred method', contact.preferred_method, true)}
              </>
            ) : (
              <Link href={EDIT} className="pp-row pp-row-add">
                <span className="pp-row-icon"><Phone size={17} aria-hidden="true" /></span>
                <span className="pp-row-body"><strong>Add how you can be reached</strong></span>
                <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
              </Link>
            )}
          </div>
        </section>

        {/* ---- Preferences ---- */}
        <section className="pp-group">
          <h2>Partner preferences</h2>
          <p className="pp-group-sub">What we use to rank the profiles you see in browse.</p>
          <div className="pp-group-card">
            {preferences ? (
              <>
                {infoRow('Age range', `${preferences.age_min} to ${preferences.age_max}`)}
                {infoRow('Religion', preferences.religion?.join(', ') || 'Any')}
                {infoRow('Mother tongue', preferences.mother_tongue?.join(', ') || 'Any')}
                {infoRow('Marital status', preferences.marital_status?.join(', ')?.replace(/_/g, ' ') || 'Any', true)}
                {infoRow('Diet', preferences.diet?.join(', ') || 'Any', true)}
                {infoRow('Residency', preferences.residency_status?.join(', ')?.toUpperCase() || 'Any')}
                {preferences.other_notes && (
                  <div className="pp-row pp-row-static" style={{ alignItems: 'flex-start', padding: '0.85rem 0.9rem' }}>
                    <span className="pp-row-body">
                      <small>Other notes</small>
                      <strong style={{ whiteSpace: 'normal', fontWeight: 600, lineHeight: 1.55 }}>{preferences.other_notes}</strong>
                    </span>
                  </div>
                )}
              </>
            ) : (
              <Link href={EDIT} className="pp-row pp-row-add">
                <span className="pp-row-icon"><Heart size={17} aria-hidden="true" /></span>
                <span className="pp-row-body"><strong>Set your partner preferences</strong></span>
                <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
              </Link>
            )}
          </div>
        </section>
      </div>

      {error && (
        <div role="alert" className="community-error" style={{ marginTop: 14 }}>
          <AlertCircle size={15} aria-hidden="true" /> {error}
        </div>
      )}
    </div>
  );
}
