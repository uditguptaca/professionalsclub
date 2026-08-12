# Security audit — Professionals Club portal

Date: 2026-08-06 (revised 2026-08-06 for the move to Neon)
Scope: the whole portal (member, admin, matrimony), its data layer, and the
public pages that read the same tables.

**Stack note.** This audit was first written against a Supabase implementation
and has been revised after the backend moved to **Neon Postgres + Neon Managed
Better Auth**, with a server-side data-access layer. The findings below are
unchanged in substance — the same defects existed, and the same fixes apply —
but several are now closed by a different mechanism. Where that is the case it is
called out. Two findings (F15, F16) are new and specific to the Neon
architecture.

## Summary

Seventeen findings. Fifteen are fixed; two are open and need a decision from you
(F14, F16). F13 is closed by the migration off Supabase.

The policies have now been executed against the live Neon database — see
"Verification performed".

The headline is that **the portal had no access control of any kind**. Not weak
access control — none. Login compared a hardcoded password in browser
JavaScript, and being "signed in" was a `localStorage` flag any visitor could set
from devtools. Every admin page was reachable by typing its URL.

The reason none of this had been exploited is the second headline: **there was
no database**. `dxfxpjzjmxglfkcmrovk.supabase.co` does not resolve (NXDOMAIN),
and the key committed beside it is not a real Supabase key — it is signed
`"iss":"subase"`. Every `supabase.from()` call in the application failed
silently, and every context swallowed the error and fell back to mock data. The
app has been showing `src/lib/mock-data.ts` to everyone since it was written.

So the audit covers two classes of problem: what was live and wrong (auth), and
what was written and would have become wrong the moment a real database was
connected (RLS, data exposure). Both are addressed.

Severity is CVSS-flavoured but hand-assigned: **Critical** = full compromise of
member data or privileges; **High** = significant exposure or integrity loss;
**Medium** = meaningful weakening; **Low** = hygiene.

---

## Findings

### F1 — Authentication was a client-side string comparison (Critical, fixed)

`src/app/portal/auth/page.tsx:19` compared `username === 'admin' && password ===
'password123'` in code shipped to the browser. The credentials were readable by
anyone who opened the page source, and the check could be skipped entirely.

Worse, passing it was not even necessary. `AppProvider` treated
`localStorage.getItem('pc_auth') === 'true'` as proof of authentication and
`localStorage.getItem('pc_role')` as proof of role. Two devtools commands —
`localStorage.setItem('pc_auth','true'); localStorage.setItem('pc_role','admin')`
— granted full administrative access to every page in the portal.

**Fixed.** Real authentication via Neon Managed Better Auth
(`authClient.signIn.email`), with the session cookie signed and managed by
`/api/auth/*`. The `localStorage` auth path is deleted. Session state originates
server-side in `src/server/auth.ts` and is passed into the client provider as
data, never as a decision.

### F2 — No server-side route protection (Critical, fixed)

The only gate was a `useEffect` in a client layout calling `router.replace()`.
That runs *after* the page component has already rendered and, if the page
fetched data, after that data was already in the browser. Disabling JavaScript,
or intercepting the redirect, left the page and its contents intact.

The Supabase middleware at `src/utils/supabase/middleware.ts` looked like a
guard but never called `getUser()` and never redirected — it only rebuilt a
response object, so it did not even refresh sessions.

**Fixed**, in two layers:

- `src/proxy.ts` reads the Neon Auth session and redirects signed-out traffic
  away from `/portal/*`.
- `src/app/portal/member/layout.tsx` and `.../admin/layout.tsx` are **server**
  components calling `requireProfile()` / `requireAdmin()`. Rendering never
  begins for an unauthorised request, and the role is read from the database
  rather than from the session.

Both layers exist deliberately. Next.js' own documentation says the proxy layer
"should not be used as a full session management or authorization solution" and
is for optimistic checks; the server layouts are the authoritative check, and RLS
is the backstop under both.

