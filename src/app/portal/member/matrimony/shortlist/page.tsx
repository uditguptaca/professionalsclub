'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/app-context';
import { getMyMatrimony, listShortlist, removeFromShortlist } from '@/app/actions/matrimony';
import type { MatrimonyProfile, MatrimonyProfileCard } from '@/types/matrimony';
import {
  Bookmark, ArrowLeft, Trash2, User, MapPin, Briefcase, BadgeCheck,
  AlertCircle, Check, Loader2,
} from 'lucide-react';
import PortalLoading from '@/components/portal/PortalLoading';
import MatrimonyTabs from '@/components/portal/MatrimonyTabs';

const pageTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)', fontSize: 'clamp(1.35rem, 4vw, 1.55rem)',
  fontWeight: 800, letterSpacing: '-0.01em', margin: 0,
};

const backLinkStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
  minHeight: 44, fontSize: '0.84rem', fontWeight: 700,
  color: 'var(--text-accent)', textDecoration: 'none',
};

function getAge(dob: string): number {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

function getDisplayName(name: string, pref: string) {
  if (!name) return 'Member';
  if (pref === 'first_name') return name.split(' ')[0];
  if (pref === 'initials') return name.split(' ').map(w => w[0]).join('').toUpperCase();
  return name;
}

export default function ShortlistPage() {
  const { currentUserId } = useApp();

  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<MatrimonyProfile | null>(null);
  const [list, setList] = useState<MatrimonyProfileCard[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Cards come from matrimony_visible_profiles server-side; the shortlist is
  // scoped to the caller's own listing, so no owner id is sent.
  async function loadShortlist() {
    const result = await listShortlist();
    if (result.ok) setList(result.data);
    else setError(result.error);
  }

  useEffect(() => {
    async function loadData() {
      if (!currentUserId) { setLoading(false); return; }
      setLoading(true);
      const mine = await getMyMatrimony();
      if (mine.ok && mine.data.profile) {
        setMyProfile(mine.data.profile);
        await loadShortlist();
      } else if (!mine.ok) {
        setError(mine.error);
      }
      setLoading(false);
    }
    loadData();
  }, [currentUserId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const handleRemove = async (targetProfileId: string) => {
    if (!myProfile || actionLoading) return;
    setActionLoading(targetProfileId);
    setError('');
    const result = await removeFromShortlist(targetProfileId);
    if (result.ok) {
      await loadShortlist();
      setToast('Removed from shortlist');
    } else {
      // Surfaced inline: a silent console.error left the row looking unchanged
      // with no explanation.
      setError(result.error);
    }
    setActionLoading(null);
  };

  if (loading) {
    return <PortalLoading label="Loading shortlist" />;
  }

  if (!myProfile) {
    return (
      <div className="pp2" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}><MatrimonyTabs active="likes" /></div>
        <Bookmark size={28} aria-hidden="true" style={{ opacity: 0.35, marginBottom: 12 }} />
        <h1 style={{ ...pageTitleStyle, marginBottom: 8 }}>Create a profile first</h1>
        <p style={{ margin: '0 0 20px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          A matrimony profile lets you save candidates for later.
        </p>
        <Link href="/portal/member/matrimony/create" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          Create profile
        </Link>
        {error && (
          <div role="alert" className="community-error" style={{ textAlign: 'center', marginTop: 18 }}>
            <AlertCircle size={15} aria-hidden="true" /> {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
      {/* The wrapper cancels the nav's own bottom margin — this column has a gap. */}
      <div style={{ marginBottom: '-1.1rem' }}><MatrimonyTabs active="likes" /></div>
      <Link href="/portal/member/matrimony/interests" style={backLinkStyle}>
        <ArrowLeft size={15} aria-hidden="true" /> Back to Likes
      </Link>

      <div>
        <h1 style={pageTitleStyle}>Shortlist</h1>
        <p className="pp-group-sub" style={{ margin: '0.35rem 0 0' }}>
          {list.length === 0
            ? 'Profiles you save while browsing land here.'
            : `${list.length} profile${list.length === 1 ? '' : 's'} you saved for later.`}
        </p>
      </div>

      {error && (
        <div role="alert" className="community-error">
          <AlertCircle size={15} aria-hidden="true" /> {error}
        </div>
      )}

      {list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <Bookmark size={28} aria-hidden="true" style={{ opacity: 0.35, marginBottom: 12 }} />
          <p style={{ margin: '0 auto 18px', maxWidth: '24rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Nothing saved yet. Tap the star while swiping to keep someone here for later.
          </p>
          <Link href="/portal/member/matrimony" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Open Discover
          </Link>
        </div>
      ) : (
        <div className="hf-events">
          {list.map((cand) => {
            const href = `/portal/member/matrimony/profile/${cand.id}`;
            const name = getDisplayName(cand.full_name, cand.display_pref);
            const photo = cand.primary_photo_url;
            const open = cand.photo_visibility === 'all' && photo;
            const blurred = cand.photo_visibility === 'blurred' && photo;
            const busy = actionLoading === cand.id;
            return (
              <div key={cand.id} className="hf-event card">
                <Link href={href} className="hf-event-media" aria-label={`View ${name}`}>
                  {open || blurred ? (
                    <img
                      src={photo} alt="" aria-hidden="true"
                      style={blurred ? { filter: 'blur(20px)', transform: 'scale(1.12)' } : undefined}
                    />
                  ) : (
                    <span className="hf-event-fallback" aria-hidden="true"><User size={30} /></span>
                  )}
                  <span className="hf-chip">{getAge(cand.dob)} · {cand.city}</span>
                  {cand.is_verified_id && (
                    <span
                      role="img" aria-label="ID verified"
                      style={{
                        position: 'absolute', top: '0.7rem', right: '0.7rem',
                        display: 'grid', placeItems: 'center', width: 26, height: 26,
                        borderRadius: '50%', background: 'rgba(255,255,255,0.94)', color: 'var(--green-800)',
                      }}
                    >
                      <BadgeCheck size={14} />
                    </span>
                  )}
                </Link>

                <div className="hf-event-body">
                  <strong>{name}</strong>
                  <small>
                    <MapPin size={12} aria-hidden="true" />
                    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {[cand.city, cand.province].filter(Boolean).join(', ')}
                    </span>
                  </small>
                  <small>
                    <Briefcase size={12} aria-hidden="true" />
                    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cand.occupation || 'Not stated'}
                    </span>
                  </small>

                  <div style={{ display: 'flex', gap: 8, marginTop: '0.5rem' }}>
                    <Link
                      href={href} className="btn btn-primary"
                      style={{ flex: 1, minHeight: 44, justifyContent: 'center', textDecoration: 'none', fontSize: '0.85rem' }}
                    >
                      View profile
                    </Link>
                    <button
                      type="button" className="btn btn-outline"
                      style={{ minHeight: 44, minWidth: 44, color: 'var(--error-600)' }}
                      onClick={() => handleRemove(cand.id)}
                      disabled={busy}
                      aria-label={`Remove ${name} from shortlist`}
                    >
                      {busy
                        ? <Loader2 size={16} className="spin" aria-hidden="true" />
                        : <Trash2 size={16} aria-hidden="true" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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
