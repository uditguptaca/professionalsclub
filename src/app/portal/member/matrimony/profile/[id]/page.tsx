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
  User, Heart, MapPin, Briefcase, GraduationCap, Users, Calendar,
  Shield, ArrowLeft, CheckCircle2, AlertCircle, Clock, XCircle,
  Phone, Mail, HeartHandshake, Smile, Coffee, BookOpen, Star, Sparkles,
  Bookmark, Send, MessageCircle, AlertTriangle, ShieldAlert, Image as ImageIcon
} from 'lucide-react';

const statusConfig: Record<string, { color: string; bg: string; label: string; icon: React.ElementType }> = {
  draft: { color: 'var(--text-secondary)', bg: 'rgba(100,116,139,0.1)', label: 'Draft', icon: Clock },
  pending: { color: '#92400e', bg: 'rgba(245,158,11,0.1)', label: 'Pending Review', icon: Clock },
  approved: { color: '#04724d', bg: 'rgba(0,168,107,0.1)', label: 'Approved', icon: CheckCircle2 },
  rejected: { color: 'var(--error-600)', bg: 'rgba(240,73,35,0.1)', label: 'Rejected', icon: XCircle },
  suspended: { color: 'var(--error-600)', bg: 'rgba(220,38,38,0.1)', label: 'Suspended', icon: XCircle },
};

