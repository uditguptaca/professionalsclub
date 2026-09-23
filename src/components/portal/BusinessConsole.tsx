'use client';
import React, { Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { uploadToBlob } from '@/lib/upload-client';
import {
  Calendar, Ticket, CheckCircle2, Clock, Plus, Pencil, Trash2,
  Upload, X, AlertCircle, ScanLine, MessageSquareText, Home, ChevronLeft, ChevronRight,
  Camera, ExternalLink, Store, Globe, CalendarClock, Users, Megaphone, Info,
} from 'lucide-react';
import PortalLoading from '@/components/portal/PortalLoading';
import EventEditor from '@/components/portal/EventEditor';
import CouponScanner from '@/components/portal/CouponScanner';
import { useConfirm } from '@/components/portal/confirm';
import { PostComposer, PostCard } from '@/components/portal/community';
import { COMMUNITY_CITIES } from '@/lib/cities';
import { parseDateOnly } from '@/lib/dates';
import { readCache, writeCache } from '@/lib/swr-cache';
import type {
  BusinessHome, BusinessOffer, BusinessEvent, BusinessCoupon,
} from '@/server/repos/business';
import type { CommunityPost } from '@/types';
import * as businessActions from '@/app/actions/business';
import { guardActions } from '@/lib/actions-client';
const { fetchBusinessHomeAction, updateMyBusinessAction, createOfferAction, updateOfferAction, deleteOfferAction, createCouponAction, updateCouponAction, deleteCouponAction, createBusinessEventAction, updateBusinessEventAction, deleteBusinessEventAction, fetchBusinessPostsAction } = guardActions(businessActions);

/**
 * The whole business console, in one component mounted from two routes.
 *
 * An invited business account signs in at /portal/business; a member who
 * registered a listing before invites existed keeps /portal/member/business.
 * Both are the same person doing the same job, so they get the same screen -
 * two copies would have drifted the first time a field was added.
 *
 * FIVE DESTINATIONS, phone first. Home is the overview: who you are, how the
 * offers are doing, what needs a decision, and the one button a business taps
 * most - scan. Offers holds coupons (claimable, scannable) and announcements
 * (read-only) behind one switch, because to the owner they are both "deals".
 * Events, Posts and Scan are what they say. Editing the page is a task, not a
 * place: it opens from Home and comes back to Home.
 *
 * The current tab lives in the URL (?tab=) so the phone's bottom bar, the
 * desktop pills and the back button all agree.
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

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Weekdays only" in the words a business would use. */
const daysLabel = (days: number[]): string | null => {
  if (days.length === 0 || days.length === 7) return null;
  const set = [...days].sort((a, b) => a - b);
  if (set.join() === '1,2,3,4,5') return 'Weekdays only';
  if (set.join() === '0,6') return 'Weekends only';
  return set.map((d) => DAY_NAMES[d]).join(', ') + ' only';
};

const monthDay = (iso: string | null): string => {
  const d = parseDateOnly(iso);
  return d ? d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBA';
};

const shortDate = (iso: string | null): string => {
  const d = parseDateOnly(iso);
  return d ? d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) : 'TBA';
};

const money = (cents: number, currency = 'CAD') =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency, minimumFractionDigits: 0 })
    .format(cents / 100);

/** "$10 off", "15% off", "Free gift" - the same words members will read. */
export const couponValue = (c: Pick<BusinessCoupon, 'discountKind' | 'percentOff' | 'amountOffCents' | 'currency'>): string => {
  if (c.discountKind === 'percent') return `${c.percentOff ?? 0}% off`;
  if (c.discountKind === 'amount') return `${money(c.amountOffCents ?? 0, c.currency)} off`;
  return 'Free item';
};

const isLive = (c: BusinessCoupon) => c.isActive && (!c.endsAt || Date.parse(c.endsAt) > Date.now());

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

type Mutate = (
  fn: () => Promise<{ ok: true; data: BusinessHome } | { ok: false; error: string }>,
  done: string
) => Promise<boolean>;

type Confirm = (o: { title: string; message: string; confirmLabel: string }) => Promise<boolean>;

type Tab = 'home' | 'page' | 'offers' | 'events' | 'posts' | 'scan';
const TABS: Tab[] = ['home', 'page', 'offers', 'events', 'posts', 'scan'];
const parseTab = (v: string | null): Tab => (TABS.includes(v as Tab) ? (v as Tab) : 'home');

/** Something Home asked another tab to start doing. */
type Intent = 'coupon' | 'event' | null;

const NAV: { key: Tab; label: string; Icon: typeof Home }[] = [
  { key: 'home', label: 'Home', Icon: Home },
  { key: 'offers', label: 'Offers', Icon: Ticket },
  { key: 'events', label: 'Events', Icon: Calendar },
  { key: 'posts', label: 'Posts', Icon: MessageSquareText },
  { key: 'scan', label: 'Scan', Icon: ScanLine },
];

