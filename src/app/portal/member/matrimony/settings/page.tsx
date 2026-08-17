'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/app-context';
import { getMyMatrimony, saveMatrimonyProfile, deleteMyMatrimonyProfile } from '@/app/actions/matrimony';
import type { MatrimonyProfile } from '@/types/matrimony';
import {
  Settings, ArrowLeft, Shield, Eye, PauseCircle, Trash2, CheckCircle2,
  AlertCircle, EyeOff, Save, Loader2
} from 'lucide-react';

export default function MatrimonySettingsPage() {
  const router = useRouter();
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
      try {
        const result = await getMyMatrimony();
        const data = result.ok ? result.data.profile : null;

        if (data) {
          setProfile(data);
          setPhotoVisibility(data.photo_visibility);
          setIsHidden(data.is_hidden);
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setLoading(false);
      }
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
    const confirm1 = confirm('WARNING: Are you sure you want to permanently delete your Matrimony Profile? This action cannot be undone.');
    if (!confirm1) return;
    const confirm2 = confirm('Are you absolutely sure? All your preferences, interest history, shortlist, chat messages, and details will be deleted permanently.');
    if (!confirm2) return;

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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
        <div style={{
          width: 48, height: 48, border: '3px solid var(--border-color)',
          borderTopColor: 'var(--primary-600)', borderRadius: '50%', animation: 'spin 1s linear infinite',
        }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading settings...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col gap-6" style={{ maxWidth: 600, margin: '40px auto', textAlign: 'center' }}>
        <h2 style={{ fontWeight: 800 }}>Profile Required</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Please create a matrimony profile first to access settings.
        </p>
        <Link href="/portal/member/matrimony/create" className="btn btn-primary" style={{ alignSelf: 'center', textDecoration: 'none' }}>
          Create Profile
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in" style={{ maxWidth: 700, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header */}
      <div>
        <Link href="/portal/member/matrimony" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 6 }}>
          Matrimony Settings
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Configure your privacy, visibility, and account options.
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="flex flex-col gap-6">
        {/* Privacy Settings Card */}
        <div className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={18} style={{ color: 'var(--primary-600)' }} /> Privacy Settings
          </h2>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
            {/* Photo Visibility */}
            <div className="input-group" style={{ marginBottom: 20 }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Photo Visibility</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { value: 'all', label: 'Visible to all approved members', desc: 'Anyone can view your photos.' },
                  { value: 'blurred', label: 'Show blurred placeholder', desc: 'Photos appear blurred until you grant permission.' },
                  { value: 'on_request', label: 'Visible on request only', desc: 'Photos are hidden. Members must ask to view.' }
                ].map(opt => (
                  <label key={opt.value} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="photo_visibility"
                      value={opt.value}
                      checked={photoVisibility === opt.value}
                      onChange={e => setPhotoVisibility(e.target.value as 'all' | 'on_request' | 'blurred')}
                      style={{ marginTop: 4 }}
                    />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{opt.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Visibility Card */}
        <div className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Eye size={18} style={{ color: 'var(--success-500)' }} /> Profile Visibility
          </h2>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isHidden}
                onChange={e => setIsHidden(e.target.checked)}
                style={{ marginTop: 4 }}
              />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  Pause Profile (Hide from search) {isHidden && <EyeOff size={14} style={{ color: 'var(--error-500)' }} />}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 2 }}>
                  When paused, your profile will be hidden from search results and browse catalogs.
                  Members you have already matched with or shown interest in will still be able to view it.
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Save Settings Trigger */}
        {saveError && <p role="alert" className="community-error">{saveError}</p>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Settings
          </button>
          {savedMsg && (
            <span style={{ fontSize: '0.8rem', color: 'var(--success-500)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 size={14} /> Settings saved.
            </span>
          )}
        </div>
      </form>

      {/* Danger Zone */}
      <div className="card" style={{
        padding: 28, border: '1px solid rgba(240,73,35,0.2)', background: 'rgba(240,73,35,0.01)',
        display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24
      }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--error-500)' }}>
          <Trash2 size={18} /> Danger Zone
        </h2>
        <div style={{ borderTop: '1px solid rgba(240,73,35,0.1)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Delete Matrimony Profile</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Permanently delete all matrimony data. This will not affect your core portal account.
            </div>
          </div>
          <button className="btn" onClick={handleDeleteProfile} disabled={deleting} style={{ background: 'var(--error-500)', color: 'white', border: 'none' }}>
            {deleting ? 'Deleting...' : 'Delete Profile'}
          </button>
        </div>
        {deleteError && <p role="alert" className="community-error">{deleteError}</p>}
      </div>
    </div>
  );
}
