/**
 * Post-migration verification.
 *
 *   node db/verify.mjs
 *
 * Reads DATABASE_URL from .env.local and checks the things that fail silently.
 *
 * The important one is #3. RLS only applies because withUser() drops out of the
 * table-owning role; if that does not happen, every policy in 0003 is present,
 * correct and completely ignored, and nothing about the app looks wrong. The SQL
 * editor cannot tell you this because it connects directly as the owner — this
 * script goes through the same pooled connection the app uses.
 */

import { readFileSync } from 'node:fs';
import { Pool } from '@neondatabase/serverless';

// Minimal .env.local reader: no dependency, and it only needs one key.
function readEnv(key) {
  if (process.env[key]) return process.env[key];
  try {
    for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
      const at = line.indexOf('=');
      if (at > 0 && line.slice(0, at).trim() === key) return line.slice(at + 1).trim();
    }
  } catch {
    /* no .env.local */
  }
  return undefined;
}

const connectionString = readEnv('DATABASE_URL');

if (!connectionString) {
  console.error('DATABASE_URL not found. Create .env.local first (see .env.local.example).');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const results = [];
const record = (name, pass, detail) => results.push({ name, pass, detail });

async function main() {
  const client = await pool.connect();

  try {
    // 1. Neon Auth is enabled and its user table exists.
    const authTable = await client.query(`
      select to_regclass('neon_auth.user') is not null as present
    `);
    record(
      'neon_auth."user" exists',
      authTable.rows[0].present,
      authTable.rows[0].present ? '' : 'Enable Auth on the Neon project, then re-run migration 0001.'
    );

    // 2. The least-privilege roles exist and the owner can assume them.
    const roles = await client.query(`
      select
        (select count(*) from pg_roles where rolname = 'app_authenticated') as authed,
        (select count(*) from pg_roles where rolname = 'app_anonymous')     as anon,
        pg_has_role(current_user, 'app_authenticated', 'member')            as can_switch
    `);
    const r = roles.rows[0];
    record('app roles exist', Number(r.authed) === 1 && Number(r.anon) === 1,
      'Run 0000_neon_roles.sql.');
    record('owner may SET ROLE into app_authenticated', r.can_switch,
      'grant app_authenticated to <owner role>;');

    // 3. THE ONE THAT MATTERS. Exactly what withUser() does, on the pooled
    //    connection, inside one transaction.
    const fakeUser = '00000000-0000-0000-0000-000000000001';
    await client.query('BEGIN');
    await client.query("select set_config('app.user_id', $1, true)", [fakeUser]);
    await client.query("select set_config('role', 'app_authenticated', true)");

    const inTx = await client.query(`
      select current_user::text as role, app.current_user_id()::text as uid
    `);
    await client.query('COMMIT');

    const { role, uid } = inTx.rows[0];
    record(
      'RLS is live: role switches inside the transaction',
      role === 'app_authenticated',
      role === 'app_authenticated'
        ? ''
        : `current_user was "${role}". The connection still owns the tables, so every policy is bypassed.`
    );
    record(
      'request identity is readable via app.current_user_id()',
      uid === fakeUser,
      uid === fakeUser ? '' : `got "${uid}", expected "${fakeUser}"`
    );

    // 4. Transaction-local settings did not survive the COMMIT. If they did,
    //    one request's identity would leak into the next on a pooled connection.
    const after = await client.query(`
      select current_user::text as role,
             coalesce(current_setting('app.user_id', true), '') as leaked
    `);
    record(
      'settings do not leak past COMMIT',
      after.rows[0].role !== 'app_authenticated' && after.rows[0].leaked === '',
      `after commit: role=${after.rows[0].role} app.user_id="${after.rows[0].leaked}"`
    );

    // 5. Every table has RLS on.
    const rls = await client.query(`
      select c.relname
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity = false
       order by c.relname
    `);
    record(
      'RLS enabled on every public table',
      rls.rowCount === 0,
      rls.rowCount === 0 ? '' : `without RLS: ${rls.rows.map((x) => x.relname).join(', ')}`
    );

    // 6. The matrimony visibility view exists — the privacy boundary for browsing.
    const view = await client.query(`
      select to_regclass('public.matrimony_visible_profiles') is not null as present
    `);
    record('matrimony_visible_profiles exists', view.rows[0].present, 'Run 0003_rls_policies.sql.');

    // 7. The privilege guard is armed. 0004 suspends it to create the first
    //    admin and restores it; if that ever half-completes, members could
    //    promote themselves and nothing else would notice.
    const guard = await client.query(`
      select tgenabled from pg_trigger
       where tgrelid = 'public.profiles'::regclass and tgname = 'profiles_guard_privileges'
    `);
    record(
      'profiles_guard_privileges trigger is enabled',
      guard.rowCount === 1 && guard.rows[0].tgenabled !== 'D',
      guard.rowCount === 0
        ? 'Trigger missing. Re-run 0001_core_schema.sql.'
        : 'Trigger is DISABLED — members can escalate their own role. ' +
          'Run: alter table public.profiles enable trigger profiles_guard_privileges;'
    );

    // 8. At least one admin.
    const admins = await client.query(`select count(*)::int as n from public.profiles where role = 'admin'`);
    record(
      'an admin account exists',
      admins.rows[0].n > 0,
      admins.rows[0].n > 0 ? `${admins.rows[0].n} admin(s)` : 'Run 0004_bootstrap_admin.sql.'
    );
  } finally {
    client.release();
    await pool.end();
  }

  console.log();
  let failed = 0;
  for (const { name, pass, detail } of results) {
    if (!pass) failed++;
    // `detail` is remediation advice, so it is only worth printing on a failure.
    const note = !pass && detail ? `\n      ${detail}` : '';
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note}`);
  }
  console.log();

  if (failed > 0) {
    console.log(`${failed} check(s) failed. Do not put real member data in until these pass.`);
    process.exit(1);
  }
  console.log('All checks passed.');
}

main().catch((err) => {
  console.error('\nVerification could not run:', err.message);
  console.error('\nIf this is a connection error, check DATABASE_URL and that the endpoint is awake.');
  process.exit(1);
});
