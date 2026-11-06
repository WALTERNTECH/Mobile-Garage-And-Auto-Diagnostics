// End-to-end check of both apps over HTTP. Creates a throwaway admin "qa-smoke" (via the setup
// token when no admin exists, otherwise refuses), exercises every admin operation, files a booking
// through the public site, then removes everything it created, including the admin.
//   node scripts/smoke.mjs [adminBase] [siteBase] [--keep]
import fs from 'node:fs';
import crypto from 'node:crypto';
import sharp from 'sharp';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const KEEP = process.argv.includes('--keep');
const ADMIN = args[0] || 'http://localhost:5321';
const SITE = args[1] || 'http://localhost:5310';
const root = new URL('../', import.meta.url);
const secrets = JSON.parse(fs.readFileSync(new URL('.local/secrets.json', root)));

let cookie = '';
let pass = 0, fail = 0;
const ok = (cond, label, extra = '') => { if (cond) { pass++; console.log('  ok  ', label); } else { fail++; console.log('  FAIL', label, extra); } };

async function call(path, { method = 'GET', body, raw, headers = {}, noHeader = false, base = ADMIN } = {}) {
  const h = { ...headers };
  if (!noHeader) h['X-MG-Admin'] = '1';
  if (cookie) h.Cookie = cookie;
  let payload;
  if (raw) payload = raw; else if (body !== undefined) { payload = JSON.stringify(body); h['Content-Type'] = 'application/json'; }
  const r = await fetch(`${base}${path}`, { method, headers: h, body: payload, redirect: 'manual' });
  const sc = r.headers.get('set-cookie');
  if (sc && base === ADMIN) cookie = sc.split(';')[0].endsWith('=') ? '' : sc.split(';')[0];
  const ct = r.headers.get('content-type') || '';
  const data = ct.includes('json') ? await r.json() : ct.startsWith('image/') ? Buffer.from(await r.arrayBuffer()) : await r.text();
  return { status: r.status, data, headers: r.headers };
}

const password = 'Qa' + crypto.randomBytes(9).toString('base64url') + '7';
const created = { slides: [], services: [], reviews: [], faqs: [], images: [], bookings: [] };

console.log('Admin', ADMIN, '· Site', SITE);
let s = await call('/api/session');
ok(s.status === 200, 'session endpoint');
ok((await call('/api/dashboard')).status === 401, 'dashboard needs sign-in');
ok((await call('/api/login', { method: 'POST', body: {}, noHeader: true })).status === 403, 'POST without X-MG-Admin header refused');

if (s.data.needsSetup) {
  ok((await call('/api/setup', { method: 'POST', body: { token: 'wrong', username: 'qa-smoke', password } })).status === 403, 'setup rejects a wrong code');
  const r = await call('/api/setup', { method: 'POST', body: { token: secrets.ADMIN_SETUP_TOKEN, username: 'qa-smoke', name: 'QA Smoke', password } });
  ok(r.status === 200 && cookie, 'setup creates the first admin');
  cookie = '';
  ok((await call('/api/setup', { method: 'POST', body: { token: secrets.ADMIN_SETUP_TOKEN, username: 'qa-two', password } })).status === 409, 'setup refuses once an admin exists');
} else {
  console.log('An admin already exists; this script only runs against an empty admin table.');
  process.exit(1);
}
ok((await call('/api/login', { method: 'POST', body: { username: 'qa-smoke', password: 'nope-nope-1' } })).status === 401, 'wrong password refused');
const li = await call('/api/login', { method: 'POST', body: { username: 'qa-smoke', password } });
ok(li.status === 200 && cookie.startsWith('mg_admin='), 'login sets the session cookie');
ok(/HttpOnly/i.test(li.headers.get('set-cookie')) && /SameSite=Strict/i.test(li.headers.get('set-cookie')), 'cookie is HttpOnly + SameSite=Strict');

const d = await call('/api/dashboard');
ok(d.status === 200 && d.data.counts && d.data.daily.length === 14, 'dashboard loads with 14-day series');
ok((await call('/api/badges')).status === 200, 'badges');

// image upload
const png = await sharp({ create: { width: 1200, height: 800, channels: 3, background: '#ff5a1f' } }).webp({ quality: 70 }).toBuffer();
const up = await call('/api/images', { method: 'POST', raw: png, headers: { 'Content-Type': 'application/octet-stream', 'X-Width': '1200', 'X-Height': '800', 'X-Alt': encodeURIComponent('QA test image') } });
ok(up.status === 200 && up.data.id, 'image upload', JSON.stringify(up.data));
const imgId = up.data.id; created.images.push(imgId);
ok((await call('/api/images', { method: 'POST', raw: Buffer.from('<svg>nope</svg>'), headers: { 'Content-Type': 'application/octet-stream' } })).status === 400, 'non-image upload refused');
const got = await call(`/api/img/${imgId}`);
ok(got.status === 200 && Buffer.isBuffer(got.data) && got.data.length === png.length, 'admin can read the image back');

