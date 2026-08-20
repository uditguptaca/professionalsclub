'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/app-context';
import { getMyMatrimony, saveMatrimonyProfile, deleteMyMatrimonyProfile } from '@/app/actions/matrimony';
import type { MatrimonyProfile } from '@/types/matrimony';
import {
  ArrowLeft, Eye, EyeOff, Trash2, Check, AlertCircle, Save, ChevronRight, Heart,
} from 'lucide-react';
import PortalLoading from '@/components/portal/PortalLoading';
import { useConfirm } from '@/components/portal/confirm';

const PHOTO_OPTIONS: { value: 'all' | 'blurred' | 'on_request'; label: string; desc: string }[] = [
  { value: 'all',        label: 'Visible to approved members', desc: 'Anyone browsing matrimony can see your photos.' },
  { value: 'blurred',    label: 'Blurred until you allow it',  desc: 'Photos appear blurred until you grant access.' },
  { value: 'on_request', label: 'On request only',             desc: 'Photos stay hidden. Members have to ask you.' },
];

export default function MatrimonySettingsPage() {
  const router = useRouter();
  const confirmAction = useConfirm();
  const { currentUserId } = useApp();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<MatrimonyProfile | null>(null);

  // Settings values
  const [photoVisibility, setPhotoVisibility] = useState<'all' | 'on_request' | 'blurred'>('all');
  const [isHidden, setIsHidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  // Two messages rather than one, so a failure is rendered next to the button
  // that caused it: the save button and the delete button are far apart.
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      if (!currentUserId) { setLoading(false); return; }
      const result = await getMyMatrimony();
      const data = result.ok ? result.data.profile : null;

      if (data) {
        setProfile(data);
        setPhotoVisibility(data.photo_visibility);
        setIsHidden(data.is_hidden);
      } else if (!result.ok) {
        setSaveError(result.error);
      }
      setLoading(false);
    }
    loadSettings();
  }, [currentUserId]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || saving) return;
    setSaving(true);
    setSavedMsg(false);
    setSaveError(null);

    // The action writes against the caller's own listing; no profile id is
    // sent, so this cannot be pointed at someone else's settings.
    const result = await saveMatrimonyProfile({
      photo_visibility: photoVisibility,
      is_hidden: isHidden,
    });

    if (result.ok) {
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 3000);
    } else {
      setSaveError(result.error);
    }

    setSaving(false);
  };

  const handleDeleteProfile = async () => {
    if (!profile || deleting) return;
    // One dialog that states the full consequence beats two stacked ones: the
    // second "are you REALLY sure" teaches people to click through warnings.
    const ok = await confirmAction({
      title: 'Delete your matrimony profile?',
      message: 'Your preferences, interests, shortlist and chat messages are deleted with it. This cannot be undone.',
      confirmLabel: 'Delete profile',
    });
    if (!ok) return;

    setDeleting(true);
    setDeleteError(null);

    // Foreign keys cascade, so removing the listing also removes
    // preferences, contact, interests, shortlists and conversations.
    const result = await deleteMyMatrimonyProfile();

    if (result.ok) {
      router.push('/portal/member/matrimony');
      return;
    }

    setDeleteError(result.error);
    setDeleting(false);
  };

  if (loading) {
    return (
      <PortalLoading label="Loading settings" />
    );
  }

  if (!profile) {
    return (
      <div className="pp2" style={{ textAlign: 'center', padding: '2.5rem 0' }}>
        <Heart size={28} aria-hidden="true" style={{ opacity: 0.35, marginBottom: 12 }} />
        <p style={{ margin: '0 0 1.1rem', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
          Create a matrimony profile to manage its privacy settings.
        </p>
        <Link href="/portal/member/matrimony/create" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          Create profile
        </Link>
        {saveError && (
          <div role="alert" className="community-error" style={{ marginTop: 16, textAlign: 'left' }}>
            <AlertCircle size={15} aria-hidden="true" /> {saveError}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pp2">
      <Link
        href="/portal/member/matrimony"
        className="pp-chip"
        style={{
          background: 'var(--bg-primary)', border: '1px solid rgba(27,67,50,0.08)',
          color: 'var(--text-secondary)', textDecoration: 'none',
          minHeight: 40, padding: '0 0.9rem', marginBottom: '0.9rem',
        }}
      >
        <ArrowLeft size={14} aria-hidden="true" /> Matrimony
      </Link>

      <header style={{ marginBottom: '1.2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.01em', margin: '0 0 0.25rem' }}>
          Matrimony settings
        </h1>
        <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
          You decide who sees your photos and whether your listing is live.
        </p>
      </header>

      <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
        <section className="pp-group">
          <h2>Photo visibility</h2>
          <p className="pp-group-sub">Applies to every photo on your listing. You can change it any time.</p>
          <div className="pp-group-card">
            {PHOTO_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="pp-row"
                htmlFor={`photo-vis-${opt.value}`}
                style={{ alignItems: 'flex-start', padding: '0.85rem 0.9rem' }}
              >
                <input
                  id={`photo-vis-${opt.value}`}
                  type="radio"
                  name="photo_visibility"
                  value={opt.value}
                  checked={photoVisibility === opt.value}
                  onChange={e => setPhotoVisibility(e.target.value as 'all' | 'on_request' | 'blurred')}
                  style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0, accentColor: 'var(--primary-700)' }}
                />
                <span className="pp-row-body">
                  <strong style={{ whiteSpace: 'normal' }}>{opt.label}</strong>
                  <small style={{ marginTop: 2, fontWeight: 500 }}>{opt.desc}</small>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="pp-group">
          <h2>Your listing</h2>
          <p className="pp-group-sub">
            While paused, your listing is out of browse and search. Members you already
            matched with, or sent an interest to, can still see it.
          </p>
          <div className="pp-group-card">
            <div className="pp-row pp-row-static">
              <span className="pp-row-icon">
                {isHidden ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
              </span>
              <span className="pp-row-body">
                <small>Status</small>
                <strong>{isHidden ? 'Paused' : 'Live in browse and search'}</strong>
              </span>
              <button
                type="button"
                className={`pp-toggle ${isHidden ? '' : 'is-on'}`}
                onClick={() => setIsHidden(v => !v)}
                aria-pressed={!isHidden}
                aria-label={isHidden ? 'Make my listing live' : 'Pause my listing'}
              >
                <span className="pp-toggle-dot" aria-hidden="true" />
                {isHidden ? 'Paused' : 'Live'}
              </button>
            </div>
          </div>
        </section>

        {saveError && (
          <div role="alert" className="community-error">
            <AlertCircle size={15} aria-hidden="true" /> {saveError}
          </div>
        )}

        <button type="submit" className="pp-sheet-save" disabled={saving}>
          {saving ? 'Saving…' : <><Save size={16} aria-hidden="true" /> Save settings</>}
        </button>
      </form>

      <section className="pp-group" style={{ marginTop: '1.6rem' }}>
        <h2>Delete</h2>
        <p className="pp-group-sub">
          This removes your matrimony listing and everything attached to it. Your
          Professionals Club account is not affected.
        </p>
        <div className="pp-group-card">
          <button type="button" className="pp-row pp-row-danger" onClick={handleDeleteProfile} disabled={deleting}>
            <span className="pp-row-icon"><Trash2 size={17} aria-hidden="true" /></span>
            <span className="pp-row-body">
              <strong>{deleting ? 'Deleting…' : 'Delete matrimony profile'}</strong>
            </span>
            <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
          </button>
        </div>
        {deleteError && (
          <div role="alert" className="community-error" style={{ marginTop: 10 }}>
            <AlertCircle size={15} aria-hidden="true" /> {deleteError}
          </div>
        )}
      </section>

      {savedMsg && (
        <div className="pp-toast" role="status">
          <Check size={15} aria-hidden="true" /> Settings saved
        </div>
      )}
    </div>
  );
}
