'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/app-context';
import { updateOwnProfile } from '@/app/actions/portal';
import { deleteOwnAccount } from '@/app/actions/auth';
import { fetchMyInsiderRoles, saveWhereIWork, removeWhereIWork } from '@/app/actions/referrals';
import { getMyMatrimony } from '@/app/actions/matrimony';
import { authClient } from '@/lib/auth/client';
import { readAuthError } from '@/lib/auth/errors';
import { useConfirm } from '@/components/portal/confirm';
import PortalLoading from '@/components/portal/PortalLoading';
import { COMMUNITY_CITIES } from '@/lib/cities';
import {
  PROVINCES, CURRENT_STATUS, INDUSTRIES, EXPERIENCE_RANGES,
  EDUCATION_LEVELS, CONTACT_METHODS, LANGUAGES,
} from '@/lib/profile-options';
import type { CompanyInsider } from '@/types';
import {
  User, Briefcase, Building2, HandHeart, Heart, Bell, Shield,
  Trash2, AlertCircle, ChevronRight, ChevronDown, Save, X, BadgeCheck, Plus,
} from 'lucide-react';

/**
 * The profile hub: everything a member has told the club about themselves,
 * editable on one page. Field edits accumulate into one save (the sticky bar
 * appears when something changed); the insider roles and the community
 * modules act immediately since they live in their own tables.
 */

const FIELDS = [
  'firstName', 'lastName', 'phone', 'city', 'province', 'currentStatus',
  'jobTitle', 'industry', 'experienceRange', 'educationLevel',
  'linkedinUrl', 'skills', 'professionalSummary',
  'preferredContactMethod', 'preferredLanguage',
] as const;
type Field = (typeof FIELDS)[number];
type Form = Record<Field, string>;

/** Mirrors the home feed's completeness ring, so the two never disagree. */
const COMPLETENESS: (keyof Form | 'joiningFor')[] = [
  'firstName', 'lastName', 'phone', 'city', 'province', 'currentStatus',
  'joiningFor', 'jobTitle', 'industry', 'experienceRange',
  'educationLevel', 'professionalSummary', 'linkedinUrl', 'skills',
];

const selectField = (
  id: string, label: string, value: string, options: string[],
  onChange: (v: string) => void, allowEmpty = true,
) => (
  <div className="input-group">
    <label htmlFor={id}>{label}</label>
    <div style={{ position: 'relative' }}>
      <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)} style={{ appearance: 'none', width: '100%' }}>
        {allowEmpty && <option value="">Not set</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
        {/* A legacy value not in today's list still shows instead of blanking. */}
        {value && !options.includes(value) && <option value={value}>{value}</option>}
      </select>
      <ChevronDown size={15} aria-hidden="true" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
    </div>
  </div>
);

