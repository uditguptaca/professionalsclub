/**
 * Applies the migrations in db/migrations/ in filename order.
 *
 *   node db/migrate.mjs            # apply everything not yet recorded
 *   node db/migrate.mjs --force    # re-apply all (the files are idempotent)
 *   node db/migrate.mjs 0003       # apply just the files matching a prefix
 *
 * Each file runs inside a transaction and is recorded in public.schema_migrations,
 * so re-running is a no-op rather than a mess. The files themselves are written to
 * be idempotent (`create ... if not exists`, `drop policy if exists`), which is
 * what makes --force safe.
 *
 * Uses DATABASE_URL from .env.local. That is the pooled endpoint and the owner
 * role — migrations must run as the owner, unlike the application, which drops
 * into app_authenticated for every request (see src/server/db.ts).
 */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Pool } from '@neondatabase/serverless';

const here = dirname(fileURLToPath(import.meta.url));

function readEnv(key) {
  if (process.env[key]) return process.env[key];
  try {
    for (const line of readFileSync(join(here, '..', '.env.local'), 'utf8').split('\n')) {
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

const args = process.argv.slice(2);
const force = args.includes('--force');
const filter = args.find((a) => !a.startsWith('--'));

const files = readdirSync(join(here, 'migrations'))
  .filter((f) => f.endsWith('.sql'))
  .filter((f) => !filter || f.startsWith(filter))
  .sort();

if (files.length === 0) {
  console.error(filter ? `No migration matches "${filter}".` : 'No migrations found.');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function main() {
  const client = await pool.connect();
  let applied = 0;

  try {
    await client.query(`
      create table if not exists public.schema_migrations (
        filename   text primary key,
        applied_at timestamptz not null default now()
      )
    `);

    // Bookkeeping only, and created outside the 0003 loop. RLS with no policies
    // means deny-all for anything that is not the owner, which is correct: the
    // application never reads this.
    await client.query('alter table public.schema_migrations enable row level security');

    const done = new Set(
      (await client.query('select filename from public.schema_migrations')).rows.map((r) => r.filename)
    );

    for (const file of files) {
      if (done.has(file) && !force) {
        console.log(`skip   ${file} (already applied)`);
        continue;
      }

      const sql = readFileSync(join(here, 'migrations', file), 'utf8');
      process.stdout.write(`apply  ${file} ... `);

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          `insert into public.schema_migrations (filename) values ($1)
             on conflict (filename) do update set applied_at = now()`,
          [file]
        );
        await client.query('COMMIT');
        console.log('ok');
        applied++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.log('FAILED');
        console.error(`\n${file} failed and was rolled back:\n  ${err.message}`);
        if (err.position) {
          const upto = sql.slice(0, Number(err.position));
          console.error(`  at line ${upto.split('\n').length}`);
        }
        if (err.hint) console.error(`  hint: ${err.hint}`);
        process.exitCode = 1;
        return;
      }
    }

    console.log(`\n${applied} migration(s) applied.`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Could not run migrations:', err.message);
  process.exit(1);
});
