@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install      # node_modules is not checked in and may be absent
npm run dev      # dev server on :3000
npm run build    # next build (also the Vercel build command)
npm run start    # serve the production build
npm run lint     # eslint (flat config)
npx tsc --noEmit # typecheck; the build does not fail on type errors alone

node db/migrate.mjs           # apply pending migrations
node db/seed-demo.mjs         # demo data for showing the app (idempotent)
node db/seed-demo.mjs --clean # remove it again
```

No test suite exists. Verify changes by running the dev server and exercising the
flow. Nothing works without `.env.local` — copy [.env.local.example](.env.local.example)
and fill it in from the Neon Console.

## What this is

Next.js 16 App Router site for Professionals Club, a community org serving
newcomers to Canada. Backed by **Neon Postgres** with **Neon Managed Better
Auth**. Two halves:

- **Public marketing site** ([src/app/](src/app/) top level): about, jobs, events,
  businesses, resources.
- **Portal** ([src/app/portal/](src/app/portal/)): `member/*` and `admin/*` behind
  a shared sidebar, plus a large matrimony module under both.

## Architecture

The browser has **no database access**. There is no PostgREST endpoint, no public
key, no client-side query builder. Data flows one way:

```
client component
  -> Server Action     src/app/actions/*.ts     ('use server')
  -> repository        src/server/repos/*.ts    (the only code that opens a connection)
  -> withUser()        src/server/db.ts         (transaction + RLS)
  -> Postgres
```

Schema lives in [db/migrations/](db/migrations/) and is applied by hand in the
Neon SQL editor. **Read [db/README.md](db/README.md) before touching the database
or the access-control code.**

## Load-bearing rules

These are the ones that cause security bugs when broken.

**Never open a connection outside a repository.** Neon's default role owns the
tables, and a table owner bypasses RLS. `withUser()` exists to drop into
`app_authenticated` and publish the caller's id for `app.current_user_id()`; a
stray `pool.query()` runs as the owner with RLS switched off and no visible
symptom. `withElevated()` does this deliberately and its callers are counted: creating a
profile at signup (and the two business-account lookups keyed on the session's
own id), deleting your own account, the invite lookup and accept (matched on the
token's hash), the job-feed sync and link check, the email and SMS drains, the
push claim, coupon-hold expiry and the past-events sweep. The cron-fired ones are
privileged because no user is in the loop — they take no caller-supplied SQL
shape, and the drains deliberately resolve other members' addresses somewhere a
member's own session cannot.

**Every Server Action is a public HTTP endpoint.** Being exported from a
`'use server'` file is not access control. Each action starts with
`requireUserId()` or `requireAdminId()`, and none of them accept a user id or
"my profile id" as a parameter — the caller's identity is always resolved
server-side from the session.

**Role comes from `profiles.role`, never a session or token claim.** Use
`public.is_admin()` in SQL and `requireAdmin()` in server code.

**Writes go through column allowlists.** `ColumnMap` in
[src/server/query.ts](src/server/query.ts) is what stops a payload carrying
`role: 'admin'` from reaching the database. The guard triggers enforce the same
rules one layer down.

**Auth is checked in three places, deliberately.** [src/proxy.ts](src/proxy.ts)
does the optimistic redirect (Next's docs say this layer must not be the only
authorization); the `member` and `admin` server layouts re-verify before
rendering; RLS is the backstop. A new portal route subtree needs a server layout
calling `requireProfile()` or `requireAdmin()`.

**`DATABASE_URL` and `NEON_AUTH_COOKIE_SECRET` are server-only.** Never prefix
either with `NEXT_PUBLIC_` — that inlines them into the browser bundle.

## Data flow in the client

`usePortal()` ([src/context/portal-context.tsx](src/context/portal-context.tsx))
holds every help-desk slice and all CRUD; `useMatrimony()`
([src/context/matrimony-context.tsx](src/context/matrimony-context.tsx)) covers
matrimony. Both call Server Actions and mirror the result. Neither makes an
authorization decision — filtering by role in client code would only be a display
convention.

Actions return a discriminated `ActionResult<T>` (`{ ok: true, data }` or
`{ ok: false, error }`) rather than throwing, so failures surface in the UI
instead of being swallowed.

**Naming.** Postgres is snake_case; the types in [src/types/index.ts](src/types/index.ts)
are camelCase. [src/server/case.ts](src/server/case.ts) converts at the repository
boundary. The matrimony types in [src/types/matrimony.ts](src/types/matrimony.ts)
are declared in snake_case and already match their columns, so **matrimony rows
must not go through the mapper** — `src/server/repos/matrimony.ts` normalises
dates only.

**Other members' matrimony listings only ever come from
`matrimony_visible_profiles`.** The base table carries moderation columns and is
restricted to your own row plus admins.

**Referrals are direct and named (0018).** A member who sets `can_refer` on a
`company_insiders` row is listed BY NAME to signed-in members through
`company_insider_directory` — that visibility is the deal the flow offers, a
deliberate 2026-08-21 product decision that replaced the old anonymous fan-out
(dropped in 0019). The public site still gets only `company_helper_counts`.
A referral request opens a member chat carrying a referral card;
`referral_direct_requests` is gated by RLS (seeker inserts, insider answers).

**Notifications are produced only by triggers (0031-0037).** Every in-app
notification is written by a `SECURITY DEFINER` trigger calling
`notify_member()`, which is deliberately **not** executable by
`app_authenticated` — a member-callable notifier is a phishing endpoint (any
title, any link, into anyone's inbox), and 0033 dropped the old `notify_user()`
that was exactly that. There is no "send a notification" Server Action, and
there must never be one. A member's grant on `in_app_notifications` is SELECT
plus `update (is_read)` only.

`notify_member()` centralises the rules every producer needs: never notify the
actor about their own action, stay silent between blocked members, honour
`notification_prefs`, and **collapse** on `group_key` — twelve messages in one
chat become one unread row with `event_count = 12`, enforced by the partial
unique index `uq_notifications_group_live`. Adding a module event means adding a
trigger that calls it with a sensible `category` and `group_key`, not new
plumbing. Chat rows never carry message text (the body is "New message"), and
opening a thread clears them inside `markChatRead`.

**Push rides on the notification row, not a second queue (0038).** The row IS
the queue: `pushed_at IS NULL` means a push is owed. `notify_member()` leaves it
null on insert **and sets it back to null when it collapses onto an existing
row**, so messages 2..12 of a conversation each buzz even though the inbox shows
one line - a queue watching only INSERTs would go silent after the first. Push
therefore inherits every rule notify_member enforces (no self-notification,
silence between blocked members, `notification_prefs`, mute) instead of keeping a
second copy to drift out of sync.

Delivery is **at-most-once**: `claim_push_batch()` stamps `pushed_at` before the
send, so a crash mid-flight drops that push rather than repeating it. For
something already sitting in the member's inbox, a missed buzz beats a duplicate.
Sending happens in `after()` at the end of the request whose write caused it
(hooked once in `withUser`/`withAnon` in [src/server/db.ts](src/server/db.ts) -
never the elevated path, or the drain would schedule itself forever). The daily
`/api/jobs/push` cron (Vercel Hobby allows one run a day) is a backstop for
requests that died, not the delivery mechanism.

**The fan-out must never hold a database connection.** `drainPush()` is
deliberately claim (short transaction) -> HTTP with nothing held -> cleanup
(short transaction). The pool is 8 and this runs after every authenticated write,
so wrapping the sends in the claim's transaction would let one push storm stall
every member request waiting on `pool.connect()`.

**A push payload is lock-screen visible, so help-desk text is stripped.** Chat is
safe by construction (the row says "New message"), but the help/volunteer/admin
triggers put a request TITLE in the notification - and here those are immigration
status, legal trouble, housing. `drainPush` substitutes a generic body for those
categories, and the Android channel is `visibility: 0` (PRIVATE). Device tokens
are treated like email addresses: no member session can read another member's,
which is why the claim is `withElevated`.

**Groups are the club's; moderators run them; content is checked first (0053).**
Only `is_admin()` can insert a `community_groups` row. A club admin gives a
member the `admin` role on `community_group_members`; `is_group_admin(group)`
then lets them edit the group, remove members, flip post/comment `status`, and
resolve reports there - and nowhere else. `src/server/moderation.ts` decides
allow / hold / reject at submit time (rules always; Claude when
`ANTHROPIC_API_KEY` is set). A `held` row is visible to its author and its
moderators only, by RLS; there is no other wordlist and no client-side check.

**The chat PIN backup is the member's alone (0054).** `member_key_backups`
holds a device identity sealed in the browser under a PIN-derived key. Like
`member_message_keys`, it has no `is_admin()` branch and must never get one:
nobody at the club can read it or reset the PIN. A new device with no local
keys asks for the PIN *before* minting keys (`src/app/portal/member/chats/page.tsx`
registration effect); restoring makes that device the backed-up one, so every
wrap addressed to it opens.

**September 2026 audit rules (0055/0056).** Signup never grants a privilege:
`create_profile()` does not write `is_volunteer`, and `profiles_guard_insert_privileges`
pins it (and `role`) on every insert. Content `status`/`moderation` change only
under an admin's or the group moderator's hand (`guard_content_moderation`);
`moderateItem()` also excludes the author in SQL. Every read of another member's
post carries the `can_view_member()` gate (feed, permalink, profile, comments,
likes). Matrimony photos are a row-level rule (`matrimony_photos_visible()`),
the visible-profiles view reduces `full_name` per `display_pref`, and
`my_matrimony_profile_id()` is null for a suspended account. `notify_admins()`
and `notify_group_moderators()` are trigger-only: never grant them. Definer
helpers are granted to `app_authenticated` only, never PUBLIC. Media URLs are
pinned to OUR Blob store (`isOurUpload` in `src/server/media.ts`, from the
token's store id). Emailed links use `siteOrigin()`, never the Host header.
Public forms, resends, signups and link previews go through `src/server/rate-limit.ts`.

**Round 3 rules (0057).** There is ONE block: both the chat and the community
button write `member_blocks`, `is_blocked_between_members()` is the predicate
everything reads (it still honours the old `community_blocks` rows), a block
severs the follow graph both ways, and `can_view_member()` is false between
blocked members. The feed, comment and like SELECT policies carry
`can_view_member(author_id)` so the private-profile rule has RLS behind it.
`matrimony_visible_profiles` serves only `approved` listings; a hidden one is
visible solely through an accepted interest or an open conversation.
`matrimony_owner()` answers only for the owner, an admin or a matched pair, and
`member_display_name()` is trigger-only. `log_audit()` is admin-only. Event
capacity and past dates are enforced on `event_rsvps` by trigger and policy.
Outbox rows are claimed as `sending` with `claimed_at` (a stranded claim is
reclaimed after fifteen minutes) and retried with `not_before` backoff; a 4xx
from the provider is final, a 5xx/429 is not. The refresh cron runs each stage
in its own try/catch and always answers 200 with a per-stage report. Every
server-side fetch of a URL a person typed goes through `src/server/net-guard.ts`.
Deleting a row that owns a Blob deletes the Blob (`deleteUploads`).
`setupSql()` sets `statement_timeout`, `lock_timeout` and `app.site_url` on
every transaction; `SITE_URL` in `src/server/origin.ts` is the one configured
origin. Public reads use `withAnonRead` so a page view schedules no push drain.
Per-deployment Vercel URLs are behind Vercel Authentication; only the alias is
public. Sessions: the local session-data cookie is trusted for 120 s and the
profile cache for 30 s (a copied cookie pair used to outlive sign-out by an
hour); member sign-out calls `dropCache('')` and `forgetMe()`; the reset page
calls `revokeSessionsForReset(token)` before the reset, the one elevated write
into `neon_auth`. Event links go through `assertEventLinks()`; every typed URL
that becomes an href through `assertHttpUrl()`; every upload through
`isOurUpload()`, the only definition of "ours".

**Chat link previews are made on the sender's device and travel inside the
ciphertext.** `src/lib/chat-links.tsx` wraps text + card in an envelope that
`sealMessage` encrypts like any other text; `/api/link-preview` (signed-in only,
private-address-blocked) sees a URL, never a message. Everything that shows a
message's text goes through `unpackContent()`. Only the plaintext fallback (no
devices to seal for) stores the card in `meta.linkPreview`.

## Styling

One 4,300-line stylesheet, [src/app/globals.css](src/app/globals.css), in
`/* ===== SECTION ===== */` blocks with custom properties in `:root`. No Tailwind:
class names like `flex items-center gap-2` are hand-written utilities defined in
that file (and duplicated around lines 216 and 1834), so an unfamiliar utility
class probably does not exist. Pages mix these with heavy inline `style={{}}`;
match that. `page.module.css` exists but is unused.

The **Design law** section in [AGENTS.md](AGENTS.md) is binding: token roles for
text vs fills, `useConfirm()` over native dialogs, `<PortalLoading />` over
spinners, inline `role="alert"` errors, labelled inputs, and the gender-casing
rule. It exists because each entry was a shipped bug once.

## Other

- Import alias `@/*` -> `src/*`.
- `no-unused-vars`, `no-explicit-any`, `react/no-unescaped-entities` and
  `no-img-element` are disabled in [eslint.config.mjs](eslint.config.mjs); lint
  passing does not mean the code is clean.
- Next.js 16 renamed Middleware to Proxy. The file is [src/proxy.ts](src/proxy.ts)
  and it must export `proxy`, not `middleware`.
- The root layout reads cookies, so it declares `dynamic = 'force-dynamic'` and
  no route is statically prerendered.
- Matrimony messaging **polls** every 5s. Supabase Realtime backed this before;
  Neon has no equivalent push channel.
- `scratch/` is gitignored and lint-ignored; put throwaway scripts there.
- [SECURITY-AUDIT.md](SECURITY-AUDIT.md) records why the access-control code is
  shaped the way it is, and what is still open. F15 explains the RLS mechanism
  above and is the one most likely to be broken by a well-meaning refactor.
- The PDFs at repo root are source content for the newcomer guides, not code.
