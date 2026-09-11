'use client';
import React from 'react';
import { upload } from '@vercel/blob/client';
import {
  Building2, Calendar, Tag, Ticket, CheckCircle2, Clock, Plus, Pencil, Trash2,
  Upload, Eye, X, AlertCircle, ScanLine, Loader2,
} from 'lucide-react';
import PortalLoading from '@/components/portal/PortalLoading';
import EventEditor from '@/components/portal/EventEditor';
import { useConfirm } from '@/components/portal/confirm';
import { COMMUNITY_CITIES } from '@/lib/cities';
import { readCache, writeCache } from '@/lib/swr-cache';
import {
  fetchBusinessHomeAction, updateMyBusinessAction,
  createOfferAction, updateOfferAction, deleteOfferAction,
  createCouponAction, updateCouponAction, deleteCouponAction, redeemCodeAction,
  createBusinessEventAction, updateBusinessEventAction, deleteBusinessEventAction,
} from '@/app/actions/business';
import type {
  BusinessHome, BusinessOffer, BusinessEvent, BusinessCoupon, RedeemOutcome,
} from '@/server/repos/business';

/**
 * The whole business console, in one component mounted from two routes.
 *
 * An invited business account signs in at /portal/business; a member who
 * registered a listing before invites existed keeps /portal/member/business.
 * Both are the same person doing the same job, so they get the same screen -
 * two copies would have drifted the first time a field was added.
 *
 * Five tabs, in the order the work actually happens: the page members read,
 * the offers and coupons that bring them in, the events, and the till where a
 * code gets spent.
 */

const CACHE_KEY = 'business-home';

const CATEGORIES = [
  'Tax & Accounting', 'Legal Services', 'Immigration Services', 'Real Estate',
  'Mortgage', 'Insurance', 'IT Services', 'Marketing', 'HR & Recruitment',
  'Education / Coaching', 'Health & Wellness', 'Home Services', 'Financial Planning',
  'Notary / Documentation', 'Business Consulting', 'Other',
];

/** `businesses.logo` is free text: usually initials, sometimes an image URL. */
const isImage = (logo: string) => /^(https?:\/\/|\/)/.test(logo);

const monthDay = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBA';

const money = (cents: number, currency = 'CAD') =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency, minimumFractionDigits: 0 })
    .format(cents / 100);

/** "$10 off", "15% off", "Free gift" - the same words members will read. */
export const couponValue = (c: Pick<BusinessCoupon, 'discountKind' | 'percentOff' | 'amountOffCents' | 'currency'>): string => {
  if (c.discountKind === 'percent') return `${c.percentOff ?? 0}% off`;
  if (c.discountKind === 'amount') return `${money(c.amountOffCents ?? 0, c.currency)} off`;
  return 'Free item';
};

type Mutate = (
  fn: () => Promise<{ ok: true; data: BusinessHome } | { ok: false; error: string }>,
  done: string
) => Promise<boolean>;

type Tab = 'page' | 'offers' | 'coupons' | 'events' | 'till';