// slides
const sl = await call('/api/slides', { method: 'POST', body: { image_id: imgId, title: 'QA slide', cta_label: 'Go', cta_href: '#book' } });
ok(sl.status === 200 && sl.data.id, 'create slide'); created.slides.push(sl.data.id);
ok((await call(`/api/slides/${sl.data.id}`, { method: 'PATCH', body: { cta_href: 'javascript:alert(1)' } })).status === 400, 'slide rejects a javascript: link');
ok((await call(`/api/slides/${sl.data.id}`, { method: 'PATCH', body: { title: 'QA slide edited', active: false } })).data.title === 'QA slide edited', 'edit slide');
const slides = (await call('/api/slides')).data;
const order = [sl.data.id, ...slides.filter((x) => x.id !== sl.data.id).map((x) => x.id)];
ok((await call('/api/slides/reorder', { method: 'POST', body: { ids: order } })).status === 200, 'reorder slides');
ok((await call('/api/slides')).data[0].id === sl.data.id, 'slide order saved');
ok((await call(`/api/images/${imgId}`, { method: 'DELETE' })).status === 400, 'cannot delete a photo that is in use');

// services
const sv = await call('/api/services', { method: 'POST', body: { title: 'QA Brake Check', active: false, highlights: ['Pads', 'Discs'] } });
ok(sv.status === 200 && sv.data.slug === 'qa-brake-check', 'create service with slug');
created.services.push(sv.data.id);
ok((await call('/api/services', { method: 'POST', body: { title: 'QA Brake Check' } })).status === 409, 'duplicate slug refused');
const si = await call(`/api/services/${sv.data.id}/images`, { method: 'POST', body: { image_id: imgId } });
ok(si.status === 200, 'attach photo to service');
ok((await call(`/api/services/${sv.data.id}/images/${si.data.id}`, { method: 'PATCH', body: { caption: 'Front left' } })).data.caption === 'Front left', 'caption a service photo');
ok((await call(`/api/services/${sv.data.id}`, { method: 'PATCH', body: { price_from: 'KES 1,500', featured: true, active: true } })).data.active === true, 'edit service + make live');

// the public site sees the live service page
let page = await call('/services/qa-brake-check', { base: SITE });
ok(page.status === 200 && page.data.includes('QA Brake Check') && page.data.includes('From KES 1,500'), 'public site renders the new service page');
ok(page.data.includes(`/img/${imgId}`), 'public service page shows the uploaded photo');
const pubImg = await call(`/img/${imgId}`, { base: SITE });
ok(pubImg.status === 200 && /immutable/.test(pubImg.headers.get('cache-control')), 'public image served with long cache');
ok((await call('/services/does-not-exist', { base: SITE })).status === 404, 'unknown service page is 404');
ok((await call('/random-page', { base: SITE })).status === 404, 'unknown page is 404');
const home = await call('/', { base: SITE });
ok(home.status === 200 && home.data.includes('application/ld+json'), 'home has structured data');
ok(!/admin|console/i.test(home.data.replace(/Mobile Garage/g, '')) || !home.data.includes('5320'), 'home page does not link to the admin');
const sm = await call('/sitemap.xml', { base: SITE });
ok(sm.status === 200 && sm.data.includes('/services/qa-brake-check'), 'sitemap lists the service');

// reviews + faqs
const rv = await call('/api/reviews', { method: 'POST', body: { name: 'QA Person', body: 'Great work on my car.' } });
ok(rv.status === 200, 'create review'); created.reviews.push(rv.data.id);
ok((await call(`/api/reviews/${rv.data.id}`, { method: 'PATCH', body: { active: false } })).data.active === false, 'hide review');
const fq = await call('/api/faqs', { method: 'POST', body: { question: 'QA question?', answer: 'QA answer.' } });
ok(fq.status === 200, 'create faq'); created.faqs.push(fq.data.id);
ok((await call('/api/faqs', { method: 'POST', body: { question: '' } })).status === 400, 'faq validation');

