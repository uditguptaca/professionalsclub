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
  User, Briefcase, Building2, HandHeart, Heart, Bell, MapPin,
  Trash2, AlertCircle, ChevronRight, Save, X, BadgeCheck, Plus, Check,
  GraduationCap, Link2, Mail,
} from 'lucide-react';

/**
 * The profile hub, second pass. The page is a glanceable summary — identity
 * header with the completeness ring around the avatar, then grouped rows that
 * show current values. Editing happens in focused bottom sheets (the same
 * sheet language as the city switcher and the More menu), never in a page-long
 * form. Each sheet saves only its own fields.
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
const COMPLETENESS: (Field | 'joiningFor')[] = [
  'firstName', 'lastName', 'phone', 'city', 'province', 'currentStatus',
  'joiningFor', 'jobTitle', 'industry', 'experienceRange',
  'educationLevel', 'professionalSummary', 'linkedinUrl', 'skills',
];

type SheetId = 'identity' | 'location' | 'work' | 'background' | 'links' | 'prefs';

/** What each edit sheet owns: title, blurb, and the fields inside it. */
const SHEETS: Record<SheetId, { title: string; blurb: string; fields: Field[] }> = {
  identity:   { title: 'Your name & phone',   blurb: 'How the club knows and reaches you.', fields: ['firstName', 'lastName', 'phone'] },
  location:   { title: 'Where you are',       blurb: 'Your community — the whole app follows your city.', fields: ['city', 'province', 'currentStatus'] },
  work:       { title: 'What you do',         blurb: 'Your current role.', fields: ['jobTitle', 'industry', 'experienceRange'] },
  background: { title: 'Background',          blurb: 'Education and the skills you bring.', fields: ['educationLevel', 'skills', 'professionalSummary'] },
  links:      { title: 'Links',               blurb: 'Where people can see your work.', fields: ['linkedinUrl'] },
  prefs:      { title: 'How we reach you',    blurb: 'Pick what suits you — we only send what matters.', fields: ['preferredContactMethod', 'preferredLanguage'] },
};

/** The nudge rail: one chip per missing high-value field. */
const NUDGES: { field: Field; label: string; sheet: SheetId }[] = [
  { field: 'jobTitle',            label: 'Add your job title',  sheet: 'work' },
  { field: 'city',                label: 'Set your city',       sheet: 'location' },
  { field: 'skills',              label: 'Add your skills',     sheet: 'background' },
  { field: 'linkedinUrl',         label: 'Link your LinkedIn',  sheet: 'links' },
  { field: 'professionalSummary', label: 'Write your summary',  sheet: 'background' },
  { field: 'industry',            label: 'Pick your industry',  sheet: 'work' },
  { field: 'experienceRange',     label: 'Add your experience', sheet: 'work' },
  { field: 'phone',               label: 'Add your phone',      sheet: 'identity' },
];

const OPTIONS: Partial<Record<Field, string[]>> = {
  province: PROVINCES, currentStatus: CURRENT_STATUS, industry: INDUSTRIES,
  experienceRange: EXPERIENCE_RANGES, educationLevel: EDUCATION_LEVELS,
  preferredContactMethod: CONTACT_METHODS, preferredLanguage: LANGUAGES,
};

const LABELS: Record<Field, string> = {
  firstName: 'First name', lastName: 'Last name', phone: 'Phone',
  city: 'City', province: 'Province', currentStatus: 'Current status',
  jobTitle: 'Job title', industry: 'Industry', experienceRange: 'Experience',
  educationLevel: 'Education', linkedinUrl: 'LinkedIn', skills: 'Key skills',
  professionalSummary: 'Professional summary',
  preferredContactMethod: 'Contact method', preferredLanguage: 'Language',
};

