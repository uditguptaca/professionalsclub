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
profile at signup, deleting your own account, the job-feed sync, and the email
outbox drain. The last two are privileged because no user is in the loop — the
cron fires them, they take no caller-supplied SQL shape, and the drain
deliberately resolves other members' email addresses somewhere a member's own
session cannot.

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
never the elevated path, or the drain would schedule itself forever). The hourly
`/api/jobs/push` cron is a backstop for requests that died, not the delivery
mechanism.

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
