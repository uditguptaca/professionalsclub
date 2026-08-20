'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/app-context';
import { getMyMatrimony, browseProfilesPaged, saveSearch } from '@/app/actions/matrimony';
import type { MatrimonyProfileCard, MatrimonySearchFilters } from '@/types/matrimony';
import {
  RELIGIONS, COMMUNITIES, MOTHER_TONGUES, QUALIFICATIONS, COUNTRIES,
  CANADIAN_PROVINCES, HEIGHT_OPTIONS,
} from '@/lib/matrimony/constants';
import PortalLoading from '@/components/portal/PortalLoading';
import MatrimonyTabs from '@/components/portal/MatrimonyTabs';
import {
  Search, SlidersHorizontal, X, ChevronLeft, ChevronRight, RotateCcw,
  Save, BadgeCheck, Camera, MapPin, Briefcase, Clock, User, Check, AlertCircle,
} from 'lucide-react';

/**
 * Browse, second pass: photo-led profile cards in the feed grammar, and the
 * whole filter set in one bottom sheet instead of a desktop-only sidebar plus a
 * separate mobile drawer. Filters still apply live — the sheet's primary button
 * only dismisses it.
 */

const ITEMS_PER_PAGE = 12;

const MARITAL_OPTIONS = [
  { value: 'never_married', label: 'Never married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
  { value: 'awaiting_divorce', label: 'Awaiting divorce' },
  { value: 'separated', label: 'Separated' },
];
const RESIDENCY_OPTIONS = [
  { value: 'citizen', label: 'Citizen' },
  { value: 'pr', label: 'Permanent resident' },
  { value: 'work_permit', label: 'Work permit' },
  { value: 'study_permit', label: 'Study permit' },
  { value: 'visitor', label: 'Visitor' },
  { value: 'other', label: 'Other' },
];
const DIET_OPTIONS = [
  { value: 'veg', label: 'Vegetarian' },
  { value: 'non_veg', label: 'Non-vegetarian' },
  { value: 'eggetarian', label: 'Eggetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'jain', label: 'Jain' },
];
// "Best Match" is absent on purpose: nothing in the module computes a match
// score, so the option had no ordering behind it.
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'recently_active', label: 'Recently active' },
];

function getAge(dob: string): number {
  const b = new Date(dob);
  const t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
  return age;
}

/**
 * Round to whole inches FIRST, then split. Rounding the remainder instead
 * printed 5'12" for 182cm and 4'12" for 152cm — both common heights.
 */
function cmToFtIn(cm: number): string {
  const totalInches = Math.round(cm / 2.54);
  return `${Math.floor(totalInches / 12)}'${totalInches % 12}"`;
}

function getDisplayName(fullName: string, pref: string): string {
  if (pref === 'full_name') return fullName;
  if (pref === 'first_name') return fullName.split(' ')[0];
  if (pref === 'initials') {
    return fullName.split(' ').map(n => n[0]).join('.').toUpperCase();
  }
  return fullName.split(' ')[0];
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function residencyLabel(status: string): string {
  return RESIDENCY_OPTIONS.find(r => r.value === status)?.label || status;
}

function titleCase(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

const emptyFilters: MatrimonySearchFilters = {
  gender: undefined,
  age_min: undefined,
  age_max: undefined,
  height_min_cm: undefined,
  height_max_cm: undefined,
  marital_status: [],
  religion: [],
  community: [],
  mother_tongue: [],
  country: undefined,
  province: undefined,
  city: undefined,
  residency_status: [],
  education: [],
  diet: [],
  verified_only: false,
  has_photo: false,
  recently_active: false,
  sort_by: 'newest',
};

/* ---------- small shared styles (no new CSS classes) ---------- */

const chipStyle = (on: boolean): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 6,
  minHeight: 44, padding: '0 14px', borderRadius: 999,
  border: on ? '1px solid var(--green-800)' : '1px solid rgba(27,67,50,0.14)',
  background: on ? 'var(--green-800)' : 'var(--bg-primary)',
  color: on ? '#fff' : 'var(--text-secondary)',
  font: 'inherit', fontSize: '0.82rem', fontWeight: 650, cursor: 'pointer',
});

