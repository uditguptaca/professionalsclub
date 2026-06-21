'use client';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useApp } from '@/context/app-context';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import type { MatrimonyWizardData } from '@/types/matrimony';
import {
  RELIGIONS, DENOMINATIONS, COMMUNITIES, MOTHER_TONGUES, LANGUAGES,
  COUNTRIES, CANADIAN_PROVINCES, INDIAN_STATES,
  QUALIFICATIONS, FIELDS_OF_STUDY, INDUSTRIES, OCCUPATIONS, INCOME_RANGES,
  BODY_TYPES, HEIGHT_OPTIONS, RASHIS, NAKSHATRAS, HOBBIES,
  WIZARD_STEPS, COMPLETENESS_WEIGHTS,
} from '@/lib/matrimony/constants';
import {
  personalSchema, religionSchema, astrologySchema, locationSchema,
  careerSchema, familySchema, aboutSchema, preferencesSchema,
  contactSchema, consentSchema, STEP_SCHEMAS,
} from '@/lib/matrimony/schemas';
import {
  User, Heart, Star, MapPin, Briefcase, Users, Camera, Search,
  ChevronLeft, ChevronRight, Save, CheckCircle2, AlertCircle,
  Sparkles, Shield, ChevronDown, ChevronUp, X, Plus, Loader2,
} from 'lucide-react';

// ── Icon map for wizard steps ──────────────────────────────
const STEP_ICONS: Record<string, React.ReactNode> = {
  User: <User size={18} />,
  Heart: <Heart size={18} />,
  Star: <Star size={18} />,
  MapPin: <MapPin size={18} />,
  Briefcase: <Briefcase size={18} />,
  Users: <Users size={18} />,
  Camera: <Camera size={18} />,
  Search: <Search size={18} />,
};

// ── Default wizard data ────────────────────────────────────
const DEFAULT_DATA: MatrimonyWizardData = {
  full_name: '', display_pref: 'full_name', gender: 'male', dob: '',
  height_cm: 0, weight_kg: undefined, body_type: undefined,
  marital_status: 'never_married', have_children: 'no',
  physical_status: undefined, created_by: 'self',
  religion: '', denomination: undefined, community: undefined,
  sub_caste: undefined, gothra: undefined, mother_tongue: '', languages: [],
  time_of_birth: undefined, place_of_birth: undefined, rashi: undefined,
  nakshatra: undefined, manglik: undefined,
  country: '', province: '', city: '', residency_status: 'citizen',
  open_to_relocate: 'depends',
  qualification: '', field_of_study: undefined, institution: undefined,
  occupation: '', employer: undefined, industry: '', employment_type: 'full_time',
  work_location: undefined, income_range: '',
  family_type: undefined, family_status: undefined, family_values: undefined,
  father_occupation: undefined, mother_occupation: undefined,
  siblings_count: undefined, siblings_married: undefined,
  native_place: undefined, family_about: undefined,
  diet: 'veg', smoking: 'no', drinking: 'no', hobbies: [],
  about_me: '', photo_visibility: 'all',
  pref_age_min: 21, pref_age_max: 35,
  pref_height_min_cm: undefined, pref_height_max_cm: undefined,
  pref_marital_status: [], pref_religion: [], pref_denomination: [],
  pref_community: [], pref_mother_tongue: [],
  pref_country: undefined, pref_province: undefined, pref_city: undefined,
  pref_residency_status: [], pref_education: [], pref_profession: [],
  pref_income_range: undefined, pref_diet: [],
  pref_smoking: undefined, pref_drinking: undefined,
  pref_manglik: undefined, pref_other_notes: undefined,
  contact_phone: undefined, contact_alt_phone: undefined,
  contact_email: undefined, contact_preferred_method: 'email',
  contact_best_time: undefined,
  terms_accepted: false, age_confirmed: false,
};

// ── Helper: label maps for enum values ─────────────────────
const LABEL: Record<string, string> = {
  full_name: 'Full Name', first_name: 'First Name Only', initials: 'Initials Only',
  male: 'Male', female: 'Female', other: 'Other',
  never_married: 'Never Married', divorced: 'Divorced', widowed: 'Widowed',
  awaiting_divorce: 'Awaiting Divorce', separated: 'Separated',
  yes_living_together: 'Yes, living together', yes_not_living_together: 'Yes, not living together', no: 'No',
  normal: 'Normal', differently_abled: 'Differently Abled',
  self: 'Self', parent: 'Parent', sibling: 'Sibling', relative: 'Relative', friend: 'Friend', guardian: 'Guardian',
  citizen: 'Citizen', pr: 'Permanent Resident', work_permit: 'Work Permit',
  study_permit: 'Study Permit', visitor: 'Visitor',
  yes: 'Yes', depends: 'Depends',
  dont_know: "Don't Know",
  full_time: 'Full Time', part_time: 'Part Time', self_employed: 'Self Employed',
  business: 'Business Owner', student: 'Student', not_working: 'Not Working',
  nuclear: 'Nuclear', joint: 'Joint',
  middle: 'Middle Class', upper_middle: 'Upper Middle Class', affluent: 'Affluent', rich: 'Rich',
  traditional: 'Traditional', moderate: 'Moderate', liberal: 'Liberal',
  veg: 'Vegetarian', non_veg: 'Non-Vegetarian', eggetarian: 'Eggetarian', vegan: 'Vegan', jain: 'Jain',
  occasionally: 'Occasionally',
  all: 'Visible to All', on_request: 'On Request Only', blurred: 'Show Blurred',
  email: 'Email', phone: 'Phone', whatsapp: 'WhatsApp',
};

function labelFor(val: string): string { return LABEL[val] || val; }

// ── Calculate completeness ─────────────────────────────────
function calcCompleteness(d: MatrimonyWizardData): number {
  const w = COMPLETENESS_WEIGHTS;
  let earned = 0, total = 0;
  for (const key of Object.keys(w)) {
    total += w[key];
    if (key === 'photo') continue; // photos handled separately
    if (key === 'preferences') {
      if (d.pref_age_min && d.pref_age_max) earned += w[key];
      continue;
    }
    if (key === 'contact') {
      if (d.contact_phone || d.contact_email) earned += w[key];
      continue;
    }
    const val = (d as unknown as Record<string, unknown>)[key];
    if (val !== undefined && val !== '' && val !== 0 && val !== null) {
      if (Array.isArray(val) ? val.length > 0 : true) earned += w[key];
    }
  }
  return Math.round((earned / total) * 100);
}