// The page editor carries its own "Back / Edit your page" head instead.
const TITLES: Record<Exclude<Tab, 'home' | 'page'>, { title: string; lede: string }> = {
  offers: {
    title: 'Offers',
    lede: 'Coupons are claimed in the app and scanned at your counter. Announcements are read on your page.',
  },
  events: {
    title: 'Events',
    lede: 'Shown in every member’s Events tab, their city first. The club checks each one before it goes live.',
  },
  posts: {
    title: 'Posts',
    lede: 'Reach the members who saved you. A photo of what is new this week does more than a sales line.',
  },
  scan: {
    title: 'Scan a code',
    lede: 'The member shows a QR code. Scan it, and the offer is marked used - it cannot be scanned twice.',
  },
};

type Props = {
  heading?: string;
  /** What to show when this account has no business attached. */
  emptyState?: React.ReactNode;
  /**
   * 'standalone' is the business layout: the layout draws the phone tab bar,
   * so the pills here appear only on wide screens. 'embedded' is inside the
   * member portal, which has its own tab bar - the pills show at every width.
   */
  chrome?: 'standalone' | 'embedded';
};

export default function BusinessConsole(props: Props) {
  // useSearchParams wants a Suspense boundary above it.
  return (
    <Suspense fallback={<PortalLoading label="Loading your business" />}>
      <Console {...props} />
    </Suspense>
  );
}

function Console({ heading, emptyState, chrome = 'embedded' }: Props) {
  const confirm = useConfirm();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = parseTab(params.get('tab'));

  const cached = readCache<BusinessHome>(CACHE_KEY);
  const [home, setHome] = React.useState<BusinessHome | undefined>(cached);
  const [loading, setLoading] = React.useState(cached === undefined);
  const [error, setError] = React.useState('');
  const [toast, setToast] = React.useState('');
  const [intent, setIntent] = React.useState<Intent>(null);

  const go = React.useCallback((next: Tab) => {
    const q = new URLSearchParams(params.toString());
    if (next === 'home') q.delete('tab'); else q.set('tab', next);
    const qs = q.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    window.scrollTo({ top: 0 });
  }, [params, pathname, router]);

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
  const counts: Partial<Record<Tab, number>> = {
    offers: (home?.coupons.length ?? 0) + (home?.offers.length ?? 0),
    events: home?.events.length ?? 0,
  };

  const locked = (what: string) => (
    <div className="bz-empty">
      <Clock size={22} aria-hidden="true" style={{ opacity: 0.5 }} />
      <p style={{ margin: '0.6rem 0 0' }}>{what} unlock once the club verifies your business.</p>
    </div>
  );

  return (
    <div className="hf-page">
      <div className="hf-body" style={{ marginTop: 0 }}>
        <section className="hf-section" style={{ gap: 0 }}>
          {heading && chrome === 'embedded' && (
            <div className="hf-section-head" style={{ marginBottom: '0.6rem' }}>
              <h1 style={{ fontSize: '1.45rem', margin: 0 }}>{heading}</h1>
              {business && <StatusChip verified={verified} />}
            </div>
          )}

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
              <nav
                className={`bz-tabs${chrome === 'standalone' ? ' bz-tabs--desktop' : ''}`}
                role="tablist"
                aria-label="Business sections"
              >
                {NAV.map(({ key, label, Icon }) => {
                  const on = tab === key || (tab === 'page' && key === 'home');
                  const n = counts[key] ?? 0;
                  return (
                    <button
                      key={key} type="button" role="tab" aria-selected={on}
                      className={`bz-tab${on ? ' is-on' : ''}`}
                      onClick={() => go(key)}
                    >
                      <Icon size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 6 }} />
                      {label}{n > 0 ? ` (${n})` : ''}
                    </button>
                  );
                })}
              </nav>

              {error && (
                <p className="community-error" role="alert" style={{ marginBottom: 12 }}>
                  <AlertCircle size={14} aria-hidden="true" /> {error}
                </p>
              )}

              {tab !== 'home' && tab !== 'page' && (
                <header className="bz-screen-head">
                  <h1 className="bz-title">{TITLES[tab].title}</h1>
                  <p className="bz-lede">{TITLES[tab].lede}</p>
                </header>
              )}

              {tab === 'home' && (
                <HomeTab
                  home={home!}
                  verified={verified}
                  onGo={go}
                  onStart={(what) => { setIntent(what); go(what === 'coupon' ? 'offers' : 'events'); }}
                />
              )}

              {tab === 'page' && (
                <EditorFrame title="Edit your page" onBack={() => go('home')} level={1}>
                  <PageEditor
                    business={business}
                    onSave={(data) => mutate(() => updateMyBusinessAction(business.id, data), 'Page saved')}
                  />
                </EditorFrame>
              )}

              {tab === 'offers' && (
                <OffersHub
                  businessId={business.id}
                  verified={verified}
                  coupons={home!.coupons}
                  offers={home!.offers}
                  mutate={mutate}
                  confirm={confirm}
                  startNew={intent === 'coupon'}
                  onConsumed={() => setIntent(null)}
                  locked={locked}
                />
              )}

              {tab === 'events' && (
                verified
                  ? (
                    <EventsTab
                      businessId={business.id} events={home!.events} mutate={mutate} confirm={confirm}
                      startNew={intent === 'event'} onConsumed={() => setIntent(null)}
                    />
                  )
                  : locked('Events')
              )}

              {tab === 'posts' && (
                verified ? <PostsTab business={business} /> : locked('Posts')
              )}

              {tab === 'scan' && <CouponScanner intro={false} />}
            </>
          )}
        </section>
      </div>
      {toast && <div className="pp-toast" role="status"><CheckCircle2 size={15} aria-hidden="true" /> {toast}</div>}
    </div>
  );
}

