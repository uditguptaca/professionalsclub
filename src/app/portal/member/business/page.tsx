'use client';
import React from 'react';
import { upload } from '@vercel/blob/client';
import {
  Building2, Calendar, Tag, CheckCircle2, Clock, Plus, Pencil, Trash2, Upload, Eye,
} from 'lucide-react';
import PortalLoading from '@/components/portal/PortalLoading';
import { useConfirm } from '@/components/portal/confirm';
import { COMMUNITY_CITIES } from '@/lib/cities';
import { readCache, writeCache } from '@/lib/swr-cache';
import {
  fetchBusinessHomeAction, registerBusinessAction, updateMyBusinessAction,
  createOfferAction, updateOfferAction, deleteOfferAction,
  createBusinessEventAction, updateBusinessEventAction, deleteBusinessEventAction,
} from '@/app/actions/business';
import type { BusinessHome, BusinessOffer, BusinessEvent } from '@/server/repos/business';

/**
 * My Business: one screen for a member who runs a business in the community.
 *
 * Three states, decided by the data:
 *   no business  -> the registration form (city-first, mirroring the club's
 *                   city-based structure). Lands in the admin review queue.
 *   pending      -> a status card, plus the page editor and offers so the
 *                   listing is complete the day it is approved. Events stay
 *                   locked until verification (RLS enforces that too).
 *   verified     -> the full console: Page, Offers, Events.
 *
 * Every mutation returns the whole refreshed BusinessHome, so the screen never
 * drifts from the database, and it all writes through the session cache so
 * revisits paint instantly.
 */

const CATEGORIES = [
  'Tax & Accounting', 'Legal Services', 'Immigration Services', 'Real Estate',
  'Mortgage', 'Insurance', 'IT Services', 'Marketing', 'HR & Recruitment',
  'Education / Coaching', 'Health & Wellness', 'Home Services', 'Financial Planning',
  'Notary / Documentation', 'Business Consulting', 'Other',
];

const CACHE_KEY = 'business-home';

const monthDay = (isoDate: string | null): string =>
  isoDate ? new Date(isoDate).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBA';

