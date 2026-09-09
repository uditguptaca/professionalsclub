/**
 * End-to-end encryption for member chat, built on the Web Crypto API.
 *
 * MULTI-DEVICE (0042). The earlier design gave each MEMBER one keypair, which
 * was really a per-DEVICE keypair in a per-member slot: opening chat in a
 * second browser overwrote the first one's public key and both devices went
 * blind. Keys now belong to devices, and a message is sealed once per device:
 *
 *   1. A random 256-bit CONTENT KEY (CK) per message encrypts the body once
 *      (AES-GCM) -> { cipher, iv }.
 *   2. CK is WRAPPED once for every device that should read it - the
 *      recipient's devices and the sender's own other devices - using
 *      HKDF(ECDH(sender device private, target device public)) as the wrapping
 *      key. Each wrap travels as its own row.
 *   3. A reader rebuilds the same wrapping key from
 *      HKDF(ECDH(its own private, SENDER DEVICE public)), unwraps CK, and
 *      decrypts the body.
 *
 * The server holds ciphertext and wraps it has no private key for. Admins
 * cannot read chat - that is the point and the price.
 *
 * Honest limitations, said in the UI too:
 *  - A device cannot read messages sent BEFORE it registered: no wrap exists
 *    for a device that did not exist. Signal behaves the same way.
 *  - If the other person has never opened chat they have no device key yet, so
 *    the message goes out as plaintext and the header says so.
 *
 * crypto.subtle exists only in secure contexts (https / localhost), so every
 * caller must survive `e2eeAvailable() === false` by falling back to plaintext.
 */

const DEVICE_ID_KEY = 'pc-device-id-v1';
const DEVICE_KEYS_KEY = 'pc-device-keys-v1';
const HKDF_INFO = 'pc-member-e2e-v2-wrap';

export function e2eeAvailable(): boolean {
  return typeof crypto !== 'undefined' && !!crypto.subtle && typeof localStorage !== 'undefined';
}

interface StoredPair {
  pub: JsonWebKey;
  priv: JsonWebKey;
}

export interface DeviceKey {
  deviceId: string;
  publicKeyJwk: string;
}

export interface SealedMessage {
  cipher: string;
  iv: string;
  /** One wrap per device that can read this message. */
  keys: { deviceId: string; memberId: string; wrappedKey: string; wrapIv: string }[];
}

const b64 = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
};

const unb64 = (s: string): ArrayBuffer => {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
};

/**
 * This browser's device id: random, stable, and meaningless to anyone else.
 * It is not derived from anything about the device - it only has to be unique
 * per key, so there is nothing here to fingerprint.
 */
export function deviceId(): string | null {
  if (!e2eeAvailable()) return null;
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID().replace(/-/g, '');
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/**
 * This device's ECDH keypair, generated once and kept in localStorage.
 *
 * Serialized through an in-flight promise: on a first visit the registration
 * effect and the first decrypt both call this before either has stored
 * anything, and without the cache each generated its OWN pair. The last write
 * won, the published key stopped matching the private key the other call had
 * already sealed with, and the result was ciphertext nobody could open. That
 * exact bug is why this is here.
 */
let inflight: Promise<DeviceKey | null> | null = null;

export function ensureDeviceKeys(): Promise<DeviceKey | null> {
  if (!inflight) {
    inflight = ensureDeviceKeysUncached();
    inflight.then(
      (r) => { if (r === null) inflight = null; },
      () => { inflight = null; },
    );
  }
  return inflight;
}

async function ensureDeviceKeysUncached(): Promise<DeviceKey | null> {
  if (!e2eeAvailable()) return null;
  const id = deviceId();
  if (!id) return null;

  const raw = localStorage.getItem(DEVICE_KEYS_KEY);
  if (raw) {
    try {
      const pair = JSON.parse(raw) as StoredPair;
      if (pair.pub && pair.priv) return { deviceId: id, publicKeyJwk: JSON.stringify(pair.pub) };
    } catch { /* corrupted: regenerate below */ }
  }

  const generated = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  );
  const pub = await crypto.subtle.exportKey('jwk', generated.publicKey);
  const priv = await crypto.subtle.exportKey('jwk', generated.privateKey);
  localStorage.setItem(DEVICE_KEYS_KEY, JSON.stringify({ pub, priv } satisfies StoredPair));
  return { deviceId: id, publicKeyJwk: JSON.stringify(pub) };
}

