'use client';
import React from 'react';
import { upload } from '@vercel/blob/client';
import { Plus, Upload, X } from 'lucide-react';
import { COMMUNITY_CITIES } from '@/lib/cities';

/**
 * Everything about an event, in one form.
 *
 * Used by the business console and by the club's own event screen, because they
 * are the same job: the day a field is added it has to appear in both, and two
 * copies of a twenty-field form drift within a week.
 *
 * The fields it does NOT offer are as deliberate as the ones it does: featuring,
 * the offline attendee count and the moderation verdict belong to admins, and
 * the database pins all three for anyone else regardless of what is posted.
 */

export interface EventDraft {
  title: string;
  description: string;
  date: string | null;
  time: string | null;
  venueName: string | null;
  location: string | null;
  city: string | null;
  eventType: string;
  onlineUrl: string | null;
  capacity: number;
  admission: string;
  priceCents: number;
  currency: string;
  rsvpUrl: string | null;
  contactEmail: string | null;
  organiser: string | null;
  image: string | null;
  gallery: string[];
}

/** One image, straight to blob storage, handed back as a URL. */
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

export default function EventEditor({
  event,
  uploadPrefix,
  saveLabel,
  onSave,
  onCancel,
}: {
  event: Partial<EventDraft> | null;
  uploadPrefix: string;
  saveLabel: string;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const { pick, busy: uploading } = useImagePicker();
  const [image, setImage] = React.useState(event?.image ?? '');
  const [gallery, setGallery] = React.useState<string[]>(event?.gallery ?? []);
  const [form, setForm] = React.useState({
    title: event?.title ?? '',
    description: event?.description ?? '',
    date: event?.date ? event.date.slice(0, 10) : '',
    time: event?.time ?? '',
    venueName: event?.venueName ?? '',
    location: event?.location ?? '',
    city: event?.city ?? '',
    eventType: event?.eventType ?? 'in_person',
    onlineUrl: event?.onlineUrl ?? '',
    capacity: event?.capacity ? String(event.capacity) : '',
    admission: event?.admission ?? 'free',
    price: event?.priceCents ? String(event.priceCents / 100) : '',
    rsvpUrl: event?.rsvpUrl ?? '',
    contactEmail: event?.contactEmail ?? '',
    organiser: event?.organiser ?? '',
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
        venueName: form.venueName || null,
        location: form.location || null,
        city: form.city || null,
        eventType: form.eventType,
        onlineUrl: form.eventType === 'in_person' ? null : (form.onlineUrl || null),
        capacity: form.capacity ? Number(form.capacity) : 0,
        admission: form.admission,
        priceCents: form.admission === 'paid' ? Math.round(Number(form.price || 0) * 100) : 0,
        rsvpUrl: form.rsvpUrl || null,
        contactEmail: form.contactEmail || null,
        organiser: form.organiser || null,
        image: image || null,
        gallery,
        isPublished: true,
      });
      setBusy(false);
    }}>
      <Field label="Event title" htmlFor="ev-title">
        <input id="ev-title" value={form.title} onChange={set('title')} required maxLength={140} />
      </Field>

      <Field label="What happens?" htmlFor="ev-desc">
        <textarea id="ev-desc" value={form.description} onChange={set('description')}
          maxLength={4000} style={{ minHeight: 120 }}
          placeholder="What members will get out of coming, who it is for, and how the evening runs." />
      </Field>

      <div className="bz-row">
        <Field label="Date" htmlFor="ev-date">
          <input id="ev-date" type="date" value={form.date} onChange={set('date')} required />
        </Field>
        <Field label="Time" htmlFor="ev-time">
          <input id="ev-time" value={form.time} onChange={set('time')} placeholder="e.g. 6:30 PM" />
        </Field>
      </div>

      <div className="bz-row">
        <Field label="Format" htmlFor="ev-type">
          <select id="ev-type" value={form.eventType} onChange={set('eventType')}>
            <option value="in_person">In person</option>
            <option value="virtual">Online</option>
            <option value="hybrid">Both</option>
          </select>
        </Field>
        <Field label="Admission" htmlFor="ev-adm">
          <select id="ev-adm" value={form.admission} onChange={set('admission')}>
            <option value="free">Free to attend</option>
            <option value="paid">Paid</option>
          </select>
        </Field>
      </div>

      {form.admission === 'paid' && (
        <Field label="Ticket price (CAD)" htmlFor="ev-price"
          hint="Members see this up front. Take the money however you already do.">
          <input id="ev-price" type="number" min={0} step="0.01" value={form.price} onChange={set('price')} required />
        </Field>
      )}

      {form.eventType !== 'in_person' && (
        <Field label="Join link" htmlFor="ev-url"
          hint="Shown only to members who say they are coming, so it never sits on a public page.">
          <input id="ev-url" type="url" value={form.onlineUrl} onChange={set('onlineUrl')} placeholder="https://" />
        </Field>
      )}

      {form.eventType !== 'virtual' && (
        <>
          <Field label="Venue name" htmlFor="ev-venue">
            <input id="ev-venue" value={form.venueName} onChange={set('venueName')}
              placeholder="e.g. Mississauga Central Library" />
          </Field>
          <Field label="Address" htmlFor="ev-loc">
            <input id="ev-loc" value={form.location} onChange={set('location')} required
              placeholder="e.g. 301 Burnhamthorpe Rd W" />
          </Field>
        </>
      )}

      <div className="bz-row">
        <Field label="City" htmlFor="ev-city" hint="Members see their own city first.">
          <select id="ev-city" value={form.city} onChange={set('city')}>
            <option value="">Not set</option>
            {COMMUNITY_CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}, {c.province}</option>)}
            {form.city && !COMMUNITY_CITIES.some((c) => c.name === form.city) && (
              <option value={form.city}>{form.city}</option>
            )}
          </select>
        </Field>
        <Field label="Capacity" htmlFor="ev-cap" hint="0 means no limit.">
          <input id="ev-cap" type="number" min={0} value={form.capacity} onChange={set('capacity')} />
        </Field>
      </div>

      <div className="bz-row">
        <Field label="Hosted by" htmlFor="ev-org" hint="Leave blank to show the club.">
          <input id="ev-org" value={form.organiser} onChange={set('organiser')} maxLength={120} />
        </Field>
        <Field label="Questions to" htmlFor="ev-mail">
          <input id="ev-mail" type="email" value={form.contactEmail} onChange={set('contactEmail')} />
        </Field>
      </div>

      <Field label="Tickets or registration link" htmlFor="ev-rsvp"
        hint="Optional. For a paid event this is where members buy.">
        <input id="ev-rsvp" type="url" value={form.rsvpUrl} onChange={set('rsvpUrl')} placeholder="https://" />
      </Field>

      <div style={{ marginTop: 6 }}>
        <span style={{
          display: 'block', margin: '0 0 0.3rem 0.2rem',
          fontSize: '0.76rem', fontWeight: 750, color: 'var(--text-secondary)',
        }}>
          Pictures
        </span>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {image && (
            <img src={image} alt="Cover" style={{ width: 96, height: 64, objectFit: 'cover', borderRadius: 8 }} />
          )}
          <button type="button" className="bz-upload" disabled={uploading}
            onClick={() => pick(uploadPrefix, setImage)}>
            <Upload size={14} aria-hidden="true" /> {uploading ? 'Uploading…' : image ? 'Change cover' : 'Add cover photo'}
          </button>
          <button type="button" className="bz-upload" disabled={uploading || gallery.length >= 8}
            onClick={() => pick(uploadPrefix, (url) => setGallery((g) => [...g, url]))}>
            <Plus size={14} aria-hidden="true" /> Add another photo
          </button>
        </div>
        {gallery.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            {gallery.map((url) => (
              <span key={url} style={{ position: 'relative' }}>
                <img src={url} alt="" style={{ width: 72, height: 56, objectFit: 'cover', borderRadius: 8 }} />
                <button
                  type="button"
                  aria-label="Remove picture"
                  onClick={() => setGallery((g) => g.filter((u) => u !== url))}
                  style={{
                    position: 'absolute', top: -6, right: -6, width: 22, height: 22,
                    borderRadius: '50%', border: 0, background: 'var(--green-950)', color: '#fff',
                    cursor: 'pointer', display: 'grid', placeItems: 'center',
                  }}
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="bz-actions" style={{ marginTop: 14 }}>
        <button type="submit" className="btn btn-primary" disabled={busy} style={{ minHeight: 46 }}>
          {busy ? 'Saving…' : saveLabel}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} style={{ minHeight: 46 }}>
          Cancel
        </button>
      </div>
    </form>
  );
}
