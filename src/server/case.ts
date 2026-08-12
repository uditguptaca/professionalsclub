import 'server-only';

/**
 * Postgres columns are snake_case; the domain types in `@/types` are camelCase.
 * Rows are converted here, at the repository boundary, so nothing downstream
 * sees a raw row shape.
 *
 * The matrimony types are declared in snake_case and already match their
 * columns, so matrimony rows must NOT be run through this.
 */

const snakeToCamel = (key: string) => key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

function convert<T>(value: unknown): T {
  if (Array.isArray(value)) return value.map((v) => convert(v)) as T;

  // Dates and other class instances are values, not records to rewrite.
  if (value === null || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) {
    return value as T;
  }

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[snakeToCamel(key)] = convert(val);
  }
  return out as T;
}

export function camel<T>(row: unknown): T {
  return convert<T>(row);
}

export function camelAll<T>(rows: unknown[]): T[] {
  return rows.map((r) => convert<T>(r));
}

/**
 * Postgres returns timestamptz as a Date. The domain types use ISO strings, and
 * they cross the Server Action boundary where a Date would serialise
 * inconsistently, so they are normalised on the way out.
 */
export function isoDates<T>(value: T): T {
  if (value instanceof Date) return value.toISOString() as unknown as T;
  if (Array.isArray(value)) return value.map((v) => isoDates(v)) as unknown as T;
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = isoDates(v);
    return out as T;
  }
  return value;
}

/** Row -> domain object, with dates as ISO strings. */
export const toDomain = <T>(row: unknown): T => isoDates(camel<T>(row));
export const toDomainAll = <T>(rows: unknown[]): T[] => rows.map((r) => toDomain<T>(r));