export default function MyBusinessPage() {
  const confirm = useConfirm();
  const cached = readCache<BusinessHome>(CACHE_KEY);
  const [home, setHome] = React.useState<BusinessHome | undefined>(cached);
  const [loading, setLoading] = React.useState(cached === undefined);
  const [error, setError] = React.useState('');
  const [tab, setTab] = React.useState<'page' | 'offers' | 'events'>('page');
  const [toast, setToast] = React.useState('');

  const apply = (h: BusinessHome) => {
    setHome(h);
    writeCache(CACHE_KEY, h);
  };

  React.useEffect(() => {
    (async () => {
      const r = await fetchBusinessHomeAction();
      if (r.ok) apply(r.data);
      else setError(r.error);
      setLoading(false);
    })();
  }, []);

  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  /** Run a mutation that returns the refreshed home; surface errors inline. */
  const mutate = async (fn: () => Promise<{ ok: true; data: BusinessHome } | { ok: false; error: string }>, done: string) => {
    setError('');
    const r = await fn();
    if (r.ok) {
      apply(r.data);
      setToast(done);
      return true;
    }
    setError(r.error);
    return false;
  };

  if (loading) return <div className="hf-page"><div className="hf-body" style={{ marginTop: 0 }}><PortalLoading label="Loading your business" /></div></div>;

  const business = home?.business ?? null;

  return (
    <div className="hf-page">
      <div className="hf-body" style={{ marginTop: 0 }}>
        <section className="hf-section">
          <div className="hf-section-head">
            <h1 style={{ fontSize: '1.45rem', margin: 0 }}>My Business</h1>
            {business && (
              business.verificationStatus === 'verified'
                ? <span className="bz-status verified"><CheckCircle2 size={13} aria-hidden="true" /> Verified</span>
                : <span className="bz-status pending"><Clock size={13} aria-hidden="true" /> Under review</span>
            )}
          </div>

          {error && <p className="community-error" role="alert">{error}</p>}

          {!business ? (
            <RegisterForm onDone={apply} onError={setError} />
          ) : (
            <>
              {business.verificationStatus !== 'verified' && (
                <div className="bz-card">
                  <strong style={{ color: 'var(--text-primary)' }}>Your registration is with the admins.</strong>
                  <p className="bz-muted" style={{ margin: '0.35rem 0 0' }}>
                    You can finish your page and prepare offers now — everything goes live the
                    moment the club verifies {business.name}. Posting events unlocks then too.
                  </p>
                </div>
              )}

              <div className="bz-tabs" role="tablist" aria-label="Business sections">
                {([['page', 'Page', Building2], ['offers', 'Offers', Tag], ['events', 'Events', Calendar]] as const).map(([key, label, Icon]) => (
                  <button key={key} type="button" role="tab" aria-selected={tab === key}
                    className={`bz-tab${tab === key ? ' is-on' : ''}`} onClick={() => setTab(key)}>
                    <Icon size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 6 }} />
                    {label}{key === 'offers' && home!.offers.length > 0 ? ` (${home!.offers.length})` : ''}{key === 'events' && home!.events.length > 0 ? ` (${home!.events.length})` : ''}
                  </button>
                ))}
              </div>

              {tab === 'page' && <PageEditor business={business} onSave={(data) => mutate(() => updateMyBusinessAction(business.id, data), 'Page saved')} />}
              {tab === 'offers' && <OffersTab businessId={business.id} offers={home!.offers} mutate={mutate} confirm={confirm} />}
              {tab === 'events' && (
                business.verificationStatus === 'verified'
                  ? <EventsTab businessId={business.id} events={home!.events} mutate={mutate} confirm={confirm} />
                  : <p className="bz-muted">Events unlock once your business is verified.</p>
              )}
            </>
          )}
        </section>
      </div>
      {toast && <div className="pp-toast" role="status"><CheckCircle2 size={15} aria-hidden="true" /> {toast}</div>}
    </div>
  );
}

// ---- Registration ---------------------------------------------------------------

function RegisterForm({ onDone, onError }: { onDone: (h: BusinessHome) => void; onError: (e: string) => void }) {
  const [busy, setBusy] = React.useState(false);
  const [form, setForm] = React.useState({
    name: '', category: CATEGORIES[0], city: COMMUNITY_CITIES[0].name,
    descriptionShort: '', phone: '', email: '', website: '',
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    onError('');
    const province = COMMUNITY_CITIES.find((c) => c.name === form.city)?.province ?? '';
    const r = await registerBusinessAction({ ...form, province });
    if (r.ok) {
      const fresh = await fetchBusinessHomeAction();
      if (fresh.ok) onDone(fresh.data);
    } else {
      onError(r.error);
    }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="bz-card">
      <p className="bz-muted" style={{ marginTop: 0 }}>
        List your business with the club: a page members can find, offers for members, and
        your own events. Registrations are reviewed by the admins before going live.
      </p>
      <div className="bz-field">
        <label htmlFor="bz-name">Business name</label>
        <input id="bz-name" value={form.name} onChange={set('name')} required maxLength={120} />
      </div>
      <div className="bz-row">
        <div className="bz-field">
          <label htmlFor="bz-category">Category</label>
          <select id="bz-category" value={form.category} onChange={set('category')}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="bz-field">
          <label htmlFor="bz-city">City</label>
          <select id="bz-city" value={form.city} onChange={set('city')}>
            {COMMUNITY_CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}, {c.province}</option>)}
          </select>
        </div>
      </div>
      <div className="bz-field">
        <label htmlFor="bz-short">What do you do, in a sentence?</label>
        <textarea id="bz-short" value={form.descriptionShort} onChange={set('descriptionShort')} maxLength={280} />
      </div>
      <div className="bz-row">
        <div className="bz-field">
          <label htmlFor="bz-phone">Phone (optional)</label>
          <input id="bz-phone" type="tel" value={form.phone} onChange={set('phone')} />
        </div>
        <div className="bz-field">
          <label htmlFor="bz-email">Business email (optional)</label>
          <input id="bz-email" type="email" value={form.email} onChange={set('email')} />
        </div>
      </div>
      <div className="bz-field">
        <label htmlFor="bz-web">Website (optional)</label>
        <input id="bz-web" type="url" value={form.website} onChange={set('website')} placeholder="https://" />
      </div>
      <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%', justifyContent: 'center', minHeight: 50 }}>
        {busy ? 'Submitting…' : 'Register my business'}
      </button>
    </form>
  );
}