export default function MemberProfilePage() {
  const router = useRouter();
  const confirm = useConfirm();
  const { profile, refreshProfile } = useApp();

  const [form, setForm] = useState<Form | null>(null);
  const [sheet, setSheet] = useState<SheetId | null>(null);
  const [draft, setDraft] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [sheetError, setSheetError] = useState('');
  const [toast, setToast] = useState('');
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

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // The open sheet locks background scroll, same as every other sheet here.
  useEffect(() => {
    if (!sheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSheet(null); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [sheet]);

  const completeness = useMemo(() => {
    if (!form || !profile) return 0;
    const values: Record<string, string> = { ...form, joiningFor: profile.joiningFor ?? '' };
    const filled = COMPLETENESS.filter((f) => values[f]?.trim()).length;
    return Math.round((100 * filled) / COMPLETENESS.length);
  }, [form, profile]);

  const nudges = useMemo(
    () => (form ? NUDGES.filter((n) => !form[n.field].trim()).slice(0, 4) : []),
    [form],
  );

  if (!profile || !form) return <PortalLoading label="Loading your profile" />;

  const openSheet = (id: SheetId) => { setDraft({ ...form }); setSheetError(''); setSheet(id); };

  const saveSheet = async () => {
    if (!sheet || !draft || saving) return;
    setSaving(true);
    setSheetError('');
    // Only this sheet's fields travel; the action's allowlist ignores
    // anything outside the self-description columns regardless.
    const payload = Object.fromEntries(SHEETS[sheet].fields.map((f) => [f, draft[f].trim()]));
    const result = await updateOwnProfile(payload);
    if (!result.ok) {
      setSheetError(result.error);
    } else {
      setForm((prev) => (prev ? { ...prev, ...payload } as Form : prev));
      await refreshProfile();
      setSheet(null);
      setToast('Profile updated');
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
    if (r.ok) { setRoles(r.data); setToast(!role.canRefer ? 'Open to referrals' : 'Referrals paused'); }
    else setRolesError(r.error);
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
    if (r.ok) { setRoles(r.data); setToast('Employer removed'); } else setRolesError(r.error);
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

  // Completeness ring around the avatar: r=44 → circumference ≈ 276.5.
  const RING_C = 2 * Math.PI * 44;

  /** One glanceable row: icon, label, current value (or an "Add" hint). */
  const row = (icon: React.ReactNode, label: string, value: string, onClick: () => void, key?: string) => (
    <button type="button" key={key ?? label} className="pp-row" onClick={onClick}>
      <span className="pp-row-icon">{icon}</span>
      <span className="pp-row-body">
        <small>{label}</small>
        {value ? <strong>{value}</strong> : <strong className="pp-row-empty">Add</strong>}
      </span>
      <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
    </button>
  );

  const sheetDef = sheet ? SHEETS[sheet] : null;

  return (
    <div className="pp2">
      {/* ---- Identity header ---- */}
      <header className="pp-hero">
        <div className="pp-ring" aria-hidden="true">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" className="pp-ring-track" />
            <circle
              cx="50" cy="50" r="44" className="pp-ring-fill"
              strokeDasharray={`${(completeness / 100) * RING_C} ${RING_C}`}
            />
          </svg>
          <div className="pp-avatar">{initials}</div>
          <span className="pp-ring-pct">{completeness}%</span>
        </div>
        <h1>{profile.firstName} {profile.lastName}</h1>
        <p>
          {form.jobTitle || 'Member'}{form.city ? ` · ${form.city}` : ''}
        </p>
        <div className="pp-hero-chips">
          {profile.verificationStatus === 'verified'
            ? <span className="pp-chip pp-chip-light"><BadgeCheck size={12} aria-hidden="true" /> Verified</span>
            : <span className="pp-chip pp-chip-light">Verification {profile.verificationStatus}</span>}
          <span className="pp-chip pp-chip-light">Since {since}</span>
        </div>
      </header>

      {/* ---- Finish-your-profile nudges ---- */}
      {nudges.length > 0 && (
        <div className="pp-nudges" role="list" aria-label="Complete your profile">
          {nudges.map((n) => (
            <button key={n.field} type="button" role="listitem" className="pp-nudge" onClick={() => openSheet(n.sheet)}>
              <Plus size={13} aria-hidden="true" /> {n.label}
            </button>
          ))}
        </div>
      )}

      <div className="pp-groups">
        {/* ---- About ---- */}
        <section className="pp-group">
          <h2>About you</h2>
          <div className="pp-group-card">
            {row(<User size={17} />, 'Name & phone', [form.firstName && `${form.firstName} ${form.lastName}`, form.phone].filter(Boolean).join(' · '), () => openSheet('identity'))}
            {row(<MapPin size={17} />, 'City & status', [form.city, form.currentStatus].filter(Boolean).join(' · '), () => openSheet('location'))}
          </div>
        </section>

        {/* ---- Professional ---- */}
        <section className="pp-group">
          <h2>Professional</h2>
          <div className="pp-group-card">
            {row(<Briefcase size={17} />, 'Role', [form.jobTitle, form.industry].filter(Boolean).join(' · '), () => openSheet('work'))}
            {row(<GraduationCap size={17} />, 'Background', [form.educationLevel, form.skills].filter(Boolean).join(' · '), () => openSheet('background'))}
            {row(<Link2 size={17} />, 'LinkedIn', form.linkedinUrl.replace(/^https?:\/\/(www\.)?/, ''), () => openSheet('links'))}
          </div>
        </section>

        {/* ---- Where I work ---- */}
        <section className="pp-group">
          <h2>Where I work</h2>
          <p className="pp-group-sub">
            Employers you can refer at. Job seekers only ever see an anonymous
            count until you accept a request.
          </p>
          {rolesError && (
            <div role="alert" className="community-error" style={{ marginBottom: 8 }}>
              <AlertCircle size={15} aria-hidden="true" /> {rolesError}
            </div>
          )}
          <div className="pp-group-card">
            {roles.map((role) => (
              <div key={role.id} className="pp-row pp-row-static">
                <span className="pp-row-icon"><Building2 size={17} /></span>
                <span className="pp-row-body">
                  <small>{role.jobTitle || 'Employer'}{role.verifiedByAdmin ? ' · verified' : ''}</small>
                  <strong>{role.companyName}</strong>
                </span>
                <button
                  type="button"
                  className={`pp-toggle ${role.canRefer ? 'is-on' : ''}`}
                  onClick={() => toggleCanRefer(role)}
                  aria-pressed={role.canRefer}
                  aria-label={`${role.canRefer ? 'Stop' : 'Start'} referring at ${role.companyName}`}
                >
                  <span className="pp-toggle-dot" aria-hidden="true" />
                  {role.canRefer ? 'Referring' : 'Paused'}
                </button>
                <button type="button" className="pp-row-x" onClick={() => removeRole(role)} aria-label={`Remove ${role.companyName}`}>
                  <X size={15} aria-hidden="true" />
                </button>
              </div>
            ))}
            <Link href="/portal/member/referrals?tab=work" className="pp-row pp-row-add">
              <span className="pp-row-icon"><Plus size={17} /></span>
              <span className="pp-row-body"><strong>{roles.length === 0 ? 'Add where you work' : 'Add another employer'}</strong></span>
              <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
            </Link>
          </div>
        </section>

        {/* ---- Community ---- */}
        <section className="pp-group">
          <h2>Community</h2>
          <div className="pp-group-card">
            <Link href={profile.isVolunteer ? '/portal/member/my-volunteer' : '/portal/member/volunteer'} className="pp-row">
              <span className="pp-row-icon"><HandHeart size={17} /></span>
              <span className="pp-row-body">
                <small>Volunteering</small>
                <strong>{profile.isVolunteer ? 'Active volunteer' : 'Apply to help newcomers'}</strong>
              </span>
              <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
            </Link>
            {matrimonyEnabled && (
              <Link href="/portal/member/matrimony" className="pp-row">
                <span className="pp-row-icon"><Heart size={17} /></span>
                <span className="pp-row-body">
                  <small>Matrimony</small>
                  <strong>{hasMatrimony === null ? '…' : hasMatrimony ? 'Profile active' : 'Create a profile'}</strong>
                </span>
                <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
              </Link>
            )}
          </div>
        </section>

        {/* ---- Settings ---- */}
        <section className="pp-group">
          <h2>Settings</h2>
          <div className="pp-group-card">
            {row(<Bell size={17} />, 'How we reach you', [form.preferredContactMethod, form.preferredLanguage].filter(Boolean).join(' · '), () => openSheet('prefs'))}
            <div className="pp-row pp-row-static">
              <span className="pp-row-icon"><Mail size={17} /></span>
              <span className="pp-row-body">
                <small>Sign-in email</small>
                <strong>{profile.email}</strong>
              </span>
            </div>
            <button type="button" className="pp-row pp-row-danger" onClick={handleDelete} disabled={deleting}>
              <span className="pp-row-icon"><Trash2 size={17} /></span>
              <span className="pp-row-body"><strong>{deleting ? 'Deleting…' : 'Delete my account'}</strong></span>
              <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
            </button>
          </div>
        </section>
      </div>

      {error && (
        <div role="alert" className="community-error" style={{ marginTop: 14 }}>
          <AlertCircle size={15} aria-hidden="true" /> {error}
        </div>
      )}

      {/* ---- Focused edit sheet ---- */}
      {sheet && sheetDef && draft && (
        <div className="hf-sheet-scrim" onClick={(e) => { if (e.target === e.currentTarget) setSheet(null); }}>
          <div className="hf-sheet pp-sheet" role="dialog" aria-modal="true" aria-label={sheetDef.title}>
            <div className="hf-sheet-head">
              <h2>{sheetDef.title}</h2>
              <button type="button" className="portal-sheet-close" onClick={() => setSheet(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <p className="hf-sheet-sub">{sheetDef.blurb}</p>

            <div className="pp-sheet-fields">
              {sheetDef.fields.map((f) => {
                const opts = OPTIONS[f];
                if (opts) {
                  return (
                    <div className="pp-field" key={f}>
                      <label htmlFor={`pp-${f}`}>{LABELS[f]}</label>
                      <div className="pp-select">
                        <select id={`pp-${f}`} value={draft[f]} onChange={(e) => setDraft({ ...draft, [f]: e.target.value })}>
                          <option value="">Not set</option>
                          {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                          {draft[f] && !opts.includes(draft[f]) && <option value={draft[f]}>{draft[f]}</option>}
                        </select>
                        <ChevronRight size={14} aria-hidden="true" className="pp-select-chevron" />
                      </div>
                    </div>
                  );
                }
                if (f === 'professionalSummary') {
                  return (
                    <div className="pp-field" key={f}>
                      <label htmlFor={`pp-${f}`}>{LABELS[f]}</label>
                      <textarea
                        id={`pp-${f}`} rows={4} value={draft[f]}
                        onChange={(e) => setDraft({ ...draft, [f]: e.target.value })}
                        placeholder="A few lines about your background and what you are looking for."
                      />
                    </div>
                  );
                }
                if (f === 'city') {
                  return (
                    <div className="pp-field" key={f}>
                      <label htmlFor="pp-city">City</label>
                      <input
                        id="pp-city" list="pp-city-options" value={draft.city}
                        onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                        placeholder="Choose your city"
                      />
                      <datalist id="pp-city-options">
                        {COMMUNITY_CITIES.map((c) => <option key={c.name} value={c.name}>{c.province}</option>)}
                      </datalist>
                    </div>
                  );
                }
                return (
                  <div className="pp-field" key={f}>
                    <label htmlFor={`pp-${f}`}>{LABELS[f]}</label>
                    <input
                      id={`pp-${f}`}
                      type={f === 'phone' ? 'tel' : f === 'linkedinUrl' ? 'url' : 'text'}
                      autoComplete={f === 'phone' ? 'tel' : undefined}
                      placeholder={f === 'linkedinUrl' ? 'https://linkedin.com/in/…' : f === 'skills' ? 'e.g. React, financial analysis' : undefined}
                      value={draft[f]}
                      onChange={(e) => setDraft({ ...draft, [f]: e.target.value })}
                    />
                  </div>
                );
              })}
            </div>

            {sheetError && (
              <div role="alert" className="community-error" style={{ marginTop: 4 }}>
                <AlertCircle size={15} aria-hidden="true" /> {sheetError}
              </div>
            )}

            <button type="button" className="pp-sheet-save" onClick={saveSheet} disabled={saving}>
              {saving ? 'Saving…' : <><Save size={16} aria-hidden="true" /> Save</>}
            </button>
          </div>
        </div>
      )}

      {/* ---- Feedback toast ---- */}
      {toast && (
        <div className="pp-toast" role="status">
          <Check size={15} aria-hidden="true" /> {toast}
        </div>
      )}
    </div>
  );
}
