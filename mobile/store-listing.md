# Store listing copy

Written against what the app actually does — no feature is named here that a
reviewer cannot find in three taps. Both stores get the same story; character
limits differ.

## App name (30 chars max, both stores)

    Professionals Club

## Subtitle / short description

Apple subtitle (30 chars):

    Newcomer careers & community

Play short description (80 chars):

    Job referrals, settlement help and community for newcomers to Canada. Free.

## Description (Play: 4000 chars, Apple: 4000 chars — same text works)

    Professionals Club is a nonprofit, volunteer-run community for newcomers
    and professionals building their future in Canada. The app is free, and so
    is everything in it.

    JOBS AND REFERRALS
    Browse open roles by employer, pulled from each company's own careers
    feed. Where a club member works at that company and has offered to help,
    ask for a referral: every willing insider is notified, and neither side
    sees the other's name or contact details until someone agrees to help.
    Your request shows your role and experience — never your identity.

    HELP DESK
    Ask for help with your resume, credential recognition, taxes, housing, or
    settlement paperwork. A volunteer who has been through the same thing is
    matched to your request, and everything runs through the club — volunteers
    and members never exchange contact details unless both choose to.

    COMMUNITY
    A feed and groups for the questions search engines answer badly: which
    licensing body, which document first, what a fair rent looks like. Posts,
    photos, comments — moderated, and admin-mediated by design.

    BUSINESS DIRECTORY
    Local businesses vetted by the members who used them first, many with
    member offers.

    MATRIMONY (optional)
    A privacy-first matrimonial section for members who want it: every profile
    is reviewed by an admin before it is visible, photos require approval, and
    contact details are never shown without mutual consent.

    Professionals Club is run by volunteers who arrived in Canada the same way
    you did. No ads, no fees, no data resale — see the privacy policy for
    exactly what we store and why.

## Keywords (Apple, 100 chars)

    newcomer,canada,immigrant,jobs,referral,settlement,resume,community,punjabi,hindi,desi,pr

## Category

- Apple: Social Networking (primary), Business (secondary)
- Play: Social

## URLs

- Privacy policy: https://professionalsclub.ca/privacy  (required by both)
- Support: https://professionalsclub.ca/contact
- Marketing: https://professionalsclub.ca

## Content rating inputs (Play questionnaire)

- User-generated content: YES (community posts) — with moderation, reporting,
  and blocking (all three exist and are reachable from every post's ⋯ menu).
- Dating/matrimonial: the matrimony section exists → answer YES to "dating";
  this typically yields a Mature 17+/Teen rating depending on region.
- No violence, gambling, or purchases.

## Assets in this folder

- `store-assets/play/` — six 1080×1920 screenshots + 1024×500 feature graphic
- `store-assets/appstore-6.7/` — six 1290×2796 screenshots (6.7" iPhone slot;
  App Store Connect reuses them for smaller sizes)
- Icons/splash live in the native projects (generated from assets/logo*.png
  via @capacitor/assets; re-run `npx @capacitor/assets generate` after a logo
  change).

## Review notes (paste into both stores' review-notes field)

    This is the member portal of professionalsclub.ca, a nonprofit newcomer
    community, wrapped as a native app (bottom tab navigation, native splash,
    offline fallback). A demo account is provided. The referral feature keeps
    both parties anonymous until one agrees to help — this is by design and
    enforced server-side. The matrimony section requires an admin-approved
    profile; the demo account already has one.
