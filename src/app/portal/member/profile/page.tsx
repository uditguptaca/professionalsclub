'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/app-context';
import { updateOwnProfile } from '@/app/actions/portal';
import { deleteOwnAccount } from '@/app/actions/auth';
import { authClient } from '@/lib/auth/client';
import { readAuthError } from '@/lib/auth/errors';
import { Save, Trash2, AlertTriangle, UserCircle, AlertCircle } from 'lucide-react';

const FIELDS = [
  'firstName', 'lastName', 'email', 'phone', 'city', 'province', 'industry', 'jobTitle',
] as const;

type Field = (typeof FIELDS)[number];

export default function MemberProfilePage() {
  const router = useRouter();
  const { profile, refreshProfile } = useApp();

  const [form, setForm] = useState<Record<Field, string>>({
    firstName: '', lastName: '', email: '', phone: '',
    city: '', province: '', industry: '', jobTitle: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Seed from the server-resolved profile rather than hardcoded placeholders.
  useEffect(() => {
    if (!profile) return;
    setForm({
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
      email: profile.email ?? '',
      phone: profile.phone ?? '',
      city: profile.city ?? '',
      province: profile.province ?? '',
      industry: profile.industry ?? '',
      jobTitle: profile.jobTitle ?? '',
    });
  }, [profile]);

  const set = (key: Field, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!profile || isSaving) return;

    setIsSaving(true);
    setSaveSuccess(false);
    setError('');

    // email is intentionally not sent: changing the sign-in address has to go
    // through Neon Auth so the new address gets verified. Writing it here would
    // desynchronise neon_auth."user" from profiles.
    //
    // The action's allowlist has no role, account_status or verification_status
    // entry, so those cannot be written through this path even if the payload
    // carried them.
    const result = await updateOwnProfile({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      city: form.city.trim(),
      province: form.province.trim(),
      industry: form.industry.trim(),
      jobTitle: form.jobTitle.trim(),
    });

    if (!result.ok) {
      setError(result.error);
    } else {
      setSaveSuccess(true);
      await refreshProfile();
      setTimeout(() => setSaveSuccess(false), 3000);
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!profile) return;

    // App Store Guideline 5.1.1(v) / Play User Data policy: deletion must be
    // real and initiated in-app. Typed confirmation instead of an OK box —
    // this is the one action here that cannot be undone.
    const typed = window.prompt(
      'This permanently deletes your account, requests, volunteer history and matrimony data. It cannot be undone.\n\nType DELETE to confirm.'
    );
    if (typed !== 'DELETE') return;

    setDeleting(true);
    setError('');

    const result = await deleteOwnAccount();

    if (!result.ok) {
      setError(`Could not close the account: ${result.error}`);
      setDeleting(false);
      return;
    }

    try {
      await authClient.signOut();
    } catch (thrown) {
      console.error('[auth] Sign-out failed:', readAuthError(thrown).code);
    }

    router.replace('/');
    router.refresh();
  };

  if (!profile) return null;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }} className="animate-fade-in">
      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-secondary)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <UserCircle size={40} />
        </div>
        <div>
          <h1 className="text-3xl font-bold font-display mb-1">My Profile</h1>
          <p className="text-secondary">Update the information you provided during signup or manage your account status.</p>
        </div>
      </div>

      <div className="card" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.04)', marginBottom: 32 }}>
        <h2 className="text-xl font-bold mb-6 border-b pb-4">Personal Details</h2>

        <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="input-group">
            <label htmlFor="firstName">First Name</label>
            <input id="firstName" className="input" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
          </div>
          <div className="input-group">
            <label htmlFor="lastName">Last Name</label>
            <input id="lastName" className="input" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
          </div>
          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <input id="email" className="input" type="email" value={form.email} disabled readOnly />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
              Contact an administrator to change your sign-in email.
            </span>
          </div>
          <div className="input-group">
            <label htmlFor="phone">Phone Number</label>
            <input id="phone" className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div className="input-group">
            <label htmlFor="city">City</label>
            <input id="city" className="input" value={form.city} onChange={(e) => set('city', e.target.value)} />
          </div>
          <div className="input-group">
            <label htmlFor="province">Province</label>
            <input id="province" className="input" value={form.province} onChange={(e) => set('province', e.target.value)} />
          </div>
        </div>

        <h2 className="text-xl font-bold mt-10 mb-6 border-b pb-4">Professional Information</h2>

        <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="input-group">
            <label htmlFor="industry">Industry</label>
            <input id="industry" className="input" value={form.industry} onChange={(e) => set('industry', e.target.value)} />
          </div>
          <div className="input-group">
            <label htmlFor="jobTitle">Job Title / Profession</label>
            <input id="jobTitle" className="input" value={form.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} />
          </div>
        </div>

        {error && (
          <div role="alert" style={{ marginTop: 24, color: 'var(--error-600)', fontSize: '0.85rem', padding: '10px 14px', background: 'rgba(240, 73, 35, 0.1)', borderRadius: 8, display: 'flex', gap: 8 }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 16 }}>
          {saveSuccess && <span style={{ color: 'var(--success-600)', fontWeight: 600, fontSize: '0.9rem' }}>Changes saved.</span>}
          <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
            <Save size={18} style={{ marginRight: 8 }} />
            {isSaving ? 'Saving…' : 'Save Profile Changes'}
          </button>
        </div>
      </div>

      <div style={{ borderRadius: 16, border: '1px solid var(--error-50)', background: 'var(--error-50)', padding: 32 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--error-600)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={20} /> Danger Zone
        </h2>
        <p style={{ color: 'var(--error-600)', fontSize: '0.95rem', marginBottom: 24, maxWidth: 600 }}>
          Deleting your account permanently erases your profile, help requests,
          volunteer history, matrimony data and messages, and signs you out.
          This cannot be undone.
        </p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{
            padding: '12px 24px', background: 'var(--error-600)', color: 'white', borderRadius: 8,
            fontWeight: 700, fontSize: '0.95rem', border: 'none',
            cursor: deleting ? 'not-allowed' : 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 8, opacity: deleting ? 0.7 : 1,
          }}
        >
          <Trash2 size={16} /> {deleting ? 'Deleting…' : 'Delete My Account'}
        </button>
      </div>
    </div>
  );
}