export default function CandidateProfilePage() {
  const params = useParams();
  const router = useRouter();
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
  const [contactLoading, setContactLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Photo access request
  const [photoRequesting, setPhotoRequesting] = useState(false);
  const [photoRequestSent, setPhotoRequestSent] = useState(false);
  const [photoRequestError, setPhotoRequestError] = useState<string | null>(null);

  // Modal / overlay states
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
      if (!detail.ok) console.error('Error loading candidate profile:', detail.error);
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

  // ========== ACTIONS ==========

  const handleToggleShortlist = async () => {
    if (!myProfile || !profile || actionLoading) return;
    setActionLoading(true);

    const result = isShortlisted
      ? await removeFromShortlist(profile.id)
      : await addToShortlist(profile.id);

    if (result.ok) setIsShortlisted(!isShortlisted);
    else console.error('Error toggling shortlist:', result.error);

    setActionLoading(false);
  };

  const handleSendInterest = async () => {
    if (!myProfile || !profile || actionLoading) return;
    setActionLoading(true);

    // The recipient is notified by the matrimony_interests_notify trigger.
    const result = await sendInterest(profile.id);
    if (result.ok) {
      setInterestStatus('sent');
      await fetchProfileAndRelations();
    } else {
      console.error('Error sending interest:', result.error);
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
      await fetchProfileAndRelations();
    } else {
      console.error('Error accepting interest:', result.error);
    }

    setActionLoading(false);
  };

  const handleDeclineInterest = async () => {
    if (!interestId || actionLoading) return;
    setActionLoading(true);

    const result = await respondToInterest(interestId, false);
    if (result.ok) setInterestStatus('declined');
    else console.error('Error declining interest:', result.error);

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
      console.error('Error submitting report:', result.error);
    }

    setActionLoading(false);
  };

  const handleBlock = async () => {
    if (!myProfile || !profile) return;
    if (!confirm('Are you sure you want to block this member? You will no longer see each other in search results or browse.')) return;
    setActionLoading(true);

    const result = await blockProfile(profile.id);
    if (result.ok) {
      alert('Member blocked successfully.');
      router.push('/portal/member/matrimony/browse');
    } else {
      console.error('Error blocking member:', result.error);
    }

    setActionLoading(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
        <div style={{
          width: 48, height: 48, border: '3px solid var(--border-color)',
          borderTopColor: 'var(--primary-600)', borderRadius: '50%', animation: 'spin 1s linear infinite',
        }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading profile details...</p>
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
          The requested profile does not exist or has been removed.
        </p>
        <Link href="/portal/member/matrimony/browse" className="btn btn-outline" style={{ alignSelf: 'center', textDecoration: 'none' }}>
          Back to Browse
        </Link>
      </div>
    );
  }

  const birthYear = new Date(profile.dob).getFullYear();
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;

  // Calculate Match Score
  const matchScore = myPrefs ? Math.round(computeMatchScore(myPrefs, profile)) : null;

  return (
    <div className="flex flex-col gap-6 animate-fade-in" style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 60, position: 'relative' }}>
      {/* Back button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/portal/member/matrimony/browse" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}>
          <ArrowLeft size={16} /> Back to Browse
        </Link>
        
        {/* Flag/Block actions */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => setReportOpen(true)} style={{ color: 'var(--error-600)', fontSize: '0.8rem', padding: '6px 12px' }}>
            <ShieldAlert size={14} /> Report
          </button>
          <button className="btn btn-ghost" onClick={handleBlock} style={{ color: 'var(--error-600)', fontSize: '0.8rem', padding: '6px 12px' }}>
            <XCircle size={14} /> Block
          </button>
        </div>
      </div>

      {/* Main Header Card */}
      <div className="card" style={{
        background: 'linear-gradient(145deg, var(--bg-card), rgba(232, 93, 4, 0.02))',
        border: '1px solid var(--border-color)', borderRadius: 24, padding: 32,
        display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center', position: 'relative'
      }}>
        {/* Avatar/Photo */}
        <div style={{
          width: 140, height: 140, borderRadius: 24, flexShrink: 0,
          background: profile.gender?.toLowerCase() === 'female' ? 'linear-gradient(135deg, rgba(217,119,6,0.13), rgba(251,191,36,0.06))' : 'linear-gradient(135deg, rgba(232,93,4,0.13), rgba(249,115,22,0.06))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 30px rgba(0,0,0,0.04)', border: '1px solid var(--border-color)',
          position: 'relative', overflow: 'hidden'
        }}>
          {profile.photo_visibility === 'blurred' && interestStatus !== 'accepted' ? (
            <div style={{
              width: '100%', height: '100%', filter: 'blur(8px)',
              background: profile.gender?.toLowerCase() === 'female' ? 'linear-gradient(135deg, rgba(217,119,6,0.25), rgba(251,191,36,0.13))' : 'linear-gradient(135deg, rgba(232,93,4,0.25), rgba(249,115,22,0.13))',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <User size={64} style={{ opacity: 0.3 }} />
            </div>
          ) : media.length > 0 ? (
            /* The server already applied the visibility and approval rules to
               this list, so whatever arrived is safe to show. */
            <img
              src={(media.find(m => m.is_primary) ?? media[0]).url}
              alt={`Photo of ${profile.display_pref === 'full_name' ? profile.full_name : profile.full_name.split(' ')[0]}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <User size={64} style={{ color: profile.gender?.toLowerCase() === 'female' ? 'var(--accent-600)' : 'var(--primary-600)' }} />
          )}
        </div>

        {/* Basic info */}
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', margin: 0 }}>
              {profile.display_pref === 'full_name' ? profile.full_name
                : profile.display_pref === 'initials'
                  ? profile.full_name.split(' ').map(n => n[0]).join('.').toUpperCase()
                  : profile.full_name.split(' ')[0]}
            </h1>
            {profile.is_verified_id && (
              <span className="badge" style={{ background: 'rgba(232, 93, 4, 0.1)', color: 'var(--text-accent)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={12} /> ID Verified
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 16 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={16} /> {age} years</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={16} /> {profile.city}, {profile.province}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Briefcase size={16} /> {profile.occupation}</span>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {interestStatus === 'none' && (
              <button className="btn btn-primary" onClick={handleSendInterest} disabled={actionLoading} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Heart size={16} /> Express Interest
              </button>
            )}
            {interestStatus === 'sent' && (
              <button className="btn btn-outline" disabled style={{ display: 'inline-flex', alignItems: 'center', gap: 8, opacity: 0.7 }}>
                <Send size={16} /> Interest Sent
              </button>
            )}
            {interestStatus === 'received' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" onClick={handleAcceptInterest} disabled={actionLoading} style={{ background: 'var(--success-500)', color: 'white', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  Accept
                </button>
                <button className="btn btn-outline" onClick={handleDeclineInterest} disabled={actionLoading} style={{ borderColor: 'var(--error-500)', color: 'var(--error-600)' }}>
                  Decline
                </button>
              </div>
            )}
            {interestStatus === 'accepted' && (
              <Link href="/portal/member/matrimony/messages" className="btn btn-primary" style={{ background: 'var(--success-500)', borderColor: 'var(--success-500)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <MessageCircle size={16} /> Start Chatting
              </Link>
            )}
            {interestStatus === 'declined' && (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                Interest Declined
              </span>
            )}
            {profile.photo_visibility === 'on_request' && interestStatus !== 'accepted' && (
              <button
                className="btn btn-outline"
                onClick={handleRequestPhotoAccess}
                disabled={photoRequesting || photoRequestSent}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <ImageIcon size={16} />
                {photoRequestSent ? 'Photo access requested' : photoRequesting ? 'Sending request...' : 'Request photo access'}
              </button>
            )}
            <button className="btn btn-outline" onClick={handleToggleShortlist} disabled={actionLoading} style={{ minWidth: 44, padding: 10 }}>
              <Bookmark size={18} fill={isShortlisted ? 'currentColor' : 'none'} />
            </button>
          </div>

          {photoRequestError && (
            <p role="alert" className="community-error" style={{ marginTop: 12 }}>{photoRequestError}</p>
          )}
          {photoRequestSent && !photoRequestError && (
            <p className="community-notice">
              <CheckCircle2 size={14} /> Request sent. This member decides whether to share their photos.
            </p>
          )}
        </div>

        {/* Match Score Indicator */}
        {matchScore !== null && (
          <div style={{
            position: 'absolute', top: 24, right: 24, display: 'flex', flexDirection: 'column', alignItems: 'center',
            background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '12px 18px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
          }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>Match Score</span>
            <div style={{
              fontSize: '1.75rem', fontWeight: 800,
              color: matchScore >= 80 ? 'var(--success-500)' : matchScore >= 60 ? 'var(--accent-400)' : 'var(--error-500)'
            }}>
              {matchScore}%
            </div>
          </div>
        )}
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
              {profile.about_me || 'No bio written.'}
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
            {interestStatus === 'accepted' ? (
              contactLoading ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading contact info...</p>
              ) : candidateContact ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Phone size={16} style={{ color: 'var(--text-muted)' }} />
                    <div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Phone</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{candidateContact.phone || 'Not provided'}</div>
                    </div>
                  </div>
                  {candidateContact.alt_phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Phone size={16} style={{ color: 'var(--text-muted)' }} />
                      <div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Alt Phone</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{candidateContact.alt_phone}</div>
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Mail size={16} style={{ color: 'var(--text-muted)' }} />
                    <div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Email</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{candidateContact.email || 'Not provided'}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No contact info available.</p>
              )
            ) : (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <Shield size={28} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  Contact details are locked. Express interest and once accepted, details will be revealed here.
                </p>
              </div>
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
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Preferences not set by candidate.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {reportOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex',
          alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
        }}>
          <div className="card animate-fade-in-up" style={{ width: '90%', maxWidth: 500, padding: 28 }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={20} color="var(--error-500)" /> Report Profile
            </h3>
            {reportSubmitted ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <CheckCircle2 size={44} color="var(--success-500)" style={{ marginBottom: 12 }} />
                <p style={{ fontWeight: 600, margin: 0 }}>Report Submitted</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>Thank you. Our admins will investigate this profile.</p>
              </div>
            ) : (
              <form onSubmit={handleReport}>
                <div className="input-group" style={{ marginBottom: 16 }}>
                  <label>Reason for reporting</label>
                  <select className="input" value={reportReason} onChange={e => setReportReason(e.target.value)} required>
                    <option value="">Select a reason</option>
                    <option value="fake_profile">Fake Profile / Identity Theft</option>
                    <option value="inappropriate_content">Inappropriate Content / Photos</option>
                    <option value="abusive_behavior">Abusive Behavior / Harassment</option>
                    <option value="solicitation">Spam / Solicitation / Scam</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="input-group" style={{ marginBottom: 20 }}>
                  <label>Details</label>
                  <textarea className="input" rows={4} value={reportDetails} onChange={e => setReportDetails(e.target.value)} placeholder="Provide any additional details or context..." />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <button type="button" className="btn btn-outline" onClick={() => setReportOpen(false)} disabled={actionLoading}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ background: 'var(--error-500)', borderColor: 'var(--error-500)' }} disabled={actionLoading}>Submit Report</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