Verified by running the app on the Neon stack: `/portal/member/dashboard`,
`/portal/admin/dashboard`, `/portal/admin/content/jobs`, `/portal/admin/matrimony`,
`/portal/member/matrimony/browse` and `/portal/member/profile` all return
`307 → /portal/auth?redirectTo=…` with no session, while `/`, `/portal/auth`,
`/portal/signup`, `/businesses`, `/events`, `/youtube`, `/matrimony` and `/jobs`
return `200`. It also fails closed when the auth service is unreachable, which is
the correct direction to fail.

### F3 — Role was taken from user-editable metadata (Critical, fixed)

`app-context.tsx` read `session.user.user_metadata?.role`. A signed-in user can
write their own `user_metadata` through the Supabase client:

```js
await supabase.auth.updateUser({ data: { role: 'admin' } })
```

That is a self-service admin promotion, and it needs no exploit — it is a
documented, supported API call.

**Fixed.** Role lives in `public.profiles.role`. The `guard_profile_privileges`
trigger silently reverts any non-admin attempt to change `role`,
`verification_status` or `pc_number`, so a crafted update neither succeeds nor
reveals that it was rejected. (`account_status` has one deliberate exception: a
member may move their own account from `active` to `archived`, and nothing else.)
Every RLS policy resolves admin-ness through `public.is_admin()`, which reads
that column.

Still true on Neon, and reinforced: the server-side `updateOwnProfile` action
writes through a fixed column allowlist that has no `role` entry at all, so the
attempt does not even reach the database.

### F4 — Every RLS policy was `using (true)` (Critical, fixed)

All 25 policies across the old migrations were `for all using (true)` — read,
write, update and delete on every table for anyone holding the anon key, which
is public by design. `fix_permissions.sql` additionally ran
`grant select on all tables in schema public to anon, authenticated`, which
extends to tables created later.

Had a real database been connected, the following would all have been true:

| Table | Consequence |
|---|---|
| `matrimony_contacts` | Every member's phone number and email, in one request |
| `matrimony_messages` | Every private conversation on the platform |
| `matrimony_profiles` | Every profile including `admin_notes`, `rejection_reason` |
| `help_requests` | Every member's help request, including free-text personal circumstances |
| `members` | The entire member roster |
| `admin_messages` | All staff correspondence |

Writes were equally open: any visitor could approve their own matrimony profile,
change any help request's status, or delete rows.

**Fixed.** `0003_rls_policies.sql` revokes the inherited grants, enables RLS on
all 37 tables, and writes explicit per-operation policies. Default is deny; every
policy is an exception. See "What each role can now reach" below.

On Neon this is now the *second* layer rather than the only one: the browser has
no database endpoint at all, and every query goes through a Server Action and a
repository that check the caller first. The policies remain because a mistake in
that layer should not be a breach — see F15 for the mechanism that keeps them
switched on.

### F5 — Contact details released without consent (Critical, fixed)

`matrimony_contacts` exists as a separate table specifically so that phone
numbers can be withheld until both parties agree. Under `using (true)` that
separation bought nothing.

**Fixed.** Contact rows are readable only by the owner, an admin, or a
counterparty where `has_accepted_interest()` is true. The same predicate gates
opening a conversation. Interest acceptance itself is protected by
`guard_interest_response`, which raises unless the caller is the *receiver* —
without it, a sender could set their own outgoing interest to `accepted` and
unlock the target's phone number and a message thread unilaterally.

### F6 — A PostgREST column list is not access control (High, fixed)

The matrimony pages fetched other members with an explicit safe-looking column
list (`.select('id, full_name, city, …')`). That list is chosen by the client.
Any caller can send `select=*` to the same endpoint and receive
`admin_notes`, `rejection_reason` and the rest. The narrow list was a display
convention that read like a security control.

This one is worth internalising because it will recur: **anything that must stay
private has to be a separate table or sit behind a view. It cannot be a shorter
`select`.**

**Fixed.** `matrimony_profiles` now exposes only your own row (plus admins). All
reads of *other* members go through `public.matrimony_visible_profiles`, a view
that omits the four moderation columns and enforces visibility in its `WHERE`
clause. Repointed: browse, matches, shortlist, interests, messages, the profile
detail page, the matrimony dashboard, and the context.

On Neon the client-chosen column list is gone entirely — the browser cannot issue
a query at all, and the repositories name their own columns. The view remains as
the second layer and as the single definition of "what one member may see of
another".

