'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/app-context';
import {
  getMyMatrimony, browseProfilesPaged, saveSearch, swipeRight, addToShortlist, removeFromShortlist,
} from '@/app/actions/matrimony';
import type { MatrimonyBrowseCard, MatrimonyPreferences, MatrimonySearchFilters } from '@/types/matrimony';
import { computeMatchScore } from '@/lib/matrimony/matching';
import {
  RELIGIONS, COMMUNITIES, MOTHER_TONGUES, QUALIFICATIONS, COUNTRIES,
  CANADIAN_PROVINCES, HEIGHT_OPTIONS,
} from '@/lib/matrimony/constants';
import PortalLoading from '@/components/portal/PortalLoading';
import MatrimonyTabs from '@/components/portal/MatrimonyTabs';
import {
  Search, SlidersHorizontal, X, ChevronLeft, ChevronRight, RotateCcw,
  Save, BadgeCheck, Camera, Clock, Check, AlertCircle, Heart, Star, Sparkles, MessageCircle,
} from 'lucide-react';

/**
 * Browse: everyone the member can see, in the grammar of the matrimony apps
 * people already use (Shaadi, Jeevansathi): a photo-first grid, two across on
 * a phone, the essentials on the picture, and Like / Shortlist right on the
 * card so a decision does not need a detour through the profile page.
 *
 * The old Matches page lives here as the "Best match" order: your saved
 * partner preferences score every visible profile, highest first. Scoring is
 * client-side (the query has no score to sort by), so that order loads the
 * whole visible set (capped at 100) once and pages it locally.
 */

const ITEMS_PER_PAGE = 12;
const BEST_MATCH_POOL = 100;

type Sort = 'best_match' | 'newest' | 'recently_active';

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

function getAge(dob: string): number {
  const b = new Date(dob);
  const t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
  return age;
}

/** Round to whole inches FIRST, then split (5'12" otherwise). */
function cmToFtIn(cm: number): string {
  if (!cm) return '';
  const totalInches = Math.round(cm / 2.54);
  return `${Math.floor(totalInches / 12)}'${totalInches % 12}"`;
}

function displayName(fullName: string, pref: string): string {
  if (!fullName) return 'Member';
  if (pref === 'first_name') return fullName.split(' ')[0];
  if (pref === 'initials') return fullName.split(' ').map((n) => n[0]).join('.').toUpperCase();
  return fullName;
}

const initialsOf = (name: string) => name.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'PC';

