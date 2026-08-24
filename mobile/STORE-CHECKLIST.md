# Store submission checklist

Everything required to put the Android and iOS apps in their stores, verified
against the stores' requirements as of 2026-08-24 and against this repo's
actual state. Tags: **YOU** = only the account owner can do it, **CODE** = a
change in this repo, **MAC/CI** = needs a Mac or a cloud build, **DONE** =
already true in the repo.

Companion file: [STORE-SUBMISSION.md](STORE-SUBMISSION.md) has the build
commands and signing mechanics; this file is the what-and-why list.

## Before either store: the launch blockers

- [ ] **Add trusted origins in the Neon Console** (Auth -> Configuration).
  Production auth currently rejects every sign-in with INVALID_ORIGIN
  (verified live 2026-08-24), which means NOBODY can log in on
  professionalsclub.vercel.app - web or app. Add
  `https://professionalsclub.vercel.app` and, when the real domain goes live,
  `https://professionalsclub.ca` and `https://www.professionalsclub.ca`.
- [ ] **Set the production environment variables in Vercel** (full list at the
  bottom of this file), then redeploy.
- [ ] **Rotate every credential that appeared in development chats/files**:
  the five test-account passwords in TEST-ACCOUNTS.md, the Neon database
  password, the Android keystore password, and the Firebase service-account
  key (Firebase Console -> Service accounts -> delete old key -> generate new
  -> `npm run fcm:key -- "path"`).
- [ ] **Give the app-review accounts fresh passwords** and put the new
  appreview@professionalsclub.ca credentials in both stores' review notes.

## Google Play (Android)

Verified against Play Console docs as of Aug 2026. Good news first: targetSdk 36 in android/variables.gradle already satisfies the Aug 31 2026 rule that new apps and updates must target Android 16 (API 36) - the repo is compliant with the newest deadline, not just the old one. The upload keystore, signed-AAB pipeline, store copy, screenshots, privacy/terms routes, in-app account deletion, and report+block in all three modules (chat, community, matrimony) already exist in the repo. Five real blockers remain. (1) The committed AAB at android/app/build/outputs/bundle/release/app-release.aab was built 2026-08-20 and contains zero Firebase entries - it predates commit c5d3dcf, so it ships an app whose push notifications do not work; it must be rebuilt. (2) capacitor.config.ts still points server.url at professionalsclub.vercel.app while every store URL in the docs says professionalsclub.ca - pick one and make both agree. (3) The feature graphic is 32-bit RGBA; Play wants 24-bit PNG with no alpha. (4) No 512x512 Play icon exists anywhere in the repo. (5) The app is Social category with a matrimony (dating) section, which puts it squarely inside Play's Child Safety Standards policy - that needs a CSAE clause published in /terms plus a named contact, and src/app/terms/page.tsx has no such clause today. On the account question: a nonprofit registering as an Organization account needs a free D-U-N-S number (up to 28-30 days lead time, no nonprofit exemption - only government bodies can be waived) but is EXEMPT from the 12-testers-for-14-days closed testing rule, which applies only to personal accounts created after 2023-11-13. Total cash cost: $25, once.

### YOU - Only the account owner can do this

- [ ] **Decide Organization vs Personal developer account before paying the $25**  
  Organization account = free D-U-N-S required, but EXEMPT from the 12-tester/14-day closed-testing gate. Personal account = no D-U-N-S, but a personal account created after 2023-11-13 must run closed testing with 12 testers opted in continuously for 14 days before production access. For a registered nonprofit the Organization route is correct and also faster to production despite the D-U-N-S wait, because 12 real devices held for 14 days is the harder constraint.  
  **Cost:** $25 USD one-time, non-refundable, no annual renewal
- [ ] **Request a D-U-N-S number for the nonprofit now - it is the longest lead time in this whole list**  
  Required for all Organization accounts. Free from Dun & Bradstreet, takes up to 28-30 days. There is NO nonprofit exemption: only known government organizations/agencies can ask Play support to enable verification without one. The Play Console developer name must match the legal organization name on the D-U-N-S record, or verification fails against the Google Payments profile.  
  **Cost:** $0, but up to 30 days
- [ ] **Complete developer identity verification (legal name, address, org phone, website, contact email)**  
  Legal name and address are checked against the D-U-N-S record via the Google Payments profile; developer email and phone are verified by one-time password. Use the professionalsclub.ca domain as the org website and a role address, not a personal one. New personal accounts face a September 2026 verification deadline; existing accounts get per-account deadlines in early 2027 with a self-serve 90-day extension available in the Console banner.
- [ ] **Rebuild the release AAB - the committed one has no Firebase in it and its push notifications are dead**  
  android/app/build/outputs/bundle/release/app-release.aab is dated 2026-08-20 00:38 and a zip listing of its 472 entries returns zero matches for 'firebase' or 'push'. FCM landed later, in 2cba9c0 and c5d3dcf (both 2026-08-24), and android/app/google-services.json is dated 2026-08-24 16:14. Uploading the existing file ships a build where push does not work. Rebuild: set JAVA_HOME to %LOCALAPPDATA%\jdk-21.0.12.1+1, then `cd android && gradlew bundleRelease`. Windows gotcha already documented in mobile/STORE-SUBMISSION.md: android/local.properties must use forward slashes.
- [ ] **Fill App access with the review member credentials - the whole app is behind sign-in**  
  App content > App access > Sign-in details. Everything the reviewer needs is behind /portal/auth, so 'All or some functionality is restricted' is the only honest answer. Use the appreview@professionalsclub.ca member account (never an admin) described in mobile/STORE-SUBMISSION.md - it already has a verified member status and an approved matrimony listing so the matrimony section is reachable. Requirements: instructions in English, credentials must work at all times without error, and they must bypass any OTP/2FA. Rotate the password after each review round.
- [ ] **Answer the content rating questionnaire as UGC-yes and dating-yes**  
  IARC questionnaire, required for every app - an 'Unrated' app can be removed. Say YES to user-generated content (community feed, groups, chat, matrimony) and YES to the dating/social-interaction questions, because the matrimony module is user-to-user matching with messaging. Expect Teen/Mature 17+ depending on region; social and dating apps with profiles and messaging generally land at 17+. Also declare that users can share their location or personal info with other members where the questionnaire asks - matrimony exposes city and contact-on-consent. Under-declaring UGC on a social app is now caught by automated scanning and can trigger removal rather than just a re-review.
- [ ] **Complete the Child Safety Standards declaration - mandatory for Social and Dating category apps**  
  This is the requirement most likely to be missed. Play requires apps in the Social and Dating categories to self-certify against the Child Safety Standards policy BEFORE publishing. Three parts: (a) publicly accessible standards that explicitly prohibit Child Sexual Abuse and Exploitation (CSAE), (b) a named child-safety point of contact for Google Play to notify, (c) self-certification of an in-app reporting mechanism and of acting on CSAM once known. Parts (b) and (c) are Console fields; part (a) needs the code change below.
- [ ] **Declare 'not a news app' in the News and Magazines declaration**  
  That declaration only binds apps that qualify for the News category. This app is Social with a member community feed, not a publisher of news content, so answer No. Do not opt into the News category to make the feed look more substantial - it pulls in publisher-verification obligations you cannot meet.
