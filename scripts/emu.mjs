// One command to make the emulator dev loop painless:
//   npm run emu
// Re-establishes the adb reverse bridge (the thing that silently drops on
// every emulator restart and causes the offline screen) and launches the app.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const candidates = [
  process.env.ANDROID_HOME && join(process.env.ANDROID_HOME, 'platform-tools', 'adb.exe'),
  process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe'),
  'adb', // PATH fallback (mac/linux too)
].filter(Boolean);

const adb = candidates.find((c) => c === 'adb' || existsSync(c));
const run = (...args) => execFileSync(adb, args, { stdio: 'inherit' });

run('reverse', 'tcp:3000', 'tcp:3000');
run('shell', 'am', 'start', '-n', 'ca.professionalsclub.app/.MainActivity');
console.log('\nBridge up + app launched. Dev server must be running (npm run dev).');
