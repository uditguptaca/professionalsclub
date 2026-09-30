# Publishing Professionals Club to Google Play

Everything here is checked against what the code actually does, not against what
the marketing copy says. Where Play's own rules matter, verify the current
wording in the Play Console — policies change and this file will not.

---

## 1. What is built and ready

| Artifact | Path | Notes |
|---|---|---|
| **App Bundle (upload this)** | `dist/professionals-club-1.1-release.aab` | 4.12 MB. Play requires an `.aab`, not an `.apk`. |
| APK (sideload / testing only) | `dist/professionals-club-1.1-release.apk` | 4.38 MB. Do not upload to Play. |
| Screenshots | `dist/play/screenshots/*.png` | Six 1080x1920 captures of the real app. **Review before uploading — see §6.** |

| Field | Value |
|---|---|
| Package name | `ca.professionalsclub.app` (permanent once published) |
| Version | 1.1, versionCode 2 |
| Min / target SDK | 24 (Android 7.0) / 36 |
| Signed with | `android/keystore/upload-keystore.jks`, `CN=Professionals Club` |
| Signature verified | yes (`apksigner verify` passes) |

**Back up the keystore now.** `android/keystore/upload-keystore.jks` and
`android/keystore.properties` are gitignored, so they exist only on this
machine. If you lose the keystore before enrolling in Play App Signing you
cannot update the app, ever. Copy both somewhere durable today.

---

## 2. Decide these before you upload

**a. Which domain the app points at.** The shell is a native wrapper whose
WebView loads `https://professionalsclub.vercel.app`. That URL is baked into the
bundle (`capacitor.config.ts`, `server.url`). If you intend to launch on
`professionalsclub.ca`, change it *before* publishing — otherwise the store
listing, the privacy policy URL and the app itself all point at a vercel.app
address, and moving later needs a new app release, not just a DNS change.

**b. Play App Signing.** Enrol when prompted. Your keystore then becomes the
*upload* key and Google holds the *app signing* key. This is the default and it
is what protects you if the upload key is lost.

**c. Countries.** The club is Canadian and the content is Canada-specific.
Consider publishing to Canada only at first.

**d. Release track.** Internal testing first, then production. Internal testing
gives you the pre-launch report on real devices without a public listing.

---

## 3. A reviewer cannot use this app without an account

This is the single most common reason an app like this gets rejected. Everything
past the front door is behind a login, and signup requires email verification.

In **App content → App access**, choose *All or some functionality is
restricted* and provide a working demo account. Use a dedicated reviewer
account, not a real member's, and not one of the accounts in `TEST-ACCOUNTS.md`
that the test suites depend on. Include:

- the email address and password,
- a note that the account is already email-verified,
- a one-line path: *Sign in → Home → "Ask for help" → submit a request.*

---

## 4. Data Safety form

Google asks two separate questions about each data type: is it **collected**
(sent off the device) and is it **shared** (transferred to a third party).
Play excludes transfers to service providers processing on your behalf from
"shared" — confirm that against the current Play guidance, because how you
classify the moderation API below is the one judgement call that matters.

### Collected

| Play data type | Collected | Optional? | Purpose | Notes |
|---|---|---|---|---|
| Name | yes | required | Account management, App functionality | shown to other members |
| Email address | yes | required | Account management | never shown to other members |
| Phone number | yes | optional | App functionality | shown only if the member adds it to their profile, or to a matrimony match after they accept |
| User IDs | yes | required | Account management | internal account id |
| Photos | yes | optional | App functionality | profile, matrimony, community posts |
| Videos | yes | optional | App functionality | community posts |
| Files and docs | yes | optional | App functionality | help-request attachments |
| Messages (other in-app messages) | yes | optional | App functionality | member-to-member chat is **end-to-end encrypted**; help-desk messages are readable by club admins |
| Other personal info | yes | optional | App functionality | city, province, job title, employer; matrimony adds date of birth, religion, community, income range, family details |
| Approximate location | **no** | — | — | city is typed by the member, never derived from the device |
| Precise location | **no** | — | — | |
| Contacts | **no** | — | — | |
| Financial info | **no** | — | — | no payments in the app |
| Health info | **no** | — | — | |
| App activity / analytics | **no** | — | — | no analytics or advertising SDK ships in the app |
| Device or other IDs | yes | required | App functionality | notification token, only if the member allows notifications |

### Sensitive content you must not understate

Two areas carry unusually sensitive free text, and both are real:

- **Help desk** — members describe immigration status, legal trouble, housing
  and unemployment. Read by a club admin and by the one volunteer assigned.
- **Matrimony** — date of birth, religion, community and sub-caste, income
  range, family details, and photographs.

Neither is optional to disclose just because the member typed it voluntarily.

### Security practices

- **Encrypted in transit:** yes (TLS everywhere).
- **Users can request deletion:** yes — in-app, and at
  `https://professionalsclub.vercel.app/delete-account`.
- **Independent security review:** you may answer no. Three internal audit
  rounds are recorded in `SECURITY-AUDIT.md`, but they were not third-party.

### Processors the data reaches

The privacy policy names these, so the Data Safety answers must not contradict
it: Neon (Postgres, on AWS), Vercel (hosting), Vercel Blob (uploaded files), the
email provider, Google FCM (push), and **Anthropic's API, which receives post
text and images for automatic content checking**. That last one is the one to
think hardest about when answering the "shared" question.

