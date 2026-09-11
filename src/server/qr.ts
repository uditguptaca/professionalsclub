import 'server-only';
import QRCode from 'qrcode';

/**
 * The QR code a member holds up at the counter.
 *
 * Rendered on the SERVER, as a data URL. Two reasons, in order:
 *   - a QR encoder in the client bundle is 50KB every member downloads to
 *     display something the server already knows;
 *   - what gets encoded is then decided in one place, next to the code it
 *     encodes, instead of in whichever screen happens to render it.
 *
 * WHAT IS IN IT. A URL to the business console's redeem screen, not the bare
 * code. That makes a phone's own camera app a working scanner - it opens the
 * page, which demands the business login and shows one Approve button - while
 * the in-app scanner reads the same string and redeems without leaving the
 * screen. Anyone else who scans it gets a page that refuses them, because the
 * code is worthless without the login that owns it.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://professionalsclub.ca';

export const redeemUrl = (code: string): string =>
  `${SITE.replace(/\/$/, '')}/portal/business/redeem/${encodeURIComponent(code)}`;

/**
 * A PNG data URL, not an SVG string: an <img src> needs no
 * dangerouslySetInnerHTML, so nothing this returns can become markup.
 *
 * Error correction M, which survives a fingerprint on a phone screen, and a
 * quiet zone of 2 modules so it still scans against a card background.
 */
export async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: { dark: '#0c0c0eff', light: '#ffffffff' },
  });
}

/** The QR for one claimed coupon code. */
export const codeQr = (code: string): Promise<string> => qrDataUrl(redeemUrl(code));