- [ ] **Declare no ads, and confirm no Advertising ID permission survives the build**  
  App content > Ads: No. There are genuinely no ad SDKs and no analytics SDKs in package.json. After rebuilding with Firebase, check the merged manifest for com.google.android.gms.permission.AD_ID (`gradlew :app:processReleaseManifest` then read app/build/intermediates/merged_manifests/release/AndroidManifest.xml). firebase-messaging should not pull it in, but if it appears, add a tools:node="remove" override - declaring 'no ads' while shipping AD_ID is a Data safety mismatch.
- [ ] **Data safety - Personal info: Name, Email address, Phone number, Address, Political or religious beliefs**  
  All collected, not shared, encrypted in transit, deletable. Name and email are required at signup; phone, city and province are optional profile fields (city/province map to 'Address', approximate). The one everyone gets wrong here: src/types/matrimony.ts:62 stores religion and :65 sub_caste, :67 mother_tongue - religion makes 'Political or religious beliefs' a MANDATORY declaration, and given caste and mother tongue you should declare 'Race and ethnicity' too. Purposes: App functionality and Account management only. Never tick Advertising or Analytics.
- [ ] **Data safety - Photos, Videos, Files and docs: all three, collected, optional**  
  Chat attachments at src/app/portal/member/chats/page.tsx:123 accept image/jpeg,png,webp,gif and :133 accept video/mp4,webm,quicktime. src/app/api/community/upload/route.ts allows the same images plus video/mp4,webm,quicktime and application/pdf and Word docs. src/components/portal/AttachmentField.tsx accepts PDF plus images. Storage is Vercel Blob. Declare Photos, Videos and Files and docs as collected, optional, App functionality.
- [ ] **Data safety - Messages: 'Other in-app messages', collected**  
  Member chat and help-desk threads. Note in the optional description that message bodies are end-to-end encrypted (src/lib/e2ee.ts) - Play has no E2E checkbox, but the free-text field is where that belongs. Chat notification rows deliberately carry no message text (body is 'New message'), which is worth a sentence too.
- [ ] **Data safety - App activity: 'Other user-generated content'**  
  Community posts and comments, help requests, volunteer applications, matrimony profiles, referral requests. Collected, not shared, App functionality.
- [ ] **Data safety - Device or other IDs: yes, because the FCM token is stored server-side**  
  src/server/repos/push.ts registerDevice() persists the device token via public.register_push_device, and src/app/actions/push.ts is the entry point. An FCM registration token is a per-installation device identifier, so declare 'Device or other IDs': collected, not shared, purpose App functionality. Do NOT declare Location - the privacy policy states no location collection and the manifest requests no location permission, which matches.
- [ ] **Target audience: 18+, and do not enrol in Designed for Families**  
  App content > Target audience and content. The service is for working-age newcomers and the matrimony section is adult matching; the privacy policy already states it is not directed at children under 13. Select 18+ only. Selecting any bracket under 18 would drag in Families policy, the Play Families ads/SDK rules, and a stricter child-safety posture.
- [ ] **Set the app free, with no in-app products - and keep it that way**  
  The listing copy promises 'no ads, no fees'. Free with no IAP means Google Play Billing does not apply at all, which removes the entire payments policy surface. If donations are ever added inside the app, that is a separate policy conversation (nonprofit donations are permitted outside Play Billing, but only under the specific donation carve-out).
- [ ] **Upload to Internal testing first, read the pre-launch report, then promote**  
  Not policy-mandated for an Organization account, but it is the cheap way to catch what a WebView shell breaks on real hardware: the pre-launch report runs the app on Google's device farm and flags crashes, ANRs and accessibility issues before a human reviewer sees them. Internal testing takes up to 100 testers and needs no review wait. Test on a real device: sign in, request help, community post with a photo and a video, matrimony, a push notification arriving, the delete-account flow on a throwaway account, and airplane mode to confirm mobile/www/error.html shows.
- [ ] **Create the production release, set countries, and submit**  
  Release name, release notes, country availability (Canada plus wherever newcomers apply from - India, Philippines and the Gulf are the obvious ones for this audience), then roll out. First reviews for a brand-new account commonly take several days and can be longer for a Social app with a dating feature; budget a week and expect at least one round of questions about the matrimony section.
- [ ] **Back up the upload keystore off this machine before you upload anything**  
  android/keystore/upload-keystore.jks and android/keystore.properties are gitignored and exist only on this Windows machine. Put both in a password manager now. Play App Signing makes a lost upload key recoverable via a support reset rather than fatal, but that is a several-day detour, and the .jks disappearing with the machine is the single most common way a small team loses the ability to ship an update.

### CODE - A code or asset change in this repo

- [ ] **Point capacitor.config.ts server.url at the domain your store listing actually claims**  
  capacitor.config.ts currently resolves to https://professionalsclub.vercel.app/portal/auth, while mobile/store-listing.md and mobile/STORE-SUBMISSION.md give every store URL as professionalsclub.ca (privacy, support, marketing, deletion). A reviewer who sees a vercel.app WebView against a .ca privacy policy has a mismatch to flag. Either bring professionalsclub.ca live and switch server.url plus the allowNavigation entry, or file the vercel.app URLs in the listing. Do not ship the split.
- [ ] **Produce the 512x512 app icon - it does not exist in the repo**  
  Play requires a 32-bit PNG, 512x512, under 1MB. mobile/store-assets/ has no icon at all; icons/icon-512.webp is the wrong format and assets/logo.png is bare 1024x1024 logo art with alpha. The correct source is the composed launcher art at ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png (1024x1024, RGB, no alpha) - downscale it to 512x512 PNG into mobile/store-assets/play/icon-512.png.
- [ ] **Flatten the feature graphic - it currently carries an alpha channel Play rejects**  
  mobile/store-assets/play/feature-graphic-1024x500.png is 1024x500 but PNG colour type 6 (RGBA, 32-bit). Play's spec is JPEG or 24-bit PNG with NO alpha. Composite it onto the brand background (#0f2318) and re-save as 24-bit PNG or JPEG.
- [ ] **Add an explicit CSAE prohibition clause to /terms**  
  src/app/terms/page.tsx 'Acceptable use' bans content that is 'unlawful, discriminatory or sexually explicit' - that is not the explicit CSAE prohibition the Child Safety Standards policy demands. Add a clause naming child sexual abuse and exploitation as prohibited, stating that such content is removed and reported to authorities, and giving a child-safety contact address. The page is a public route, which satisfies 'publicly accessible standards'.
- [ ] **Add an anchor id to the privacy page's deletion section so the deletion URL can be a deep link**  
  Play's rule: the deletion URL must load without error, be publicly accessible without login, name the app or developer, and have the deletion pathway 'prominently featured and easily discoverable'. Reusing a privacy policy is explicitly allowed only if the deletion section is prominent 'for example, through an anchor link'. src/app/privacy/page.tsx renders sections from a SECTIONS array with no id attribute, so /privacy#delete-account does not resolve today - the reviewer lands at the top of an eight-section page. Add id={slug(s.heading)} to the <section> and file the URL as .../privacy#deleting-your-account-and-data. Cheaper and safer than a dedicated /delete-account route.