The view intentionally covers both open browsing (`approved`, not hidden) and
existing relationships (interest, shortlist, conversation), so an accepted
connection does not vanish from your message list when the other person hides
their listing from search. A block overrides both directions.

Note the tradeoff: the view runs with its owner's rights, so its `WHERE` clause
is the entire boundary for browsing — there is no second check behind it. It is
marked `security_barrier` to stop a cheap user-supplied function in an outer
`WHERE` being pushed underneath the visibility predicates. Both facts are
commented at the definition, because adding a column there publishes it to every
member.

### F7 — The public matrimony page queried real profiles (High, fixed)

`src/app/matrimony/page.tsx` — a signed-out marketing page — ran
`.from('matrimony_profiles').select('*').eq('status','approved')`. With the old
policies that would have served every approved profile, in full, to anonymous
visitors. The same page's FAQ tells readers "your profile is only visible to
other verified, approved members."

**Fixed.** The query is removed. The page shows clearly illustrative sample
cards; real browsing requires a session and its own listing.

### F8 — Staff-only notes were readable by the member they were about (High, fixed)

`internal_notes` was a `jsonb` column on `help_requests`. RLS grants or denies
whole rows, so any policy letting a member read their own request also handed
them the case notes staff had written about them. The same applied to
`volunteer_applications.admin_notes`.

**Fixed.** Internal notes moved to a `request_notes` table with an admin-only
policy. Members reading their own request get the member-visible
`request_timeline` and nothing else. `volunteer_applications` gives applicants
no `UPDATE` policy at all, so `admin_notes` has no write path back to them.

### F9 — The audit log was client-writable (High, fixed)

`logAction()` built an entry in the browser — including `actorId`, `actorName`
and `actorRole` — and the table's policy accepted anything. An audit trail whose
subject can forge entries, attribute actions to another user, or delete rows is
not an audit trail.

**Fixed.** `audit_log` has a select-only policy restricted to admins and **no
insert policy**. Writes go exclusively through `log_audit()`, a `SECURITY
DEFINER` function that stamps the actor from `app.current_user_id()` and ignores
any caller-supplied identity.

On Neon the client cannot call it at all: `logAction()` in the portal context is
now a no-op, and audit entries are written server-side as a side effect of the
action that caused them.

### F10 — Notifications could be forged (Medium, fixed)

Five call sites inserted directly into `in_app_notifications` with an arbitrary
`user_id`, so any member could plant a message in any other member's
notification feed, appearing to come from the platform. (The inserts also used
column names that do not exist — `content`, `category`, `link_to` against a table
with `body`, `type`, `link` — more evidence nothing ever ran.)

**Fixed.** Clients have no insert policy, and on Neon no way to insert at all.
Notifications come from database triggers on the events that warrant them
(interest received, interest answered, message received, profile reviewed) plus a
`notify_user()` definer function. All five client inserts are deleted.

### F11 — Members and volunteers could message each other directly (Medium, fixed)

"Admin-mediated, no direct contact" is the platform's core safety promise, shown
in the portal header on every page. It was enforced only by which forms the UI
rendered. The `messages` table accepted any sender, recipient and
`visibility_scope`, including `admin_only`.

**Fixed.** `guard_message_routing` rejects a non-admin insert whose
`sender_user_id` is not the caller, or whose `recipient_role` is not `admin`, and
forces `visibility_scope` to `all` for non-admins. `admin_only` messages are
excluded from non-admin reads by the select policy. The promise is now a
database constraint rather than a UI convention.

### F12 — Message and assignment rows were fully rewritable (Medium, fixed)

Found while writing this audit rather than in the original code review. The
`UPDATE` policies have to admit recipients (to mark a message read) and
volunteers (to accept work) — but RLS grants whole rows, not columns. As first
written, a recipient could rewrite the `body` of a message they had received,
altering the record of what was said, and a volunteer could rewrite their own
assignment's scope, instructions and deadline.

**Fixed.** `guard_message_immutability` holds every message column except `read`
to its previous value for non-admins. `guard_assignment_fields` does the same for
the assignment brief, leaving only `status` (and only into `accepted`,
`in_progress`, `completed`) and `volunteer_response` writable.