export default function BusinessConsole({
  heading = 'My Business',
  emptyState,
}: {
  heading?: string;
  /** What to show when this account has no business attached. */
  emptyState?: React.ReactNode;
}) {
  const confirm = useConfirm();
  const cached = readCache<BusinessHome>(CACHE_KEY);
  const [home, setHome] = React.useState<BusinessHome | undefined>(cached);
  const [loading, setLoading] = React.useState(cached === undefined);
  const [error, setError] = React.useState('');
  const [tab, setTab] = React.useState<Tab>('page');
  const [toast, setToast] = React.useState('');

  const apply = (h: BusinessHome) => { setHome(h); writeCache(CACHE_KEY, h); };

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

  const mutate: Mutate = async (fn, done) => {
    setError('');
    const r = await fn();
    if (r.ok) { apply(r.data); setToast(done); return true; }
    setError(r.error);
    return false;
  };

  if (loading) {
    return (
      <div className="hf-page"><div className="hf-body" style={{ marginTop: 0 }}>
        <PortalLoading label="Loading your business" />
      </div></div>
    );
  }

  const business = home?.business ?? null;
  const verified = business?.verificationStatus === 'verified';

  const TABS: [Tab, string, typeof Building2, number][] = [
    ['page', 'Page', Building2, 0],
    ['offers', 'Offers', Tag, home?.offers.length ?? 0],
    ['coupons', 'Coupons', Ticket, home?.coupons.length ?? 0],
    ['events', 'Events', Calendar, home?.events.length ?? 0],
    ['till', 'Redeem', ScanLine, 0],
  ];

  return (
    <div className="hf-page">
      <div className="hf-body" style={{ marginTop: 0 }}>
        <section className="hf-section">
          <div className="hf-section-head">
            <h1 style={{ fontSize: '1.45rem', margin: 0 }}>{heading}</h1>
            {business && (
              verified
                ? <span className="bz-status verified"><CheckCircle2 size={13} aria-hidden="true" /> Verified</span>
                : <span className="bz-status pending"><Clock size={13} aria-hidden="true" /> Under review</span>
            )}
          </div>

          {error && <p className="community-error" role="alert"><AlertCircle size={14} aria-hidden="true" /> {error}</p>}

          {!business ? (
            emptyState ?? (
              <div className="bz-card">
                <strong style={{ color: 'var(--text-primary)' }}>No listing is attached to this login yet.</strong>
                <p className="bz-muted" style={{ margin: '0.35rem 0 0' }}>
                  Ask the club team to connect your business, and this page becomes your console.
                </p>
              </div>
            )
          ) : (
            <>
              {!verified && (
                <div className="bz-card">
                  <strong style={{ color: 'var(--text-primary)' }}>Your listing is with the admins.</strong>
                  <p className="bz-muted" style={{ margin: '0.35rem 0 0' }}>
                    Finish your page and prepare offers now - everything goes live the moment the
                    club verifies {business.name}. Coupons and events unlock then too.
                  </p>
                </div>
              )}

              <div className="bz-tabs" role="tablist" aria-label="Business sections">
                {TABS.map(([key, label, Icon, count]) => (
                  <button
                    key={key} type="button" role="tab" aria-selected={tab === key}
                    className={`bz-tab${tab === key ? ' is-on' : ''}`}
                    onClick={() => setTab(key)}
                  >
                    <Icon size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 6 }} />
                    {label}{count > 0 ? ` (${count})` : ''}
                  </button>
                ))}
              </div>

              {tab === 'page' && (
                <PageEditor
                  business={business}
                  onSave={(data) => mutate(() => updateMyBusinessAction(business.id, data), 'Page saved')}
                />
              )}

              {tab === 'offers' && (
                <OffersTab businessId={business.id} offers={home!.offers} mutate={mutate} confirm={confirm} />
              )}

              {tab === 'coupons' && (
                verified
                  ? <CouponsTab businessId={business.id} coupons={home!.coupons} mutate={mutate} confirm={confirm} />
                  : <p className="bz-muted">Coupons unlock once your business is verified.</p>
              )}

              {tab === 'events' && (
                verified
                  ? <EventsTab businessId={business.id} events={home!.events} mutate={mutate} confirm={confirm} />
                  : <p className="bz-muted">Events unlock once your business is verified.</p>
              )}

              {tab === 'till' && <RedeemTab />}
            </>
          )}
        </section>
      </div>
      {toast && <div className="pp-toast" role="status"><CheckCircle2 size={15} aria-hidden="true" /> {toast}</div>}
    </div>
  );
}

// ---- Shared bits ----------------------------------------------------------------

/** One image, uploaded straight to blob storage and handed back as a URL. */
function useImagePicker() {
  const [busy, setBusy] = React.useState(false);

  const pick = (prefix: string, onDone: (url: string) => void) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setBusy(true);
      try {
        const blob = await upload(`${prefix}/${file.name}`, file, {
          access: 'public',
          handleUploadUrl: '/api/community/upload',
        });
        onDone(blob.url);
      } catch {
        // The caller surfaces save failures; this covers the upload leg only.
      }
      setBusy(false);
    };
    input.click();
  };

  return { pick, busy };
}

