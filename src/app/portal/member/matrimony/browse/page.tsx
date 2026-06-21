'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/app-context';
import { createClient } from '@/utils/supabase/client';
import type { MatrimonyProfileCard, MatrimonySearchFilters } from '@/types/matrimony';
import {
  RELIGIONS, COMMUNITIES, MOTHER_TONGUES, QUALIFICATIONS, COUNTRIES,
  CANADIAN_PROVINCES, HEIGHT_OPTIONS,
} from '@/lib/matrimony/constants';
import {
  Search, SlidersHorizontal, X, ChevronLeft, ChevronRight, RotateCcw,
  Save, Shield, ShieldCheck, Camera, MapPin, Briefcase, GraduationCap,
  Heart, Clock, User, Filter, ChevronDown, Sparkles, Loader2,
} from 'lucide-react';

const ITEMS_PER_PAGE = 12;

const MARITAL_OPTIONS = [
  { value: 'never_married', label: 'Never Married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
  { value: 'awaiting_divorce', label: 'Awaiting Divorce' },
  { value: 'separated', label: 'Separated' },
];
const RESIDENCY_OPTIONS = [
  { value: 'citizen', label: 'Citizen' },
  { value: 'pr', label: 'Permanent Resident' },
  { value: 'work_permit', label: 'Work Permit' },
  { value: 'study_permit', label: 'Study Permit' },
  { value: 'visitor', label: 'Visitor' },
  { value: 'other', label: 'Other' },
];
const DIET_OPTIONS = [
  { value: 'veg', label: 'Vegetarian' },
  { value: 'non_veg', label: 'Non-Vegetarian' },
  { value: 'eggetarian', label: 'Eggetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'jain', label: 'Jain' },
];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'recently_active', label: 'Recently Active' },
  { value: 'best_match', label: 'Best Match' },
];

function getAge(dob: string): number {
  const b = new Date(dob);
  const t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
  return age;
}

