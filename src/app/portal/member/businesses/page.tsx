'use client';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePortal } from '@/context/portal-context';
import { useApp } from '@/context/app-context';
import PortalLoading from '@/components/portal/PortalLoading';
import {
  submitBusinessContactRequest, fetchSavedBusinessIds, toggleSaveBusiness,
} from '@/app/actions/portal';
import {
  Search, Tag, MapPin, Phone, Mail, Globe, X, Building2, Bookmark,
  Check, Star, ChevronRight, Send, AlertCircle, ArrowDownAZ,
} from 'lucide-react';
import { BUSINESS_CATEGORIES, type BusinessContactHelpType } from '@/types';

/**
 * The member business directory. Image-led cards in the home-feed language,
 * filters as a chip rail instead of a select row, and contacting a business
 * happens in a focused bottom sheet (direct rows first, admin help below).
 */

const PILL_BAR: React.CSSProperties = {
  display: 'flex', gap: 4, padding: 4,
  background: 'var(--bg-primary)', borderRadius: 999,
  border: '1px solid rgba(27,67,50,0.08)',
  width: 'fit-content', maxWidth: '100%', overflowX: 'auto',
};

const pill = (on: boolean): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 6,
  minHeight: 44, padding: '0 16px', borderRadius: 999,
  border: 0, cursor: 'pointer', font: 'inherit', fontSize: '0.82rem',
  whiteSpace: 'nowrap', flexShrink: 0,
  background: on ? 'var(--green-950)' : 'none',
  color: on ? '#fff' : 'var(--text-secondary)',
  fontWeight: on ? 700 : 600,
});

const HELP_TYPES: { value: BusinessContactHelpType; label: string }[] = [
  { value: 'introduction', label: 'Introduction to the business' },
  { value: 'quote_support', label: 'Help getting a quote' },
  { value: 'booking_help', label: 'Booking / scheduling help' },
  { value: 'clarification', label: 'Clarification on services' },
  { value: 'other', label: 'Something else' },
];