// ═══════════════════════════════════════════════════════════
// MAIN WIZARD COMPONENT
// ═══════════════════════════════════════════════════════════
export default function MatrimonyCreatePage() {
  const router = useRouter();
  const { currentUserId, isAuthenticated } = useApp();
  const supabase = createClient();

  const [step, setStep] = useState(0);
  const [data, setData] = useState<MatrimonyWizardData>({ ...DEFAULT_DATA });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [draftSavedMsg, setDraftSavedMsg] = useState(false);
  const [astrologyOpen, setAstrologyOpen] = useState(false);
  const [animDir, setAnimDir] = useState<'right' | 'left'>('right');

  const completeness = useMemo(() => calcCompleteness(data), [data]);

  // Load existing profile on mount
  useEffect(() => {
    async function loadExisting() {
      if (!currentUserId) return;
      try {
        const { data: profile } = await supabase
          .from('matrimony_profiles')
          .select('*')
          .eq('user_id', currentUserId)
          .single();
        
        if (profile) {
          const [
            { data: prefs },
            { data: contact },
          ] = await Promise.all([
            supabase.from('matrimony_preferences').select('*').eq('profile_id', profile.id).maybeSingle(),
            supabase.from('matrimony_contacts').select('*').eq('profile_id', profile.id).maybeSingle(),
          ]);

          const loadedData: MatrimonyWizardData = {
            ...DEFAULT_DATA,
            created_by: profile.created_by || 'self',
            full_name: profile.full_name || '',
            display_pref: profile.display_pref || 'full_name',
            gender: profile.gender || 'male',
            dob: profile.dob || '',
            height_cm: profile.height_cm || 0,
            weight_kg: profile.weight_kg ?? undefined,
            body_type: profile.body_type ?? undefined,
            marital_status: profile.marital_status || 'never_married',
            have_children: profile.have_children || 'no',
            physical_status: profile.physical_status ?? undefined,
            religion: profile.religion || '',
            denomination: profile.denomination ?? undefined,
            community: profile.community ?? undefined,
            sub_caste: profile.sub_caste ?? undefined,
            gothra: profile.gothra ?? undefined,
            mother_tongue: profile.mother_tongue || '',
            languages: profile.languages || [],
            time_of_birth: profile.time_of_birth ?? undefined,
            place_of_birth: profile.place_of_birth ?? undefined,
            rashi: profile.rashi ?? undefined,
            nakshatra: profile.nakshatra ?? undefined,
            manglik: profile.manglik ?? undefined,
            country: profile.country || '',
            province: profile.province || '',
            city: profile.city || '',
            residency_status: profile.residency_status || 'citizen',
            open_to_relocate: profile.open_to_relocate || 'depends',
            qualification: profile.qualification || '',
            field_of_study: profile.field_of_study ?? undefined,
            institution: profile.institution ?? undefined,
            occupation: profile.occupation || '',
            employer: profile.employer ?? undefined,
            industry: profile.industry || '',
            employment_type: profile.employment_type || 'full_time',
            work_location: profile.work_location ?? undefined,
            income_range: profile.income_range || '',
            family_type: profile.family_type ?? undefined,
            family_status: profile.family_status ?? undefined,
            family_values: profile.family_values ?? undefined,
            father_occupation: profile.father_occupation ?? undefined,
            mother_occupation: profile.mother_occupation ?? undefined,
            siblings_count: profile.siblings_count ?? undefined,
            siblings_married: profile.siblings_married ?? undefined,
            native_place: profile.native_place ?? undefined,
            family_about: profile.family_about ?? undefined,
            diet: profile.diet || 'veg',
            smoking: profile.smoking || 'no',
            drinking: profile.drinking || 'no',
            hobbies: profile.hobbies || [],
            about_me: profile.about_me || '',
            photo_visibility: profile.photo_visibility || 'all',
            
            pref_age_min: prefs?.age_min ?? 21,
            pref_age_max: prefs?.age_max ?? 35,
            pref_height_min_cm: prefs?.height_min_cm ?? undefined,
            pref_height_max_cm: prefs?.height_max_cm ?? undefined,
            pref_marital_status: prefs?.marital_status || [],
            pref_religion: prefs?.religion || [],
            pref_denomination: prefs?.denomination || [],
            pref_community: prefs?.community || [],
            pref_mother_tongue: prefs?.mother_tongue || [],
            pref_country: prefs?.country ?? undefined,
            pref_province: prefs?.province ?? undefined,
            pref_city: prefs?.city ?? undefined,
            pref_residency_status: prefs?.residency_status || [],
            pref_education: prefs?.education || [],
            pref_profession: prefs?.profession || [],
            pref_income_range: prefs?.income_range ?? undefined,
            pref_diet: prefs?.diet || [],
            pref_smoking: prefs?.smoking ?? undefined,
            pref_drinking: prefs?.drinking ?? undefined,
            pref_manglik: prefs?.manglik_pref ?? undefined,
            pref_other_notes: prefs?.other_notes ?? undefined,

            contact_phone: contact?.phone ?? undefined,
            contact_alt_phone: contact?.alt_phone ?? undefined,
            contact_email: contact?.email ?? undefined,
            contact_preferred_method: contact?.preferred_method ?? 'email',
            contact_best_time: contact?.best_time ?? undefined,
            terms_accepted: true,
            age_confirmed: true,
          };
          setData(loadedData);
        }
      } catch (err) {
        console.error('Error loading existing profile data:', err);
      }
    }
    loadExisting();
  }, [currentUserId, supabase]);

  // ── Field updater ──────────────────────────────────────
  const set = useCallback(<K extends keyof MatrimonyWizardData>(field: K, value: MatrimonyWizardData[K]) => {
    setData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
  }, []);

  // ── Multi-select toggle helper ─────────────────────────
  const toggleMulti = useCallback((field: keyof MatrimonyWizardData, value: string) => {
    setData(prev => {
      const arr = (prev[field] as string[]) || [];
      return { ...prev, [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  }, []);

  // ── Validation ─────────────────────────────────────────
  const validateStep = useCallback((stepIdx: number): boolean => {
    let schema;
    if (stepIdx === 6) {
      // Step 7 validates about + contact + consent
      schema = aboutSchema.merge(contactSchema).merge(consentSchema);
    } else {
      schema = STEP_SCHEMAS[stepIdx];
    }
    const stepFields = getStepFields(stepIdx);
    const subset: Record<string, unknown> = {};
    for (const f of stepFields) subset[f] = (data as unknown as Record<string, unknown>)[f];
    const result = schema.safeParse(subset);
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.');
        if (!newErrors[key]) newErrors[key] = issue.message;
      }
      setErrors(newErrors);
      return false;
    }
    setErrors({});
    return true;
  }, [data]);

  // ── Step navigation ────────────────────────────────────
  const goNext = useCallback(() => {
    if (!validateStep(step)) return;
    setAnimDir('right');
    setStep(s => Math.min(s + 1, 7));
  }, [step, validateStep]);

  const goBack = useCallback(() => {
    setErrors({});
    setAnimDir('left');
    setStep(s => Math.max(s - 1, 0));
  }, []);

  // ── Save Draft ─────────────────────────────────────────
  const saveDraft = useCallback(async () => {
    setSaving(true);
    try {
      const profilePayload = buildProfilePayload(data, currentUserId, 'draft', completeness);
      const { error } = await supabase.from('matrimony_profiles').upsert(profilePayload, { onConflict: 'user_id' });
      if (error) throw error;
      setDraftSavedMsg(true);
      setTimeout(() => setDraftSavedMsg(false), 3000);
    } catch (err) {
      console.error('Draft save error:', err);
      alert('Failed to save draft. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [data, currentUserId, completeness, supabase]);

  // ── Final Submit ───────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    // Validate step 7 (about + contact + consent)
    if (!validateStep(6)) return;
    // Validate step 8 (preferences)
    if (!validateStep(7)) return;
    // Also validate consent explicitly
    if (!data.terms_accepted || !data.age_confirmed) {
      setErrors({ terms_accepted: 'You must accept the terms', age_confirmed: 'You must confirm your age' });
      setStep(6);
      return;
    }

    setSubmitting(true);
    try {
      const profilePayload = buildProfilePayload(data, currentUserId, 'pending', completeness);
      const { data: profile, error: profileErr } = await supabase
        .from('matrimony_profiles').upsert(profilePayload, { onConflict: 'user_id' }).select('id').single();
      if (profileErr) throw profileErr;

      const profileId = profile.id;

      // Save preferences
      const prefPayload = buildPreferencesPayload(data, profileId);
      await supabase.from('matrimony_preferences').upsert(prefPayload, { onConflict: 'profile_id' });

      // Save contacts
      const contactPayload = buildContactPayload(data, profileId);
      await supabase.from('matrimony_contacts').upsert(contactPayload, { onConflict: 'profile_id' });

      setSubmitted(true);
    } catch (err) {
      console.error('Submit error:', err);
      alert('Failed to submit profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [data, currentUserId, completeness, supabase, validateStep]);

  // ── Success Screen ─────────────────────────────────────
  if (submitted) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }} className="animate-fade-in-up">
        <div style={{
          width: 120, height: 120, borderRadius: '50%', margin: '0 auto 32px',
          background: 'linear-gradient(135deg, #00A86B, #34d399)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 20px 60px rgba(0,168,107,0.3)',
          animation: 'float 3s ease-in-out infinite',
        }}>
          <CheckCircle2 size={56} color="white" />
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', fontWeight: 800, marginBottom: 12 }}>
          Profile Under Review
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-lg)', lineHeight: 1.7, maxWidth: 500, margin: '0 auto 8px' }}>
          Thank you for creating your matrimony profile! Our team will review your details and approve your profile within <strong>24–48 hours</strong>.
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: 40 }}>
          You&apos;ll receive a notification once your profile is live.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-lg" onClick={() => router.push('/portal/member/dashboard')}>
            Go to Dashboard
          </button>
          <button className="btn btn-outline btn-lg" onClick={() => router.push('/portal/member/matrimony')}>
            View Matrimony Home
          </button>
        </div>
        <div style={{
          marginTop: 48, padding: 24, borderRadius: 'var(--radius-xl)',
          background: 'rgba(0,103,165,0.04)', border: '1px solid var(--border-color)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 8 }}>
            <Shield size={18} color="var(--primary-600)" />
            <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Your Privacy is Protected</span>
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Your contact details are never shared publicly. Profile introductions happen only with mutual consent through our secure admin-mediated system.
          </p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '0 16px 60px' }} className="animate-fade-in">
      {/* ──── Header ──── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, var(--primary-600), var(--accent-500))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(0,103,165,0.25)',
          }}>
            <Sparkles size={24} color="white" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 800, lineHeight: 1.2 }}>
              Create Your Profile
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
              Step {step + 1} of {WIZARD_STEPS.length} &middot; {completeness}% complete
            </p>
          </div>
        </div>
      </div>

      {/* ──── Progress Bar ──── */}
      <div style={{ marginBottom: 32 }}>
        {/* Step indicators */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
          {WIZARD_STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => { if (i < step) { setErrors({}); setAnimDir('left'); setStep(i); } }}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                border: 'none', background: 'none', cursor: i < step ? 'pointer' : 'default',
                opacity: i <= step ? 1 : 0.4,
                transition: 'opacity 0.3s ease',
              }}
              disabled={i > step}
              title={s.label}
            >
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: i < step
                  ? 'linear-gradient(135deg, var(--success-500), var(--success-400))'
                  : i === step
                    ? 'linear-gradient(135deg, var(--primary-600), var(--primary-500))'
                    : 'var(--bg-glass)',
                color: i <= step ? 'white' : 'var(--text-muted)',
                border: i > step ? '1.5px solid var(--border-color)' : 'none',
                fontSize: 'var(--text-xs)', fontWeight: 700,
                transition: 'all 0.3s ease',
                boxShadow: i === step ? '0 4px 16px rgba(0,103,165,0.35)' : 'none',
              }}>
                {i < step ? <CheckCircle2 size={18} /> : STEP_ICONS[s.icon]}
              </div>
              <span style={{
                fontSize: '10px', fontWeight: 600, color: i === step ? 'var(--primary-600)' : 'var(--text-muted)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 80,
              }}>
                {s.label}
              </span>
            </button>
          ))}
        </div>
        {/* Gradient progress bar */}
        <div style={{
          height: 4, borderRadius: 'var(--radius-full)', background: 'var(--gray-100)',
          overflow: 'hidden', position: 'relative',
        }}>
          <div style={{
            height: '100%', borderRadius: 'var(--radius-full)',
            background: 'linear-gradient(90deg, var(--primary-600), var(--accent-500), var(--success-400))',
            width: `${((step + 1) / WIZARD_STEPS.length) * 100}%`,
            transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 3s linear infinite',
          }} />
        </div>
      </div>

      {/* ──── Step Card ──── */}
      <div
        key={step}
        className={animDir === 'right' ? 'animate-fade-in-up' : 'animate-fade-in'}
        style={{
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-xl)',
          padding: 'clamp(24px, 4vw, 40px)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.06), 0 0 0 1px rgba(255,255,255,0.5) inset',
          minHeight: 400,
        }}
      >
        {/* Step header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, var(--primary-600), var(--primary-400))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
            boxShadow: '0 4px 12px rgba(0,103,165,0.25)',
          }}>
            {STEP_ICONS[WIZARD_STEPS[step].icon]}
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700 }}>
              {WIZARD_STEPS[step].label}
            </h2>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              {stepDescription(step)}
            </p>
          </div>
        </div>

        {/* Step content */}
        {step === 0 && <StepPersonal data={data} set={set} errors={errors} />}
        {step === 1 && <StepReligion data={data} set={set} toggleMulti={toggleMulti} errors={errors} />}
        {step === 2 && <StepAstrology data={data} set={set} errors={errors} open={astrologyOpen} setOpen={setAstrologyOpen} />}
        {step === 3 && <StepLocation data={data} set={set} errors={errors} />}
        {step === 4 && <StepCareer data={data} set={set} errors={errors} />}
        {step === 5 && <StepFamily data={data} set={set} toggleMulti={toggleMulti} errors={errors} />}
        {step === 6 && <StepAbout data={data} set={set} errors={errors} />}
        {step === 7 && <StepPreferences data={data} set={set} toggleMulti={toggleMulti} errors={errors} />}
      </div>

      {/* ──── Navigation Footer ──── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 24, gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', gap: 12 }}>
          {step > 0 && (
            <button className="btn btn-outline" onClick={goBack}>
              <ChevronLeft size={16} /> Back
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {draftSavedMsg && (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--success-500)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 size={14} /> Draft saved!
            </span>
          )}
          <button className="btn btn-ghost" onClick={saveDraft} disabled={saving} style={{ fontSize: 'var(--text-sm)' }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Draft
          </button>
          {step < 7 ? (
            <button className="btn btn-primary" onClick={goNext}>
              Continue <ChevronRight size={16} />
            </button>
          ) : (
            <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={submitting}
              style={{ background: 'linear-gradient(135deg, var(--success-600), var(--success-500))' }}>
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
              Submit Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SHARED FORM COMPONENTS
// ═══════════════════════════════════════════════════════════
interface FieldProps {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  span?: 1 | 2;
}
function Field({ label, error, required, hint, children, span }: FieldProps) {
  return (
    <div className="input-group" style={{ gridColumn: span === 2 ? '1 / -1' : undefined }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}
        {required && <span style={{ color: 'var(--error-500)', fontWeight: 700 }}>*</span>}
      </label>
      {children}
      {hint && !error && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{hint}</span>}
      {error && (
        <span style={{ fontSize: '12px', color: 'var(--error-500)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
          <AlertCircle size={12} /> {error}
        </span>
      )}
    </div>
  );
}

function FormGrid({ children, cols = 2 }: { children: React.ReactNode; cols?: 2 | 3 }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fit, minmax(${cols === 3 ? '200px' : '260px'}, 1fr))`,
      gap: 20,
    }}>
      {children}
    </div>
  );
}

interface MultiSelectProps {
  options: readonly string[];
  selected: string[];
  onToggle: (v: string) => void;
  max?: number;
}
function MultiSelectTags({ options, selected, onToggle, max }: MultiSelectProps) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(opt => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => {
              if (!active && max && selected.length >= max) return;
              onToggle(opt);
            }}
            style={{
              padding: '6px 14px', borderRadius: 'var(--radius-full)',
              fontSize: 'var(--text-xs)', fontWeight: 600, cursor: 'pointer',
              border: active ? '1.5px solid var(--primary-500)' : '1.5px solid var(--border-color)',
              background: active ? 'rgba(0,103,165,0.1)' : 'var(--bg-glass)',
              color: active ? 'var(--primary-600)' : 'var(--text-secondary)',
              transition: 'all 0.2s ease',
            }}
          >
            {active && <span style={{ marginRight: 4 }}>✓</span>}
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// STEP 1: PERSONAL DETAILS
// ═══════════════════════════════════════════════════════════
interface StepProps {
  data: MatrimonyWizardData;
  set: <K extends keyof MatrimonyWizardData>(field: K, value: MatrimonyWizardData[K]) => void;
  errors: Record<string, string>;
}

interface StepWithMultiProps extends StepProps {
  toggleMulti: (field: keyof MatrimonyWizardData, value: string) => void;
}

function StepPersonal({ data, set, errors }: StepProps) {
  return (
    <FormGrid>
      <Field label="Full Name" required error={errors.full_name}>
        <input className="input" value={data.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Enter your full name" />
      </Field>
      <Field label="Display Preference" required error={errors.display_pref} hint="How your name appears to others">
        <select className="input" value={data.display_pref} onChange={e => set('display_pref', e.target.value as MatrimonyWizardData['display_pref'])}>
          {['full_name', 'first_name', 'initials'].map(v => <option key={v} value={v}>{labelFor(v)}</option>)}
        </select>
      </Field>
      <Field label="Gender" required error={errors.gender}>
        <select className="input" value={data.gender} onChange={e => set('gender', e.target.value as MatrimonyWizardData['gender'])}>
          {['male', 'female', 'other'].map(v => <option key={v} value={v}>{labelFor(v)}</option>)}
        </select>
      </Field>
      <Field label="Date of Birth" required error={errors.dob}>
        <input className="input" type="date" value={data.dob} onChange={e => set('dob', e.target.value)}
          max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} />
      </Field>
      <Field label="Height" required error={errors.height_cm}>
        <select className="input" value={data.height_cm || ''} onChange={e => set('height_cm', Number(e.target.value))}>
          <option value="">Select height</option>
          {HEIGHT_OPTIONS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
        </select>
      </Field>
      <Field label="Weight (kg)" error={errors.weight_kg} hint="Optional">
        <input className="input" type="number" value={data.weight_kg ?? ''} onChange={e => set('weight_kg', e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g. 65" />
      </Field>
      <Field label="Body Type" error={errors.body_type} hint="Optional">
        <select className="input" value={data.body_type ?? ''} onChange={e => set('body_type', e.target.value || undefined)}>
          <option value="">Select (optional)</option>
          {BODY_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </Field>
      <Field label="Marital Status" required error={errors.marital_status}>
        <select className="input" value={data.marital_status} onChange={e => set('marital_status', e.target.value as MatrimonyWizardData['marital_status'])}>
          {['never_married', 'divorced', 'widowed', 'awaiting_divorce', 'separated'].map(v => <option key={v} value={v}>{labelFor(v)}</option>)}
        </select>
      </Field>
      <Field label="Have Children?" required error={errors.have_children}>
        <select className="input" value={data.have_children} onChange={e => set('have_children', e.target.value as MatrimonyWizardData['have_children'])}>
          {['no', 'yes_living_together', 'yes_not_living_together'].map(v => <option key={v} value={v}>{labelFor(v)}</option>)}
        </select>
      </Field>
      <Field label="Physical Status" error={errors.physical_status} hint="Optional">
        <select className="input" value={data.physical_status ?? ''} onChange={e => set('physical_status', (e.target.value || undefined) as MatrimonyWizardData['physical_status'])}>
          <option value="">Normal (default)</option>
          {['normal', 'differently_abled'].map(v => <option key={v} value={v}>{labelFor(v)}</option>)}
        </select>
      </Field>
      <Field label="Profile Created By" required error={errors.created_by}>
        <select className="input" value={data.created_by} onChange={e => set('created_by', e.target.value as MatrimonyWizardData['created_by'])}>
          {['self', 'parent', 'sibling', 'relative', 'friend', 'guardian'].map(v => <option key={v} value={v}>{labelFor(v)}</option>)}
        </select>
      </Field>
    </FormGrid>
  );
}

// ═══════════════════════════════════════════════════════════
// STEP 2: RELIGION & COMMUNITY
// ═══════════════════════════════════════════════════════════
function StepReligion({ data, set, toggleMulti, errors }: StepWithMultiProps) {
  const denomOptions = data.religion ? DENOMINATIONS[data.religion] : null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <FormGrid>
        <Field label="Religion" required error={errors.religion}>
          <select className="input" value={data.religion} onChange={e => { set('religion', e.target.value); set('denomination', undefined); }}>
            <option value="">Select religion</option>
            {RELIGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        {denomOptions && (
          <Field label="Denomination" error={errors.denomination}>
            <select className="input" value={data.denomination ?? ''} onChange={e => set('denomination', e.target.value || undefined)}>
              <option value="">Select denomination (optional)</option>
              {denomOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
        )}
        <Field label="Community" error={errors.community}>
          <select className="input" value={data.community ?? ''} onChange={e => set('community', e.target.value || undefined)}>
            <option value="">Select community (optional)</option>
            {COMMUNITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Sub-caste / Clan" error={errors.sub_caste} hint="Optional">
          <input className="input" value={data.sub_caste ?? ''} onChange={e => set('sub_caste', e.target.value || undefined)} placeholder="Enter if applicable" />
        </Field>
        <Field label="Gothra" error={errors.gothra} hint="Optional">
          <input className="input" value={data.gothra ?? ''} onChange={e => set('gothra', e.target.value || undefined)} placeholder="Enter if applicable" />
        </Field>
        <Field label="Mother Tongue" required error={errors.mother_tongue}>
          <select className="input" value={data.mother_tongue} onChange={e => set('mother_tongue', e.target.value)}>
            <option value="">Select mother tongue</option>
            {MOTHER_TONGUES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
      </FormGrid>
      <Field label="Languages Known" required error={errors.languages} hint="Select all that apply" span={2}>
        <MultiSelectTags options={LANGUAGES} selected={data.languages} onToggle={v => toggleMulti('languages', v)} />
      </Field>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// STEP 3: ASTROLOGY (collapsible)
// ═══════════════════════════════════════════════════════════
function StepAstrology({ data, set, errors, open, setOpen }: StepProps & { open: boolean; setOpen: (v: boolean) => void }) {
  return (
    <div>
      <div style={{
        padding: '16px 20px', borderRadius: 'var(--radius-lg)',
        background: 'rgba(255,191,0,0.06)', border: '1px solid rgba(255,191,0,0.15)',
        marginBottom: 20, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Star size={16} color="var(--accent-600)" />
        This section is entirely optional. Fill in details if astrology is important to you or your family.
      </div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '14px 20px', borderRadius: 'var(--radius-lg)',
          border: '1.5px solid var(--border-color)', background: 'var(--bg-card)',
          fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)',
          cursor: 'pointer', transition: 'all 0.2s ease',
        }}
      >
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        {open ? 'Hide Astrology Details' : 'Add Astrology Details'}
      </button>
      {open && (
        <div style={{ marginTop: 20 }} className="animate-fade-in-up">
          <FormGrid>
            <Field label="Time of Birth" error={errors.time_of_birth}>
              <input className="input" type="time" value={data.time_of_birth ?? ''} onChange={e => set('time_of_birth', e.target.value || undefined)} />
            </Field>
            <Field label="Place of Birth" error={errors.place_of_birth}>
              <input className="input" value={data.place_of_birth ?? ''} onChange={e => set('place_of_birth', e.target.value || undefined)} placeholder="City / town of birth" />
            </Field>
            <Field label="Rashi (Moon Sign)" error={errors.rashi}>
              <select className="input" value={data.rashi ?? ''} onChange={e => set('rashi', e.target.value || undefined)}>
                <option value="">Select rashi</option>
                {RASHIS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Nakshatra (Birth Star)" error={errors.nakshatra}>
              <select className="input" value={data.nakshatra ?? ''} onChange={e => set('nakshatra', e.target.value || undefined)}>
                <option value="">Select nakshatra</option>
                {NAKSHATRAS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
            <Field label="Manglik Status" error={errors.manglik}>
              <select className="input" value={data.manglik ?? ''} onChange={e => set('manglik', (e.target.value || undefined) as MatrimonyWizardData['manglik'])}>
                <option value="">Select</option>
                {['yes', 'no', 'dont_know'].map(v => <option key={v} value={v}>{labelFor(v)}</option>)}
              </select>
            </Field>
          </FormGrid>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// STEP 4: LOCATION & RESIDENCY
// ═══════════════════════════════════════════════════════════
function StepLocation({ data, set, errors }: StepProps) {
  const provinceOptions = data.country === 'Canada' ? CANADIAN_PROVINCES
    : data.country === 'India' ? INDIAN_STATES : null;

  return (
    <FormGrid>
      <Field label="Country" required error={errors.country}>
        <select className="input" value={data.country} onChange={e => { set('country', e.target.value); set('province', ''); }}>
          <option value="">Select country</option>
          {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Province / State" required error={errors.province}>
        {provinceOptions ? (
          <select className="input" value={data.province} onChange={e => set('province', e.target.value)}>
            <option value="">Select province/state</option>
            {provinceOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        ) : (
          <input className="input" value={data.province} onChange={e => set('province', e.target.value)} placeholder="Enter province/state" />
        )}
      </Field>
      <Field label="City" required error={errors.city}>
        <input className="input" value={data.city} onChange={e => set('city', e.target.value)} placeholder="Enter city" />
      </Field>
      <Field label="Residency Status" required error={errors.residency_status}>
        <select className="input" value={data.residency_status} onChange={e => set('residency_status', e.target.value as MatrimonyWizardData['residency_status'])}>
          {['citizen', 'pr', 'work_permit', 'study_permit', 'visitor', 'other'].map(v => <option key={v} value={v}>{labelFor(v)}</option>)}
        </select>
      </Field>
      <Field label="Open to Relocate?" required error={errors.open_to_relocate}>
        <select className="input" value={data.open_to_relocate} onChange={e => set('open_to_relocate', e.target.value as MatrimonyWizardData['open_to_relocate'])}>
          {['yes', 'no', 'depends'].map(v => <option key={v} value={v}>{labelFor(v)}</option>)}
        </select>
      </Field>
    </FormGrid>
  );
}

// ═══════════════════════════════════════════════════════════
// STEP 5: EDUCATION & CAREER
// ═══════════════════════════════════════════════════════════
function StepCareer({ data, set, errors }: StepProps) {
  return (
    <FormGrid>
      <Field label="Highest Qualification" required error={errors.qualification}>
        <select className="input" value={data.qualification} onChange={e => set('qualification', e.target.value)}>
          <option value="">Select qualification</option>
          {QUALIFICATIONS.map(q => <option key={q} value={q}>{q}</option>)}
        </select>
      </Field>
      <Field label="Field of Study" error={errors.field_of_study}>
        <select className="input" value={data.field_of_study ?? ''} onChange={e => set('field_of_study', e.target.value || undefined)}>
          <option value="">Select field (optional)</option>
          {FIELDS_OF_STUDY.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </Field>
      <Field label="Institution / University" error={errors.institution} hint="Optional">
        <input className="input" value={data.institution ?? ''} onChange={e => set('institution', e.target.value || undefined)} placeholder="e.g. University of Toronto" />
      </Field>
      <Field label="Occupation" required error={errors.occupation}>
        <select className="input" value={data.occupation} onChange={e => set('occupation', e.target.value)}>
          <option value="">Select occupation</option>
          {OCCUPATIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </Field>
      <Field label="Employer" error={errors.employer} hint="Optional">
        <input className="input" value={data.employer ?? ''} onChange={e => set('employer', e.target.value || undefined)} placeholder="Company name" />
      </Field>
      <Field label="Industry" required error={errors.industry}>
        <select className="input" value={data.industry} onChange={e => set('industry', e.target.value)}>
          <option value="">Select industry</option>
          {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
      </Field>
      <Field label="Employment Type" required error={errors.employment_type}>
        <select className="input" value={data.employment_type} onChange={e => set('employment_type', e.target.value as MatrimonyWizardData['employment_type'])}>
          {['full_time', 'part_time', 'self_employed', 'business', 'student', 'not_working'].map(v => <option key={v} value={v}>{labelFor(v)}</option>)}
        </select>
      </Field>
      <Field label="Work Location" error={errors.work_location} hint="Optional">
        <input className="input" value={data.work_location ?? ''} onChange={e => set('work_location', e.target.value || undefined)} placeholder="City or Remote" />
      </Field>
      <Field label="Annual Income" required error={errors.income_range}>
        <select className="input" value={data.income_range} onChange={e => set('income_range', e.target.value)}>
          <option value="">Select income range</option>
          {INCOME_RANGES.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
      </Field>
    </FormGrid>
  );
}

// ═══════════════════════════════════════════════════════════
// STEP 6: FAMILY & LIFESTYLE
// ═══════════════════════════════════════════════════════════
function StepFamily({ data, set, toggleMulti, errors }: StepWithMultiProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Family section */}
      <div>
        <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--primary-600)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
          Family Background
        </h3>
        <FormGrid>
          <Field label="Family Type" error={errors.family_type}>
            <select className="input" value={data.family_type ?? ''} onChange={e => set('family_type', (e.target.value || undefined) as MatrimonyWizardData['family_type'])}>
              <option value="">Select (optional)</option>
              {['nuclear', 'joint'].map(v => <option key={v} value={v}>{labelFor(v)}</option>)}
            </select>
          </Field>
          <Field label="Family Status" error={errors.family_status}>
            <select className="input" value={data.family_status ?? ''} onChange={e => set('family_status', (e.target.value || undefined) as MatrimonyWizardData['family_status'])}>
              <option value="">Select (optional)</option>
              {['middle', 'upper_middle', 'affluent', 'rich'].map(v => <option key={v} value={v}>{labelFor(v)}</option>)}
            </select>
          </Field>
          <Field label="Family Values" error={errors.family_values}>
            <select className="input" value={data.family_values ?? ''} onChange={e => set('family_values', (e.target.value || undefined) as MatrimonyWizardData['family_values'])}>
              <option value="">Select (optional)</option>
              {['traditional', 'moderate', 'liberal'].map(v => <option key={v} value={v}>{labelFor(v)}</option>)}
            </select>
          </Field>
          <Field label="Father's Occupation" error={errors.father_occupation}>
            <input className="input" value={data.father_occupation ?? ''} onChange={e => set('father_occupation', e.target.value || undefined)} placeholder="Optional" />
          </Field>
          <Field label="Mother's Occupation" error={errors.mother_occupation}>
            <input className="input" value={data.mother_occupation ?? ''} onChange={e => set('mother_occupation', e.target.value || undefined)} placeholder="Optional" />
          </Field>
          <Field label="Number of Siblings" error={errors.siblings_count}>
            <input className="input" type="number" min={0} max={20} value={data.siblings_count ?? ''} onChange={e => set('siblings_count', e.target.value ? Number(e.target.value) : undefined)} />
          </Field>
          <Field label="Siblings Married" error={errors.siblings_married}>
            <input className="input" type="number" min={0} max={20} value={data.siblings_married ?? ''} onChange={e => set('siblings_married', e.target.value ? Number(e.target.value) : undefined)} />
          </Field>
          <Field label="Native Place" error={errors.native_place}>
            <input className="input" value={data.native_place ?? ''} onChange={e => set('native_place', e.target.value || undefined)} placeholder="Ancestral hometown" />
          </Field>
        </FormGrid>
        <div style={{ marginTop: 16 }}>
          <Field label="About Family" error={errors.family_about} hint="Brief description of your family (optional)" span={2}>
            <textarea className="input" rows={3} value={data.family_about ?? ''} onChange={e => set('family_about', e.target.value || undefined)}
              placeholder="Tell us about your family values, background, etc." maxLength={1000} />
          </Field>
        </div>
      </div>

      {/* Lifestyle section */}
      <div>
        <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--primary-600)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
          Lifestyle
        </h3>
        <FormGrid cols={3}>
          <Field label="Diet" required error={errors.diet}>
            <select className="input" value={data.diet} onChange={e => set('diet', e.target.value as MatrimonyWizardData['diet'])}>
              {['veg', 'non_veg', 'eggetarian', 'vegan', 'jain'].map(v => <option key={v} value={v}>{labelFor(v)}</option>)}
            </select>
          </Field>
          <Field label="Smoking" required error={errors.smoking}>
            <select className="input" value={data.smoking} onChange={e => set('smoking', e.target.value as MatrimonyWizardData['smoking'])}>
              {['no', 'occasionally', 'yes'].map(v => <option key={v} value={v}>{labelFor(v)}</option>)}
            </select>
          </Field>
          <Field label="Drinking" required error={errors.drinking}>
            <select className="input" value={data.drinking} onChange={e => set('drinking', e.target.value as MatrimonyWizardData['drinking'])}>
              {['no', 'occasionally', 'yes'].map(v => <option key={v} value={v}>{labelFor(v)}</option>)}
            </select>
          </Field>
        </FormGrid>
      </div>

      <Field label="Hobbies & Interests" error={errors.hobbies} hint="Select your hobbies" span={2}>
        <MultiSelectTags options={HOBBIES} selected={data.hobbies} onToggle={v => toggleMulti('hobbies', v)} />
      </Field>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// STEP 7: ABOUT & MEDIA + CONTACTS + CONSENT