### F13 — A live credential is in git history (Medium, CLOSED by the Neon migration)

`src/lib/supabaseClient.ts` hardcoded a project URL and anon key. The file is
deleted, but **deleting a file does not remove it from git history**. It remains
readable at commits `9cd9d55` and `d77b424`, and in every clone and fork.

The specific key appears to be fabricated (the project does not exist and the JWT
issuer is misspelled `subase`), so the immediate risk is low. It is listed
because the *practice* is what matters:

- Anything committed must be treated as permanently disclosed. Rotation is the
  only real remedy, not deletion.
- If that project reference was ever real, **rotate its keys** in
  Project Settings → API.
- A Supabase anon key is safe to expose *only* because RLS constrains it. With
  the old `using (true)` policies it would have been equivalent to a database
  password.

**Now closed.** The Supabase project is no longer used by this application at
all, so the committed key grants nothing even if it were real. The history entry
remains and is harmless, but the practice above still applies to
`NEON_AUTH_COOKIE_SECRET` and `DATABASE_URL`: both are real secrets, neither is
`NEXT_PUBLIC_`, and neither should ever be committed. `.env.local` is gitignored;
only `.env.local.example`, which contains placeholders, is tracked.

### F14 — No rate limiting on authentication (Medium, OPEN — needs your decision)

Nothing throttles login attempts, signup, help-request submission or interest
sending beyond Supabase's platform defaults. The login form does correctly avoid
distinguishing "unknown email" from "wrong password", so it cannot be used to
enumerate registered addresses — but it can be brute-forced.

**Partly addressed.** Email verification is now required on the Neon Auth
project, which closes the "unverified address occupies an account" half: sign-in
returns `403 EMAIL_NOT_VERIFIED` until the address is confirmed. The UI handles
this end to end — see "Email verification" below.

**Still recommended:** enable Neon Auth rate limits and CAPTCHA on signup. Brute
forcing a known-good password is still unthrottled beyond Neon's platform
defaults.

### F15 — RLS would have been silently inert on Neon (High, fixed)

New, and specific to this architecture. It is the failure mode most likely to
recur, so it is worth stating plainly.

On Supabase the browser connects to Postgres itself, carrying the user's JWT, so
RLS is unavoidably in force. On Neon the *server* holds the connection — and it
connects as Neon's default role, which **owns these tables**. A table owner
bypasses RLS unless the table is marked `FORCE`. Ported as-is, all 200-odd
policies would have been present, correct, and completely ignored: every query
would have run with full access, and nothing would have looked wrong.

**Fixed.** `withUser()` in `src/server/db.ts` opens a transaction and, before
running anything:

```sql
select set_config('app.user_id', $1, true);   -- who the request is for
select set_config('role', 'app_authenticated', true);  -- drop out of the owner
```

`app_authenticated` is a `NOLOGIN` role created in `0000_neon_roles.sql` that
owns nothing, so the policies apply. `app.current_user_id()` reads the first
setting, replacing `auth.uid()`. Both are transaction-local (`true` as the third
argument), so neither can leak into whichever request next borrows the pooled
connection.

The consequence is that **the repositories are the only code allowed to open a
connection**. A stray `pool.query()` anywhere else runs as the owner with RLS
off. `withElevated()` does exactly that on purpose, and has one caller: creating
a profile during signup, before the account can authorize anything.

### F16 — Neon Auth is beta (Medium, OPEN — accepted risk, needs review)

`@neondatabase/auth@0.4.2-beta` and `@neondatabase/auth-ui@0.2.1-beta` are
pre-1.0. The database driver (`@neondatabase/serverless@1.1.0`) and Better Auth
itself are stable; the Neon-managed wrapper around them is not.

This was disclosed before the choice was made and accepted deliberately, so it is
recorded rather than argued. What it means in practice:

- The API may change between patch releases. Pin exact versions before going to
  production rather than carrying the `^` range.
- Authentication is the one dependency where a breaking change is a security
  event, not just a build failure. Watch Neon's changelog for this package
  specifically.