// ---- Page editor ---------------------------------------------------------------

function PageEditor({ business, onSave }: {
  business: NonNullable<BusinessHome['business']>;
  onSave: (data: Record<string, unknown>) => Promise<boolean>;
}) {
  const [busy, setBusy] = React.useState(false);
  const [uploading, setUploading] = React.useState<'logo' | 'cover' | ''>('');
  const [form, setForm] = React.useState({
    name: business.name,
    descriptionShort: business.descriptionShort ?? '',
    descriptionFull: business.descriptionFull ?? '',
    contactPerson: business.contactPerson ?? '',
    phone: business.phone ?? '',
    email: business.email ?? '',
    website: business.website ?? '',
    address: business.address ?? '',
    city: business.city ?? COMMUNITY_CITIES[0].name,
    serviceArea: business.serviceArea ?? '',
    businessHours: business.businessHours ?? '',
    memberRateText: business.memberRateText ?? '',
    offerBadge: business.offerBadge ?? '',
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const pickImage = (kind: 'logo' | 'cover') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setUploading(kind);
      try {
        const blob = await upload(`business/${business.id}/${kind}-${file.name}`, file, {
          access: 'public',
          handleUploadUrl: '/api/community/upload',
        });
        await onSave(kind === 'logo' ? { logo: blob.url } : { coverImage: blob.url });
      } catch {
        // onSave surfaces action failures; this catch covers the upload leg.
      }
      setUploading('');
    };
    input.click();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const province = COMMUNITY_CITIES.find((c) => c.name === form.city)?.province;
    await onSave({ ...form, ...(province ? { province } : {}) });
    setBusy(false);
  };

  return (
    <form onSubmit={submit}>
      <div className="bz-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {business.logo
            ? <img src={business.logo} alt="Business logo" className="bz-logo" />
            : <span className="bz-logo" style={{ display: 'grid', placeItems: 'center' }}><Building2 size={22} aria-hidden="true" /></span>}
          <button type="button" className="bz-upload" onClick={() => pickImage('logo')} disabled={uploading !== ''}>
            <Upload size={14} aria-hidden="true" /> {uploading === 'logo' ? 'Uploading…' : 'Change logo'}
          </button>
          <button type="button" className="bz-upload" onClick={() => pickImage('cover')} disabled={uploading !== ''}>
            <Upload size={14} aria-hidden="true" /> {uploading === 'cover' ? 'Uploading…' : 'Change cover image'}
          </button>
          <a className="bz-upload" href={`/businesses/${business.slug}`} target="_blank" rel="noopener noreferrer">
            <Eye size={14} aria-hidden="true" /> View public page
          </a>
        </div>
        {business.coverImage && <img src={business.coverImage} alt="Cover" className="bz-cover" style={{ marginTop: 12 }} />}
      </div>

      <div className="bz-card">
        <div className="bz-field">
          <label htmlFor="pe-name">Business name</label>
          <input id="pe-name" value={form.name} onChange={set('name')} required maxLength={120} />
        </div>
        <div className="bz-field">
          <label htmlFor="pe-short">Short description (shows on cards)</label>
          <textarea id="pe-short" value={form.descriptionShort} onChange={set('descriptionShort')} maxLength={280} />
        </div>
        <div className="bz-field">
          <label htmlFor="pe-full">Full description (your page)</label>
          <textarea id="pe-full" value={form.descriptionFull} onChange={set('descriptionFull')} maxLength={4000} style={{ minHeight: 140 }} />
        </div>
        <div className="bz-row">
          <div className="bz-field">
            <label htmlFor="pe-city">City</label>
            <select id="pe-city" value={form.city} onChange={set('city')}>
              {COMMUNITY_CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}, {c.province}</option>)}
            </select>
          </div>
          <div className="bz-field">
            <label htmlFor="pe-area">Service area</label>
            <input id="pe-area" value={form.serviceArea} onChange={set('serviceArea')} placeholder="e.g. GTA, or Canada-wide online" />
          </div>
        </div>
        <div className="bz-field">
          <label htmlFor="pe-address">Address (optional)</label>
          <input id="pe-address" value={form.address} onChange={set('address')} />
        </div>
        <div className="bz-row">
          <div className="bz-field">
            <label htmlFor="pe-contact">Contact person</label>
            <input id="pe-contact" value={form.contactPerson} onChange={set('contactPerson')} />
          </div>
          <div className="bz-field">
            <label htmlFor="pe-phone">Phone</label>
            <input id="pe-phone" type="tel" value={form.phone} onChange={set('phone')} />
          </div>
        </div>
        <div className="bz-row">
          <div className="bz-field">
            <label htmlFor="pe-email">Business email</label>
            <input id="pe-email" type="email" value={form.email} onChange={set('email')} />
          </div>
          <div className="bz-field">
            <label htmlFor="pe-web">Website</label>
            <input id="pe-web" type="url" value={form.website} onChange={set('website')} />
          </div>
        </div>
        <div className="bz-field">
          <label htmlFor="pe-hours">Business hours</label>
          <input id="pe-hours" value={form.businessHours} onChange={set('businessHours')} placeholder="e.g. Mon–Fri 9–6" />
        </div>
        <div className="bz-row">
          <div className="bz-field">
            <label htmlFor="pe-rate">Member rate (one line)</label>
            <input id="pe-rate" value={form.memberRateText} onChange={set('memberRateText')} maxLength={120} placeholder="e.g. 15% off for club members" />
          </div>
          <div className="bz-field">
            <label htmlFor="pe-badge">Badge on cards</label>
            <input id="pe-badge" value={form.offerBadge} onChange={set('offerBadge')} maxLength={40} placeholder="e.g. Member offer" />
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%', justifyContent: 'center', minHeight: 50 }}>
          {busy ? 'Saving…' : 'Save page'}
        </button>
      </div>
    </form>
  );
}