// ═══════════════════════════════════════════════════════════
function StepAbout({ data, set, errors }: StepProps) {
  const aboutLen = data.about_me.length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* About Me */}
      <div>
        <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--primary-600)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
          About You
        </h3>
        <Field label="About Me" required error={errors.about_me} span={2}>
          <textarea
            className="input"
            rows={5}
            value={data.about_me}
            onChange={e => set('about_me', e.target.value)}
            placeholder="Write about yourself — your personality, interests, what you're looking for in a partner, your values and aspirations..."
            maxLength={2000}
            style={{ minHeight: 140 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: aboutLen < 50 ? 'var(--error-500)' : 'var(--text-muted)' }}>
            <span>{aboutLen < 50 ? `${50 - aboutLen} more characters needed` : '✓ Good length'}</span>
            <span>{aboutLen}/2000</span>
          </div>
        </Field>
        <div style={{ marginTop: 16 }}>
          <Field label="Photo Visibility" required error={errors.photo_visibility} hint="Control who sees your photos">
            <select className="input" value={data.photo_visibility} onChange={e => set('photo_visibility', e.target.value as MatrimonyWizardData['photo_visibility'])}>
              {['all', 'on_request', 'blurred'].map(v => <option key={v} value={v}>{labelFor(v)}</option>)}
            </select>
          </Field>
        </div>
      </div>

      {/* Contact */}
      <div>
        <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--primary-600)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
          Contact Information
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Shield size={12} /> Your contact details are private and never displayed publicly.
        </p>
        <FormGrid>
          <Field label="Phone Number" error={errors.contact_phone}>
            <input className="input" value={data.contact_phone ?? ''} onChange={e => set('contact_phone', e.target.value || undefined)} placeholder="+1-XXX-XXX-XXXX" />
          </Field>
          <Field label="Email Address" error={errors.contact_email}>
            <input className="input" type="email" value={data.contact_email ?? ''} onChange={e => set('contact_email', e.target.value || undefined)} placeholder="your@email.com" />
          </Field>
          <Field label="Preferred Contact Method" required error={errors.contact_preferred_method}>
            <select className="input" value={data.contact_preferred_method} onChange={e => set('contact_preferred_method', e.target.value as MatrimonyWizardData['contact_preferred_method'])}>
              {['email', 'phone', 'whatsapp'].map(v => <option key={v} value={v}>{labelFor(v)}</option>)}
            </select>
          </Field>
          <Field label="Best Time to Call" error={errors.contact_best_time} hint="Optional">
            <input className="input" value={data.contact_best_time ?? ''} onChange={e => set('contact_best_time', e.target.value || undefined)} placeholder="e.g. Evenings after 6 PM" />
          </Field>
        </FormGrid>
      </div>

      {/* Consent */}
      <div style={{
        padding: 20, borderRadius: 'var(--radius-lg)',
        background: 'rgba(0,103,165,0.03)', border: '1px solid var(--border-color)',
      }}>
        <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, marginBottom: 16 }}>
          Terms & Confirmation
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={data.terms_accepted}
              onChange={e => set('terms_accepted', e.target.checked)}
              style={{ marginTop: 3, width: 18, height: 18, accentColor: 'var(--primary-600)' }}
            />
            <span>
              I accept the <a href="/terms" style={{ color: 'var(--primary-600)', textDecoration: 'underline' }}>Terms of Service</a> and <a href="/privacy" style={{ color: 'var(--primary-600)', textDecoration: 'underline' }}>Privacy Policy</a> for the Matrimony service. I understand my profile will be reviewed before being made visible.
            </span>
          </label>
          {errors.terms_accepted && <span style={{ fontSize: '12px', color: 'var(--error-500)', marginLeft: 28, fontWeight: 500 }}><AlertCircle size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {errors.terms_accepted}</span>}

          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={data.age_confirmed}
              onChange={e => set('age_confirmed', e.target.checked)}
              style={{ marginTop: 3, width: 18, height: 18, accentColor: 'var(--primary-600)' }}
            />
            <span>I confirm that I am at least 18 years old and all information provided is accurate to the best of my knowledge.</span>
          </label>
          {errors.age_confirmed && <span style={{ fontSize: '12px', color: 'var(--error-500)', marginLeft: 28, fontWeight: 500 }}><AlertCircle size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {errors.age_confirmed}</span>}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// STEP 8: PARTNER PREFERENCES