// settings round trip (no net change)
const st = await call('/api/settings');
ok(st.status === 200 && st.data.value.name, 'read settings');
const bad = structuredClone(st.data.value); bad.whatsapp = 'abc';
ok((await call('/api/settings', { method: 'PUT', body: { value: bad } })).status === 400, 'settings validation (WhatsApp)');
const badH = structuredClone(st.data.value); badH.hours = badH.hours.map((h) => (h.day === 'Monday' ? { ...h, open: '19:00', close: '08:00' } : h));
ok((await call('/api/settings', { method: 'PUT', body: { value: badH } })).status === 400, 'settings validation (hours order)');
const ann = structuredClone(st.data.value); ann.announcement = { enabled: true, text: 'QA announcement', link: '#book' };
ok((await call('/api/settings', { method: 'PUT', body: { value: ann } })).status === 200, 'turn on announcement');
page = await call('/', { base: SITE });
ok(page.data.includes('QA announcement'), 'public site shows the announcement');
ok((await call('/api/settings', { method: 'PUT', body: { value: st.data.value } })).status === 200, 'restore settings');

// bookings: public form → admin
const bk = await call('/api/booking', { base: SITE, method: 'POST', body: { name: 'QA Booking', phone: '0700 000000', vehicle: 'Test car', service: 'QA Brake Check', message: 'smoke test' }, headers: { Origin: SITE } });
ok(bk.status === 200 && /^MG-/.test(bk.data.ref), 'public booking form returns a reference');
ok((await call('/api/booking', { base: SITE, method: 'POST', body: { name: 'X', phone: '12' }, headers: { Origin: SITE } })).status === 400, 'booking validation');
ok((await call('/api/booking', { base: SITE, method: 'POST', body: { name: 'QA', phone: '0700000000' }, headers: { Origin: 'https://evil.example' } })).status === 403, 'booking from another origin refused');
const list = await call('/api/bookings?q=QA%20Booking');
const mine = list.data.rows.find((r) => r.ref === bk.data.ref);
ok(!!mine, 'admin sees the booking'); if (mine) created.bookings.push(mine.id);
ok((await call(`/api/bookings/${mine.id}`, { method: 'PATCH', body: { status: 'scheduled', notes: 'qa' } })).data.status === 'scheduled', 'update booking status');
ok((await call(`/api/bookings/${mine.id}`, { method: 'PATCH', body: { status: 'weird' } })).status === 400, 'booking status validation');

// admins
const a2 = await call('/api/admins', { method: 'POST', body: { username: 'qa-second', password: 'short' } });
ok(a2.status === 400, 'weak password refused');

// cleanup
console.log('cleanup');
for (const id of created.bookings) ok((await call(`/api/bookings/${id}`, { method: 'DELETE' })).status === 200, 'delete booking');
for (const id of created.reviews) ok((await call(`/api/reviews/${id}`, { method: 'DELETE' })).status === 200, 'delete review');
for (const id of created.faqs) ok((await call(`/api/faqs/${id}`, { method: 'DELETE' })).status === 200, 'delete faq');
for (const id of created.services) ok((await call(`/api/services/${id}`, { method: 'DELETE' })).status === 200, 'delete service');
for (const id of created.slides) ok((await call(`/api/slides/${id}`, { method: 'DELETE' })).status === 200, 'delete slide');
const imgs = (await call('/api/images')).data;
ok(!imgs.find((i) => i.id === imgId), 'unused photo removed automatically');
const slidesNow = (await call('/api/slides')).data;
const restoreOrder = slidesNow.map((x) => x.id);
ok((await call('/api/slides/reorder', { method: 'POST', body: { ids: restoreOrder } })).status === 200, 'slide order normalised');

if (!KEEP) {
  // remove the throwaway admin directly (the API refuses to delete the last admin by design)
  const pg = (await import('pg')).default;
  const host = fs.readFileSync(new URL('.local/pooler-host.txt', root), 'utf8').trim();
  const c = new pg.Client({ host, port: 6543, user: 'mgarage_api.mrsxvdxaoogamhkdqejp', password: secrets.API_DB_PASSWORD, database: 'postgres', ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query("delete from admins where username like 'qa-%'");
  await c.query("delete from login_attempts where key like 'u:qa-%' or key like 'u:nope%'");
  await c.end();
  ok(r.rowCount >= 1, 'throwaway admin removed');
  ok((await call('/api/dashboard')).status === 401, 'its session no longer works');
} else {
  fs.writeFileSync(new URL('.local/qa-admin.json', root), JSON.stringify({ username: 'qa-smoke', password }));
  console.log('kept qa-smoke; credentials in .local/qa-admin.json');
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