- [ ] **Recheck the privacy policy against what the app now does - two claims have gone stale**  
  src/app/privacy/page.tsx says 'the app requests no device permissions' and does not mention push notifications or Vercel Blob. Since commit c5d3dcf the manifest declares POST_NOTIFICATIONS, the app asks for notification permission at runtime, and device tokens are stored server-side. Also 'we do not collect your ... photos or files beyond what you attach yourself' understates chat video attachments. A Data safety form that declares Device IDs and Videos against a policy that denies permissions is exactly the mismatch Play flags. Fix the policy, then fill the form.

### DONE - Already true in this repo - verify, do not redo

- [ ] **targetSdk 36 - already compliant with the Aug 31 2026 requirement, no action**  
  android/variables.gradle sets compileSdkVersion 36 and targetSdkVersion 36, minSdkVersion 24. From 2026-08-31 new apps and app updates must target API 36; extensions to 2026-11-01 exist but are not needed here. This repo is ahead of the deadline, not scraping past it.
- [ ] **AAB is mandatory - APK uploads are not accepted for new apps**  
  Required since Aug 2021 and unchanged in 2026. `gradlew bundleRelease` already produces the right artifact. The three APKs in mobile/test-apk/ (STORE, DEV, EMULATOR) are for sideloading only - do not attempt to upload them. Nothing here is near the 200MB Play Asset Delivery threshold (the shell is ~3.1MB).
- [ ] **Enrol in Play App Signing using the existing upload keystore**  
  android/keystore/upload-keystore.jks with android/keystore.properties (both gitignored, local to this machine only) is already wired into the release signingConfig in android/app/build.gradle. For a NEW app Play generates the app signing key for you and treats the key that signed your first upload as the upload key - so simply uploading the AAB enrols it, no PEPK export needed. Back up the .jks and its passwords to a password manager before the first upload; Play can reset a lost upload key, but the reset is a support round-trip you do not want mid-review.
- [ ] **Bump versionCode above 1 on every upload, including after a rejection**  
  android/app/build.gradle has versionCode 1 / versionName "1.0". Fine for the very first upload, but Play refuses a repeat versionCode even for a build that was rejected, so budget a bump per attempt.
- [ ] **Phone screenshots are already compliant - upload as-is**  
  The six files in mobile/store-assets/play/ are all 1080x1920, PNG colour type 2 (RGB, no alpha), 0.7-1.5MB each. Play needs a minimum of 2 phone screenshots (max 8), each side between 320px and 3840px, aspect ratio between 9:16 and 9:21 for portrait - 1080x1920 is exactly 9:16. Six is a good count. The appstore-6.7/ set is iOS-only, ignore it here.
- [ ] **Paste in the store listing copy that already exists**  
  mobile/store-listing.md holds the app name (Professionals Club, within the 30-char cap), the 80-char Play short description, the long description, category Social, and the review notes. Reused verbatim it is consistent with the app - which matters, because the content rating and Data safety answers below are derived from the same document.
- [ ] **UGC policy: report, block and moderation all already exist and are citable**  
  Play requires in-app reporting AND blocking for public UGC and for 1:1 interaction. All three modules have both: src/app/actions/chat.ts:101 blockMember, :105 unblockMember, :113 reportMember; src/app/actions/community.ts:251 reportCommunityContent, :265 blockCommunityMember, :274 unblockCommunityMember; src/app/actions/matrimony.ts:123 blockProfile, :127 reportProfile. Moderation is structural, not bolted on - matrimony profiles and photos are admin-approved before any member sees them. Name these paths in the review notes.
- [ ] **UGC policy: terms acceptance before posting is already enforced**  
  Play requires users to accept terms before creating or uploading UGC. src/app/portal/signup/page.tsx:112 tracks consentTerms, :723 renders the required 'I have read and agree to the Terms & Conditions and Privacy Policy' checkbox, and :778 disables submit until it and four other consents are checked. Matrimony adds a second gate at src/app/portal/member/matrimony/create/page.tsx:452 (terms_accepted plus age_confirmed).
- [ ] **Data safety - security practices: encrypted in transit YES, deletion request YES**  
  Both answerable truthfully. TLS end to end via Vercel and Neon; row-level security restricts reads. The deletion answer is backed by a real mechanism, not a promise: src/app/actions/auth.ts:159 deleteOwnAccount(), invoked from src/app/portal/member/profile/page.tsx:206. Also tick 'users can request that their data be deleted'. Do not claim independent security review - there is none, only the internal SECURITY-AUDIT.md.
- [ ] **In-app account deletion path - already built, and Play requires it alongside the URL**  
  Portal > My Profile > Delete My Account. src/app/actions/auth.ts:159 deleteOwnAccount() runs the cascade; the UI calls it at src/app/portal/member/profile/page.tsx:206. Play is explicit that the web link does not substitute for the in-app path - both must coexist, and the in-app path must be prominent, e.g. within account settings. It is.
- [ ] **Verify /privacy and /terms both resolve publicly, unauthenticated, on the domain you file**  
  Both routes exist: src/app/privacy/page.tsx (Last updated 15 August 2026, includes a 'Deleting your account and data' section) and src/app/terms/page.tsx. Neither sits under /portal, so neither is proxy-gated. Confirm with a signed-out browser on the actual domain you file with Play - which per the item above must be the same host the WebView loads.

### Gotchas

- The committed AAB is a trap. mobile/STORE-SUBMISSION.md says 'The signed release bundle exists ... This is the file Play Console asks for', written 2026-08-19. Push notifications landed 2026-08-24 in commits 2cba9c0 and c5d3dcf. A zip listing of the 472 entries in app-release.aab returns zero Firebase matches. Anyone who follows that doc literally uploads a build whose headline native feature does nothing. Update the doc when you rebuild.
- Organization account trades a 30-day wait for skipping a 14-day gate, and the wait is the better deal. D-U-N-S can take 28-30 days, but an Organization account is exempt from the 12-testers-opted-in-for-14-continuous-days rule that binds personal accounts created after 2023-11-13. That rule resets its counter if a single tester drops out mid-window, and emulators and duplicate Google accounts do not count - for a volunteer-run nonprofit, herding 12 real devices for 14 unbroken days is harder than waiting on Dun & Bradstreet. Start the D-U-N-S request first, do everything else in parallel.
- There is no nonprofit exemption from D-U-N-S. The only documented waiver is for known government organizations and agencies, granted by contacting Play support during payment-profile setup. A registered charity is an Organization like any other.
- targetSdk 36 is compliant with the newest rule, not merely the old one. Ignore the widely-repeated 'API 35 by August 31 2026' framing in blog posts - that is the bar for EXISTING apps to stay available to new users. New apps and app updates submitted from 2026-08-31 must target API 36, which android/variables.gradle already does.
- The domain split will get noticed. capacitor.config.ts loads professionalsclub.vercel.app while every URL in mobile/store-listing.md is professionalsclub.ca. Play requires the deletion URL to 'reference the app or developer name' and to load without error; a reviewer comparing a vercel.app WebView against a .ca privacy policy has a legitimate question. Resolve it before submitting, not during review.
- A privacy-policy page only satisfies the deletion-URL rule if the deletion section is genuinely prominent. Google's wording allows reusing an existing policy 'if the data deletion section should be highlighted and reasonably prominent (for example, through an anchor link)'. src/app/privacy/page.tsx has no section ids, so the anchor does not exist yet - filing the bare /privacy URL means the reviewer lands on section one of eight and may reject the link as not prominent.
- Matrimony makes religion a mandatory sensitive-data declaration. src/types/matrimony.ts stores religion (:62), sub_caste (:65) and mother_tongue (:67). 'Political or religious beliefs' is a Data safety category people forget because it sounds political; religion alone triggers it, and caste plus mother tongue argue for 'Race and ethnicity' as well. Omitting it on a matrimony app is the kind of mismatch Play's automated scanning is built to catch.
- The FCM token is a device identifier for Data safety purposes. It is easy to answer 'no' to Device or other IDs on an app with no ads and no analytics, but src/server/repos/push.ts persists a per-installation token server-side, so the answer is yes. Purpose is App functionality only.
- Child Safety Standards is not optional for this app and is not in the obvious checklist. Play applies it to Social and Dating category apps, and the matrimony module plus the Social listing category puts this app in scope. It needs a CSAE prohibition published on a public page - src/app/terms/page.tsx currently bans 'sexually explicit' content, which is not the same declaration - plus a named point of contact and self-certification, all before publishing.
- The privacy policy now contradicts the build. It says 'the app requests no device permissions', but AndroidManifest.xml declares POST_NOTIFICATIONS and the app prompts for it at runtime. Fix the policy before filling Data safety, because the form and the policy are cross-read.
- The feature graphic's alpha channel is invisible until Play Console rejects the upload. feature-graphic-1024x500.png is PNG colour type 6 (RGBA). The dimensions are right, which is why this slips through a visual check. Play wants 24-bit PNG or JPEG with no alpha.
- Apple's 4.2 'minimum functionality' worry does not transfer to Play. mobile/STORE-SUBMISSION.md is right that Play accepts WebView apps that are not spam. Do not add native features to appease a rule Play does not have - but do keep the review notes describing the account system, help desk, matrimony and push, because a reviewer who sees only a web page loading may still ask.
- Because the WebView loads the hosted site, a bad production deploy is a store-quality incident. The reviewer sees whatever professionalsclub.ca serves at review time, not a frozen bundle. Freeze web deploys during a review round, and verify the production site works signed-out and signed-in immediately before submitting.


