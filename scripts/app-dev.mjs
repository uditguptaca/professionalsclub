// Build, install and launch a debug APK pointed at the LOCAL dev server.
//
//   npm run app:dev
//
// Why this exists: the committed capacitor.config.ts points at production, and
// testing native features (push, permissions, the notification tray) needs a
// build pointed at localhost instead. Doing that by hand means editing the URL,
// building, and remembering to revert - which went wrong once and left an APK
// running against localhost while the config said production, so the emulator
// looked like it was ignoring every code change.
//
// Anything native (a new plugin, a manifest change) needs this. Pure web
// changes do not: the WebView loads them from the dev server on reload.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

// --live points the build at the real deployed server; otherwise the local
// dev server (or whatever CAP_SERVER_URL says).
const LIVE = process.argv.includes('--live');
const SERVER_URL = LIVE
  ? 'https://professionalsclub.vercel.app/portal/member/dashboard'
  : (process.env.CAP_SERVER_URL ?? 'http://localhost:3000/portal/member/dashboard');

const adbCandidates = [
  process.env.ANDROID_HOME && join(process.env.ANDROID_HOME, 'platform-tools', 'adb.exe'),
  process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe'),
  'adb',
].filter(Boolean);
const adb = adbCandidates.find((c) => c === 'adb' || existsSync(c));
if (!adb) {
  console.error('adb not found. Set ANDROID_HOME or add platform-tools to PATH.');
  process.exit(1);
}

// Gradle needs a JDK. Android Studio ships one and does not export JAVA_HOME,
// so a terminal build dies with "JAVA_HOME is not set" while a perfectly good
// JDK sits inside the Studio install. Find it rather than ask the developer to
// configure their shell.
const jdkCandidates = [
  process.env.JAVA_HOME,
  process.env.ProgramFiles && join(process.env.ProgramFiles, 'Android', 'Android Studio', 'jbr'),
  process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Programs', 'Android Studio', 'jbr'),
].filter(Boolean);
const javaHome = jdkCandidates.find((c) =>
  existsSync(join(c, 'bin', process.platform === 'win32' ? 'java.exe' : 'java'))
);
if (!javaHome) {
  console.error('No JDK found. Install Android Studio, or set JAVA_HOME.');
  process.exit(1);
}
const buildEnv = { ...process.env, JAVA_HOME: javaHome };

const step = (label) => console.log(`\n=== ${label} ===`);
const sh = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts });

step(`Syncing native project (server.url = ${SERVER_URL})`);
sh('npx', ['cap', 'sync', 'android'], { env: { ...process.env, CAP_SERVER_URL: SERVER_URL } });

step('Building debug APK');
// Invoked from the repo root with -p, not via cwd: cmd.exe does not resolve an
// executable from the working directory, so a bare gradlew.bat is 'not
// recognized' even while sitting right there.
const gradlew = join('android', process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
sh(gradlew, ['-p', 'android', 'assembleDebug', '--console=plain'], { env: buildEnv });

step('Installing');
const apk = 'android/app/build/outputs/apk/debug/app-debug.apk';
if (!existsSync(apk)) {
  console.error(`Build produced no APK at ${apk}`);
  process.exit(1);
}
// -r reinstalls over the existing app and keeps its data, so the signed-in
// session survives and there is no need to log in again after every build.
sh(adb, ['install', '-r', apk]);

step(LIVE ? 'Launching (live server, no bridge needed)' : 'Bridging localhost and launching');
// The WebView's "localhost" is the device, not the workstation, so port 3000
// has to be reversed for dev builds. This silently drops on every emulator
// restart, which is the usual cause of the offline screen. A live build talks
// to the real host and needs no bridge.
if (!LIVE) sh(adb, ['reverse', 'tcp:3000', 'tcp:3000']);
sh(adb, ['shell', 'am', 'force-stop', 'ca.professionalsclub.app']);
// Launch via the LAUNCHER intent rather than naming an activity: the front
// door is LoginActivity now, and MainActivity is deliberately not exported.
sh(adb, ['shell', 'monkey', '-p', 'ca.professionalsclub.app', '-c', 'android.intent.category.LAUNCHER', '1']);

console.log(LIVE ? '\nRunning against the LIVE server.' : '\nRunning against the dev server (npm run dev must be up).');