function photoOf(card: MatrimonyBrowseCard) {
  // The database only sends a photo the viewer may see (0055); nothing to blur.
  if (!card.primary_photo_url) return null;
  return { url: card.primary_photo_url, blurred: false };
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
  const params = useSearchParams();

  const [rows, setRows] = useState<MatrimonyBrowseCard[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<MatrimonySearchFilters>({ ...emptyFilters });
  const [genderTouched, setGenderTouched] = useState(false);
  const [sort, setSort] = useState<Sort>('newest');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const [myPrefs, setMyPrefs] = useState<MatrimonyPreferences | null>(null);
  const [mineLoaded, setMineLoaded] = useState(false);
  const [savingSearch, setSavingSearch] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [toast, setToast] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [matched, setMatched] = useState<{ name: string; conversationId: string | null } | null>(null);

  // The order can be asked for in the URL (the old Matches page lands here).
  // Read through the router: on a client-side redirect window.location still
  // shows the old path when this component's effects first run.
  useEffect(() => {
    const asked = params.get('sort');
    if (asked === 'best_match' || asked === 'recently_active' || asked === 'newest') { setSort(asked); setPage(1); }
  }, [params]);

  // My own listing: its id (for saved searches), its preferences (for the
  // score) and its gender - a matrimony search starts with the other side,
  // the way every matrimony site does, and "Anyone" is one tap away.
  useEffect(() => {
    if (!currentUserId) return;
    void getMyMatrimony().then((r) => {
      if (r.ok && r.data.profile) {
        setMyProfileId(r.data.profile.id);
        setMyPrefs(r.data.preferences);
        const g = String(r.data.profile.gender).toLowerCase();
        setFilters((prev) => (genderTouched || prev.gender
          ? prev
          : { ...prev, gender: g === 'male' ? 'female' : g === 'female' ? 'male' : undefined }));
      }
      setMineLoaded(true);
    });
    // genderTouched is read once here on purpose: the default applies only before the member chooses.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setError('');
    const best = sort === 'best_match';
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
      sort_by: best ? 'recently_active' : sort,
      limit: best ? BEST_MATCH_POOL : ITEMS_PER_PAGE,
      offset: best ? 0 : (page - 1) * ITEMS_PER_PAGE,
    });

    if (!result.ok) {
      setError(result.error);
      setRows([]);
      setServerTotal(0);
      setLoading(false);
      return;
    }
    // A page past the end (the set shrank between requests) goes back to 1.
    if (result.data.profiles.length === 0 && page > 1 && !best) { setPage(1); return; }
    setRows(result.data.profiles as MatrimonyBrowseCard[]);
    setServerTotal(result.data.total);
    setLoading(false);
  }, [filters, page, sort]);

  // Debounced so typing a city fires one query, not one per keystroke. Waits
  // for my own listing first so the gender default does not cost a second query.
  useEffect(() => {
    if (!mineLoaded && currentUserId) return;
    const timer = setTimeout(() => { void fetchProfiles(); }, 300);
    return () => clearTimeout(timer);
  }, [fetchProfiles, mineLoaded, currentUserId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

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

  const scoreOf = useCallback(
    (card: MatrimonyBrowseCard): number | null => (myPrefs ? Math.round(computeMatchScore(myPrefs, card)) : null),
    [myPrefs],
  );

  // Best match: score, sort, page locally. Other orders: the server paged it.
  const ordered = useMemo(() => {
    if (sort !== 'best_match') return rows;
    return [...rows]
      .map((c) => ({ c, s: scoreOf(c) ?? -1 }))
      .sort((a, b) => b.s - a.s)
      .map((x) => x.c);
  }, [rows, sort, scoreOf]);
  const totalCount = sort === 'best_match' ? ordered.length : serverTotal;
  const visible = sort === 'best_match' ? ordered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE) : ordered;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleFilterChange = (key: keyof MatrimonySearchFilters, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };
  const handleMultiSelect = (key: keyof MatrimonySearchFilters, value: string) => {
    setFilters((prev) => {
      const arr = (prev[key] as string[]) || [];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...prev, [key]: next };
    });
    setPage(1);
  };
  const resetFilters = () => { setFilters({ ...emptyFilters }); setGenderTouched(true); setPage(1); };
  const changeSort = (s: Sort) => { setSort(s); setPage(1); };

  /** Every active filter as a removable chip above the grid. */
  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; clear: () => void }[] = [];
    const clearKey = (k: keyof MatrimonySearchFilters, empty: unknown) => () => handleFilterChange(k, empty);
    if (filters.gender) chips.push({ key: 'gender', label: filters.gender === 'male' ? 'Grooms' : filters.gender === 'female' ? 'Brides' : 'Other', clear: () => { setGenderTouched(true); handleFilterChange('gender', undefined); } });
    if (filters.age_min || filters.age_max) chips.push({ key: 'age', label: `Age ${filters.age_min ?? 18}–${filters.age_max ?? 70}`, clear: () => { setFilters((p) => ({ ...p, age_min: undefined, age_max: undefined })); setPage(1); } });
    if (filters.height_min_cm || filters.height_max_cm) chips.push({ key: 'height', label: `Height ${filters.height_min_cm ? cmToFtIn(filters.height_min_cm) : 'any'}–${filters.height_max_cm ? cmToFtIn(filters.height_max_cm) : 'any'}`, clear: () => { setFilters((p) => ({ ...p, height_min_cm: undefined, height_max_cm: undefined })); setPage(1); } });
    const multi: [keyof MatrimonySearchFilters, string][] = [
      ['marital_status', 'Marital status'], ['religion', 'Religion'], ['community', 'Community'],
      ['mother_tongue', 'Mother tongue'], ['residency_status', 'Residency'], ['education', 'Education'], ['diet', 'Diet'],
    ];
    for (const [k, name] of multi) {
      const arr = (filters[k] as string[]) || [];
      if (arr.length) chips.push({ key: k, label: `${name}: ${arr.length === 1 ? arr[0].replace(/_/g, ' ') : `${arr.length} picked`}`, clear: clearKey(k, []) });
    }
    if (filters.country) chips.push({ key: 'country', label: filters.country, clear: () => { setFilters((p) => ({ ...p, country: undefined, province: undefined })); setPage(1); } });
    if (filters.province) chips.push({ key: 'province', label: filters.province, clear: clearKey('province', undefined) });
    if (filters.city) chips.push({ key: 'city', label: filters.city, clear: clearKey('city', undefined) });
    if (filters.verified_only) chips.push({ key: 'verified', label: 'Verified only', clear: clearKey('verified_only', false) });
    if (filters.has_photo) chips.push({ key: 'photo', label: 'With a photo', clear: clearKey('has_photo', false) });
    if (filters.recently_active) chips.push({ key: 'active', label: 'Active this week', clear: clearKey('recently_active', false) });
    return chips;
  }, [filters]);
  const activeFilterCount = activeChips.length;

  const handleSaveSearch = async () => {
    if (!myProfileId || !saveSearchName.trim()) return;
    setSavingSearch(true);
    setSaveError('');
    const result = await saveSearch(saveSearchName.trim(), { ...filters, sort_by: sort === 'best_match' ? 'newest' : sort }, true);
    if (!result.ok) { setSaveError(result.error); setSavingSearch(false); return; }
    setShowSaveModal(false);
    setSaveSearchName('');
    setToast('Search saved');
    setSavingSearch(false);
  };

  // ---- Quick actions on a card -------------------------------------------
  const patchCard = (id: string, patch: Partial<MatrimonyBrowseCard>) =>
    setRows((rs) => rs.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const likeCard = async (card: MatrimonyBrowseCard) => {
    if (busyId || !myProfileId) return;
    setBusyId(card.id);
    setError('');
    const r = await swipeRight(card.id);
    if (!r.ok) setError(r.error);
    else if (r.data.matched) {
      patchCard(card.id, { my_interest_status: 'accepted', incoming_interest_id: null });
      setMatched({ name: displayName(card.full_name, card.display_pref), conversationId: r.data.conversation_id });
    } else {
      patchCard(card.id, { my_interest_status: 'pending' });
      setToast('Like sent');
    }
    setBusyId(null);
  };

  const toggleSave = async (card: MatrimonyBrowseCard) => {
    if (busyId || !myProfileId) return;
    setBusyId(card.id);
    setError('');
    const r = card.is_shortlisted ? await removeFromShortlist(card.id) : await addToShortlist(card.id);
    if (r.ok) { patchCard(card.id, { is_shortlisted: !card.is_shortlisted }); setToast(card.is_shortlisted ? 'Removed from shortlist' : 'Saved to shortlist'); }
    else setError(r.error);
    setBusyId(null);
  };

  /** A collapsed multi-select: a filled row that opens into chips. */
  const chipGroup = (label: string, key: keyof MatrimonySearchFilters, options: { value: string; label: string }[]) => {
    const selected = (filters[key] as string[]) || [];
    return (
      <details key={key} style={{ background: 'var(--bg-secondary)', borderRadius: '0.85rem', padding: '0.55rem 0.9rem' }}>
        <summary style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 44, listStyle: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 650 }}>
          <span>{label}</span>
          <span style={{ fontSize: '0.78rem', fontWeight: 650, color: selected.length ? 'var(--text-accent)' : 'var(--text-muted)' }}>
            {selected.length ? `${selected.length} selected` : 'Any'}
          </span>
        </summary>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0.6rem 0 0.5rem' }}>
          {options.map((opt) => {
            const on = selected.includes(opt.value);
            return (
              <button key={opt.value} type="button" aria-pressed={on} style={chipStyle(on)} onClick={() => handleMultiSelect(key, opt.value)}>
                {on && <Check size={13} aria-hidden="true" />}
                {opt.label}
              </button>
            );
          })}
        </div>
      </details>
    );
  };

  const toggleRow = (label: string, icon: React.ReactNode, key: 'verified_only' | 'has_photo' | 'recently_active') => {
    const on = !!filters[key];
    return (
      <div className="pp-row pp-row-static" key={key}>
        <span className="pp-row-icon">{icon}</span>
        <span className="pp-row-body"><strong>{label}</strong></span>
        <button type="button" className={`pp-toggle ${on ? 'is-on' : ''}`} aria-pressed={on} aria-label={label} onClick={() => handleFilterChange(key, !on)}>
          <span className="pp-toggle-dot" aria-hidden="true" />
          {on ? 'On' : 'Off'}
        </button>
      </div>
    );
  };

  const SORTS: { value: Sort; label: string; icon?: React.ElementType }[] = [
    ...(myPrefs ? [{ value: 'best_match' as Sort, label: 'Best match', icon: Sparkles }] : []),
    { value: 'newest', label: 'Newest' },
    { value: 'recently_active', label: 'Recently active' },
  ];

  return (
    <div className="pp2" style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      <div style={{ marginBottom: '-0.2rem' }}><MatrimonyTabs active="browse" /></div>

      {/* ---- Heading + filter entry ---- */}
      <div className="cm-screen-head" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 0 }}>
        <div style={{ minWidth: 0 }}>
          <h1>Browse</h1>
          <p style={{ margin: 0 }}>
            {loading ? 'Finding profiles…' : `${totalCount} profile${totalCount === 1 ? '' : 's'}${activeFilterCount ? ' match your filters' : ' you can see'}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="cm-btn cm-btn--secondary"
          style={{ flexShrink: 0 }}
          aria-label={activeFilterCount ? `Filters, ${activeFilterCount} active` : 'Filters'}
        >
          <SlidersHorizontal size={15} aria-hidden="true" />
          Filters
          {activeFilterCount > 0 && <span className="cm-badge">{activeFilterCount}</span>}
        </button>
      </div>

      {/* ---- Order ---- */}
      <div className="cm-tabs" role="tablist" aria-label="Order" style={{ marginBottom: 0 }}>
        {SORTS.map((s) => {
          const Icon = s.icon;
          return (
            <button key={s.value} type="button" role="tab" aria-selected={sort === s.value} className={sort === s.value ? 'is-on' : ''} onClick={() => changeSort(s.value)}>
              {Icon && <Icon size={14} aria-hidden="true" />} {s.label}
            </button>
          );
        })}
      </div>
      {sort === 'best_match' && (
        <p className="pp-group-sub" style={{ margin: '-0.4rem 0 0' }}>
          Scored against your partner preferences: religion, community, language, age, height, diet and more.
        </p>
      )}
      {!myPrefs && mineLoaded && myProfileId && (
        <Link href="/portal/member/matrimony/edit" className="pp-nudge" style={{ alignSelf: 'flex-start' }}>
          <Sparkles size={13} aria-hidden="true" /> Set partner preferences to see match scores
        </Link>
      )}

      {/* ---- Active filters ---- */}
      {activeChips.length > 0 && (
        <div className="mt-filterchips" aria-label="Active filters">
          {activeChips.map((c) => (
            <button key={c.key} type="button" className="mt-filterchip" onClick={c.clear} aria-label={`Remove filter ${c.label}`}>
              {c.label} <X size={13} aria-hidden="true" />
            </button>
          ))}
          {activeChips.length > 1 && (
            <button type="button" className="mt-filterchip" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }} onClick={resetFilters}>
              Clear all
            </button>
          )}
        </div>
      )}

      {matched && (
        <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '0.85rem 1rem', borderRadius: '1rem', background: 'var(--green-950)', color: '#fff' }}>
          <Sparkles size={18} aria-hidden="true" style={{ color: 'var(--lime-300)', flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: '9rem', fontSize: '0.88rem', fontWeight: 700 }}>It&apos;s a match with {matched.name}</span>
          <Link href={matched.conversationId ? `/portal/member/chats?c=${matched.conversationId}` : '/portal/member/chats'} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 40, padding: '0 14px', borderRadius: 999, background: 'var(--lime-300)', color: 'var(--green-950)', textDecoration: 'none', fontSize: '0.84rem', fontWeight: 800 }}>
            <MessageCircle size={15} aria-hidden="true" /> Say hello
          </Link>
          <button type="button" onClick={() => setMatched(null)} aria-label="Dismiss" style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, border: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer' }}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {error && (
        <div role="alert" className="community-error">
          <AlertCircle size={15} aria-hidden="true" /> {error}
          <button type="button" className="cm-btn cm-btn--ghost cm-btn--sm" style={{ marginLeft: 'auto' }} onClick={() => void fetchProfiles()}>
            <RotateCcw size={14} aria-hidden="true" /> Retry
          </button>
        </div>
      )}

      {/* ---- Results ---- */}
      {loading ? (
        <PortalLoading label="Loading profiles" />
      ) : visible.length === 0 && !error ? (
        <div className="cm-empty">
          <Search size={26} aria-hidden="true" />
          {mineLoaded && !myProfileId ? (
            // The grid is empty because they have no listing, not because of
            // filters they never set. Discover already says this well.
            <>
              <p><strong>Create your listing to see other people.</strong></p>
              <p>Matrimony is member-to-member: once your listing is in, you can browse and be browsed. It is reviewed by an admin and private by default.</p>
              <Link href="/portal/member/matrimony/create" className="cm-btn cm-btn--primary">
                Create your listing
              </Link>
            </>
          ) : (
            <>
              <p><strong>Nobody matches these filters right now.</strong></p>
              <p>Loosen one or two and the grid fills back up.</p>
              {activeFilterCount > 0 && (
                <button type="button" className="cm-btn cm-btn--secondary" onClick={resetFilters}>
                  <RotateCcw size={14} aria-hidden="true" /> Reset filters
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <>
          <div className="mt-grid">
            {visible.map((card) => (
              <BrowseCard
                key={card.id}
                card={card}
                score={scoreOf(card)}
                busy={busyId === card.id}
                canAct={Boolean(myProfileId)}
                onLike={() => void likeCard(card)}
                onSave={() => void toggleSave(card)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <nav aria-label="Pages" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0.6rem 0 0.2rem', overflowX: 'auto' }}>
              <button type="button" aria-label="Previous page" style={{ ...pagePillStyle(false), opacity: page <= 1 ? 0.4 : 1 }} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft size={17} aria-hidden="true" />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let n: number;
                if (totalPages <= 7) n = i + 1;
                else if (page <= 4) n = i + 1;
                else if (page >= totalPages - 3) n = totalPages - 6 + i;
                else n = page - 3 + i;
                return (
                  <button key={n} type="button" style={pagePillStyle(n === page)} aria-current={n === page ? 'page' : undefined} aria-label={`Page ${n}`} onClick={() => setPage(n)}>
                    {n}
                  </button>
                );
              })}
              <button type="button" aria-label="Next page" style={{ ...pagePillStyle(false), opacity: page >= totalPages ? 0.4 : 1 }} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
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
              <div role="group" aria-labelledby="mf-gender">
                <div id="mf-gender" style={groupLabelStyle}>Looking for</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {[{ value: '', label: 'Anyone' }, { value: 'male', label: 'Grooms' }, { value: 'female', label: 'Brides' }].map((g) => {
                    const on = (filters.gender || '') === g.value;
                    return (
                      <button key={g.label} type="button" aria-pressed={on} style={chipStyle(on)} onClick={() => { setGenderTouched(true); handleFilterChange('gender', g.value || undefined); }}>
                        {on && <Check size={13} aria-hidden="true" />}
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <div className="pp-field" style={{ flex: 1 }}>
                  <label htmlFor="mf-age-min">Age from</label>
                  <input id="mf-age-min" type="number" inputMode="numeric" min={18} max={70} placeholder="18" value={filters.age_min || ''} onChange={(e) => handleFilterChange('age_min', e.target.value ? parseInt(e.target.value) : undefined)} />
                </div>
                <div className="pp-field" style={{ flex: 1 }}>
                  <label htmlFor="mf-age-max">Age to</label>
                  <input id="mf-age-max" type="number" inputMode="numeric" min={18} max={70} placeholder="70" value={filters.age_max || ''} onChange={(e) => handleFilterChange('age_max', e.target.value ? parseInt(e.target.value) : undefined)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <div className="pp-field" style={{ flex: 1 }}>
                  <label htmlFor="mf-h-min">Height from</label>
                  <div className="pp-select">
                    <select id="mf-h-min" value={filters.height_min_cm || ''} onChange={(e) => handleFilterChange('height_min_cm', e.target.value ? parseInt(e.target.value) : undefined)}>
                      <option value="">Any</option>
                      {HEIGHT_OPTIONS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
                    </select>
                    <ChevronRight size={14} aria-hidden="true" className="pp-select-chevron" />
                  </div>
                </div>
                <div className="pp-field" style={{ flex: 1 }}>
                  <label htmlFor="mf-h-max">Height to</label>
                  <div className="pp-select">
                    <select id="mf-h-max" value={filters.height_max_cm || ''} onChange={(e) => handleFilterChange('height_max_cm', e.target.value ? parseInt(e.target.value) : undefined)}>
                      <option value="">Any</option>
                      {HEIGHT_OPTIONS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
                    </select>
                    <ChevronRight size={14} aria-hidden="true" className="pp-select-chevron" />
                  </div>
                </div>
              </div>

              {chipGroup('Marital status', 'marital_status', MARITAL_OPTIONS)}
              {chipGroup('Religion', 'religion', RELIGIONS.map((r) => ({ value: r, label: r })))}
              {chipGroup('Community', 'community', COMMUNITIES.map((c) => ({ value: c, label: c })))}
              {chipGroup('Mother tongue', 'mother_tongue', MOTHER_TONGUES.map((m) => ({ value: m, label: m })))}
              {chipGroup('Residency', 'residency_status', RESIDENCY_OPTIONS)}
              {chipGroup('Education', 'education', QUALIFICATIONS.map((q) => ({ value: q, label: q })))}
              {chipGroup('Diet', 'diet', DIET_OPTIONS)}

              <div className="pp-field">
                <label htmlFor="mf-country">Country</label>
                <div className="pp-select">
                  <select id="mf-country" value={filters.country || ''} onChange={(e) => handleFilterChange('country', e.target.value || undefined)}>
                    <option value="">Any</option>
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronRight size={14} aria-hidden="true" className="pp-select-chevron" />
                </div>
              </div>
              {filters.country === 'Canada' && (
                <div className="pp-field">
                  <label htmlFor="mf-province">Province</label>
                  <div className="pp-select">
                    <select id="mf-province" value={filters.province || ''} onChange={(e) => handleFilterChange('province', e.target.value || undefined)}>
                      <option value="">Any</option>
                      {CANADIAN_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <ChevronRight size={14} aria-hidden="true" className="pp-select-chevron" />
                  </div>
                </div>
              )}
              <div className="pp-field">
                <label htmlFor="mf-city">City</label>
                <input id="mf-city" placeholder="Type a city" value={filters.city || ''} onChange={(e) => handleFilterChange('city', e.target.value || undefined)} />
              </div>

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
                  <button type="button" className="pp-nudge" onClick={() => { setSaveError(''); setShowSaveModal(true); }}>
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
                <input id="mf-save-name" placeholder="e.g. Sikh brides in Ontario" value={saveSearchName} onChange={(e) => setSaveSearchName(e.target.value)} />
              </div>
            </div>
            {saveError && (
              <div role="alert" className="community-error" style={{ marginTop: 4 }}>
                <AlertCircle size={15} aria-hidden="true" /> {saveError}
              </div>
            )}
            <button type="button" className="pp-sheet-save" onClick={handleSaveSearch} disabled={savingSearch || !saveSearchName.trim()}>
              {savingSearch ? 'Saving…' : <><Save size={16} aria-hidden="true" /> Save search</>}
            </button>
          </div>
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

/* ========== CARD ========== */
function BrowseCard({ card, score, busy, canAct, onLike, onSave }: {
  card: MatrimonyBrowseCard; score: number | null; busy: boolean; canAct: boolean;
  onLike: () => void; onSave: () => void;
}) {
  const name = displayName(card.full_name, card.display_pref);
  const pic = photoOf(card);
  const tone = score === null ? '' : score >= 80 ? 'is-high' : score >= 60 ? 'is-mid' : '';
  const status = card.my_interest_status;

  return (
    <article className="mt-card">
      <Link href={`/portal/member/matrimony/profile/${card.id}`} className="mt-card-media" aria-label={`View ${name}`}>
        {pic
          ? <img src={pic.url} alt="" aria-hidden="true" loading="lazy" decoding="async" className={pic.blurred ? 'is-blurred' : ''} />
          : <span className="mt-card-initials" aria-hidden="true">{initialsOf(card.full_name)}</span>}
        <span className="mt-card-scrim" aria-hidden="true" />
        <span className="mt-card-top">
          {score !== null && <span className={`mt-score ${tone}`}><Sparkles size={11} aria-hidden="true" /> {score}%</span>}
          {card.incoming_interest_id && <span className="mt-flag"><Heart size={10} aria-hidden="true" /> Likes you</span>}
          {card.is_verified_id && <span className="mt-verified" role="img" aria-label="ID verified"><BadgeCheck size={14} /></span>}
        </span>
        <span className="mt-card-name">
          <strong>{name}, {getAge(card.dob)}</strong>
          <small>{[card.city, card.province].filter(Boolean).join(', ') || 'Canada'}</small>
        </span>
      </Link>
      <div className="mt-card-body">
        <p className="mt-card-line">{[card.occupation, cmToFtIn(card.height_cm)].filter(Boolean).join(' · ') || 'Member'}</p>
        <div className="mt-card-chips">
          {[card.religion, card.mother_tongue].filter(Boolean).map((f) => <span key={f}>{f}</span>)}
        </div>
        {canAct && (
          <div className="mt-card-actions">
            <button
              type="button"
              className={`mt-quick mt-quick--icon ${card.is_shortlisted ? 'is-on' : ''}`}
              aria-pressed={Boolean(card.is_shortlisted)}
              aria-label={card.is_shortlisted ? `Remove ${name} from shortlist` : `Shortlist ${name}`}
              disabled={busy}
              onClick={onSave}
            >
              <Star size={16} aria-hidden="true" fill={card.is_shortlisted ? 'currentColor' : 'none'} />
            </button>
            {status === 'accepted' ? (
              <Link href={`/portal/member/matrimony/profile/${card.id}`} className="mt-status is-matched"><Check size={13} aria-hidden="true" /> Matched</Link>
            ) : status === 'pending' || card.incoming_interest_id && status === 'declined' ? (
              <span className="mt-status is-pending"><Heart size={13} aria-hidden="true" /> Liked</span>
            ) : status === 'declined' ? (
              <span className="mt-status">Declined</span>
            ) : (
              <button type="button" className="mt-quick mt-quick--like" disabled={busy} onClick={onLike} aria-label={card.incoming_interest_id ? `Like ${name} back` : `Like ${name}`}>
                <Heart size={15} aria-hidden="true" fill="currentColor" /> {card.incoming_interest_id ? 'Like back' : 'Like'}
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
