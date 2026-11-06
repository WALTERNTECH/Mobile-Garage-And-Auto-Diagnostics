// Pushes production env vars from .local/secrets.json to both Vercel projects without printing values.
//   node scripts/vercel-env.mjs [siteUrl]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const s = JSON.parse(fs.readFileSync(path.join(root, '.local/secrets.json'), 'utf8'));
const host = fs.readFileSync(path.join(root, '.local/pooler-host.txt'), 'utf8').trim();
const ref = 'mrsxvdxaoogamhkdqejp';
const url = (user, pw) => `postgresql://${user}.${ref}:${encodeURIComponent(pw)}@${host}:6543/postgres`;
const siteUrl = process.argv[2] || '';

const plan = {
  site: { DATABASE_URL: url('mgarage_web', s.WEB_DB_PASSWORD), IP_SALT: s.IP_SALT, ...(siteUrl ? { SITE_URL: siteUrl } : {}) },
  admin: { DATABASE_URL: url('mgarage_api', s.API_DB_PASSWORD), SESSION_SECRET: s.SESSION_SECRET, ADMIN_SETUP_TOKEN: s.ADMIN_SETUP_TOKEN, ...(siteUrl ? { SITE_URL: siteUrl } : {}) },
};

const shell = process.platform === 'win32';
for (const [app, vars] of Object.entries(plan)) {
  const cwd = path.join(root, app);
  for (const [name, value] of Object.entries(vars)) {
    spawnSync('vercel', ['env', 'rm', name, 'production', '--yes'], { cwd, shell, encoding: 'utf8' });
    const r = spawnSync('vercel', ['env', 'add', name, 'production'], { cwd, shell, input: value, encoding: 'utf8' });
    const okay = r.status === 0;
    console.log(`${app.padEnd(5)} ${name.padEnd(18)} ${okay ? 'set' : 'FAILED: ' + (r.stderr || '').split('\n').filter(Boolean).slice(-1)[0]}`);
  }
}