const Field = ({ label, htmlFor, hint, children }: {
  label: string; htmlFor: string; hint?: string; children: React.ReactNode;
}) => (
  <div className="bz-field">
    <label htmlFor={htmlFor}>{label}</label>
    {children}
    {hint && <p className="bz-muted" style={{ margin: '0.3rem 0 0', fontSize: '0.78rem' }}>{hint}</p>}
  </div>
);

// ---- Page editor ----------------------------------------------------------------

function PageEditor({ business, onSave }: {
  business: NonNullable<BusinessHome['business']>;
  onSave: (data: Record<string, unknown>) => Promise<boolean>;
}) {
  const [busy, setBusy] = React.useState(false);
  const { pick, busy: uploading } = useImagePicker();
  const [form, setForm] = React.useState({
    name: business.name,
    category: business.category ?? CATEGORIES[0],
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

  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      const province = COMMUNITY_CITIES.find((c) => c.name === form.city)?.province;
      await onSave({ ...form, ...(province ? { province } : {}) });
      setBusy(false);
    }}>
      <div className="bz-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {business.logo && isImage(business.logo)
            ? <img src={business.logo} alt="Business logo" className="bz-logo" />
            : (
              <span className="bz-logo" style={{ display: 'grid', placeItems: 'center', fontWeight: 800 }}>
                {business.logo?.trim() || <Building2 size={22} aria-hidden="true" />}
              </span>
            )}
          <button type="button" className="bz-upload" disabled={uploading}
            onClick={() => pick(`business/${business.id}/logo`, (url) => void onSave({ logo: url }))}>
            <Upload size={14} aria-hidden="true" /> {uploading ? 'Uploading…' : 'Change logo'}
          </button>
          <button type="button" className="bz-upload" disabled={uploading}
            onClick={() => pick(`business/${business.id}/cover`, (url) => void onSave({ coverImage: url }))}>
            <Upload size={14} aria-hidden="true" /> Change cover image
          </button>
          <a className="bz-upload" href={`/businesses/${business.slug}`} target="_blank" rel="noopener noreferrer">
            <Eye size={14} aria-hidden="true" /> View public page
          </a>
        </div>
        {business.coverImage && <img src={business.coverImage} alt="Cover" className="bz-cover" style={{ marginTop: 12 }} />}
      </div>

      <div className="bz-card">
        <Field label="Business name" htmlFor="pe-name">
          <input id="pe-name" value={form.name} onChange={set('name')} required maxLength={120} />
        </Field>
        <Field label="Category" htmlFor="pe-cat">
          <select id="pe-cat" value={form.category} onChange={set('category')}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            {!CATEGORIES.includes(form.category) && <option value={form.category}>{form.category}</option>}
          </select>
        </Field>
        <Field label="Short description (shows on cards)" htmlFor="pe-short">
          <textarea id="pe-short" value={form.descriptionShort} onChange={set('descriptionShort')} maxLength={280} />
        </Field>
        <Field label="Full description (your page)" htmlFor="pe-full">
          <textarea id="pe-full" value={form.descriptionFull} onChange={set('descriptionFull')} maxLength={4000} style={{ minHeight: 140 }} />
        </Field>
        <div className="bz-row">
          <Field label="City" htmlFor="pe-city">
            <select id="pe-city" value={form.city} onChange={set('city')}>
              {COMMUNITY_CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}, {c.province}</option>)}
              {!COMMUNITY_CITIES.some((c) => c.name === form.city) && <option value={form.city}>{form.city}</option>}
            </select>
          </Field>
          <Field label="Service area" htmlFor="pe-area">
            <input id="pe-area" value={form.serviceArea} onChange={set('serviceArea')} placeholder="e.g. GTA, or Canada-wide online" />
          </Field>
        </div>
        <Field label="Address (optional)" htmlFor="pe-address">
          <input id="pe-address" value={form.address} onChange={set('address')} />
        </Field>
        <div className="bz-row">
          <Field label="Contact person" htmlFor="pe-contact">
            <input id="pe-contact" value={form.contactPerson} onChange={set('contactPerson')} />
          </Field>
          <Field label="Phone" htmlFor="pe-phone">
            <input id="pe-phone" type="tel" value={form.phone} onChange={set('phone')} />
          </Field>
        </div>
        <div className="bz-row">
          <Field label="Email" htmlFor="pe-email">
            <input id="pe-email" type="email" value={form.email} onChange={set('email')} />
          </Field>
          <Field label="Website" htmlFor="pe-web">
            <input id="pe-web" type="url" value={form.website} onChange={set('website')} placeholder="https://" />
          </Field>
        </div>
        <Field label="Opening hours" htmlFor="pe-hours">
          <input id="pe-hours" value={form.businessHours} onChange={set('businessHours')} placeholder="e.g. Mon-Fri 9-6, Sat 10-2" />
        </Field>
        <Field label="Member rate, in a sentence" htmlFor="pe-rate"
          hint="Shown on your card. Real discounts live in Coupons, where members can claim them.">
          <input id="pe-rate" value={form.memberRateText} onChange={set('memberRateText')} maxLength={160} />
        </Field>
      </div>

      <button type="submit" className="btn btn-primary" disabled={busy}
        style={{ minHeight: 48, width: '100%', justifyContent: 'center' }}>
        {busy ? 'Saving…' : 'Save page'}
      </button>
    </form>
  );
}

