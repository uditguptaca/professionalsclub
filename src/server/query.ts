import 'server-only';
import type { Db } from '@/server/db';

/**
 * Generated INSERT/UPDATE for the content tables.
 *
 * The whole point of `ColumnMap` is that identifiers are fixed in code. A
 * request supplies values, never column names, so a payload carrying
 * `{ role: 'admin' }` at a table that has no `role` entry is dropped rather than
 * written — the same allowlisting the guard triggers do in the database, applied
 * one layer earlier so the write never leaves the server.
 */

/** domain field -> column name */
export type ColumnMap = Record<string, string>;

function pick(columns: ColumnMap, data: Record<string, unknown>) {
  const entries = Object.entries(columns).filter(([field]) => data[field] !== undefined);
  return {
    names: entries.map(([, column]) => `"${column}"`),
    values: entries.map(([field]) => data[field]),
  };
}

/**
 * Column list for SELECT, aliased back to the domain field name where they
 * differ (event_date -> date, display_order -> order).
 */
export function selectList(columns: ColumnMap, extra: string[] = []): string {
  const cols = Object.entries(columns).map(([field, column]) =>
    field === column ? `"${column}"` : `"${column}" as "${field}"`
  );
  return [...extra, ...cols].join(', ');
}

export async function insertRow<T>(
  db: Db,
  table: string,
  columns: ColumnMap,
  data: Record<string, unknown>,
  returning: string
): Promise<T | null> {
  const { names, values } = pick(columns, data);

  if (names.length === 0) {
    throw new Error(`insertRow(${table}): nothing to insert after allowlisting`);
  }

  const placeholders = values.map((_, i) => `$${i + 1}`);
  const rows = await db.run<T>(
    `insert into ${table} (${names.join(', ')}) values (${placeholders.join(', ')}) returning ${returning}`,
    values
  );
  return rows[0] ?? null;
}

export async function updateRow<T>(
  db: Db,
  table: string,
  columns: ColumnMap,
  id: string,
  data: Record<string, unknown>,
  returning: string
): Promise<T | null> {
  const { names, values } = pick(columns, data);

  if (names.length === 0) {
    // No allowlisted field changed. Return the row unchanged rather than
    // emitting invalid SQL.
    const rows = await db.run<T>(`select ${returning} from ${table} where id = $1`, [id]);
    return rows[0] ?? null;
  }

  const assignments = names.map((name, i) => `${name} = $${i + 1}`);
  const rows = await db.run<T>(
    `update ${table} set ${assignments.join(', ')} where id = $${values.length + 1} returning ${returning}`,
    [...values, id]
  );
  return rows[0] ?? null;
}