---

## 5. App content declarations

**Privacy policy URL:** `https://professionalsclub.vercel.app/privacy`
**Account deletion URL:** `https://professionalsclub.vercel.app/delete-account`

**Ads:** no.

**Content rating questionnaire.** Answer honestly that the app contains
user-generated content and unmoderated-in-real-time member-to-member messaging.
Expect a Teen or Mature rating. Do **not** opt into any families or
designed-for-children programme — the matrimony module makes the app
inappropriate for minors, and you should say so.

**User-generated content policy.** Play requires UGC apps to offer in-app
reporting, blocking and moderation. This app has all three, which is worth
stating plainly if asked:

- report a post or comment, and report or block a member;
- automated checks hold or refuse content before anyone sees it
  (`src/server/moderation.ts`), with a human moderation queue behind it;
- club admins and group moderators can remove content.

**Permissions to justify in the listing:**

- `CAMERA` — a business scans a member's coupon code at the counter. Not
  required to use the app.
- `POST_NOTIFICATIONS` — tells a member when someone replies. Refusable.

**Health, finance, government apps:** none apply. The app gives peer help and
says so; the help-desk flow states in writing that volunteers are not lawyers,
immigration consultants or accountants, and that nothing said is legal,
immigration or tax advice. Keep that wording — it is what makes the app's
category defensible.

**"Minimal functionality" / webview wrappers.** Play looks hard at apps that are
just a website in a shell. If challenged, the honest answer is that this one
adds a native sign-in screen, push notifications, the camera scanner, an offline
screen and native back handling on top of the hosted portal.

---

## 6. Review the screenshots before uploading

The captures in `dist/play/screenshots/` are of the live app signed in as the
seeded test member. Before they go on a public listing, check that:

- the member names shown ("Parth Bhanushali", "Arjun Patel", "Portal Admin") are
  seed data you are happy to publish, not real people;
- **"Parth Bhanushali" appears twice** in the dashboard rail with different job
  titles. That is a duplicate-profile data issue flagged during the UX audit.
  Fix the data or crop the screenshot;
- nothing in the chat or notification screenshots shows a real message.

Play needs at least two phone screenshots. You also need, and I have **not**
generated:

- **App icon**, 512x512 PNG (the launcher icon in the project is smaller).
- **Feature graphic**, 1024x500 PNG. Required for the listing.

---

## 7. Listing copy

**App name (30 max):** `Professionals Club`

**Short description (80 max):**
`Free help, jobs and community for newcomers building a life in Canada.`

**Full description (4000 max):**

```
Professionals Club is a volunteer-run, nonprofit community for newcomers to
Canada. It is free. There are no fees, no premium tiers and no ads.

ASK FOR HELP
Stuck on paperwork, housing, taxes or finding work? Send a help request. A club
admin reads every one and, where a volunteer fits, assigns one by hand. Most
requests get a first reply within two business days.

Volunteers are members who arrived before you. They are not lawyers,
immigration consultants or accountants, and nothing they tell you is legal,
immigration or tax advice. If you have a deadline, get professional advice too.

JOBS AND REFERRALS
Browse roles employers are advertising, and ask a member who already works
there to refer you by name.

YOUR CITY
A community feed, groups and events built around the city you live in. Meet
people who have done what you are doing now.

BUSINESSES AND MEMBER OFFERS
A directory of businesses in the club, with discounts for members.

PRIVATE MESSAGING
Member-to-member chat is end-to-end encrypted. Not even Professionals Club can
read it.

MATRIMONY
An optional, admin-reviewed matchmaking section for members who want it. You
choose what is shown and who can see your photos.

YOUR PRIVACY
Your profile is private by default. We do not sell your data, we run no ads and
we ship no tracking SDKs. You can delete your account, and everything in it,
from inside the app at any time.

Questions: support@professionalsclub.ca
```

---

## 8. The upload, step by step

1. Play Console → **Create app**. Name `Professionals Club`, English (Canada),
   App, Free. Accept the declarations.
2. **Set up your app** checklist, working top to bottom:
   - App access — the reviewer demo account from §3.
   - Ads — no.
   - Content rating — questionnaire, per §5.
   - Target audience — 18+; do not opt into families.
   - Data safety — §4.
   - Government apps / financial features / health — no.
   - Privacy policy — the URL in §5.
3. **Store listing** — copy from §7, upload icon, feature graphic, screenshots.
4. **Testing → Internal testing → Create new release.** Upload
   `professionals-club-1.1-release.aab`. Enrol in Play App Signing when offered.
5. Add yourself as an internal tester, install from the opt-in link, and check
   sign-in, push and the coupon scanner on a real device.
6. Read the **pre-launch report** — it runs the app on physical devices and
   reports crashes, accessibility and policy issues.
7. **Production → Create new release**, promote the same bundle, submit.

First review usually takes a few days and can take longer for a new developer
account.

---

## 9. Before the next release

- `npx cap sync android` before every build, and confirm
  `android/app/src/main/assets/capacitor.config.json` has no `localhost` or
  `10.0.2.2` in `allowNavigation`. The release build now fails if it does.
- Bump `versionCode` in `android/app/build.gradle` every upload. Play rejects a
  duplicate.
- The web app updates without a store release, because the shell loads the
  hosted site. You only need a new bundle when native code, permissions, the
  server URL or the version changes.