## Apple App Store (iOS)

Verified against current (Aug 2026) Apple docs. Six things in this repo will block or break an iOS submission today and are not in mobile/STORE-SUBMISSION.md: (1) ios/App/CapApp-SPM/Package.swift was generated on Windows and contains backslash paths ("..\..\..\node_modules\@capacitor\app") — that is an invalid Swift escape sequence, so the package manifest will not compile on any machine, and it also omits CapacitorPushNotifications entirely; running `npx cap sync ios` on the macOS CI runner regenerates both. (2) There is no App.entitlements file and no Push Notifications capability, so aps-environment is missing and push will silently fail in production. (3) AppDelegate.swift lacks the two didRegisterForRemoteNotifications methods @capacitor/push-notifications requires, so iOS never returns a token at all. (4) Info.plist has no ITSAppUsesNonExemptEncryption and no camera/microphone purpose strings — the file-upload "Take Photo" path in a WKWebView file input crashes without NSCameraUsageDescription. (5) The App Privacy label plan in STORE-SUBMISSION.md is materially incomplete: matrimony_profiles collects religion, community, sub_caste and mother_tongue, which is Apple's "Sensitive Info" category, plus chat photos/videos and the push device token. (6) Since 28 April 2026 every submission must be built with Xcode 26 / iOS 26 SDK, which rules out Xcode Cloud for you because Apple still requires Xcode on a Mac to create the first workflow. On the two questions you asked to be settled: Sign in with Apple is NOT required (guideline 4.8 explicitly exempts apps that "exclusively use your company's own account setup and sign-in systems"), and ITSAppUsesNonExemptEncryption should be false because WebCrypto AES-GCM is encryption within the Apple operating system, which needs no documentation and no French declaration. Recommended build path: Codemagic free tier (500 macOS M2 min/month, no credit card) with automatic code signing driven by an App Store Connect API key, which creates the distribution certificate and provisioning profile for you and needs no Mac GUI at any point.

### YOU - Only the account owner can do this

- [ ] **Get a D-U-N-S Number for the nonprofit's legal entity before starting enrollment**  
  Organization enrollment requires a D-U-N-S registered to the exact legal entity name (no DBAs, trade names or branches). Look up / request free at developer.apple.com/enroll/duns-lookup. Allow up to 2 business days after issuance for Apple to receive the record from D&B before you can enroll.  
  **Cost:** Free
- [ ] **Publish professionalsclub.ca and create a work email on that domain — this is an enrollment blocker**  
  Apple: "Your organization's website must be publicly available and functional, and its domain name must be associated with your organization" and "Your work email address needs to be associated with your organization's domain name." Right now capacitor.config.ts points at professionalsclub.vercel.app and the account email is udit@indocanada.org. Either enroll as Indo Canada (matching indocanada.org) or get the .ca domain live with a mailbox first. Social links and registrar parking pages are explicitly rejected.  
  **Cost:** Domain + mailbox, ~$20-60 CAD/yr
- [ ] **Enroll the organization in the Apple Developer Program on the web**  
  developer.apple.com/programs/enroll — organization enrollment is available on the web, so no iPhone, iPad or Mac is needed (the Apple Developer app path is optional except in India). The person enrolling must have legal authority to bind the organization. Expect notarized business documents and a binding-authority reference check. Typical time to approval: 1-4 weeks.  
  **Cost:** $99 USD/yr (~$149 CAD + tax) unless the waiver is granted
- [ ] **Select the fee waiver option during enrollment — Canada is an eligible region**  
  Eligibility, all of which you meet: a legal entity with recognized nonprofit status (in Canada, CRA registration / federal or provincial nonprofit incorporation); not an individual, sole proprietor or single-person business; has not signed the Paid Applications Agreement; sells no digital goods or services in any app; distributes only free apps. Eligible regions include Canada. Apple reviews and contacts you if more documentation is needed; no published SLA, so budget the same 1-4 weeks. If you have already enrolled and paid, submit at developer.apple.com/contact/membership-fee-waiver/ before the expiry date — there are no refunds for a period already paid.  
  **Cost:** Saves $99 USD/yr; waiver itself is free
- [ ] **Never sign the Paid Applications Agreement, and re-confirm eligibility at each annual renewal**  
  Signing Schedules 2 & 3 of the Developer Program License Agreement (paid apps or IAP) voids the waiver and makes you liable for $99 USD/yr. The Account Holder must renew and re-confirm eligibility starting 30 days before expiry.  
  **Cost:** $0 if kept free-only
- [ ] **Create an App Store Connect API key for CI**  
  App Store Connect > Users and Access > Integrations > App Store Connect API > + . Give it App Manager access. You get an Issuer ID, a Key ID and a .p8 that downloads exactly once. This one key drives both automatic signing (certificate + profile creation) and the TestFlight/App Store upload, and is what replaces every Mac GUI step.  
  **Cost:** Free