export default function MemberProfilePage() {
  const router = useRouter();
  const confirm = useConfirm();
  const { profile, refreshProfile } = useApp();

  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [roles, setRoles] = useState<CompanyInsider[]>([]);
  const [rolesError, setRolesError] = useState('');
  const [hasMatrimony, setHasMatrimony] = useState<boolean | null>(null);

  const matrimonyEnabled = process.env.NEXT_PUBLIC_FEATURE_MATRIMONY !== 'false';

  useEffect(() => {
    if (!profile || form) return;
    setForm(Object.fromEntries(FIELDS.map((f) => [f, (profile[f] as string | undefined) ?? ''])) as Form);
  }, [profile, form]);

  useEffect(() => {
    fetchMyInsiderRoles().then((r) => (r.ok ? setRoles(r.data) : setRolesError(r.error)));
    if (matrimonyEnabled) {
      getMyMatrimony().then((r) => setHasMatrimony(r.ok ? Boolean(r.data) : false));
    }
  }, [matrimonyEnabled]);

  const dirty = useMemo(() => {
    if (!profile || !form) return false;
    return FIELDS.some((f) => ((profile[f] as string | undefined) ?? '') !== form[f]);
  }, [profile, form]);

  const completeness = useMemo(() => {
    if (!form || !profile) return 0;
    const values: Record<string, string> = { ...form, joiningFor: profile.joiningFor ?? '' };
    const filled = COMPLETENESS.filter((f) => values[f]?.trim()).length;
    return Math.round((100 * filled) / COMPLETENESS.length);
  }, [form, profile]);

  if (!profile || !form) return <PortalLoading label="Loading your profile" />;

  const set = (key: Field) => (value: string) => {
    setSaved(false);
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };
  const input = (id: Field, label: string, extra?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div className="input-group">
      <label htmlFor={id}>{label}</label>
      <input id={id} className="input" value={form[id]} onChange={(e) => set(id)(e.target.value)} {...extra} />
    </div>
  );

  const handleSave = async () => {
    if (saving || !dirty) return;
    setSaving(true);
    setError('');
    // email / role / statuses are absent by design: the action's allowlist
    // ignores anything outside the self-description fields.
    const result = await updateOwnProfile(
      Object.fromEntries(FIELDS.map((f) => [f, form[f].trim()])),
    );
    if (!result.ok) {
      setError(result.error);
    } else {
      await refreshProfile();
      setSaved(true);
    }
    setSaving(false);
  };

  const toggleCanRefer = async (role: CompanyInsider) => {
    const r = await saveWhereIWork({
      companyId: role.companyId,
      jobTitle: role.jobTitle ?? undefined,
      canRefer: !role.canRefer,
      notifyEmail: role.notifyEmail,
    });
    if (r.ok) setRoles(r.data); else setRolesError(r.error);
  };

  const removeRole = async (role: CompanyInsider) => {
    const ok = await confirm({
      title: `Remove ${role.companyName}?`,
      message: 'You will stop receiving referral requests for this employer. You can add it back any time.',
      confirmLabel: 'Remove',
      tone: 'danger',
    });
    if (!ok) return;
    const r = await removeWhereIWork(role.companyId);
    if (r.ok) setRoles(r.data); else setRolesError(r.error);
  };

  const handleDelete = async () => {
    // App Store 5.1.1(v) / Play User Data: deletion must be real and in-app.
    const ok = await confirm({
      title: 'Delete your account permanently?',
      message: 'This erases your profile, help requests, volunteer history, matrimony data and messages, then signs you out. It cannot be undone.',
      confirmLabel: 'Delete my account',
      tone: 'danger',
    });
    if (!ok) return;
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

  const initials = `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase() || 'PC';
  const since = new Date(profile.createdAt).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }} className="animate-fade-in">
      {/* ---- Who this is ---- */}
      <div className="pp-head">
        <div className="pp-avatar" aria-hidden="true">{initials}</div>
        <div>
          <h1>{profile.firstName} {profile.lastName}</h1>
          <p>Member since {since}{profile.pcNumber ? ` · ${profile.pcNumber}` : ''}</p>
          <div className="pp-chips">
            {profile.verificationStatus === 'verified'
              ? <span className="pp-chip"><BadgeCheck size={12} aria-hidden="true" /> Verified member</span>
              : <span className="pp-chip is-pending">Verification {profile.verificationStatus}</span>}
            <span className="pp-chip">{completeness}% complete</span>
          </div>
        </div>
      </div>

      <div className="pp-sections">
        {/* ---- Personal ---- */}
        <section className="card pp-card">
          <h2><User size={17} aria-hidden="true" /> Personal details</h2>
          <p className="pp-card-sub">Who you are and where your community is.</p>
          <div className="pp-grid">
            {input('firstName', 'First name')}
            {input('lastName', 'Last name')}
            {input('phone', 'Phone number', { type: 'tel', autoComplete: 'tel' })}
            <div className="input-group">
              <label htmlFor="city">City</label>
              <input id="city" className="input" list="pp-city-options" value={form.city} onChange={(e) => set('city')(e.target.value)} />
              <datalist id="pp-city-options">
                {COMMUNITY_CITIES.map((c) => <option key={c.name} value={c.name}>{c.province}</option>)}
              </datalist>
            </div>
            {selectField('province', 'Province', form.province, PROVINCES, set('province'))}
            {selectField('currentStatus', 'Current status', form.currentStatus, CURRENT_STATUS, set('currentStatus'))}
          </div>
        </section>

        {/* ---- Professional ---- */}
        <section className="card pp-card">
          <h2><Briefcase size={17} aria-hidden="true" /> Professional</h2>
          <p className="pp-card-sub">What you do — this is how other members and volunteers can help you, and how you can help them.</p>
          <div className="pp-grid">
            {input('jobTitle', 'Job title / profession')}
            {selectField('industry', 'Industry', form.industry, INDUSTRIES, set('industry'))}
            {selectField('experienceRange', 'Experience', form.experienceRange, EXPERIENCE_RANGES, set('experienceRange'))}
            {selectField('educationLevel', 'Education', form.educationLevel, EDUCATION_LEVELS, set('educationLevel'))}
            <div className="full">{input('linkedinUrl', 'LinkedIn URL', { type: 'url', placeholder: 'https://linkedin.com/in/…' })}</div>
            <div className="full">{input('skills', 'Key skills', { placeholder: 'e.g. React, financial analysis, project management' })}</div>
            <div className="input-group full">
              <label htmlFor="professionalSummary">Professional summary</label>
              <textarea
                id="professionalSummary" className="input" rows={4}
                value={form.professionalSummary}
                onChange={(e) => set('professionalSummary')(e.target.value)}
                placeholder="A few lines about your background and what you are looking for."
              />
            </div>
          </div>
        </section>

        {/* ---- Where I work ---- */}
        <section className="card pp-card">
          <h2><Building2 size={17} aria-hidden="true" /> Where I work</h2>
          <p className="pp-card-sub">
            Employers you have added for the referral program. Only admins can see
            this — job seekers see an anonymous count until you accept a request.
          </p>
          {rolesError && (
            <div role="alert" className="community-error" style={{ marginBottom: 8 }}>
              <AlertCircle size={15} aria-hidden="true" /> {rolesError}
            </div>
          )}
          {roles.length === 0
            ? <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>No employers added yet.</p>
            : roles.map((role) => (
              <div key={role.id} className="pp-role">
                <div className="pp-role-body">
                  <strong>{role.companyName}</strong>
                  <small>{role.jobTitle || 'Role not specified'}{role.verifiedByAdmin ? ' · verified' : ''}</small>
                </div>
                <button
                  type="button"
                  className={`pp-role-toggle ${role.canRefer ? 'is-on' : ''}`}
                  onClick={() => toggleCanRefer(role)}
                  aria-pressed={role.canRefer}
                >
                  {role.canRefer ? <BadgeCheck size={13} aria-hidden="true" /> : null}
                  {role.canRefer ? 'Open to referrals' : 'Not helping now'}
                </button>
                <button type="button" className="pp-role-remove" onClick={() => removeRole(role)} aria-label={`Remove ${role.companyName}`}>
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            ))}
          <Link href="/portal/member/referrals?tab=work" className="btn btn-secondary" style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} aria-hidden="true" /> Add an employer
          </Link>
        </section>

        {/* ---- Community involvement ---- */}
        <section className="card pp-card">
          <h2><HandHeart size={17} aria-hidden="true" /> My community involvement</h2>
          <div className="pp-links">
            <Link href={profile.isVolunteer ? '/portal/member/my-volunteer' : '/portal/member/volunteer'}>
              <HandHeart size={17} aria-hidden="true" />
              <span>
                Volunteering
                <small>{profile.isVolunteer ? 'You are a volunteer — see your assignments' : 'Not a volunteer yet — apply to help other newcomers'}</small>
              </span>
              <ChevronRight size={15} aria-hidden="true" className="pp-go" />
            </Link>
            {matrimonyEnabled && (
              <Link href="/portal/member/matrimony">
                <Heart size={17} aria-hidden="true" />
                <span>
                  Matrimony profile
                  <small>
                    {hasMatrimony === null ? 'Checking…' : hasMatrimony ? 'Profile created — manage it in the matrimony section' : 'No profile yet — create one when you are ready'}
                  </small>
                </span>
                <ChevronRight size={15} aria-hidden="true" className="pp-go" />
              </Link>
            )}
          </div>
        </section>

        {/* ---- Preferences ---- */}
        <section className="card pp-card">
          <h2><Bell size={17} aria-hidden="true" /> Preferences</h2>
          <p className="pp-card-sub">How the club should reach you.</p>
          <div className="pp-grid">
            {selectField('preferredContactMethod', 'Preferred contact method', form.preferredContactMethod, CONTACT_METHODS, set('preferredContactMethod'), false)}
            {selectField('preferredLanguage', 'Preferred language', form.preferredLanguage, LANGUAGES, set('preferredLanguage'), false)}
          </div>
        </section>

        {/* ---- Account ---- */}
        <section className="card pp-card">
          <h2><Shield size={17} aria-hidden="true" /> Account</h2>
          <div className="pp-grid">
            <div className="input-group full">
              <label htmlFor="pp-email">Sign-in email</label>
              <input id="pp-email" className="input" type="email" value={profile.email} disabled readOnly />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                Contact an administrator to change your sign-in email.
              </span>
            </div>
          </div>
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid rgba(27,67,50,0.08)' }}>
            <p style={{ margin: '0 0 10px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Deleting your account permanently erases your profile, requests,
              volunteer history, matrimony data and messages. It cannot be undone.
            </p>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="btn"
              style={{ background: 'var(--error-50)', color: 'var(--error-600)', border: '1px solid rgba(220,73,58,0.35)', display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <Trash2 size={15} aria-hidden="true" /> {deleting ? 'Deleting…' : 'Delete my account'}
            </button>
          </div>
        </section>
      </div>

      {error && (
        <div role="alert" className="community-error" style={{ marginTop: 14 }}>
          <AlertCircle size={15} aria-hidden="true" /> {error}
        </div>
      )}

      {/* ---- Save bar: appears only when something changed ---- */}
      {(dirty || saved) && (
        <div className="pp-savebar">
          <div className="pp-savebar-inner">
            <span>{saved && !dirty ? 'All changes saved.' : 'You have unsaved changes'}</span>
            {(dirty || saving) && (
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Save size={16} aria-hidden="true" /> {saving ? 'Saving…' : 'Save changes'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
