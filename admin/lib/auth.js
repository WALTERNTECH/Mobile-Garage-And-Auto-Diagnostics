import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { one, q } from './db.js';

const scrypt = promisify(crypto.scrypt);
const COOKIE = 'mg_admin';
const MAX_AGE = 7 * 24 * 3600; // seconds

export async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(pw, stored) {
  const [alg, N, r, p, salt, hash] = String(stored || '').split('$');
  if (alg !== 'scrypt') return false;
  const want = Buffer.from(hash, 'base64');
  const got = await scrypt(pw, Buffer.from(salt, 'base64'), want.length, { N: +N, r: +r, p: +p });
  return crypto.timingSafeEqual(want, got);
}

export function passwordProblem(pw) {
  if (typeof pw !== 'string' || pw.length < 10) return 'Use at least 10 characters.';
  if (pw.length > 200) return 'That password is too long.';
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) return 'Use letters and at least one number.';
  return null;
}

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET is not set');
  return s;
}
const sign = (data) => crypto.createHmac('sha256', secret()).update(data).digest('base64url');

export function makeSession(admin) {
  const body = Buffer.from(JSON.stringify({ u: admin.id, e: admin.session_epoch, x: Math.floor(Date.now() / 1000) + MAX_AGE })).toString('base64url');
  return `${body}.${sign(body)}`;
}

function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((p) => p[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
}

export function setSessionCookie(res, token) {
  const secure = process.env.COOKIE_INSECURE ? '' : '; Secure';
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${MAX_AGE}${secure}`);
}
export function clearSessionCookie(res) {
  const secure = process.env.COOKIE_INSECURE ? '' : '; Secure';
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`);
}

export async function currentAdmin(req) {
  const tok = parseCookies(req)[COOKIE];
  if (!tok || !tok.includes('.')) return null;
  const [body, sig] = tok.split('.');
  const want = sign(body);
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  let p;
  try { p = JSON.parse(Buffer.from(body, 'base64url').toString()); } catch { return null; }
  if (!p.x || p.x < Date.now() / 1000) return null;
  const a = await one('select id, username, name, session_epoch, created_at, last_login_at from admins where id = $1', [p.u]);
  if (!a || a.session_epoch !== p.e) return null;
  return a;
}

export function clientIp(req) {
  return String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
}

// Failed attempts in the last 15 minutes, per username and per IP.
export async function tooManyAttempts(username, ip) {
  const r = await one(
    `select count(*) filter (where key = $1)::int as u, count(*) filter (where key = $2)::int as i
       from login_attempts where not ok and at > now() - interval '15 minutes' and key in ($1, $2)`,
    [`u:${username}`, `ip:${ip}`]);
  return r.u >= 8 || r.i >= 20;
}
export async function recordAttempt(username, ip, ok) {
  await q('insert into login_attempts(key, ok) values ($1,$3), ($2,$3)', [`u:${username}`, `ip:${ip}`, ok]);
  if (Math.random() < 0.05) await q("delete from login_attempts where at < now() - interval '2 days'");
}

export function safeEqual(a, b) {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}