// ---- Shared bits ----------------------------------------------------------------

function StatusChip({ verified }: { verified: boolean }) {
  return verified
    ? <span className="bz-status verified"><CheckCircle2 size={13} aria-hidden="true" /> Verified</span>
    : <span className="bz-status pending"><Clock size={13} aria-hidden="true" /> Under review</span>;
}

/** A task screen: a way back at the top, the form below. */
function EditorFrame({ title, onBack, children, level }: { title: string; onBack: () => void; children: React.ReactNode; level?: 1 }) {
  return (
    <div className="bz-editor">
      <div className="bz-editor-head">
        <button type="button" className="bz-back" onClick={onBack}>
          <ChevronLeft size={20} aria-hidden="true" /> Back
        </button>
        {level === 1 ? <h1 style={{ font: 'inherit', margin: 0 }}>{title}</h1> : <strong>{title}</strong>}
      </div>
      {children}
    </div>
  );
}

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
        onDone(await uploadToBlob(file, 'image', { prefix }));
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

function Logo({ business, size = 56 }: { business: NonNullable<BusinessHome['business']>; size?: number }) {
  if (business.logo && isImage(business.logo)) {
    return <img src={business.logo} alt="" className="bz-logo" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="bz-logo"
      aria-hidden="true"
      style={{
        width: size, height: size, display: 'grid', placeItems: 'center', fontWeight: 800,
        background: 'var(--green-950)', color: '#fff', fontSize: size > 48 ? '1.1rem' : '0.95rem',
      }}
    >
      {business.logo?.trim() || business.name.charAt(0)}
    </span>
  );
}

// ---- Home -------------------------------------------------------------------------

/**
 * The overview. The three numbers are the ones an owner asks about ("is
 * anyone using it?"), the four buttons are the four things they come here to
 * do, and the attention list is only there when something actually needs them.
 */