// ---- Offers ---------------------------------------------------------------------

type Mutate = (fn: () => Promise<{ ok: true; data: BusinessHome } | { ok: false; error: string }>, done: string) => Promise<boolean>;

function OffersTab({ businessId, offers, mutate, confirm }: {
  businessId: string; offers: BusinessOffer[]; mutate: Mutate;
  confirm: (opts: { title: string; message: string; confirmLabel: string }) => Promise<boolean>;
}) {
  const [editing, setEditing] = React.useState<BusinessOffer | 'new' | null>(null);

  if (editing) {
    const offer = editing === 'new' ? null : editing;
    return (
      <OfferForm
        offer={offer}
        onCancel={() => setEditing(null)}
        onSave={async (data) => {
          const ok = await mutate(
            () => (offer ? updateOfferAction(offer.id, data) : createOfferAction(businessId, data)),
            offer ? 'Offer saved' : 'Offer created'
          );
          if (ok) setEditing(null);
        }}
      />
    );
  }

  return (
    <>
      <button type="button" className="btn btn-primary" style={{ minHeight: 46 }} onClick={() => setEditing('new')}>
        <Plus size={15} aria-hidden="true" /> New offer
      </button>
      {offers.length === 0 && <p className="bz-muted" style={{ marginTop: 12 }}>No offers yet. A member offer is the fastest way onto members&apos; home screens.</p>}
      {offers.map((o) => (
        <div key={o.id} className="bz-card" style={{ marginTop: 12 }}>
          <div className="bz-card-head">
            <strong>{o.title}</strong>
            <span className={`bz-status ${o.isActive ? 'verified' : 'pending'}`}>{o.isActive ? 'Active' : 'Paused'}</span>
          </div>
          {o.description && <p className="bz-muted" style={{ margin: '0.4rem 0 0.6rem' }}>{o.description}</p>}
          {o.validUntil && <p className="bz-muted" style={{ margin: '0 0 0.6rem' }}>Valid until {monthDay(o.validUntil)}</p>}
          <div className="bz-actions">
            <button type="button" className="bz-upload" onClick={() => setEditing(o)}><Pencil size={13} aria-hidden="true" /> Edit</button>
            <button type="button" className="bz-upload"
              onClick={() => void mutate(() => updateOfferAction(o.id, { isActive: !o.isActive }), o.isActive ? 'Offer paused' : 'Offer activated')}>
              {o.isActive ? 'Pause' : 'Activate'}
            </button>
            <button type="button" className="bz-upload" onClick={async () => {
              if (await confirm({ title: 'Remove this offer?', message: `"${o.title}" disappears for members immediately.`, confirmLabel: 'Remove' })) {
                void mutate(() => deleteOfferAction(o.id), 'Offer removed');
              }
            }}><Trash2 size={13} aria-hidden="true" /> Remove</button>
          </div>
        </div>
      ))}
    </>
  );
}