// ---- Offers ---------------------------------------------------------------------

function OffersTab({ businessId, offers, mutate, confirm }: {
  businessId: string; offers: BusinessOffer[]; mutate: Mutate;
  confirm: (o: { title: string; message: string; confirmLabel: string }) => Promise<boolean>;
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
      <p className="bz-muted" style={{ marginTop: 0 }}>
        An offer is an announcement members read on your page. For something they can
        claim and you can scan at the counter, use Coupons.
      </p>
      <button type="button" className="btn btn-primary" style={{ minHeight: 46 }} onClick={() => setEditing('new')}>
        <Plus size={15} aria-hidden="true" /> New offer
      </button>
      {offers.length === 0 && <p className="bz-muted" style={{ marginTop: 12 }}>No offers yet.</p>}
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
      <Field label="Offer title" htmlFor="of-title">
        <input id="of-title" value={form.title} onChange={set('title')} required maxLength={120}
          placeholder="e.g. 15% off tax filing for members" />
      </Field>
      <Field label="Details" htmlFor="of-desc">
        <textarea id="of-desc" value={form.description} onChange={set('description')} maxLength={2000} />
      </Field>
      <Field label="Valid until (optional)" htmlFor="of-until">
        <input id="of-until" type="date" value={form.validUntil} onChange={set('validUntil')} />
      </Field>
      <div className="bz-actions">
        <button type="submit" className="btn btn-primary" disabled={busy} style={{ minHeight: 46 }}>
          {busy ? 'Saving…' : offer ? 'Save offer' : 'Create offer'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} style={{ minHeight: 46 }}>Cancel</button>
      </div>
    </form>
  );
}

// ---- Coupons --------------------------------------------------------------------