async function myPrivateKey(): Promise<CryptoKey | null> {
  const raw = localStorage.getItem(DEVICE_KEYS_KEY);
  if (!raw) return null;
  try {
    const pair = JSON.parse(raw) as StoredPair;
    return await crypto.subtle.importKey(
      'jwk', pair.priv, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits'],
    );
  } catch {
    return null;
  }
}

/**
 * The AES-GCM key that wraps a content key between two devices. Both sides
 * compute the same bytes: ECDH is symmetric, and the HKDF salt is the sorted
 * device-id pair so no two device pairings ever share a wrapping key.
 */
async function wrappingKey(
  myPriv: CryptoKey,
  theirPublicJwk: string,
  deviceA: string,
  deviceB: string,
): Promise<CryptoKey | null> {
  try {
    const theirPub = await crypto.subtle.importKey(
      'jwk', JSON.parse(theirPublicJwk) as JsonWebKey,
      { name: 'ECDH', namedCurve: 'P-256' }, false, [],
    );
    const bits = await crypto.subtle.deriveBits({ name: 'ECDH', public: theirPub }, myPriv, 256);
    const hkdf = await crypto.subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey']);
    const salt = new TextEncoder().encode([deviceA, deviceB].sort().join(':'));
    return await crypto.subtle.deriveKey(
      { name: 'HKDF', hash: 'SHA-256', salt, info: new TextEncoder().encode(HKDF_INFO) },
      hkdf,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  } catch {
    return null;
  }
}

/**
 * Encrypt `text` once, then wrap its content key for every device in
 * `targets`. Returns null when this device has no keys or nothing could be
 * wrapped - the caller then sends plaintext, which is the documented fallback
 * for a peer who has never opened chat.
 */
export async function sealMessage(
  text: string,
  targets: (DeviceKey & { memberId: string })[],
): Promise<SealedMessage | null> {
  if (!e2eeAvailable() || targets.length === 0) return null;
  const mine = await ensureDeviceKeys();
  const myPriv = await myPrivateKey();
  if (!mine || !myPriv) return null;

  try {
    // One content key, one body encryption, however many readers.
    const contentKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'],
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipher = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, contentKey, new TextEncoder().encode(text),
    );
    const rawContentKey = await crypto.subtle.exportKey('raw', contentKey);

    const keys: SealedMessage['keys'] = [];
    for (const target of targets) {
      const wrapKey = await wrappingKey(myPriv, target.publicKeyJwk, mine.deviceId, target.deviceId);
      if (!wrapKey) continue; // a malformed key must not sink the whole message
      const wrapIv = crypto.getRandomValues(new Uint8Array(12));
      const wrapped = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: wrapIv }, wrapKey, rawContentKey,
      );
      keys.push({
        deviceId: target.deviceId,
        memberId: target.memberId,
        wrappedKey: b64(wrapped),
        wrapIv: b64(wrapIv.buffer),
      });
    }

    if (keys.length === 0) return null;
    return { cipher: b64(cipher), iv: b64(iv.buffer), keys };
  } catch {
    return null;
  }
}

/**
 * Unwrap this device's copy of the content key and decrypt the body.
 * Null means "not readable on this device" - render the placeholder rather
 * than pretending the message is empty.
 */
export async function openMessage(input: {
  cipher: string;
  iv: string;
  wrappedKey: string;
  wrapIv: string;
  senderDeviceId: string;
  senderPublicKeyJwk: string;
}): Promise<string | null> {
  if (!e2eeAvailable()) return null;
  const mine = await ensureDeviceKeys();
  const myPriv = await myPrivateKey();
  if (!mine || !myPriv) return null;

  try {
    const wrapKey = await wrappingKey(
      myPriv, input.senderPublicKeyJwk, input.senderDeviceId, mine.deviceId,
    );
    if (!wrapKey) return null;
    const rawContentKey = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(unb64(input.wrapIv)) },
      wrapKey,
      unb64(input.wrappedKey),
    );
    const contentKey = await crypto.subtle.importKey(
      'raw', rawContentKey, { name: 'AES-GCM', length: 256 }, false, ['decrypt'],
    );
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(unb64(input.iv)) },
      contentKey,
      unb64(input.cipher),
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}
