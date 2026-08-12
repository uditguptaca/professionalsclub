'use client';
import React, { useState } from 'react';
import { resendVerificationEmail } from '@/app/actions/auth';
import { Send, Check } from 'lucide-react';

/**
 * "Send me another verification email."
 *
 * Used on the sign-in page, the post-signup screen and the verify landing page.
 *
 * Always reports success, even for an address that is not registered — the
 * action deliberately does not distinguish, so this cannot be used to discover
 * which emails have accounts.
 */
export default function ResendVerification({
  defaultEmail = '',
  compact = false,
}: {
  defaultEmail?: string;
  compact?: boolean;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleResend = async () => {
    if (sending || !email.trim()) return;
    setSending(true);
    setError('');

    const result = await resendVerificationEmail(email);

    if (result.ok) setSent(true);
    else setError(result.error);

    setSending(false);
  };

  if (sent) {
    return (
      <div
        role="status"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '12px 16px', borderRadius: 10, fontSize: '0.85rem',
          background: 'rgba(5,150,105,0.08)', color: 'var(--success-600)', fontWeight: 600,
        }}
      >
        <Check size={16} /> Sent. Check your inbox, and your spam folder.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {!compact && (
        <input
          type="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-label="Email address"
        />
      )}

      {error && (
        <span role="alert" style={{ fontSize: '0.8rem', color: 'var(--error-500)' }}>{error}</span>
      )}

      <button
        type="button"
        className="btn btn-outline"
        onClick={handleResend}
        disabled={sending || !email.trim()}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        <Send size={15} /> {sending ? 'Sending…' : 'Resend verification email'}
      </button>
    </div>
  );
}
