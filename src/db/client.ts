import 'server-only';
import { sql } from 'drizzle-orm';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import * as schema from './schema';
import { DDL } from './schema';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = PgDatabase<any, typeof schema>;

let ready: Promise<Db> | null = null;

/**
 * Postgres when DATABASE_URL is set (production on Steve's VPS), otherwise an
 * embedded PGlite database under ./data so local dev and tests need no service.
 */
export function getDb(): Promise<Db> {
  if (ready) return ready;
  ready = (async () => {
    const url = process.env.DATABASE_URL;
    let db: Db;
    if (url) {
      const { drizzle } = await import('drizzle-orm/postgres-js');
      const postgres = (await import('postgres')).default;
      db = drizzle(postgres(url, { max: 5 }), { schema }) as unknown as Db;
    } else {
      const { PGlite } = await import('@electric-sql/pglite');
      const { drizzle } = await import('drizzle-orm/pglite');
      const dir = process.env.PGLITE_DIR ?? './data/pglite';
      db = drizzle(new PGlite(dir), { schema }) as unknown as Db;
    }
    for (const stmt of DDL.split(';').map((s) => s.trim()).filter(Boolean)) {
      await db.execute(sql.raw(stmt));
    }
    return db;
  })();
  return ready;
}