- [ ] **Generate the certificate private key on Windows with OpenSSL**  
  `openssl genrsa -out ios_distribution_private_key.pem 2048`. Hand that PEM to Codemagic (or fastlane match); it creates the Apple Distribution certificate for you through the API. If you prefer to do it by hand: `openssl req -new -key <key>.pem -out CertificateSigningRequest.certSigningRequest -subj "/emailAddress=you@domain/CN=Professionals Club/C=CA"`, upload the CSR at Certificates, Identifiers & Profiles > Certificates > +, download the .cer, then `openssl x509 -inform DER -in cert.cer -out cert.pem` and `openssl pkcs12 -export -inkey key.pem -in cert.pem -out dist.p12`. Back the private key up — losing it means revoking and reissuing.  
  **Cost:** Free
- [ ] **Register the App ID ca.professionalsclub.app with the Push Notifications capability enabled**  
  Certificates, Identifiers & Profiles > Identifiers > + > App IDs > App > explicit bundle ID `ca.professionalsclub.app`, then tick Push Notifications. Do this BEFORE generating the provisioning profile: profiles do not gain capabilities retroactively, and a profile created before push was enabled produces the classic "missing aps-environment entitlement" upload rejection (ITMS-90078 / no valid aps-environment string).  
  **Cost:** Free
- [ ] **Create the App Store distribution provisioning profile after push is enabled**  
  Profiles > + > App Store Connect (iOS), select the App ID and the distribution certificate. Codemagic's automatic signing does this for you and is the safer route precisely because it regenerates on every build. If you ever add push after the fact, delete and recreate the profile.  
  **Cost:** Free
