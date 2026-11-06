import { q, one, tx } from '../lib/db.js';
import {
  currentAdmin, makeSession, setSessionCookie, clearSessionCookie, hashPassword, verifyPassword,
  passwordProblem, tooManyAttempts, recordAttempt, clientIp, safeEqual,
} from '../lib/auth.js';

/* ---------- helpers ---------- */
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const bad = (msg) => new HttpError(400, msg);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuid = (v) => { if (!UUID.test(String(v))) throw new HttpError(404, 'Not found'); return String(v); };

function clean(body, spec, { partial = false } = {}) {
  const out = {};
  for (const [k, [type, max, max2]] of Object.entries(spec)) {
    if (!(k in body)) { if (!partial && type === 'req') throw bad(`${k} is required`); continue; }
    const v = body[k];
    if (type === 'str' || type === 'req') {
      const s = String(v ?? '').trim();
      if (s.length > max) throw bad(`${k} is too long (max ${max})`);
      if (type === 'req' && !s) throw bad(`${k} is required`);
      out[k] = s;
    } else if (type === 'bool') out[k] = !!v;
    else if (type === 'int') { const n = Number(v); if (!Number.isInteger(n)) throw bad(`${k} must be a whole number`); out[k] = n; }
    else if (type === 'uuid') out[k] = uuid(v);
    else if (type === 'list') {
      if (!Array.isArray(v)) throw bad(`${k} must be a list`);
      if (v.length > max) throw bad(`Too many ${k}`);
      out[k] = v.map((x) => String(x ?? '').trim().slice(0, max2)).filter(Boolean);
    }
  }
  return out;
}

const HREF_OK = (h) => h === '' || ['tel', 'maps', 'whatsapp'].includes(h) || /^#[\w-]*$/.test(h) || /^\/(?!\/)/.test(h) || /^https:\/\/[^\s]+$/.test(h);
const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'service';

// Remove an image once nothing points at it any more (slides, service galleries, the About photo).
async function gcImage(c, id) {
  if (!id) return;
  await c.query(
    `delete from images i where i.id = $1
       and not exists (select 1 from slides where image_id = i.id)
       and not exists (select 1 from service_images where image_id = i.id)
       and not exists (select 1 from settings where key = 'public.business' and value->'about'->>'image_id' = i.id::text)`, [id]);
}

async function reorder(table, ids, extraWhere = '', extraParams = []) {
  if (!Array.isArray(ids) || ids.length > 500) throw bad('ids must be a list');
  ids.forEach(uuid);
  await tx(async (c) => {
    for (const [i, id] of ids.entries()) {
      await c.query(`update ${table} set sort = $1 where id = $2 ${extraWhere}`, [i, id, ...extraParams]);
    }
  });
}

const nextSort = async (table, where = '', params = []) => (await one(`select coalesce(max(sort), -1) + 1 as n from ${table} ${where}`, params)).n;

function sniffImage(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'image/webp';
  if (buf.slice(4, 12).toString().startsWith('ftypavi')) return 'image/avif';
  return null;
}

async function rawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body, 'binary');
  const chunks = [];
  for await (const ch of req) chunks.push(ch);
  return Buffer.concat(chunks);
}