function HomeTab({ home, verified, onGo, onStart }: {
  home: BusinessHome;
  verified: boolean;
  onGo: (tab: Tab) => void;
  onStart: (what: 'coupon' | 'event') => void;
}) {
  const business = home.business!;
  const { coupons, events, offers } = home;

  const used = coupons.reduce((n, c) => n + c.spent, 0);
  const live = coupons.filter(isLive).length;
  const going = events.reduce((n, e) => n + e.going, 0);

  const attention: { key: string; text: string; tab: Tab; warn?: boolean }[] = [];
  const pending = events.filter((e) => e.moderationStatus === 'pending').length;
  if (pending) attention.push({ key: 'pending', text: `${plural(pending, 'event')} waiting for the club’s approval`, tab: 'events' });
  const rejected = events.filter((e) => e.moderationStatus === 'rejected').length;
  if (rejected) attention.push({ key: 'rejected', text: `${plural(rejected, 'event')} not approved - read the club’s note`, tab: 'events', warn: true });
  const ended = coupons.filter((c) => c.isActive && c.endsAt && Date.parse(c.endsAt) <= Date.now()).length;
  if (ended) attention.push({ key: 'ended', text: `${plural(ended, 'coupon')} ended but still switched on`, tab: 'offers', warn: true });
  if (!business.logo || !business.descriptionShort) {
    attention.push({ key: 'page', text: 'Add a logo and a short description to your page', tab: 'page' });
  }
  if (verified && coupons.length === 0 && offers.length === 0) {
    attention.push({ key: 'first', text: 'Publish your first offer - members look here first', tab: 'offers' });
  }

  return (
    <div className="bz-home">
      <section className="bz-card bz-hero" aria-label="Your listing">
        {business.coverImage && <img src={business.coverImage} alt="" className="bz-hero-cover" />}
        <div className="bz-hero-body">
          <Logo business={business} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1>{business.name}</h1>
            <small>{business.category}{business.city ? ` · ${business.city}` : ''}</small>
          </div>
          <StatusChip verified={verified} />
        </div>
        <div className="bz-hero-actions">
          <button type="button" className="bz-btn" onClick={() => onGo('page')}>
            <Pencil size={14} aria-hidden="true" /> Edit page
          </button>
          {verified && (
            <a className="bz-btn" href={`/businesses/${business.slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={14} aria-hidden="true" /> Public page
            </a>
          )}
        </div>
      </section>

      {!verified && (
        <div className="bz-card bz-notice">
          <Info size={16} aria-hidden="true" />
          <div>
            <strong>Your listing is with the admins.</strong>
            <p className="bz-muted" style={{ margin: '0.25rem 0 0' }}>
              Finish your page and prepare announcements now. Coupons, events and posts
              switch on the moment the club verifies {business.name}.
            </p>
          </div>
        </div>
      )}

      <div className="bz-stats" role="group" aria-label="How it is going">
        <div className="bz-stat"><strong>{used}</strong><small>Codes used</small></div>
        <div className="bz-stat"><strong>{live}</strong><small>Live coupons</small></div>
        <div className="bz-stat"><strong>{going}</strong><small>Going to events</small></div>
      </div>

      <div className="bz-quick" role="group" aria-label="Quick actions">
        <button type="button" className="btn btn-primary bz-quick-primary" onClick={() => onGo('scan')}>
          <Camera size={18} aria-hidden="true" /> Scan a member&apos;s code
        </button>
        <button type="button" className="bz-quick-btn" onClick={() => onStart('coupon')} disabled={!verified}>
          <Ticket size={20} aria-hidden="true" /> New coupon
        </button>
        <button type="button" className="bz-quick-btn" onClick={() => onStart('event')} disabled={!verified}>
          <Calendar size={20} aria-hidden="true" /> New event
        </button>
        <button type="button" className="bz-quick-btn" onClick={() => onGo('posts')} disabled={!verified}>
          <MessageSquareText size={20} aria-hidden="true" /> Post an update
        </button>
      </div>

      {/* Nothing in the console said what any of this costs. A proprietor
          filling in a page and publishing offers could not tell whether they
          were accruing a bill, and that uncertainty is what stops a small
          owner from finishing. */}
      <p className="bz-muted" style={{ marginTop: 4 }}>
        Listing with the club is free. There is no fee, no subscription and no commission on anything you offer members.
      </p>

      {attention.length > 0 && (
        <section>
          <h2 className="bz-h2">Needs attention</h2>
          <ul className="bz-attn">
            {attention.map((a) => (
              <li key={a.key}>
                <button type="button" onClick={() => onGo(a.tab)}>
                  {a.warn
                    ? <AlertCircle size={17} aria-hidden="true" style={{ color: 'var(--accent-700, #b45309)' }} />
                    : <Info size={17} aria-hidden="true" style={{ color: 'var(--green-950)' }} />}
                  <span>{a.text}</span>
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

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
    <form className="bz-form" onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      const province = COMMUNITY_CITIES.find((c) => c.name === form.city)?.province;
      await onSave({ ...form, ...(province ? { province } : {}) });
      setBusy(false);
    }}>
      <div className="bz-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <Logo business={business} />
          <button type="button" className="bz-upload" disabled={uploading}
            onClick={() => pick(`business/${business.id}/logo`, (url) => void onSave({ logo: url }))}>
            <Upload size={14} aria-hidden="true" /> {uploading ? 'Uploading…' : 'Change logo'}
          </button>
          <button type="button" className="bz-upload" disabled={uploading}
            onClick={() => pick(`business/${business.id}/cover`, (url) => void onSave({ coverImage: url }))}>
            <Upload size={14} aria-hidden="true" /> {business.coverImage ? 'Change cover' : 'Add a cover image'}
          </button>
        </div>
        {business.coverImage && <img src={business.coverImage} alt="Cover" className="bz-cover" style={{ marginTop: 12 }} />}
      </div>

      <div className="bz-card">
        <h2 className="bz-h2" style={{ marginTop: 0 }}>About</h2>
        <Field label="Business name" htmlFor="pe-name">
          <input id="pe-name" value={form.name} onChange={set('name')} required maxLength={120} />
        </Field>
        <Field label="Category" htmlFor="pe-cat">
          <select id="pe-cat" value={form.category} onChange={set('category')}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            {!CATEGORIES.includes(form.category) && <option value={form.category}>{form.category}</option>}
          </select>
        </Field>
        <Field label="Short description" htmlFor="pe-short" hint="One or two lines. This is what shows on your card in the directory.">
          <textarea id="pe-short" value={form.descriptionShort} onChange={set('descriptionShort')} maxLength={280} />
        </Field>
        <Field label="Full description" htmlFor="pe-full">
          <textarea id="pe-full" value={form.descriptionFull} onChange={set('descriptionFull')} maxLength={4000} style={{ minHeight: 140 }} />
        </Field>
        <Field label="Member rate, in a sentence" htmlFor="pe-rate"
          hint="Shown on your card. Real discounts live in Offers, where members can claim them.">
          <input id="pe-rate" value={form.memberRateText} onChange={set('memberRateText')} maxLength={160} />
        </Field>
      </div>

      <div className="bz-card">
        <h2 className="bz-h2" style={{ marginTop: 0 }}>Where and when</h2>
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
          <input id="pe-address" value={form.address} onChange={set('address')} autoComplete="street-address" />
        </Field>
        <Field label="Opening hours" htmlFor="pe-hours">
          <input id="pe-hours" value={form.businessHours} onChange={set('businessHours')} placeholder="e.g. Mon-Fri 9-6, Sat 10-2" />
        </Field>
      </div>

      <div className="bz-card">
        <h2 className="bz-h2" style={{ marginTop: 0 }}>Contact</h2>
        <div className="bz-row">
          <Field label="Contact person" htmlFor="pe-contact">
            <input id="pe-contact" value={form.contactPerson} onChange={set('contactPerson')} autoComplete="name" />
          </Field>
          <Field label="Phone" htmlFor="pe-phone">
            <input id="pe-phone" type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
          </Field>
        </div>
        <div className="bz-row">
          <Field label="Email" htmlFor="pe-email">
            <input id="pe-email" type="email" inputMode="email" value={form.email} onChange={set('email')} autoComplete="email" />
          </Field>
          <Field label="Website" htmlFor="pe-web">
            <input id="pe-web" type="url" inputMode="url" value={form.website} onChange={set('website')} placeholder="https://" />
          </Field>
        </div>
      </div>

      <div className="bz-savebar">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save page'}
        </button>
      </div>
    </form>
  );
}

// ---- Offers hub: coupons and announcements ----------------------------------------

function OffersHub({ businessId, verified, coupons, offers, mutate, confirm, startNew, onConsumed, locked }: {
  businessId: string;
  verified: boolean;
  coupons: BusinessCoupon[];
  offers: BusinessOffer[];
  mutate: Mutate;
  confirm: Confirm;
  startNew: boolean;
  onConsumed: () => void;
  locked: (what: string) => React.ReactNode;
}) {
  const [kind, setKind] = React.useState<'coupons' | 'announcements'>(verified ? 'coupons' : 'announcements');

  return (
    <>
      <div className="bz-seg" role="tablist" aria-label="Kind of offer">
        <button type="button" role="tab" aria-selected={kind === 'coupons'} onClick={() => setKind('coupons')}>
          <Ticket size={15} aria-hidden="true" /> Coupons{coupons.length ? ` (${coupons.length})` : ''}
        </button>
        <button type="button" role="tab" aria-selected={kind === 'announcements'} onClick={() => setKind('announcements')}>
          <Megaphone size={15} aria-hidden="true" /> Announcements{offers.length ? ` (${offers.length})` : ''}
        </button>
      </div>

      {kind === 'coupons' && (
        verified
          ? (
            <CouponsTab
              businessId={businessId} coupons={coupons} mutate={mutate} confirm={confirm}
              startNew={startNew} onConsumed={onConsumed}
            />
          )
          : locked('Coupons')
      )}
      {kind === 'announcements' && (
        <OffersTab businessId={businessId} offers={offers} mutate={mutate} confirm={confirm} />
      )}
    </>
  );
}

// ---- Announcements ----------------------------------------------------------------

function OffersTab({ businessId, offers, mutate, confirm }: {
  businessId: string; offers: BusinessOffer[]; mutate: Mutate; confirm: Confirm;
}) {
  const [editing, setEditing] = React.useState<BusinessOffer | 'new' | null>(null);

  if (editing) {
    const offer = editing === 'new' ? null : editing;
    return (
      <EditorFrame title={offer ? 'Edit announcement' : 'New announcement'} onBack={() => setEditing(null)}>
        <OfferForm
          offer={offer}
          onCancel={() => setEditing(null)}
          onSave={async (data) => {
            const ok = await mutate(
              () => (offer ? updateOfferAction(offer.id, data) : createOfferAction(businessId, data)),
              offer ? 'Announcement saved' : 'Announcement published'
            );
            if (ok) setEditing(null);
          }}
        />
      </EditorFrame>
    );
  }

  return (
    <>
      <button type="button" className="btn btn-primary bz-new" onClick={() => setEditing('new')}>
        <Plus size={15} aria-hidden="true" /> New announcement
      </button>

      {offers.length === 0 && (
        <div className="bz-empty">
          <Megaphone size={22} aria-hidden="true" style={{ opacity: 0.5 }} />
          <p style={{ margin: '0.6rem 0 0' }}>
            No announcements yet. Use one for something members read but do not claim,
            like a member rate or a seasonal menu.
          </p>
        </div>
      )}

      {offers.map((o) => (
        <article key={o.id} className="bz-card" style={{ marginTop: 12 }}>
          <div className="bz-card-head">
            <strong>{o.title}</strong>
            <span className={`bz-status ${o.isActive ? 'verified' : 'pending'}`}>{o.isActive ? 'Live' : 'Paused'}</span>
          </div>
          {o.description && <p className="bz-muted" style={{ margin: '0.4rem 0 0' }}>{o.description}</p>}
          {o.validUntil && (
            <div className="bz-chips">
              <span className="bz-chip"><CalendarClock size={12} aria-hidden="true" /> Until {shortDate(o.validUntil)}</span>
            </div>
          )}
          <div className="bz-actions">
            <button type="button" className="bz-btn" onClick={() => setEditing(o)}><Pencil size={14} aria-hidden="true" /> Edit</button>
            <button type="button" className="bz-btn"
              onClick={() => void mutate(() => updateOfferAction(o.id, { isActive: !o.isActive }), o.isActive ? 'Announcement paused' : 'Announcement live')}>
              {o.isActive ? 'Pause' : 'Activate'}
            </button>
            <button type="button" className="bz-btn bz-btn--danger" onClick={async () => {
              if (await confirm({ title: 'Remove this announcement?', message: `"${o.title}" disappears for members immediately.`, confirmLabel: 'Remove' })) {
                void mutate(() => deleteOfferAction(o.id), 'Announcement removed');
              }
            }}><Trash2 size={14} aria-hidden="true" /> Remove</button>
          </div>
        </article>
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
      <Field label="Title" htmlFor="of-title">
        <input id="of-title" value={form.title} onChange={set('title')} required maxLength={120}
          placeholder="e.g. 15% off tax filing for members" />
      </Field>
      <Field label="Details" htmlFor="of-desc">
        <textarea id="of-desc" value={form.description} onChange={set('description')} maxLength={2000} />
      </Field>
      <Field label="Valid until (optional)" htmlFor="of-until">
        <input id="of-until" type="date" value={form.validUntil} onChange={set('validUntil')} />
      </Field>
      <div className="bz-savebar bz-savebar--inline">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : offer ? 'Save' : 'Publish'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

// ---- Coupons --------------------------------------------------------------------

function CouponsTab({ businessId, coupons, mutate, confirm, startNew, onConsumed }: {
  businessId: string; coupons: BusinessCoupon[]; mutate: Mutate; confirm: Confirm;
  startNew: boolean; onConsumed: () => void;
}) {
  const [editing, setEditing] = React.useState<BusinessCoupon | 'new' | null>(startNew ? 'new' : null);

  // Home's "New coupon" lands here with the form already open.
  React.useEffect(() => {
    if (startNew) { setEditing('new'); onConsumed(); }
  }, [startNew, onConsumed]);

  if (editing) {
    const coupon = editing === 'new' ? null : editing;
    return (
      <EditorFrame title={coupon ? 'Edit coupon' : 'New coupon'} onBack={() => setEditing(null)}>
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
      </EditorFrame>
    );
  }

  return (
    <>
      <button type="button" className="btn btn-primary bz-new" onClick={() => setEditing('new')}>
        <Plus size={15} aria-hidden="true" /> New coupon
      </button>

      {coupons.length === 0 && (
        <div className="bz-empty">
          <Ticket size={22} aria-hidden="true" style={{ opacity: 0.5 }} />
          <p style={{ margin: '0.6rem 0 0' }}>
            No coupons yet. Members look here first, and a clear one brings people in the door.
          </p>
        </div>
      )}

      {coupons.map((c) => {
        const live = isLive(c);
        const left = c.totalLimit ? Math.max(c.totalLimit - c.redeemedCount, 0) : null;
        return (
          <article key={c.id} className="bz-card" style={{ marginTop: 12 }}>
            <div className="bz-card-head">
              <strong>{c.title}</strong>
              <span className={`bz-status ${live ? 'verified' : 'pending'}`}>
                {c.isActive ? (live ? 'Live' : 'Ended') : 'Paused'}
              </span>
            </div>
            <p className="bz-value">
              {couponValue(c)}
              {c.minSpendCents > 0 && (
                <span className="bz-value-note"> on {money(c.minSpendCents, c.currency)} or more</span>
              )}
            </p>
            <div className="bz-chips">
              <span className="bz-chip">
                {c.redeemMode === 'online'
                  ? <><Globe size={12} aria-hidden="true" /> Online code</>
                  : <><Store size={12} aria-hidden="true" /> In store</>}
              </span>
              {daysLabel(c.validDays) && (
                <span className="bz-chip"><CalendarClock size={12} aria-hidden="true" /> {daysLabel(c.validDays)}</span>
              )}
              {c.endsAt && <span className="bz-chip">Ends {shortDate(c.endsAt)}</span>}
              {c.cooldownDays > 0 && <span className="bz-chip">Once every {c.cooldownDays} days</span>}
            </div>
            <p className="bz-meta">
              <Users size={13} aria-hidden="true" />
              {c.spent} used{c.outstanding > 0 ? ` · ${c.outstanding} claimed, not yet used` : ''}
              {left !== null ? ` · ${left} of ${c.totalLimit} left` : ''}
            </p>
            <div className="bz-actions">
              <button type="button" className="bz-btn" onClick={() => setEditing(c)}>
                <Pencil size={14} aria-hidden="true" /> Edit
              </button>
              <button type="button" className="bz-btn"
                onClick={() => void mutate(() => updateCouponAction(c.id, { isActive: !c.isActive }),
                  c.isActive ? 'Coupon paused' : 'Coupon live')}>
                {c.isActive ? 'Pause' : 'Activate'}
              </button>
              <button type="button" className="bz-btn bz-btn--danger" onClick={async () => {
                if (await confirm({
                  title: 'Remove this coupon?',
                  message: `"${c.title}" disappears for members. Codes already claimed stop working.`,
                  confirmLabel: 'Remove',
                })) void mutate(() => deleteCouponAction(c.id), 'Coupon removed');
              }}><Trash2 size={14} aria-hidden="true" /> Remove</button>
            </div>
          </article>
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
    cooldownDays: String(coupon?.cooldownDays ?? 0),
  });
  const [validDays, setValidDays] = React.useState<number[]>(coupon?.validDays ?? []);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const cents = (v: string): number | null => {
    const n = Number(v);
    return v.trim() === '' || !Number.isFinite(n) ? null : Math.round(n * 100);
  };

  return (
    <form className="bz-form" onSubmit={async (e) => {
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
        validDays,
        cooldownDays: Number(form.cooldownDays || 0),
        businessId,
      });
      setBusy(false);
    }}>
      <div className="bz-card">
        <h2 className="bz-h2" style={{ marginTop: 0 }}>The deal</h2>
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
              <input id="cp-pct" type="number" inputMode="numeric" min={1} max={100} value={form.percentOff} onChange={set('percentOff')} required />
            </Field>
          )}
          {form.discountKind === 'amount' && (
            <Field label="Amount off (CAD)" htmlFor="cp-amt">
              <input id="cp-amt" type="number" inputMode="decimal" min={1} step="0.01" value={form.amountOff} onChange={set('amountOff')} required />
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
      </div>

      <div className="bz-card">
        <h2 className="bz-h2" style={{ marginTop: 0 }}>How it is used</h2>
        <div className="bz-row">
          <Field label="Minimum spend (CAD, optional)" htmlFor="cp-min">
            <input id="cp-min" type="number" inputMode="decimal" min={0} step="0.01" value={form.minSpend} onChange={set('minSpend')} />
          </Field>
          <Field label="Where" htmlFor="cp-mode">
            <select id="cp-mode" value={form.redeemMode} onChange={set('redeemMode')}>
              <option value="in_store">In store - you scan their code</option>
              <option value="online">Online - they type a promo code</option>
            </select>
          </Field>
        </div>

        {form.redeemMode === 'online' && (
          <Field label="Promo code" htmlFor="cp-promo"
            hint="The code members type at your checkout. Everyone who claims it sees the same code.">
            <input id="cp-promo" value={form.promoCode} onChange={set('promoCode')} maxLength={40}
              required placeholder="e.g. CLUB20" autoCapitalize="characters" style={{ textTransform: 'uppercase' }} />
          </Field>
        )}

        <div style={{ marginBottom: 14 }}>
          <span className="bz-label">Which days does it run?</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} role="group" aria-label="Days this offer runs">
            {DAY_NAMES.map((name, day) => {
              const on = validDays.includes(day);
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={on}
                  className={`bz-day${on ? ' is-on' : ''}`}
                  onClick={() => setValidDays((d) =>
                    d.includes(day) ? d.filter((x) => x !== day) : [...d, day])}
                >
                  {name}
                </button>
              );
            })}
          </div>
          <p className="bz-muted" style={{ margin: '0.35rem 0 0', fontSize: '0.78rem' }}>
            {validDays.length === 0
              ? 'None picked means any day. A code shown on a day you have not picked is refused at the counter.'
              : `${daysLabel(validDays) ?? 'Any day'}. Other days are refused when you scan.`}
          </p>
        </div>
      </div>

      <div className="bz-card">
        <h2 className="bz-h2" style={{ marginTop: 0 }}>Limits</h2>
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
            <input id="cp-total" type="number" inputMode="numeric" min={1} value={form.totalLimit} onChange={set('totalLimit')} />
          </Field>
          <Field label="Per member" htmlFor="cp-per" hint="How many times one member can claim it.">
            <input id="cp-per" type="number" inputMode="numeric" min={1} max={100} value={form.perMemberLimit} onChange={set('perMemberLimit')} required />
          </Field>
        </div>

        <Field label="Wait between uses (days)" htmlFor="cp-cool"
          hint="0 means no wait. Use it with a per-member limit above 1 for something like once a month.">
          <input id="cp-cool" type="number" inputMode="numeric" min={0} max={365} value={form.cooldownDays} onChange={set('cooldownDays')} />
        </Field>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {image && <img src={image} alt="" className="bz-logo" />}
          <button type="button" className="bz-upload" disabled={uploading}
            onClick={() => pick(`business/${businessId}/coupon`, setImage)}>
            <Upload size={14} aria-hidden="true" /> {uploading ? 'Uploading…' : image ? 'Change picture' : 'Add a picture'}
          </button>
          {image && (
            <button type="button" className="bz-btn" onClick={() => setImage('')}>
              <X size={14} aria-hidden="true" /> Remove
            </button>
          )}
        </div>
      </div>

      <div className="bz-savebar">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : coupon ? 'Save coupon' : 'Publish coupon'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

// ---- Posts (0050) -------------------------------------------------------------------

/**
 * The business speaking in the community. A post reaches the business's own
 * page and the feed of every member who saved it - not every member, which is
 * what keeps this from being an advertising channel. Members like and comment
 * as on any post; the business reads them here.
 */
function PostsTab({ business }: { business: NonNullable<BusinessHome['business']> }) {
  const [posts, setPosts] = React.useState<CommunityPost[] | null>(null);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let alive = true;
    fetchBusinessPostsAction(business.id).then((r) => {
      if (!alive) return;
      if (r.ok) setPosts(r.data);
      else { setPosts([]); setError(r.error); }
    });
    return () => { alive = false; };
  }, [business.id]);

  return (
    <>
      <PostComposer
        groupId={null}
        placeholder={`What's new at ${business.name}?`}
        business={{ id: business.id, name: business.name, logo: business.logo ?? null }}
        onPosted={(post) => setPosts((p) => [post, ...(p ?? [])])}
      />
      {error && <p className="community-error" role="alert"><AlertCircle size={14} aria-hidden="true" /> {error}</p>}
      {posts === null && <p className="bz-muted" style={{ marginTop: 12 }}>Loading your posts…</p>}
      {posts?.length === 0 && (
        <div className="bz-empty">
          <MessageSquareText size={22} aria-hidden="true" style={{ opacity: 0.5 }} />
          <p style={{ margin: '0.6rem 0 0' }}>No posts yet. Your first one goes to everyone who saved you.</p>
        </div>
      )}
      {posts?.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          manageBusiness
          onDeleted={(id) => setPosts((p) => (p ?? []).filter((x) => x.id !== id))}
          onAuthorBlocked={() => {}}
        />
      ))}
    </>
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

function EventsTab({ businessId, events, mutate, confirm, startNew, onConsumed }: {
  businessId: string; events: BusinessEvent[]; mutate: Mutate; confirm: Confirm;
  startNew: boolean; onConsumed: () => void;
}) {
  const [editing, setEditing] = React.useState<BusinessEvent | 'new' | null>(startNew ? 'new' : null);

  React.useEffect(() => {
    if (startNew) { setEditing('new'); onConsumed(); }
  }, [startNew, onConsumed]);

  if (editing) {
    const event = editing === 'new' ? null : editing;
    return (
      <EditorFrame title={event ? 'Edit event' : 'New event'} onBack={() => setEditing(null)}>
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
      </EditorFrame>
    );
  }

  return (
    <>
      <button type="button" className="btn btn-primary bz-new" onClick={() => setEditing('new')}>
        <Plus size={15} aria-hidden="true" /> New event
      </button>

      {events.length === 0 && (
        <div className="bz-empty">
          <Calendar size={22} aria-hidden="true" style={{ opacity: 0.5 }} />
          <p style={{ margin: '0.6rem 0 0' }}>No events yet. A tasting, a workshop, an open house - members RSVP from the app.</p>
        </div>
      )}

      {events.map((ev) => {
        const mod = MODERATION_COPY[ev.moderationStatus] ?? MODERATION_COPY.approved;
        return (
          <article key={ev.id} className="bz-card" style={{ marginTop: 12 }}>
            <div className="bz-card-head">
              <strong>{ev.title}</strong>
              <span className={`bz-status ${mod.tone}`}>
                {ev.moderationStatus === 'approved' ? (ev.isPublished ? 'Live' : 'Hidden') : mod.label}
              </span>
            </div>
            <div className="bz-chips">
              <span className="bz-chip"><Calendar size={12} aria-hidden="true" /> {monthDay(ev.date)}{ev.time ? ` · ${ev.time}` : ''}</span>
              <span className="bz-chip">{ev.admission === 'paid' ? money(ev.priceCents, ev.currency) : 'Free'}</span>
              {ev.location && <span className="bz-chip">{ev.location}</span>}
            </div>
            <p className="bz-meta"><Users size={13} aria-hidden="true" /> {plural(ev.going, 'person', 'people')} going</p>
            {mod.line && <p className="bz-muted" style={{ margin: '0 0 0.5rem', fontSize: '0.8rem' }}>{mod.line}</p>}
            {ev.moderationNote && (
              <p className="bz-note">
                <strong>The club said:</strong> {ev.moderationNote}
              </p>
            )}
            <div className="bz-actions">
              <button type="button" className="bz-btn" onClick={() => setEditing(ev)}>
                <Pencil size={14} aria-hidden="true" /> Edit
              </button>
              <button type="button" className="bz-btn"
                onClick={() => void mutate(() => updateBusinessEventAction(ev.id, { isPublished: !ev.isPublished }),
                  ev.isPublished ? 'Event hidden' : 'Event published')}>
                {ev.isPublished ? 'Hide' : 'Publish'}
              </button>
              <button type="button" className="bz-btn bz-btn--danger" onClick={async () => {
                if (await confirm({
                  title: 'Delete this event?',
                  message: `"${ev.title}" and its RSVPs are removed permanently.`,
                  confirmLabel: 'Delete',
                })) void mutate(() => deleteBusinessEventAction(ev.id), 'Event deleted');
              }}><Trash2 size={14} aria-hidden="true" /> Delete</button>
            </div>
          </article>
        );
      })}
    </>
  );
}
