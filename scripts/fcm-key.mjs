// Load a Firebase service-account key into .env.local, without the key ever
// being pasted into a terminal, a chat window, or a git diff.
//
//   node scripts/fcm-key.mjs "C:\\Users\\you\\Downloads\\professionalsclub-....json"
//
// It validates the file, proves the private key can actually sign (so a broken
// or truncated download fails here rather than at 3am against Google's API),
// checks the project matches android/app/google-services.json, then writes it
// to .env.local base64-encoded.
//
// Base64 because the raw JSON carries a PEM full of newlines. Every other way of
// getting that into an env var involves quoting rules that differ between
// .env.local, PowerShell and the Vercel dashboard, and a mangled key fails with
// an unhelpful "invalid_grant" much later.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createSign } from 'node:crypto';

const VAR = 'FCM_SERVICE_ACCOUNT_B64';
const src = process.argv[2];

if (!src) {
  console.error('Usage: node scripts/fcm-key.mjs <path-to-service-account.json>');
  process.exit(1);
}
if (!existsSync(src)) {
  console.error(`No file at: ${src}`);
  process.exit(1);
}

// ---- Parse and validate -----------------------------------------------------
let key;
try {
  key = JSON.parse(readFileSync(src, 'utf8'));
} catch {
  console.error('That file is not valid JSON. Re-download it from Firebase.');
  process.exit(1);
}

if (key.type !== 'service_account') {
  console.error(
    `This is not a service-account key (type: ${key.type ?? 'missing'}).\n` +
      'You may have downloaded google-services.json or the web config by mistake.\n' +
      'Firebase Console -> Project settings -> Service accounts -> Generate new private key.'
  );
  process.exit(1);
}
for (const field of ['project_id', 'client_email', 'private_key']) {
  if (!key[field]) {
    console.error(`Key is missing "${field}". Re-download it.`);
    process.exit(1);
  }
}

// ---- Prove the key can sign -------------------------------------------------
// This is the whole reason to validate locally: an RS256 signature is exactly
// what the FCM auth flow does with this key, so if it works here it will work
// there, and a truncated paste is caught now.
try {
  const signer = createSign('RSA-SHA256');
  signer.update('fcm-key-selftest');
  const sig = signer.sign(key.private_key);
  if (!sig?.length) throw new Error('empty signature');
} catch (e) {
  console.error(`The private key cannot sign: ${e.message}`);
  console.error('The file is probably truncated. Generate a fresh key.');
  process.exit(1);
}

// ---- Cross-check against the app config ------------------------------------
const gsPath = 'android/app/google-services.json';
if (existsSync(gsPath)) {
  const gs = JSON.parse(readFileSync(gsPath, 'utf8'));
  const appProject = gs.project_info?.project_id;
  if (appProject && appProject !== key.project_id) {
    console.error(
      `Project mismatch. The Android app is configured for "${appProject}" but ` +
        `this key belongs to "${key.project_id}". Pushes would be sent from the ` +
        'wrong project and silently never arrive.'
    );
    process.exit(1);
  }
}

// ---- Write it to .env.local -------------------------------------------------
const encoded = Buffer.from(JSON.stringify(key), 'utf8').toString('base64');
const line = `${VAR}=${encoded}`;
const envPath = '.env.local';
let env = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';

if (new RegExp(`^${VAR}=`, 'm').test(env)) {
  env = env.replace(new RegExp(`^${VAR}=.*$`, 'm'), line);
  console.log(`Replaced the existing ${VAR} in .env.local`);
} else {
  if (env.length && !env.endsWith('\n')) env += '\n';
  env +=
    '\n# Firebase service account, base64-encoded JSON. Signs the OAuth2\n' +
    '# assertion that authorises sending push notifications. SERVER ONLY -\n' +
    '# never prefix this NEXT_PUBLIC_, and never commit it. Rotate it in the\n' +
    '# Firebase console if it is ever exposed.\n' +
    line +
    '\n';
  console.log(`Added ${VAR} to .env.local`);
}
writeFileSync(envPath, env, 'utf8');

// Only non-secret facts. The key itself is never printed.
console.log('');
console.log(`  project      ${key.project_id}`);
console.log(`  service acct ${key.client_email}`);
console.log(`  signing      verified (RS256 self-test passed)`);
console.log(`  encoded      ${encoded.length} chars written to .env.local`);
console.log('');
console.log('Firebase setup is complete. You can delete the downloaded .json now');
console.log('(a new one can be generated any time). The same value goes into the');
console.log('Vercel environment variables when you deploy.');
