'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePortal } from '@/context/portal-context';
import { useApp } from '@/context/app-context';
import {
  Search, ShieldCheck, Star, Tag, MapPin, Phone, Mail, Globe,
  ArrowRight, CheckCircle, X, ChevronDown, Building2, Bookmark,
} from 'lucide-react';
import { BUSINESS_CATEGORIES, type BusinessContactHelpType } from '@/types';

export default function MemberBusinessDirectory() {
  const { businesses, addBusinessContactRequest } = usePortal();
  const { currentUserId } = useApp();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [dealsOnly, setDealsOnly] = useState(false);
  const [sort, setSort] = useState('featured');
  const [savedBiz, setSavedBiz] = useState<string[]>([]);

  // Contact modal state
  const [contactModal, setContactModal] = useState<string | null>(null);
  const [contactHelpType, setContactHelpType] = useState<BusinessContactHelpType>('introduction');
  const [contactNotes, setContactNotes] = useState('');
  const [contactPref, setContactPref] = useState<'email' | 'phone' | 'portal'>('email');
  const [submitted, setSubmitted] = useState(false);

  const publicBiz = businesses.filter(b => b.verificationStatus === 'verified');

  const filtered = useMemo(() => {
    let result = [...publicBiz];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(b => b.name.toLowerCase().includes(q) || b.descriptionShort.toLowerCase().includes(q) || b.category.toLowerCase().includes(q));
    }
    if (category) result = result.filter(b => b.category === category);
    if (dealsOnly) result = result.filter(b => b.hasMemberRate);
    if (sort === 'featured') result.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
    else if (sort === 'alpha') result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [publicBiz, search, category, dealsOnly, sort]);

  const modalBiz = contactModal ? businesses.find(b => b.id === contactModal) : null;

  const handleSubmitRequest = () => {
    if (!modalBiz) return;
    addBusinessContactRequest({
      businessId: modalBiz.id,
      businessName: modalBiz.name,
      memberId: currentUserId || 'm1',
      memberName: 'Current Member',
      helpType: contactHelpType,
      preferredContact: contactPref,
      notes: contactNotes,
    });
    setSubmitted(true);
    setTimeout(() => {
      setContactModal(null);
      setSubmitted(false);
      setContactNotes('');
    }, 2000);
  };

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-display font-bold mb-2">Business Directory</h1>
        <p className="text-secondary">Discover verified local businesses with exclusive member benefits.</p>
      </div>

      {/* Filters */}
      <div className="biz-filter-bar">
        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input type="text" placeholder="Search businesses..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36, width: '100%', padding: '9px 14px 9px 36px', border: '1.5px solid var(--gray-200)', borderRadius: 10, fontSize: '0.82rem', outline: 'none', fontFamily: 'var(--font-sans)' }}
          />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {BUSINESS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button type="button" className={`biz-filter-toggle ${dealsOnly ? 'active' : ''}`} onClick={() => setDealsOnly(!dealsOnly)}>
          <Tag size={13} /> Member Deals
        </button>
        <select value={sort} onChange={e => setSort(e.target.value)}>
          <option value="featured">Featured First</option>
          <option value="alpha">A – Z</option>
        </select>
        <div className="biz-results-count">{filtered.length} business{filtered.length !== 1 ? 'es' : ''}</div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="biz-empty"><h3>No businesses match your filters</h3><p>Try adjusting your search.</p></div>
      ) : (
        <div className="biz-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          {filtered.map(biz => (
            <div key={biz.id} className="biz-card" style={{ cursor: 'default' }}>
              <div className="biz-card-image">
                {biz.coverImage && <img src={biz.coverImage} alt={biz.name} />}
                <div className="biz-card-badges">
                  {biz.verificationStatus === 'verified' && <span className="biz-badge biz-badge-verified"><ShieldCheck size={10} /> Verified</span>}
                  {biz.isFeatured && <span className="biz-badge biz-badge-featured"><Star size={10} /> Featured</span>}
                  {biz.hasMemberRate && <span className="biz-badge biz-badge-deal"><Tag size={10} /> Member Rate</span>}
                </div>
                <button
                  type="button"
                  onClick={() => setSavedBiz(prev => prev.includes(biz.id) ? prev.filter(x => x !== biz.id) : [...prev, biz.id])}
                  style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: savedBiz.includes(biz.id) ? 'var(--primary-600)' : 'var(--gray-400)' }}
                >
                  <Bookmark size={16} fill={savedBiz.includes(biz.id) ? 'currentColor' : 'none'} />
                </button>
              </div>
              <div className="biz-card-body">
                <div className="biz-card-category">{biz.category}</div>
                <div className="biz-card-name">{biz.name}</div>
                <div className="biz-card-desc">{biz.descriptionShort}</div>
                {biz.offerBadge && <div className="biz-card-offer"><Tag size={12} /> {biz.offerBadge}</div>}
                <div className="biz-card-meta">
                  <span><MapPin size={12} /> {biz.city}</span>
                  <span>•</span>
                  <span>{biz.contactPerson}</span>
                </div>
              </div>
              <div className="biz-card-actions">
                <Link href={`/businesses/${biz.slug}`} className="btn btn-ghost" style={{ flex: 1, textAlign: 'center', fontSize: '0.78rem' }}>
                  View Profile
                </Link>
                <button type="button" className="btn btn-primary" style={{ flex: 1, fontSize: '0.78rem' }} onClick={() => setContactModal(biz.id)}>
                  Contact <ArrowRight size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contact Modal */}
      {contactModal && modalBiz && (
        <div className="biz-contact-modal-overlay" onClick={() => { setContactModal(null); setSubmitted(false); }}>
          <div className="biz-contact-modal" onClick={e => e.stopPropagation()}>
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <CheckCircle size={48} style={{ color: 'var(--success-600)', marginBottom: 16 }} />
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Request Sent!</h2>
                <p>Our admin team will connect you with {modalBiz.name} shortly.</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2>Contact {modalBiz.name}</h2>
                    <p>Choose how you&rsquo;d like to connect.</p>
                  </div>
                  <button type="button" onClick={() => setContactModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}><X size={20} /></button>
                </div>

                {/* Path A: Direct */}
                <div style={{ padding: 16, borderRadius: 12, background: 'var(--gray-50)', border: '1px solid var(--gray-200)', marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 10 }}>📞 Contact Directly</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <a href={`tel:${modalBiz.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--primary-600)', textDecoration: 'none', fontWeight: 500 }}><Phone size={14} /> {modalBiz.phone}</a>
                    <a href={`mailto:${modalBiz.email}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--primary-600)', textDecoration: 'none', fontWeight: 500 }}><Mail size={14} /> {modalBiz.email}</a>
                    {modalBiz.website && <a href={modalBiz.website} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--primary-600)', textDecoration: 'none', fontWeight: 500 }}><Globe size={14} /> Visit Website</a>}
                  </div>
                </div>

                {/* Path B: Admin Assisted */}
                <div style={{ padding: 16, borderRadius: 12, background: 'rgba(0,103,165,0.04)', border: '1px solid rgba(0,103,165,0.12)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 10 }}>🤝 Ask Admin to Help Connect</div>
                  <div className="form-field" style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray-700)' }}>What help do you need?</label>
                    <select className="form-input" value={contactHelpType} onChange={e => setContactHelpType(e.target.value as BusinessContactHelpType)} style={{ fontSize: '0.82rem' }}>
                      <option value="introduction">Introduction to the business</option>
                      <option value="quote_support">Help getting a quote</option>
                      <option value="booking_help">Booking / scheduling help</option>
                      <option value="clarification">Need clarification on services</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="form-field" style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray-700)' }}>Preferred contact method</label>
                    <select className="form-input" value={contactPref} onChange={e => setContactPref(e.target.value as 'email' | 'phone' | 'portal')} style={{ fontSize: '0.82rem' }}>
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="portal">Portal Message</option>
                    </select>
                  </div>
                  <div className="form-field" style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray-700)' }}>Notes (optional)</label>
                    <textarea className="form-input form-textarea" placeholder="Tell us more about what you need..." value={contactNotes} onChange={e => setContactNotes(e.target.value)} rows={2} style={{ fontSize: '0.82rem' }} />
                  </div>
                  <button type="button" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleSubmitRequest}>
                    <CheckCircle size={16} /> Submit Request
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