export default function MemberBusinessDirectory() {
  const { businesses, loading } = usePortal();
  const { profile } = useApp();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [dealsOnly, setDealsOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [sort, setSort] = useState('featured');
  const [toast, setToast] = useState('');

  // Saved businesses live in member_saved_businesses. This used to be local
  // state only, so a bookmark vanished on the next navigation.
  const [savedBiz, setSavedBiz] = useState<string[]>([]);
  const [savingIds, setSavingIds] = useState<string[]>([]);
  const [saveError, setSaveError] = useState('');
  const touchedSaves = useRef(false);

  useEffect(() => {
    fetchSavedBusinessIds().then(result => {
      // Ignore the initial read if the member has already toggled something:
      // it would clobber a bookmark that is already written.
      if (result.ok && !touchedSaves.current) setSavedBiz(result.data);
    });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const setSavedFlag = (id: string, on: boolean) =>
    setSavedBiz(ids => (on ? (ids.includes(id) ? ids : [...ids, id]) : ids.filter(x => x !== id)));

  const handleToggleSave = async (id: string) => {
    if (savingIds.includes(id)) return;
    touchedSaves.current = true;
    setSavingIds(ids => [...ids, id]);
    setSaveError('');

    const wasSaved = savedBiz.includes(id);
    setSavedFlag(id, !wasSaved);

    // The server's answer wins: it is the row that actually exists, and a
    // failed write has to put the bookmark back where it was.
    const result = await toggleSaveBusiness(id);
    setSavedFlag(id, result.ok ? result.data.saved : wasSaved);
    if (!result.ok) setSaveError(result.error);

    setSavingIds(ids => ids.filter(x => x !== id));
  };

  // Contact sheet state
  const [contactSheet, setContactSheet] = useState<string | null>(null);
  const [contactHelpType, setContactHelpType] = useState<BusinessContactHelpType>('introduction');
  const [contactNotes, setContactNotes] = useState('');
  const [contactPref, setContactPref] = useState<'email' | 'phone' | 'portal'>('email');
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const closeContactSheet = () => {
    setContactSheet(null);
    setSubmitError('');
  };

  // The open sheet locks background scroll, same as every other sheet here.
  useEffect(() => {
    if (!contactSheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setContactSheet(null); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [contactSheet]);

  const publicBiz = businesses.filter(b => b.verificationStatus === 'verified');

  // Only offer a category chip where there is something to see behind it.
  const categories = useMemo(
    () => BUSINESS_CATEGORIES.filter(c => publicBiz.some(b => b.category === c)),
    [publicBiz],
  );

  const filtered = useMemo(() => {
    let result = [...publicBiz];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(b => b.name.toLowerCase().includes(q) || b.descriptionShort.toLowerCase().includes(q) || b.category.toLowerCase().includes(q));
    }
    if (category) result = result.filter(b => b.category === category);
    if (dealsOnly) result = result.filter(b => b.hasMemberRate);
    if (savedOnly) result = result.filter(b => savedBiz.includes(b.id));
    if (sort === 'featured') result.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
    else if (sort === 'alpha') result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [publicBiz, search, category, dealsOnly, savedOnly, savedBiz, sort]);

  const savedVisible = publicBiz.filter(b => savedBiz.includes(b.id)).length;

  const sheetBiz = contactSheet ? businesses.find(b => b.id === contactSheet) : null;

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setDealsOnly(false);
    setSavedOnly(false);
  };

  const handleSubmitRequest = async () => {
    if (!sheetBiz || sending) return;

    setSending(true);
    setSubmitError('');

    // The action is called directly rather than through usePortal because the
    // context helper returns void: there was no way to tell a rejected write from
    // a successful one, so the success panel showed either way.
    //
    // member_id is stamped from the session server-side, which is why it is not
    // in the payload. memberName used to be the literal string "Current Member",
    // and that placeholder is what the admin queue displayed for every request.
    const result = await submitBusinessContactRequest({
      businessId: sheetBiz.id,
      businessName: sheetBiz.name,
      memberName: `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim(),
      helpType: contactHelpType,
      preferredContact: contactPref,
      notes: contactNotes,
    });

    setSending(false);

    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }

    closeContactSheet();
    setContactNotes('');
    setToast('Request sent — an admin will connect you');
  };

  // Every hook above has already run, so the early return is safe here. Without
  // it the first paint reads "no business matches", which is not true yet.
  if (loading && businesses.length === 0) return <PortalLoading label="Loading the business directory" />;

  return (
    <div className="hf-page">
      <div className="hf-body" style={{ marginTop: 0 }}>
        {/* ---- Header ---- */}
        <section className="hf-section">
          <div className="hf-section-head">
            <h1 style={{ fontSize: '1.45rem', margin: 0 }}>Businesses</h1>
            <span style={{ fontSize: '0.8rem', fontWeight: 650, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {filtered.length} listing{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
            Verified local businesses, most with a rate kept for members.
          </p>
        </section>

        {/* ---- Search & filters ---- */}
        <section className="hf-section">
          <div className="pp-field" style={{ position: 'relative' }}>
            <Search
              size={16} aria-hidden="true"
              style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <label htmlFor="biz-search" className="sr-only">Search businesses</label>
            <input
              id="biz-search" type="search" value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search a business, service or category"
              style={{ paddingLeft: 40 }}
            />
          </div>

          <div style={PILL_BAR} role="group" aria-label="Filter listings">
            <button
              type="button" style={pill(dealsOnly)} aria-pressed={dealsOnly}
              onClick={() => setDealsOnly(!dealsOnly)}
            >
              <Tag size={14} aria-hidden="true" /> Member deals
            </button>
            <button
              type="button" style={pill(savedOnly)} aria-pressed={savedOnly}
              onClick={() => setSavedOnly(!savedOnly)}
            >
              {/* Counts only listings still in the directory: a saved business that
                  lost its verification is not one the member can open. */}
              <Bookmark size={14} fill={savedOnly ? 'currentColor' : 'none'} aria-hidden="true" /> Saved
              {savedVisible > 0 && ` (${savedVisible})`}
            </button>
            <button
              type="button" style={pill(sort === 'alpha')} aria-pressed={sort === 'alpha'}
              onClick={() => setSort(sort === 'alpha' ? 'featured' : 'alpha')}
            >
              <ArrowDownAZ size={14} aria-hidden="true" /> A to Z
            </button>
          </div>

          {categories.length > 0 && (
            <div style={PILL_BAR} role="group" aria-label="Category">
              <button type="button" style={pill(!category)} aria-pressed={!category} onClick={() => setCategory('')}>
                All
              </button>
              {categories.map(c => (
                <button
                  key={c} type="button" style={pill(category === c)}
                  aria-pressed={category === c} onClick={() => setCategory(category === c ? '' : c)}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {saveError && (
            <div role="alert" className="community-error">
              <AlertCircle size={15} aria-hidden="true" /> {saveError}
            </div>
          )}
        </section>

        {/* ---- Listings ---- */}
        <section className="hf-section">
          {filtered.length === 0 ? (
            <div className="card" style={{ padding: '2.25rem 1.25rem', textAlign: 'center' }}>
              <Building2 size={28} aria-hidden="true" style={{ opacity: 0.35 }} />
              <p style={{ margin: '0.7rem 0 1rem', color: 'var(--text-secondary)' }}>
                {savedOnly && savedVisible === 0
                  ? 'Nothing saved yet. Tap the bookmark on a listing to keep it here.'
                  : 'No business matches these filters yet.'}
              </p>
              <button type="button" className="btn btn-outline" onClick={clearFilters}>
                Show every business
              </button>
            </div>
          ) : (
            <div className="hf-events">
              {filtered.map(biz => {
                const saved = savedBiz.includes(biz.id);
                const busy = savingIds.includes(biz.id);
                const offer = biz.offerBadge || biz.memberRateText;
                return (
                  <div key={biz.id} className="hf-event card">
                    <span className="hf-event-media">
                      {biz.coverImage
                        ? <img src={biz.coverImage} alt="" aria-hidden="true" />
                        : <span className="hf-event-fallback" aria-hidden="true"><Building2 size={28} /></span>}
                      <span className="hf-chip">{biz.category}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleSave(biz.id)}
                        disabled={busy}
                        aria-pressed={saved}
                        aria-label={saved ? `Remove ${biz.name} from saved` : `Save ${biz.name}`}
                        style={{
                          position: 'absolute', top: 10, right: 10,
                          display: 'grid', placeItems: 'center',
                          width: 38, height: 38, borderRadius: '50%',
                          border: 0, background: 'rgba(255,255,255,0.94)',
                          color: saved ? 'var(--primary-700)' : 'var(--gray-500)',
                          cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
                        }}
                      >
                        <Bookmark size={17} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
                      </button>
                    </span>

                    <span className="hf-event-body">
                      <strong>{biz.name}</strong>
                      <small>
                        <MapPin size={12} aria-hidden="true" /> {biz.city}
                        {biz.isFeatured && (
                          <>
                            <Star size={12} aria-hidden="true" style={{ color: 'var(--primary-600)', marginLeft: 4 }} />
                            Featured
                          </>
                        )}
                      </small>
                      <span
                        style={{
                          fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.5,
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}
                      >
                        {biz.descriptionShort}
                      </span>
                      {offer && (
                        <span className="hf-deal"><Tag size={11} aria-hidden="true" /> {offer}</span>
                      )}
                    </span>

                    <div style={{ display: 'flex', gap: 8, padding: '0 1rem 1rem' }}>
                      <Link
                        href={`/businesses/${biz.slug}`}
                        className="btn btn-outline btn-sm"
                        style={{ flex: 1, minHeight: 44 }}
                      >
                        View profile
                      </Link>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1, minHeight: 44 }}
                        onClick={() => setContactSheet(biz.id)}
                      >
                        Contact
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ---- Contact sheet ---- */}
      {contactSheet && sheetBiz && (
        <div className="hf-sheet-scrim" onClick={e => { if (e.target === e.currentTarget) closeContactSheet(); }}>
          <div className="hf-sheet pp-sheet" role="dialog" aria-modal="true" aria-label={`Contact ${sheetBiz.name}`}>
            <div className="hf-sheet-head">
              <h2>{sheetBiz.name}</h2>
              <button type="button" className="portal-sheet-close" onClick={closeContactSheet} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <p className="hf-sheet-sub">Reach them directly, or let an admin make the introduction.</p>

            <div className="pp-groups">
              <section className="pp-group">
                <h2>Contact directly</h2>
                <div className="pp-group-card">
                  {sheetBiz.phone && (
                    <a href={`tel:${sheetBiz.phone}`} className="pp-row">
                      <span className="pp-row-icon"><Phone size={17} /></span>
                      <span className="pp-row-body"><small>Call</small><strong>{sheetBiz.phone}</strong></span>
                      <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
                    </a>
                  )}
                  {sheetBiz.email && (
                    <a href={`mailto:${sheetBiz.email}`} className="pp-row">
                      <span className="pp-row-icon"><Mail size={17} /></span>
                      <span className="pp-row-body"><small>Email</small><strong>{sheetBiz.email}</strong></span>
                      <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
                    </a>
                  )}
                  {sheetBiz.website && (
                    <a href={sheetBiz.website} target="_blank" rel="noopener noreferrer" className="pp-row">
                      <span className="pp-row-icon"><Globe size={17} /></span>
                      <span className="pp-row-body">
                        <small>Website</small>
                        <strong>{sheetBiz.website.replace(/^https?:\/\/(www\.)?/, '')}</strong>
                      </span>
                      <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
                    </a>
                  )}
                  {sheetBiz.contactPerson && (
                    <div className="pp-row pp-row-static">
                      <span className="pp-row-icon"><Building2 size={17} /></span>
                      <span className="pp-row-body"><small>Ask for</small><strong>{sheetBiz.contactPerson}</strong></span>
                    </div>
                  )}
                </div>
              </section>

              <section className="pp-group">
                <h2>Or ask an admin</h2>
                <p className="pp-group-sub">We make the introduction and follow up until you are connected.</p>

                <div className="pp-sheet-fields">
                  <div className="pp-field">
                    <label htmlFor="biz-help">What help do you need?</label>
                    <div className="pp-select">
                      <select
                        id="biz-help" value={contactHelpType}
                        onChange={e => setContactHelpType(e.target.value as BusinessContactHelpType)}
                      >
                        {HELP_TYPES.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                      </select>
                      <ChevronRight size={14} aria-hidden="true" className="pp-select-chevron" />
                    </div>
                  </div>

                  <div className="pp-field">
                    <label htmlFor="biz-pref">How should we reach you?</label>
                    <div className="pp-select">
                      <select
                        id="biz-pref" value={contactPref}
                        onChange={e => setContactPref(e.target.value as 'email' | 'phone' | 'portal')}
                      >
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="portal">Portal message</option>
                      </select>
                      <ChevronRight size={14} aria-hidden="true" className="pp-select-chevron" />
                    </div>
                  </div>

                  <div className="pp-field">
                    <label htmlFor="biz-notes">Notes (optional)</label>
                    <textarea
                      id="biz-notes" rows={3} value={contactNotes}
                      onChange={e => setContactNotes(e.target.value)}
                      placeholder="Anything that helps us introduce you well."
                    />
                  </div>
                </div>

                {submitError && (
                  <div role="alert" className="community-error" style={{ marginBottom: 10 }}>
                    <AlertCircle size={15} aria-hidden="true" /> {submitError}
                  </div>
                )}

                <button
                  type="button" className="pp-sheet-save" style={{ width: '100%' }}
                  onClick={handleSubmitRequest} disabled={sending}
                >
                  {sending ? 'Sending…' : <><Send size={16} aria-hidden="true" /> Send request</>}
                </button>
              </section>
            </div>
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