function CouponsTab({ businessId, coupons, mutate, confirm }: {
  businessId: string; coupons: BusinessCoupon[]; mutate: Mutate;
  confirm: (o: { title: string; message: string; confirmLabel: string }) => Promise<boolean>;
}) {
  const [editing, setEditing] = React.useState<BusinessCoupon | 'new' | null>(null);

  if (editing) {
    const coupon = editing === 'new' ? null : editing;
    return (
      <CouponForm
        coupon={coupon}
        businessId={businessId}
        onCancel={() => setEditing(null)}
        onSave={async (data) => {
          const ok = await mutate(
            () => (coupon ? updateCouponAction(coupon.id, data) : createCouponAction(businessId, data)),
            coupon ? 'Coupon saved' : 'Coupon published'
          );
          if (ok) setEditing(null);
        }}
      />
    );
  }

  return (
    <>
      <p className="bz-muted" style={{ marginTop: 0 }}>
        A coupon is claimed in the app and spent at your counter. Members see a one-time
        code; you type it into Redeem and it cannot be used again.
      </p>
      <button type="button" className="btn btn-primary" style={{ minHeight: 46 }} onClick={() => setEditing('new')}>
        <Plus size={15} aria-hidden="true" /> New coupon
      </button>

      {coupons.length === 0 && (
        <p className="bz-muted" style={{ marginTop: 12 }}>
          No coupons yet. Members look here first, and a clear one brings people in the door.
        </p>
      )}

      {coupons.map((c) => {
        const live = c.isActive && (!c.endsAt || Date.parse(c.endsAt) > Date.now());
        return (
          <div key={c.id} className="bz-card" style={{ marginTop: 12 }}>
            <div className="bz-card-head">
              <strong>{c.title}</strong>
              <span className={`bz-status ${live ? 'verified' : 'pending'}`}>
                {c.isActive ? (live ? 'Live' : 'Ended') : 'Paused'}
              </span>
            </div>
            <p style={{ margin: '0.4rem 0 0.5rem', fontWeight: 750, color: 'var(--text-accent)' }}>
              {couponValue(c)}
              {c.minSpendCents > 0 ? ` · on ${money(c.minSpendCents, c.currency)}+` : ''}
              {c.redeemMode === 'online' ? ' · online code' : ' · in store'}
            </p>
            {c.description && <p className="bz-muted" style={{ margin: '0 0 0.5rem' }}>{c.description}</p>}
            <p className="bz-muted" style={{ margin: '0 0 0.6rem', fontSize: '0.8rem' }}>
              {c.spent} used · {c.outstanding} claimed and waiting
              {c.totalLimit ? ` · ${Math.max(c.totalLimit - c.redeemedCount, 0)} of ${c.totalLimit} left` : ''}
              {c.endsAt ? ` · ends ${monthDay(c.endsAt)}` : ''}
            </p>
            <div className="bz-actions">
              <button type="button" className="bz-upload" onClick={() => setEditing(c)}>
                <Pencil size={13} aria-hidden="true" /> Edit
              </button>
              <button type="button" className="bz-upload"
                onClick={() => void mutate(() => updateCouponAction(c.id, { isActive: !c.isActive }),
                  c.isActive ? 'Coupon paused' : 'Coupon live')}>
                {c.isActive ? 'Pause' : 'Activate'}
              </button>
              <button type="button" className="bz-upload" onClick={async () => {
                if (await confirm({
                  title: 'Remove this coupon?',
                  message: `"${c.title}" disappears for members. Codes already claimed stop working.`,
                  confirmLabel: 'Remove',
                })) void mutate(() => deleteCouponAction(c.id), 'Coupon removed');
              }}><Trash2 size={13} aria-hidden="true" /> Remove</button>
            </div>
          </div>
        );
      })}
    </>
  );
}

