'use client';
import React from 'react';
import {
  ScanLine, Camera, CameraOff, Check, AlertCircle, Loader2, Keyboard, X,
} from 'lucide-react';
import { redeemCodeAction } from '@/app/actions/business';
import type { RedeemOutcome } from '@/server/repos/business';

/**
 * The till: point the camera at the member's QR, and the offer is spent.
 *
 * WHY A LIBRARY AND NOT BarcodeDetector. The native API is a one-liner and is
 * missing on iOS, which is half the phones behind a counter. jsQR decodes a
 * frame in plain JavaScript everywhere, and is loaded only when the camera is
 * actually opened, so a business that only ever types codes never downloads it.
 *
 * WHAT SCANNING CHANGES ABOUT TRUST: nothing. The QR carries the same one-time
 * code the keypad accepts, and mark_coupon_redeemed() is still the only thing
 * that decides - a camera is a faster keyboard. Typing stays, because cameras
 * get refused, lenses get scratched, and a member's screen can be cracked.
 *
 * WHAT THE RESULT HAS TO SAY is the other half of "conditions limit usage".
 * The database enforces the day, the caps and the window; the minimum spend and
 * the written terms are the ones only a person can check, so they are printed
 * large at the moment the person at the till is deciding.
 */

const money = (cents: number, currency = 'CAD') =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency, minimumFractionDigits: 0 })
    .format(cents / 100);

const OUTCOME: Record<RedeemOutcome['outcome'], { good: boolean; line: string }> = {
  redeemed:     { good: true,  line: 'Accepted. Give them the discount.' },
  already_used: { good: false, line: 'This code was already used.' },
  expired:      { good: false, line: 'This code ran out before it was used. Ask them to show it again.' },
  void:         { good: false, line: 'This code is no longer valid.' },
  not_found:    { good: false, line: 'No code like that. Check the letters and try again.' },
  wrong_day:    { good: false, line: 'This offer does not run today.' },
  paused:       { good: false, line: 'This offer is paused, so it cannot be accepted.' },
};

/** What the member's QR contains: a redeem URL. Bare codes are accepted too. */
function codeFrom(scanned: string): string | null {
  const text = scanned.trim();
  const fromUrl = text.match(/\/portal\/business\/redeem\/([A-Za-z0-9]{4,16})\/?$/);
  if (fromUrl) return fromUrl[1].toUpperCase();
  if (/^[A-Za-z0-9]{6,12}$/.test(text)) return text.toUpperCase();
  return null;
}

