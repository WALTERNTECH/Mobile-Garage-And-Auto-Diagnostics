// Connects as each role through the pooler and checks what it can and cannot touch.
import pg from 'pg';
import fs from 'node:fs';
const s = JSON.parse(fs.readFileSync(new URL('../.local/secrets.json', import.meta.url)));
const ref = 'mrsxvdxaoogamhkdqejp';
const hosts = ['aws-0-eu-central-1.pooler.supabase.com', 'aws-1-eu-central-1.pooler.supabase.com'];

async function tryConnect(user, password) {
  for (const host of hosts) {
    const c = new pg.Client({ host, port: 6543, user: `${user}.${ref}`, password, database: 'postgres', ssl: { rejectUnauthorized: false } });
    try { await c.connect(); return { c, host }; } catch (e) { console.log(user, host, 'fail:', e.message); }
  }
  throw new Error('no host worked');
}
async function attempt(c, label, sql, params) {
  try { const r = await c.query(sql, params); console.log('  ALLOWED', label, r.rows?.[0] ?? ''); }
  catch (e) { console.log('  denied ', label, '-', e.message); }
}

const api = await tryConnect('mgarage_api', s.API_DB_PASSWORD);
console.log('api via', api.host);
await attempt(api.c, 'api count settings', 'select count(*) from settings');
await attempt(api.c, 'api read public schema (fpesa)', "select count(*) from information_schema.tables where table_schema='public'");
await attempt(api.c, 'api read mjengo', 'select 1 from mjengo.users limit 1');
await api.c.end();

const web = await tryConnect('mgarage_web', s.WEB_DB_PASSWORD);
console.log('web via', web.host);
await attempt(web.c, 'web read services', 'select count(*) from services');
await attempt(web.c, 'web read bookings', 'select count(*) from bookings');
await attempt(web.c, 'web read admins', 'select count(*) from admins');
await attempt(web.c, 'web insert services', "insert into services(slug,title) values ('x','x')");
await attempt(web.c, 'web read nextgen', 'select 1 from nextgen.companies limit 1');
await web.c.end();
fs.writeFileSync(new URL('../.local/pooler-host.txt', import.meta.url), api.host);