function OfferForm({ offer, onSave, onCancel }: {
  offer: BusinessOffer | null;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [form, setForm] = React.useState({
    title: offer?.title ?? '',
    description: offer?.description ?? '',
    validUntil: offer?.validUntil ? offer.validUntil.slice(0, 10) : '',
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form className="bz-card" onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      await onSave({ title: form.title, description: form.description, validUntil: form.validUntil || null });
      setBusy(false);
    }}>
      <div className="bz-field">
        <label htmlFor="of-title">Offer title</label>
        <input id="of-title" value={form.title} onChange={set('title')} required maxLength={120} placeholder="e.g. 15% off tax filing for members" />
      </div>
      <div className="bz-field">
        <label htmlFor="of-desc">Details</label>
        <textarea id="of-desc" value={form.description} onChange={set('description')} maxLength={2000} />
      </div>
      <div className="bz-field">
        <label htmlFor="of-until">Valid until (optional)</label>
        <input id="of-until" type="date" value={form.validUntil} onChange={set('validUntil')} />
      </div>
      <div className="bz-actions">
        <button type="submit" className="btn btn-primary" disabled={busy} style={{ minHeight: 46 }}>
          {busy ? 'Saving…' : offer ? 'Save offer' : 'Create offer'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} style={{ minHeight: 46 }}>Cancel</button>
      </div>
    </form>
  );
}

// ---- Events ---------------------------------------------------------------------

