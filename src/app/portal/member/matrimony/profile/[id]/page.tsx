'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/app-context';
import {
  getProfileDetail, getMyMatrimony, addToShortlist, removeFromShortlist,
  sendInterest, respondToInterest, reportProfile, blockProfile, requestPhotoAccess,
} from '@/app/actions/matrimony';
import type { MatrimonyProfile, MatrimonyPreferences, MatrimonyContact, MatrimonyMedia } from '@/types/matrimony';
import { computeMatchScore } from '@/lib/matrimony/matching';
import {
  User, Heart, ArrowLeft, CheckCircle2, AlertCircle, XCircle,
  Phone, Mail, Shield, ShieldAlert, Sparkles, BadgeCheck, ChevronRight,
  Bookmark, Send, MessageCircle, Image as ImageIcon, X, Check,
} from 'lucide-react';
import PortalLoading from '@/components/portal/PortalLoading';
import { useConfirm } from '@/components/portal/confirm';

const REPORT_REASONS: { value: string; label: string }[] = [
  { value: 'fake_profile', label: 'Fake profile or stolen identity' },
  { value: 'inappropriate_content', label: 'Inappropriate content or photos' },
  { value: 'abusive_behavior', label: 'Abusive behaviour or harassment' },
  { value: 'solicitation', label: 'Spam, solicitation or a scam' },
  { value: 'other', label: 'Something else' },
];