function cmToFtIn(cm: number): string {
  const totalInches = cm / 2.54;
  const ft = Math.floor(totalInches / 12);
  const inch = Math.round(totalInches % 12);
  return `${ft}'${inch}"`;
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

export default function MatrimonyBrowsePage() {
  const router = useRouter();
  const { currentUserId } = useApp();
  const supabase = useMemo(() => createClient(), []);

  const [profiles, setProfiles] = useState<MatrimonyProfileCard[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<MatrimonySearchFilters>({ ...emptyFilters });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [savingSearch, setSavingSearch] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  // Load my profile + blocked IDs
  useEffect(() => {
    if (!currentUserId) return;
    (async () => {
      const { data: mp } = await supabase
        .from('matrimony_profiles')
        .select('id')
        .eq('user_id', currentUserId)
        .single();
      if (mp) setMyProfileId(mp.id);

      if (mp) {
        const { data: blocks } = await supabase
          .from('matrimony_blocks')
          .select('blocked_profile_id')
          .eq('blocker_profile_id', mp.id);
        if (blocks) setBlockedIds(blocks.map(b => b.blocked_profile_id));

        // Also get profiles that blocked me
        const { data: blockedByOthers } = await supabase
          .from('matrimony_blocks')
          .select('blocker_profile_id')
          .eq('blocked_profile_id', mp.id);
        if (blockedByOthers) {
          setBlockedIds(prev => [...prev, ...blockedByOthers.map(b => b.blocker_profile_id)]);
        }
      }
    })();
  }, [currentUserId, supabase]);

  // Fetch profiles
  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('matrimony_profiles')
        .select(`
          id, user_id, full_name, display_pref, gender, dob, height_cm,
          city, province, country, religion, mother_tongue, occupation,
          qualification, residency_status, diet, marital_status,
          is_verified_id, is_verified_photo, is_verified_profession,
          photo_visibility, last_active_at, about_me, completeness_pct,
          status
        `, { count: 'exact' })
        .eq('status', 'approved')
        .eq('is_hidden', false);

      // Exclude own profile
      if (myProfileId) {
        query = query.neq('id', myProfileId);
      }

      // Exclude blocked profiles
      if (blockedIds.length > 0) {
        query = query.not('id', 'in', `(${blockedIds.join(',')})`);
      }

      // Apply filters
      if (filters.gender) query = query.eq('gender', filters.gender);
      if (filters.religion && filters.religion.length > 0) query = query.in('religion', filters.religion);
      if (filters.community && filters.community.length > 0) query = query.in('community', filters.community);
      if (filters.mother_tongue && filters.mother_tongue.length > 0) query = query.in('mother_tongue', filters.mother_tongue);
      if (filters.marital_status && filters.marital_status.length > 0) query = query.in('marital_status', filters.marital_status);
      if (filters.residency_status && filters.residency_status.length > 0) query = query.in('residency_status', filters.residency_status);
      if (filters.education && filters.education.length > 0) query = query.in('qualification', filters.education);
      if (filters.diet && filters.diet.length > 0) query = query.in('diet', filters.diet);
      if (filters.country) query = query.eq('country', filters.country);
      if (filters.province) query = query.eq('province', filters.province);
      if (filters.city) query = query.ilike('city', `%${filters.city}%`);
      if (filters.height_min_cm) query = query.gte('height_cm', filters.height_min_cm);
      if (filters.height_max_cm) query = query.lte('height_cm', filters.height_max_cm);
      if (filters.verified_only) {
        query = query.eq('is_verified_id', true);
      }
      if (filters.has_photo) {
        query = query.neq('photo_visibility', 'blurred');
      }
      if (filters.recently_active) {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('last_active_at', threeDaysAgo);
      }

      // Sort
      if (filters.sort_by === 'recently_active') {
        query = query.order('last_active_at', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // Pagination
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;

      // Age filtering (done client-side since dob needs computation)
      let filtered = (data || []) as MatrimonyProfileCard[];
      if (filters.age_min || filters.age_max) {
        filtered = filtered.filter(p => {
          const age = getAge(p.dob);
          if (filters.age_min && age < filters.age_min) return false;
          if (filters.age_max && age > filters.age_max) return false;
          return true;
        });
      }

      // Fetch primary photos
      if (filtered.length > 0) {
        const profileIds = filtered.map(p => p.id);
        const { data: photos } = await supabase
          .from('matrimony_media')
          .select('profile_id, url')
          .in('profile_id', profileIds)
          .eq('type', 'photo')
          .eq('is_primary', true)
          .eq('is_approved', true);

        if (photos) {
          const photoMap = new Map(photos.map(p => [p.profile_id, p.url]));
          filtered = filtered.map(p => ({
            ...p,
            primary_photo_url: photoMap.get(p.id) || undefined,
          }));
        }
      }

      setProfiles(filtered);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching profiles:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, page, filters, myProfileId, blockedIds]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

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
    try {
      const { error } = await supabase.from('matrimony_saved_searches').insert({
        profile_id: myProfileId,
        name: saveSearchName.trim(),
        filters: filters,
        notify: true,
      });
      if (error) throw error;
      setSavedMsg('Search saved!');
      setShowSaveModal(false);
      setSaveSearchName('');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (err) {
      console.error('Error saving search:', err);
    } finally {
      setSavingSearch(false);
    }
  };

  // ========== FILTER SIDEBAR COMPONENT ==========
  const FilterContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Gender */}
      <div className="input-group">
        <label>Looking for</label>
        <select
          className="input"
          value={filters.gender || ''}
          onChange={e => handleFilterChange('gender', e.target.value || undefined)}
        >
          <option value="">All</option>
          <option value="male">Groom</option>
          <option value="female">Bride</option>
        </select>
      </div>

      {/* Age Range */}
      <div className="input-group">
        <label>Age Range</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            type="number"
            placeholder="Min"
            min={18}
            max={70}
            value={filters.age_min || ''}
            onChange={e => handleFilterChange('age_min', e.target.value ? parseInt(e.target.value) : undefined)}
          />
          <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>to</span>
          <input
            className="input"
            type="number"
            placeholder="Max"
            min={18}
            max={70}
            value={filters.age_max || ''}
            onChange={e => handleFilterChange('age_max', e.target.value ? parseInt(e.target.value) : undefined)}
          />
        </div>
      </div>

      {/* Height Range */}
      <div className="input-group">
        <label>Height Range</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            className="input"
            value={filters.height_min_cm || ''}
            onChange={e => handleFilterChange('height_min_cm', e.target.value ? parseInt(e.target.value) : undefined)}
          >
            <option value="">Min</option>
            {HEIGHT_OPTIONS.map(h => (
              <option key={h.value} value={h.value}>{h.label}</option>
            ))}
          </select>
          <select
            className="input"
            value={filters.height_max_cm || ''}
            onChange={e => handleFilterChange('height_max_cm', e.target.value ? parseInt(e.target.value) : undefined)}
          >
            <option value="">Max</option>
            {HEIGHT_OPTIONS.map(h => (
              <option key={h.value} value={h.value}>{h.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Marital Status */}
      <MultiSelectFilter
        label="Marital Status"
        options={MARITAL_OPTIONS}
        selected={filters.marital_status || []}
        onToggle={v => handleMultiSelect('marital_status', v)}
      />

      {/* Religion */}
      <MultiSelectFilter
        label="Religion"
        options={RELIGIONS.map(r => ({ value: r, label: r }))}
        selected={filters.religion || []}
        onToggle={v => handleMultiSelect('religion', v)}
      />

      {/* Community */}
      <MultiSelectFilter
        label="Community"
        options={COMMUNITIES.map(c => ({ value: c, label: c }))}
        selected={filters.community || []}
        onToggle={v => handleMultiSelect('community', v)}
      />

      {/* Mother Tongue */}
      <MultiSelectFilter
        label="Mother Tongue"
        options={MOTHER_TONGUES.map(m => ({ value: m, label: m }))}
        selected={filters.mother_tongue || []}
        onToggle={v => handleMultiSelect('mother_tongue', v)}
      />

      {/* Location */}
      <div className="input-group">
        <label>Country</label>
        <select
          className="input"
          value={filters.country || ''}
          onChange={e => handleFilterChange('country', e.target.value || undefined)}
        >
          <option value="">Any</option>
          {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {filters.country === 'Canada' && (
        <div className="input-group">
          <label>Province</label>
          <select
            className="input"
            value={filters.province || ''}
            onChange={e => handleFilterChange('province', e.target.value || undefined)}
          >
            <option value="">Any</option>
            {CANADIAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      )}

      <div className="input-group">
        <label>City</label>
        <input
          className="input"
          placeholder="Type a city..."
          value={filters.city || ''}
          onChange={e => handleFilterChange('city', e.target.value || undefined)}
        />
      </div>

      {/* Residency Status */}
      <MultiSelectFilter
        label="Residency Status"
        options={RESIDENCY_OPTIONS}
        selected={filters.residency_status || []}
        onToggle={v => handleMultiSelect('residency_status', v)}
      />

      {/* Education */}
      <MultiSelectFilter
        label="Education"
        options={QUALIFICATIONS.map(q => ({ value: q, label: q }))}
        selected={filters.education || []}
        onToggle={v => handleMultiSelect('education', v)}
      />

      {/* Diet */}
      <MultiSelectFilter
        label="Diet"
        options={DIET_OPTIONS}
        selected={filters.diet || []}
        onToggle={v => handleMultiSelect('diet', v)}
      />

      {/* Toggles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <ToggleFilter
          label="Verified Profiles Only"
          icon={<ShieldCheck size={16} />}
          checked={!!filters.verified_only}
          onChange={v => handleFilterChange('verified_only', v)}
        />
        <ToggleFilter
          label="With Photo Only"
          icon={<Camera size={16} />}
          checked={!!filters.has_photo}
          onChange={v => handleFilterChange('has_photo', v)}
        />
        <ToggleFilter
          label="Recently Active (3 days)"
          icon={<Clock size={16} />}
          checked={!!filters.recently_active}
          onChange={v => handleFilterChange('recently_active', v)}
        />
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
        <button className="btn btn-outline w-full" onClick={resetFilters}>
          <RotateCcw size={14} /> Reset All Filters
        </button>
        <button className="btn btn-primary w-full" onClick={() => setShowSaveModal(true)}>
          <Save size={14} /> Save This Search
        </button>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 4 }}>
            <Heart size={28} style={{ display: 'inline', marginRight: 8, color: 'var(--error-500)' }} />
            Browse Profiles
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Discover your perfect match from {totalCount} profile{totalCount !== 1 ? 's' : ''}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Sort Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              className="input"
              style={{ paddingRight: 32, minWidth: 160 }}
              value={filters.sort_by || 'newest'}
              onChange={e => handleFilterChange('sort_by', e.target.value as 'newest' | 'recently_active' | 'best_match')}
            >
              {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Mobile filter toggle */}
          <button
            className="btn btn-outline"
            onClick={() => setDrawerOpen(true)}
            style={{ display: 'none', position: 'relative' }}
            id="mobile-filter-btn"
          >
            <SlidersHorizontal size={16} />
            Filters
            {activeFilterCount > 0 && (
              <span style={{
                position: 'absolute', top: -6, right: -6, width: 20, height: 20,
                borderRadius: '50%', background: 'var(--error-500)', color: 'white',
                fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {savedMsg && (
        <div className="badge badge-success" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
          ✓ {savedMsg}
        </div>
      )}

      <div style={{ display: 'flex', gap: 24 }}>
        {/* Desktop Sidebar */}
        <aside style={{
          width: 300, minWidth: 300, maxHeight: 'calc(100vh - 100px)', overflowY: 'auto',
          position: 'sticky', top: 80, padding: 20, background: 'var(--bg-card)',
          border: '1px solid var(--border-color)', borderRadius: 16,
        }} className="matrimony-filter-sidebar">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Filter size={18} /> Filters
              {activeFilterCount > 0 && (
                <span className="badge badge-primary">{activeFilterCount}</span>
              )}
            </h3>
          </div>
          <FilterContent />
        </aside>

        {/* Mobile Drawer */}
        {drawerOpen && (
          <>
            <div
              style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999,
              }}
              onClick={() => setDrawerOpen(false)}
            />
            <div style={{
              position: 'fixed', top: 0, right: 0, bottom: 0, width: '85vw', maxWidth: 380,
              background: 'var(--bg-card)', zIndex: 1000, overflowY: 'auto', padding: 24,
              boxShadow: '-4px 0 32px rgba(0,0,0,0.15)',
              animation: 'slideInRight 0.3s ease-out',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                  <Filter size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                  Search Filters
                </h3>
                <button className="btn btn-ghost btn-icon" onClick={() => setDrawerOpen(false)}>
                  <X size={20} />
                </button>
              </div>
              <FilterContent />
            </div>
          </>
        )}

        {/* Main Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 80, flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <Loader2 size={36} style={{ color: 'var(--primary-600)', animation: 'spin 1s linear infinite' }} />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading profiles...</span>
            </div>
          ) : profiles.length === 0 ? (
            <div className="card" style={{ padding: 60, textAlign: 'center' }}>
              <Search size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>No profiles found</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Try adjusting your filters to see more results.</p>
              <button className="btn btn-outline" onClick={resetFilters}>
                <RotateCcw size={14} /> Reset Filters
              </button>
            </div>
          ) : (
            <>
              {/* Profile Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 20,
              }} className="matrimony-browse-grid">
                {profiles.map((profile, idx) => (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    onClick={() => router.push(`/portal/member/matrimony/profile/${profile.id}`)}
                    delay={idx * 50}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{
                  display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
                  marginTop: 32, paddingBottom: 16,
                }}>
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    <ChevronLeft size={16} /> Previous
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
                        key={pageNum}
                        className={`btn btn-sm ${pageNum === page ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setPage(pageNum)}
                        style={{ minWidth: 36 }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    className="btn btn-outline btn-sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Save Search Modal */}
      {showSaveModal && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setShowSaveModal(false)} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: 'var(--bg-card)', borderRadius: 16, padding: 32, zIndex: 10000,
            width: '90vw', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>Save Search</h3>
            <div className="input-group" style={{ marginBottom: 20 }}>
              <label>Search Name</label>
              <input
                className="input"
                placeholder="e.g., Sikh brides in Ontario"
                value={saveSearchName}
                onChange={e => setSaveSearchName(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowSaveModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveSearch} disabled={savingSearch || !saveSearchName.trim()}>
                {savingSearch ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                Save
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        .matrimony-browse-grid {
          grid-template-columns: repeat(3, 1fr) !important;
        }
        @media (max-width: 1100px) {
          .matrimony-browse-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 700px) {
          .matrimony-browse-grid {
            grid-template-columns: 1fr !important;
          }
        }
        .matrimony-filter-sidebar {
          display: block;
        }
        @media (max-width: 900px) {
          .matrimony-filter-sidebar {
            display: none !important;
          }
          #mobile-filter-btn {
            display: inline-flex !important;
          }
        }
      `}</style>
    </div>
  );
}

// ========== PROFILE CARD ==========
function ProfileCard({ profile, onClick, delay }: { profile: MatrimonyProfileCard; onClick: () => void; delay: number }) {
  const displayName = getDisplayName(profile.full_name, profile.display_pref);
  const age = getAge(profile.dob);
  const height = cmToFtIn(profile.height_cm);
  const showPhoto = profile.photo_visibility === 'all' && profile.primary_photo_url;
  const hasVerification = profile.is_verified_id || profile.is_verified_photo || profile.is_verified_profession;

  return (
    <div
      className="card card-clickable"
      onClick={onClick}
      style={{
        padding: 0, overflow: 'hidden', cursor: 'pointer', position: 'relative',
        animation: `fadeInUp 0.5s ease-out ${delay}ms both`,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 16,
        transition: 'all 0.3s ease',
      }}
    >
      {/* Photo */}
      <div style={{
        height: 200, background: showPhoto
          ? `url(${profile.primary_photo_url}) center/cover`
          : 'linear-gradient(135deg, var(--primary-100), var(--accent-100))',
        position: 'relative', overflow: 'hidden',
      }}>
        {!showPhoto && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <User size={56} style={{ color: 'var(--primary-300)', opacity: 0.5 }} />
          </div>
        )}
        {profile.photo_visibility === 'blurred' && profile.primary_photo_url && (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${profile.primary_photo_url})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            filter: 'blur(20px)', transform: 'scale(1.1)',
          }} />
        )}

        {/* Residency badge */}
        <span className="badge badge-primary" style={{
          position: 'absolute', top: 10, left: 10,
          background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(4px)',
          fontSize: '0.65rem',
        }}>
          {residencyLabel(profile.residency_status)}
        </span>

        {/* Last active */}
        <span style={{
          position: 'absolute', bottom: 10, right: 10,
          background: 'rgba(0,0,0,0.6)', color: 'white', padding: '2px 8px',
          borderRadius: 12, fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <Clock size={10} /> {timeAgo(profile.last_active_at)}
        </span>

        {/* Verified badges */}
        {hasVerification && (
          <div style={{
            position: 'absolute', top: 10, right: 10, display: 'flex', gap: 4,
          }}>
            {profile.is_verified_id && (
              <span style={{
                background: 'rgba(0,168,107,0.9)', color: 'white', borderRadius: '50%',
                width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }} title="ID Verified">
                <Shield size={12} />
              </span>
            )}
            {profile.is_verified_photo && (
              <span style={{
                background: 'rgba(0,103,165,0.9)', color: 'white', borderRadius: '50%',
                width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }} title="Photo Verified">
                <Camera size={12} />
              </span>
            )}
            {profile.is_verified_profession && (
              <span style={{
                background: 'rgba(255,191,0,0.9)', color: 'var(--gray-900)', borderRadius: '50%',
                width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }} title="Profession Verified">
                <Briefcase size={12} />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '16px 18px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>{displayName}</h3>
          {profile.match_score !== undefined && (
            <span className="badge badge-accent" style={{ fontWeight: 700 }}>
              <Sparkles size={10} /> {profile.match_score}%
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
          <span>{age} yrs</span>
          <span>·</span>
          <span>{height}</span>
          <span>·</span>
          <span>{profile.marital_status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={12} style={{ color: 'var(--primary-500)', flexShrink: 0 }} />
            <span>{profile.city}, {profile.province}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Briefcase size={12} style={{ color: 'var(--primary-500)', flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.occupation}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <GraduationCap size={12} style={{ color: 'var(--primary-500)', flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.qualification}</span>
          </div>
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 10 }}>
          <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>{profile.religion}</span>
          <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>{profile.mother_tongue}</span>
        </div>

        {/* About Me excerpt */}
        {profile.about_me && (
          <p style={{
            marginTop: 10, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5,
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {profile.about_me}
          </p>
        )}
      </div>

      {/* Bottom gradient accent */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
        background: 'linear-gradient(90deg, var(--primary-500), var(--accent-400))',
        opacity: 0, transition: 'opacity 0.3s',
      }} className="card-bottom-accent" />
    </div>
  );
}

// ========== MULTI-SELECT FILTER ==========
function MultiSelectFilter({ label, options, selected, onToggle }: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="input-group">
      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <span>{label}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {selected.length > 0 && <span className="badge badge-primary" style={{ fontSize: '0.6rem' }}>{selected.length}</span>}
          <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </span>
      </label>
      {open && (
        <div style={{
          maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2,
          border: '1px solid var(--border-color)', borderRadius: 8, padding: 8, background: 'var(--bg-secondary)',
        }}>
          {options.map(opt => (
            <label
              key={opt.value}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', borderRadius: 6,
                cursor: 'pointer', fontSize: '0.8rem',
                background: selected.includes(opt.value) ? 'rgba(0,103,165,0.08)' : 'transparent',
              }}
            >
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => onToggle(opt.value)}
                style={{ accentColor: 'var(--primary-600)' }}
              />
              {opt.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ========== TOGGLE FILTER ==========
function ToggleFilter({ label, icon, checked, onChange }: {
  label: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 12px', background: checked ? 'rgba(0,103,165,0.06)' : 'transparent',
      border: `1px solid ${checked ? 'var(--primary-300)' : 'var(--border-color)'}`,
      borderRadius: 10, cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.2s',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: checked ? 'var(--primary-600)' : 'var(--text-secondary)' }}>
        {icon} {label}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ accentColor: 'var(--primary-600)' }}
      />
    </label>
  );
}