- The blast radius is contained: the package handles session cookies and the
  sign-in/sign-up calls. It makes no authorization decisions. Role, account
  status and every access rule live in `public.profiles` and the RLS policies, so
  a defect in the auth wrapper cannot by itself grant a member admin access — it
  would have to first produce a valid session for someone else's user id.

**Your action:** decide whether to pin exact versions now, and re-review when
`@neondatabase/auth` reaches 1.0.

### F17 — The escalation guard blocked its own bootstrap (Low, fixed)

Found by running `0004_bootstrap_admin.sql` against the real database, not by
reading it.

`guard_profile_privileges` reverts any `role` change made by someone who is not
already an admin. During a migration there is no request context at all, so
`is_admin()` is false and the promotion was silently undone — the `UPDATE`
reported success, the row did not change, and nothing raised an error. The first
admin could not be created, because creating an admin required already being one.

This is Low rather than Medium because it fails safe: the result was *no* admin,
not an unintended one. It is recorded because the failure mode — a privileged
write that reports success and does nothing — is the same shape as several of the
fixes above, and worth recognising.

**Fixed.** `0004` now suspends that one trigger around the promotion and restores
it immediately, including on failure. No standing exemption was added: an
exemption for "no request context" would also cover `withElevated()`, which must
never be able to grant a role. `db/verify.mjs` checks the trigger is enabled
afterwards, so a half-completed bootstrap cannot leave the guard off.

### Email verification

Turned on at the Neon Auth project level after the migration. Behaviour, verified
against the live project:

| Step | Result |
|---|---|
| `sign-up/email` | `200`, `token: null`, `emailVerified: false` — no session |
| `sign-in/email` before confirming | `403 {"code":"EMAIL_NOT_VERIFIED"}` |
| `send-verification-email` | `200 {"status":true}` |
| `sign-in/email` after confirming | session issued, portal reachable |

Three things this needed in the app:

1. **The login page distinguished it.** It previously reported every sign-in
   failure as "Incorrect email or password", so a user with correct credentials
   would have been sent off resetting a password that worked fine. It now branches
   on `error.code === 'EMAIL_NOT_VERIFIED'` and offers a resend. Every other
   failure keeps the single vague message, so the form still cannot be used to
   test which addresses are registered.
2. **A landing page at `/portal/verify`**, exempted in `src/proxy.ts` — the user
   arriving from the email has no session, so gating it would have stranded the
   flow. Handles the expired/reused-link case separately.
3. **Resend is deliberately non-enumerating.** `resendVerificationEmail()`
   reports success for any well-formed address, including unregistered ones. It
   is reachable without a session, so distinguishing would leak account existence.

**Operational note.** Enabling verification retroactively locked out every
account created before it, including the portal admin — all five had
`emailVerified = false` and Neon rejects their sign-in. They were marked verified
directly in `neon_auth."user"`. Worth remembering if verification is ever toggled
on a project that already has users.

---

## What each role can now reach

| Data | app_anonymous | member | that member's own row | admin |
|---|---|---|---|---|
| Published jobs, events, resources, team, news, videos | read | read | — | full |
| Verified business listings | read | read | own submission | full |
| Unverified/draft business listings | — | — | own submission | full |
| `profiles` | — | own only | read + limited write | all |
| `help_requests` | — | own + assigned-to-me | read/write content | all |
| `request_notes` (internal) | — | — | — | full |
| `request_timeline` | — | if parent visible | read | all |
| `volunteer_applications` | — | own | read only | full |
| `case_assignments` | — | assigned to me | status + response | full |
| `messages` | — | sender or recipient, not `admin_only` | mark read | all |
| `audit_log` | — | — | — | read only |
| `matrimony_profiles` | — | own only | full | all |
| Other members' listings | — | via `matrimony_visible_profiles` | — | all |
| `matrimony_contacts` | — | after accepted interest | full | all |
| `matrimony_messages` | — | own conversations | — | all |
| `matrimony_blocks` | — | ones I created | full | all |
| `in_app_notifications` | — | own | read/mark read | all |

Nothing writes to `audit_log` or `in_app_notifications` directly; both are
`SECURITY DEFINER` only.

---

## Verification performed

Everything below was run against the live Neon project, not reasoned about.

**Route guards, with real sessions.** Signed up through the app's own
`/api/auth/sign-up/email`, then:

