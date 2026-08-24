// `npx cap sync ios` run on Windows writes the SPM dependency paths with
// backslashes (the CLI interpolates path.relative output raw). In a Swift
// string literal a backslash is an escape, so Package.swift then does not even
// PARSE on macOS - \n in \node_modules becomes a newline. This normalises the
// slashes back; run it after every ios sync on Windows. `npm run cap:ios` does
// both in order so nobody has to remember.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const p = 'ios/App/CapApp-SPM/Package.swift';
if (!existsSync(p)) {
  console.log('no Package.swift; nothing to fix');
  process.exit(0);
}
const before = readFileSync(p, 'utf8');
const after = before.replace(/path:\s*"([^"]*)"/g, (m, path) => `path: "${path.replaceAll('\\', '/')}"`);
if (after !== before) {
  writeFileSync(p, after, 'utf8');
  console.log('Package.swift: backslash paths normalised to forward slashes');
} else {
  console.log('Package.swift: already clean');
}