/* ---------- business settings ---------- */
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
function cleanBusiness(b) {
  const s = (v, max) => { const t = String(v ?? '').trim(); if (t.length > max) throw bad(`A field is too long (max ${max})`); return t; };
  const url = (v) => { const t = s(v, 300); if (t && !/^https:\/\/[^\s]+$/.test(t)) throw bad('Links must start with https://'); return t; };
  const out = {
    name: s(b.name, 80), shortName: s(b.shortName, 40), tagline: s(b.tagline, 140),
    phone: s(b.phone, 20), phoneIntl: s(b.phoneIntl, 16), whatsapp: s(b.whatsapp, 16).replace(/\D/g, ''),
    email: s(b.email, 120), address: s(b.address, 120), plusCode: s(b.plusCode, 40),
    lat: Number(b.lat) || 0, lng: Number(b.lng) || 0, mapsUrl: url(b.mapsUrl),
    rating: Math.min(5, Math.max(0, Number(b.rating) || 0)), reviewCount: Math.max(0, parseInt(b.reviewCount, 10) || 0),
    hours: DAYS.map((day) => {
      const h = (b.hours || []).find((x) => x.day === day) || {};
      const closed = !!h.closed;
      if (!closed && (!TIME.test(h.open || '') || !TIME.test(h.close || ''))) throw bad(`Set opening and closing times for ${day} (HH:MM)`);
      if (!closed && h.open >= h.close) throw bad(`${day}: closing time must be after opening time`);
      return { day, open: closed ? '' : h.open, close: closed ? '' : h.close, closed };
    }),
    hero: { eyebrow: s(b.hero?.eyebrow, 80), title: s(b.hero?.title, 90), subtitle: s(b.hero?.subtitle, 260) },
    about: {
      title: s(b.about?.title, 90), body: s(b.about?.body, 900),
      points: (b.about?.points || []).slice(0, 8).map((p) => s(p, 120)).filter(Boolean),
      image_id: b.about?.image_id ? uuid(b.about.image_id) : '',
    },
    steps: (b.steps || []).slice(0, 4).map((st) => ({ title: s(st.title, 60), body: s(st.body, 220) })).filter((st) => st.title),
    announcement: { enabled: !!b.announcement?.enabled, text: s(b.announcement?.text, 140), link: s(b.announcement?.link, 300) },
    social: { facebook: url(b.social?.facebook), instagram: url(b.social?.instagram), tiktok: url(b.social?.tiktok) },
    seo: { title: s(b.seo?.title, 90), description: s(b.seo?.description, 200) },
  };
  if (!out.name) throw bad('Business name is required');
  if (!/^\+?\d{9,15}$/.test(out.phoneIntl)) throw bad('International phone must look like +254723595977');
  if (!/^\d{9,15}$/.test(out.whatsapp)) throw bad('WhatsApp number must be digits only, like 254723595977');
  if (out.announcement.link && !HREF_OK(out.announcement.link)) throw bad('Announcement link is not valid');
  return out;
}

/* ---------- field specs ---------- */
const SLIDE = { eyebrow: ['str', 60], title: ['str', 80], subtitle: ['str', 200], cta_label: ['str', 30], cta_href: ['str', 300], active: ['bool'] };
const SERVICE = {
  title: ['req', 80], slug: ['str', 60], category: ['str', 40], summary: ['str', 240], description: ['str', 2000],
  highlights: ['list', 8, 90], price_from: ['str', 40], duration: ['str', 40], icon: ['str', 20], featured: ['bool'], active: ['bool'],
};
const REVIEW = { name: ['req', 80], body: ['req', 1200], when_label: ['str', 40], source: ['str', 30], active: ['bool'] };
const FAQ = { question: ['req', 200], answer: ['req', 1200], active: ['bool'] };
const STATUSES = ['new', 'contacted', 'scheduled', 'done', 'cancelled'];

function sqlSet(fields, startAt = 1) {
  const keys = Object.keys(fields);
  return { set: keys.map((k, i) => `${k} = $${i + startAt}`).join(', '), values: keys.map((k) => (k === 'highlights' ? JSON.stringify(fields[k]) : fields[k])) };
}

async function updateRow(table, id, fields, touch = true) {
  if (!Object.keys(fields).length) throw bad('Nothing to update');
  const { set, values } = sqlSet(fields, 2);
  const row = await one(`update ${table} set ${set}${touch ? ', updated_at = now()' : ''} where id = $1 returning *`, [id, ...values]);
  if (!row) throw new HttpError(404, 'Not found');
  return row;
}