const groupLabelStyle: React.CSSProperties = {
  margin: '0 0 0.3rem 0.2rem',
  fontSize: '0.76rem', fontWeight: 750, color: 'var(--text-secondary)',
};

/** Matches .hf-section-head h2, on the page's real <h1>. */
const pageTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)', fontSize: 'clamp(1.35rem, 4vw, 1.55rem)',
  fontWeight: 800, letterSpacing: '-0.01em', margin: 0,
};

const pagePillStyle = (active: boolean): React.CSSProperties => ({
  display: 'grid', placeItems: 'center', flexShrink: 0,
  width: 44, height: 44, borderRadius: '50%',
  border: active ? 0 : '1px solid rgba(27,67,50,0.08)',
  background: active ? 'var(--green-950)' : 'var(--bg-primary)',
  color: active ? '#fff' : 'var(--text-secondary)',
  font: 'inherit', fontSize: '0.85rem', fontWeight: active ? 800 : 600, cursor: 'pointer',
});

export default function MatrimonyBrowsePage() {
  const { currentUserId } = useApp();

  const [profiles, setProfiles] = useState<MatrimonyProfileCard[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<MatrimonySearchFilters>({ ...emptyFilters });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const [savingSearch, setSavingSearch] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  // Blocked profiles are excluded by matrimony_visible_profiles itself, in both
  // directions, so nothing is filtered client-side.
  useEffect(() => {
    if (!currentUserId) return;
    void getMyMatrimony().then((r) => {
      if (r.ok && r.data.profile) setMyProfileId(r.data.profile.id);
    });
  }, [currentUserId]);

  // Every filter, the sort and the page are applied by the query, so the grid
  // renders exactly what came back.
  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setError('');

    const result = await browseProfilesPaged({
      gender: filters.gender || undefined,
      age_min: filters.age_min || undefined,
      age_max: filters.age_max || undefined,
      height_min_cm: filters.height_min_cm || undefined,
      height_max_cm: filters.height_max_cm || undefined,
      religion: filters.religion?.length ? filters.religion : undefined,
      community: filters.community?.length ? filters.community : undefined,
      city: filters.city || undefined,
      province: filters.province || undefined,
      country: filters.country || undefined,
      residency_status: filters.residency_status?.length ? filters.residency_status : undefined,
      marital_status: filters.marital_status?.length ? filters.marital_status : undefined,
      mother_tongue: filters.mother_tongue?.length ? filters.mother_tongue : undefined,
      education: filters.education?.length ? filters.education : undefined,
      diet: filters.diet?.length ? filters.diet : undefined,
      verified_only: filters.verified_only || undefined,
      has_photo: filters.has_photo || undefined,
      recently_active: filters.recently_active || undefined,
      sort_by: filters.sort_by,
      limit: ITEMS_PER_PAGE,
      offset: (page - 1) * ITEMS_PER_PAGE,
    });

    if (!result.ok) {
      // Without this the grid would show "No profiles found", which reads as an
      // empty member base rather than a failed request.
      setError(result.error);
      setProfiles([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    // A page past the end comes back empty, which would read as "no matches"
    // rather than "that page is gone". Only reachable if the result set shrank
    // between requests, since a filter change already resets to page 1.
    if (result.data.profiles.length === 0 && page > 1) {
      setPage(1);
      return;
    }

    setProfiles(result.data.profiles);
    setTotalCount(result.data.total);
    setLoading(false);
  }, [filters, page]);

  // Debounced so typing in the city or age inputs fires one query, not one
  // per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => { void fetchProfiles(); }, 300);
    return () => clearTimeout(timer);
  }, [fetchProfiles]);

  useEffect(() => {
    if (!savedMsg) return;
    const t = setTimeout(() => setSavedMsg(''), 2600);
    return () => clearTimeout(t);
  }, [savedMsg]);

  // An open sheet locks background scroll and closes on Escape, same as every
  // other sheet in the portal.
  const sheetOpen = drawerOpen || showSaveModal;
  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showSaveModal) setShowSaveModal(false);
      else setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [sheetOpen, showSaveModal]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleFilterChange = (key: keyof MatrimonySearchFilters, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleMultiSelect = (key: keyof MatrimonySearchFilters, value: string) => {
    setFilters(prev => {
      const arr = (prev[key] as string[]) || [];
      const next = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
      return { ...prev, [key]: next };
    });
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({ ...emptyFilters });
    setPage(1);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.gender) count++;
    if (filters.age_min || filters.age_max) count++;
    if (filters.height_min_cm || filters.height_max_cm) count++;
    if (filters.marital_status?.length) count++;
    if (filters.religion?.length) count++;
    if (filters.community?.length) count++;
    if (filters.mother_tongue?.length) count++;
    if (filters.country) count++;
    if (filters.province) count++;
    if (filters.city) count++;
    if (filters.residency_status?.length) count++;
    if (filters.education?.length) count++;
    if (filters.diet?.length) count++;
    if (filters.verified_only) count++;
    if (filters.has_photo) count++;
    if (filters.recently_active) count++;
    return count;
  }, [filters]);

  const handleSaveSearch = async () => {
    if (!myProfileId || !saveSearchName.trim()) return;
    setSavingSearch(true);
    setSaveError('');
    const result = await saveSearch(saveSearchName.trim(), { ...filters }, true);
    if (!result.ok) {
      // Surfaced inline: the old version only reached console.error, so a failed
      // save looked exactly like a successful one.
      setSaveError(result.error);
      setSavingSearch(false);
      return;
    }
    setShowSaveModal(false);
    setSaveSearchName('');
    setSavedMsg('Search saved');
    setSavingSearch(false);
  };

  /** A collapsed multi-select: a filled row that opens into chips. */
  const chipGroup = (
    label: string,
    key: keyof MatrimonySearchFilters,
    options: { value: string; label: string }[],
  ) => {
    const selected = (filters[key] as string[]) || [];
    return (
      <details
        key={key}
        style={{
          background: 'var(--bg-secondary)', borderRadius: '0.85rem', padding: '0.55rem 0.9rem',
        }}
      >
        <summary
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            minHeight: 44, listStyle: 'none', cursor: 'pointer',
            fontSize: '0.9rem', fontWeight: 650,
          }}
        >
          <span>{label}</span>
          <span style={{ fontSize: '0.78rem', fontWeight: 650, color: selected.length ? 'var(--text-accent)' : 'var(--text-muted)' }}>
            {selected.length ? `${selected.length} selected` : 'Any'}
          </span>
        </summary>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0.6rem 0 0.5rem' }}>
          {options.map(opt => {
            const on = selected.includes(opt.value);
            return (
              <button
                key={opt.value} type="button" aria-pressed={on}
                style={chipStyle(on)}
                onClick={() => handleMultiSelect(key, opt.value)}
              >
                {on && <Check size={13} aria-hidden="true" />}
                {opt.label}
              </button>
            );
          })}
        </div>
      </details>
    );
  };

  const toggleRow = (
    label: string,
    icon: React.ReactNode,
    key: 'verified_only' | 'has_photo' | 'recently_active',
  ) => {
    const on = !!filters[key];
    return (
      <div className="pp-row pp-row-static" key={key}>
        <span className="pp-row-icon">{icon}</span>
        <span className="pp-row-body"><strong>{label}</strong></span>
        <button
          type="button"
          className={`pp-toggle ${on ? 'is-on' : ''}`}
          aria-pressed={on}
          aria-label={label}
          onClick={() => handleFilterChange(key, !on)}
        >
          <span className="pp-toggle-dot" aria-hidden="true" />
          {on ? 'On' : 'Off'}
        </button>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.3rem' }}>
      {/* The deck is the front door; this page is its "see everyone" view.
          The wrapper cancels the nav's own bottom margin — this column already
          has a gap. */}
      <div style={{ marginBottom: '-1rem' }}><MatrimonyTabs active="discover" /></div>

      {/* ---- Heading + filter entry ---- */}
      <div className="hf-section-head" style={{ alignItems: 'center' }}>
        <h1 style={pageTitleStyle}>Browse profiles</h1>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0,
            minHeight: 44, padding: '0 16px', borderRadius: 999,
            border: '1px solid rgba(27,67,50,0.08)', background: 'var(--bg-primary)',
            color: 'var(--text-primary)', font: 'inherit', fontSize: '0.85rem',
            fontWeight: 700, cursor: 'pointer',
          }}
        >
          <SlidersHorizontal size={15} aria-hidden="true" />
          Filters
          {activeFilterCount > 0 && (
            <span
              style={{
                display: 'grid', placeItems: 'center', minWidth: 20, height: 20,
                padding: '0 6px', borderRadius: 999,
                background: 'var(--primary-700)', color: '#fff',
                fontSize: '0.68rem', fontWeight: 800,
              }}
            >
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <p className="pp-group-sub" style={{ margin: '-1rem 0 0' }}>
        {totalCount} profile{totalCount === 1 ? '' : 's'} you can see
        {activeFilterCount > 0 ? ' with these filters' : ''}.
      </p>

      {/* ---- Sort ---- */}
      <div
        style={{
          display: 'flex', gap: 4, padding: 4,
          background: 'var(--bg-primary)', borderRadius: 999,
          border: '1px solid rgba(27,67,50,0.08)',
          width: 'fit-content', maxWidth: '100%', overflowX: 'auto',
        }}
      >
        {SORT_OPTIONS.map(s => {
          const active = (filters.sort_by || 'newest') === s.value;
          return (
            <button
              key={s.value} type="button"
              aria-pressed={active}
              onClick={() => handleFilterChange('sort_by', s.value as 'newest' | 'recently_active')}
              style={{
                minHeight: 44, padding: '0 16px', border: 0, whiteSpace: 'nowrap',
                borderRadius: 999, font: 'inherit', fontSize: '0.85rem', cursor: 'pointer',
                background: active ? 'var(--green-950)' : 'none',
                color: active ? '#fff' : 'var(--text-secondary)',
                fontWeight: active ? 700 : 600,
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* ---- Results ---- */}
      {error ? (
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
          <div role="alert" className="community-error" style={{ textAlign: 'center', marginBottom: 18 }}>
            <AlertCircle size={15} aria-hidden="true" /> {error}
          </div>
          <button type="button" className="btn btn-outline" onClick={() => void fetchProfiles()}>
            <RotateCcw size={14} aria-hidden="true" /> Try again
          </button>
        </div>
      ) : loading ? (
        <PortalLoading label="Loading profiles" />
      ) : profiles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <Search size={28} aria-hidden="true" style={{ opacity: 0.35, marginBottom: 12 }} />
          <p style={{ margin: '0 0 18px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Nobody matches these filters right now.
          </p>
          <button type="button" className="btn btn-outline" onClick={resetFilters}>
            <RotateCcw size={14} aria-hidden="true" /> Reset filters
          </button>
        </div>
      ) : (
        <>
          <div className="hf-events">
            {profiles.map((profile) => (
              <ProfileCard key={profile.id} profile={profile} />
            ))}
          </div>

          {totalPages > 1 && (
            <nav
              aria-label="Pages"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '0.6rem 0 0.2rem', overflowX: 'auto',
              }}
            >
              <button
                type="button" aria-label="Previous page"
                style={{ ...pagePillStyle(false), opacity: page <= 1 ? 0.4 : 1, cursor: page <= 1 ? 'default' : 'pointer' }}
                disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft size={17} aria-hidden="true" />
              </button>

              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else if (page <= 4) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 3) {
                  pageNum = totalPages - 6 + i;
                } else {
                  pageNum = page - 3 + i;
                }
                return (
                  <button
                    key={pageNum} type="button"
                    style={pagePillStyle(pageNum === page)}
                    aria-current={pageNum === page ? 'page' : undefined}
                    aria-label={`Page ${pageNum}`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button" aria-label="Next page"
                style={{ ...pagePillStyle(false), opacity: page >= totalPages ? 0.4 : 1, cursor: page >= totalPages ? 'default' : 'pointer' }}
                disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight size={17} aria-hidden="true" />
              </button>
            </nav>
          )}
        </>
      )}

      {/* ---- Filter sheet ---- */}
      {drawerOpen && (
        <div className="hf-sheet-scrim" onClick={(e) => { if (e.target === e.currentTarget) setDrawerOpen(false); }}>
          <div className="hf-sheet pp-sheet" role="dialog" aria-modal="true" aria-label="Filters">
            <div className="hf-sheet-head">
              <h2>Filters</h2>
              <button type="button" className="portal-sheet-close" onClick={() => setDrawerOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <p className="hf-sheet-sub">Results update as you choose. Nothing is saved unless you save the search.</p>

            <div className="pp-sheet-fields">
              {/* Looking for */}
              <div role="group" aria-labelledby="mf-gender">
                <div id="mf-gender" style={groupLabelStyle}>Looking for</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    { value: '', label: 'Anyone' },
                    { value: 'male', label: 'Groom' },
                    { value: 'female', label: 'Bride' },
                  ].map(g => {
                    const on = (filters.gender || '') === g.value;
                    return (
                      <button
                        key={g.label} type="button" aria-pressed={on} style={chipStyle(on)}
                        onClick={() => handleFilterChange('gender', g.value || undefined)}
                      >
                        {on && <Check size={13} aria-hidden="true" />}
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Age */}
              <div style={{ display: 'flex', gap: 10 }}>
                <div className="pp-field" style={{ flex: 1 }}>
                  <label htmlFor="mf-age-min">Age from</label>
                  <input
                    id="mf-age-min" type="number" inputMode="numeric" min={18} max={70} placeholder="18"
                    value={filters.age_min || ''}
                    onChange={e => handleFilterChange('age_min', e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>
                <div className="pp-field" style={{ flex: 1 }}>
                  <label htmlFor="mf-age-max">Age to</label>
                  <input
                    id="mf-age-max" type="number" inputMode="numeric" min={18} max={70} placeholder="70"
                    value={filters.age_max || ''}
                    onChange={e => handleFilterChange('age_max', e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>
              </div>

              {/* Height */}
              <div style={{ display: 'flex', gap: 10 }}>
                <div className="pp-field" style={{ flex: 1 }}>
                  <label htmlFor="mf-h-min">Height from</label>
                  <div className="pp-select">
                    <select
                      id="mf-h-min" value={filters.height_min_cm || ''}
                      onChange={e => handleFilterChange('height_min_cm', e.target.value ? parseInt(e.target.value) : undefined)}
                    >
                      <option value="">Any</option>
                      {HEIGHT_OPTIONS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                    </select>
                    <ChevronRight size={14} aria-hidden="true" className="pp-select-chevron" />
                  </div>
                </div>
                <div className="pp-field" style={{ flex: 1 }}>
                  <label htmlFor="mf-h-max">Height to</label>
                  <div className="pp-select">
                    <select
                      id="mf-h-max" value={filters.height_max_cm || ''}
                      onChange={e => handleFilterChange('height_max_cm', e.target.value ? parseInt(e.target.value) : undefined)}
                    >
                      <option value="">Any</option>
                      {HEIGHT_OPTIONS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                    </select>
                    <ChevronRight size={14} aria-hidden="true" className="pp-select-chevron" />
                  </div>
                </div>
              </div>

              {chipGroup('Marital status', 'marital_status', MARITAL_OPTIONS)}
              {chipGroup('Religion', 'religion', RELIGIONS.map(r => ({ value: r, label: r })))}
              {chipGroup('Community', 'community', COMMUNITIES.map(c => ({ value: c, label: c })))}
              {chipGroup('Mother tongue', 'mother_tongue', MOTHER_TONGUES.map(m => ({ value: m, label: m })))}
              {chipGroup('Residency', 'residency_status', RESIDENCY_OPTIONS)}
              {chipGroup('Education', 'education', QUALIFICATIONS.map(q => ({ value: q, label: q })))}
              {chipGroup('Diet', 'diet', DIET_OPTIONS)}

              {/* Location */}
              <div className="pp-field">
                <label htmlFor="mf-country">Country</label>
                <div className="pp-select">
                  <select
                    id="mf-country" value={filters.country || ''}
                    onChange={e => handleFilterChange('country', e.target.value || undefined)}
                  >
                    <option value="">Any</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronRight size={14} aria-hidden="true" className="pp-select-chevron" />
                </div>
              </div>

              {filters.country === 'Canada' && (
                <div className="pp-field">
                  <label htmlFor="mf-province">Province</label>
                  <div className="pp-select">
                    <select
                      id="mf-province" value={filters.province || ''}
                      onChange={e => handleFilterChange('province', e.target.value || undefined)}
                    >
                      <option value="">Any</option>
                      {CANADIAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <ChevronRight size={14} aria-hidden="true" className="pp-select-chevron" />
                  </div>
                </div>
              )}

              <div className="pp-field">
                <label htmlFor="mf-city">City</label>
                <input
                  id="mf-city" placeholder="Type a city"
                  value={filters.city || ''}
                  onChange={e => handleFilterChange('city', e.target.value || undefined)}
                />
              </div>

              {/* Switches */}
              <div className="pp-group-card">
                {toggleRow('Verified profiles only', <BadgeCheck size={17} />, 'verified_only')}
                {toggleRow('With a photo', <Camera size={17} />, 'has_photo')}
                {toggleRow('Active in the last 3 days', <Clock size={17} />, 'recently_active')}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button type="button" className="btn btn-outline" style={{ minHeight: 44 }} onClick={resetFilters}>
                  <RotateCcw size={14} aria-hidden="true" /> Reset all
                </button>
                {myProfileId && (
                  <button
                    type="button" className="pp-nudge"
                    onClick={() => { setSaveError(''); setShowSaveModal(true); }}
                  >
                    <Save size={13} aria-hidden="true" /> Save this search
                  </button>
                )}
              </div>
            </div>

            <button type="button" className="pp-sheet-save" onClick={() => setDrawerOpen(false)}>
              Show {totalCount} profile{totalCount === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      )}

      {/* ---- Save-search sheet ---- */}
      {showSaveModal && (
        <div className="hf-sheet-scrim" onClick={(e) => { if (e.target === e.currentTarget) setShowSaveModal(false); }}>
          <div className="hf-sheet pp-sheet" role="dialog" aria-modal="true" aria-label="Save this search">
            <div className="hf-sheet-head">
              <h2>Save this search</h2>
              <button type="button" className="portal-sheet-close" onClick={() => setShowSaveModal(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <p className="hf-sheet-sub">We will notify you when new profiles match it.</p>

            <div className="pp-sheet-fields">
              <div className="pp-field">
                <label htmlFor="mf-save-name">Name</label>
                <input
                  id="mf-save-name" placeholder="e.g. Sikh brides in Ontario"
                  value={saveSearchName}
                  onChange={e => setSaveSearchName(e.target.value)}
                />
              </div>
            </div>

            {saveError && (
              <div role="alert" className="community-error" style={{ marginTop: 4 }}>
                <AlertCircle size={15} aria-hidden="true" /> {saveError}
              </div>
            )}

            <button
              type="button" className="pp-sheet-save"
              onClick={handleSaveSearch}
              disabled={savingSearch || !saveSearchName.trim()}
            >
              {savingSearch ? 'Saving…' : <><Save size={16} aria-hidden="true" /> Save search</>}
            </button>
          </div>
        </div>
      )}

      {savedMsg && (
        <div className="pp-toast" role="status">
          <Check size={15} aria-hidden="true" /> {savedMsg}
        </div>
      )}
    </div>
  );
}

/* ========== PROFILE CARD ========== */
function ProfileCard({ profile }: { profile: MatrimonyProfileCard }) {
  const displayName = getDisplayName(profile.full_name, profile.display_pref);
  const photo = profile.primary_photo_url;
  const open = profile.photo_visibility === 'all' && photo;
  const blurred = profile.photo_visibility === 'blurred' && photo;

  const badges = [
    profile.is_verified_id && { key: 'id', label: 'ID verified', icon: <BadgeCheck size={14} /> },
    profile.is_verified_photo && { key: 'photo', label: 'Photo verified', icon: <Camera size={13} /> },
    profile.is_verified_profession && { key: 'work', label: 'Profession verified', icon: <Briefcase size={13} /> },
  ].filter(Boolean) as { key: string; label: string; icon: React.ReactNode }[];

  const facts = [
    profile.religion,
    profile.mother_tongue,
    profile.qualification,
  ].filter(Boolean);

  return (
    <Link href={`/portal/member/matrimony/profile/${profile.id}`} className="hf-event card">
      <span className="hf-event-media">
        {open || blurred ? (
          <img
            src={photo} alt="" aria-hidden="true"
            style={blurred ? { filter: 'blur(20px)', transform: 'scale(1.12)' } : undefined}
          />
        ) : (
          <span className="hf-event-fallback" aria-hidden="true"><User size={30} /></span>
        )}

        <span className="hf-chip">{residencyLabel(profile.residency_status)}</span>

        {badges.length > 0 && (
          <span style={{ position: 'absolute', top: '0.7rem', right: '0.7rem', display: 'flex', gap: 5 }}>
            {badges.map(b => (
              <span
                key={b.key} role="img" aria-label={b.label}
                style={{
                  display: 'grid', placeItems: 'center', width: 26, height: 26,
                  borderRadius: '50%', background: 'rgba(255,255,255,0.94)', color: 'var(--green-800)',
                }}
              >
                {b.icon}
              </span>
            ))}
          </span>
        )}

        <span
          style={{
            position: 'absolute', right: '0.7rem', bottom: '0.7rem',
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '0.22rem 0.6rem', borderRadius: 999,
            background: 'rgba(15,35,24,0.72)', color: '#fff',
            fontSize: '0.68rem', fontWeight: 700,
          }}
        >
          <Clock size={10} aria-hidden="true" /> {timeAgo(profile.last_active_at)}
        </span>
      </span>

      <span className="hf-event-body">
        <strong>{displayName}</strong>
        <small style={{ color: 'var(--text-secondary)' }}>
          {getAge(profile.dob)} yrs · {cmToFtIn(profile.height_cm)} · {titleCase(profile.marital_status)}
        </small>
        <small>
          <MapPin size={12} aria-hidden="true" />
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {[profile.city, profile.province].filter(Boolean).join(', ')}
          </span>
        </small>
        <small>
          <Briefcase size={12} aria-hidden="true" />
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile.occupation || 'Not stated'}
          </span>
        </small>

        {facts.length > 0 && (
          <span style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: '0.15rem' }}>
            {facts.map(f => (
              <span
                key={f} className="pp-chip"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', maxWidth: '100%' }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f}</span>
              </span>
            ))}
          </span>
        )}

        {profile.about_me && (
          <span
            style={{
              marginTop: '0.15rem', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.55,
              overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}
          >
            {profile.about_me}
          </span>
        )}

        <span className="hf-join">View profile</span>
      </span>
    </Link>
  );
}
