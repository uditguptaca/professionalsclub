'use client';
import React, { useCallback, useEffect, useState } from 'react';
import type { PublicInquiry } from '@/server/repos/portal';
import { fetchInquiries, updateInquiryStatus } from '@/app/actions/portal';
import {
  Inbox, Mail, HandHeart, Loader2, Check, Clock, Archive, ExternalLink,
} from 'lucide-react';

type Status = 'new' | 'in_progress' | 'closed';

const TABS: { key: Status; label: string; icon: typeof Inbox }[] = [
  { key: 'new', label: 'New', icon: Inbox },
  { key: 'in_progress', label: 'In progress', icon: Clock },
  { key: 'closed', label: 'Closed', icon: Archive },
];

/**
 * Enquiries from the public site: the contact form and the "ask a volunteer
 * for help" relay, both of which used to discard their submissions entirely.
 * They now write to public_inquiries, and this is where the admin team reads
 * them — without this screen the forms would be honest but pointless.
 *
 * Nothing here decides access: RLS restricts public_inquiries to admins, and
 * the actions call requireAdminId() before touching it.
 */
export default function AdminInquiriesPage() {
  const [status, setStatus] = useState<Status>('new');
  const [items, setItems] = useState<PublicInquiry[] | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (s: Status) => {
    setItems(null);
    setError('');
    const result = await fetchInquiries(s);
    if (result.ok) setItems(result.data);
    else setError(result.error);
  }, []);

  useEffect(() => { void load(status); }, [status, load]);

  const move = async (id: string, next: Status) => {
    setBusyId(id);
    setError('');
    const result = await updateInquiryStatus({ id, status: next });
    if (result.ok) setItems((rows) => (rows ?? []).filter((r) => r.id !== id));
    else setError(result.error);
    setBusyId(null);
  };

  return (
    <div className="community-page" style={{ maxWidth: '48rem' }}>
      <div className="community-page-head">
        <div>
          <h1>Enquiries</h1>
          <p>Messages from the public contact form and requests for a volunteer.</p>
        </div>
        <div className="community-tabs" role="tablist" aria-label="Enquiry status">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={status === t.key}
              className={`community-tab ${status === t.key ? 'active' : ''}`}
              onClick={() => setStatus(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="community-error">{error}</p>}

      {items === null && !error && (
        <div className="community-panel community-post" aria-hidden="true">
          <div className="community-block-shimmer community-shimmer" />
        </div>
      )}

      {items?.length === 0 && (
        <div className="community-panel community-empty">
          <Inbox size={22} aria-hidden="true" />
          <p><strong>Nothing {status === 'new' ? 'waiting' : `marked ${TABS.find(t => t.key === status)?.label.toLowerCase()}`}.</strong></p>
          <p>
            {status === 'new'
              ? 'Contact-form messages and volunteer help requests land here as they arrive.'
              : 'Move an enquiry here from the New tab once you have picked it up.'}
          </p>
        </div>
      )}

      {items?.map((item) => (
        <article key={item.id} className="community-panel community-report">
          <div className="community-report-meta">
            <span className={`pill ${item.kind === 'contact' ? 'pill-cream' : 'pill-lime'}`}>
              {item.kind === 'contact'
                ? <><Mail size={12} /> Contact form</>
                : <><HandHeart size={12} /> Volunteer request</>}
            </span>
            <small>{new Date(item.createdAt).toLocaleString('en-CA')}</small>
          </div>

          <p className="community-report-reason">
            <strong>{item.name}</strong>{' '}
            <a href={`mailto:${item.email}`} className="inquiry-mail">
              {item.email} <ExternalLink size={11} aria-hidden="true" />
            </a>
            {item.phone && <> &middot; {item.phone}</>}
          </p>

          {(item.subject || item.category || item.requestedFor) && (
            <p className="inquiry-tags">
              {item.subject && <span>{item.subject}</span>}
              {item.category && <span>{item.category}</span>}
              {item.requestedFor && <span>Asked for: {item.requestedFor}</span>}
            </p>
          )}

          <blockquote className="community-report-quote">{item.message}</blockquote>

          <div className="community-report-actions">
            {status !== 'in_progress' && (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => move(item.id, 'in_progress')}
                disabled={busyId === item.id}
              >
                {busyId === item.id ? <Loader2 size={14} className="spin" /> : <Clock size={14} />}
                Picking this up
              </button>
            )}
            {status !== 'closed' && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => move(item.id, 'closed')}
                disabled={busyId === item.id}
              >
                {busyId === item.id ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                Mark handled
              </button>
            )}
            {status === 'closed' && (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => move(item.id, 'new')}
                disabled={busyId === item.id}
              >
                Reopen
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
