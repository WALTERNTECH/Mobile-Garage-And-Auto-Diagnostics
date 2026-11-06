// Local stand-in for Vercel: serves an app's static output, applies its vercel.json rewrites,
// and runs api/*.js handlers with Vercel-style req/res helpers.
//   node scripts/dev.mjs site 5310
//   node scripts/dev.mjs admin 5321   (API only; Vite on 5320 proxies /api here)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const [, , app = 'site', portArg] = process.argv;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appDir = path.join(root, app);
const port = Number(portArg || (app === 'site' ? 5310 : 5321));
const cfg = JSON.parse(fs.readFileSync(path.join(appDir, 'vercel.json'), 'utf8'));
const staticDir = path.join(appDir, cfg.outputDirectory || 'public');

const secrets = JSON.parse(fs.readFileSync(path.join(root, '.local/secrets.json'), 'utf8'));
const host = fs.readFileSync(path.join(root, '.local/pooler-host.txt'), 'utf8').trim();
const ref = 'mrsxvdxaoogamhkdqejp';
const url = (user, pw) => `postgresql://${user}.${ref}:${encodeURIComponent(pw)}@${host}:6543/postgres`;
if (app === 'site') {
  process.env.DATABASE_URL = url('mgarage_web', secrets.WEB_DB_PASSWORD);
  process.env.IP_SALT = secrets.IP_SALT;
} else {
  process.env.DATABASE_URL = url('mgarage_api', secrets.API_DB_PASSWORD);
  process.env.SESSION_SECRET = secrets.SESSION_SECRET;
  process.env.ADMIN_SETUP_TOKEN = secrets.ADMIN_SETUP_TOKEN;
  process.env.SITE_URL = process.env.SITE_URL || 'http://localhost:5310';
  process.env.COOKIE_INSECURE = '1';
}

const MIME = { '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.html': 'text/html', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };

function compile(source) {
  const names = [];
  const re = source.replace(/[.+?^${}[\]\\]/g, '\\$&')
    .replace(/:(\w+)\(([^)]*)\)/g, (_, n, alt) => { names.push(n); return `(${alt})`; })
    .replace(/:(\w+)\*/g, (_, n) => { names.push(n); return '(.*)'; })
    .replace(/:(\w+)/g, (_, n) => { names.push(n); return '([^/]+)'; })
    .replace(/\(\.\*\)$/, '(.*)');
  return { rx: new RegExp(`^${re}$`), names };
}
const rewrites = (cfg.rewrites || []).map((r) => ({ ...r, ...compile(r.source) }));

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks);
}

function decorate(res) {
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (o) => { if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); return res; };
  res.send = (b) => { if (typeof b === 'object' && !Buffer.isBuffer(b)) return res.json(b); res.end(b); return res; };
  return res;
}

http.createServer(async (req, res) => {
  decorate(res);
  try {
    const u = new URL(req.url, `http://localhost:${port}`);
    let pathname = decodeURIComponent(u.pathname);
    const query = Object.fromEntries(u.searchParams);

    // static first, like Vercel's filesystem check
    const file = path.join(staticDir, pathname);
    if (file.startsWith(staticDir) && fs.existsSync(file) && fs.statSync(file).isFile()) {
      res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
      return res.end(fs.readFileSync(file));
    }
    let fn = null;
    const direct = pathname.match(/^\/api\/([\w-]+(?:\/[\w-]+)*)$/);
    if (direct && fs.existsSync(path.join(appDir, 'api', direct[1] + '.js'))) fn = direct[1];
    if (!fn) {
      for (const r of rewrites) {
        const m = pathname.match(r.rx);
        if (!m) continue;
        let dest = r.destination;
        r.names.forEach((n, k) => { dest = dest.split(`:${n}*`).join(m[k + 1] ?? '').split(`:${n}`).join(m[k + 1] ?? ''); });
        const du = new URL(dest, 'http://x');
        Object.assign(query, Object.fromEntries(du.searchParams));
        pathname = du.pathname;
        const f = path.join(staticDir, pathname);
        if (fs.existsSync(f) && fs.statSync(f).isFile()) {
          res.setHeader('Content-Type', MIME[path.extname(f)] || 'application/octet-stream');
          return res.end(fs.readFileSync(f));
        }
        const dm = pathname.match(/^\/api\/(.+)$/);
        if (dm && fs.existsSync(path.join(appDir, 'api', dm[1] + '.js'))) { fn = dm[1]; break; }
      }
    }
    if (!fn) { res.statusCode = 404; return res.end('Not found'); }

    const raw = ['GET', 'HEAD'].includes(req.method) ? Buffer.alloc(0) : await readBody(req);
    const ct = String(req.headers['content-type'] || '');
    req.query = query;
    req.body = !raw.length ? undefined : ct.includes('application/json') ? JSON.parse(raw.toString() || '{}') : ct.startsWith('text/') ? raw.toString() : raw;
    req.headers['x-forwarded-host'] = req.headers.host;
    req.headers['x-forwarded-proto'] = 'http';
    const mod = await import(pathToFileURL(path.join(appDir, 'api', fn + '.js')).href + `?t=${Date.now()}`);
    await mod.default(req, res);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) { res.statusCode = 500; res.end('Server error: ' + e.message); }
  }
}).listen(port, () => console.log(`${app} on http://localhost:${port}`));