export default function CouponScanner({ initialCode = '' }: { initialCode?: string }) {
  const [code, setCode] = React.useState(initialCode);
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<RedeemOutcome | null>(null);
  const [error, setError] = React.useState('');
  const [scanning, setScanning] = React.useState(false);
  const [cameraError, setCameraError] = React.useState('');

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const frameRef = React.useRef<number | null>(null);

  const redeem = React.useCallback(async (value: string) => {
    setBusy(true);
    setError('');
    setResult(null);
    const r = await redeemCodeAction(value);
    setBusy(false);
    if (r.ok) {
      setResult(r.data);
      if (r.data.outcome === 'redeemed') setCode('');
    } else {
      setError(r.error);
    }
  }, []);

  const stopCamera = React.useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  // Never leave the camera light on behind a navigation.
  React.useEffect(() => stopCamera, [stopCamera]);

  const startCamera = async () => {
    setCameraError('');
    setResult(null);
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      setScanning(true);

      const jsQR = (await import('jsqr')).default;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      // The video element only exists once `scanning` has rendered it.
      await new Promise((r) => setTimeout(r, 50));
      const video = videoRef.current;
      if (!video || !ctx) throw new Error('no-video');
      video.srcObject = stream;
      await video.play();

      let last = '';
      const tick = () => {
        if (!streamRef.current) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const found = jsQR(image.data, image.width, image.height, {
            inversionAttempts: 'dontInvert',
          });
          const scanned = found?.data ? codeFrom(found.data) : null;
          if (scanned && scanned !== last) {
            last = scanned;
            setCode(scanned);
            stopCamera();
            void redeem(scanned);
            return;
          }
        }
        frameRef.current = requestAnimationFrame(tick);
      };
      frameRef.current = requestAnimationFrame(tick);
    } catch (thrown) {
      stopCamera();
      const name = (thrown as { name?: string })?.name ?? '';
      setCameraError(
        name === 'NotAllowedError'
          ? 'The camera is blocked for this site. Allow it in your browser settings, or type the code instead.'
          : name === 'NotFoundError'
            ? 'No camera on this device. Type the code instead.'
            : 'The camera would not start. Type the code instead.'
      );
    }
  };

  // A code arriving from the phone's own camera app redeems on sight.
  const autoRan = React.useRef(false);
  React.useEffect(() => {
    if (initialCode && !autoRan.current) {
      autoRan.current = true;
      void redeem(initialCode);
    }
  }, [initialCode, redeem]);

  return (
    <div className="bz-card">
      <p className="bz-muted" style={{ marginTop: 0 }}>
        The member shows a QR code on their phone. Scan it, and the offer is marked
        used - it cannot be scanned a second time.
      </p>

      {scanning ? (
        <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#000' }}>
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ width: '100%', display: 'block', aspectRatio: '4 / 3', objectFit: 'cover' }}
          />
          {/* A frame to aim with. */}
          <span
            aria-hidden="true"
            style={{
              position: 'absolute', inset: '18%', border: '3px solid rgba(255,255,255,0.85)',
              borderRadius: 12, boxShadow: '0 0 0 100vmax rgba(0,0,0,0.35)',
            }}
          />
          <button
            type="button"
            onClick={stopCamera}
            className="bz-upload"
            style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,0.92)' }}
          >
            <X size={14} aria-hidden="true" /> Stop
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void startCamera()}
          disabled={busy}
          style={{ minHeight: 54, width: '100%', justifyContent: 'center', gap: 8, fontSize: '1rem' }}
        >
          <Camera size={18} aria-hidden="true" /> Scan a member&apos;s code
        </button>
      )}

      {cameraError && (
        <p className="bz-muted" role="status" style={{ display: 'flex', gap: 7, marginTop: 10 }}>
          <CameraOff size={14} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} /> {cameraError}
        </p>
      )}

      <details style={{ marginTop: 14 }}>
        <summary style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
          <Keyboard size={13} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 6 }} />
          Type the code instead
        </summary>
        <form
          style={{ marginTop: 10 }}
          onSubmit={(e) => { e.preventDefault(); void redeem(code); }}
        >
          <div className="bz-field">
            <label htmlFor="rd-code">Member&apos;s code</label>
            <input
              id="rd-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={12}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="ABCD2345"
              style={{ fontSize: '1.3rem', letterSpacing: '0.18em', fontWeight: 800, textAlign: 'center' }}
            />
          </div>
          <button
            type="submit"
            className="btn btn-secondary"
            disabled={busy || code.trim().length < 4}
            style={{ minHeight: 48, width: '100%', justifyContent: 'center', gap: 8 }}
          >
            {busy ? <Loader2 size={16} className="spin" aria-hidden="true" /> : <ScanLine size={16} aria-hidden="true" />}
            {busy ? 'Checking…' : 'Check and accept'}
          </button>
        </form>
      </details>

      {error && (
        <p className="community-error" role="alert" style={{ marginTop: 12 }}>
          <AlertCircle size={14} aria-hidden="true" /> {error}
        </p>
      )}

      {result && <ScanResult result={result} />}
    </div>
  );
}

function ScanResult({ result }: { result: RedeemOutcome }) {
  const copy = OUTCOME[result.outcome] ?? OUTCOME.not_found;
  const value = result.discountKind === 'percent'
    ? `${result.percentOff ?? 0}% off`
    : result.discountKind === 'amount'
      ? `${money(result.amountOffCents ?? 0, result.currency ?? 'CAD')} off`
      : result.discountKind === 'freebie' ? 'Free item' : null;

  return (
    <div
      role="status"
      style={{
        marginTop: 14, padding: '1rem', borderRadius: '0.9rem',
        background: copy.good ? 'var(--green-50)' : 'var(--bg-secondary)',
        border: `1px solid ${copy.good ? 'rgba(45,122,79,0.32)' : 'var(--border-color)'}`,
      }}
    >
      <strong style={{
        display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.02rem',
        color: copy.good ? 'var(--success-600)' : 'var(--text-primary)',
      }}>
        {copy.good ? <Check size={18} aria-hidden="true" /> : <AlertCircle size={18} aria-hidden="true" />}
        {copy.line}
      </strong>

      {result.couponTitle && (
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.92rem', fontWeight: 750 }}>
          {result.couponTitle}{value ? ` · ${value}` : ''}
        </p>
      )}

      {/* The conditions software cannot check, at the moment somebody can. */}
      {copy.good && result.minSpendCents > 0 && (
        <p style={{
          margin: '0.6rem 0 0', padding: '0.55rem 0.75rem', borderRadius: 8,
          background: 'rgba(232, 93, 4, 0.10)', color: 'var(--primary-800)',
          fontSize: '0.88rem', fontWeight: 750,
        }}>
          Check the bill is at least {money(result.minSpendCents, result.currency ?? 'CAD')}
        </p>
      )}

      {result.terms && (
        <p style={{
          margin: '0.55rem 0 0', fontSize: '0.82rem', lineHeight: 1.55,
          color: 'var(--text-secondary)', whiteSpace: 'pre-wrap',
        }}>
          {result.terms}
        </p>
      )}

      {result.redeemedAt && result.outcome === 'already_used' && (
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Used {new Date(result.redeemedAt).toLocaleString('en-CA')}
        </p>
      )}
    </div>
  );
}