- [ ] **Create the APNs Auth Key (.p8) — one team-wide key, downloadable once**  
  Certificates, Identifiers & Profiles > Keys > + > tick Apple Push Notification service > choose Team Scoped > Confirm > Download. Note the 10-character Key ID and your 10-character Team ID. Apple does not store the key and the Download button is permanently disabled afterwards. This same .p8 covers both sandbox and production. Store it as a secret alongside FCM_SERVICE_ACCOUNT_B64 (base64 it for the same reason the FCM key is base64'd — PEM newlines get mangled by every env pipeline).  
  **Cost:** Free
- [ ] **No BIS annual self-classification report is required**  
  Apple's docs warn that exempt-encryption apps "might alternatively be required to submit a year-end self-classification report", but BIS exempts mass market encryption items classified 5A992.c / 5D992.c — and BIS names "mobile devices and apps, and retail software" as the canonical mass market example. A free App Store app using only OS crypto lands there. If you ever want belt-and-braces, the filing is free: a CSV emailed to crypt@bis.doc.gov and enc@nsa.gov by 1 February.  
  **Cost:** Free (and almost certainly not needed)
- [ ] **Consider restricting App Store availability to Canada to sidestep export compliance entirely**  
  Apple's rule opens with "If you distribute your app outside the U.S. or Canada, your app is subject to U.S. export laws." App Store Connect's exemption list includes an explicit "available only in the U.S. and/or Canada" option. For a nonprofit serving newcomers to Canada this is arguably the right product decision anyway, and it removes the entire question. Set it in App Store Connect > Pricing and Availability.  
  **Cost:** Free
- [ ] **Add or confirm a zero-tolerance UGC clause in /terms**  
  src/app/terms/page.tsx exists. Apple expects terms that make clear objectionable content and abusive users are removed, and that removal is your responsibility. Either the default Apple EULA plus your terms, or your own EULA linked from App Store Connect > App Information > License Agreement.
- [ ] **Complete the new age rating questionnaire — the old ratings are gone**  
  Apple replaced 12+ and 17+ with 13+, 16+ and 18+ in 2025; every app had to complete the expanded questionnaire by 31 January 2026 and submissions are blocked until it is done. Expect 13+ or higher: the app has unmoderated-in-real-time member chat and, via the WebView, effectively unrestricted web access. Answer honestly about in-app controls (you have block/report), chat, and UGC. A higher rating is not a rejection; a wrong answer is.  
  **Cost:** Free
- [ ] **Understand the server.url risk and have the fallback ready**  
  capacitor.config.ts sets server.url to a remote origin. Capacitor's own maintainers state server.url was only ever intended for development, and an all-remote setup is the configuration most often argued into guideline 4.7 / 4.2.2 territory. It is not an automatic rejection and plugins do work (Capacitor injects the bridge into the remote page, as src/lib/push.ts already relies on), but have the fallback prepared before you submit: build the Next.js app to static assets, point webDir at them, and ship updates through the store or a live-update channel. Also switch server.url off the vercel.app hostname before the first submission — a reviewer seeing professionalsclub.vercel.app in the URL bar reads "someone else's website".
- [ ] **Create the review demo account and put credentials in App Review Information**  
  appreview@professionalsclub.ca already exists per STORE-SUBMISSION.md (email pre-verified, member not admin, approved matrimony listing). Confirm it still works against production, rotate the password for this round, and enter username + password in App Store Connect > App Review Information. Add notes: how to reach Report and Block, that push requires accepting the OS prompt, and that account deletion is at Portal > My Profile > Delete My Account. Never supply an admin account.
- [ ] **Keep /privacy and /terms reachable without signing in, and add the privacy policy URL in App Store Connect**  
  src/app/privacy/page.tsx and src/app/terms/page.tsx exist. Apple requires a publicly accessible privacy policy URL per app, and the page must be truthful against the labels above — which means it needs updating to mention the push device token and the sensitive matrimony fields. Also confirm 5.1.1(v) account deletion is discoverable in-app; it is already implemented.
- [ ] **Create the app record in App Store Connect and fill the metadata**  
  My Apps > + > New App, platform iOS, bundle ID ca.professionalsclub.app, SKU, primary language. Then: name (30 chars), subtitle (30), promotional text (170), description (4000), keywords (100), support URL, marketing URL, copyright, primary and secondary category (Social Networking or Lifestyle fits a community org better than Business), and the 1024x1024 App Store icon with no alpha and no transparency. Copy from mobile/store-listing.md and trim to the iOS character limits, which are tighter than Play's.  
  **Cost:** Free
- [ ] **Verify the 1024x1024 marketing icon has no alpha channel**  
  ios/App/App/Assets.xcassets/AppIcon.appiconset/ contains only AppIcon-512@2x.png, which is the single-size iOS 17+ format and is correct. Apple rejects icons with an alpha channel or transparency. Regenerate from assets/logo.png with `npx @capacitor/assets generate --iconBackgroundColor '#0f2318' --splashBackgroundColor '#0f2318'` then `npx cap sync`, and confirm the output is opaque RGB.

### CODE - A code or asset change in this repo

- [ ] **Do not commit or rely on the Windows-generated ios/App/CapApp-SPM/Package.swift — run `npx cap sync ios` on the CI runner**  
  The committed file contains `path: "..\..\..\node_modules\@capacitor\app"`. `\.` is not a valid Swift escape, so the manifest fails to compile everywhere, not just on macOS. It also lists only CapacitorApp and CapacitorStatusBar — CapacitorPushNotifications is missing, and ios/App/App/capacitor.config.json is stale (bare server URL, packageClassList without PushNotificationsPlugin). Make `npm ci && npx cap sync ios` the first step of the CI build so both files are regenerated correctly on macOS. Consider gitignoring both.
- [ ] **Add ios/App/App/App.entitlements with aps-environment and wire it into the target**  
  The repo has no .entitlements file at all. Xcode does not copy aps-environment from the provisioning profile at build time — it must be in the entitlements file or set via the Push Notifications capability. Create App.entitlements containing key `aps-environment` = `production` (Xcode/CI overrides to `development` for debug builds), then add CODE_SIGN_ENTITLEMENTS = App/App.entitlements to both build configurations in ios/App/App.xcodeproj/project.pbxproj, plus a SystemCapabilities entry for com.apple.Push. This is editable as text on Windows, but it is the one pbxproj edit worth having the CI mac verify first.
- [ ] **Confirmed: FCM HTTP v1 cannot address a raw APNs token — a fix is mandatory, not optional**  
  src/server/push/fcm.ts sends `{ token: msg.to }` to /v1/projects/{id}/messages:send, which requires an FCM registration token. @capacitor/push-notifications documents plainly: "On iOS it contains the APNS token. On Android it contains the FCM token." Firebase has confirmed that minting registration tokens from raw APNs tokens is not supported in HTTP v1 (it existed only in the decommissioned legacy API). src/server/repos/push.ts and db/migrations/0038_push_devices.sql already store platform in ('android','ios','web'), so you can branch cleanly. Without a fix, every iOS send returns an invalid-token error and the narrow delete heuristic in fcm.ts will start deleting live iOS tokens.
- [ ] **Recommended fix: send iOS pushes directly to APNs and keep FCM for Android**  
  Less total work than the Firebase route despite the server already using FCM, because all the work stays in files you can edit and test on Windows. Add src/server/push/apns.ts: ES256 JWT signed with the .p8 (`createSign('SHA256')` over the P-256 key — node:crypto already does the RS256 equivalent in fcm.ts), header {alg:'ES256', kid:<Key ID>}, claims {iss:<Team ID>, iat}, cached for under an hour (APNs 403 ExpiredProviderToken past that). POST to https://api.push.apple.com/3/device/<hex token> with apns-topic = ca.professionalsclub.app, apns-push-type: alert, apns-priority: 10, apns-collapse-id = the same collapseKey fcm.ts already computes. The existing `apns` config block in fcm.ts maps one-to-one onto these headers, so the port is mechanical. Then branch on platform in the drain. Zero iOS native changes beyond the entitlement and AppDelegate work you need anyway.
- [ ] **Add the two remote-notification methods to ios/App/App/AppDelegate.swift — required on either push path**  
  The plugin gets its token only through NotificationCenter, and the current AppDelegate has neither method, so iOS returns nothing today. Add `application(_:didRegisterForRemoteNotificationsWithDeviceToken:)` posting `.capacitorDidRegisterForRemoteNotifications` with the deviceToken (or the FCM token on the Firebase path), and `application(_:didFailToRegisterForRemoteNotificationsWithError:)` posting `.capacitorDidFailToRegisterForRemoteNotifications` with the error. Pure text edit, safe from Windows.
- [ ] **Add ITSAppUsesNonExemptEncryption = false to ios/App/App/Info.plist**  
  src/lib/e2ee.ts uses only crypto.subtle (ECDH, HKDF, AES-GCM-256) — no bundled crypto library, no proprietary algorithm. WebCrypto in WKWebView is "encryption limited to that within the Apple operating system", which Apple's own table maps to "No documentation required in App Store Connect". Apple's rule for the key: set NO "if your app... doesn't use encryption, or if it only uses forms of encryption that are exempt from export compliance documentation requirements". Setting the key skips the export questionnaire on every single submission, which is the whole point of adding it. Verify by opening ios/App/App/Info.plist and adding `<key>ITSAppUsesNonExemptEncryption</key><false/>`.  
  **Cost:** Free
- [ ] **Add camera and microphone purpose strings to Info.plist before the first submission**  
  src/components/portal/community.tsx and the matrimony create page use `<input type="file" accept="image/...">`, and src/app/actions/chat.ts supports attachmentKind 'image' \| 'video' \| 'file'. When a user picks "Take Photo" or "Take Video" from the WKWebView file-input sheet, iOS presents the camera and the app terminates immediately if NSCameraUsageDescription is absent — a documented, reproducible crash that will fail App Review under 2.1. Add NSCameraUsageDescription and NSMicrophoneUsageDescription (video capture records audio). Photo-library picking goes through PHPicker and needs no permission, but add NSPhotoLibraryAddUsageDescription only if you ever save back to the library. Write the strings as real sentences naming the feature — Apple rejects generic strings under 5.1.1.
- [ ] **Decide iPad support: keep TARGETED_DEVICE_FAMILY = "1,2" and ship iPad screenshots, or set it to "1"**  
  project.pbxproj currently declares "1,2" (iPhone + iPad) in both configurations. That makes at least one 13" iPad screenshot at 2064 x 2752 mandatory — App Store Connect will block submission without it — and it invites the reviewer to test a phone-shaped WebView stretched to an iPad, which is a real 4.2 aggravator. Setting TARGETED_DEVICE_FAMILY = 1 drops the iPad screenshot requirement; the app still installs and runs on iPad in iPhone compatibility mode and still appears in iPad search results. Given no iPad layout exists in globals.css, opting out is the lower-risk choice.
- [ ] **App Privacy labels: STORE-SUBMISSION.md is materially incomplete — add Sensitive Info, Photos/Videos and Device ID**  
  Verified against src/types/matrimony.ts: matrimony profiles collect `religion`, `community`, `sub_caste` and `mother_tongue`, which fall squarely under Apple's Sensitive Info category ("racial or ethnic data... religious or philosophical beliefs") and must be declared, Linked to You, purpose App Functionality. Also missing: User Content > Photos or Videos (chat attachmentKind 'image'\|'video'\|'file'); Identifiers > User ID and Device ID (the push token in db/migrations/0038_push_devices.sql, stored against a profile, is a Device ID linked to the user); and User Content > Emails or Text Messages for chat. Keep Contact Info (name, email, phone). Data Used to Track You: none — there is no ATT prompt and no analytics SDK. Update the table in mobile/STORE-SUBMISSION.md so it stops being wrong.
- [ ] **Ship the native login screen and cite it as the primary 4.2 mitigation**  
  Guideline 4.2 is the real rejection risk: "Your app should include features, content, and UI that elevate it beyond a repackaged website", and 4.2.2 targets "web clippings". The mitigations that actually move reviewers, in order: APNs push (once fixed — the single strongest "this is really an app" signal), a genuinely native login screen, native offline handling (mobile/www/error.html + errorPath already wired), and native status bar / splash (already in place). One implementation note the store cares about: after a native login you must transfer the session cookie into WKWebView's WKHTTPCookieStore, or the WebView will bounce the member straight back to /portal/auth and the reviewer will file it as a broken login under 2.1.
- [ ] **Set DEVELOPMENT_TEAM and switch to manual signing for CI**  
  project.pbxproj has CODE_SIGN_STYLE = Automatic, no DEVELOPMENT_TEAM, and a stale CODE_SIGN_IDENTITY = "iPhone Developer" in two configurations. Automatic signing needs an authenticated Xcode GUI and fails headlessly. Codemagic's `xcode-project use-profiles` rewrites these from the fetched profiles, which is the reason to prefer it; if you use fastlane instead, set CODE_SIGN_STYLE = Manual, DEVELOPMENT_TEAM = <Team ID>, and CODE_SIGN_IDENTITY = "Apple Distribution".
- [ ] **Bump MARKETING_VERSION and CURRENT_PROJECT_VERSION on every upload**  
  Both sit at 1.0 / 1 in ios/App/App.xcodeproj/project.pbxproj and are surfaced through Info.plist as $(MARKETING_VERSION) / $(CURRENT_PROJECT_VERSION). App Store Connect rejects a duplicate build number even for a build that was itself rejected — same rule as Play's versionCode. Drive CURRENT_PROJECT_VERSION from the CI build number (`agvtool`, or Codemagic's $BUILD_NUMBER) so it can never collide.