/* ---------- routes ---------- */
async function route(req, res, admin, parts) {
  const m = req.method;
  const body = req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body) ? req.body : {};
  const [a, b, c2] = parts;

  /* account */
  if (a === 'logout' && m === 'POST') { clearSessionCookie(res); return { ok: true }; }
  if (a === 'password' && m === 'POST') {
    const me = await one('select * from admins where id = $1', [admin.id]);
    if (!(await verifyPassword(String(body.current || ''), me.pass_hash))) throw bad('Your current password is not right.');
    const p = passwordProblem(body.next); if (p) throw bad(p);
    const upd = await one('update admins set pass_hash = $2, session_epoch = session_epoch + 1 where id = $1 returning *', [admin.id, await hashPassword(body.next)]);
    setSessionCookie(res, makeSession(upd));
    return { ok: true };
  }
  if (a === 'admins') {
    if (m === 'GET' && !b) return q('select id, username, name, created_at, last_login_at from admins order by created_at');
    if (m === 'POST' && !b) {
      const f = clean(body, { username: ['req', 40], name: ['str', 80], password: ['req', 200] });
      f.username = f.username.toLowerCase();
      if (!/^[a-z0-9._-]{3,40}$/.test(f.username)) throw bad('Username: 3–40 letters, numbers, dots, dashes.');
      const p = passwordProblem(f.password); if (p) throw bad(p);
      try {
        return await one('insert into admins(username, name, pass_hash) values ($1,$2,$3) returning id, username, name, created_at', [f.username, f.name, await hashPassword(f.password)]);
      } catch (e) { if (e.code === '23505') throw new HttpError(409, 'That username is taken.'); throw e; }
    }
    if (m === 'DELETE' && b) {
      if (uuid(b) === admin.id) throw bad('You cannot remove your own account.');
      const n = (await one('select count(*)::int n from admins')).n;
      if (n <= 1) throw bad('Keep at least one admin.');
      await q('delete from admins where id = $1', [b]);
      return { ok: true };
    }
  }

  /* dashboard + live counts */
  if (a === 'badges' && m === 'GET') {
    return one(`select (select count(*)::int from bookings where status = 'new') as new_bookings,
      (select count(*)::int from slides where active) as slides, (select count(*)::int from services where active) as services,
      (select count(*)::int from testimonials where active) as reviews, (select count(*)::int from faqs where active) as faqs,
      (select count(*)::int from images) as images`);
  }
  if (a === 'dashboard' && m === 'GET') {
    const [counts, recent, daily, topServices, content] = await Promise.all([
      one(`select count(*) filter (where status = 'new')::int as new,
                  count(*) filter (where status in ('contacted','scheduled'))::int as open,
                  count(*) filter (where created_at >= date_trunc('day', now() at time zone 'Africa/Nairobi') at time zone 'Africa/Nairobi')::int as today,
                  count(*) filter (where created_at > now() - interval '7 days')::int as week,
                  count(*) filter (where created_at > now() - interval '30 days')::int as month,
                  count(*) filter (where status = 'done' and updated_at > now() - interval '30 days')::int as done_month,
                  count(*)::int as total from bookings`),
      q(`select id, ref, name, phone, vehicle, service, location, preferred_date, status, created_at from bookings
          order by (status = 'new') desc, created_at desc limit 6`),
      q(`select to_char(d, 'YYYY-MM-DD') as day, coalesce(n, 0)::int as n
           from generate_series((now() at time zone 'Africa/Nairobi')::date - 13, (now() at time zone 'Africa/Nairobi')::date, '1 day') d
           left join (select (created_at at time zone 'Africa/Nairobi')::date as day, count(*) n from bookings group by 1) b on b.day = d
          order by d`),
      q(`select coalesce(nullif(service, ''), 'Not sure yet') as service, count(*)::int as n from bookings
          where created_at > now() - interval '90 days' group by 1 order by n desc limit 5`),
      one(`select (select count(*)::int from slides) as slides, (select count(*)::int from slides where active) as slides_live,
                  (select count(*)::int from services) as services, (select count(*)::int from services where active) as services_live,
                  (select count(*)::int from services s where active and not exists (select 1 from service_images si where si.service_id = s.id)) as services_no_photo,
                  (select count(*)::int from testimonials where active) as reviews, (select count(*)::int from faqs where active) as faqs,
                  (select count(*)::int from images) as images, (select coalesce(sum(size), 0)::bigint from images) as image_bytes,
                  (select max(updated_at) from (select updated_at from slides union all select updated_at from services union all select updated_at from settings) u) as last_edit`),
    ]);
    const biz = await one("select value->>'announcement' as ann from settings where key = 'public.business'");
    return { counts, recent, daily, topServices, content, announcement: biz?.ann ? JSON.parse(biz.ann) : null, siteUrl: process.env.SITE_URL || '' };
  }

  /* settings */
  if (a === 'settings') {
    if (m === 'GET') return (await one("select value, updated_at from settings where key = 'public.business'")) || { value: {} };
    if (m === 'PUT') {
      const val = cleanBusiness(body.value || {});
      const prev = await one("select value->'about'->>'image_id' as img from settings where key = 'public.business'");
      const row = await tx(async (c) => {
        const r = (await c.query(`insert into settings(key, value) values ('public.business', $1)
          on conflict (key) do update set value = excluded.value, updated_at = now() returning value, updated_at`, [val])).rows[0];
        if (prev?.img && prev.img !== val.about.image_id) await gcImage(c, prev.img);
        return r;
      });
      return row;
    }
  }

  /* images */
  if (a === 'images') {
    if (m === 'GET' && !b) {
      return q(`select i.id, i.width, i.height, i.size, i.alt, i.mime, i.created_at,
        (select count(*) from slides where image_id = i.id)::int as in_slides,
        (select count(*) from service_images where image_id = i.id)::int as in_services,
        exists (select 1 from settings where key = 'public.business' and value->'about'->>'image_id' = i.id::text) as in_about
        from images i order by i.created_at desc`);
    }
    if (m === 'POST' && !b) {
      const buf = await rawBody(req);
      if (!buf.length) throw bad('No image received.');
      if (buf.length > 4 * 1024 * 1024) throw new HttpError(413, 'Image is too large (max 4 MB after compression).');
      const mime = sniffImage(buf);
      if (!mime) throw bad('Upload a JPEG, PNG, WebP or AVIF image.');
      const w = parseInt(req.headers['x-width'], 10) || null;
      const h = parseInt(req.headers['x-height'], 10) || null;
      const alt = decodeURIComponent(String(req.headers['x-alt'] || '')).slice(0, 200);
      return one('insert into images(mime, bytes, width, height, size, alt) values ($1,$2,$3,$4,$5,$6) returning id, width, height, size, alt, mime, created_at',
        [mime, buf, w, h, buf.length, alt]);
    }
    if (m === 'PATCH' && b) {
      const f = clean(body, { alt: ['str', 200] });
      const r = await one('update images set alt = $2 where id = $1 returning id, alt', [uuid(b), f.alt ?? '']);
      if (!r) throw new HttpError(404, 'Not found');
      return r;
    }
    if (m === 'DELETE' && b) {
      const used = await one(`select (select count(*) from slides where image_id = $1) + (select count(*) from service_images where image_id = $1)
        + (select count(*) from settings where key = 'public.business' and value->'about'->>'image_id' = $1::text) as n`, [uuid(b)]);
      if (Number(used.n) > 0) throw bad('This photo is still in use. Remove it from slides and services first.');
      await q('delete from images where id = $1', [b]);
      return { ok: true };
    }
  }
  if (a === 'img' && m === 'GET' && b) {
    const r = await one('select mime, bytes from images where id = $1', [uuid(b)]);
    if (!r) throw new HttpError(404, 'Not found');
    res.setHeader('Content-Type', r.mime);
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    res.status(200).send(r.bytes);
    return undefined;
  }

  /* slides */
  if (a === 'slides') {
    if (m === 'GET' && !b) return q('select s.*, i.width, i.height, i.alt from slides s join images i on i.id = s.image_id order by s.sort, s.created_at');
    if (m === 'POST' && b === 'reorder') { await reorder('slides', body.ids); return { ok: true }; }
    if (m === 'POST' && !b) {
      const f = clean(body, SLIDE);
      const image_id = uuid(body.image_id);
      if (f.cta_href !== undefined && !HREF_OK(f.cta_href)) throw bad('Button link must be tel, maps, whatsapp, #section, /path or https://…');
      const sort = await nextSort('slides');
      return one(`insert into slides(image_id, eyebrow, title, subtitle, cta_label, cta_href, active, sort)
        values ($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
      [image_id, f.eyebrow || '', f.title || '', f.subtitle || '', f.cta_label || '', f.cta_href || '', f.active ?? true, sort]);
    }
    if (m === 'PATCH' && b) {
      const f = clean(body, SLIDE, { partial: true });
      if (f.cta_href !== undefined && !HREF_OK(f.cta_href)) throw bad('Button link must be tel, maps, whatsapp, #section, /path or https://…');
      let oldImg = null;
      if (body.image_id) {
        f.image_id = uuid(body.image_id);
        oldImg = (await one('select image_id from slides where id = $1', [uuid(b)]))?.image_id;
      }
      const row = await updateRow('slides', uuid(b), f);
      if (oldImg && oldImg !== row.image_id) await tx((c) => gcImage(c, oldImg));
      return row;
    }
    if (m === 'DELETE' && b) {
      await tx(async (c) => {
        const r = (await c.query('delete from slides where id = $1 returning image_id', [uuid(b)])).rows[0];
        if (!r) throw new HttpError(404, 'Not found');
        await gcImage(c, r.image_id);
      });
      return { ok: true };
    }
  }

  /* services */
  if (a === 'services') {
    if (m === 'GET' && !b) {
      return q(`select s.*, coalesce((select json_agg(json_build_object('id', si.id, 'image_id', si.image_id, 'caption', si.caption, 'sort', si.sort,
                  'width', i.width, 'height', i.height) order by si.sort) from service_images si join images i on i.id = si.image_id
                  where si.service_id = s.id), '[]') as images
                from services s order by s.sort, s.created_at`);
    }
    if (m === 'POST' && b === 'reorder') { await reorder('services', body.ids); return { ok: true }; }
    if (m === 'POST' && !b) {
      const f = clean(body, SERVICE);
      f.slug = slugify(f.slug || f.title);
      const sort = await nextSort('services');
      try {
        return await one(`insert into services(slug, title, category, summary, description, highlights, price_from, duration, icon, featured, active, sort)
          values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *`,
        [f.slug, f.title, f.category || '', f.summary || '', f.description || '', JSON.stringify(f.highlights || []), f.price_from || '', f.duration || '', f.icon || 'wrench', f.featured ?? false, f.active ?? true, sort]);
      } catch (e) { if (e.code === '23505') throw new HttpError(409, 'Another service already uses that web address (slug).'); throw e; }
    }
    if (b && c2 === 'images') {
      const sid = uuid(b);
      if (m === 'POST' && parts[3] === 'reorder') { await reorder('service_images', body.ids, 'and service_id = $3', [sid]); return { ok: true }; }
      if (m === 'POST') {
        const n = (await one('select count(*)::int n from service_images where service_id = $1', [sid])).n;
        if (n >= 12) throw bad('A service can have up to 12 photos.');
        const sort = await nextSort('service_images', 'where service_id = $1', [sid]);
        return one('insert into service_images(service_id, image_id, caption, sort) values ($1,$2,$3,$4) returning *',
          [sid, uuid(body.image_id), String(body.caption || '').slice(0, 80), sort]);
      }
      if (m === 'PATCH' && parts[3]) {
        const r = await one('update service_images set caption = $3 where id = $2 and service_id = $1 returning *', [sid, uuid(parts[3]), String(body.caption || '').slice(0, 80)]);
        if (!r) throw new HttpError(404, 'Not found');
        return r;
      }
      if (m === 'DELETE' && parts[3]) {
        await tx(async (c) => {
          const r = (await c.query('delete from service_images where id = $2 and service_id = $1 returning image_id', [sid, uuid(parts[3])])).rows[0];
          if (!r) throw new HttpError(404, 'Not found');
          await gcImage(c, r.image_id);
        });
        return { ok: true };
      }
    }
    if (m === 'PATCH' && b && !c2) {
      const f = clean(body, SERVICE, { partial: true });
      if (f.slug !== undefined) f.slug = slugify(f.slug || f.title || 'service');
      try { return await updateRow('services', uuid(b), f); } catch (e) { if (e.code === '23505') throw new HttpError(409, 'Another service already uses that web address (slug).'); throw e; }
    }
    if (m === 'DELETE' && b && !c2) {
      await tx(async (c) => {
        const imgs = (await c.query('select image_id from service_images where service_id = $1', [uuid(b)])).rows;
        const r = await c.query('delete from services where id = $1', [b]);
        if (!r.rowCount) throw new HttpError(404, 'Not found');
        for (const i of imgs) await gcImage(c, i.image_id);
      });
      return { ok: true };
    }
  }

  /* reviews + faqs (same shape) */
  for (const [name, table, spec] of [['reviews', 'testimonials', REVIEW], ['faqs', 'faqs', FAQ]]) {
    if (a !== name) continue;
    if (m === 'GET' && !b) return q(`select * from ${table} order by sort, ${table === 'faqs' ? 'id' : 'created_at'}`);
    if (m === 'POST' && b === 'reorder') { await reorder(table, body.ids); return { ok: true }; }
    if (m === 'POST' && !b) {
      const f = clean(body, spec);
      f.sort = await nextSort(table);
      const keys = Object.keys(f);
      return one(`insert into ${table}(${keys.join(',')}) values (${keys.map((_, i) => `$${i + 1}`).join(',')}) returning *`, keys.map((k) => f[k]));
    }
    if (m === 'PATCH' && b) return updateRow(table, uuid(b), clean(body, spec, { partial: true }), false);
    if (m === 'DELETE' && b) { await q(`delete from ${table} where id = $1`, [uuid(b)]); return { ok: true }; }
  }

  /* bookings */
  if (a === 'bookings') {
    if (m === 'GET' && !b) {
      const status = STATUSES.includes(req.query.status) ? req.query.status : null;
      const term = String(req.query.q || '').trim().slice(0, 60);
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const per = 25;
      const where = [];
      const params = [];
      if (status) { params.push(status); where.push(`status = $${params.length}`); }
      if (term) { params.push(`%${term}%`); where.push(`(name ilike $${params.length} or phone ilike $${params.length} or ref ilike $${params.length} or vehicle ilike $${params.length} or location ilike $${params.length})`); }
      const w = where.length ? `where ${where.join(' and ')}` : '';
      const [rows, total, counts] = await Promise.all([
        q(`select id, ref, name, phone, vehicle, service, location, preferred_date, message, status, notes, created_at, updated_at
             from bookings ${w} order by created_at desc limit ${per} offset ${(page - 1) * per}`, params),
        one(`select count(*)::int n from bookings ${w}`, params),
        q('select status, count(*)::int n from bookings group by status'),
      ]);
      return { rows, total: total.n, page, per, counts: Object.fromEntries(counts.map((r) => [r.status, r.n])) };
    }
    if (m === 'PATCH' && b) {
      const f = clean(body, { status: ['str', 20], notes: ['str', 2000] }, { partial: true });
      if (f.status !== undefined && !STATUSES.includes(f.status)) throw bad('Unknown status');
      return updateRow('bookings', uuid(b), f);
    }
    if (m === 'DELETE' && b) { await q('delete from bookings where id = $1', [uuid(b)]); return { ok: true }; }
  }

  throw new HttpError(404, 'Not found');
}

/* ---------- entry ---------- */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  const parts = String(req.query.route || '').split('/').filter(Boolean);
  const [a] = parts;
  try {
    if (req.method !== 'GET' && req.headers['x-mg-admin'] !== '1') throw new HttpError(403, 'Missing request header');

    if (a === 'session' && req.method === 'GET') {
      const admin = await currentAdmin(req);
      const needsSetup = !admin && (await one('select count(*)::int n from admins')).n === 0;
      return res.status(200).json({ admin, needsSetup });
    }
    if (a === 'setup' && req.method === 'POST') {
      const body = req.body || {};
      if (!process.env.ADMIN_SETUP_TOKEN || !safeEqual(body.token, process.env.ADMIN_SETUP_TOKEN)) throw new HttpError(403, 'That setup code is not right.');
      const f = clean(body, { username: ['req', 40], name: ['str', 80], password: ['req', 200] });
      f.username = f.username.toLowerCase();
      if (!/^[a-z0-9._-]{3,40}$/.test(f.username)) throw bad('Username: 3–40 letters, numbers, dots, dashes.');
      const p = passwordProblem(f.password); if (p) throw bad(p);
      const hash = await hashPassword(f.password);
      const admin = await tx(async (c) => {
        await c.query('lock table admins in exclusive mode');
        const n = (await c.query('select count(*)::int n from admins')).rows[0].n;
        if (n > 0) throw new HttpError(409, 'An admin already exists. Sign in instead.');
        return (await c.query('insert into admins(username, name, pass_hash, last_login_at) values ($1,$2,$3, now()) returning *', [f.username, f.name, hash])).rows[0];
      });
      setSessionCookie(res, makeSession(admin));
      return res.status(200).json({ admin: { id: admin.id, username: admin.username, name: admin.name } });
    }
    if (a === 'login' && req.method === 'POST') {
      const username = String(req.body?.username || '').trim().toLowerCase().slice(0, 40);
      const password = String(req.body?.password || '').slice(0, 200);
      const ip = clientIp(req);
      if (await tooManyAttempts(username, ip)) throw new HttpError(429, 'Too many attempts. Wait 15 minutes and try again.');
      const admin = await one('select * from admins where username = $1', [username]);
      const ok = admin ? await verifyPassword(password, admin.pass_hash) : (await verifyPassword(password, 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$' + 'A'.repeat(86) + '==').catch(() => false), false);
      await recordAttempt(username, ip, ok);
      if (!ok) throw new HttpError(401, 'Wrong username or password.');
      await q('update admins set last_login_at = now() where id = $1', [admin.id]);
      setSessionCookie(res, makeSession(admin));
      return res.status(200).json({ admin: { id: admin.id, username: admin.username, name: admin.name } });
    }

    const admin = await currentAdmin(req);
    if (!admin) throw new HttpError(401, 'Please sign in.');
    const out = await route(req, res, admin, parts);
    if (out !== undefined) res.status(200).json(out);
  } catch (e) {
    if (e instanceof HttpError) return res.status(e.status).json({ error: e.message });
    console.error('admin api error', e);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
