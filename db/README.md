# Database setup (Neon)

These migrations assume a **fresh Neon project** with Neon Auth enabled. They
create tables; they do not migrate an existing dataset.

## 1. Create the project

1. Neon Console → new project. Note the **pooled** connection string.
2. In that project, enable **Auth** (Managed Better Auth). This creates the
   `neon_auth` schema, including `neon_auth."user"`, which `public.profiles`
   references by foreign key. **Do this before running the migrations**, or 0001
   will fail on a missing table.

## 2. Apply, in order

Neon Console → SQL Editor → paste each file → Run.

| # | File | What it does |
|---|------|--------------|
| 0 | `migrations/0000_neon_roles.sql` | `app` schema, `app.current_user_id()`, and the two least-privilege roles |
| 1 | `migrations/0001_core_schema.sql` | `profiles` keyed to `neon_auth."user"`, help desk, business directory, public content, audit log |
| 2 | `migrations/0002_matrimony_schema.sql` | Matrimony module |
| 3 | `migrations/0003_rls_policies.sql` | Row Level Security for every table, plus the matrimony visibility view |
| 4 | `migrations/0004_bootstrap_admin.sql` | Promotes one existing account to admin |

Before running #4, create the admin account: sign up at `/portal/signup`, or add
the user from the Neon Console under **Auth → Users**. Then put that email in the
`v_admin_email` variable at the top of the file.

#4 ends with a query listing every table, whether RLS is on, and how many
policies it has. `rls_enabled` must be `true` on every row.

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