function CouponForm({ coupon, businessId, onSave, onCancel }: {
  coupon: BusinessCoupon | null;
  businessId: string;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const { pick, busy: uploading } = useImagePicker();
  const [image, setImage] = React.useState(coupon?.image ?? '');
  const [form, setForm] = React.useState({
    title: coupon?.title ?? '',
    description: coupon?.description ?? '',
    terms: coupon?.terms ?? '',
    discountKind: coupon?.discountKind ?? 'percent',
    percentOff: coupon?.percentOff ? String(coupon.percentOff) : '10',
    amountOff: coupon?.amountOffCents ? String(coupon.amountOffCents / 100) : '',
    minSpend: coupon?.minSpendCents ? String(coupon.minSpendCents / 100) : '',
    redeemMode: coupon?.redeemMode ?? 'in_store',
    promoCode: coupon?.promoCode ?? '',
    startsAt: coupon?.startsAt ? coupon.startsAt.slice(0, 10) : '',
    endsAt: coupon?.endsAt ? coupon.endsAt.slice(0, 10) : '',
    totalLimit: coupon?.totalLimit ? String(coupon.totalLimit) : '',
    perMemberLimit: String(coupon?.perMemberLimit ?? 1),
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const cents = (v: string): number | null => {
    const n = Number(v);
    return v.trim() === '' || !Number.isFinite(n) ? null : Math.round(n * 100);
  };

  return (
    <form className="bz-card" onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      await onSave({
        title: form.title,
        description: form.description,
        terms: form.terms,
        image: image || null,
        discountKind: form.discountKind,
        percentOff: form.discountKind === 'percent' ? Number(form.percentOff) : null,
        amountOffCents: form.discountKind === 'amount' ? cents(form.amountOff) : null,
        minSpendCents: cents(form.minSpend) ?? 0,
        redeemMode: form.redeemMode,
        promoCode: form.redeemMode === 'online' ? form.promoCode.trim().toUpperCase() : null,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt ? `${form.endsAt}T23:59:59` : null,
        totalLimit: form.totalLimit.trim() === '' ? null : Number(form.totalLimit),
        perMemberLimit: Number(form.perMemberLimit),
        businessId,
      });
      setBusy(false);
    }}>
      <Field label="What is the offer called?" htmlFor="cp-title">
        <input id="cp-title" value={form.title} onChange={set('title')} required maxLength={120}
          placeholder="e.g. 20% off your first consultation" />
      </Field>

      <div className="bz-row">
        <Field label="Discount type" htmlFor="cp-kind">
          <select id="cp-kind" value={form.discountKind} onChange={set('discountKind')}>
            <option value="percent">Percentage off</option>
            <option value="amount">Amount off</option>
            <option value="freebie">Free item or service</option>
          </select>
        </Field>
        {form.discountKind === 'percent' && (
          <Field label="Percent off" htmlFor="cp-pct">
            <input id="cp-pct" type="number" min={1} max={100} value={form.percentOff} onChange={set('percentOff')} required />
          </Field>
        )}
        {form.discountKind === 'amount' && (
          <Field label="Amount off (CAD)" htmlFor="cp-amt">
            <input id="cp-amt" type="number" min={1} step="0.01" value={form.amountOff} onChange={set('amountOff')} required />
          </Field>
        )}
      </div>

      <Field label="Details members see" htmlFor="cp-desc">
        <textarea id="cp-desc" value={form.description} onChange={set('description')} maxLength={2000}
          placeholder="What it covers, and anything worth knowing before they come in." />
      </Field>

      <Field label="Conditions" htmlFor="cp-terms"
        hint="The small print: what it cannot be combined with, which days it excludes, and so on.">
        <textarea id="cp-terms" value={form.terms} onChange={set('terms')} maxLength={2000} />
      </Field>

      <div className="bz-row">
        <Field label="Minimum spend (CAD, optional)" htmlFor="cp-min">
          <input id="cp-min" type="number" min={0} step="0.01" value={form.minSpend} onChange={set('minSpend')} />
        </Field>
        <Field label="How is it used?" htmlFor="cp-mode">
          <select id="cp-mode" value={form.redeemMode} onChange={set('redeemMode')}>
            <option value="in_store">In store - member shows a code</option>
            <option value="online">Online - member types a promo code</option>
          </select>
        </Field>
      </div>

      {form.redeemMode === 'online' && (
        <Field label="Promo code" htmlFor="cp-promo"
          hint="The code members type at your checkout. Everyone who claims it sees the same code.">
          <input id="cp-promo" value={form.promoCode} onChange={set('promoCode')} maxLength={40}
            required placeholder="e.g. CLUB20" style={{ textTransform: 'uppercase' }} />
        </Field>
      )}

      <div className="bz-row">
        <Field label="Starts" htmlFor="cp-from" hint="Leave blank to start now.">
          <input id="cp-from" type="date" value={form.startsAt} onChange={set('startsAt')} />
        </Field>
        <Field label="Ends" htmlFor="cp-to" hint="Leave blank to run until you pause it.">
          <input id="cp-to" type="date" value={form.endsAt} onChange={set('endsAt')} />
        </Field>
      </div>

      <div className="bz-row">
        <Field label="Total claims allowed" htmlFor="cp-total" hint="Leave blank for no limit.">
          <input id="cp-total" type="number" min={1} value={form.totalLimit} onChange={set('totalLimit')} />
        </Field>
        <Field label="Per member" htmlFor="cp-per" hint="How many times one member can claim it.">
          <input id="cp-per" type="number" min={1} max={100} value={form.perMemberLimit} onChange={set('perMemberLimit')} required />
        </Field>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {image && <img src={image} alt="" className="bz-logo" />}
        <button type="button" className="bz-upload" disabled={uploading}
          onClick={() => pick(`business/${businessId}/coupon`, setImage)}>
          <Upload size={14} aria-hidden="true" /> {uploading ? 'Uploading…' : image ? 'Change picture' : 'Add a picture'}
        </button>
        {image && (
          <button type="button" className="bz-upload" onClick={() => setImage('')}>
            <X size={14} aria-hidden="true" /> Remove
          </button>
        )}
      </div>

      <div className="bz-actions" style={{ marginTop: 14 }}>
        <button type="submit" className="btn btn-primary" disabled={busy} style={{ minHeight: 46 }}>
          {busy ? 'Saving…' : coupon ? 'Save coupon' : 'Publish coupon'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} style={{ minHeight: 46 }}>Cancel</button>
      </div>
    </form>
  );
}

// ---- The till --------------------------------------------------------------------

const OUTCOME_COPY: Record<RedeemOutcome['outcome'], { tone: 'good' | 'bad'; line: string }> = {
  redeemed: { tone: 'good', line: 'Accepted. Give them the discount.' },
  already_used: { tone: 'bad', line: 'This code was already used.' },
  expired: { tone: 'bad', line: 'This code expired before it was used.' },
  void: { tone: 'bad', line: 'This code is no longer valid.' },
  not_found: { tone: 'bad', line: 'No code like that. Check the letters and try again.' },
};

function RedeemTab() {
  const [code, setCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<RedeemOutcome | null>(null);
  const [error, setError] = React.useState('');

  return (
    <div className="bz-card">
      <p className="bz-muted" style={{ marginTop: 0 }}>
        The member shows you an 8-character code on their phone. Type it here before
        you give the discount - that is what marks it used.
      </p>

      <form onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true); setError(''); setResult(null);
        const r = await redeemCodeAction(code);
        setBusy(false);
        if (r.ok) { setResult(r.data); if (r.data.outcome === 'redeemed') setCode(''); }
        else setError(r.error);
      }}>
        <Field label="Member's code" htmlFor="rd-code">
          <input
            id="rd-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
            maxLength={12}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="ABCD2345"
            style={{ fontSize: '1.4rem', letterSpacing: '0.18em', fontWeight: 800, textAlign: 'center' }}
          />
        </Field>
        <button type="submit" className="btn btn-primary" disabled={busy || code.trim().length < 4}
          style={{ minHeight: 50, width: '100%', justifyContent: 'center', gap: 8 }}>
          {busy ? <Loader2 size={16} className="spin" aria-hidden="true" /> : <ScanLine size={16} aria-hidden="true" />}
          {busy ? 'Checking…' : 'Check and accept'}
        </button>
      </form>

      {error && <p className="community-error" role="alert" style={{ marginTop: 12 }}>
        <AlertCircle size={14} aria-hidden="true" /> {error}
      </p>}

      {result && (
        <div
          role="status"
          style={{
            marginTop: 14, padding: '0.9rem 1rem', borderRadius: '0.9rem',
            background: OUTCOME_COPY[result.outcome].tone === 'good' ? 'var(--green-50)' : 'var(--bg-secondary)',
            border: `1px solid ${OUTCOME_COPY[result.outcome].tone === 'good' ? 'rgba(45,122,79,0.3)' : 'var(--border-color)'}`,
          }}
        >
          <strong style={{
            display: 'block', fontSize: '1rem',
            color: OUTCOME_COPY[result.outcome].tone === 'good' ? 'var(--success-600)' : 'var(--text-primary)',
          }}>
            {OUTCOME_COPY[result.outcome].line}
          </strong>
          {result.couponTitle && (
            <span className="bz-muted" style={{ fontSize: '0.85rem' }}>
              {result.couponTitle}
              {result.redeemedAt ? ` · ${new Date(result.redeemedAt).toLocaleString('en-CA')}` : ''}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Events ----------------------------------------------------------------------

const MODERATION_COPY: Record<string, { label: string; tone: string; line: string }> = {
  pending: {
    label: 'Waiting for the club', tone: 'pending',
    line: 'An admin checks every business event before members see it. This usually takes a day.',
  },
  rejected: {
    label: 'Not approved', tone: 'pending',
    line: 'The club did not publish this one.',
  },
  approved: { label: 'Approved', tone: 'verified', line: '' },
};

function EventsTab({ businessId, events, mutate, confirm }: {
  businessId: string; events: BusinessEvent[]; mutate: Mutate;
  confirm: (o: { title: string; message: string; confirmLabel: string }) => Promise<boolean>;
}) {
  const [editing, setEditing] = React.useState<BusinessEvent | 'new' | null>(null);

  if (editing) {
    const event = editing === 'new' ? null : editing;
    return (
      <EventEditor
        event={event}
        uploadPrefix={`business/${businessId}/event`}
        saveLabel={event ? 'Save event' : 'Send to the club'}
        onCancel={() => setEditing(null)}
        onSave={async (data) => {
          const ok = await mutate(
            () => (event ? updateBusinessEventAction(event.id, data) : createBusinessEventAction(businessId, data)),
            event ? 'Event saved - the club will take another look' : 'Event sent to the club'
          );
          if (ok) setEditing(null);
        }}
      />
    );
  }

  return (
    <>
      <p className="bz-muted" style={{ marginTop: 0 }}>
        Your events appear in every member&apos;s Events tab, their city first. The club
        checks each one before it goes live, and looks again if you change what it says.
      </p>
      <button type="button" className="btn btn-primary" style={{ minHeight: 46 }} onClick={() => setEditing('new')}>
        <Plus size={15} aria-hidden="true" /> New event
      </button>

      {events.length === 0 && <p className="bz-muted" style={{ marginTop: 12 }}>No events yet.</p>}

      {events.map((ev) => {
        const mod = MODERATION_COPY[ev.moderationStatus] ?? MODERATION_COPY.approved;
        return (
          <div key={ev.id} className="bz-card" style={{ marginTop: 12 }}>
            <div className="bz-card-head">
              <strong>{ev.title}</strong>
              <span className={`bz-status ${mod.tone}`}>
                {ev.moderationStatus === 'approved' ? (ev.isPublished ? 'Live' : 'Draft') : mod.label}
              </span>
            </div>
            <p className="bz-muted" style={{ margin: '0.4rem 0 0.5rem' }}>
              {monthDay(ev.date)}{ev.time ? ` · ${ev.time}` : ''}
              {ev.location ? ` · ${ev.location}` : ''} · {ev.going} going
              {ev.admission === 'paid' ? ` · ${money(ev.priceCents, ev.currency)}` : ' · Free'}
            </p>
            {mod.line && <p className="bz-muted" style={{ margin: '0 0 0.5rem', fontSize: '0.8rem' }}>{mod.line}</p>}
            {ev.moderationNote && (
              <p style={{
                margin: '0 0 0.6rem', padding: '0.5rem 0.7rem', borderRadius: '0.6rem',
                background: 'var(--bg-secondary)', fontSize: '0.82rem', lineHeight: 1.5,
              }}>
                <strong>The club said:</strong> {ev.moderationNote}
              </p>
            )}
            <div className="bz-actions">
              <button type="button" className="bz-upload" onClick={() => setEditing(ev)}>
                <Pencil size={13} aria-hidden="true" /> Edit
              </button>
              <button type="button" className="bz-upload"
                onClick={() => void mutate(() => updateBusinessEventAction(ev.id, { isPublished: !ev.isPublished }),
                  ev.isPublished ? 'Event hidden' : 'Event published')}>
                {ev.isPublished ? 'Unpublish' : 'Publish'}
              </button>
              <button type="button" className="bz-upload" onClick={async () => {
                if (await confirm({
                  title: 'Delete this event?',
                  message: `"${ev.title}" and its RSVPs are removed permanently.`,
                  confirmLabel: 'Delete',
                })) void mutate(() => deleteBusinessEventAction(ev.id), 'Event deleted');
              }}><Trash2 size={13} aria-hidden="true" /> Delete</button>
            </div>
          </div>
        );
      })}
    </>
  );
}