| Request | Result |
|---|---|
| `/portal/admin/*` with no session | `307 → /portal/auth?redirectTo=…` |
| `/portal/admin/dashboard` as a **member** | `307 → /portal/member/dashboard` |
| `/portal/member/dashboard` as a member | `200` |
| `/portal/admin/{dashboard,members,content/jobs,matrimony,audit}` as an **admin** | `200` |

The middle row is the one that matters: the Neon Auth session for that account
carries `"role": "user"` in its own user object, and the portal ignores it
entirely, reading `profiles.role` instead (F3).

**RLS, exercised as two real users** through the same `withUser()` mechanism the
app uses, on the pooled endpoint. All 16 passed:

- a member reads 0 rows from `request_notes`, and 0 of another member's
  `help_requests`; an admin reads both
- a member reads exactly 1 row from `profiles` (their own)
- a member updating their own row with `role = 'admin'` remains a member
- `app_anonymous` reads 0 rows from `profiles`, `help_requests`, `messages`,
  `request_notes` and `matrimony_contacts`
- `log_audit()` stamps `actor_id`/`actor_role` from the session; a member cannot
  insert into `audit_log` at all, and reads 0 rows from it
- the status trigger appends timeline rows; the reference trigger generates
  `HR-2026-0001`

**F15 specifically** — `current_user` becomes `app_authenticated` inside the
transaction, `app.current_user_id()` returns the published id, and both are gone
after `COMMIT` (`role=neondb_owner`, `app.user_id=""`). This confirms
`set_config(..., true)` survives PgBouncer transaction pooling, which Neon's
docs leave ambiguous — their warning about `SET` concerns *session*-scoped
settings, which is precisely what this avoids.

**Static checks.** `tsc --noEmit` clean; `next build` compiles; `eslint` reports
0 problems; all five migrations parse under libpg_query (395 statements, 36
plpgsql bodies).

Re-runnable at any time with `node db/verify.mjs` (10 checks).

**Two bugs were found only by running it**, both now fixed and re-verified:

1. `set_help_request_reference()` was not `SECURITY DEFINER`, so it ran as
   `app_authenticated` and hit `permission denied for sequence
   help_request_ref_seq`. **Every help-request submission would have failed** in
   production. Static analysis could not have caught this; it needed the grants
   from 0003 and a real insert.
2. F17 below — the escalation guard blocked its own bootstrap.

**What is still unverified.** The matrimony module's flows (interest → accepted →
contact release → conversation) were verified at the policy level but not driven
through the UI, because that needs two consenting profiles and a browser. The
policies covering them are exercised above; the page wiring is not.

---

## Recommended next

Roughly in order of value:

1. **Change the bootstrap admin password.** The account was created during
   verification with a password that appears in a chat transcript, and
   `emailVerified` is false. Change it, and rotate the `neondb_owner` password
   too — that was also pasted into a transcript.
2. **Pin the beta auth packages** to exact versions (F16), and enable rate
   limiting and CAPTCHA on the Neon Auth side (F14).
3. **Storage.** `documents`, `matrimony_media.url` and the image fields are plain
   text columns holding paths. Nothing is implemented — the "Upload supporting
   documents" area on the help-request form is decorative. Neon has no object
   storage, so this needs a separate provider (S3, R2, Vercel Blob) with signed,
   time-limited URLs. A public bucket would undo F5 by putting ID documents and
   photos behind guessable links.
4. **Account deletion.** "Close my account" archives and signs out; it does not
   erase. Deleting the identity row is Neon Auth's `deleteUser` endpoint, which
   would need a server action that also cascades the profile. Worth doing
   properly if PIPEDA erasure requests are expected.
5. **A Content Security Policy.** Next.js ships none by default and the codebase
   uses inline styles heavily, so this needs care, but it is the main remaining
   mitigation against XSS reaching the session cookie.
6. **Connection pooling limits.** `withUser()` checks out a pooled connection per
   request and holds it for the transaction. Under load this is the first thing
   that will saturate; Neon's pooled endpoint is already in use, but the
   `loadSnapshot` query set is heavy enough to be worth revisiting if the portal
   grows.