export default function CandidateProfilePage() {
  const params = useParams();
  const router = useRouter();
  const confirm = useConfirm();
  const id = params.id as string;
  const { currentUserId } = useApp();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<MatrimonyProfile | null>(null);
  const [preferences, setPreferences] = useState<MatrimonyPreferences | null>(null);
  const [media, setMedia] = useState<MatrimonyMedia[]>([]);

  // Current user states for match score & interactions
  const [myProfile, setMyProfile] = useState<MatrimonyProfile | null>(null);
  const [myPrefs, setMyPrefs] = useState<MatrimonyPreferences | null>(null);
  const [isShortlisted, setIsShortlisted] = useState(false);
  const [interestStatus, setInterestStatus] = useState<'none' | 'sent' | 'received' | 'accepted' | 'declined'>('none');
  const [interestId, setInterestId] = useState<string | null>(null);
  const [candidateContact, setCandidateContact] = useState<MatrimonyContact | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  // Photo access request
  const [photoRequesting, setPhotoRequesting] = useState(false);
  const [photoRequestSent, setPhotoRequestSent] = useState(false);
  const [photoRequestError, setPhotoRequestError] = useState<string | null>(null);

  // Report sheet
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const fetchProfileAndRelations = useCallback(async () => {
    if (!id || !currentUserId) return;
    setLoading(true);

    // One action returns the listing, its preferences and media, whether it is
    // shortlisted, the interest between the two profiles, and the contact row.
    //
    // The contact row comes back only when an interest between the two reached
    // 'accepted' — that is the RLS policy on matrimony_contacts deciding, not a
    // condition in this component, so a tampered client cannot reveal it.
    const [detail, mine] = await Promise.all([getProfileDetail(id as string), getMyMatrimony()]);

    if (!detail.ok || !detail.data) {
      if (!detail.ok) setActionError(detail.error);
      setLoading(false);
      return;
    }

    const d = detail.data;
    setProfile(d.profile as unknown as MatrimonyProfile);
    setPreferences(d.preferences);
    setMedia(d.media);
    setIsShortlisted(d.isShortlisted);
    setCandidateContact(d.contact);

    if (mine.ok && mine.data.profile) {
      setMyProfile(mine.data.profile);
      setMyPrefs(mine.data.preferences);
    }

    const myId = d.myProfileId;
    if (d.interest && myId) {
      const sentByMe = d.interest.sender_profile_id === myId;
      setInterestId(d.interest.id);
      setInterestStatus(
        d.interest.status === 'accepted' ? 'accepted' : sentByMe ? 'sent' : 'received'
      );
    } else {
      setInterestStatus('none');
    }

    setLoading(false);
  }, [id, currentUserId]);

  useEffect(() => {
    fetchProfileAndRelations();
  }, [fetchProfileAndRelations]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // The open sheet locks background scroll, same as every other sheet here.
  useEffect(() => {
    if (!reportOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setReportOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [reportOpen]);

  // ========== ACTIONS ==========

  const handleToggleShortlist = async () => {
    if (!myProfile || !profile || actionLoading) return;
    setActionLoading(true);

    const result = isShortlisted
      ? await removeFromShortlist(profile.id)
      : await addToShortlist(profile.id);

    if (result.ok) {
      setIsShortlisted(!isShortlisted);
      setActionError(null);
      setToast(isShortlisted ? 'Removed from shortlist' : 'Added to shortlist');
    } else {
      setActionError(result.error);
    }

    setActionLoading(false);
  };

  const handleSendInterest = async () => {
    if (!myProfile || !profile || actionLoading) return;
    setActionLoading(true);

    // The recipient is notified by the matrimony_interests_notify trigger.
    const result = await sendInterest(profile.id);
    if (result.ok) {
      setInterestStatus('sent');
      setActionError(null);
      setToast('Interest sent');
      await fetchProfileAndRelations();
    } else {
      setActionError(result.error);
    }

    setActionLoading(false);
  };

  const handleAcceptInterest = async () => {
    if (!interestId || !profile || actionLoading) return;
    setActionLoading(true);

    // Accepting opens the conversation and releases both parties' contact
    // details. Only the recipient may do it; the guard_interest_response trigger
    // rejects an attempt by the sender.
    const result = await respondToInterest(interestId, true);
    if (result.ok) {
      setInterestStatus('accepted');
      setActionError(null);
      setToast('Interest accepted');
      await fetchProfileAndRelations();
    } else {
      setActionError(result.error);
    }

    setActionLoading(false);
  };

  const handleDeclineInterest = async () => {
    if (!interestId || actionLoading) return;
    const ok = await confirm({
      title: 'Decline this interest?',
      message: 'They will not be able to message you, and this cannot be undone.',
      confirmLabel: 'Decline',
      tone: 'danger',
    });
    if (!ok) return;
    setActionLoading(true);

    const result = await respondToInterest(interestId, false);
    if (result.ok) { setInterestStatus('declined'); setActionError(null); setToast('Interest declined'); }
    else setActionError(result.error);

    setActionLoading(false);
  };

  /**
   * Only reachable when the candidate set photo_visibility to 'on_request'.
   * The insert is unique on (requester, target) and ignores conflicts, so the
   * request cannot pile up server-side; the button also disables once sent.
   * A request already sent in an earlier session is not reflected, because no
   * action reads matrimony_photo_requests back.
   */
  const handleRequestPhotoAccess = async () => {
    if (!profile || photoRequesting || photoRequestSent) return;
    setPhotoRequesting(true);
    setPhotoRequestError(null);

    const result = await requestPhotoAccess(profile.id);
    if (result.ok) setPhotoRequestSent(true);
    else setPhotoRequestError(result.error);

    setPhotoRequesting(false);
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myProfile || !profile || !reportReason) return;
    setActionLoading(true);

    const result = await reportProfile(profile.id, reportReason, reportDetails);
    if (result.ok) {
      setReportSubmitted(true);
      setTimeout(() => {
        setReportOpen(false);
        setReportSubmitted(false);
        setReportReason('');
        setReportDetails('');
      }, 2500);
    } else {
      setActionError(result.error);
      setReportOpen(false);
    }

    setActionLoading(false);
  };

  const handleBlock = async () => {
    if (!myProfile || !profile) return;
    const ok = await confirm({
      title: 'Block this member?',
      message: 'You will not see each other in browse or search again, and any chat between you closes.',
      confirmLabel: 'Block member',
      tone: 'danger',
    });
    if (!ok) return;
    setActionLoading(true);

    const result = await blockProfile(profile.id);
    if (result.ok) {
      router.push('/portal/member/matrimony/browse');
      return;
    }
    setActionError(result.error);

    setActionLoading(false);
  };

  if (loading) {
    return (
      <PortalLoading label="Loading profile details" />
    );
  }

  if (!profile) {
    return (
      <div className="pp2" style={{ textAlign: 'center', padding: '2.5rem 0' }}>
        <User size={28} aria-hidden="true" style={{ opacity: 0.35, marginBottom: 12 }} />
        <p style={{ margin: '0 0 1.1rem', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
          This profile does not exist, or it is no longer listed.
        </p>
        <Link href="/portal/member/matrimony/browse" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          Back to browse
        </Link>
        {actionError && (
          <div role="alert" className="community-error" style={{ marginTop: 16, textAlign: 'left' }}>
            <AlertCircle size={15} aria-hidden="true" /> {actionError}
          </div>
        )}
      </div>
    );
  }

  const age = new Date().getFullYear() - new Date(profile.dob).getFullYear();
  const matchScore = myPrefs ? Math.round(computeMatchScore(myPrefs, profile)) : null;

  const displayName = profile.display_pref === 'full_name'
    ? profile.full_name
    : profile.display_pref === 'initials'
      ? profile.full_name.split(' ').map(n => n[0]).join('.').toUpperCase()
      : profile.full_name.split(' ')[0];
  const initials = profile.full_name
    .split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'PC';

  const blurPhotos = profile.photo_visibility === 'blurred' && interestStatus !== 'accepted';
  /* The server already applied the visibility and approval rules to this list,
     so whatever arrived is safe to show. */
  const primaryPhoto = media.find(m => m.is_primary) ?? media[0];

  /** One value row. Missing values are dropped rather than shown as "N/A". */
  const infoRow = (label: string, value?: string | null, capitalize = false) => {
    if (!value || !String(value).trim()) return null;
    return (
      <div className="pp-row pp-row-static" key={label} style={{ minHeight: '3rem' }}>
        <span className="pp-row-body">
          <small>{label}</small>
          <strong style={{ whiteSpace: 'normal', textTransform: capitalize ? 'capitalize' : 'none' }}>{value}</strong>
        </span>
      </div>
    );
  };

  /** A group renders only when it has something to say. */
  const group = (title: string, rows: (React.ReactNode | null)[], sub?: string) => {
    const items = rows.filter(Boolean);
    if (items.length === 0) return null;
    return (
      <section className="pp-group" key={title}>
        <h2>{title}</h2>
        {sub && <p className="pp-group-sub">{sub}</p>}
        <div className="pp-group-card">{items}</div>
      </section>
    );
  };

  const shortlistButton = (
    <button
      type="button"
      className="btn btn-outline"
      onClick={handleToggleShortlist}
      disabled={actionLoading}
      aria-pressed={isShortlisted}
      style={{ minHeight: 44, flexShrink: 0 }}
    >
      <Bookmark size={16} aria-hidden="true" fill={isShortlisted ? 'currentColor' : 'none'} />
      {isShortlisted ? 'Shortlisted' : 'Shortlist'}
    </button>
  );

  return (
    <div className="pp2">
      {/* ---- Hero ---- */}
      <header className="pp-hero" style={{ paddingTop: 'calc(3.8rem + var(--sat))' }}>
        <Link
          href="/portal/member/matrimony/browse"
          className="pp-chip pp-chip-light"
          style={{
            position: 'absolute', top: 'calc(1rem + var(--sat))', left: '1rem',
            minHeight: 36, padding: '0 0.8rem', textDecoration: 'none',
          }}
        >
          <ArrowLeft size={13} aria-hidden="true" /> Browse
        </Link>

        <div className="hf-avatar" style={{ margin: '0 auto 0.6rem', overflow: 'hidden' }}>
          {blurPhotos
            ? <span style={{ filter: 'blur(7px)', fontSize: '1.15rem', fontWeight: 800 }} aria-hidden="true">{initials}</span>
            : primaryPhoto
              ? <img src={primaryPhoto.url} alt={`Photo of ${displayName}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              : initials}
        </div>
        <h1>{displayName}</h1>
        <p>
          {age} · {[profile.city, profile.province].filter(Boolean).join(', ')}
          {profile.occupation ? ` · ${profile.occupation}` : ''}
        </p>
        <div className="pp-hero-chips">
          {matchScore !== null && (
            <span
              className="pp-chip"
              style={{
                background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.16)',
                color: matchScore >= 80 ? 'var(--lime-300)' : matchScore >= 60 ? '#fff' : 'rgba(255,255,255,0.8)',
              }}
            >
              <Sparkles size={12} aria-hidden="true" /> {matchScore}% match
            </span>
          )}
          {profile.is_verified_id && (
            <span className="pp-chip pp-chip-light"><BadgeCheck size={12} aria-hidden="true" /> ID verified</span>
          )}
        </div>
      </header>

      {/* ---- Interest actions ---- */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '0.9rem' }}>
        {interestStatus === 'none' && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSendInterest}
            disabled={actionLoading}
            style={{ flex: 1, minWidth: 170, minHeight: 44 }}
          >
            <Heart size={16} aria-hidden="true" /> Express interest
          </button>
        )}

        {interestStatus === 'sent' && (
          <span
            className="pp-chip"
            style={{ flex: 1, minWidth: 170, minHeight: 44, justifyContent: 'center', fontSize: '0.8rem', background: 'rgba(217,119,6,0.10)', color: 'var(--accent-700)' }}
          >
            <Send size={13} aria-hidden="true" /> Interest sent, awaiting their reply
          </span>
        )}

        {interestStatus === 'received' && (
          <>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAcceptInterest}
              disabled={actionLoading}
              style={{ flex: 1, minWidth: 130, minHeight: 44 }}
            >
              <Check size={16} aria-hidden="true" /> Accept
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleDeclineInterest}
              disabled={actionLoading}
              style={{ flex: 1, minWidth: 110, minHeight: 44, color: 'var(--error-600)', borderColor: 'rgba(240,73,35,0.35)' }}
            >
              Decline
            </button>
          </>
        )}

        {interestStatus === 'accepted' && (
          <Link
            href="/portal/member/matrimony/messages"
            className="btn btn-primary"
            style={{ flex: 1, minWidth: 170, minHeight: 44, textDecoration: 'none' }}
          >
            <MessageCircle size={16} aria-hidden="true" /> Message
          </Link>
        )}

        {interestStatus === 'declined' && (
          <span
            className="pp-chip"
            style={{ flex: 1, minWidth: 170, minHeight: 44, justifyContent: 'center', fontSize: '0.8rem', background: 'var(--error-50)', color: 'var(--error-600)' }}
          >
            <XCircle size={13} aria-hidden="true" /> Interest declined
          </span>
        )}

        {shortlistButton}
      </div>

      {profile.photo_visibility === 'on_request' && interestStatus !== 'accepted' && (
        <button
          type="button"
          className="btn btn-outline"
          onClick={handleRequestPhotoAccess}
          disabled={photoRequesting || photoRequestSent}
          style={{ width: '100%', minHeight: 44, marginBottom: '0.9rem' }}
        >
          <ImageIcon size={16} aria-hidden="true" />
          {photoRequestSent ? 'Photo access requested' : photoRequesting ? 'Sending request…' : 'Request photo access'}
        </button>
      )}

      {photoRequestError && (
        <div role="alert" className="community-error" style={{ marginBottom: '0.9rem' }}>
          <AlertCircle size={15} aria-hidden="true" /> {photoRequestError}
        </div>
      )}
      {photoRequestSent && !photoRequestError && (
        <p className="community-notice" style={{ marginBottom: '0.9rem' }}>
          <CheckCircle2 size={14} aria-hidden="true" /> Request sent. This member decides whether to share their photos.
        </p>
      )}
      {actionError && (
        <div role="alert" className="community-error" style={{ marginBottom: '0.9rem' }}>
          <AlertCircle size={15} aria-hidden="true" /> {actionError}
        </div>
      )}

      <div className="pp-groups">
        {/* ---- About ---- */}
        {profile.about_me && (
          <section className="pp-group">
            <h2>About {displayName}</h2>
            <div className="pp-group-card">
              <p style={{ margin: 0, padding: '1rem', fontSize: '0.92rem', lineHeight: 1.65, color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>
                {profile.about_me}
              </p>
            </div>
          </section>
        )}

        {group('Religion and culture', [
          infoRow('Religion', profile.religion),
          infoRow('Denomination or sect', profile.denomination),
          infoRow('Community', profile.community),
          infoRow('Sub-caste', profile.sub_caste),
          infoRow('Gothra', profile.gothra),
          infoRow('Mother tongue', profile.mother_tongue),
          infoRow('Languages spoken', profile.languages?.join(', ')),
        ])}

        {group('Education and work', [
          infoRow('Qualification', profile.qualification),
          infoRow('Field of study', profile.field_of_study),
          infoRow('Institution', profile.institution),
          infoRow('Occupation', profile.occupation),
          infoRow('Employer', profile.employer),
          infoRow('Industry', profile.industry),
          infoRow('Employment type', profile.employment_type?.replace(/_/g, ' '), true),
          infoRow('Work location', profile.work_location),
          infoRow('Income range', profile.income_range),
        ])}

        {group('Family and lifestyle', [
          infoRow('Family type', profile.family_type, true),
          infoRow('Family status', profile.family_status, true),
          infoRow('Family values', profile.family_values, true),
          infoRow("Father's occupation", profile.father_occupation),
          infoRow("Mother's occupation", profile.mother_occupation),
          infoRow('Native place', profile.native_place),
          infoRow('Diet', profile.diet, true),
          infoRow('Smoking', profile.smoking, true),
          infoRow('Drinking', profile.drinking, true),
          profile.family_about ? (
            <div className="pp-row pp-row-static" key="family_about" style={{ alignItems: 'flex-start', padding: '0.85rem 0.9rem' }}>
              <span className="pp-row-body">
                <small>About the family</small>
                <strong style={{ whiteSpace: 'normal', fontWeight: 600, lineHeight: 1.55 }}>{profile.family_about}</strong>
              </span>
            </div>
          ) : null,
        ])}

        {/* ---- Contact ---- */}
        <section className="pp-group">
          <h2>Contact details</h2>
          <div className="pp-group-card">
            {interestStatus === 'accepted' ? (
              candidateContact ? (
                <>
                  <div className="pp-row pp-row-static" style={{ minHeight: '3.2rem' }}>
                    <span className="pp-row-icon"><Phone size={17} aria-hidden="true" /></span>
                    <span className="pp-row-body">
                      <small>Phone</small>
                      <strong>{candidateContact.phone || 'Not provided'}</strong>
                    </span>
                  </div>
                  {candidateContact.alt_phone && (
                    <div className="pp-row pp-row-static" style={{ minHeight: '3.2rem' }}>
                      <span className="pp-row-icon"><Phone size={17} aria-hidden="true" /></span>
                      <span className="pp-row-body">
                        <small>Alternate phone</small>
                        <strong>{candidateContact.alt_phone}</strong>
                      </span>
                    </div>
                  )}
                  <div className="pp-row pp-row-static" style={{ minHeight: '3.2rem' }}>
                    <span className="pp-row-icon"><Mail size={17} aria-hidden="true" /></span>
                    <span className="pp-row-body">
                      <small>Email</small>
                      <strong>{candidateContact.email || 'Not provided'}</strong>
                    </span>
                  </div>
                </>
              ) : (
                <div className="pp-row pp-row-static">
                  <span className="pp-row-body"><strong>No contact details on this profile.</strong></span>
                </div>
              )
            ) : (
              <div style={{ textAlign: 'center', padding: '1.4rem 1rem' }}>
                <Shield size={28} aria-hidden="true" style={{ opacity: 0.35 }} />
                <p style={{ margin: '0.7rem 0 0', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  Phone and email appear here once an interest between you is accepted.
                </p>
              </div>
            )}
          </div>
        </section>

        {group('Their partner preferences', [
          infoRow('Age range', preferences ? `${preferences.age_min} to ${preferences.age_max}` : ''),
          infoRow('Religion', preferences?.religion?.join(', ') || (preferences ? 'Any' : '')),
          infoRow('Mother tongue', preferences?.mother_tongue?.join(', ') || (preferences ? 'Any' : '')),
          infoRow('Marital status', preferences?.marital_status?.join(', ')?.replace(/_/g, ' ') || (preferences ? 'Any' : ''), true),
          infoRow('Diet', preferences?.diet?.join(', ') || (preferences ? 'Any' : ''), true),
          infoRow('Residency', preferences?.residency_status?.join(', ')?.toUpperCase() || (preferences ? 'Any' : '')),
        ])}

        {/* ---- Safety ---- */}
        <section className="pp-group">
          <h2>Safety</h2>
          <p className="pp-group-sub">
            Reports go to the matrimony admins. Blocking is immediate and hides you both from each other.
          </p>
          <div className="pp-group-card">
            <button type="button" className="pp-row pp-row-danger" onClick={() => setReportOpen(true)}>
              <span className="pp-row-icon"><ShieldAlert size={17} aria-hidden="true" /></span>
              <span className="pp-row-body"><strong>Report this profile</strong></span>
              <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
            </button>
            <button type="button" className="pp-row pp-row-danger" onClick={handleBlock} disabled={actionLoading}>
              <span className="pp-row-icon"><XCircle size={17} aria-hidden="true" /></span>
              <span className="pp-row-body"><strong>Block this member</strong></span>
              <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
            </button>
          </div>
        </section>
      </div>

      {/* ---- Report sheet ---- */}
      {reportOpen && (
        <div className="hf-sheet-scrim" onClick={(e) => { if (e.target === e.currentTarget) setReportOpen(false); }}>
          <div className="hf-sheet pp-sheet" role="dialog" aria-modal="true" aria-label="Report this profile">
            <div className="hf-sheet-head">
              <h2>Report this profile</h2>
              <button type="button" className="portal-sheet-close" onClick={() => setReportOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            {reportSubmitted ? (
              <div style={{ textAlign: 'center', padding: '1.6rem 0.5rem 0.8rem' }}>
                <CheckCircle2 size={28} aria-hidden="true" style={{ color: 'var(--success-600)' }} />
                <p style={{ margin: '0.7rem 0 0', fontSize: '0.92rem', fontWeight: 700 }}>Report sent</p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  An admin will look into this profile.
                </p>
              </div>
            ) : (
              <form onSubmit={handleReport}>
                <p className="hf-sheet-sub">
                  Tell us what is wrong. Only the admins see this, never the member.
                </p>
                <div className="pp-sheet-fields">
                  <div className="pp-field">
                    <label htmlFor="report-reason">Reason</label>
                    <div className="pp-select">
                      <select id="report-reason" value={reportReason} onChange={e => setReportReason(e.target.value)} required>
                        <option value="">Pick a reason</option>
                        {REPORT_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                      <ChevronRight size={14} aria-hidden="true" className="pp-select-chevron" />
                    </div>
                  </div>
                  <div className="pp-field">
                    <label htmlFor="report-details">What happened (optional)</label>
                    <textarea
                      id="report-details"
                      rows={4}
                      value={reportDetails}
                      onChange={e => setReportDetails(e.target.value)}
                      placeholder="Anything that helps the admins understand."
                    />
                  </div>
                </div>
                <button type="submit" className="pp-sheet-save" disabled={actionLoading || !reportReason}>
                  {actionLoading ? 'Sending…' : <><ShieldAlert size={16} aria-hidden="true" /> Send report</>}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="pp-toast" role="status">
          <Check size={15} aria-hidden="true" /> {toast}
        </div>
      )}
    </div>
  );
}
