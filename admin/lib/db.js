import pg from 'pg';

// DATABASE_URL: Supabase transaction pooler (6543) as mgarage_api, owner of schema mgarage.
let pool;
export function db() {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    pool = new pg.Pool({
      connectionString: url.replace(/[?&]sslmode=[^&]*/, ''),
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 8_000,
    });
    pool.on('error', () => {});
  }
  return pool;
}

export const q = async (sql, params) => (await db().query(sql, params)).rows;
export const one = async (sql, params) => (await db().query(sql, params)).rows[0] || null;

export async function tx(fn) {
  const c = await db().connect();
  try {
    await c.query('begin');
    const out = await fn(c);
    await c.query('commit');
    return out;
  } catch (e) {
    await c.query('rollback').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}