// ═══════════════════════════════════════════════════════════
function StepPreferences({ data, set, toggleMulti, errors }: StepWithMultiProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Basic preferences */}
      <div>
        <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--primary-600)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
          Basic Preferences
        </h3>
        <FormGrid>
          <Field label="Minimum Age" required error={errors.pref_age_min}>
            <input className="input" type="number" min={18} max={70} value={data.pref_age_min} onChange={e => set('pref_age_min', Number(e.target.value))} />
          </Field>
          <Field label="Maximum Age" required error={errors.pref_age_max}>
            <input className="input" type="number" min={18} max={70} value={data.pref_age_max} onChange={e => set('pref_age_max', Number(e.target.value))} />
          </Field>
          <Field label="Minimum Height" error={errors.pref_height_min_cm}>
            <select className="input" value={data.pref_height_min_cm ?? ''} onChange={e => set('pref_height_min_cm', e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">Any</option>
              {HEIGHT_OPTIONS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
            </select>
          </Field>
          <Field label="Maximum Height" error={errors.pref_height_max_cm}>
            <select className="input" value={data.pref_height_max_cm ?? ''} onChange={e => set('pref_height_max_cm', e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">Any</option>
              {HEIGHT_OPTIONS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
            </select>
          </Field>
        </FormGrid>
      </div>

      {/* Multi-select preferences */}
      <Field label="Preferred Marital Status" error={errors.pref_marital_status} span={2}>
        <MultiSelectTags
          options={['Never Married', 'Divorced', 'Widowed', 'Awaiting Divorce', 'Separated']}
          selected={data.pref_marital_status}
          onToggle={v => toggleMulti('pref_marital_status', v)}
        />
      </Field>

      <Field label="Preferred Religion" error={errors.pref_religion} span={2}>
        <MultiSelectTags options={RELIGIONS} selected={data.pref_religion} onToggle={v => toggleMulti('pref_religion', v)} />
      </Field>

      <Field label="Preferred Community" error={errors.pref_community} span={2}>
        <MultiSelectTags options={COMMUNITIES} selected={data.pref_community} onToggle={v => toggleMulti('pref_community', v)} />
      </Field>

      <Field label="Preferred Mother Tongue" error={errors.pref_mother_tongue} span={2}>
        <MultiSelectTags options={MOTHER_TONGUES} selected={data.pref_mother_tongue} onToggle={v => toggleMulti('pref_mother_tongue', v)} />
      </Field>

      <Field label="Preferred Residency Status" error={errors.pref_residency_status} span={2}>
        <MultiSelectTags
          options={['Citizen', 'Permanent Resident', 'Work Permit', 'Study Permit']}
          selected={data.pref_residency_status}
          onToggle={v => toggleMulti('pref_residency_status', v)}
        />
      </Field>

      <Field label="Preferred Education" error={errors.pref_education} span={2}>
        <MultiSelectTags options={QUALIFICATIONS} selected={data.pref_education} onToggle={v => toggleMulti('pref_education', v)} />
      </Field>

      <Field label="Preferred Diet" error={errors.pref_diet} span={2}>
        <MultiSelectTags
          options={['Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'Vegan', 'Jain']}
          selected={data.pref_diet}
          onToggle={v => toggleMulti('pref_diet', v)}
        />
      </Field>

      <Field label="Other Notes" error={errors.pref_other_notes} hint="Any other expectations you'd like to mention (optional)" span={2}>
        <textarea
          className="input"
          rows={3}
          value={data.pref_other_notes ?? ''}
          onChange={e => set('pref_other_notes', e.target.value || undefined)}
          placeholder="Any other preferences or expectations..."
          maxLength={500}
        />
      </Field>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

function getStepFields(stepIdx: number): string[] {
  switch (stepIdx) {
    case 0: return ['full_name', 'display_pref', 'gender', 'dob', 'height_cm', 'weight_kg', 'body_type', 'marital_status', 'have_children', 'physical_status', 'created_by'];
    case 1: return ['religion', 'denomination', 'community', 'sub_caste', 'gothra', 'mother_tongue', 'languages'];
    case 2: return ['time_of_birth', 'place_of_birth', 'rashi', 'nakshatra', 'manglik'];
    case 3: return ['country', 'province', 'city', 'residency_status', 'open_to_relocate'];
    case 4: return ['qualification', 'field_of_study', 'institution', 'occupation', 'employer', 'industry', 'employment_type', 'work_location', 'income_range'];
    case 5: return ['family_type', 'family_status', 'family_values', 'father_occupation', 'mother_occupation', 'siblings_count', 'siblings_married', 'native_place', 'family_about', 'diet', 'smoking', 'drinking', 'hobbies'];
    case 6: return ['about_me', 'photo_visibility', 'contact_phone', 'contact_alt_phone', 'contact_email', 'contact_preferred_method', 'contact_best_time', 'terms_accepted', 'age_confirmed'];
    case 7: return ['pref_age_min', 'pref_age_max', 'pref_height_min_cm', 'pref_height_max_cm', 'pref_marital_status', 'pref_religion', 'pref_denomination', 'pref_community', 'pref_mother_tongue', 'pref_country', 'pref_province', 'pref_city', 'pref_residency_status', 'pref_education', 'pref_profession', 'pref_income_range', 'pref_diet', 'pref_smoking', 'pref_drinking', 'pref_manglik', 'pref_other_notes'];
    default: return [];
  }
}

function stepDescription(stepIdx: number): string {
  const descs = [
    'Tell us about yourself — the basics',
    'Your religious and cultural background',
    'Optional astrology details for traditional matching',
    'Where you currently live and your immigration status',
    'Your educational background and professional life',
    'Your family background and lifestyle preferences',
    'Write a compelling bio and set your privacy preferences',
    'Describe what you\'re looking for in a life partner',
  ];
  return descs[stepIdx] || '';
}

function buildProfilePayload(d: MatrimonyWizardData, userId: string, status: 'draft' | 'pending', completeness: number) {
  return {
    user_id: userId,
    status,
    created_by: d.created_by,
    full_name: d.full_name,
    display_pref: d.display_pref,
    gender: d.gender,
    dob: d.dob || null,
    height_cm: d.height_cm || null,
    weight_kg: d.weight_kg ?? null,
    body_type: d.body_type ?? null,
    marital_status: d.marital_status,
    have_children: d.have_children,
    physical_status: d.physical_status ?? null,
    religion: d.religion,
    denomination: d.denomination ?? null,
    community: d.community ?? null,
    sub_caste: d.sub_caste ?? null,
    gothra: d.gothra ?? null,
    mother_tongue: d.mother_tongue,
    languages: d.languages,
    time_of_birth: d.time_of_birth ?? null,
    place_of_birth: d.place_of_birth ?? null,
    rashi: d.rashi ?? null,
    nakshatra: d.nakshatra ?? null,
    manglik: d.manglik ?? null,
    country: d.country,
    province: d.province,
    city: d.city,
    residency_status: d.residency_status,
    open_to_relocate: d.open_to_relocate,
    qualification: d.qualification,
    field_of_study: d.field_of_study ?? null,
    institution: d.institution ?? null,
    occupation: d.occupation,
    employer: d.employer ?? null,
    industry: d.industry,
    employment_type: d.employment_type,
    work_location: d.work_location ?? null,
    income_range: d.income_range,
    family_type: d.family_type ?? null,
    family_status: d.family_status ?? null,
    family_values: d.family_values ?? null,
    father_occupation: d.father_occupation ?? null,
    mother_occupation: d.mother_occupation ?? null,
    siblings_count: d.siblings_count ?? null,
    siblings_married: d.siblings_married ?? null,
    native_place: d.native_place ?? null,
    family_about: d.family_about ?? null,
    diet: d.diet,
    smoking: d.smoking,
    drinking: d.drinking,
    hobbies: d.hobbies,
    about_me: d.about_me,
    completeness_pct: completeness,
    photo_visibility: d.photo_visibility,
    is_hidden: false,
    is_verified_id: false,
    is_verified_photo: false,
    is_verified_profession: false,
  };
}

function buildPreferencesPayload(d: MatrimonyWizardData, profileId: string) {
  return {
    profile_id: profileId,
    age_min: d.pref_age_min,
    age_max: d.pref_age_max,
    height_min_cm: d.pref_height_min_cm ?? null,
    height_max_cm: d.pref_height_max_cm ?? null,
    marital_status: d.pref_marital_status,
    religion: d.pref_religion,
    denomination: d.pref_denomination,
    community: d.pref_community,
    mother_tongue: d.pref_mother_tongue,
    country: d.pref_country ?? null,
    province: d.pref_province ?? null,
    city: d.pref_city ?? null,
    residency_status: d.pref_residency_status,
    education: d.pref_education,
    profession: d.pref_profession,
    income_range: d.pref_income_range ?? null,
    diet: d.pref_diet,
    smoking: d.pref_smoking ?? null,
    drinking: d.pref_drinking ?? null,
    manglik_pref: d.pref_manglik ?? null,
    other_notes: d.pref_other_notes ?? null,
  };
}

function buildContactPayload(d: MatrimonyWizardData, profileId: string) {
  return {
    profile_id: profileId,
    phone: d.contact_phone ?? null,
    alt_phone: d.contact_alt_phone ?? null,
    email: d.contact_email ?? null,
    preferred_method: d.contact_preferred_method,
    best_time: d.contact_best_time ?? null,
  };
}
