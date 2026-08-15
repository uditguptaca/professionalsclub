import 'server-only';
import { Pool, type PoolClient } from '@neondatabase/serverless';

/**
 * Database access.
 *
 * Everything that touches Postgres goes through this file. The browser has no
 * database credentials and no direct endpoint — it calls Server Actions, which
 * call repositories, which call these helpers.
 *
 * The important part is `withUser`. Authorization is enforced twice: once in the
 * repository/action layer, and once by RLS. RLS only bites if the connected role
 * is not the table owner, and Neon's default role owns everything, so each
 * request-scoped transaction drops into `app_authenticated` and publishes the
 * caller's id for `app.current_user_id()` to read.
 *
 * `set_config(..., true)` makes both settings transaction-local, so they are
 * discarded at COMMIT/ROLLBACK and cannot leak into whichever request next
 * borrows the pooled connection.
 */

let pool: Pool | null = null;

function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.local.example to .env.local and paste the ' +
        'pooled connection string from the Neon Console, then restart the dev server.'
    );
  }
  // Default idleTimeoutMillis is 10s — shorter than the gap between two user
  // interactions, so nearly every action was paying the full WebSocket +
  // TLS connect (~1.3s from a distant dev machine) again. Hold sockets open
  // across think-time instead.
  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    idleTimeoutMillis: 300_000,
    max: 8,
  });
  return pool;
}

/**
 * A tagged-template query bound to one transaction. Values are always
 * parameterised.
 *
 * `run` takes pre-built text for the generated INSERT/UPDATE statements in
 * query.ts, where the column list is dynamic. Identifiers there come from a
 * hard-coded allowlist, never from a request.
 */
export type Db = (<T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<T[]>) & {
  run: <T = Record<string, unknown>>(text: string, values?: unknown[]) => Promise<T[]>;
};

function bindClient(client: PoolClient): Db {
  const db = async function <T>(strings: TemplateStringsArray, ...values: unknown[]) {
    // Interpolation is only ever the $n placeholder, never the value itself, so
    // a template literal here cannot become SQL injection.
    const text = strings.reduce(
      (acc, part, i) => acc + part + (i < values.length ? `$${i + 1}` : ''),
      ''
    );
    const result = await client.query(text, values);
    return result.rows as T[];
  } as Db;

  db.run = async <T>(text: string, values: unknown[] = []) => {
    const result = await client.query(text, values);
    return result.rows as T[];
  };

  return db;
}

type Mode =
  | { kind: 'user'; userId: string }
  | { kind: 'anonymous' }
  | { kind: 'owner' };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Transaction setup is ONE multi-statement round trip, not three.
 *
 * Latency dominates this app (the database is remote; a dev machine overseas
 * pays ~250ms per round trip), so BEGIN and both set_config calls travel
 * together as a simple-protocol batch. Simple protocol cannot carry bind
 * parameters, so the user id is inlined — which is safe here and only here
 * because it is validated against a strict UUID shape first. It never comes
 * from request input anyway (always the session's own id), but the regex
 * makes the inlining locally, provably injection-free.
 */
function setupSql(mode: Mode): string {
  if (mode.kind === 'user') {
    if (!UUID_RE.test(mode.userId)) throw new Error('Invalid user id');
    return (
      'begin; ' +
      `select set_config('app.user_id', '${mode.userId}', true), ` +
      "set_config('role', 'app_authenticated', true);"
    );
  }
  if (mode.kind === 'anonymous') {
    return "begin; select set_config('role', 'app_anonymous', true);";
  }
  return 'begin;';
}

async function run<T>(mode: Mode, fn: (db: Db) => Promise<T>, readOnly = false): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query(setupSql(mode));
    const result = await fn(bindClient(client));
    if (readOnly) {
      // A read-only transaction has nothing to persist: the caller gets the
      // rows one network round trip earlier and COMMIT + release happen in
      // the background. Failure here can only affect this already-finished
      // read, so it is logged, never surfaced.
      client
        .query('COMMIT')
        .catch((e) => console.error('[db] async COMMIT failed:', e))
        .finally(() => client.release());
      return result;
    }
    await client.query('COMMIT');
    client.release();
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
      client.release();
    } catch {
      client.release(true);
    }
    throw error;
  }
}

/**
 * Run queries as the given user, with RLS enforced.
 *
 * This is the default for anything reached from a signed-in request.
 */
export function withUser<T>(userId: string, fn: (db: Db) => Promise<T>): Promise<T> {
  return run({ kind: 'user', userId }, fn);
}

/**
 * Same as withUser for SELECT-only work: the caller's promise resolves as
 * soon as the rows arrive instead of waiting for COMMIT's round trip.
 * Never use for anything that writes.
 */
export function withUserRead<T>(userId: string, fn: (db: Db) => Promise<T>): Promise<T> {
  return run({ kind: 'user', userId }, fn, true);
}

/**
 * Run queries as an unauthenticated visitor, with RLS enforced.
 *
 * Used by the public marketing pages. Reaches published content only.
 */
export function withAnon<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  return run({ kind: 'anonymous' }, fn);
}

/**
 * Run queries as the owning role, bypassing RLS.
 *
 * Deliberately narrow. The only legitimate uses are operations that have no
 * user context yet — creating a profile during signup, before the account can
 * authorize anything. Every call site must be obvious from its name, because
 * this is the one path with no second layer behind it.
 */
export function withElevated<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  return run({ kind: 'owner' }, fn);
}

/** First row or null. */
export async function one<T>(rows: T[]): Promise<T | null> {
  return rows.length > 0 ? rows[0] : null;
}