function EventsTab({ businessId, events, mutate, confirm }: {
  businessId: string; events: BusinessEvent[]; mutate: Mutate;
  confirm: (opts: { title: string; message: string; confirmLabel: string }) => Promise<boolean>;
}) {
  const [editing, setEditing] = React.useState<BusinessEvent | 'new' | null>(null);

  if (editing) {
    const event = editing === 'new' ? null : editing;
    return (
      <EventForm
        event={event}
        onCancel={() => setEditing(null)}
        onSave={async (data) => {
          const ok = await mutate(
            () => (event ? updateBusinessEventAction(event.id, data) : createBusinessEventAction(businessId, data)),
            event ? 'Event saved' : 'Event published'
          );
          if (ok) setEditing(null);
        }}
      />
    );
  }

  return (
    <>
      <button type="button" className="btn btn-primary" style={{ minHeight: 46 }} onClick={() => setEditing('new')}>
        <Plus size={15} aria-hidden="true" /> New event
      </button>
      {events.length === 0 && <p className="bz-muted" style={{ marginTop: 12 }}>No events yet. Published events appear in every member&apos;s Events tab, your city first.</p>}
      {events.map((ev) => (
        <div key={ev.id} className="bz-card" style={{ marginTop: 12 }}>
          <div className="bz-card-head">
            <strong>{ev.title}</strong>
            <span className={`bz-status ${ev.isPublished ? 'verified' : 'pending'}`}>{ev.isPublished ? 'Published' : 'Draft'}</span>
          </div>
          <p className="bz-muted" style={{ margin: '0.4rem 0 0.6rem' }}>
            {monthDay(ev.date)}{ev.time ? ` · ${ev.time}` : ''}{ev.location ? ` · ${ev.location}` : ''} · {ev.going} going
          </p>
          <div className="bz-actions">
            <button type="button" className="bz-upload" onClick={() => setEditing(ev)}><Pencil size={13} aria-hidden="true" /> Edit</button>
            <button type="button" className="bz-upload"
              onClick={() => void mutate(() => updateBusinessEventAction(ev.id, { isPublished: !ev.isPublished }), ev.isPublished ? 'Event unpublished' : 'Event published')}>
              {ev.isPublished ? 'Unpublish' : 'Publish'}
            </button>
            <button type="button" className="bz-upload" onClick={async () => {
              if (await confirm({ title: 'Delete this event?', message: `"${ev.title}" and its RSVPs are removed permanently.`, confirmLabel: 'Delete' })) {
                void mutate(() => deleteBusinessEventAction(ev.id), 'Event deleted');
              }
            }}><Trash2 size={13} aria-hidden="true" /> Delete</button>
          </div>
        </div>
      ))}
    </>
  );
}

function EventForm({ event, onSave, onCancel }: {
  event: BusinessEvent | null;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [form, setForm] = React.useState({
    title: event?.title ?? '',
    description: event?.description ?? '',
    date: event?.date ? event.date.slice(0, 10) : '',
    time: event?.time ?? '',
    location: event?.location ?? '',
    eventType: event?.eventType ?? 'in_person',
    capacity: event?.capacity ? String(event.capacity) : '',
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form className="bz-card" onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      await onSave({
        title: form.title,
        description: form.description,
        date: form.date || null,
        time: form.time || null,
        location: form.location,
        eventType: form.eventType,
        capacity: form.capacity ? Number(form.capacity) : 0,
        isPublished: true,
      });
      setBusy(false);
    }}>
      <div className="bz-field">
        <label htmlFor="ev-title">Event title</label>
        <input id="ev-title" value={form.title} onChange={set('title')} required maxLength={140} />
      </div>
      <div className="bz-field">
        <label htmlFor="ev-desc">Description</label>
        <textarea id="ev-desc" value={form.description} onChange={set('description')} maxLength={4000} />
      </div>
      <div className="bz-row">
        <div className="bz-field">
          <label htmlFor="ev-date">Date</label>
          <input id="ev-date" type="date" value={form.date} onChange={set('date')} required />
        </div>
        <div className="bz-field">
          <label htmlFor="ev-time">Time (optional)</label>
          <input id="ev-time" value={form.time} onChange={set('time')} placeholder="e.g. 6:30 PM" />
        </div>
      </div>
      <div className="bz-field">
        <label htmlFor="ev-loc">Location (include the city so members find it)</label>
        <input id="ev-loc" value={form.location} onChange={set('location')} required placeholder="e.g. 123 King St W, Toronto" />
      </div>
      <div className="bz-row">
        <div className="bz-field">
          <label htmlFor="ev-type">Format</label>
          <select id="ev-type" value={form.eventType} onChange={set('eventType')}>
            <option value="in_person">In person</option>
            <option value="virtual">Virtual</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
        <div className="bz-field">
          <label htmlFor="ev-cap">Capacity (0 = unlimited)</label>
          <input id="ev-cap" type="number" min={0} value={form.capacity} onChange={set('capacity')} />
        </div>
      </div>
      <div className="bz-actions">
        <button type="submit" className="btn btn-primary" disabled={busy} style={{ minHeight: 46 }}>
          {busy ? 'Saving…' : event ? 'Save event' : 'Publish event'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} style={{ minHeight: 46 }}>Cancel</button>
      </div>
    </form>
  );
}
