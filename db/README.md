# Database setup (Neon)

These migrations assume a **fresh Neon project** with Neon Auth enabled. They
create tables; they do not migrate an existing dataset.

## 1. Create the project

1. Neon Console → new project. Note the **pooled** connection string.
2. In that project, enable **Auth** (Managed Better Auth). This creates the
   `neon_auth` schema, including `neon_auth."user"`, which `public.profiles`
   references by foreign key. **Do this before running the migrations**, or 0001
   will fail on a missing table.

## 2. Apply the migrations

```bash
node db/migrate.mjs
```

That applies every pending file in `migrations/` in order and records it in
`schema_migrations`, so re-running it is a no-op. There are 30 of them now;
pasting them by hand into the Neon SQL editor is no longer practical, and a
partial paste leaves the database in a state no code expects.

**One manual step remains.** `0004_bootstrap_admin.sql` promotes an existing
account to admin, so before the first run: create that account (sign up at
`/portal/signup`, or add the user in the Neon Console under **Auth → Users**),
then put its email in the `v_admin_email` variable at the top of that file.

Roughly what the files cover:

| Range | What it does |
|---|---|
| `0000`-`0004` | `app` schema and least-privilege roles, core tables, matrimony, RLS for every table, admin bootstrap |
| `0005`-`0014` | Community feed and groups, public submissions, saved businesses, matrimony moderation, company referrals, city home feed |
| `0015`-`0029` | Swipe deck and E2E keys, follows and the member chat hub, the direct-referral model (with the old anonymous fan-out dropped), chat settings, reactions, referral caps, and the RLS hardening that followed the 2026-08 audit |

After the first run, check that RLS is on everywhere:

```sql
select c.relname, c.relrowsecurity
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r'
 order by 1;
```

`relrowsecurity` must be `true` on every application table.

## 3. Configure the app

Copy `.env.local.example` to `.env.local` and fill in `DATABASE_URL`,
`NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET`. Restart the dev server.

## How authorization works here

This is the part that differs most from a Supabase-style setup, and the part
that is easiest to break by accident.

**The browser has no database access.** There is no PostgREST endpoint and no
public key. The browser calls Server Actions in `src/app/actions/`, which call
repositories in `src/server/repos/`, which are the only code that opens a
connection.

**Authorization is applied twice.** The action checks the caller
(`requireUserId` / `requireAdminId`), and RLS checks again inside the
transaction. Either alone would be enough on a good day; the point is that a
mistake in one is not a breach.

**RLS only applies because of `withUser()`.** Neon's default role owns these
tables, and a table owner bypasses RLS. So `withUser()` opens a transaction,
publishes the caller's id via `set_config('app.user_id', …, true)`, and drops
into `app_authenticated` before running anything. Both settings are
transaction-local, so they cannot leak into whichever request next borrows the
pooled connection.

Consequences worth remembering:

- **Never query outside a repository.** A stray `pool.query()` runs as the owner
  with RLS off.
- **`withElevated()` bypasses RLS deliberately** and has exactly one legitimate
  use: creating a profile during signup, before the account can authorize
  anything. A second caller needs a good reason.
- **`SECURITY DEFINER` functions bypass RLS on purpose.** That is how the audit
  log, the status timeline and the notification fan-out write rows no client may
  write directly. Do not add `force row level security` to these tables without
  rewriting them.

**Role lives in `public.profiles.role`** — never in the session or a token claim.
`is_admin()` reads that column, and the `guard_profile_privileges` trigger stops
anyone but an admin writing it.

**`matrimony_visible_profiles` is the privacy boundary.** It runs with the view
owner's rights, so its `WHERE` clause is the only thing standing between one
member and everyone else's listing. Adding a column to it publishes that column
to every member.

## Verifying (run this)

```bash
node db/verify.mjs
```

Reads `DATABASE_URL` from `.env.local` and checks the things that fail silently:
that Neon Auth is enabled, that the two roles exist, that RLS is on for every
table, and — most importantly — that `current_user` becomes `app_authenticated`
inside a `withUser()`-shaped transaction on the **pooled** connection.

That last check cannot be done from the SQL editor, which connects directly as
the owner. If it fails, every policy in 0003 is bypassed and nothing about the
running app looks wrong.

## Verifying the policies by hand

Worth doing once with two accounts (one admin, one plain member). In the SQL
editor you can simulate a request:

```sql
begin;
select set_config('app.user_id', '<the member uuid>', true);
select set_config('role', 'app_authenticated', true);

-- Zero rows for a plain member:
select count(*) from public.request_notes;

-- Only their own row, until an interest between the two is accepted:
select count(*) from public.matrimony_contacts;

-- Still 'member' afterwards — the guard trigger reverts it:
update public.profiles set role = 'admin' where id = '<the member uuid>';
select role from public.profiles where id = '<the member uuid>';

rollback;
```

The four checks that matter most:

1. A member selecting `matrimony_contacts` gets only their own row, until an
   interest between the two profiles reaches `accepted`.
2. A member selecting `request_notes` gets zero rows.
3. A member updating their own `profiles` row with `role = 'admin'` stays a
   member.
4. `app_anonymous` selecting `profiles`, `help_requests` or `messages` gets zero
   rows.