### MAC/CI - Needs a Mac or a cloud build service

- [ ] **Rule out Xcode Cloud — it cannot be started without a Mac**  
  Apple: "Get started by configuring a workflow in Xcode", and the requirements are Xcode 15.0+ plus program membership. The first workflow must be created in Xcode on macOS; App Store Connect on the web only manages subscriptions and usage afterwards. The 25 free compute hours/month that come with membership are attractive but unreachable for you. (Paid tiers, for reference: $49.99/100h, $99.99/250h, $399.99/1000h monthly.)  
  **Cost:** Free 25h/mo, but unusable without a Mac
- [ ] **Use Codemagic free tier as the build path — recommended**  
  500 free build minutes/month on Mac mini M2, reset on the 1st, no credit card, unlimited apps, 1 concurrency. Overage is $0.095/min on M2. Crucially it removes the last Mac-GUI step: with automatic code signing it calls the App Store Connect API to fetch or create the distribution certificate and provisioning profile (`app-store-connect fetch-signing-files`), then `xcode-project use-profiles`, then publishes to TestFlight/App Store. A Capacitor iOS archive is roughly 8-15 min, so 500 min/month is ~30-60 builds. No open-source or nonprofit discount exists.  
  **Cost:** $0/mo on free tier
- [ ] **Fallback: GitHub Actions macos-26 runner with fastlane match**  
  Private repo on the Free plan gets 2,000 included minutes/month, but macOS bills at a 10x multiplier — so about 200 real macOS minutes, roughly 15-25 Capacitor archives. Overage is $0.062/min for the standard 3-4 core macOS runner. Use the `macos-26` label (GA since 26 Feb 2026, Apple Silicon, default Xcode currently 26.4.1 moving to 26.6 on 21 Jul 2026). If you ever make the repo public, standard runners including macOS are unlimited and free — but do not do that, this repo contains SECURITY-AUDIT.md and TEST-ACCOUNTS.md.  
  **Cost:** $0 within 200 macOS-equivalent min/mo, then $0.062/min
- [ ] **Confirm the build uses Xcode 26 / iOS 26 SDK — mandatory since 28 April 2026**  
  Apple rejects any app or update submitted to App Store Connect that is not built with Xcode 26 or later against the iOS 26 SDK. Capacitor 8 already requires Xcode 26.0+ and an iOS 15.0 deployment target, and project.pbxproj is set to IPHONEOS_DEPLOYMENT_TARGET = 15.0, so no code change is needed — just pin the CI image (Codemagic `xcode: 26.x`, or GitHub `runs-on: macos-26`). Deployment target is unrelated to build SDK; iOS 15 support is retained.
- [ ] **Alternative fix: add the Firebase iOS SDK so the plugin returns an FCM token**  
  Zero server change, but the iOS work is the expensive half and is exactly what you cannot do from Windows. You must add the FirebaseMessaging SPM dependency (github.com/firebase/firebase-ios-sdk) to the Xcode project — CapApp-SPM/Package.swift says "DO NOT MODIFY THIS FILE - managed by Capacitor CLI", so this means either an Xcode GUI session or hand-editing XCRemoteSwiftPackageReference blocks in project.pbxproj; add GoogleService-Info.plist to the app target (another pbxproj edit); call FirebaseApp.configure() in AppDelegate; and in didRegisterForRemoteNotificationsWithDeviceToken set `Messaging.messaging().apnsToken = deviceToken` then post the result of `Messaging.messaging().token()` on .capacitorDidRegisterForRemoteNotifications. Also upload the .p8 to Firebase Console > Project settings > Cloud Messaging > APNs Auth Key. It also adds several minutes of SDK compilation to every CI build, eating the free minute budget.  
  **Cost:** $0 in fees, higher CI minutes
- [ ] **Optional: add an app-level PrivacyInfo.xcprivacy**  
  Capacitor already ships manifests for its own frameworks (node_modules/@capacitor/ios/Capacitor/Capacitor/PrivacyInfo.xcprivacy and the Cordova bridge). The app target uses no required-reason APIs of its own, so a manifest is not strictly required. Adding one declaring NSPrivacyTracking = false and empty tracking domains is cheap insurance against the ITMS-91053 warning family, but it needs a pbxproj resource entry — worth doing on the CI mac's first successful build, not before.
- [ ] **Do a TestFlight pass on a real iPhone before submitting**  
  There is no test suite in this repo, so the only verification is the device. Once CI uploads a build, install via TestFlight and exercise: native login, session carried into the WebView, sign-in from cold start, a real push arriving and deep-linking (tests the whole APNs fix end to end), photo and video upload from both camera and library (tests the purpose strings), E2EE chat send/receive on two devices, airplane-mode offline screen, matrimony, and delete-account with a throwaway account. TestFlight external testing needs its own App Review pass, so use internal testers to iterate.  
  **Cost:** Free

### DONE - Already true in this repo - verify, do not redo

- [ ] **No French encryption declaration and no CCATS are needed**  
  The French declaration is triggered only by "an industry standard algorithm, not provided within the Apple operating system", and CCATS only by proprietary algorithms not accepted by IEEE/IETF/ITU. You ship neither. The declaration would also only apply if you distribute in France at all. Do not upload anything, and do not add ITSEncryptionExportComplianceCode — that key is only for a code Apple gives you after reviewing documentation you did not have to submit.  
  **Cost:** Free
- [ ] **iPhone screenshots: the existing 1290 x 2796 set is already accepted**  
  mobile/store-assets/appstore-6.7/ holds six PNGs at 1290 x 2796 (verified). Apple's current spec lists the 6.9" display row as accepting 1260x2736, 1290x2796 OR 1320x2868, and only the 6.9" row is Required if the app runs on iPhone (6.5" at 1284x2778 / 1242x2688 is the fallback if 6.9" is absent). Everything smaller is auto-scaled. 1 to 10 per display size, .png or .jpg, no alpha channel. The folder name is now misleading — rename it appstore-6.9. Reshoot only if the native login screen changes the first screen.  
  **Cost:** Free
- [ ] **Sign in with Apple is NOT required — verified against the live text of guideline 4.8**  
  4.8 applies only to apps that "use a third-party or social login service (such as Facebook Login, Google Sign-In...) to set up or authenticate the user's primary account", and the first listed exception is "Your app exclusively uses your company's own account setup and sign-in systems." Email/password via Neon Managed Better Auth is exactly that. Do not add Sign in with Apple, and do not let a reviewer's boilerplate reply talk you into it — quote the exception in Resolution Center. This changes the moment you add Google or Facebook login.  
  **Cost:** Free
