/**
 * End-to-end encryption for matrimony chat, built on the Web Crypto API.
 *
 * Design:
 *  - Each matrimony profile has an ECDH P-256 keypair. The PRIVATE key lives
 *    only in this device's localStorage; the PUBLIC key is published to the
 *    server (matrimony_e2e_keys) so the other side can encrypt.
 *  - A conversation key is derived per peer: ECDH(myPrivate, theirPublic)
 *    -> HKDF-SHA256 -> AES-256-GCM. Both sides derive the same key without it
 *    ever existing anywhere but on their devices.
 *  - Messages are stored as { cipher, iv } (base64). The server can never
 *    read them — and neither can admins, which is the point and the price.
 *
 * Honest limitations, stated in the UI too:
 *  - Keys are per device+browser. A new phone (or cleared storage) means a
 *    fresh keypair: old ciphertext becomes unreadable and is shown as such.
 *  - If the peer has never opened an E2E-capable chat, they have no public
 *    key yet; messages fall back to plaintext with the lock shown open.
 *
 * crypto.subtle exists only in secure contexts (https / localhost). All
 * callers must survive `available() === false` by falling back to plaintext.
 */

const STORAGE_PREFIX = 'pc-e2e-v1-';
const HKDF_INFO = 'pc-matrimony-e2e-v1';

export function e2eeAvailable(): boolean {
  return typeof crypto !== 'undefined' && !!crypto.subtle && typeof localStorage !== 'undefined';
}

interface StoredPair {
  pub: JsonWebKey;
  priv: JsonWebKey;
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
 * The device keypair for this matrimony profile, generating (and persisting)
 * one on first use. Returns the public JWK as a JSON string ready to publish.
 *
 * Serialized per profile: on a first visit, the publish effect and the
 * thread-open derivation both call this before either has stored anything.
 * Without the in-flight cache each call generated its OWN pair, the last
 * write won, and the published public key did not match the private key the
 * other call had already encrypted with — ciphertext nobody could read.
 */
const inflight = new Map<string, Promise<{ publicJwk: string } | null>>();

export function ensureLocalKeys(profileId: string): Promise<{ publicJwk: string } | null> {
  let p = inflight.get(profileId);
  if (!p) {
    p = ensureLocalKeysUncached(profileId);
    inflight.set(profileId, p);
    // A failed attempt must not poison the session; retry next call.
    p.then((r) => { if (r === null) inflight.delete(profileId); },
           () => inflight.delete(profileId));
  }
  return p;
}

async function ensureLocalKeysUncached(profileId: string): Promise<{ publicJwk: string } | null> {
  if (!e2eeAvailable()) return null;
  const key = STORAGE_PREFIX + profileId;
  const raw = localStorage.getItem(key);
  if (raw) {
    try {
      const pair = JSON.parse(raw) as StoredPair;
      if (pair.pub && pair.priv) return { publicJwk: JSON.stringify(pair.pub) };
    } catch { /* corrupted: regenerate below */ }
  }
  const generated = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  );
  const pub = await crypto.subtle.exportKey('jwk', generated.publicKey);
  const priv = await crypto.subtle.exportKey('jwk', generated.privateKey);
  localStorage.setItem(key, JSON.stringify({ pub, priv } satisfies StoredPair));
  return { publicJwk: JSON.stringify(pub) };
}

/**
 * The shared AES-GCM key for one conversation. Deterministic on both devices:
 * ECDH agreement then HKDF, salted with the sorted profile-id pair so two
 * different conversations never share a key even between the same people.
 */
export async function deriveConversationKey(
  myProfileId: string,
  peerProfileId: string,
  peerPublicJwk: string,
): Promise<CryptoKey | null> {
  if (!e2eeAvailable()) return null;
  const raw = localStorage.getItem(STORAGE_PREFIX + myProfileId);
  if (!raw) return null;
  try {
    const pair = JSON.parse(raw) as StoredPair;
    const myPriv = await crypto.subtle.importKey(
      'jwk', pair.priv, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits'],
    );
    const theirPub = await crypto.subtle.importKey(
      'jwk', JSON.parse(peerPublicJwk) as JsonWebKey,
      { name: 'ECDH', namedCurve: 'P-256' }, false, [],
    );
    const bits = await crypto.subtle.deriveBits({ name: 'ECDH', public: theirPub }, myPriv, 256);
    const hkdfKey = await crypto.subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey']);
    const salt = new TextEncoder().encode([myProfileId, peerProfileId].sort().join(':'));
    return await crypto.subtle.deriveKey(
      { name: 'HKDF', hash: 'SHA-256', salt, info: new TextEncoder().encode(HKDF_INFO) },
      hkdfKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  } catch {
    return null;
  }
}

export async function encryptText(
  key: CryptoKey,
  text: string,
): Promise<{ cipher: string; iv: string } | null> {
  try {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(text),
    );
    return { cipher: b64(ct), iv: b64(iv.buffer) };
  } catch {
    return null;
  }
}

/** Null means "not decryptable on this device" — render a placeholder. */
export async function decryptText(key: CryptoKey, cipher: string, iv: string): Promise<string | null> {
  try {
    const pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(unb64(iv)) },
      key,
      unb64(cipher),
    );
    return new TextDecoder().decode(pt);
  } catch {
    return null;
  }
}
