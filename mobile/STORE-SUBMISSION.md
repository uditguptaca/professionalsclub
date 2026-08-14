# Publishing the Professionals Club app

The apps in `android/` and `ios/` are thin native shells (Capacitor 8) around
the hosted portal: the WebView loads the production site, so **every web deploy
updates the app instantly** — store releases are only needed when the shell
itself changes (icon, splash, plugins, the `server.url`).

- App ID: `ca.professionalsclub.app`
- Loads: `https://professionalsclub.vercel.app` (set in `capacitor.config.ts`;
  switch to `https://professionalsclub.ca` when the domain is live, then
  rebuild and ship an update)
- Offline: `mobile/www/error.html` shows when the network is down
- Icons/splash: generated from `assets/logo.png` — rerun
  `npx capacitor-assets generate --iconBackgroundColor '#0f2318' --splashBackgroundColor '#0f2318'`
  after changing it, then `npx cap sync`

## Build — Android (any OS)

1. Install Android Studio.
2. `npx cap sync android`, then `npx cap open android`.
3. Create a signing key once: Build → Generate Signed Bundle → create keystore.
   **Back the keystore up — losing it means you can never update the app.**
4. Build → Generate Signed Bundle (AAB) → upload in Play Console.

## Build — iOS (requires a Mac + Apple Developer account, $99/yr)

1. On the Mac: `npx cap sync ios`, then `npx cap open ios`.
2. In Xcode: set the Team under Signing & Capabilities (bundle id
   `ca.professionalsclub.app` is already set).
3. Product → Archive → Distribute App → App Store Connect.

## Store listing requirements — answers that match this codebase

Both stores require a privacy policy URL: use
**`https://professionalsclub.ca/privacy`** (live at /privacy; also /terms).
Keep that page truthful — it currently states: no ads, no analytics SDKs, no
data sale, no device permissions, one session cookie.

### Google Play — Data Safety form

| Question | Answer |
|---|---|
| Does your app collect or share user data? | Collects: yes. Shares: **no** |
| Data types collected | Name, Email address, Phone (optional), User-generated content (help requests, messages, matrimony profile) |
| Purpose | App functionality, Account management |
| Is data encrypted in transit? | Yes (TLS everywhere) |
| Can users request deletion? | Yes — **in-app** (Portal → My Profile → Delete My Account) and by email |
| Account deletion URL (required since 2024) | `https://professionalsclub.ca/privacy` (section "Deleting your account and data") |

### Apple — App Privacy labels ("nutrition label")

- **Data linked to you**: Contact Info (name, email, phone), User Content
  (messages, other user content)
- **Data not linked to you**: none
- **Data used to track you**: none (no tracking, no ATT prompt needed)
- Account deletion: required by **5.1.1(v)** — already implemented in-app.

### Apple 4.2 (minimum functionality) — the real rejection risk

Apple rejects apps that are "just a website". Mitigations, in order of impact:

1. **Push notifications** (biggest win): add `@capacitor/push-notifications`
   + Firebase (Android) / APNs (iOS), and notify members when an admin
   replies to their request or message. This gives the app a genuinely
   native capability the website lacks.
2. Native splash + status bar theming — already in place.
3. Hardware back handling + offline screen — already in place.
4. If still rejected, appeal citing the logged-in portal (account system,
   help desk, matrimony messaging) as app-like functionality, or move the
   web bundle into the shell (Capacitor's default local mode) so the app
   does not depend on the remote URL.

Google Play has no equivalent rule — WebView apps are accepted as long as
they are not "spam" (single-purpose site wrappers with ads). A functional
member portal passes.

## Review account

Both stores demand a demo login for review. Create a dedicated
`appreview@professionalsclub.ca` member account (never an admin) and put its
credentials in the App Review notes.

## Release checklist

- [ ] `server.url` points at the production domain
- [ ] Vercel env vars set; portal sign-in works on the hosted site
- [ ] Play: signed AAB uploaded, Data Safety form filled as above
- [ ] Apple: archive uploaded, privacy labels filled as above
- [ ] Review account created and working
- [ ] Privacy policy reachable at /privacy without signing in
- [ ] Test on a real phone: sign in, request help, matrimony, delete-account
      flow with a throwaway account, offline screen (airplane mode)