- [ ] **UGC compliance under 1.2 is largely already built — document it in the review notes**  
  Guideline 1.2 requires four things. Verified present: report and block across every UGC surface (blockMember/reportMember in src/app/actions/chat.ts, reportCommunityContent/blockCommunityMember in community.ts, blockProfile/reportProfile in matrimony.ts) plus admin triage (fetchCommunityReports, resolveCommunityReport, resolveMatrimonyReport). Still needed: (a) a filtering mechanism for objectionable material — matrimony already has moderation columns, so state the pre-publication approval flow explicitly; (b) published contact information reachable without signing in; (c) a EULA / community standards clause. Put a one-paragraph moderation summary with the exact tap path to Report and Block in App Review Information, because reviewers frequently miss controls buried in a WebView.
- [ ] **Confirm push permission never gates functionality (5.1.2(i))**  
  "Your app may not require users to enable system functionalities (e.g. push notifications, location services, tracking) in order to access functionality." src/lib/push.ts already returns silently when status.receive !== 'granted' and never throws. Nothing to change — just do not regress it when the native login screen lands.

### Gotchas

- ios/App/CapApp-SPM/Package.swift is broken as committed: `path: "..\..\..\node_modules\@capacitor\app"` contains `\.`, which is not a valid Swift escape sequence, so the manifest fails to compile on macOS as well as Windows. It was generated by `npx cap sync ios` on Windows. It also omits CapacitorPushNotifications. Always regenerate it on the macOS runner.
- Push will appear to work and silently deliver nothing: today the iOS side has no aps-environment entitlement, no AppDelegate registration methods, and a server that cannot address the token type iOS returns. All three must be fixed together or you will be debugging three failures as one.
- The narrow token-deletion heuristic in src/server/push/fcm.ts becomes actively harmful once iOS tokens start flowing: FCM returns 400/404 for every raw APNs token, and the drain will delete healthy iOS devices. Fix the send path before shipping the iOS app, not after.
- Apple's organization enrollment requires a public website on the org's own domain plus a work email at that domain. professionalsclub.ca is not live yet and the account email is @indocanada.org — this can stall enrollment for weeks. Sort it before starting the D-U-N-S lookup, not after.
- The fee waiver and any future paid feature are mutually exclusive. Signing the Paid Applications Agreement, or selling any digital good or service in any app on the account, voids the waiver retroactively with no refund. If the nonprofit might ever take donations through IAP, budget the $99 USD/yr instead.
- Xcode Cloud's 25 free compute hours are the best deal on paper and completely unusable to you: Apple still requires the first workflow to be created in Xcode on a Mac. Do not burn a week discovering this.
- TARGETED_DEVICE_FAMILY is "1,2", so App Store Connect will refuse the submission until you upload a 2064x2752 iPad screenshot — and the reviewer will judge an unstyled phone layout on an 13-inch screen under 4.2. Decide iPad in or out before you generate assets.
- WKWebView file inputs terminate the app on "Take Photo" when NSCameraUsageDescription is missing. It is not a permission denial, it is a crash, and it will be logged as a 2.1 App Completeness rejection with a video attached.
- The App Privacy labels in mobile/STORE-SUBMISSION.md omit Sensitive Info even though matrimony profiles store religion, community and sub_caste. Inaccurate labels are a 5.1.2 problem and can get the app pulled after approval, which is worse than a rejection.
- Apple's own guidance says exempt-encryption apps "might" owe a BIS year-end self-classification report; the BIS mass market exemption for 5D992.c software says free App Store apps do not. Both statements are current and they read as contradictory. The resolution is the mass market exemption, but if that ambiguity bothers the board, restricting availability to Canada removes the entire question for free.
- Capacitor's server.url pointing at a remote origin is the configuration Capacitor's own maintainers say is not for production. It is not an automatic rejection, but it is the argument a 4.2/4.7 rejection will be built on, and shipping with a vercel.app hostname visible makes that argument for the reviewer.
- The new age rating questionnaire is a hard gate, not a nicety: apps that have not completed it since 31 January 2026 cannot submit anything at all. Do it before you have a build to upload, so it is not what blocks the release.
- A native login screen is worth nothing to the reviewer if the session does not carry into the WebView. Transferring the auth cookie into WKHTTPCookieStore is the step that turns the strongest 4.2 mitigation into the most visible 2.1 rejection when it is missed.


## The native login screens (state as of 2026-08-24)

Both shells now open on a NATIVE sign-in screen; the WebView is never shown to
a signed-out member. Sign-up and password reset remain web flows reached from
the native screen.

**Android - built and verified on the emulator end to end:** fresh install ->
native login; wrong password -> the server's own message inline; sign-in ->
dashboard (the session cookie is planted by running the sign-in fetch inside a
hidden WebView, which reproduces the web form's request exactly - a plain HTTP
client fails both the __Secure- cookie rules and the Origin check); Google
Password Manager offers to save; logging out anywhere in the portal bounces
back to the native screen (SPA navigations are caught via
doUpdateVisitedHistory); a tapped push routes through the login activity with
its extras intact and still deep-links into the right chat.

**iOS - built, NOT compiler-verified (no Mac on this machine):**
LoginViewController + PortalViewController mirror the Android flow;
SceneDelegate swaps root view controllers; cookies are planted into
WKWebsiteDataStore.default() (proven from Capacitor source to be the store the
WebView reads); the signed-out bounce watches webView.url by KVO; PendingPush
buffers a notification tapped before the bridge exists (on iOS that tap would
otherwise be silently lost). First Mac build must: open ios/App in Xcode, add
the Push Notifications capability (creates the missing aps-environment
entitlement), build, and walk the same test script as Android. If production
sign-in returns INVALID_ORIGIN from the native screen despite the Origin
header, port the Android hidden-WebView fetch (the reference is
LoginActivity.startAuthFetch).

**Windows + iOS footgun:** every `npx cap sync ios` run on Windows rewrites
Package.swift with backslash paths that DO NOT PARSE on macOS. Use
`npm run cap:ios`, which syncs and then repairs the paths.

## Environment variables for the web app hosting (Vercel)

Set for Production (and Preview if used). SERVER-ONLY means never prefix it
with NEXT_PUBLIC_.

| Variable | What it is | Server-only |
|---|---|---|
| `DATABASE_URL` | Neon pooled connection string | YES |
| `NEON_AUTH_BASE_URL` | Neon Auth endpoint (Console -> Auth -> Configuration) | YES |
| `NEON_AUTH_COOKIE_SECRET` | Session cookie signing secret, 32+ random chars | YES |
| `FCM_SERVICE_ACCOUNT_B64` | Firebase service-account JSON, base64 (`npm run fcm:key`). Use the ROTATED key, not the one from development. Without it, push reports configured:false and in-app notifications still work | YES |
| `CRON_SECRET` | Authorises /api/jobs/refresh and /api/jobs/push; generate 32+ random chars | YES |
| `RESEND_API_KEY` | Outbound email; without it the email outbox queues and nothing sends | YES |
| `EMAIL_FROM` | e.g. `Professionals Club <noreply@professionalsclub.ca>` (domain must be verified in Resend) | YES |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob store token (chat/matrimony uploads) | YES |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | Job feed sync credentials | YES |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin, e.g. `https://professionalsclub.vercel.app` (or the .ca domain once live) - used in emails and links | no |
| `NEXT_PUBLIC_FEATURE_MATRIMONY` | `true`/`false` feature flag | no |

Also in vercel.json (already committed): the cron entries for
`/api/jobs/refresh` (6-hourly) and `/api/jobs/push` (hourly backstop).
